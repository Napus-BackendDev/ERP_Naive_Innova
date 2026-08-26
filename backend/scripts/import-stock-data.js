// Pull the real numbers out of the two legacy stock apps and into ERP.
//
//   stockManagerDB.ingredients (66)  -> ERP.ingredients   : openingStock + supplier
//   ProductStock.items         (86)  -> ERP.packagingitems: currentQuantity + customer + photo
//
// ERP stays the system of record: its schema, its _id values, its extra rows.
// Nothing is deleted and no history is copied — the legacy movement logs stay
// where they are (637 rows in stockManagerDB.transactions, 411 embedded in
// ProductStock.items.logs) because ERP tracks movements its own way from now on.
//
// Run:  node scripts/import-stock-data.js            (dry-run, prints the plan)
//       node scripts/import-stock-data.js --apply

import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const APPLY = process.argv.includes("--apply");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC_CHEM = "stockManagerDB";
const SRC_PACK = "ProductStock";

// The legacy packaging app free-typed 23 categories; ERP has 5. Anything not
// listed lands in อื่นๆ rather than being dropped.
const TYPE_MAP = {
  "ขวด HDPE": "บรรจุภัณฑ์", "กระปุก PET": "บรรจุภัณฑ์", "กระปุกแก้ว": "บรรจุภัณฑ์",
  "ขวดแก้ว": "บรรจุภัณฑ์", "ขวดเซรั่ม": "บรรจุภัณฑ์", "ขวดสเปรย์": "บรรจุภัณฑ์",
  "ขวดปั๊ม": "บรรจุภัณฑ์", "ขวดโฟม": "บรรจุภัณฑ์", "ขวดโรลออน": "บรรจุภัณฑ์",
  "ขวดดรอปเปอร์": "บรรจุภัณฑ์", "ขวดแชมพู": "บรรจุภัณฑ์", "หลอดบีบ": "บรรจุภัณฑ์",
  "หลอดโรลออน": "บรรจุภัณฑ์", "หลอดหัวปั้ม": "บรรจุภัณฑ์", "ซองฟอยล์": "บรรจุภัณฑ์",
  "แกลอน": "บรรจุภัณฑ์", "บรรจุภัณฑ์อื่นๆ": "บรรจุภัณฑ์", "กล่องกระดาษ": "บรรจุภัณฑ์",
  "ฝา/หัวปั๊ม": "หัวฉีด",
  "กล่องไปรษณีย์": "ไปรษณีย์",
  "ถุงมือ": "อื่นๆ", "อื่นๆ": "อื่นๆ"
};
const FALLBACK_TYPE = "อื่นๆ";

// Two keys: the loose one catches "ขวด Hair Raise" vs "ขวดHair raise".
const norm = (s) => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
const tight = (s) => norm(s).replace(/[\s\-_.]/g, "");

const MAX_IMG = 1024 * 1024;   // every stored image must stay under 1 MB

function indexBy(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r.name);
    if (!k) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

