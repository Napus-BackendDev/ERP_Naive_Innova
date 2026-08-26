// Reduce packagingtypes to exactly the 5 the business uses (user request):
//   บรรจุภัณฑ์, หัวฉีด, ไปรษณีย์, สติกเกอร์, อื่นๆ
// Any packaging item pointing at a to-be-removed type is remapped to อื่นๆ
// first (so nothing loses its category), then the extra types are deleted.
// Backs up all packagingtypes to scripts/backup/ before touching anything.
//
// Run:  node scripts/prune-packaging-types.js          (dry-run)
//       node scripts/prune-packaging-types.js --apply

import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const APPLY = process.argv.includes("--apply");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KEEP = ["บรรจุภัณฑ์", "หัวฉีด", "ไปรษณีย์", "สติกเกอร์", "อื่นๆ"];
const FALLBACK = "อื่นๆ";

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const types = await db.collection("packagingtypes").find({}).toArray();
  console.log(`packagingtypes: ${types.length} — [${types.map(t => t.name).join(", ")}]`);

  const backupDir = path.join(__dirname, "backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(backupDir, `packagingtypes-${stamp}.json`), JSON.stringify(types, null, 2));

  const keepDocs = types.filter(t => KEEP.includes(t.name));
  const dropDocs = types.filter(t => !KEEP.includes(t.name));
  const missing = KEEP.filter(k => !types.some(t => t.name === k));

  console.log(`keep: ${keepDocs.map(t => t.name).join(", ")}`);
  console.log(`drop: ${dropDocs.map(t => t.name).join(", ") || "(none)"}`);
  if (missing.length) console.log(`missing (need create): ${missing.join(", ")}`);

  const dropIds = dropDocs.map(t => t._id);
  const affected = dropIds.length
    ? await db.collection("packagingitems").countDocuments({ type: { $in: dropIds } })
    : 0;
  console.log(`packaging items on to-drop types: ${affected} (will remap -> ${FALLBACK})`);

  if (!APPLY) {
    console.log("DRY-RUN. Re-run with --apply.");
    await mongoose.disconnect();
    return;
  }

  // Ensure the 5 keepers exist (create any missing, owned by the first type's owner)
  const ownerId = types[0]?.ownerId;
  for (const name of missing) {
    await db.collection("packagingtypes").insertOne({ ownerId, name, createdAt: new Date(), updatedAt: new Date() });
    console.log(`created type: ${name}`);
  }

  // Remap items off the dropped types
  if (dropIds.length) {
    const fallback = await db.collection("packagingtypes").findOne({ name: FALLBACK });
    if (fallback) {
      const r = await db.collection("packagingitems").updateMany(
        { type: { $in: dropIds } },
        { $set: { type: fallback._id } }
      );
      console.log(`remapped ${r.modifiedCount} items -> ${FALLBACK}`);
    }
    const del = await db.collection("packagingtypes").deleteMany({ _id: { $in: dropIds } });
    console.log(`deleted ${del.deletedCount} extra types`);
  }

  const after = await db.collection("packagingtypes").find({}).project({ name: 1 }).toArray();
  console.log(`packagingtypes now: [${after.map(t => t.name).join(", ")}]`);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
