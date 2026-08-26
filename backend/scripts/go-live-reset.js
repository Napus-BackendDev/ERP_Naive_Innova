// Clear everything that was typed while trying the system out, so the first
// real order starts from a clean board. Master data stays: chemicals, BOM
// formulas, packaging, sample products, stages, machines.
//
// DELETE : customers (leads + production orders), activitylogs, transactions,
//          productlots, productskus, supporttickets
// KEEP   : ingredients, bomformulas, packagingitems, products, scents,
//          packagingtypes, packagingsubtypes, crmcolumns, lotprefixconfigs,
//          users, roles, app_data, machines
//
// Machines are NOT wiped — wipe-transactional-data.js does that, and losing
// them empties the production queue and every schedule that points at one.
// Only the obvious try-out machine is removed (see TEST_MACHINES).
//
// Run:  node scripts/go-live-reset.js            (dry-run)
//       node scripts/go-live-reset.js --apply

import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const APPLY = process.argv.includes("--apply");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EMPTY = ["customers", "activitylogs", "transactions", "productlots", "productskus", "supporttickets"];
const TEST_MACHINES = ["hyperspeeds"];
const KEEP = ["ingredients", "bomformulas", "packagingitems", "products", "scents",
  "packagingtypes", "packagingsubtypes", "crmcolumns", "lotprefixconfigs",
  "users", "roles", "app_data", "machines"];

const norm = (s) => String(s ?? "").trim().toLowerCase();

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const existing = (await db.listCollections().toArray()).map(c => c.name);

  const backupDir = path.join(__dirname, "backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  console.log(APPLY ? "=== ลบจริง ===" : "=== dry-run ===");
  let total = 0;
  for (const name of EMPTY) {
    if (!existing.includes(name)) { console.log(`- ${name}: ไม่มี collection นี้`); continue; }
    const docs = await db.collection(name).find({}).toArray();
    total += docs.length;
    // Back up even on a dry run: the file is the only way back.
    fs.writeFileSync(path.join(backupDir, `golive-${name}-${stamp}.json`), JSON.stringify(docs, null, 2));
    if (APPLY) {
      const r = await db.collection(name).deleteMany({});
      console.log(`- ${name}: ลบ ${r.deletedCount}`);
    } else {
      console.log(`- ${name}: จะลบ ${docs.length}`);
    }
  }

  const machines = existing.includes("machines")
    ? await db.collection("machines").find({}).toArray() : [];
  const badMachines = machines.filter(m => TEST_MACHINES.includes(norm(m.name)));
  console.log(`\nเครื่องจักร ${machines.length} เครื่อง — เก็บ ${machines.length - badMachines.length}, ลบ ${badMachines.length}`);
  for (const m of machines)
    console.log(`  ${badMachines.includes(m) ? "-" : "·"} ${m.name}`);
  if (APPLY && badMachines.length) {
    fs.writeFileSync(path.join(backupDir, `golive-machines-${stamp}.json`), JSON.stringify(machines, null, 2));
    await db.collection("machines").deleteMany({ _id: { $in: badMachines.map(m => m._id) } });
    total += badMachines.length;
  }

  console.log(APPLY ? `\nลบไปทั้งหมด ${total} เอกสาร` : `\nจะลบทั้งหมด ${total} เอกสาร — ใส่ --apply เพื่อลงจริง`);
  console.log("\nข้อมูลหลักที่เหลืออยู่:");
  for (const name of KEEP) {
    if (!existing.includes(name)) continue;
    console.log(`  ${name}: ${await db.collection(name).countDocuments({})}`);
  }
  await mongoose.disconnect();
}

main().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
