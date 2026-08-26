import express from "express";
import mongoose from "mongoose";
import ActivityLog from "./activityLog.model.js";
import { checkAuth } from "../../middleware/auth.js";
import { LOG_CATEGORIES, actionTypesForCategory } from "./logCategory.js";

const router = express.Router();
router.use(checkAuth);

const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 100;

// Escape a user-typed term so "(" or "*" cannot blow up the regex.
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Owner scope + free-text search + date range. Category is applied separately so
// the tab counts can ignore it.
function buildFilter(req) {
  const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
  const filter = isAdmin ? {} : { ownerId: req.user._id };

  const { q, from, to } = req.query;

  if (q && String(q).trim()) {
    const rx = new RegExp(escapeRegex(String(q).trim()), "i");
    filter.$or = [{ description: rx }, { operator: rx }, { actionType: rx }];
  }

  // from/to are inclusive calendar days ("2026-07-01"); `to` covers the whole day.
  const range = {};
  if (from) {
    const d = new Date(`${String(from).slice(0, 10)}T00:00:00.000`);
    if (!isNaN(d)) range.$gte = d;
  }
  if (to) {
    const d = new Date(`${String(to).slice(0, 10)}T23:59:59.999`);
    if (!isNaN(d)) range.$lte = d;
  }
  if (Object.keys(range).length) filter.createdAt = range;

  // Stock drawer asks for an exact item id. Legacy rows had no structured
  // movement, so optionally include only those rows whose old description
  // mentions the selected name as a compatibility fallback.
  const stockItemType = String(req.query.stockItemType || "").trim();
  const stockItemId = String(req.query.stockItemId || "").trim();
  const legacyName = String(req.query.legacyName || "").trim();
  if (stockItemType || stockItemId) {
    const structured = {};
    if (stockItemType) structured["stockMovement.itemType"] = stockItemType;
    if (stockItemId) {
      if (!mongoose.isValidObjectId(stockItemId)) {
        filter.$and = [...(filter.$and || []), { _id: new mongoose.Types.ObjectId() }];
        return filter;
      }
      structured["stockMovement.itemId"] = new mongoose.Types.ObjectId(stockItemId);
    }
    const alternatives = [structured];
    if (legacyName) {
      const legacyRx = new RegExp(escapeRegex(legacyName), "i");
      alternatives.push({ stockMovement: { $exists: false }, description: legacyRx });
    }
    filter.$and = [...(filter.$and || []), { $or: alternatives }];
  }

  return filter;
}

// GET /logs — newest first, searched, filtered and paged IN the database.
//
// Returns an envelope rather than a bare array: the screen needs the totals for
// every category, not just the page it happens to be showing. The old route
// returned the latest 200 rows and let the browser do everything, so the tabs
// counted 200 of 545 records and the Export button exported the same slice.
//   { items, total, page, limit, counts: { all, sales, rnd, production, stock, user, other } }
router.get("/", async (req, res) => {
  try {
    const baseFilter = buildFilter(req);

    const category = String(req.query.category || "all").toLowerCase();
    const listFilter = { ...baseFilter };
    const hasStockItemFilter = req.query.stockItemType || req.query.stockItemId;
    if (LOG_CATEGORIES.includes(category) && !hasStockItemFilter) {
      listFilter.actionType = { $in: actionTypesForCategory(category) };
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const [items, total, byType] = await Promise.all([
      ActivityLog.find(listFilter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      ActivityLog.countDocuments(listFilter),
      ActivityLog.aggregate([{ $match: baseFilter }, { $group: { _id: "$actionType", n: { $sum: 1 } } }])
    ]);

    const counts = { all: 0, sales: 0, rnd: 0, production: 0, stock: 0, user: 0, other: 0 };
    const catOfType = {};
    LOG_CATEGORIES.forEach(cat => actionTypesForCategory(cat).forEach(t => { catOfType[t] = cat; }));
    byType.forEach(({ _id, n }) => {
      const cat = catOfType[String(_id || "").toUpperCase()] || "other";
      counts[cat] += n;
      counts.all += n;
    });

    const outputItems = items.map((item) => {
      const row = item.toObject ? item.toObject() : item;
      if (hasStockItemFilter && !row.stockMovement?.itemId) row.isLegacyStockMovement = true;
      return row;
    });
    return res.json({ items: outputItems, total, page, limit, counts });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Create a log entry (exposed internally or externally)
router.post("/", async (req, res) => {
  try {
    const newLog = new ActivityLog({
      ownerId: req.user._id,
      operator: req.user.name || req.user.email,
      actionType: req.body.actionType,
      description: req.body.description
    });
    await newLog.save();
    return res.status(201).json(newLog);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
