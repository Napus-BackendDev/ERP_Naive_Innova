import express from "express";
import Product from "./product.model.js";
import BomFormula from "../bom/bomFormula.model.js";
import { checkAuth } from "../../middleware/auth.js";
import { stockMovementDescription, writeStockMovementLog } from "../logs/stockMovementLog.js";

const router = express.Router();

router.use(checkAuth);

const isAdminReq = (req) =>
  req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");

// Deterministic fake fill values so re-running generate is stable (no randomness).
const SIZES = ["30ml", "50ml", "100ml", "250ml"];
const fakeQty = (i) => ((i + 1) * 137) % 900; // 0..899, varies per formula

// List products. `?sample=true` returns only the generated sample products.
router.get("/", async (req, res) => {
  try {
    const base = isAdminReq(req) ? {} : { ownerId: req.user._id };
    if (String(req.query.sample) === "true") base.isSample = true;
    const products = await Product.find(base).sort({ name: 1 });
    return res.json(products);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Generate one sample product per BOM formula and upsert into the products
// collection (idempotent: keyed by ownerId + formulaName + isSample). Fake but
// persisted display data (sku, brand, category, size, stock, note).
router.post("/generate-samples", async (req, res) => {
  try {
    const ownerId = req.user._id;
    const formulas = await BomFormula.find(
      { ...(isAdminReq(req) ? {} : { ownerId }), isArchived: { $ne: true } }
    ).sort({ name: 1 });

    const results = [];
    for (let i = 0; i < formulas.length; i++) {
      const f = formulas[i];
      const qty = fakeQty(i);
      const size = SIZES[i % SIZES.length];
      const doc = {
        ownerId: f.ownerId || ownerId,
        name: `${f.name} (ตัวอย่าง)`,
        formulaId: f._id,
        formulaName: f.name,
        color: f.color || "#2E7D32",
        sku: `SMP-${String(i + 1).padStart(3, "0")}`,
        brand: "นาอีฟ",
        category: "สินค้าตัวอย่าง",
        size,
        currentQuantity: qty,
        note: `ตัวอย่างจากสูตร ${f.name}`,
        isSample: true
      };
      const saved = await Product.findOneAndUpdate(
        { ownerId: doc.ownerId, formulaName: f.name, isSample: true },
        { $set: doc },
        { new: true, upsert: true }
      );
      results.push(saved);
    }

    return res.json({ count: results.length, products: results });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Create a new product (manual entry)
router.post("/", async (req, res) => {
  try {
    const { name, formulaId, formulaName, sku, brand, category, size, currentQuantity, note, isSample, image } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Product name is required." });
    }
    const formula = formulaId
      ? await BomFormula.findOne({ _id: formulaId, ...(isAdminReq(req) ? {} : { ownerId: req.user._id }), isArchived: { $ne: true } })
      : null;
    if (formulaId && !formula) return res.status(404).json({ message: "Formula not found or archived." });
    const product = new Product({
      ownerId: req.user._id,
      name,
      formulaId: formulaId || undefined,
      formulaName: formula?.name || formulaName || "",
      sku: sku || "",
      brand: brand || "นาอีฟ",
      category: category || "สินค้าตัวอย่าง",
      size: size || "",
      currentQuantity: currentQuantity || 0,
      note: note || "",
      isSample: isSample !== undefined ? isSample : true,
      image: image || ""
    });
    await product.save();
    if (Number(product.currentQuantity) > 0) {
      try {
        await writeStockMovementLog({
          ownerId: req.user._id,
          actionType: "STOCK",
          description: stockMovementDescription({ itemName: product.name, direction: "in", amount: product.currentQuantity, unit: "ชิ้น", afterQuantity: product.currentQuantity }),
          operator: req.user.name || req.user.email,
          itemType: "sampleProduct",
          itemId: product._id,
          itemName: product.name,
          direction: "in",
          amount: product.currentQuantity,
          unit: "ชิ้น",
          beforeQuantity: 0,
          afterQuantity: product.currentQuantity,
          source: "manual-recv",
          stage: "รับเข้าสินค้าตัวอย่าง"
        });
      } catch (logErr) {
        console.error("Failed to write sample-product receipt movement log:", logErr);
      }
    }
    return res.status(201).json(product);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Update a product details
router.put("/:id", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, ownerId: req.user._id };
    let formulaNameOverride = "";
    if (req.body.formulaId) {
      const formula = await BomFormula.findOne({ _id: req.body.formulaId, ...(isAdmin ? {} : { ownerId: req.user._id }), isArchived: { $ne: true } });
      if (!formula) return res.status(404).json({ message: "Formula not found or archived." });
      formulaNameOverride = formula.name;
    }
    const updateBody = { ...req.body };
    if (formulaNameOverride) updateBody.formulaName = formulaNameOverride;
    const original = updateBody.currentQuantity !== undefined
      ? await Product.findOne(filter).select("currentQuantity")
      : null;
    const updated = await Product.findOneAndUpdate(
      filter,
      { $set: updateBody },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ message: "Product not found or unauthorized." });
    }
    if (original) {
      const beforeQuantity = Number(original.currentQuantity) || 0;
      const afterQuantity = Number(updated.currentQuantity) || 0;
      if (beforeQuantity !== afterQuantity) {
        const direction = afterQuantity > beforeQuantity ? "in" : "out";
        try {
          await writeStockMovementLog({
            ownerId: req.user._id,
            actionType: "STOCK",
            description: stockMovementDescription({ itemName: updated.name, direction, amount: Math.abs(afterQuantity - beforeQuantity), unit: "ชิ้น", afterQuantity }),
            operator: req.user.name || req.user.email,
            itemType: "sampleProduct",
            itemId: updated._id,
            itemName: updated.name,
            direction,
            amount: Math.abs(afterQuantity - beforeQuantity),
            unit: "ชิ้น",
            beforeQuantity,
            afterQuantity,
            source: "manual-adjustment",
            stage: direction === "in" ? "รับเข้าสินค้าตัวอย่าง" : "ปรับสต็อกสินค้าตัวอย่างด้วยมือ"
          });
        } catch (logErr) {
          console.error("Failed to write sample-product movement log:", logErr);
        }
      }
    }
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete a product
router.delete("/:id", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, ownerId: req.user._id };
    const deleted = await Product.findOneAndDelete(filter);
    if (!deleted) {
      return res.status(404).json({ message: "Product not found or unauthorized." });
    }
    return res.json({ message: "Product deleted." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
