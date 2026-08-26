// Restore the `nozzles` collection from a backup JSON (re-inserts docs with
// their original _ids). Skips docs whose _id already exists.
//   node scripts/restore-nozzles.js <backup-file>
import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2];
if (!file) throw new Error("usage: node restore-nozzles.js <backup-file>");

function reviveOids(doc) {
  const out = {};
  for (const [k, v] of Object.entries(doc)) {
    if (v && typeof v === "object" && v.$oid) out[k] = new mongoose.Types.ObjectId(v.$oid);
    else if (v && typeof v === "object" && v.$date) out[k] = new Date(v.$date);
    else out[k] = v;
  }
  return out;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
  const col = mongoose.connection.db.collection("nozzles");
  const raw = JSON.parse(fs.readFileSync(path.isAbsolute(file) ? file : path.join(__dirname, file), "utf-8"));
  let inserted = 0, skipped = 0;
  for (const d of raw) {
    const doc = reviveOids(d);
    const exists = await col.findOne({ _id: doc._id }, { projection: { _id: 1 } });
    if (exists) { skipped++; continue; }
    await col.insertOne(doc);
    inserted++;
  }
  console.log(`restore done — inserted: ${inserted}, skipped(existing): ${skipped}, total now: ${await col.countDocuments({})}`);
  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
