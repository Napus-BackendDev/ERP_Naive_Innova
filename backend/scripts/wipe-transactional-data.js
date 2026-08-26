// Wipe transactional data, keep master/catalog data.
//
// KEEP  : users, roles, ingredients (สารเคมี), bomformulas (สูตร BOM),
//         packagingitems (ขวด/ฝา/สติกเกอร์), products (สินค้าตัวอย่าง),
//         scents (กลิ่น), packagingtypes, packagingsubtypes,
//         crmcolumns (Kanban stages), lotprefixconfigs, app_data, nozzles
// DELETE: customers (leads/orders/production), activitylogs, transactions,
//         productlots, productskus, supporttickets, machines
//
// Files in backend/public/uploads/ are left alone — kept packagingitems still
// reference them.
//
// Run:  node scripts/wipe-transactional-data.js          (dry-run)
//       node scripts/wipe-transactional-data.js --apply  (backup + delete)

import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const APPLY = process.argv.includes("--apply");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TO_DELETE = [
  "customers",
  "activitylogs",
  "transactions",
  "productlots",
  "productskus",
  "supporttickets",
  "machines"
];

const TO_KEEP = [
  "users", "roles", "ingredients", "bomformulas", "packagingitems", "products",
  "scents", "packagingtypes", "packagingsubtypes", "crmcolumns",
  "lotprefixconfigs", "app_data", "nozzles"
];

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const existing = (await db.listCollections().toArray()).map(c => c.name);
  const unknown = existing.filter(n => !TO_DELETE.includes(n) && !TO_KEEP.includes(n));
  if (unknown.length) {
    console.log(`NOTE: untouched collections not in either list: ${unknown.join(", ")}`);
  }

  const backupDir = path.join(__dirname, "backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  let totalDocs = 0;
  for (const name of TO_DELETE) {
    if (!existing.includes(name)) {
      console.log(`- ${name}: (collection missing, skipped)`);
      continue;
    }
    const docs = await db.collection(name).find({}).toArray();
    totalDocs += docs.length;

    // Always back up, even on a dry run.
    const file = path.join(backupDir, `wipe-${name}-${stamp}.json`);
    fs.writeFileSync(file, JSON.stringify(docs, null, 2));

    if (APPLY) {
      const res = await db.collection(name).deleteMany({});
      console.log(`- ${name}: deleted ${res.deletedCount} (backup: ${path.basename(file)})`);
    } else {
      console.log(`- ${name}: would delete ${docs.length} (backup: ${path.basename(file)})`);
    }
  }

  console.log("");
  console.log(APPLY ? `APPLIED: removed ${totalDocs} docs.` : `DRY-RUN: would remove ${totalDocs} docs. Re-run with --apply.`);
  console.log("");
  console.log("Remaining counts:");
  for (const name of TO_KEEP) {
    if (!existing.includes(name)) continue;
    console.log(`  ${name}: ${await db.collection(name).countDocuments({})}`);
  }
  for (const name of TO_DELETE) {
    if (!existing.includes(name)) continue;
    console.log(`  ${name}: ${await db.collection(name).countDocuments({})}`);
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
