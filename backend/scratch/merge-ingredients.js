// Consolidate duplicate ingredients + unify ownership.
//
// Why: ingredients are created on the fly from free-text names, so every typo
// minted a NEW ingredient with its own stock. Real stock ended up split across
// near-duplicates ("Eco-guard Plus (Ethyl Lauroyl Arginate)" 5,795 vs
// "Ecoguard Plus" 1,000 vs "Ecogaurd plus" 1,000), and BOM formulas point at
// whichever spelling was typed that day — so deductions hit the wrong bucket.
//
//   node scratch/merge-ingredients.js            # dry run (default, no writes)
//   node scratch/merge-ingredients.js --apply    # write
import mongoose from "mongoose";
import dotenv from "dotenv";
import Ingredient from "../src/features/bom/ingredient.model.js";
import BomFormula from "../src/features/bom/bomFormula.model.js";

dotenv.config();
const APPLY = process.argv.includes("--apply");
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error("MONGODB_URI not found in .env"); process.exit(1); }

// The only real user left; the other two ownerIds belong to deleted accounts,
// which hides their ingredients from every non-admin login.
const TARGET_OWNER = "6a47598e8dd4cf1d9db3d1db";

// duplicate name -> canonical name. Same substance, different spelling; the
// canonical is the one holding real (non-placeholder) stock.
const ALIASES = {
  "Ecoguard Plus": "Eco-guard Plus (Ethyl Lauroyl Arginate)",
  "Ecogaurd plus": "Eco-guard Plus (Ethyl Lauroyl Arginate)",
  "Ecograd GC": "Ecoguard GC",
  // NOT merged, confirmed by the owner as genuinely different materials:
  //   Glycerine (กรุงเทพเคมีภัณฑ์) vs Glycerin (MyskinRecipes) — different supplier
  //   Carbopol Ultrez 21 vs Carbopol 21 — different grade
  //   MIPA-Laureth Sulfate (and)… vs Oil Soap (MIPA-Laureth Sulfate) — different grade
  "Aq": "Water (น้ำบริสุทธิ์ RO/DI)",
  "cacamidopropyl betain": "Cocamidopropyl Betaine",
  "PQ-7": "Polyquaternium-7",
  "hydrosol คาโมมาย": "Hydrosol Chamomile",
  "mirocare": "Microcare (Preservative)",
  "2 NaEDTA": "Disodium EDTA",
  "Hydrolyzed silk Protien": "Hydrolyzed Silk Protein",
  "Panthanol vitamin b5": "Panthenol (Pro-vitamin B5)",
  "Ethylhexylgycerin": "Ethylhexylglycerin",
  "Butylated hydroxytoluene﻿": "BHT (สารกันหืน)",
};

// Pure typos with no existing counterpart — renamed in place, nothing merged.
const RENAMES = {
  "Zine stearate": "Zinc Stearate",
  "Untramarine Blue": "Ultramarine Blue",
  "Polymetylsilsesquioxane 10 micron": "Polymethylsilsesquioxane 10 micron",
};

