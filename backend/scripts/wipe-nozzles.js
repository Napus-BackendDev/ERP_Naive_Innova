// Wipe ALL nozzle (หัวฉีด) documents (user requested — too many duplicates,
// starting fresh). Backs up every doc to scripts/backup/ first, then deletes.
//
// Run:  node scripts/wipe-nozzles.js          (dry-run: count only)
//       node scripts/wipe-nozzles.js --apply   (backup + delete all)

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

  const docs = await db.collection("nozzles").find({}).toArray();
  console.log(`nozzles collection has ${docs.length} docs.`);
  if (docs.length === 0) { await mongoose.disconnect(); return; }

  const backupDir = path.join(__dirname, "backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `nozzles-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(docs, null, 2));
  console.log(`Backup written: ${backupFile}`);

  if (APPLY) {
    const res = await db.collection("nozzles").deleteMany({});
    console.log(`DELETED ${res.deletedCount} nozzle docs. Collection now empty.`);
  } else {
    console.log(`DRY-RUN: would delete ${docs.length}. Re-run with --apply.`);
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
