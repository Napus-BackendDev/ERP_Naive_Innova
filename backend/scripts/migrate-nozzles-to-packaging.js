// Migration: fold the standalone `nozzles` collection into `packagingitems`
// as category (PackagingType) "หัวฉีด", so nozzles show up in the Stock
// "ขวดและบรรจุภัณฑ์" tab alongside bottles/labels.
//
// - Dedupes 148 nozzle rows down to their distinct names (15).
// - Preserves order links: every orderedProducts[].nozzleId that pointed at an
//   old Nozzle is remapped to the new PackagingItem _id.
// - Backs up both `nozzles` and touched `customers` before writing.
// - Idempotent-ish: skips creating a packaging item whose name already exists
//   under type "หัวฉีด" for that owner.
//
// Run:  node scripts/migrate-nozzles-to-packaging.js          (dry-run)
//       node scripts/migrate-nozzles-to-packaging.js --apply  (do it)

import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const APPLY = process.argv.includes("--apply");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const nozzlesCol = db.collection("nozzles");
  const itemsCol = db.collection("packagingitems");
  const typesCol = db.collection("packagingtypes");
  const customersCol = db.collection("customers");

  const nozzles = await nozzlesCol.find({}).toArray();
  console.log(`nozzles: ${nozzles.length}`);
  if (nozzles.length === 0) { await mongoose.disconnect(); return; }

  // Backup
  const backupDir = path.join(__dirname, "backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(backupDir, `nozzles-${stamp}.json`), JSON.stringify(nozzles, null, 2));
  const customersBefore = await customersCol.find({ "orderedProducts.nozzleId": { $exists: true } }).toArray();
  fs.writeFileSync(path.join(backupDir, `customers-nozzleId-${stamp}.json`), JSON.stringify(customersBefore, null, 2));
  console.log(`Backup written for nozzles + ${customersBefore.length} customers referencing nozzleId.`);

  // Row isolation is off (every login is Admin), so both the Stock list and the
  // Sales picker query admin-wide — dedupe nozzles by NAME only. One "หัวฉีด"
  // PackagingType is reused for all migrated items (display uses type.name).
  let huaType = await typesCol.findOne({ name: "หัวฉีด" });
  if (!huaType) {
    const ins = { ownerId: nozzles[0].ownerId, name: "หัวฉีด", createdAt: new Date(), updatedAt: new Date() };
    if (APPLY) { const r = await typesCol.insertOne(ins); huaType = { _id: r.insertedId }; }
    else huaType = { _id: "(dry-run)" };
  }
  const type = huaType._id;

  // Group nozzles by trimmed name (case-insensitive).
  const groups = new Map(); // key -> { ownerId, name, members: [nozzle] }
  for (const n of nozzles) {
    const name = (n.name || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!groups.has(key)) groups.set(key, { ownerId: n.ownerId, name, members: [] });
    groups.get(key).members.push(n);
  }
  console.log(`distinct names: ${groups.size}`);

  // oldNozzleId -> newPackagingItemId
  const idMap = {};
  let created = 0, reused = 0;

  for (const { ownerId, name, members } of groups.values()) {
    const qty = Math.max(...members.map(m => Number(m.currentQuantity) || 0), 0);
    const image = members.map(m => m.image).find(Boolean) || "";

    // Reuse an existing packaging item of the same name+type if present.
    let target = await itemsCol.findOne({ ownerId, name, type });
    if (target) {
      reused++;
    } else if (APPLY) {
      const doc = {
        ownerId, name, customer: "ระบบ", type,
        initialQuantity: qty, currentQuantity: qty,
        image, createdAt: new Date(), updatedAt: new Date()
      };
      const r = await itemsCol.insertOne(doc);
      target = { _id: r.insertedId };
      created++;
    } else {
      target = { _id: `(new:${name})` };
      created++;
    }
    for (const m of members) idMap[String(m._id)] = target._id;
  }

  // Remap orderedProducts[].nozzleId across customers.
  let remappedCustomers = 0, remappedLines = 0;
  for (const c of customersBefore) {
    let touched = false;
    const ops = Array.isArray(c.orderedProducts) ? c.orderedProducts : [];
    for (const p of ops) {
      if (p && p.nozzleId && idMap[String(p.nozzleId)]) {
        p.nozzleId = idMap[String(p.nozzleId)];
        touched = true;
        remappedLines++;
      }
    }
    if (touched) {
      remappedCustomers++;
      if (APPLY) await customersCol.updateOne({ _id: c._id }, { $set: { orderedProducts: ops } });
    }
  }

  console.log(`packaging items — created: ${created}, reused: ${reused}`);
  console.log(`order links remapped — customers: ${remappedCustomers}, lines: ${remappedLines}`);

  if (APPLY) {
    await nozzlesCol.drop().catch(() => {});
    console.log("Dropped `nozzles` collection.");
  } else {
    console.log("DRY-RUN complete. Re-run with --apply to execute.");
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