const strip = (s) => String(s || "").replace(/[﻿​-‍⁠]/g, "").trim();

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Mode: ${APPLY ? "APPLY (writing)" : "DRY RUN (no writes)"}\n`);

  const ingredients = await Ingredient.find({});
  const byName = new Map(ingredients.map((i) => [strip(i.name), i]));

  // ---- 1. merge duplicates -------------------------------------------------
  console.log("== 1. รวมสารซ้ำ ==");
  const toDelete = [];
  for (const [dupName, canonName] of Object.entries(ALIASES)) {
    const dup = byName.get(strip(dupName));
    const canon = byName.get(strip(canonName));
    if (!dup) { console.log(`  - ข้าม "${dupName}" (ไม่พบ)`); continue; }
    if (!canon) { console.log(`  ! "${canonName}" ไม่พบ — ข้าม "${dupName}"`); continue; }
    console.log(`  "${dupName}" (สต็อก ${dup.openingStock}) -> "${canonName}" (สต็อก ${canon.openingStock})  [ทิ้งสต็อกของตัวซ้ำ]`);
    toDelete.push(dup._id);
  }

  // ---- 2. repoint formulas -------------------------------------------------
  console.log("\n== 2. ชี้สูตรไปสารตัวจริง ==");
  const formulas = await BomFormula.find({});
  for (const f of formulas) {
    const bom = f.bom instanceof Map ? Object.fromEntries(f.bom) : f.bom || {};
    const phases = f.phases instanceof Map ? Object.fromEntries(f.phases) : f.phases || {};
    const nextBom = {}; const nextPhases = {}; const changes = [];
    for (const [k, v] of Object.entries(bom)) {
      const clean = strip(k);
      const target = ALIASES[clean] || ALIASES[k] || RENAMES[clean] || RENAMES[k] || clean;
      if (target !== k) changes.push(`${k} -> ${target}`);
      // merge amounts if both spellings appear in the same formula
      nextBom[target] = (nextBom[target] || 0) + v;
      if (phases[k] !== undefined) nextPhases[target] = phases[k];
    }
    if (changes.length) {
      console.log(`  [${f.name}] ${changes.join(", ")}`);
      if (APPLY) { f.bom = nextBom; f.phases = nextPhases; await f.save(); }
    }
  }

  // ---- 3. rename typos -----------------------------------------------------
  console.log("\n== 3. แก้ชื่อพิมพ์ผิด ==");
  for (const [from, to] of Object.entries(RENAMES)) {
    const ing = byName.get(strip(from));
    if (!ing) { console.log(`  - ข้าม "${from}" (ไม่พบ)`); continue; }
    console.log(`  "${from}" -> "${to}"`);
    if (APPLY) { ing.name = to; await ing.save(); }
  }

  // ---- 4. strip invisible chars from every name ----------------------------
  console.log("\n== 4. ล้างอักขระล่องหนในชื่อ ==");
  let cleaned = 0;
  for (const i of ingredients) {
    if (toDelete.some((d) => String(d) === String(i._id))) continue;
    const c = strip(i.name);
    if (c !== i.name) { console.log(`  "${i.name}" -> "${c}"`); cleaned++; if (APPLY) { i.name = c; await i.save(); } }
  }
  if (!cleaned) console.log("  (ไม่มี)");

  // ---- 5. unify ownership --------------------------------------------------
  console.log("\n== 5. รวมเจ้าของข้อมูล ==");
  const ingOther = await Ingredient.countDocuments({ ownerId: { $ne: new mongoose.Types.ObjectId(TARGET_OWNER) } });
  const fmlOther = await BomFormula.countDocuments({ ownerId: { $ne: new mongoose.Types.ObjectId(TARGET_OWNER) } });
  console.log(`  สาร ${ingOther} รายการ + สูตร ${fmlOther} รายการ -> owner ${TARGET_OWNER}`);
  if (APPLY) {
    await Ingredient.updateMany({}, { $set: { ownerId: new mongoose.Types.ObjectId(TARGET_OWNER) } });
    await BomFormula.updateMany({}, { $set: { ownerId: new mongoose.Types.ObjectId(TARGET_OWNER) } });
  }

  // ---- 6. delete the merged duplicates ------------------------------------
  console.log(`\n== 6. ลบสารซ้ำ ${toDelete.length} รายการ ==`);
  if (APPLY && toDelete.length) await Ingredient.deleteMany({ _id: { $in: toDelete } });

  console.log(`\n${APPLY ? "เสร็จสิ้น — เขียนลงฐานข้อมูลแล้ว" : "DRY RUN — ยังไม่เขียนอะไร รันซ้ำด้วย --apply เพื่อลงจริง"}`);
  console.log(`สารคงเหลือหลังรวม: ${ingredients.length - toDelete.length} (จาก ${ingredients.length})`);
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
