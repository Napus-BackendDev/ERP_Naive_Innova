import express from "express";
import Ingredient from "./ingredient.model.js";
import BomFormula, { normalizeFormulaName } from "./bomFormula.model.js";
import ProductLot from "../fg/productLot.model.js";
import LotPrefixConfig from "../fg/lotPrefixConfig.model.js";
import Product from "../products/product.model.js";
import Customer from "../customers/customer.model.js";
import { stockMovementDescription, writeStockMovementLog } from "../logs/stockMovementLog.js";
import { checkAuth } from "../../middleware/auth.js";

const router = express.Router();

router.use(checkAuth);

const isAdminUser = (req) => req.user.role &&
  (req.user.role.name === "Admin" || req.user.role === "Admin");

const ownerFilter = (req) => isAdminUser(req) ? {} : { ownerId: req.user._id };

const asPlain = (value) => value instanceof Map ? Object.fromEntries(value) : value;
const formulaContentChanged = (current, payload, keys) => keys.some((key) => {
  if (payload[key] === undefined) return false;
  return JSON.stringify(asPlain(current[key])) !== JSON.stringify(payload[key]);
});

const formulaSnapshot = (formula) => {
  const bom = formula?.bom instanceof Map ? Object.fromEntries(formula.bom) : (formula?.bom || {});
  const phases = formula?.phases instanceof Map ? Object.fromEntries(formula.phases) : (formula?.phases || {});
  return {
    formulaId: formula?._id || null,
    formulaName: formula?.name || "",
    formulaVersion: formula?.version || 1,
    bom,
    phases,
    note: Array.isArray(formula?.note) ? [...formula.note] : (formula?.note ? [formula.note] : []),
    procedures: Array.isArray(formula?.procedures) ? [...formula.procedures] : [],
    qcSpec: formula?.qcSpec || {},
    qcChecklistItems: Array.isArray(formula?.qcChecklistItems) ? [...formula.qcChecklistItems] : [],
    qcMethod: formula?.qcMethod || ""
  };
};

const formatFormula = (item) => {
  const bomObj = item.bom instanceof Map ? Object.fromEntries(item.bom) : (item.bom || {});
  const phasesObj = item.phases instanceof Map ? Object.fromEntries(item.phases) : (item.phases || {});
  const ingredients = Object.entries(bomObj).map(([name, ratio]) => ({
    name,
    ratio: ratio / 1000,
    phase: phasesObj[name] || "A"
  }));
  return {
    _id: item._id,
    name: item.name,
    normalizedName: item.normalizedName || normalizeFormulaName(item.name),
    version: item.version || 1,
    isArchived: !!item.isArchived,
    archivedAt: item.archivedAt || null,
    color: item.color,
    bom: bomObj,
    phases: phasesObj,
    note: Array.isArray(item.note) ? item.note : (item.note ? [item.note] : []),
    procedures: item.procedures || [],
    qcSpec: item.qcSpec || {},
    qcChecklistItems: item.qcChecklistItems || [],
    qcMethod: item.qcMethod || "",
    ingredients
  };
};

