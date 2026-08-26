import express from "express";
import PackagingType from "./packagingType.model.js";
import PackagingItem from "./packagingItem.model.js";
import { checkAuth } from "../../middleware/auth.js";

const router = express.Router();

router.use(checkAuth);

router.get("/", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin ? {} : { ownerId: req.user._id };
    const types = await PackagingType.find(filter).sort({ name: 1 });
    return res.json(types);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Create new packaging type
router.post("/", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Name is required." });
    }

    const newType = new PackagingType({
      ownerId: req.user._id,
      name: name.trim()
    });
    await newType.save();
    return res.status(201).json(newType);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "This category name already exists." });
    }
    return res.status(500).json({ error: error.message });
  }
});

// Update packaging type
router.put("/:id", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Name is required." });
    }

    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, ownerId: req.user._id };
    const type = await PackagingType.findOneAndUpdate(
      filter,
      { name: name.trim() },
      { new: true }
    );
    if (!type) {
      return res.status(404).json({ message: "Category not found or unauthorized." });
    }
    return res.json(type);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete packaging type
router.delete("/:id", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const isUsedFilter = isAdmin ? { type: req.params.id } : { type: req.params.id, ownerId: req.user._id };
    const isUsed = await PackagingItem.exists(isUsedFilter);
    if (isUsed) {
      return res.status(400).json({ message: "Cannot delete. This category is currently assigned to some items." });
    }

    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, ownerId: req.user._id };
    const type = await PackagingType.findOneAndDelete(filter);
    if (!type) {
      return res.status(404).json({ message: "Category not found or unauthorized." });
    }
    return res.json({ message: "Category deleted successfully." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
