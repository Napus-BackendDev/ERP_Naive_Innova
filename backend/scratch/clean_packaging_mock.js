// Undo seed_packaging_mock.js: remove the injected "สูตรทดสอบพรีเมียม (Mock)"
// line-items and reset the production state on the 8 Customer docs it polluted,
// so they stop appearing in the Production packaging / Final-QC stages.
// Usage:  node scratch/clean_packaging_mock.js          (dry-run, prints changes)
//         node scratch/clean_packaging_mock.js --apply  (writes the changes)
import mongoose from "mongoose";
import dotenv from "dotenv";
import Customer from "../src/features/customers/customer.model.js";

dotenv.config();

const MOCK_FORMULA = "สูตรทดสอบพรีเมียม (Mock)";
const APPLY = process.argv.includes("--apply");
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) { console.error("MONGODB_URI not found in .env"); process.exit(1); }

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected. Mode: ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  const docs = await Customer.find({ "orderedProducts.formulaName": MOCK_FORMULA });
  console.log(`Matched ${docs.length} customer(s) with mock line-items.\n`);

  let changed = 0;
  for (const c of docs) {
    const kept = (c.orderedProducts || []).filter(p => p.formulaName !== MOCK_FORMULA);
    console.log(`- ${c.name} | orderedProducts ${c.orderedProducts.length} -> ${kept.length} | status "${c.productionStatus}" -> "ยังไม่ผลิต"`);
    if (APPLY) {
      c.orderedProducts = kept;
      c.productionStatus = "ยังไม่ผลิต";
      c.productionStep = 1;
      c.packagingSubStep = "filling";
      c.lotPosition = "";
      c.lotStampNo = "";
      c.markModified("orderedProducts");
      await c.save();
    }
    changed++;
  }

  console.log(`\n${APPLY ? "Updated" : "Would update"} ${changed} doc(s).`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
