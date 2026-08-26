// Cleanup: drop the orphaned `salesleads` collection (stale 2026-07-03 seed,
// duplicated by the live `customers` collection; no code references it).
// Backs up all docs to scripts/backup/ first.
//
// Run:  node scripts/drop-salesleads.js          (dry-run)
//       node scripts/drop-salesleads.js --apply  (backup + drop)

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

  const collections = await db.listCollections({ name: "salesleads" }).toArray();
  if (collections.length === 0) {
    console.log("salesleads collection does not exist — nothing to do.");
    await mongoose.disconnect();
    return;
  }

  const docs = await db.collection("salesleads").find({}).toArray();
  console.log(`salesleads has ${docs.length} docs.`);

  const backupDir = path.join(__dirname, "backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `salesleads-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(docs, null, 2));
  console.log(`Backup written: ${backupFile}`);

  if (APPLY) {
    await db.collection("salesleads").drop();
    console.log("DROPPED salesleads collection.");
  } else {
    console.log("DRY-RUN: would drop salesleads. Re-run with --apply.");
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
