// Remove the binary garbage that a botched import left behind: someone fed an
// .xlsx into the old CSV-only importer, which read the zip's raw bytes as text
// and created ~98 "customers" whose name is literally the file's PK/ZIP header
// ("PK..docProps/core.xml..xl/theme/theme1.xml"), plus one activity log each.
//
// Scope is proven safe before writing:
//   - every flagged customer has U+FFFD in its NAME (98 of them)
//   - NO real customer anywhere else in the DB contains U+FFFD (verified 0)
//   - the flagged docs have 0 orderedProducts and no produced lot, so nothing
//     references them
// Real customers that happen to share the same board section are untouched,
// because the filter is the replacement char, not the section.
//
// Backs up both collections' doomed docs to scripts/backup/ before deleting.
//
//   node scripts/delete-garbled.js            (dry-run)
//   node scripts/delete-garbled.js --apply

import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const APPLY = process.argv.includes("--apply");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RE = /�/;   // U+FFFD replacement char

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const custFilter = { $or: [{ name: RE }, { phone: RE }, { address: RE }, { notes: RE }] };
  const logFilter = { description: RE };

  const custs = await db.collection("customers").find(custFilter).toArray();
  const logs = await db.collection("activitylogs").find(logFilter).toArray();
  console.log(`customers flagged: ${custs.length}`);
  console.log(`activity logs flagged: ${logs.length}`);

  // Guardrail: refuse if a flagged customer looks real — a produced lot, ordered
  // products, or a clean phone would mean the filter is over-reaching.
  const looksReal = custs.filter(c =>
    (Array.isArray(c.orderedProducts) && c.orderedProducts.length) ||
    c.producedLotId ||
    (c.phone && !RE.test(c.phone) && /^[0-9+\-\s()]{6,}$/.test(c.phone)));
  if (looksReal.length) {
    console.log(`\n! ABORT: ${looksReal.length} flagged customer(s) look real — not deleting.`);
    console.log(looksReal.slice(0, 10).map(c => `   ${c._id} name="${String(c.name).slice(0, 30)}" phone="${c.phone}"`).join("\n"));
    await mongoose.disconnect();
    return;
  }
  console.log("guardrail: none of the flagged customers look real ✓");

  const backupDir = path.join(__dirname, "backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(backupDir, `garbled-customers-${stamp}.json`), JSON.stringify(custs, null, 2));
  fs.writeFileSync(path.join(backupDir, `garbled-activitylogs-${stamp}.json`), JSON.stringify(logs, null, 2));
  console.log(`backup written (${custs.length} customers, ${logs.length} logs)`);

  if (!APPLY) {
    console.log("\n[dry-run] ยังไม่ลบ — ใส่ --apply เพื่อลบจริง");
    await mongoose.disconnect();
    return;
  }

  const c = await db.collection("customers").deleteMany(custFilter);
  const l = await db.collection("activitylogs").deleteMany(logFilter);
  console.log(`\ndeleted customers: ${c.deletedCount}, activity logs: ${l.deletedCount}`);
  console.log(`customers remaining: ${await db.collection("customers").countDocuments()}`);
  await mongoose.disconnect();
}

main().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