// Prefer the exact name, fall back to the punctuation-insensitive form.
function matchOne(loose, strict, name) {
  const a = loose.get(norm(name));
  if (a?.length) return a;
  const b = strict.get(tight(name));
  return b?.length ? b : [];
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  const client = mongoose.connection.getClient();
  const erp = mongoose.connection.db;
  console.log(`ERP database: ${erp.databaseName}`);

  const srcChem = client.db(SRC_CHEM);
  const srcPack = client.db(SRC_PACK);

  // ---------------------------------------------------------------- backup
  const backupDir = path.join(__dirname, "backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const erpIng = await erp.collection("ingredients").find({}).toArray();
  const erpPack = await erp.collection("packagingitems").find({}).toArray();
  const dump = (n, v) => fs.writeFileSync(path.join(backupDir, `${n}-${stamp}.json`), JSON.stringify(v, null, 2));
  dump("ingredients-before", erpIng);
  dump("packagingitems-before", erpPack);
  console.log(`backup written: ingredients ${erpIng.length}, packagingitems ${erpPack.length}\n`);

  // ------------------------------------------------------------ ingredients
  console.log("=== สารเคมี : stockManagerDB.ingredients -> ERP.ingredients ===");
  const stockIng = await srcChem.collection("ingredients").find({}).toArray();
  const ingLoose = indexBy(erpIng, norm), ingTight = indexBy(erpIng, tight);

  const ingUpdates = [], ingMissing = [], ingAmbiguous = [];
  for (const s of stockIng) {
    const hits = matchOne(ingLoose, ingTight, s.name);
    if (!hits.length) { ingMissing.push(s); continue; }
    if (hits.length > 1) ingAmbiguous.push({ name: s.name, n: hits.length });
    const t = hits[0];
    const nextQty = Number(s.openingStock ?? 0);
    const nextSup = s.supplier ?? "";
    if (Number(t.openingStock ?? 0) === nextQty && (t.supplier ?? "") === nextSup) continue;
    ingUpdates.push({
      _id: t._id, name: t.name,
      from: Number(t.openingStock ?? 0), to: nextQty,
      supFrom: t.supplier ?? "", supTo: nextSup
    });
  }

  const stockLoose = indexBy(stockIng, norm), stockTight = indexBy(stockIng, tight);
  const erpOnly = erpIng.filter(e => !matchOne(stockLoose, stockTight, e.name).length);

  console.log(`  จับคู่ได้ ${stockIng.length - ingMissing.length}/${stockIng.length} · จะแก้ยอด ${ingUpdates.length} รายการ`);
  for (const u of ingUpdates.slice(0, 200)) {
    const sup = u.supFrom !== u.supTo ? `  supplier "${u.supFrom}" -> "${u.supTo}"` : "";
    console.log(`    ${u.name}\n      ${u.from} -> ${u.to}${sup}`);
  }
  if (ingMissing.length) console.log(`  ! ไม่มีใน ERP (จะข้าม): ${ingMissing.map(x => x.name).join(", ")}`);
  if (ingAmbiguous.length) console.log(`  ! ชื่อซ้ำใน ERP: ${ingAmbiguous.map(x => `${x.name} x${x.n}`).join(", ")}`);
  console.log(`  · ERP มีเพิ่มอีก ${erpOnly.length} ตัวที่ Stock ไม่มี — ไม่แตะ (สูตร ERP ใช้อยู่)`);
  console.log(`    ${erpOnly.map(x => x.name).join(" · ")}\n`);

  // ------------------------------------------------------------- packaging
  console.log("=== บรรจุภัณฑ์ : ProductStock.items -> ERP.packagingitems ===");
  const types = await erp.collection("packagingtypes").find({}).toArray();
  const typeId = new Map(types.map(t => [t.name, t._id]));
  const missingTypes = [...new Set(Object.values(TYPE_MAP))].filter(n => !typeId.has(n));
  if (missingTypes.length) throw new Error(`ERP ไม่มี packagingtype: ${missingTypes.join(", ")}`);

  const items = await srcPack.collection("items").find({}).toArray();
  const packLoose = indexBy(erpPack, norm), packTight = indexBy(erpPack, tight);

  // ERP grew duplicate rows over time; report them so they can be merged by
  // hand rather than silently picking one and stranding the other's photo.
  const dupes = [];
  for (const [k, rows] of packLoose) if (rows.length > 1) dupes.push(rows.map(r => r.name).join(" | "));

  const ownerId = erpPack[0]?.ownerId ?? erpIng[0]?.ownerId ?? null;
  const packUpdates = [], packInserts = [], bigImages = [];

  for (const it of items) {
    const hits = matchOne(packLoose, packTight, it.name);
    const qty = Number(it.qty ?? 0);
    const typeName = TYPE_MAP[it.type] || FALLBACK_TYPE;
    const img = typeof it.img === "string" && it.img ? it.img : null;
    if (img && img.length > MAX_IMG) bigImages.push(`${it.name} (${Math.round(img.length / 1024)} KB)`);

    if (hits.length) {
      const t = hits[0];
      const set = {};
      if (Number(t.currentQuantity ?? 0) !== qty) set.currentQuantity = qty;
      if (it.cust && (t.customer ?? "") !== it.cust) set.customer = it.cust;
      if (it.note && !(t.note ?? "")) set.note = it.note;
      // Only fill a gap — an ERP photo was taken for ERP and wins.
      if (img && img.length <= MAX_IMG && !t.image) set.image = img;
      if (!Object.keys(set).length) continue;
      packUpdates.push({
        _id: t._id, name: t.name, srcType: it.type,
        qtyFrom: Number(t.currentQuantity ?? 0), qtyTo: qty,
        fields: Object.keys(set), set
      });
    } else {
      packInserts.push({
        doc: {
          ownerId, name: it.name, type: typeId.get(typeName),
          customer: it.cust || "", currentQuantity: qty, initialQuantity: qty,
          note: it.note || "", ...(img && img.length <= MAX_IMG ? { image: img } : {}),
          createdAt: it.createdAt ?? new Date(), updatedAt: new Date(), __v: 0
        },
        srcType: it.type, typeName
      });
    }
  }

  console.log(`  แก้ของเดิม ${packUpdates.length} · เพิ่มใหม่ ${packInserts.length} · รวมต้นทาง ${items.length}`);
  for (const u of packUpdates.slice(0, 200))
    console.log(`    ~ ${u.name}  [${u.srcType}]  ${u.qtyFrom} -> ${u.qtyTo}   (${u.fields.join(", ")})`);
  for (const i of packInserts.slice(0, 200))
    console.log(`    + ${i.doc.name}  [${i.srcType} -> ${i.typeName}]  qty ${i.doc.currentQuantity}  ลูกค้า ${i.doc.customer || "-"}`);
  if (dupes.length) {
    console.log(`  ! ERP มีชื่อซ้ำ ${dupes.length} กลุ่ม — อัปเดตเข้าตัวแรกเท่านั้น ควรรวมด้วยมือ:`);
    dupes.forEach(d => console.log(`      ${d}`));
  }
  if (bigImages.length) console.log(`  ! รูปเกิน 1 MB จะไม่ย้าย: ${bigImages.join(", ")}`);

  // ------------------------------------------------------------------ apply
  if (!APPLY) {
    console.log("\n[dry-run] ยังไม่เขียนอะไรลง DB — ใส่ --apply เพื่อลงจริง");
    await mongoose.disconnect();
    return;
  }

  const now = new Date();
  let n = 0;
  for (const u of ingUpdates) {
    await erp.collection("ingredients").updateOne(
      { _id: u._id }, { $set: { openingStock: u.to, supplier: u.supTo, updatedAt: now } });
    n++;
  }
  console.log(`\ningredients updated: ${n}`);

  n = 0;
  for (const u of packUpdates) {
    await erp.collection("packagingitems").updateOne(
      { _id: u._id }, { $set: { ...u.set, updatedAt: now } });
    n++;
  }
  if (packInserts.length) await erp.collection("packagingitems").insertMany(packInserts.map(i => i.doc));
  console.log(`packagingitems updated: ${n}, inserted: ${packInserts.length}`);

  dump("ingredients-after", await erp.collection("ingredients").find({}).toArray());
  dump("packagingitems-after", await erp.collection("packagingitems").find({}).toArray());
  console.log("done");
  await mongoose.disconnect();
}

main().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
