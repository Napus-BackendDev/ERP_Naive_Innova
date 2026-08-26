import express from "express";
import ProductSku from "./productSku.model.js";
import ProductLot from "./productLot.model.js";
import LotPrefixConfig from "./lotPrefixConfig.model.js";
import BomFormula from "../bom/bomFormula.model.js";
import { checkAuth } from "../../middleware/auth.js";
import { stockMovementDescription, writeStockMovementLog } from "../logs/stockMovementLog.js";

const router = express.Router();
router.use(checkAuth);

// ─── HELPERS ────────────────────────────────────────────────────────────────
function isAdmin(user) {
  return user.role && (user.role.name === "Admin" || user.role === "Admin");
}

async function logFgQuantityChange(req, beforeQuantity, lot, source = "manual-adjustment", stage = "ปรับ FG ด้วยมือ") {
  const afterQuantity = Number(lot.quantity) || 0;
  if (beforeQuantity === afterQuantity) return;
  const direction = afterQuantity > beforeQuantity ? "in" : "out";
  await writeStockMovementLog({
    ownerId: req.user._id,
    actionType: "FG",
    description: stockMovementDescription({ itemName: lot.lotNo, direction, amount: Math.abs(afterQuantity - beforeQuantity), unit: lot.unit || "ชิ้น", afterQuantity }),
    operator: req.user.name || req.user.email,
    itemType: "fgLot",
    itemId: lot._id,
    itemName: lot.lotNo,
    direction,
    amount: Math.abs(afterQuantity - beforeQuantity),
    unit: lot.unit || "ชิ้น",
    beforeQuantity,
    afterQuantity,
    source,
    stage,
    relatedLotId: lot._id
  });
}

// ─── LOT PREFIX CONFIG ──────────────────────────────────────────────────────

