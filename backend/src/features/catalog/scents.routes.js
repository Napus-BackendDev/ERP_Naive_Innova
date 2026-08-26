import express from "express";
import Scent from "./scent.model.js";
import Customer from "../customers/customer.model.js";
import { checkAuth } from "../../middleware/auth.js";

const router = express.Router();

router.use(checkAuth);

const isAdminReq = (req) =>
  req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");

// List all scents (owner-scoped)
router.get("/", async (req, res) => {
  try {
    const filter = { ownerId: req.user._id };
    const scents = await Scent.find(filter).sort({ name: 1 });
    return res.json(scents);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Create a new scent (returns its ObjectId so the frontend can link by _id)
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "กรุณาระบุชื่อกลิ่น" });
    }

    const trimmed = name.trim();

    // If this owner already has a scent with this name, return it (idempotent create)
    const existing = await Scent.findOne({ ownerId: req.user._id, name: trimmed });
    if (existing) {
      return res.status(200).json(existing);
    }

    const scent = new Scent({ ownerId: req.user._id, name: trimmed });
    await scent.save();
    return res.status(201).json(scent);
  } catch (error) {
    if (error.code === 11000) {
      const existing = await Scent.findOne({ ownerId: req.user._id, name: req.body.name.trim() });
      if (existing) return res.status(200).json(existing);
      return res.status(400).json({ message: "กลิ่นนี้มีอยู่แล้ว" });
    }
    return res.status(500).json({ error: error.message });
  }
});

// Rename a scent
router.put("/:id", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "กรุณาระบุชื่อกลิ่น" });
    }

    const filter = isAdminReq(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };

    const scent = await Scent.findOneAndUpdate(filter, { name: name.trim() }, { new: true });
    if (!scent) {
      return res.status(404).json({ message: "ไม่พบกลิ่นนี้ หรือไม่มีสิทธิ์แก้ไข" });
    }
    return res.json(scent);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete a scent (blocked if any order still references it by ObjectId)
router.delete("/:id", async (req, res) => {
  try {
    const inUse = await Customer.exists({ "orderedProducts.scentId": req.params.id });
    if (inUse) {
      return res.status(400).json({ message: "ลบไม่ได้ เพราะมีดีลลูกค้าที่ยังใช้กลิ่นนี้อยู่" });
    }

    const filter = isAdminReq(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };

    const scent = await Scent.findOneAndDelete(filter);
    if (!scent) {
      return res.status(404).json({ message: "ไม่พบกลิ่นนี้ หรือไม่มีสิทธิ์ลบ" });
    }
    return res.json({ message: "ลบกลิ่นสำเร็จ" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
