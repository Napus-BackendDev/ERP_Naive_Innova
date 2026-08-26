// Tidy up ERP.packagingitems after the ProductStock import.
//
// The legacy app let anyone free-type a name and a category, so the same bottle
// exists twice, caps sit under "บรรจุภัณฑ์", and six English placeholder rows
// left over from the nozzle migration still have zero stock. ERP only has five
// categories, so classification happens by NAME here, not by whatever string
// the old app stored.
//
//   1. merge rows whose names differ only by spacing/case
//   2. move caps -> หัวฉีด, labels -> สติกเกอร์, consumables -> อื่นๆ
//   3. normalise customer spelling
//   4. delete the rows typed while testing the screens (see TEST_CUSTOMERS)
//
// Nothing that a customer order still points at is ever deleted — those are
// reported instead. Backs up the whole collection first.
//
// Run:  node scripts/clean-packaging.js               (dry-run)
//       node scripts/clean-packaging.js --apply
//       node scripts/clean-packaging.js --apply --drop-seed   (also removes the
//            six unused English placeholder nozzles, if nothing references them)

import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const APPLY = process.argv.includes("--apply");
const DROP_SEED = process.argv.includes("--drop-seed");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const norm = (s) => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const tight = (s) => norm(s).replace(/[\s\-_.]/g, "");

// A cap, a pump or a nipple is a หัวฉีด — but only when the name STARTS with it.
// "ขวดลูกกลิ้ง 10ml+ฝา+จุก" is a bottle sold with its cap, not a cap.
const NOZZLE_HEAD = /^(ฝา|หัวปั๊ม|หัวปั้ม|หัวสเปรย์|หัวบีบ|หัวฉีด|จุก)/;
const LABEL_HEAD = /^(สติกเกอร์|สติ๊กเกอร์|ฉลาก)/;
const OTHER_HEAD = /^(ถุงมือ|กระดาษ|ทิชชู|ฟิล์ม|เทป|บรรจุภัณฑ์ชำรุด)/;

// Placeholders written by the old nozzle→packaging migration; all zero stock.
const SEED_NOZZLES = ["none", "pump head", "spray head", "screw cap", "popup cap", "squeeze head"];

// Rows typed while trying the screens out. The customer field is the tell —
// nobody ships to "ทดสอบ 1". Going live means these must not be pickable.
const TEST_CUSTOMERS = ["ทดสอบ 1", "อะไรหรอ", "ปลื้มเอง"];

