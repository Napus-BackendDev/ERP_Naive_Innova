import express from "express";
import multer from "multer";
import PackagingItem from "./packagingItem.model.js";
import { checkAuth } from "../../middleware/auth.js";
import { stockMovementDescription, writeStockMovementLog } from "../logs/stockMovementLog.js";

const router = express.Router();

// Packaging photos go into MongoDB, not onto disk: PackagingItem.image already
// holds base64 for items created through the app, and a file on disk is lost on
// every redeploy while the document keeps pointing at it.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const MAX_IMAGE_BYTES = 1024 * 1024; // 1 MB — same policy as lib/imageCompress

router.use(checkAuth);

// Returns a data: URL that the caller stores on the document (multipart/form-data)
router.post("/upload", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }
    if (req.file.size > MAX_IMAGE_BYTES) {
      const mb = (req.file.size / (1024 * 1024)).toFixed(2);
      return res.status(413).json({
        error: `รูปภาพมีขนาด ${mb} MB เกินขีดจำกัด 1 MB — กรุณาอัปโหลดผ่านหน้าเว็บเพื่อให้ระบบย่อขนาดให้อัตโนมัติ`
      });
    }
    const imageUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    return res.json({ imageUrl });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin ? {} : { ownerId: req.user._id };
    const items = await PackagingItem.find(filter).populate("type");
    return res.json(items);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Create a new packaging item
router.post("/", async (req, res) => {
  try {
    const newItem = new PackagingItem({
      ownerId: req.user._id,
      ...req.body
    });
    await newItem.save();
    await newItem.populate("type");
    return res.status(201).json(newItem);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Create packaging transaction (adjust quantity)
router.post("/tx", async (req, res) => {
  try {
    const { itemId, type, amount, note } = req.body; // type: 'in' or 'out'
    const qty = parseInt(amount);

    if (!itemId || !type || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: "Invalid transaction arguments." });
    }

    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin ? { _id: itemId } : { _id: itemId, ownerId: req.user._id };
    const item = await PackagingItem.findOne(filter);
    if (!item) {
      return res.status(404).json({ message: "Packaging item not found or unauthorized." });
    }

    const beforeQuantity = Number(item.currentQuantity) || 0;
    const adjustment = type === "in" ? qty : -qty;
    item.currentQuantity = Math.max(0, item.currentQuantity + adjustment);
    await item.save();
    await item.populate("type");

    // Log the transaction
    try {
      await writeStockMovementLog({
        ownerId: req.user._id,
        actionType: "PACKAGING",
        description: stockMovementDescription({ itemName: item.name, direction: type, amount: qty, unit: "ชิ้น", afterQuantity: item.currentQuantity, note }),
        operator: req.user.name || req.user.email,
        itemType: "packaging",
        itemId: item._id,
        itemName: item.name,
        direction: type,
        amount: qty,
        unit: "ชิ้น",
        beforeQuantity,
        afterQuantity: item.currentQuantity,
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

// Bulk import/upsert packaging items
router.post("/bulk", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: "Invalid payload, items array is required." });
    }
    const results = [];
    for (const item of items) {
      const name = item.name ? String(item.name).trim() : "";
      if (!name) continue;

      let typeId = null;
      if (item.typeName) {
        const typeName = String(item.typeName).trim();
        const PackagingType = (await import("./packagingType.model.js")).default;
        let pType = await PackagingType.findOne({ ownerId: req.user._id, name: typeName });
        if (!pType) {
          pType = new PackagingType({ ownerId: req.user._id, name: typeName });
          await pType.save();
        }
        typeId = pType._id;
      }

      const updated = await PackagingItem.findOneAndUpdate(
        { ownerId: req.user._id, name },
        {
          $set: {
            type: typeId,

            customer: item.customer || "ระบบ",
            currentQuantity: parseInt(item.currentQuantity) || 0,
            note: item.note || ""
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

// Update packaging item details
router.put("/:id", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, ownerId: req.user._id };
    const original = req.body.currentQuantity !== undefined
      ? await PackagingItem.findOne(filter).select("currentQuantity")
      : null;
    const item = await PackagingItem.findOneAndUpdate(
      filter,
      { $set: req.body },
      { new: true }
    ).populate("type");
    if (!item) {
      return res.status(404).json({ message: "Packaging item not found or unauthorized." });
    }
    if (original) {
      const beforeQuantity = Number(original.currentQuantity) || 0;
      const afterQuantity = Number(item.currentQuantity) || 0;
      if (beforeQuantity !== afterQuantity) {
        const direction = afterQuantity > beforeQuantity ? "in" : "out";
        try {
          await writeStockMovementLog({
            ownerId: req.user._id,
            actionType: "PACKAGING",
            description: stockMovementDescription({ itemName: item.name, direction, amount: Math.abs(afterQuantity - beforeQuantity), unit: "ชิ้น", afterQuantity }),
            operator: req.user.name || req.user.email,
            itemType: "packaging",
            itemId: item._id,
            itemName: item.name,
            direction,
            amount: Math.abs(afterQuantity - beforeQuantity),
            unit: "ชิ้น",
            beforeQuantity,
            afterQuantity,
            source: "manual-adjustment",
            stage: direction === "in" ? "รับเข้าสต็อก" : "ปรับสต็อกด้วยมือ",
            note: req.body.note || ""
          });
        } catch (logErr) {
          console.error("Failed to write packaging edit movement log:", logErr);
        }
      }
    }
    return res.json(item);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete packaging item
router.delete("/:id", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, ownerId: req.user._id };
    const item = await PackagingItem.findOneAndDelete(filter);
    if (!item) {
      return res.status(404).json({ message: "Packaging item not found or unauthorized." });
    }
    return res.json({ message: "Packaging item deleted successfully." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
