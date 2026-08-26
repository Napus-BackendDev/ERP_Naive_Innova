import express from "express";
import mongoose from "mongoose";
import { checkAuth } from "../../middleware/auth.js";
import Machine from "./machine.model.js";

const router = express.Router();

router.use(checkAuth);

const isAdmin = (user) => user.role && (user.role.name === "Admin" || user.role === "Admin");

// Build a validated queue array of { orderId, addedAt } from an incoming list.
// Accepts either an array of orderId strings or an array of { orderId, addedAt } objects.
// Invalid ObjectIds are skipped. Returns null if the payload is not an array.
const buildQueue = (raw, existing = []) => {
  if (!Array.isArray(raw)) return null;
  // Preserve original addedAt for orders that were already queued
  const prevMap = new Map();
  (existing || []).forEach((e) => {
    if (e && e.orderId) prevMap.set(String(e.orderId), e.addedAt);
  });
  const result = [];
  for (const item of raw) {
    const orderId = item && typeof item === "object" ? item.orderId : item;
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) continue;
    const key = String(orderId);
    const addedAt =
      (item && typeof item === "object" && item.addedAt) || prevMap.get(key) || new Date();
    result.push({ orderId, addedAt });
  }
  return result;
};

// GET / — list machines (admin sees all, else owner-scoped)
router.get("/", async (req, res) => {
  try {
    const filter = isAdmin(req.user) ? {} : { ownerId: req.user._id };
    const machines = await Machine.find(filter).sort({ order: 1, createdAt: 1 });
    return res.json(machines);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST / — create a machine
router.post("/", async (req, res) => {
  try {
    const { name, color, order, image, allowedFormulas, disallowedFormulas, queue } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: "กรุณาระบุชื่อเครื่องจักร" });
    }
    const machine = new Machine({
      ownerId: req.user._id,
      name: String(name).trim(),
      color: color || "",
      order: typeof order === "number" ? order : 0,
      image: image || "",
      allowedFormulas: Array.isArray(allowedFormulas) ? allowedFormulas : [],
      disallowedFormulas: Array.isArray(disallowedFormulas) ? disallowedFormulas : [],
      queue: buildQueue(queue) || []
    });
    await machine.save();
    return res.status(201).json(machine);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /:id — update name/color/order/image/formulas and/or full queue
router.put("/:id", async (req, res) => {
  try {
    const filter = isAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };
    const machine = await Machine.findOne(filter);
    if (!machine) {
      return res.status(404).json({ error: "ไม่พบเครื่องจักร หรือไม่มีสิทธิ์เข้าถึง" });
    }

    const { name, color, order, image, allowedFormulas, disallowedFormulas, queue } = req.body;
    if (name !== undefined) machine.name = String(name).trim();
    if (color !== undefined) machine.color = color;
    if (order !== undefined) machine.order = order;
    if (image !== undefined) machine.image = image;
    if (allowedFormulas !== undefined && Array.isArray(allowedFormulas)) {
      machine.allowedFormulas = allowedFormulas;
    }
    if (disallowedFormulas !== undefined && Array.isArray(disallowedFormulas)) {
      machine.disallowedFormulas = disallowedFormulas;
    }
    if (queue !== undefined) {
      const built = buildQueue(queue, machine.queue);
      if (built === null) {
        return res.status(400).json({ error: "queue ต้องเป็น array" });
      }
      machine.queue = built;
    }

    await machine.save();
    return res.json(machine);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT /:id/queue — explicit full queue replacement ({ queue: [orderId, ...] })
router.put("/:id/queue", async (req, res) => {
  try {
    const filter = isAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };
    const machine = await Machine.findOne(filter);
    if (!machine) {
      return res.status(404).json({ error: "ไม่พบเครื่องจักร หรือไม่มีสิทธิ์เข้าถึง" });
    }

    const built = buildQueue(req.body.queue, machine.queue);
    if (built === null) {
      return res.status(400).json({ error: "queue ต้องเป็น array ของ orderId" });
    }
    machine.queue = built;
    await machine.save();
    return res.json(machine);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// DELETE /:id — remove a machine
router.delete("/:id", async (req, res) => {
  try {
    const filter = isAdmin(req.user)
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };
    const machine = await Machine.findOneAndDelete(filter);
    if (!machine) {
      return res.status(404).json({ error: "ไม่พบเครื่องจักร หรือไม่มีสิทธิ์เข้าถึง" });
    }
    return res.json({ message: "ลบเครื่องจักรเรียบร้อยแล้ว" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
