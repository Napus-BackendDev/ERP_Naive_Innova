// Merge the last duplicate-NAME pairs left after the phone-keyed dedupe. These
// are the same customer split across two source sheets (Asana pipeline + the
// sample-send list): one row carries the latest stage + note, the other the
// real phone/address. Per the user's rule the NOTE and board position follow
// the most-recent row; missing contact fields are backfilled from the older row
// so no real phone or address is lost. Then the older row is deleted.
//
//   node scripts/merge-dupnames.js            (dry-run)
//   node scripts/merge-dupnames.js --apply

import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const APPLY = process.argv.includes("--apply");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Survivor keeps these as-is (its own, latest values).
const KEEP_LATEST = new Set(["name", "notes", "section", "previousSection", "statusChangedAt", "orderType"]);
// Backfilled from the other row only when the survivor's value is empty.
const BACKFILL = ["phone", "address", "email", "brand", "line", "facebook", "tiktok", "province", "estValue", "payPct", "paidAmount"];
// Production linkage: take from whichever row has it.
const TAKE_TRUTHY = ["producedLotId", "skuId", "formulaId", "completedOrderCount", "isReturningCustomer"];

const empty = (v) => v === undefined || v === null || String(v).trim() === "" || String(v).trim() === "0";
const when = (c) => new Date(c.updatedAt || c.createdAt || 0).getTime();

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const col = db.collection("customers");

  const custs = await col.find({}).toArray();
  const referenced = new Set();
  (await db.collection("productlots").find({}, { projection: { orderId: 1 } }).toArray())
    .forEach(l => l.orderId && referenced.add(String(l.orderId)));

  const groups = new Map();
  for (const c of custs) {
    const k = String(c.name ?? "").trim().toLowerCase();
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(c);
  }
  const dupes = [...groups.values()].filter(a => a.length > 1);
  console.log(`ชื่อซ้ำ: ${dupes.length} กลุ่ม`);

  const backupDir = path.join(__dirname, "backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(backupDir, `dupnames-before-${stamp}.json`),
    JSON.stringify(dupes.flat(), null, 2));

  const updates = [];   // { id, set }
  const deletes = [];

  for (const rows of dupes) {
    const sorted = [...rows].sort((a, b) => when(b) - when(a));
    // A row a production lot points at must survive, even if older.
    const ref = sorted.find(c => referenced.has(String(c._id)));
    const survivor = ref || sorted[0];
    const others = sorted.filter(c => c !== survivor);

    const set = {};
    // Backfill empty contact fields from the most-recent OTHER row that has them.
    for (const f of BACKFILL) {
      if (!empty(survivor[f])) continue;
      const src = others.find(o => !empty(o[f]));
      if (src) set[f] = src[f];
    }
    for (const f of TAKE_TRUTHY) {
      if (!empty(survivor[f])) continue;
      const src = others.find(o => !empty(o[f]));
      if (src) set[f] = src[f];
    }
    if (Object.keys(set).length) updates.push({ id: survivor._id, name: survivor.name, set });
    others.forEach(o => deletes.push(o._id));

    console.log(`\n● "${survivor.name}"`);
    console.log(`   KEEP  phone="${set.phone ?? survivor.phone ?? ""}" addr="${String(set.address ?? survivor.address ?? "").slice(0, 20)}" sec=${survivor.section}`);
    if (Object.keys(set).length) console.log(`   เติม: ${Object.keys(set).join(", ")}`);
    console.log(`   ลบ ${others.length} แถวเก่า`);
  }

  console.log(`\nสรุป: อัปเดตผู้รอด ${updates.length} · ลบซ้ำ ${deletes.length}`);

  if (!APPLY) {
    console.log("\n[dry-run] ยังไม่เขียน — ใส่ --apply เพื่อลงจริง");
    await mongoose.disconnect();
    return;
  }

  const now = new Date();
  for (const u of updates) await col.updateOne({ _id: u.id }, { $set: { ...u.set, updatedAt: now } });
  let removed = 0;
  for (let i = 0; i < deletes.length; i += 500) {
    const r = await col.deleteMany({ _id: { $in: deletes.slice(i, i + 500) } });
    removed += r.deletedCount;
  }
  console.log(`\nอัปเดต ${updates.length} · ลบ ${removed}`);
  console.log(`customers remaining: ${await col.countDocuments()}`);
  await mongoose.disconnect();
}

main().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
