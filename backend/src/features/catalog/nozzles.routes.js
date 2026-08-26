import express from "express";
import Nozzle from "./nozzle.model.js";
import Customer from "../customers/customer.model.js";
import { checkAuth } from "../../middleware/auth.js";

const router = express.Router();

router.use(checkAuth);

const isAdminReq = (req) =>
  req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");

// List all nozzles (owner-scoped)
router.get("/", async (req, res) => {
  try {
    const filter = { ownerId: req.user._id };
    const nozzles = await Nozzle.find(filter).sort({ name: 1 });
    return res.json(nozzles);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Create a new nozzle (returns its ObjectId so the frontend can link by _id)
router.post("/", async (req, res) => {
  try {
    const { name, image, currentQuantity } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "กรุณาระบุชื่อหัวฉีด" });
    }

    const trimmed = name.trim();

    const existing = await Nozzle.findOne({ ownerId: req.user._id, name: trimmed });
    if (existing) {
      return res.status(200).json(existing);
    }

    const nozzle = new Nozzle({
      ownerId: req.user._id,
      name: trimmed,
      ...(image !== undefined ? { image } : {}),
      ...(currentQuantity !== undefined ? { currentQuantity } : {})
    });
    await nozzle.save();
    return res.status(201).json(nozzle);
  } catch (error) {
    if (error.code === 11000) {
      const existing = await Nozzle.findOne({ ownerId: req.user._id, name: req.body.name.trim() });
      if (existing) return res.status(200).json(existing);
      return res.status(400).json({ message: "หัวฉีดนี้มีอยู่แล้ว" });
    }
    return res.status(500).json({ error: error.message });
  }
});

// Rename a nozzle
router.put("/:id", async (req, res) => {
  try {
    const { name, image, currentQuantity } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "กรุณาระบุชื่อหัวฉีด" });
    }

    const filter = isAdminReq(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };

    const update = { name: name.trim() };
    if (image !== undefined) update.image = image;
    if (currentQuantity !== undefined) update.currentQuantity = currentQuantity;

    const nozzle = await Nozzle.findOneAndUpdate(filter, update, { new: true });
    if (!nozzle) {
      return res.status(404).json({ message: "ไม่พบหัวฉีดนี้ หรือไม่มีสิทธิ์แก้ไข" });
    }
    return res.json(nozzle);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete a nozzle (blocked if any order still references it by ObjectId)
router.delete("/:id", async (req, res) => {
  try {
    const inUse = await Customer.exists({ "orderedProducts.nozzleId": req.params.id });
    if (inUse) {
      return res.status(400).json({ message: "ลบไม่ได้ เพราะมีดีลลูกค้าที่ยังใช้หัวฉีดนี้อยู่" });
    }

    const filter = isAdminReq(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };

    const nozzle = await Nozzle.findOneAndDelete(filter);
    if (!nozzle) {
      return res.status(404).json({ message: "ไม่พบหัวฉีดนี้ หรือไม่มีสิทธิ์ลบ" });
    }
    return res.json({ message: "ลบหัวฉีดสำเร็จ" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
