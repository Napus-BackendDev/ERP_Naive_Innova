// Remove the throwaway ingredients created while testing the create-dedupe
// guard. Lists candidates first; pass --apply to delete.
//   node scratch/clean-test-ingredients.js          # dry run
//   node scratch/clean-test-ingredients.js --apply
import mongoose from "mongoose";
import dotenv from "dotenv";
import Ingredient from "../src/features/bom/ingredient.model.js";
import BomFormula from "../src/features/bom/bomFormula.model.js";

dotenv.config();
const APPLY = process.argv.includes("--apply");
if (!process.env.MONGODB_URI) { console.error("MONGODB_URI not found"); process.exit(1); }

// Exact names produced by the test calls (the water one arrived mojibaked
// because the shell mangled the Thai in the request body).
const TEST_NAMES = ["eco-guard plus", "MIROCARE"];
const MOJIBAKE = /^water \(.*RO\/DI\)$/i; // lowercase "water" = the broken test row

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const all = await Ingredient.find({});
  const formulas = await BomFormula.find({});

  const referenced = new Set();
  for (const f of formulas) {
    const bom = f.bom instanceof Map ? Object.fromEntries(f.bom) : f.bom || {};
    Object.keys(bom).forEach((k) => referenced.add(k));
  }

  const victims = all.filter(
    (i) => (TEST_NAMES.includes(i.name) || MOJIBAKE.test(i.name)) && !referenced.has(i.name)
  );

  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"} | สารทั้งหมด ${all.length}`);
  if (!victims.length) { console.log("ไม่พบสารทดสอบค้าง ✓"); await mongoose.disconnect(); return; }
  victims.forEach((v) => console.log(`  ลบ: "${v.name}" (สต็อก ${v.openingStock})`));

  if (APPLY) {
    await Ingredient.deleteMany({ _id: { $in: victims.map((v) => v._id) } });
    console.log(`\nลบแล้ว ${victims.length} รายการ — เหลือ ${all.length - victims.length}`);
  } else {
    console.log(`\nDRY RUN — รันซ้ำด้วย --apply เพื่อลบจริง`);
  }
  await mongoose.disconnect();
}
run().catch((e) => { console.error(e); process.exit(1); });
