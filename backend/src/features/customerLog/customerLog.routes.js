import express from "express";
import Customer, { LIST_PROJECTION } from "../customers/customer.model.js";
import ProductLot from "../fg/productLot.model.js";
import BomFormula from "../bom/bomFormula.model.js";
import { checkAuth } from "../../middleware/auth.js";

const router = express.Router();
router.use(checkAuth);

// Normalize the freeform orderedProducts blob (array or single object) into a
// plain array of line-item summaries for display.
function normalizeOrdered(op) {
  if (!op) return [];
  const list = Array.isArray(op) ? op : (typeof op === "object" ? [op] : []);
  return list
    .filter(p => p && (p.formulaName || p.name))
    .map(p => ({
      formulaId: p.formulaId || null,
      formulaName: p.formulaName || p.name || "",
      quantityPcs: p.quantityPcs || p.quantity || "",
      bottleSize: p.bottleSize || "",   // ขนาดขวด (bottle capacity, ml)
      fillVolume: p.fillVolume || "",   // ปริมาณบรรจุจริง (fill volume, ml)
      packagingType: p.packagingType || "",
      labelType: p.labelType || "",
      scentType: p.scentType || "",
      nozzleType: p.nozzleType || "",
      // Catalog links, so the screen can show the ACTUAL item's photo instead of
      // guessing from the name (two customers can own items with the same name).
      packagingItemId: p.packagingItemId || null,
      labelItemId: p.labelItemId || null,
      nozzleId: p.nozzleId || null,
      productImageUrl: p.productImageUrl || "",
      labelArtworkUrl: p.labelArtworkUrl || "",
      bottleCount: p.bottleCount || "",
      nozzleCount: p.nozzleCount || "",
      isDevelopment: !!p.isDevelopment
    }));
}

// Customer production history — one record per customer, aggregating what they
// ordered, the finished-goods lots produced, and the chemicals/packaging
// consumed. Read model for the "Customer Log" screen.
router.get("/", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");

    const custFilter = isAdmin ? {} : { ownerId: req.user._id };
    // Customer Log is a list/read model. Exclude QC media blobs here; the
    // detail cards only need the order and lot metadata, and shipping every
    // stored photo makes this page progressively slower as history grows.
    const customers = await Customer.find(custFilter).select(LIST_PROJECTION).lean();
    const custIds = customers.map(c => c._id);

    // Lots produced for these customers (linked by orderId back-reference).
    const lots = await ProductLot.find({ orderId: { $in: custIds } }).lean();
    const lotsByCust = {};
    lots.forEach(l => {
      const k = String(l.orderId);
      (lotsByCust[k] = lotsByCust[k] || []).push(l);
    });

    // Formulas (to break a lot's bomPlan down into per-ingredient grams or fetch R&D formulas directly).
    const formulas = await BomFormula.find(isAdmin ? {} : { ownerId: req.user._id });
    const formulaByName = {};
    const formulaById = {};
    formulas.forEach(f => { formulaByName[f.name] = f; formulaById[String(f._id)] = f; });

    const eachBomEntry = (formula, callback) => {
      if (!formula?.bom) return;
      if (formula.bom instanceof Map || typeof formula.bom.forEach === "function") {
        formula.bom.forEach((value, key) => callback(value, key));
      } else {
        Object.entries(formula.bom).forEach(([key, value]) => callback(value, key));
      }
    };
    const getFormula = (formulaId, formulaName) => formulaById[String(formulaId)] || formulaByName[formulaName];
    const getRndIngredients = (formulaId, formulaName) => {
      const f = getFormula(formulaId, formulaName);
      if (!f || !f.bom) return [];
      const res = [];
      eachBomEntry(f, (gramsPerKg, name) => {
        const phase = f.phases ? (f.phases.get ? f.phases.get(name) : f.phases[name]) || "" : "";
        res.push({ name, grams: gramsPerKg, gramsPerKg, phase });
      });
      return res.sort((a, b) => b.grams - a.grams);
    };

    const ingredientsFromPlan = (bomPlan, formulaId, formulaName, snapshot = null) => {
      const acc = {};
      const f = snapshot?.bom ? snapshot : getFormula(formulaId, formulaName);

      if (bomPlan && typeof bomPlan === "object" && Object.keys(bomPlan).length > 0) {
        Object.entries(bomPlan).forEach(([fname, kg]) => {
          const q = parseFloat(kg) || 0;
          // A lot's snapshot is immutable and must win over the current BOM;
          // name lookup is only for legacy lots without a snapshot.
          const targetFormula = snapshot?.bom ? snapshot : (formulaByName[fname] || f);
          if (targetFormula && targetFormula.bom && q > 0) {
            eachBomEntry(targetFormula, (gramsPerKg, ing) => {
              acc[ing] = (acc[ing] || 0) + (gramsPerKg * q);
            });
          }
        });
        const res = Object.entries(acc)
          .map(([name, grams]) => {
            const phase = f && f.phases ? (f.phases.get ? f.phases.get(name) : f.phases[name]) || "" : "";
            return { name, grams: Math.round(grams * 100) / 100, phase };
          })
          .sort((a, b) => b.grams - a.grams);
        if (res.length > 0) return res;
      }

      return getRndIngredients(formulaId, formulaName);
    };

    const records = customers
      .map(c => {
        const cLots = lotsByCust[String(c._id)] || [];
        const ordered = normalizeOrdered(c.orderedProducts).map(op => ({
          ...op,
          rndIngredients: getRndIngredients(op.formulaId, op.formulaName)
        }));
        return {
          customerId: c._id,
          name: c.name,
          brand: c.brand || "",
          phone: c.phone || "",
          province: c.province || "",
          productionStatus: c.productionStatus || "",
          orderedProducts: ordered,
          consumedPackaging: Array.isArray(c.consumedPackaging) ? c.consumedPackaging : [],
          lots: cLots.map(l => ({
            lotNo: l.lotNo,
            formulaId: l.formulaId || null,
            formulaName: l.formulaName || "",
            formulaVersion: l.formulaVersion || null,
            formulaSnapshot: l.formulaSnapshot || null,
            source: l.source || "",
            mfgDate: l.mfgDate,
            expDate: l.expDate,
            quantity: l.quantity,
            unit: l.unit || "ชิ้น",
            status: l.status,
            ingredients: ingredientsFromPlan(l.bomPlan, l.formulaId, l.formulaName, l.formulaSnapshot)
          }))
        };
      })
      // Keep only customers who actually have activity (an order or a lot).
      .filter(r => r.lots.length > 0 || r.orderedProducts.length > 0)
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "th"));

    return res.json(records);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
