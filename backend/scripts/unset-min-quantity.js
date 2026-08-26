// Remove the "จำนวนขั้นต่ำ" fields from the live DB (user-requested cleanup):
//   packagingitems.initialQuantity, products.initialQuantity,
//   nozzles.initialQuantity, productskus.minStock
// Non-destructive to any other field — plain $unset, counts reported.
//
// Run:  node scripts/unset-min-quantity.js          (dry-run: counts only)
//       node scripts/unset-min-quantity.js --apply

import "dotenv/config";
import mongoose from "mongoose";

const APPLY = process.argv.includes("--apply");

const TARGETS = [
  ["packagingitems", "initialQuantity"],
  ["products", "initialQuantity"],
  ["nozzles", "initialQuantity"],
  ["productskus", "minStock"]
];

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  for (const [coll, field] of TARGETS) {
    const count = await db.collection(coll).countDocuments({ [field]: { $exists: true } });
    if (APPLY) {
      const res = await db.collection(coll).updateMany(
        { [field]: { $exists: true } },
        { $unset: { [field]: "" } }
      );
      console.log(`${coll}.${field}: unset on ${res.modifiedCount}/${count} docs`);
    } else {
      console.log(`${coll}.${field}: ${count} docs have the field (dry-run)`);
    }
  }

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