// GET all prefix configs
router.get("/prefix-configs", async (req, res) => {
  try {
    const filter = isAdmin(req.user) ? {} : { ownerId: req.user._id };
    const configs = await LotPrefixConfig.find(filter).sort({ formulaName: 1 });
    return res.json(configs);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST create/update prefix config (upsert by formulaName)
router.post("/prefix-configs", async (req, res) => {
  try {
    const { formulaId, formulaName, prefix, description } = req.body;
    if (!formulaName || !prefix) {
      return res.status(400).json({ message: "formulaName and prefix are required." });
    }
    const formula = formulaId
      ? await BomFormula.findOne({ _id: formulaId, ownerId: req.user._id, isArchived: { $ne: true } })
      : await BomFormula.findOne({ ownerId: req.user._id, name: formulaName, isArchived: { $ne: true } });
    if (formulaId && !formula) return res.status(404).json({ message: "Formula not found or archived." });
    const canonicalFormulaId = formula?._id || formulaId || undefined;
    const canonicalFormulaName = formula?.name || String(formulaName).normalize("NFKC").trim();
    const config = await LotPrefixConfig.findOneAndUpdate(
      canonicalFormulaId
        ? { ownerId: req.user._id, $or: [{ formulaId: canonicalFormulaId }, { formulaName: canonicalFormulaName }] }
        : { ownerId: req.user._id, formulaName: canonicalFormulaName },
      { $set: {
        formulaId: canonicalFormulaId,
        formulaName: canonicalFormulaName,
        prefix: prefix.toUpperCase().trim(),
        description: description || ""
      } },
      { new: true, upsert: true }
    );
    return res.json(config);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE prefix config
router.delete("/prefix-configs/:id", async (req, res) => {
  try {
    const filter = isAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };
    const deleted = await LotPrefixConfig.findOneAndDelete(filter);
    if (!deleted) return res.status(404).json({ message: "Config not found." });
    return res.json({ message: "Deleted." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── PRODUCT SKUS ───────────────────────────────────────────────────────────

// Get product SKUs
router.get("/skus", async (req, res) => {
  try {
    const filter = isAdmin(req.user) ? {} : { ownerId: req.user._id };
    const skus = await ProductSku.find(filter);
    return res.json(skus);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── PRODUCT LOTS ───────────────────────────────────────────────────────────

// GET lots — supports filtering by formulaName, status, search
router.get("/lots", async (req, res) => {
  try {
    const filter = isAdmin(req.user) ? {} : { ownerId: req.user._id };
    if (req.query.formulaName) filter.formulaName = req.query.formulaName;
    if (req.query.formulaId) filter.formulaId = req.query.formulaId;
    if (req.query.status) {
      filter.status = req.query.status;
    } else if (req.query.includeDelivered !== "true") {
      // Goods handed to the customer have left the warehouse — they are not FG
      // stock anymore. Kept in the DB for history; ask for them explicitly with
      // ?includeDelivered=true or ?status=delivered.
      filter.status = { $ne: "delivered" };
    }
    const lots = await ProductLot.find(filter)
      .populate("orderId", "name brand orderType orderedProducts productionStatus")
      .sort({ expDate: 1 });
    return res.json(lots);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST — receive/create a new lot (manual entry)
router.post("/recv", async (req, res) => {
  try {
    const { productId, formulaId, formulaName, lotPrefix, lotNo, mfgDate, expDate, quantity, unit, customer, image } = req.body;

    if (!lotNo || !mfgDate || !expDate || quantity == null) {
      return res.status(400).json({ message: "lotNo, mfgDate, expDate, and quantity are required." });
    }

    const formula = formulaId
      ? await BomFormula.findOne({ _id: formulaId, ownerId: req.user._id, isArchived: { $ne: true } })
      : null;
    if (formulaId && !formula) return res.status(404).json({ message: "Formula not found or archived." });
    const snapshot = formula ? {
      formulaId: formula._id,
      formulaName: formula.name,
      formulaVersion: formula.version || 1,
      bom: formula.bom instanceof Map ? Object.fromEntries(formula.bom) : (formula.bom || {}),
      phases: formula.phases instanceof Map ? Object.fromEntries(formula.phases) : (formula.phases || {}),
      note: formula.note || [],
      procedures: formula.procedures || [],
      qcSpec: formula.qcSpec || {},
      qcChecklistItems: formula.qcChecklistItems || [],
      qcMethod: formula.qcMethod || ""
    } : null;
    const lot = new ProductLot({
      ownerId: req.user._id,
      productId: productId || "",
      formulaId: formula?._id || formulaId || undefined,
      formulaName: formula?.name || formulaName || "",
      formulaVersion: formula?.version || null,
      formulaSnapshot: snapshot,
      lotPrefix: lotPrefix || "",
      lotNo,
      mfgDate: new Date(mfgDate),
      expDate: new Date(expDate),
      quantity: parseInt(quantity),
      unit: unit || "ชิ้น",
      customer: customer || "",
      status: "active",
      image: image || ""
    });
    await lot.save();

    // Activity log
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
        source: "manual-recv",
        stage: "รับเข้า FG ด้วยมือ",
        relatedLotId: lot._id
      });
    } catch (logErr) {
      console.error("Activity log error:", logErr);
    }

    return res.status(201).json(lot);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// PATCH — edit a lot
router.patch("/lots/:id", async (req, res) => {
  try {
    const filter = isAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };
    const allowed = ["quantity", "mfgDate", "expDate", "unit", "customer", "status", "formulaName", "lotPrefix", "lotNo", "image"];
    const updates = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });
    if (updates.mfgDate) updates.mfgDate = new Date(updates.mfgDate);
    if (updates.expDate) updates.expDate = new Date(updates.expDate);
    const original = updates.quantity !== undefined ? await ProductLot.findOne(filter).select("quantity") : null;
    const updated = await ProductLot.findOneAndUpdate(filter, { $set: updates }, { new: true });
    if (!updated) return res.status(404).json({ message: "Lot not found." });
    if (original) {
      try { await logFgQuantityChange(req, Number(original.quantity) || 0, updated); }
      catch (logErr) { console.error("Failed to write manual FG movement log:", logErr); }
    }
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT — update a lot (full update as requested)
router.put("/lots/:id", async (req, res) => {
  try {
    const filter = isAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };
    const { lotNo, quantity, customer, mfgDate, expDate } = req.body;
    const updates = { lotNo, quantity, customer, mfgDate, expDate };
    if (updates.mfgDate) updates.mfgDate = new Date(updates.mfgDate);
    if (updates.expDate) updates.expDate = new Date(updates.expDate);
    const original = await ProductLot.findOne(filter).select("quantity");
    const updated = await ProductLot.findOneAndUpdate(
      filter,
      { $set: updates },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Lot not found." });
    if (original && quantity !== undefined) {
      try { await logFgQuantityChange(req, Number(original.quantity) || 0, updated); }
      catch (logErr) { console.error("Failed to write manual FG movement log:", logErr); }
    }
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE — delete a lot
router.delete("/lots/:id", async (req, res) => {
  try {
    const filter = isAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };
    const deleted = await ProductLot.findOneAndDelete(filter);
    if (!deleted) return res.status(404).json({ message: "Lot not found." });
    return res.json({ message: "Lot deleted." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ─── ISSUE (FEFO) ────────────────────────────────────────────────────────────

// Issue Finished Goods using FEFO strategy (First Expired, First Out)
router.post("/issue", async (req, res) => {
  try {
    const { productId, amount } = req.body;
    const qtyToIssue = parseInt(amount);

    if (!productId || isNaN(qtyToIssue) || qtyToIssue <= 0) {
      return res.status(400).json({ message: "Invalid issue payload params." });
    }

    const adminCheck = isAdmin(req.user);
    const filter = adminCheck
      ? { productId, quantity: { $gt: 0 } }
      : { ownerId: req.user._id, productId, quantity: { $gt: 0 } };
    const lots = await ProductLot.find(filter).sort({ expDate: 1 });

    const totalAvailable = lots.reduce((acc, curr) => acc + curr.quantity, 0);
    if (totalAvailable < qtyToIssue) {
      return res.status(400).json({ message: `Insufficient inventory. Total available: ${totalAvailable}` });
    }

    let remaining = qtyToIssue;
    const updatedLots = [];

    for (const lot of lots) {
      if (remaining <= 0) break;
      const beforeQuantity = Number(lot.quantity) || 0;
      const deduct = Math.min(remaining, lot.quantity);
      lot.quantity -= deduct;
      remaining -= deduct;
      await lot.save();
      updatedLots.push({ lotNo: lot.lotNo, deducted: deduct, remaining: lot.quantity });
      try {
        await writeStockMovementLog({
          ownerId: req.user._id,
          actionType: "FG",
          description: stockMovementDescription({ itemName: lot.lotNo, direction: "out", amount: deduct, unit: lot.unit || "ชิ้น", afterQuantity: lot.quantity }),
          operator: req.user.name || req.user.email,
          itemType: "fgLot",
          itemId: lot._id,
          itemName: lot.lotNo,
          direction: "out",
          amount: deduct,
          unit: lot.unit || "ชิ้น",
          beforeQuantity,
          afterQuantity: lot.quantity,
          source: "fg-issue",
          stage: "จ่าย FG แบบ FEFO",
          relatedLotId: lot._id
        });
      } catch (logErr) {
        console.error("Failed to write FEFO movement log:", logErr);
      }
    }

    try {
      const ActivityLog = (await import("../logs/activityLog.model.js")).default;
      const log = new ActivityLog({
        ownerId: req.user._id,
        actionType: "PRODUCTION",
        description: `จ่ายออก FG SKU "${productId}" จำนวน ${qtyToIssue} ชิ้น (FEFO)`,
        operator: req.user.name || req.user.email,
      });
      await log.save();
    } catch (logErr) {
      console.error("Activity log error:", logErr);
    }

    return res.json({ message: `Issued ${qtyToIssue} units successfully using FEFO.`, details: updatedLots });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
