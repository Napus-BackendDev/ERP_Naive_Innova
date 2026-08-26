import express from "express";
import PackagingSubType from "./packagingSubType.model.js";
import PackagingItem from "./packagingItem.model.js";
import { checkAuth } from "../../middleware/auth.js";

const router = express.Router();

router.use(checkAuth);

router.get("/", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin ? {} : { ownerId: req.user._id };
    const subtypes = await PackagingSubType.find(filter).populate("parentType").sort({ name: 1 });
    return res.json(subtypes);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Create new packaging subtype
router.post("/", async (req, res) => {
  try {
    const { name, parentType } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Name is required." });
    }
    if (!parentType) {
      return res.status(400).json({ message: "parentType is required." });
    }

    const newSubType = new PackagingSubType({
      ownerId: req.user._id,
      name: name.trim(),
      parentType
    });
    await newSubType.save();
    await newSubType.populate("parentType");
    return res.status(201).json(newSubType);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "This subcategory name already exists under the parent category." });
    }
    return res.status(500).json({ error: error.message });
  }
});

// Update packaging subtype
router.put("/:id", async (req, res) => {
  try {
    const { name, parentType } = req.body;
    if (!name || name.trim() === "") {
      return res.status(400).json({ message: "Name is required." });
    }

    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, ownerId: req.user._id };
    
    const updateData = { name: name.trim() };
    if (parentType) updateData.parentType = parentType;

    const subtype = await PackagingSubType.findOneAndUpdate(
      filter,
      updateData,
      { new: true }
    ).populate("parentType");

    if (!subtype) {
      return res.status(404).json({ message: "Subcategory not found or unauthorized." });
    }
    return res.json(subtype);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete packaging subtype
router.delete("/:id", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const isUsedFilter = isAdmin ? { subType: req.params.id } : { subType: req.params.id, ownerId: req.user._id };
    const isUsed = await PackagingItem.exists(isUsedFilter);
    if (isUsed) {
      return res.status(400).json({ message: "Cannot delete. This subcategory is currently assigned to some items." });
    }

    const filter = isAdmin ? { _id: req.params.id } : { _id: req.params.id, ownerId: req.user._id };
    const subtype = await PackagingSubType.findOneAndDelete(filter);
    if (!subtype) {
      return res.status(404).json({ message: "Subcategory not found or unauthorized." });
    }
    return res.json({ message: "Subcategory deleted successfully." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
