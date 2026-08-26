// Migration (B2): move sales-lead/production-order docs out of `users` into
// the dedicated `customers` collection, normalizing orderedProducts (B1).
//
// - _ids are PRESERVED so cross-refs (ProductLot.orderId, CustomerLog.customerId,
//   ActivityLog ownerId, ...) stay valid.
// - A JSON backup of every migrated doc is written to scripts/backup/ first.
// - Idempotent: docs already present in `customers` are skipped.
// - Source docs are removed from `users` only after a verified copy.
//
// Run:  node scripts/migrate-customers.js          (dry-run, no writes)
//       node scripts/migrate-customers.js --apply  (do it)

import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const APPLY = process.argv.includes("--apply");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Same normalization as customer.model.js (duplicated to keep the script
// standalone against raw collection data).
function normalizeOrderedProducts(raw) {
  if (raw === null || raw === undefined || raw === "") return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .filter(item => item !== null && item !== undefined && item !== "")
    .map(item => {
      if (typeof item === "string") return { formulaName: item };
      if (typeof item === "object") return item;
      return { formulaName: String(item) };
    });
}

// Auth-only fields stay on users; everything else moves to customers.
const AUTH_FIELDS = new Set([
  "_id", "googleId", "email", "name", "avatarUrl", "role",
  "line", "facebook", "tiktok", "createdAt", "updatedAt", "__v"
]);

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const usersCol = db.collection("users");
  const customersCol = db.collection("customers");
  const rolesCol = db.collection("roles");

  const customerRole = await rolesCol.findOne({ name: "ลูกค้า" });
  if (!customerRole) {
    console.log("No 'ลูกค้า' role found — nothing to migrate.");
    await mongoose.disconnect();
    return;
  }

  const leads = await usersCol.find({ role: customerRole._id }).toArray();
  console.log(`Found ${leads.length} customer docs in users collection.`);

  if (leads.length === 0) {
    await mongoose.disconnect();
    return;
  }

  // Backup first — always, even on dry-run.
  const backupDir = path.join(__dirname, "backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `users-customers-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(leads, null, 2));
  console.log(`Backup written: ${backupFile}`);

  let copied = 0, skipped = 0, removed = 0;
  const shapes = { array: 0, single: 0, strings: 0, empty: 0 };

  for (const doc of leads) {
    const op = doc.orderedProducts;
    if (Array.isArray(op) && op.some(x => typeof x === "string")) shapes.strings++;
    else if (Array.isArray(op) && op.length) shapes.array++;
    else if (op && !Array.isArray(op)) shapes.single++;
    else shapes.empty++;

    const customerDoc = {};
    for (const [k, v] of Object.entries(doc)) {
      if (k === "googleId" || k === "avatarUrl" || k === "role" || k === "__v") continue;
      customerDoc[k] = v;
    }
    // Synthetic lead emails (customer.<ts>@naiveops.com) are noise — keep real ones.
    if (typeof customerDoc.email === "string" && /^customer\.\d+/.test(customerDoc.email)) {
      customerDoc.email = "";
    }
    customerDoc.orderedProducts = normalizeOrderedProducts(op);

    const exists = await customersCol.findOne({ _id: doc._id }, { projection: { _id: 1 } });
    if (exists) {
      skipped++;
    } else if (APPLY) {
      await customersCol.insertOne(customerDoc);
      copied++;
    } else {
      copied++; // dry-run count
    }

    if (APPLY) {
      // Remove from users only after the copy is confirmed present.
      const confirmed = await customersCol.findOne({ _id: doc._id }, { projection: { _id: 1 } });
      if (confirmed) {
        await usersCol.deleteOne({ _id: doc._id });
        removed++;
      }
    }
  }

  console.log(`orderedProducts shapes seen:`, shapes);
  console.log(APPLY
    ? `APPLIED: copied ${copied}, skipped(existing) ${skipped}, removed from users ${removed}`
    : `DRY-RUN: would copy ${copied}, skip ${skipped}. Re-run with --apply to execute.`);

  const remainingUsers = await usersCol.countDocuments({});
  const totalCustomers = await customersCol.countDocuments({});
  console.log(`users now: ${remainingUsers}, customers now: ${totalCustomers}`);

  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