// Get ingredients
router.get("/ingredients", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin ? {} : { ownerId: req.user._id };
    const items = await Ingredient.find(filter);
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get formulas
router.get("/formulas", async (req, res) => {
  try {
    const filter = {
      ...ownerFilter(req),
      ...(req.query.includeArchived === "true" ? {} : { isArchived: { $ne: true } })
    };
    const items = await BomFormula.find(filter).sort({ name: 1 });
    return res.json(items.map(formatFormula));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Calculate BOM requirements
router.post("/calculate", async (req, res) => {
  try {
    const { plan, formulaId, quantityKg } = req.body;
    const requestedLines = formulaId
      ? [{ formulaId, quantityKg }]
      : (plan && typeof plan === "object"
        ? Object.entries(plan).map(([formulaName, kg]) => ({ formulaName, quantityKg: kg }))
        : null);
    if (!requestedLines) return res.status(400).json({ message: "Invalid formula calculation payload." });

    const filter = ownerFilter(req);
    const formulas = await BomFormula.find({ ...filter, isArchived: { $ne: true } });
    const ingredients = await Ingredient.find(filter);

    // Build ingredient stock mapping
    const stockMap = {};
    ingredients.forEach(ing => {
      stockMap[ing.name] = ing.openingStock;
    });

    const need = {};
    let anyPlan = false;

    for (const line of requestedLines) {
      const quantity = parseFloat(line.quantityKg) || 0;
      if (quantity > 0) {
        anyPlan = true;
        const formula = line.formulaId
          ? formulas.find(f => String(f._id) === String(line.formulaId))
          : formulas.find(f => f.name === line.formulaName);
        if (!formula) return res.status(404).json({ message: "Formula not found or archived.", formulaId: line.formulaId, formulaName: line.formulaName });
        formula.bom.forEach((value, ingredientName) => {
          // value = grams per 1 kg; quantity = kg; result = grams.
          need[ingredientName] = (need[ingredientName] || 0) + value * quantity;
        });
      }
    }

    if (!anyPlan) {
      return res.json({ results: [] });
    }

    // Assemble results
    const results = Object.entries(need).map(([name, totalRequired]) => {
      const stock = stockMap[name] || 0;
      const sufficient = stock >= totalRequired;
      const shortage = sufficient ? 0 : totalRequired - stock;

      return {
        name,
        required: totalRequired,
        stock,
        sufficient,
        shortage
      };
    }).sort((a, b) => b.required - a.required);

    return res.json({ results });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Normalize an ingredient name for duplicate detection: strip invisible marks
// (a stray U+FEFF once created a second "Butylated hydroxytoluene"), collapse
// whitespace/punctuation and case. "Eco-guard Plus" == "ecoguard plus".
export function normalizeIngredientName(name) {
  return String(name || "")
    .replace(/[﻿​-‍ ]/g, "")
    .toLowerCase()
    .replace(/[\s\-_.()]+/g, "")
    .trim();
}

// Create a new ingredient — or return the existing one when the name only
// differs by case/spacing/punctuation. Every typo used to mint a NEW ingredient
// with its own stock, which silently split real stock across near-duplicates.
router.post("/ingredients", async (req, res) => {
  try {
    const { name, openingStock, supplier, pricePerKg, image } = req.body;
    const cleanName = String(name || "").replace(/[﻿​-‍ ]/g, "").trim();
    if (!cleanName) return res.status(400).json({ message: "ต้องระบุชื่อสารเคมี" });

    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const scope = isAdmin ? {} : { ownerId: req.user._id };
    const key = normalizeIngredientName(cleanName);
    const existing = (await Ingredient.find(scope)).find(
      (i) => normalizeIngredientName(i.name) === key
    );
    if (existing) {
      // 200 (not 201) + a flag so the client can say "ใช้สารเดิมที่มีอยู่แล้ว".
      return res.status(200).json({ ...existing.toObject(), _reusedExisting: true });
    }

    const newIngredient = new Ingredient({
      ownerId: req.user._id,
      name: cleanName,
      openingStock: parseFloat(openingStock) || 0,
      supplier: supplier || "",
      pricePerKg: parseFloat(pricePerKg) || 0,
      image: image || ""
    });
    await newIngredient.save();
    return res.status(201).json(newIngredient);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Bulk import/upsert ingredients
router.post("/ingredients/bulk", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "Invalid payload, items array is required." });
    }
    const results = [];
    for (const item of items) {
      const name = item.name ? String(item.name).trim() : "";
      if (!name) continue;
      
      const updated = await Ingredient.findOneAndUpdate(
        { ownerId: req.user._id, name },
        {
          $set: {
            openingStock: parseFloat(item.openingStock) || 0,
            supplier: item.supplier || "",
            pricePerKg: parseFloat(item.pricePerKg) || 0
          }
        },
        { new: true, upsert: true }
      );
      results.push(updated);
    }
    return res.json({ message: `Imported ${results.length} items successfully.`, results });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Create ingredient transaction (adjust quantity)
router.post("/ingredients/tx", async (req, res) => {
  try {
    const { itemId, type, amount, note } = req.body; // type: 'in' or 'out'
    const qty = parseFloat(amount);

    if (!itemId || !type || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: "Invalid transaction arguments." });
    }

    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin ? { _id: itemId } : { _id: itemId, ownerId: req.user._id };
    const item = await Ingredient.findOne(filter);
    if (!item) {
      return res.status(404).json({ message: "Ingredient not found or unauthorized." });
    }

    const beforeQuantity = Number(item.openingStock) || 0;
    const adjustment = type === "in" ? qty : -qty;
    item.openingStock = Math.max(0, item.openingStock + adjustment);
    await item.save();

    // Log the transaction
    try {
      await writeStockMovementLog({
        ownerId: req.user._id,
        actionType: "INGREDIENT",
        description: stockMovementDescription({ itemName: item.name, direction: type, amount: qty, unit: "ก.", afterQuantity: item.openingStock, note }),
        operator: req.user.name || req.user.email,
        itemType: "ingredient",
        itemId: item._id,
        itemName: item.name,
        direction: type,
        amount: qty,
        unit: "ก.",
        beforeQuantity,
        afterQuantity: item.openingStock,
        source: "manual-adjustment",
        stage: type === "in" ? "รับเข้าสต็อก" : "ปรับสต็อกด้วยมือ",
        note
      });
    } catch (logErr) {
      console.error("Failed to write activity log:", logErr);
    }

    return res.json({
      message: "Transaction logged successfully.",
      item
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Update an ingredient
router.put("/ingredients/:id", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, ownerId: req.user._id };
    const original = req.body.openingStock !== undefined
      ? await Ingredient.findOne(filter).select("openingStock")
      : null;
    const updated = await Ingredient.findOneAndUpdate(
      filter,
      { $set: req.body },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Ingredient not found." });
    }
    if (original) {
      const beforeQuantity = Number(original.openingStock) || 0;
      const afterQuantity = Number(updated.openingStock) || 0;
      if (beforeQuantity !== afterQuantity) {
        const direction = afterQuantity > beforeQuantity ? "in" : "out";
        try {
          await writeStockMovementLog({
            ownerId: req.user._id,
            actionType: "INGREDIENT",
            description: stockMovementDescription({ itemName: updated.name, direction, amount: Math.abs(afterQuantity - beforeQuantity), unit: "ก.", afterQuantity }),
            operator: req.user.name || req.user.email,
            itemType: "ingredient",
            itemId: updated._id,
            itemName: updated.name,
            direction,
            amount: Math.abs(afterQuantity - beforeQuantity),
            unit: "ก.",
            beforeQuantity,
            afterQuantity,
            source: "manual-adjustment",
            stage: direction === "in" ? "รับเข้าสต็อก" : "ปรับสต็อกด้วยมือ",
            note: req.body.note || ""
          });
        } catch (logErr) {
          console.error("Failed to write ingredient edit movement log:", logErr);
        }
      }
    }
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete an ingredient
router.delete("/ingredients/:id", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, ownerId: req.user._id };
    
    const deleted = await Ingredient.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({ message: "Ingredient not found." });
    }
    return res.json({ message: "Ingredient deleted successfully." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Create a new formula
router.post("/formulas", async (req, res) => {
  try {
    const { name, color, bom, phases, note, procedures, qcSpec, qcChecklistItems, qcMethod } = req.body;
    const cleanName = String(name || "").normalize("NFKC").trim();
    if (!cleanName) return res.status(400).json({ message: "Formula name is required." });
    const normalizedName = normalizeFormulaName(cleanName);
    const duplicate = await BomFormula.findOne({
      ownerId: req.user._id,
      normalizedName,
      isArchived: { $ne: true }
    });
    if (duplicate) return res.status(409).json({ message: "An active formula with this name already exists.", formulaId: duplicate._id });
    const newFormula = new BomFormula({
      ownerId: req.user._id,
      name: cleanName,
      normalizedName,
      version: 1,
      color: color || "#2E7D32",
      bom: bom || {},
      phases: phases || {},
      note: note || [],
      procedures: procedures || [],
      qcSpec: qcSpec || {},
      qcChecklistItems: qcChecklistItems || [],
      qcMethod: qcMethod || ""
    });
    await newFormula.save();
    return res.status(201).json(formatFormula(newFormula));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Bulk import/upsert formulas
router.post("/formulas/bulk", async (req, res) => {
  try {
    const { formulas } = req.body;
    if (!Array.isArray(formulas)) {
      return res.status(400).json({ message: "Invalid payload, formulas array is required." });
    }
    const results = [];
    for (const f of formulas) {
      const name = f.name ? String(f.name).normalize("NFKC").trim() : "";
      if (!name) continue;
      const normalizedName = normalizeFormulaName(name);

      const existing = await BomFormula.findOne({ ownerId: req.user._id, normalizedName, isArchived: { $ne: true } });
      const updated = existing
        ? await BomFormula.findByIdAndUpdate(existing._id, {
          $set: { name, normalizedName, color: f.color || "#2E7D32", bom: f.bom || {}, phases: f.phases || {}, note: f.note || [], procedures: f.procedures || [] },
          $inc: { version: 1 }
        }, { new: true })
        : await BomFormula.create({ ownerId: req.user._id, name, normalizedName, version: 1, color: f.color || "#2E7D32", bom: f.bom || {}, phases: f.phases || {}, note: f.note || [], procedures: f.procedures || [] });
      results.push(formatFormula(updated));
    }
    return res.json({ message: `Imported ${results.length} formulas successfully.`, results });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Update a formula
router.put("/formulas/:id", async (req, res) => {
  try {
    const current = await BomFormula.findOne({ ...ownerFilter(req), _id: req.params.id });
    if (!current) return res.status(404).json({ message: "Formula not found." });

    const nextName = req.body.name === undefined
      ? current.name
      : String(req.body.name || "").normalize("NFKC").trim();
    if (!nextName) return res.status(400).json({ message: "Formula name is required." });
    const nextNormalizedName = normalizeFormulaName(nextName);
    const duplicate = await BomFormula.findOne({
      ...ownerFilter(req),
      normalizedName: nextNormalizedName,
      _id: { $ne: current._id },
      isArchived: { $ne: true }
    });
    if (duplicate) return res.status(409).json({ message: "An active formula with this name already exists.", formulaId: duplicate._id });

    const allowed = ["color", "bom", "phases", "note", "procedures", "qcSpec", "qcChecklistItems", "qcMethod"];
    const set = { name: nextName, normalizedName: nextNormalizedName };
    for (const key of allowed) if (req.body[key] !== undefined) set[key] = req.body[key];
    const contentChanged = formulaContentChanged(current, req.body, allowed);
    const updateOps = { $set: set };
    if (contentChanged) updateOps.$inc = { version: 1 };
    const updated = await BomFormula.findOneAndUpdate(
      { ...ownerFilter(req), _id: current._id },
      updateOps,
      { new: true }
    );

    // Keep pending order display snapshots aligned with the editable formula.
    // The formulaId is the authoritative link; produced lines are deliberately
    // excluded because their Lot snapshot is immutable.
    if (nextName !== current.name) {
      const renameSet = {
        $set: {
          "orderedProducts.$[line].formulaId": current._id,
          "orderedProducts.$[line].formulaName": nextName
        }
      };
      await Customer.updateMany(
        {
          ...ownerFilter(req),
          orderedProducts: { $elemMatch: { formulaId: current._id, producedLotId: { $exists: false } } }
        },
        renameSet,
        { arrayFilters: [{ "line.formulaId": current._id, "line.producedLotId": { $exists: false } }] }
      );
      // Legacy rows have no formulaId. Keep them safe during a rename, but do
      // not overwrite a line already linked to a different formulaId.
      await Customer.updateMany(
        {
          ...ownerFilter(req),
          orderedProducts: { $elemMatch: { formulaName: current.name, formulaId: { $exists: false }, producedLotId: { $exists: false } } }
        },
        renameSet,
        { arrayFilters: [{ "line.formulaName": current.name, "line.formulaId": { $exists: false }, "line.producedLotId": { $exists: false } }] }
      );
      await LotPrefixConfig.updateMany(
        {
          ...ownerFilter(req),
          $or: [{ formulaId: current._id }, { formulaName: current.name }]
        },
        { $set: { formulaId: current._id, formulaName: nextName } }
      );
      await Product.updateMany(
        {
          ...ownerFilter(req),
          $or: [{ formulaId: current._id }, { formulaName: current.name }]
        },
        { $set: { formulaId: current._id, formulaName: nextName } }
      );
    }
    return res.json(formatFormula(updated));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete a formula
router.delete("/formulas/:id", async (req, res) => {
  try {
    const formula = await BomFormula.findOne({ ...ownerFilter(req), _id: req.params.id });
    if (!formula) return res.status(404).json({ message: "Formula not found." });
    const pendingCount = await Customer.countDocuments({
      ...ownerFilter(req),
      orderedProducts: {
        $elemMatch: {
          producedLotId: { $exists: false },
          $or: [{ formulaId: formula._id }, { formulaName: formula.name }]
        }
      }
    });
    if (pendingCount > 0) {
      return res.status(409).json({
        message: "Formula is still referenced by pending production orders.",
        pendingOrderCount: pendingCount
      });
    }
    formula.isArchived = true;
    formula.archivedAt = new Date();
    await formula.save();
    return res.json({ message: "Formula archived successfully.", formula: formatFormula(formula) });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Confirm and execute a production order: deducts ingredient stocks and receives a product lot
// The single place a real lot number is minted. Priority:
//   1. the number the customer asked for (Sales spec modal, "แจ้งเลขล็อก" ticked)
//   2. the formula's own prefix + production date  -> "BS20260722"
//   3. whatever the caller sent (older clients)
// Before this, R&D minted "LOT-<date>-<random4>": the number in the system could
// not be traced back to a formula and never matched the one stamped on the bottle.
async function resolveLotNo({ ownerId, formulaId, formulaName, mfgDate, requestedLotNo, fallbackLotNo }) {
  const asked = String(requestedLotNo || "").trim();
  if (asked) return asked;
  try {
    const LotPrefixConfig = (await import("../fg/lotPrefixConfig.model.js")).default;
    const cfg = formulaId
      ? await LotPrefixConfig.findOne({ ownerId, formulaId })
      : await LotPrefixConfig.findOne({ ownerId, formulaName });
    if (cfg?.prefix) {
      const d = mfgDate ? new Date(mfgDate) : new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      return `${cfg.prefix.toUpperCase()}${ymd}`;
    }
  } catch (err) {
    console.error("Failed to resolve lot prefix:", err);
  }
  return fallbackLotNo;
}

router.post("/confirm-production", async (req, res) => {
  try {
    const { plan, formulaId, quantityKg, productId, lotNo, mfgDate, expDate, lotQuantity, customer, customerId } = req.body;
    // Which orderedProducts line this confirm is for. Optional (legacy callers
    // omit it) — when present the lot and producedLotId are scoped to that line
    // instead of the whole order.
    const rawIdx = req.body.productIndex;
    const productIndex = (rawIdx !== undefined && rawIdx !== null && rawIdx !== "" && !isNaN(Number(rawIdx)))
      ? Number(rawIdx)
      : null;
    
    if ((!formulaId && (!plan || typeof plan !== "object")) || !productId || !lotNo || !mfgDate || !expDate || !lotQuantity) {
      return res.status(400).json({ message: "ข้อมูลสั่งผลิตไม่ครบถ้วนสำหรับการลงทะเบียนล็อต" });
    }

    const filter = ownerFilter(req);

    const formulas = await BomFormula.find({ ...filter, isArchived: { $ne: true } });
    const ingredients = await Ingredient.find(filter);

    let activeFormula;
    let effectiveQuantityKg = parseFloat(quantityKg) || 0;
    if (formulaId) {
      activeFormula = formulas.find(f => String(f._id) === String(formulaId));
      if (!activeFormula) return res.status(404).json({ message: "Formula not found or archived.", formulaId });
      if (!(effectiveQuantityKg > 0) && plan && typeof plan === "object") {
        effectiveQuantityKg = parseFloat(Object.values(plan)[0]) || 0;
      }
    } else {
      const legacy = Object.entries(plan).find(([_, kg]) => parseFloat(kg) > 0);
      if (legacy) {
        activeFormula = formulas.find(f => f.name === legacy[0]);
        effectiveQuantityKg = parseFloat(legacy[1]) || 0;
        console.warn("Legacy BOM confirm payload used formulaName; migrate caller to formulaId.", { formulaName: legacy[0] });
      }
    }
    if (!activeFormula || !(effectiveQuantityKg > 0)) {
      return res.status(400).json({ message: "Formula and quantityKg are required for production confirmation." });
    }

    // Development orders are research work, not production runs. Guard here as
    // well as in the frontend so a direct or legacy API call cannot deduct stock.
    let custUser = null;
    if (customerId) {
      custUser = await Customer.findById(customerId);
    } else if (customer && customer !== "Naive") {
      custUser = await Customer.findOne({ name: customer });
    }
    const orderLine = (productIndex !== null && Array.isArray(custUser?.orderedProducts))
      ? custUser.orderedProducts[productIndex]
      : (Array.isArray(custUser?.orderedProducts) ? custUser.orderedProducts[0] : null);
    const isDevelopmentOrder = custUser?.orderType === "develop"
      || custUser?.orderType === "development"
      || orderLine?.isDevelopment === true;
    if (isDevelopmentOrder) {
      return res.status(409).json({ message: "Development orders do not deduct stock." });
    }

    const need = {};
    activeFormula.bom?.forEach((value, ingredientName) => {
      need[ingredientName] = (need[ingredientName] || 0) + value * effectiveQuantityKg;
    });

    const errors = [];
    Object.entries(need).forEach(([name, reqGram]) => {
      const ing = ingredients.find(i => i.name === name);
      const stock = ing ? ing.openingStock : 0;
      if (stock < reqGram) {
        errors.push(`วัตถุดิบ "${name}" ไม่เพียงพอ (ต้องการ: ${reqGram.toLocaleString()} ก., คงเหลือ: ${stock.toLocaleString()} ก.)`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({ message: "วัตถุดิบสารเคมีไม่เพียงพอ", errors });
    }

    // Deduct stock
    for (const [name, reqGram] of Object.entries(need)) {
      const ing = ingredients.find(i => i.name === name);
      if (ing) {
        const beforeQuantity = Number(ing.openingStock) || 0;
        ing.openingStock -= reqGram;
        if (ing.openingStock < 0) ing.openingStock = 0;
        await ing.save();
        try {
          await writeStockMovementLog({
            ownerId: req.user._id,
            actionType: "INGREDIENT",
            description: stockMovementDescription({ itemName: ing.name, direction: "out", amount: reqGram, unit: "ก.", afterQuantity: ing.openingStock }),
            operator: req.user.name || req.user.email,
            itemType: "ingredient",
            itemId: ing._id,
            itemName: ing.name,
            direction: "out",
            amount: reqGram,
            unit: "ก.",
            beforeQuantity,
            afterQuantity: ing.openingStock,
            source: "bom-confirm",
            stage: "ยืนยัน BOM / ตัดสารเคมี"
          });
        } catch (logErr) {
          console.error("Failed to write ingredient movement log:", logErr);
        }
      }
    }

    const activeFormulaName = activeFormula.name;
    const effectivePlan = { [activeFormulaName]: effectiveQuantityKg };

    // Customer order and line were resolved above for the development guard and
    // remain available here for lot linkage.
    // A customer-requested lot number lives on the ordered line ("แจ้งเลขล็อก" in
    // the Sales spec modal). It only counts when that box was ticked — otherwise
    // the field holds a preview of the auto-generated value, not a real request.
    const requestedLotNo = orderLine?.notifyLot ? orderLine?.lotNo : "";

    const finalLotNo = await resolveLotNo({
      ownerId: req.user._id,
      formulaId: activeFormula._id,
      formulaName: activeFormulaName,
      mfgDate,
      requestedLotNo,
      fallbackLotNo: lotNo
    });

    // Create the Product Lot
    const lot = new ProductLot({
      ownerId: req.user._id,
      orderId: custUser?._id,
      productIndex,
      source: "bom-confirm",
      productId,
      formulaId: activeFormula._id,
      formulaName: activeFormulaName,
      formulaVersion: activeFormula.version || 1,
      formulaSnapshot: formulaSnapshot(activeFormula),
      lotNo: finalLotNo,
      mfgDate: new Date(mfgDate),
      expDate: new Date(expDate),
      quantity: parseInt(lotQuantity) || 0,
      customer: customer || "Naive",
      bomPlan: effectivePlan
    });
    await lot.save();
    try {
      await writeStockMovementLog({
        ownerId: req.user._id,
        actionType: "FG",
        description: stockMovementDescription({ itemName: lot.lotNo, direction: "in", amount: lot.quantity, unit: lot.unit || "ชิ้น", afterQuantity: lot.quantity }),
        operator: req.user.name || req.user.email,
        itemType: "fgLot",
        itemId: lot._id,
        itemName: lot.lotNo,
        direction: "in",
        amount: lot.quantity,
        unit: lot.unit || "ชิ้น",
        beforeQuantity: 0,
        afterQuantity: lot.quantity,
        source: "bom-confirm",
        stage: "ยืนยัน BOM / สร้างล็อต FG",
        relatedOrderId: custUser?._id,
        relatedOrderName: custUser?.name || customer || "",
        relatedLotId: lot._id
      });
    } catch (logErr) {
      console.error("Failed to write BOM FG receipt movement log:", logErr);
    }

    // After confirming chemicals, the order is ready for Production material prep
    // (the "เตรียมพัสดุ" tab), NOT straight into the line. Prep-confirm advances it
    // to "กำลังผลิต" afterward.
    try {
      if (custUser) {
        if (!custUser.productionStatus || custUser.productionStatus === "ยังไม่ผลิต") {
          custUser.productionStatus = "รอยืนยัน";
        }
        if (!custUser.producedLotId) custUser.producedLotId = lot._id;
        // Populate the typed order→recipe link (was previously never written).
        if (!custUser.formulaId) custUser.formulaId = activeFormula._id;

        if (custUser.orderedProducts && Array.isArray(custUser.orderedProducts)) {
          custUser.orderedProducts = custUser.orderedProducts.map((p, idx) => {
            // Prefer the explicit line index; fall back to the legacy name match
            // for callers that don't send productIndex. Name matching alone tagged
            // the wrong line when an order has two variants of the same formula.
            const isMatch = productIndex !== null
              ? idx === productIndex
              : (String(p.formulaId || "") === String(activeFormula._id) ||
                 p.formulaName === activeFormulaName ||
                 p.name === activeFormulaName ||
                 (p.formulaName === "ผลิตสูตรเอง" && activeFormulaName.includes("สูตรเฉพาะตัว ของ") && activeFormulaName.includes(custUser.name)));
            if (isMatch) {
              return {
                ...p,
                formulaId: activeFormula._id,
                formulaName: activeFormulaName,
                isConfirmed: true,
                // Per-product link — the guard that decides whether a line still
                // needs a BOM confirm reads this, not the order-level field.
                producedLotId: p.producedLotId || lot._id,
                // Seed the number the operator will stamp on the bottle with the
                // lot that was just created, so the physical stamp and the system
                // record start out identical instead of being typed twice. Only
                // when empty — never overwrite what the operator already entered.
                lotStampNo: p.lotStampNo || finalLotNo,
                lotStampMfg: p.lotStampMfg || String(mfgDate || ""),
                lotStampExp: p.lotStampExp || String(expDate || "")
              };
            }
            return p;
          });
          custUser.markModified("orderedProducts");
        }
        
        await custUser.save();
        
        // Write activity log
        try {
          const ActivityLog = (await import("../logs/activityLog.model.js")).default;
          const log = new ActivityLog({
            ownerId: req.user._id,
            actionType: "PRODUCTION",
            description: `ยืนยันสั่งผลิต (ตัดสารเคมี) ของลูกค้า "${custUser.name}" — พร้อมเตรียมพัสดุในสายการผลิต`,
            operator: req.user.name || req.user.email
          });
          await log.save();
        } catch (logErr) {
          console.error("Failed to write activity log:", logErr);
        }
      }
    } catch (err) {
      console.error("Failed to auto-update customer productionStatus:", err);
    }

    return res.status(201).json({
      message: "ดำเนินการยืนยันสั่งผลิตและลงทะเบียนล็อตสินค้าสำเร็จเรียบร้อยแล้ว",
      lot,
      deductedIngredients: need
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/revert-production", async (req, res) => {
  try {
    const { customerId } = req.body;
    if (!customerId) {
      return res.status(400).json({ message: "ไม่พบรหัสลูกค้าสำหรับการดึงสต็อกกลับ" });
    }

    const Customer = (await import("../customers/customer.model.js")).default;
    const custUser = await Customer.findById(customerId);
    if (!custUser) {
      return res.status(404).json({ message: "ไม่พบข้อมูลลูกค้าในระบบ" });
    }

    // Find the lot associated with this order/customer
    const ProductLot = (await import("../fg/productLot.model.js")).default;
    const query = { orderId: custUser._id, source: "bom-confirm" };
    if (req.body.formulaId) {
      query.formulaId = req.body.formulaId;
    } else if (req.body.formulaName) {
      query.formulaName = req.body.formulaName;
    }
    const lot = await ProductLot.findOne(query);
    if (!lot) {
      const anyLot = await ProductLot.findOne({ orderId: custUser._id, source: "bom-confirm" });
      if (!anyLot) {
        custUser.productionStatus = "ยังไม่ผลิต";
        custUser.producedLotId = undefined;
        await custUser.save();
      }
      return res.status(200).json({ message: "ล้างสถานะผลิตเรียบร้อยแล้ว (ไม่พบล็อตที่สร้างจากแผน BOM)" });
    }

    // Reconstruct the deducted ingredients and restore them
    const formulas = await BomFormula.find(ownerFilter(req));
    const ingredients = await Ingredient.find(ownerFilter(req));
    
    const need = {};
    if (lot.formulaSnapshot?.bom && lot.bomPlan && typeof lot.bomPlan === "object") {
      const snapshotBom = lot.formulaSnapshot.bom;
      Object.values(lot.bomPlan).forEach((kg) => {
        const qty = parseFloat(kg) || 0;
        if (qty > 0) Object.entries(snapshotBom).forEach(([ingredientName, value]) => {
          need[ingredientName] = (need[ingredientName] || 0) + value * qty;
        });
      });
    } else if (lot.bomPlan && typeof lot.bomPlan === "object") {
      Object.entries(lot.bomPlan).forEach(([fName, kg]) => {
        const qty = parseFloat(kg) || 0;
        if (qty > 0) {
          const formula = formulas.find(f => f.name === fName);
          if (formula && formula.bom) {
            formula.bom.forEach((value, ingredientName) => {
              need[ingredientName] = (need[ingredientName] || 0) + value * qty;
            });
          }
        }
      });
    } else {
      // Find the formula matching the lot's formulaName (Fallback)
      const formula = formulas.find(f => String(f._id) === String(lot.formulaId)) || formulas.find(f => f.name === lot.formulaName);
      if (formula && formula.bom) {
        let kg = 0;
        if (custUser.orderedProducts) {
          const prods = Array.isArray(custUser.orderedProducts) ? custUser.orderedProducts : [custUser.orderedProducts];
          const matchedProduct = prods.find(p => p && ((lot.formulaId && String(p.formulaId || "") === String(lot.formulaId)) || p.formulaName === lot.formulaName || p.name === lot.formulaName));
          if (matchedProduct) {
            const qtyPcs = parseFloat(matchedProduct.quantityPcs || matchedProduct.quantity || 0);
            const sizeMl = parseFloat(matchedProduct.fillVolume || matchedProduct.bottleSize || 0);
            const grams = qtyPcs * sizeMl > 0 ? qtyPcs * sizeMl : parseFloat(matchedProduct.quantityGrams || 150000);
            kg = grams / 1000;
          }
        }
        
        if (kg > 0) {
          formula.bom.forEach((value, ingredientName) => {
            need[ingredientName] = value * kg;
          });
        }
      }
    }

    // Restore stocks
    for (const [name, reqGram] of Object.entries(need)) {
      const ing = ingredients.find(i => i.name === name);
      if (ing) {
        const beforeQuantity = Number(ing.openingStock) || 0;
        ing.openingStock += reqGram;
        await ing.save();
        try {
          await writeStockMovementLog({
            ownerId: req.user._id,
            actionType: "INGREDIENT",
            description: stockMovementDescription({ itemName: ing.name, direction: "in", amount: reqGram, unit: "ก.", afterQuantity: ing.openingStock }),
            operator: req.user.name || req.user.email,
            itemType: "ingredient",
            itemId: ing._id,
            itemName: ing.name,
            direction: "in",
            amount: reqGram,
            unit: "ก.",
            beforeQuantity,
            afterQuantity: ing.openingStock,
            source: "production-revert",
            stage: "ยกเลิกการผลิต / คืนสารเคมี",
            relatedOrderId: custUser?._id,
            relatedOrderName: custUser?.name || ""
          });
        } catch (logErr) {
          console.error("Failed to write ingredient recovery log:", logErr);
        }
      }
    }

    // Delete the ProductLot
    await ProductLot.findByIdAndDelete(lot._id);

    // Reset customer status
    const remainingLots = await ProductLot.countDocuments({
      orderId: custUser._id,
      _id: { $ne: lot._id },
      source: "bom-confirm"
    });

    if (custUser.orderedProducts && Array.isArray(custUser.orderedProducts)) {
      custUser.orderedProducts = custUser.orderedProducts.map(p => {
        if ((lot.formulaId && String(p.formulaId || "") === String(lot.formulaId)) || p.formulaName === lot.formulaName || p.name === lot.formulaName) {
          const cleanProd = { ...p };
          delete cleanProd.isConfirmed;
          if (lot.formulaName && lot.formulaName.includes("สูตรเฉพาะตัว ของ")) {
            cleanProd.formulaName = "ผลิตสูตรเอง";
          }
          return cleanProd;
        }
        return p;
      });
      custUser.markModified("orderedProducts");
    }

    if (remainingLots === 0) {
      custUser.productionStatus = "ยังไม่ผลิต";
      custUser.producedLotId = undefined;
    } else {
      const anotherLot = await ProductLot.findOne({
        orderId: custUser._id,
        _id: { $ne: lot._id },
        source: "bom-confirm"
      });
      if (anotherLot) {
        custUser.producedLotId = anotherLot._id;
      }
    }
    await custUser.save();

    // Write activity log
    try {
      const ActivityLog = (await import("../logs/activityLog.model.js")).default;
      const log = new ActivityLog({
        ownerId: req.user._id,
        actionType: "PRODUCTION",
        description: `ดึงสต็อกเคมีกลับคืนและยกเลิกล็อตผลิตของลูกค้า "${custUser.name}" กลับสู่สถานะ "ยังไม่ผลิต"`,
        operator: req.user.name || req.user.email
      });
      await log.save();
    } catch (logErr) {
      console.error("Failed to write activity log:", logErr);
    }

    return res.status(200).json({
      message: "ดึงสต็อกเคมีกลับคืนและล้างสถานะสำเร็จ",
      recoveredIngredients: need
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