const CUSTOMER_FIX = { "naive": "นาอีฟ", "nive": "นาอีฟ", "": "ระบบ" };

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const items = await db.collection("packagingitems").find({}).toArray();
  const types = await db.collection("packagingtypes").find({}).toArray();
  const typeById = new Map(types.map(t => [String(t._id), t.name]));
  const typeId = new Map(types.map(t => [t.name, t._id]));
  console.log(`packagingitems: ${items.length} · types: ${types.map(t => t.name).join(", ")}\n`);

  const backupDir = path.join(__dirname, "backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(backupDir, `packagingitems-preclean-${stamp}.json`), JSON.stringify(items, null, 2));

  // ------------------------------------------------------- what is still used
  const customers = await db.collection("customers").find({}).toArray();
  const used = new Set();
  const noteUse = (v) => { if (v) used.add(String(v)); };
  for (const c of customers) {
    for (const line of c.orderedProducts || []) {
      noteUse(line.packagingItemId); noteUse(line.labelItemId); noteUse(line.nozzleId);
      for (const cp of line.consumedPackaging || []) noteUse(cp.itemId);
    }
  }
  console.log(`ลูกค้า ${customers.length} ราย อ้างถึงบรรจุภัณฑ์ ${used.size} รายการ — จะไม่ลบรายการเหล่านี้\n`);

  // -------------------------------------------------------------- 1. dedupe
  console.log("=== 1. รวมรายการซ้ำ ===");
  const groups = new Map();
  for (const it of items) {
    const k = tight(it.name);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(it);
  }

  const hasImg = (x) => typeof x.image === "string" && x.image.length > 100;
  const merges = [], blockedDeletes = [];
  for (const [, rows] of groups) {
    if (rows.length < 2) continue;
    // Keep the row with a photo; ties go to the oldest so existing links survive.
    const sorted = [...rows].sort((a, b) =>
      (hasImg(b) - hasImg(a)) ||
      (Number(b.currentQuantity ?? 0) - Number(a.currentQuantity ?? 0)) ||
      (new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0)));
    const keep = sorted[0], drop = sorted.slice(1);
    const set = {};
    const qty = Math.max(...rows.map(r => Number(r.currentQuantity ?? 0)));
    if (Number(keep.currentQuantity ?? 0) !== qty) set.currentQuantity = qty;
    if (!hasImg(keep)) { const src = rows.find(hasImg); if (src) set.image = src.image; }
    if (!keep.note) { const src = rows.find(r => r.note); if (src) set.note = src.note; }
    const locked = drop.filter(d => used.has(String(d._id)));
    if (locked.length) blockedDeletes.push(...locked.map(d => d.name));
    merges.push({ keep, set, drop: drop.filter(d => !used.has(String(d._id))) });
    console.log(`  ${keep.name}  (${rows.length} แถว -> 1)  qty ${qty}` +
      (Object.keys(set).length ? `  [เติม ${Object.keys(set).join(", ")}]` : ""));
  }
  if (!merges.length) console.log("  ไม่มีรายการซ้ำ");
  if (blockedDeletes.length) console.log(`  ! มีออเดอร์อ้างอยู่ ลบไม่ได้: ${blockedDeletes.join(", ")}`);

  // --------------------------------------------------------- 2. reclassify
  console.log("\n=== 2. จำแนกหมวดใหม่ ===");
  const dropped = new Set(merges.flatMap(m => m.drop.map(d => String(d._id))));
  const retypes = [];
  for (const it of items) {
    if (dropped.has(String(it._id))) continue;
    const cur = typeById.get(String(it.type)) || "";
    // Only rows sitting in the catch-all are re-sorted: a row someone already
    // filed by hand knows better than a regex does.
    if (cur !== "บรรจุภัณฑ์") continue;
    const n = String(it.name ?? "").trim();
    let want = null;
    if (NOZZLE_HEAD.test(n)) want = "หัวฉีด";
    else if (LABEL_HEAD.test(n)) want = "สติกเกอร์";
    else if (OTHER_HEAD.test(n)) want = "อื่นๆ";
    if (!want || want === cur) continue;
    retypes.push({ _id: it._id, name: it.name, from: cur, to: want });
    console.log(`  ${it.name}   ${cur} -> ${want}`);
  }
  if (!retypes.length) console.log("  ไม่มีรายการต้องย้ายหมวด");

  // ------------------------------------------------------ 3. customer names
  console.log("\n=== 3. ชื่อลูกค้า ===");
  const custFixes = [];
  for (const it of items) {
    if (dropped.has(String(it._id))) continue;
    const raw = String(it.customer ?? "");
    const want = CUSTOMER_FIX[norm(raw)] ?? raw.trim().replace(/\s+/g, " ");
    if (want && want !== raw) {
      custFixes.push({ _id: it._id, name: it.name, from: raw, to: want });
      console.log(`  ${it.name}: "${raw}" -> "${want}"`);
    }
  }
  if (!custFixes.length) console.log("  ชื่อลูกค้าเรียบร้อยแล้ว");

  // ---------------------------------------------------------- test rows
  const testRows = items.filter(it =>
    !dropped.has(String(it._id)) &&
    TEST_CUSTOMERS.some(c => norm(c) === norm(it.customer)) &&
    !used.has(String(it._id)));
  const testLocked = items.filter(it =>
    TEST_CUSTOMERS.some(c => norm(c) === norm(it.customer)) && used.has(String(it._id)));
  console.log(`\n=== 4. แถวทดสอบ (ลูกค้า: ${TEST_CUSTOMERS.join(" / ")}): ลบ ${testRows.length} รายการ ===`);
  for (const t of testRows) console.log(`  - ${t.name}  [${t.customer}]  qty ${t.currentQuantity ?? 0}`);
  if (testLocked.length) console.log(`  ! มีออเดอร์อ้างอยู่ ลบไม่ได้: ${testLocked.map(t => t.name).join(", ")}`);

  // --------------------------------------------------------- seed nozzles
  const seed = items.filter(it =>
    SEED_NOZZLES.includes(norm(it.name)) &&
    Number(it.currentQuantity ?? 0) === 0 &&
    !used.has(String(it._id)));
  console.log(`\n=== 5. หัวฉีดตัวอย่างภาษาอังกฤษ (ยอด 0 ไม่มีใครอ้าง): ${seed.length} รายการ ===`);
  if (seed.length) console.log(`  ${seed.map(s => s.name).join(", ")}`);
  console.log(DROP_SEED ? "  -> จะลบ (--drop-seed)" : "  -> เก็บไว้ (ใส่ --drop-seed ถ้าจะลบ)");

  // ------------------------------------------------------------------ apply
  if (!APPLY) {
    console.log("\n[dry-run] ยังไม่เขียนอะไรลง DB — ใส่ --apply เพื่อลงจริง");
    await mongoose.disconnect();
    return;
  }

  const col = db.collection("packagingitems");
  const now = new Date();
  let merged = 0, removed = 0;
  for (const m of merges) {
    if (Object.keys(m.set).length) await col.updateOne({ _id: m.keep._id }, { $set: { ...m.set, updatedAt: now } });
    if (m.drop.length) {
      await col.deleteMany({ _id: { $in: m.drop.map(d => d._id) } });
      removed += m.drop.length;
    }
    merged++;
  }
  for (const r of retypes) await col.updateOne({ _id: r._id }, { $set: { type: typeId.get(r.to), updatedAt: now } });
  for (const c of custFixes) await col.updateOne({ _id: c._id }, { $set: { customer: c.to, updatedAt: now } });
  if (testRows.length) {
    await col.deleteMany({ _id: { $in: testRows.map(t => t._id) } });
    removed += testRows.length;
  }
  if (DROP_SEED && seed.length) {
    await col.deleteMany({ _id: { $in: seed.map(s => s._id) } });
    removed += seed.length;
  }

  const after = await col.countDocuments();
  console.log(`\nรวมซ้ำ ${merged} กลุ่ม · ลบ ${removed} แถว · ย้ายหมวด ${retypes.length} · แก้ชื่อลูกค้า ${custFixes.length}`);
  console.log(`packagingitems: ${items.length} -> ${after}`);
  fs.writeFileSync(path.join(backupDir, `packagingitems-postclean-${stamp}.json`),
    JSON.stringify(await col.find({}).toArray(), null, 2));
  await mongoose.disconnect();
}

main().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
