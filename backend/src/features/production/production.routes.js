import express from "express";
import { checkAuth } from "../../middleware/auth.js";
import multer from "multer";
import Customer from "../customers/customer.model.js";
import BomFormula from "../bom/bomFormula.model.js";
import { stockMovementDescription, writeStockMovementLog } from "../logs/stockMovementLog.js";

const router = express.Router();

router.use(checkAuth);

// Images only, held in memory and returned as a data: URL so they live in MongoDB
// with the record they belong to — nothing is written to disk, where a redeploy
// would wipe files the documents still point at. Video upload was removed: a clip
// cannot be embedded in a 16 MB BSON document, and keeping one file type on disk
// meant maintaining two storage paths for no remaining use.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 } // generous vs the 1 MB image rule below
});

const MAX_IMAGE_BYTES = 1024 * 1024; // 1 MB — images only (see middleware/imageSizeGuard.js)

// POST upload file locally
router.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    // Images only — anything else has nowhere to be stored now that disk writes
    // are gone, so reject it loudly instead of saving something unusable.
    if (!req.file.mimetype?.startsWith("image/")) {
      return res.status(415).json({
        error: "รองรับเฉพาะไฟล์รูปภาพเท่านั้น (ไม่รองรับวิดีโอแล้ว)"
      });
    }

    // Images must arrive already compressed by the client (lib/imageCompress).
    // Nothing was written to disk, so there is no temp file to clean up.
    if (req.file.size > MAX_IMAGE_BYTES) {
      const mb = (req.file.size / (1024 * 1024)).toFixed(2);
      return res.status(413).json({
        error: `รูปภาพมีขนาด ${mb} MB เกินขีดจำกัด 1 MB — กรุณาอัปโหลดผ่านหน้าเว็บเพื่อให้ระบบย่อขนาดให้อัตโนมัติ`
      });
    }

    // Straight into the document. assetUrl() passes data: URLs through untouched,
    // so every existing caller keeps working without a change.
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    return res.json({ secure_url: dataUrl });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_BATCH_QTY = 30;

// Derive how many packaging units an order needs. orderedProducts is schema-less
// (Mixed) so it may be an array of lines or a single object. Guards against
// negative / NaN quantities (a negative here would INCREASE stock via the
// Math.max below), falling back to the default batch size.
function computeQtyNeeded(order, productIndex) {
  let qty = 0;
  const op = order.orderedProducts;
  if (op) {
    if (productIndex !== null && productIndex !== undefined && !isNaN(productIndex) && Array.isArray(op)) {
      const p = op[productIndex];
      qty = parseInt(p?.quantityPcs ?? p?.quantity) || 0;
    } else if (Array.isArray(op)) {
      qty = op.reduce((sum, p) => sum + (parseInt(p?.quantityPcs ?? p?.quantity) || 0), 0);
    } else if (typeof op === "object") {
      qty = parseInt(op.quantityPcs ?? op.quantity) || 0;
    }
  }
  if (!Number.isFinite(qty) || qty <= 0) qty = DEFAULT_BATCH_QTY;
  return qty;
}

// Deduct packaging stock exactly once for an order. The isStockDeducted flag is
// claimed ATOMICALLY (findOneAndUpdate with isStockDeducted != true) so two
// concurrent status/step requests can never both pass the guard and
// double-deduct. Returns an array of consumed { itemId, name, qty } records
// (empty if another request already deducted or nothing matched).
async function deductPackagingOnce(filter, order, productIndex, operator = "ระบบ") {
  // Atomically claim the deduction right.
  let claimed;
  if (productIndex !== null && productIndex !== undefined && !isNaN(productIndex)) {
    const claimField = `orderedProducts.${productIndex}.isStockDeducted`;
    claimed = await Customer.findOneAndUpdate(
      { ...filter, [claimField]: { $ne: true } },
      { $set: { [claimField]: true } },
      { new: true }
    );
  } else {
    claimed = await Customer.findOneAndUpdate(
      { ...filter, isStockDeducted: { $ne: true } },
      { $set: { isStockDeducted: true } },
      { new: true }
    );
  }
  if (!claimed) return []; // another request already deducted for this order/product

  try {
    const qtyNeeded = computeQtyNeeded(order, productIndex);
    const p = (productIndex !== null && productIndex !== undefined && !isNaN(productIndex) && Array.isArray(order.orderedProducts))
      ? order.orderedProducts[productIndex]
      : (Array.isArray(order.orderedProducts) ? order.orderedProducts[0] : order.orderedProducts);

    const targetBottleId = p?.packagingItemId || "";
    const targetLabelId = p?.labelItemId || "";
    const targetNozzleId = p?.nozzleId || "";
    const targetBottleName = p?.packagingType || "";
    const targetLabelName = p?.labelType || "";
    const targetNozzleName = p?.nozzleType || "";

    const PackagingItem = (await import("../packaging/packagingItem.model.js")).default;
    // Only "type" — PackagingItem has no subType path, and populating a path that
    // is not in the schema makes Mongoose throw (strictPopulate). That threw before
    // a single item was matched, so the catch below rolled the claim back and NOTHING
    // was deducted: bottle, cap and sticker stock all stayed untouched.
    const packagingItems = await PackagingItem.find({ ownerId: order.ownerId }).populate("type");

    const bottleKeywords = ["ขวด", "หลอด", "ซอง"];
    const bottleTypes = ["บรรจุภัณฑ์", "ขวดสเปรย์", "ขวดโฟม", "หลอดบีบ", "ขวด HDPE", "ซองฟอยล์", "ขวดเซรั่ม", "ขวดปั๊ม", "ขวดแชมพู", "ขวดแก้ว", "หลอดหัวปั้ม", "ขวดดรอปเปอร์"];
    // Prefer the explicit PackagingItem _id chosen at order time; if that id is
    // missing/stale, fall back to exact name; last resort is the Thai
    // keyword/type heuristic. Uses || chaining so a stale id still falls through.
    const matchedBottle =
      (targetBottleId && packagingItems.find(item => String(item._id) === String(targetBottleId)))
      || (targetBottleName && packagingItems.find(item => item.name === targetBottleName))
      || packagingItems.find(item =>
          item.customer === order.name &&
          (bottleTypes.includes(item.type?.name) || bottleKeywords.some(kw => item.name?.includes(kw)))
        )
      || packagingItems.find(item =>
          (item.customer === "ระบบ" || !item.customer) &&
          (bottleTypes.includes(item.type?.name) || bottleKeywords.some(kw => item.name?.includes(kw)))
        );

    // Cap/nozzle: prefer the explicit nozzleId chosen at order time (nozzles were
    // migrated into this packaging catalog), then exact name. Without this the
    // keyword heuristic below deducts from whatever item merely contains "ฝา" —
    // i.e. another customer's / a zero-stock record instead of the chosen nozzle.
    const capKeywords = ["ฝา", "หัวปั๊ม", "หัวปั้ม", "ฝาขวด"];
    const matchedCap =
      (targetNozzleId && packagingItems.find(item => String(item._id) === String(targetNozzleId)))
      || (targetNozzleName && packagingItems.find(item => item.name === targetNozzleName))
      || packagingItems.find(item =>
          item.customer === order.name &&
          (item.type?.name?.includes("ฝา") || item.type?.name?.includes("ปั๊ม") || capKeywords.some(kw => item.name?.includes(kw)))
        )
      || packagingItems.find(item =>
          (item.customer === "ระบบ" || !item.customer) &&
          (item.type?.name?.includes("ฝา") || item.type?.name?.includes("ปั๊ม") || capKeywords.some(kw => item.name?.includes(kw)))
        );

    // Customer-supplied stickers never come out of our stock — they arrive with
    // the order. NOTE the stored value is "เราสั่ง" while its label in the Sales
    // spec modal reads "ลูกค้าสั่งเอง"; the value is the inverse of how it reads,
    // so both spellings are treated as customer-supplied in case it is ever fixed.
    const CUSTOMER_SUPPLIED_STICKER = ["เราสั่ง", "ลูกค้าสั่งเอง"];
    const customerBringsSticker = CUSTOMER_SUPPLIED_STICKER.includes((p?.stickerOrderer || "").trim());

    const labelKeywords = ["กล่อง", "ฉลาก", "สติกเกอร์"];
    const labelTypes = ["กล่อง&ซอง", "กล่องไปรษณีย์", "กล่องกระดาษ", "ฉลาก", "สติกเกอร์"];
    const matchedLabel = customerBringsSticker ? null :
      (targetLabelId && packagingItems.find(item => String(item._id) === String(targetLabelId)))
      || (targetLabelName && packagingItems.find(item => item.name === targetLabelName))
      || packagingItems.find(item =>
          item.customer === order.name &&
          (labelTypes.includes(item.type?.name) || labelKeywords.some(kw => item.name?.includes(kw)))
        )
      || packagingItems.find(item =>
          (item.customer === "ระบบ" || !item.customer) &&
          (labelTypes.includes(item.type?.name) || labelKeywords.some(kw => item.name?.includes(kw)))
        );

    if (customerBringsSticker) {
      console.log(`Skipped sticker deduction for "${order.name}" — ลูกค้าสั่งสติกเกอร์เอง`);
    }

    const consumed = [];
    for (const [item, label] of [[matchedBottle, "bottle"], [matchedCap, "cap"], [matchedLabel, "label"]]) {
      if (item) {
        const beforeQuantity = Number(item.currentQuantity) || 0;
        item.currentQuantity = Math.max(0, (item.currentQuantity || 0) - qtyNeeded);
        await item.save();
        consumed.push({ itemId: item._id, name: item.name, qty: qtyNeeded });
        try {
          await writeStockMovementLog({
            ownerId: order.ownerId,
            actionType: "PACKAGING",
            description: stockMovementDescription({ itemName: item.name, direction: "out", amount: qtyNeeded, unit: "ชิ้น", afterQuantity: item.currentQuantity }),
            operator,
            itemType: "packaging",
            itemId: item._id,
            itemName: item.name,
            direction: "out",
            amount: qtyNeeded,
            unit: "ชิ้น",
            beforeQuantity,
            afterQuantity: item.currentQuantity,
            source: "production-packaging",
            stage: `เข้าไลน์ผลิต / ตัด${label === "bottle" ? "ขวด" : label === "cap" ? "ฝา" : "ฉลาก"}`,
            relatedOrderId: order._id,
            relatedOrderName: order.name || ""
          });
        } catch (logErr) {
          console.error("Failed to write packaging movement log:", logErr);
        }
        console.log(`Deducted ${qtyNeeded} units of ${label}: ${item.name}`);
      }
    }
    return consumed;
  } catch (deductErr) {
    console.error("Packaging deduction failed, rolling back claim:", deductErr);
    if (productIndex !== null && productIndex !== undefined && !isNaN(productIndex)) {
      await Customer.updateOne(filter, { $set: { [`orderedProducts.${productIndex}.isStockDeducted`]: false } });
    } else {
      await Customer.updateOne(filter, { $set: { isStockDeducted: false } });
    }
    return [];
  }
}

// Deduct the shipping box chosen when handing the goods to the customer.
// Separate from deductPackagingOnce (which cuts bottle/cap/sticker at prep time)
// because the courier box is only known at dispatch, not when production starts.
// Returns the recorded { itemId, name, qty } or null.
async function deductShippingBox(ownerId, box) {
  const qty = Math.max(0, parseInt(box?.qty) || 0);
  if (!box?.itemId || !qty) return null;
  try {
    const PackagingItem = (await import("../packaging/packagingItem.model.js")).default;
    const item = await PackagingItem.findOne({ _id: box.itemId });
    if (!item) return null;
    // Floor at 0: a negative stock count is never meaningful and would poison
    // every "พอใช้ / ไม่พอ" check downstream.
    const beforeQuantity = Number(item.currentQuantity) || 0;
    item.currentQuantity = Math.max(0, (item.currentQuantity || 0) - qty);
    await item.save();
    return { itemId: item._id, name: item.name, qty, beforeQuantity, afterQuantity: item.currentQuantity };
  } catch (err) {
    console.error("Failed to deduct shipping box:", err);
    return null;
  }
}

// Build a lot number from an optional prefix, the date, and the order id tail.
function buildLotNo(prefix, orderId, productIndex) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const tail = String(orderId || "").slice(-4).toUpperCase();
  const idxPart = (productIndex !== null && productIndex !== undefined && !isNaN(productIndex))
    ? `-${productIndex + 1}` : "";
  return `${(prefix || "LOT")}-${ymd}-${tail}${idxPart}`;
}

// Resolve the specific order line-item for a given productIndex. Returns the
// product object (or null) from the freeform orderedProducts blob.
function getOrderProduct(order, productIndex) {
  const op = order.orderedProducts;
  if (!op) return null;
  if (Array.isArray(op)) {
    if (productIndex !== null && productIndex !== undefined && !isNaN(productIndex)) {
      return op[productIndex] || null;
    }
    return op[0] || null;
  }
  if (typeof op === "object") return op;
  return null;
}

function isDevelopmentOrderLine(order, productIndex = null) {
  const product = getOrderProduct(order, productIndex);
  return order?.orderType === "develop"
    || order?.orderType === "development"
    || product?.isDevelopment === true;
}

// Auto-create a finished-goods ProductLot linked back to a production order when
// it passes QC. For a multi-product order, productIndex selects the line-item so
// each product gets its own lot with the correct formula/quantity. Best-effort:
// never blocks the QC response on failure. Returns the created lot's _id or null.
async function createLotForOrder(order, operatorId, productIndex = null, operatorName = String(operatorId)) {
  const hasIndex = productIndex !== null && productIndex !== undefined && !isNaN(productIndex);
  try {
    const ProductLot = (await import("../fg/productLot.model.js")).default;

    // Derive formula name & quantity from the specific line-item when available.
    const product = getOrderProduct(order, productIndex);
    if (isDevelopmentOrderLine(order, productIndex)) {
      return null;
    }
    const formulaId = product?.formulaId || order?.formulaId || null;
    const formula = formulaId
      ? await BomFormula.findOne({ _id: formulaId, ownerId: order.ownerId })
      : await BomFormula.findOne({ ownerId: order.ownerId, name: product?.formulaName || "" });
    const formulaName = formula?.name || product?.formulaName || "";

    // Look up a configured lot prefix for this formula (soft, by name).
    let prefix = "";
    if (formulaName) {
      try {
        const LotPrefixConfig = (await import("../fg/lotPrefixConfig.model.js")).default;
        const cfg = formula?._id
          ? await LotPrefixConfig.findOne({ ownerId: order.ownerId, formulaId: formula._id })
          : await LotPrefixConfig.findOne({ ownerId: order.ownerId, formulaName });
        if (cfg) prefix = cfg.prefix;
      } catch { /* prefix is optional */ }
    }

    // Prefer this product's own quantity; fall back to producedQty / order total.
    let qty = parseInt(product?.quantityPcs ?? product?.quantity) || 0;
    if (qty <= 0) qty = order.producedQty && order.producedQty > 0 ? order.producedQty : computeQtyNeeded(order);

    const mfgDate = new Date();
    const expDate = new Date(mfgDate);
    expDate.setMonth(expDate.getMonth() + 24); // default 24-month shelf life

    // This order may ALREADY have a lot: "ยืนยันสั่งผลิต" (bom-confirm) creates one
    // up front and stores it on order.producedLotId. The unique index below only
    // covers source:"production-qc", so creating another here silently
    // double-counted finished goods (a 100-pc order showed as 200 in FG stock).
    // Adopt the existing lot for this line instead — and keep its lotNo, which
    // may already be printed on the bottles.
    const adoptable = await ProductLot.findOne({
      orderId: order._id,
      $or: [
        { productIndex: hasIndex ? productIndex : null },
        { source: "bom-confirm", productIndex: null },
      ],
    });
    if (adoptable) {
      adoptable.productIndex = hasIndex ? productIndex : null;
      if (formula?._id) adoptable.formulaId = formula._id;
      if (formulaName) adoptable.formulaName = formulaName;
      if (formula) {
        adoptable.formulaVersion = formula.version || 1;
        adoptable.formulaSnapshot = {
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
        };
      }
      if (qty > 0) adoptable.quantity = qty;
      if (prefix) adoptable.lotPrefix = prefix;
      if (order.name) adoptable.customer = order.name;
      await adoptable.save();
      return adoptable._id;
    }

    const lot = new ProductLot({
      ownerId: order.ownerId || operatorId,
      orderId: order._id,
      productIndex: hasIndex ? productIndex : null,
      source: "production-qc",
      formulaId: formula?._id || undefined,
      formulaName,
      formulaVersion: formula?.version || null,
      formulaSnapshot: formula ? {
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
      } : null,
      lotPrefix: prefix,
      lotNo: buildLotNo(prefix, order._id, productIndex),
      mfgDate,
      expDate,
      quantity: qty,
      customer: order.name
    });
    await lot.save();
    try {
      await writeStockMovementLog({
        ownerId: order.ownerId || operatorId,
        actionType: "FG",
        description: stockMovementDescription({ itemName: lot.lotNo, direction: "in", amount: qty, unit: lot.unit || "ชิ้น", afterQuantity: qty }),
        operator: operatorName,
        itemType: "fgLot",
        itemId: lot._id,
        itemName: lot.lotNo,
        direction: "in",
        amount: qty,
        unit: lot.unit || "ชิ้น",
        beforeQuantity: 0,
        afterQuantity: qty,
        source: "production-qc",
        stage: "ผ่าน QC / รับเข้า FG",
        relatedOrderId: order._id,
        relatedOrderName: order.name || "",
        relatedLotId: lot._id
      });
    } catch (logErr) {
      console.error("Failed to write FG receipt movement log:", logErr);
    }
    return lot._id;
  } catch (lotErr) {
    // Duplicate key (11000) => a concurrent QC request already created the lot
    // for this (order, product); return that existing lot instead of erroring.
    if (lotErr && lotErr.code === 11000) {
      try {
        const ProductLot = (await import("../fg/productLot.model.js")).default;
        const existing = await ProductLot.findOne({
          orderId: order._id,
          source: "production-qc",
          productIndex: hasIndex ? productIndex : null
        });
        if (existing) return existing._id;
      } catch { /* fall through */ }
    }
    console.error("Failed to auto-create ProductLot on QC close:", lotErr);
    return null;
  }
}

// Goods handed to the customer have left the warehouse, so their lot must stop
// counting as FG stock. Flag it "delivered" instead of deleting — the lot stays
// for history/traceability and FG simply filters it out.
// Warehoused (ส่งเก็บเข้าคลัง) lots intentionally stay "active": they ARE stock.
async function markLotDelivered(orderId, productIndex) {
  try {
    const ProductLot = (await import("../fg/productLot.model.js")).default;
    const filter = { orderId, status: { $ne: "delivered" } };
    if (productIndex !== null && productIndex !== undefined && !isNaN(productIndex)) {
      filter.productIndex = productIndex;
    }
    const lots = await ProductLot.find(filter);
    if (!lots.length) return [];
    await ProductLot.updateMany(filter, {
      $set: { status: "delivered", deliveredAt: new Date() }
    });
    return lots;
  } catch (err) {
    console.error("Failed to mark lot delivered:", err);
    return [];
  }
}

// Validate & normalize an incoming productionStep. Returns { ok, value, error }.
function normalizeStep(raw) {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: undefined };
  const step = Number(raw);
  if (!Number.isInteger(step) || step < 0 || step > 6) {
    return { ok: false, error: "productionStep ต้องเป็นจำนวนเต็ม 0-6" };
  }
  return { ok: true, value: step };
}

function shouldDeductStock(data, order, productIndex = null) {
  if (isDevelopmentOrderLine(order, productIndex)) return false;
  return data.productionStatus === "กำลังผลิต" || Number(data.productionStep) >= 4;
}

// Handing an order over — delivered to the customer OR warehoused — ends the
// production run and closes the loop back to Sales: the deal card moves to the
// first Retention column and is flagged as a returning customer (star).
// Mirrors CLOSED_STATUSES in ProductionView (the card leaves the floor).
const HANDOVER_STATUSES = ["ส่งให้ลูกค้า", "ส่งเก็บเข้าคลัง"];

// Every line on the order has been handed over — nothing is still on the floor.
// A line with no status of its own inherits the order-level one.
function allLinesHandedOver(order) {
  const lines = Array.isArray(order?.orderedProducts) ? order.orderedProducts : [];
  if (!lines.length) return true;
  return lines.every(p => HANDOVER_STATUSES.includes(p?.productionStatus || order.productionStatus));
}

// The column is resolved by LABEL, not a hard-coded id, because Retention
// columns are user-created (custom_* ids differ per board).
async function moveToRetentionOnDelivery(filter, order) {
  try {
    const CrmColumn = (await import("../sales/crmColumn.model.js")).default;
    const col = await CrmColumn.findOne({ label: /^retention\s*1$/i });
    if (!col) return null;

    const set = { section: col.id, isReturningCustomer: true, statusChangedAt: new Date() };

    // Clear the finished deal so the card is ready for a fresh order — but only
    // once EVERY line is handed over, otherwise a still-running product would
    // lose its spec. The production history is safe: it lives in `productlots`
    // (keyed by orderId), not on this document.
    if (allLinesHandedOver(order)) {
      set.orderedProducts = [];
      set.orderType = "";
      // estValue / paidAmount / payPct are NOT cleared. Wiping them made every
      // completed job vanish from the finance totals, so the Cockpit's revenue
      // shrank each time work finished — the opposite of what it should do.
      // Sales overwrites these when the customer places the next order.
      // The order-level run state belongs to the run that just closed.
      set.productionStatus = "ยังไม่ผลิต";
      set.productionStep = 1;
      set.producedLotId = null;
      set.formulaId = null;
      set.skuId = null;
      set.consumedPackaging = [];
      set.isStockDeducted = false;
      set.packagingChecklist = null;
    }

    // One completed order = one star. Counted only when the LAST line is handed
    // over: an order with three products would otherwise score three stars for
    // what the customer experienced as a single purchase.
    const finished = allLinesHandedOver(order);
    const update = finished
      ? { $set: set, $inc: { completedOrderCount: 1 } }
      : { $set: set };

    const updated = await Customer.findOneAndUpdate(filter, update, { new: true });
    return updated ? { order: updated, wasReset: finished } : null;
  } catch (err) {
    console.error("Failed to move delivered order to Retention:", err);
    return null;
  }
}

async function writeLog(ownerId, actionType, description, operator) {
  try {
    const ActivityLog = (await import("../logs/activityLog.model.js")).default;
    await new ActivityLog({ ownerId, actionType, description, operator }).save();
  } catch (logErr) {
    console.error("Failed to write activity log:", logErr);
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// GET all production orders
router.get("/orders", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin ? {} : { ownerId: req.user._id };

    const leads = await Customer.find(filter);

    // Samples are fulfilled directly by Sales from finished-product stock.
    // They must never enter either the R&D or Production workflow.
    const productionOrders = leads.filter(c => {
      if (c.orderType === "sample") return false;

      return c.orderType === "lot" ||
        c.orderType === "develop" ||
        (Array.isArray(c.orderedProducts) && c.orderedProducts.length > 0) ||
        c.section === "s11";
    });

    return res.json(productionOrders);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET single production order details
router.get("/orders/:id", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };

    const order = await Customer.findOne(filter);
    if (!order) {
      return res.status(404).json({ message: "Production order not found or unauthorized." });
    }
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT update production order status
router.put("/orders/:id/status", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };

    const productIndex = req.query.productIndex !== undefined && req.query.productIndex !== "null"
      ? parseInt(req.query.productIndex)
      : null;

    const updateData = { ...req.body };
    delete updateData.isStockDeducted;
    delete updateData.productIndex; // Clean up just in case it is passed in body

    // Courier box picked in the ship-to-customer dialog. Pulled out of updateData
    // so stock is cut here rather than the raw request body being trusted; the
    // recorded result is written back below as a receipt of what was used.
    const shippingBoxReq = updateData.shippingBox;
    delete updateData.shippingBox;

    const step = normalizeStep(updateData.productionStep);
    if (!step.ok) return res.status(400).json({ error: step.error });
    if (step.value !== undefined) updateData.productionStep = step.value;

    const originalOrder = await Customer.findOne(filter);
    if (!originalOrder) {
      return res.status(404).json({ message: "Production order not found or unauthorized." });
    }

    // Formula links in order updates are authoritative ObjectIds. Resolve them
    // against the order owner and rewrite the display name from the BOM; a
    // non-admin must never attach another owner's formula to an order.
    if (updateData.formulaId) {
      const formula = await BomFormula.findOne({
        _id: updateData.formulaId,
        ownerId: originalOrder.ownerId || req.user._id,
        isArchived: { $ne: true }
      });
      if (!formula) return res.status(404).json({ message: "Formula not found, archived, or unauthorized." });
      updateData.formulaId = formula._id;
      updateData.formulaName = formula.name;
    }

    // Auto-deduct packaging stock (once) when entering production.
    if (shouldDeductStock(updateData, originalOrder, productIndex)) {
      const consumed = await deductPackagingOnce(filter, originalOrder, productIndex, req.user.name || req.user.email);
      if (consumed.length) updateData.consumedPackaging = consumed;
    }

    let updateQuery = {};
    if (productIndex !== null && !isNaN(productIndex)) {
      const setFields = {};
      Object.entries(updateData).forEach(([key, val]) => {
        setFields[`orderedProducts.${productIndex}.${key}`] = val;
      });
      updateQuery = { $set: setFields };
    } else {
      updateQuery = { $set: updateData };
    }

    let updatedOrder = await Customer.findOneAndUpdate(
      filter,
      updateQuery,
      { new: true }
    );

    // Warehousing or R&D QC passing a finished order creates a Finished-Goods ProductLot (adds history & sellable stock). Idempotent: skip when a lot already exists.
    if (updateData.productionStatus === "ส่งเก็บเข้าคลัง" || updateData.productionStatus === "ผ่าน QC แล้ว") {
      const hasIndex = productIndex !== null && !isNaN(productIndex);
      const existingLot = hasIndex
        ? getOrderProduct(updatedOrder, productIndex)?.producedLotId
        : updatedOrder.producedLotId;
      if (!existingLot) {
        const lotId = await createLotForOrder(updatedOrder, req.user._id, productIndex, req.user.name || req.user.email);
        if (lotId) {
          const lotField = hasIndex
            ? `orderedProducts.${productIndex}.producedLotId`
            : "producedLotId";
          updatedOrder = await Customer.findOneAndUpdate(
            filter,
            { $set: { [lotField]: lotId } },
            { new: true }
          );
        }
      }
    }

    // Delivered → the goods left the warehouse, so their lot stops counting as FG
    // stock (flagged, not deleted — history stays intact).
    if (updateData.productionStatus === "ส่งให้ลูกค้า" && !isDevelopmentOrderLine(originalOrder, productIndex)) {
      // Cut the courier box BEFORE the Retention move below, which may clear
      // orderedProducts — the receipt has to be written while the line still exists.
      const usedBox = await deductShippingBox(updatedOrder.ownerId, shippingBoxReq);
      if (usedBox) {
        const boxField = (productIndex !== null && !isNaN(productIndex))
          ? `orderedProducts.${productIndex}.shippingBox`
          : "shippingBox";
        updatedOrder = await Customer.findOneAndUpdate(
          filter, { $set: { [boxField]: usedBox } }, { new: true }
        ) || updatedOrder;
        await writeLog(
          req.user._id,
          "PRODUCTION",
          `ตัดสต็อกกล่องไปรษณีย์ "${usedBox.name}" จำนวน ${usedBox.qty} ใบ — ส่งสินค้าให้ลูกค้า "${updatedOrder.name}"`,
          req.user.name || req.user.email
        );
        try {
          await writeStockMovementLog({
            ownerId: req.user._id,
            actionType: "PACKAGING",
            description: stockMovementDescription({ itemName: usedBox.name, direction: "out", amount: usedBox.qty, unit: "ชิ้น", afterQuantity: usedBox.afterQuantity }),
            operator: req.user.name || req.user.email,
            itemType: "packaging",
            itemId: usedBox.itemId,
            itemName: usedBox.name,
            direction: "out",
            amount: usedBox.qty,
            unit: "ชิ้น",
            beforeQuantity: usedBox.beforeQuantity,
            afterQuantity: usedBox.afterQuantity,
            source: "delivery",
            stage: "ส่งให้ลูกค้า / ตัดกล่องไปรษณีย์",
            relatedOrderId: updatedOrder._id,
            relatedOrderName: updatedOrder.name || ""
          });
        } catch (logErr) {
          console.error("Failed to write shipping-box movement log:", logErr);
        }
      }

      const deliveredLots = await markLotDelivered(updatedOrder._id, productIndex);
      const n = deliveredLots.length;
      if (n > 0) {
        for (const lot of deliveredLots) {
          try {
            await writeStockMovementLog({
              ownerId: req.user._id,
              actionType: "FG",
              description: stockMovementDescription({ itemName: lot.lotNo, direction: "out", amount: lot.quantity, unit: lot.unit || "ชิ้น", afterQuantity: 0 }),
              operator: req.user.name || req.user.email,
              itemType: "fgLot",
              itemId: lot._id,
              itemName: lot.lotNo,
              direction: "out",
              amount: lot.quantity,
              unit: lot.unit || "ชิ้น",
              beforeQuantity: lot.quantity,
              afterQuantity: 0,
              source: "delivery",
              stage: "ส่งให้ลูกค้า / ตัด FG ออกจากคลัง",
              relatedOrderId: updatedOrder._id,
              relatedOrderName: updatedOrder.name || "",
              relatedLotId: lot._id
            });
          } catch (logErr) {
            console.error("Failed to write FG delivery movement log:", logErr);
          }
        }
        await writeLog(
          req.user._id,
          "FG",
          `ตัดล็อตสินค้าออกจากคลัง FG ${n} ล็อต — ส่งให้ลูกค้า "${updatedOrder.name}" แล้ว (ล็อตยังอยู่ในประวัติ)`,
          req.user.name || req.user.email
        );
      }
    }

    // Handed over (delivered or warehoused) → close the loop back to Sales: card
    // returns to Retention 1 with the returning-customer star. The finished order
    // stays on the doc, so the deal keeps its full production history.
    if (HANDOVER_STATUSES.includes(updateData.productionStatus)) {
      const moved = await moveToRetentionOnDelivery(filter, updatedOrder);
      if (moved) {
        updatedOrder = moved.order;
        const how = updateData.productionStatus === "ส่งให้ลูกค้า" ? "ส่งสินค้าให้ลูกค้า" : "ส่งสินค้าเก็บเข้าคลัง";
        const resetNote = moved.wasReset
          ? ' — ล้างรายการใบสั่งผลิต/ยอดเงิน พร้อมรับออเดอร์รอบใหม่ (ประวัติการผลิตยังอยู่ครบ)'
          : ' — ยังมีสูตรอื่นอยู่ในไลน์ผลิต จึงยังไม่ล้างรายการ';
        await writeLog(
          req.user._id,
          "SALES_CRM",
          `${how} "${updatedOrder.name}" เรียบร้อย — ย้ายดีลกลับไปขั้นตอน "Retention 1" และทำเครื่องหมายเป็นลูกค้าเก่า${resetNote}`,
          req.user.name || req.user.email
        );
      }
    }

    await writeLog(
      req.user._id,
      "PRODUCTION",
      `เปลี่ยนสถานะใบสั่งผลิตลูกค้า "${updatedOrder.name}" เป็น "${updateData.productionStatus || updatedOrder.productionStatus || "-"}"`,
      req.user.name || req.user.email
    );

    return res.json(updatedOrder);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// POST submit QC and close production order
router.post("/orders/:id/qc", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };

    const productIndex = req.query.productIndex !== undefined && req.query.productIndex !== "null"
      ? parseInt(req.query.productIndex)
      : null;

    const { qcPackagingPhoto, qcPumpPhoto, qcStickerPhoto, qcAssembledVideo } = req.body;

    // Require at least one piece of QC evidence before closing the order —
    // otherwise an empty body could mark production complete with no proof.
    const hasEvidence = [qcPackagingPhoto, qcPumpPhoto, qcStickerPhoto, qcAssembledVideo]
      .some(v => v && String(v).trim());
    if (!hasEvidence) {
      return res.status(400).json({ error: "ต้องแนบหลักฐาน QC อย่างน้อย 1 รายการก่อนปิดใบสั่งผลิต" });
    }

    const originalOrder = await Customer.findOne(filter);
    if (!originalOrder) {
      return res.status(404).json({ message: "Production order not found or unauthorized." });
    }

    const updateData = {
      productionStatus: "สำเร็จเสร็จสิ้น",
      qcPackagingPhoto,
      qcPumpPhoto,
      qcStickerPhoto,
      qcAssembledVideo
    };

    let updateQuery = {};
    if (productIndex !== null && !isNaN(productIndex)) {
      const setFields = {};
      Object.entries(updateData).forEach(([key, val]) => {
        setFields[`orderedProducts.${productIndex}.${key}`] = val;
      });
      updateQuery = { $set: setFields };
    } else {
      updateQuery = { $set: updateData };
    }

    let updatedOrder = await Customer.findOneAndUpdate(
      filter,
      updateQuery,
      { new: true }
    );

    // Auto-create a finished-goods lot linked back to this order (once) so the
    // FG inventory reflects completed production instead of requiring a manual
    // re-entry. Guarded by producedLotId to stay idempotent on repeat QC posts.
    const hasProducedLotId = productIndex !== null && !isNaN(productIndex)
      ? !!(updatedOrder.orderedProducts && updatedOrder.orderedProducts[productIndex]?.producedLotId)
      : !!updatedOrder.producedLotId;

    if (!hasProducedLotId) {
      const lotId = await createLotForOrder(updatedOrder, req.user._id, productIndex, req.user.name || req.user.email);
      if (lotId) {
        let lotUpdateQuery = {};
        if (productIndex !== null && !isNaN(productIndex)) {
          lotUpdateQuery = { $set: { [`orderedProducts.${productIndex}.producedLotId`]: lotId } };
        } else {
          lotUpdateQuery = { $set: { producedLotId: lotId } };
        }
        updatedOrder = await Customer.findOneAndUpdate(
          filter,
          lotUpdateQuery,
          { new: true }
        );
      }
    }

    await writeLog(
      req.user._id,
      "QC",
      `ยืนยันผลตรวจ QC และจัดส่งสินค้าใบสั่งผลิตลูกค้า "${updatedOrder.name}" สำเร็จ`,
      req.user.name || req.user.email
    );

    return res.json(updatedOrder);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT update production order step & wizard fields
router.put("/orders/:id/step", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };

    const productIndex = req.query.productIndex !== undefined && req.query.productIndex !== "null"
      ? parseInt(req.query.productIndex)
      : null;

    const updateFields = { ...req.body };
    delete updateFields.isStockDeducted;
    delete updateFields.productIndex; // Clean up just in case it is passed in body

    const step = normalizeStep(updateFields.productionStep);
    if (!step.ok) return res.status(400).json({ error: step.error });
    if (step.value !== undefined) updateFields.productionStep = step.value;

    const originalOrder = await Customer.findOne(filter);
    if (!originalOrder) {
      return res.status(404).json({ message: "Production order not found or unauthorized." });
    }

    // Auto-deduct packaging stock (once) when entering production.
    if (shouldDeductStock(updateFields, originalOrder, productIndex)) {
      const consumed = await deductPackagingOnce(filter, originalOrder, productIndex, req.user.name || req.user.email);
      if (consumed.length) updateFields.consumedPackaging = consumed;
    }

    let updateQuery = {};
    if (productIndex !== null && !isNaN(productIndex)) {
      const setFields = {};
      Object.entries(updateFields).forEach(([key, val]) => {
        setFields[`orderedProducts.${productIndex}.${key}`] = val;
      });
      updateQuery = { $set: setFields };
    } else {
      updateQuery = { $set: updateFields };
    }

    const updatedOrder = await Customer.findOneAndUpdate(
      filter,
      updateQuery,
      { new: true }
    );

    await writeLog(
      req.user._id,
      "PRODUCTION_STEP",
      `อัปเดตขั้นตอนผลิตลูกค้า "${updatedOrder.name}" เป็นขั้นตอนที่ ${updatedOrder.productionStep || 1} (${updatedOrder.productionStatus || "-"})`,
      req.user.name || req.user.email
    );

    return res.json(updatedOrder);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// PUT set/clear a machine-timeline schedule on an order (or one product line).
// Weekly grid: startDay/endDay are 0-6 (จ.=0 .. อา.=6). No stock deduction here —
// scheduling is planning only; deduction still happens on the status/step routes.
router.put("/orders/:id/schedule", async (req, res) => {
  try {
    const isAdmin = req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");
    const filter = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };

    const productIndex = req.query.productIndex !== undefined && req.query.productIndex !== "null"
      ? parseInt(req.query.productIndex)
      : null;

    const { scheduleMachineId, scheduleStartDate, scheduleEndDate, scheduleQueueNo, scheduleStartTime, scheduleEndTime } = req.body;

    // Placement is by REAL DATE ("YYYY-MM-DD"). The old 0-6 weekday index floated
    // free of any week, so a block drifted onto whatever week was on screen —
    // dates pin it. Reject anything that isn't a valid calendar date.
    const asDate = (v) => {
      if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return "";
      const d = new Date(`${v}T00:00:00`);
      return isNaN(d.getTime()) ? "" : v;
    };
    let start = asDate(scheduleStartDate);
    let end = asDate(scheduleEndDate) || start;
    if (start && end && end < start) [start, end] = [end, start]; // ISO dates sort lexically
    if (!start) end = "";

    // Queue position within machine+date: derived by the client on drop, never
    // typed. Positive integer, or null to clear.
    const qn = Number(scheduleQueueNo);
    const queueNo = Number.isInteger(qn) && qn > 0 ? qn : null;

    // Clearing the machine clears the whole placement.
    const machineId = scheduleMachineId || "";
    const fields = machineId
      ? {
          scheduleMachineId: machineId,
          scheduleStartDate: start,
          scheduleEndDate: end,
          scheduleQueueNo: queueNo,
          scheduleStartTime: scheduleStartTime || "09:00",
          scheduleEndTime: scheduleEndTime || "18:00",
          // Retire the legacy floating index so a migrated order can't fall back
          // to a stale weekday once it has a real date.
          scheduleStartDay: null,
          scheduleEndDay: null
        }
      : {
          scheduleMachineId: "",
          scheduleStartDate: "",
          scheduleEndDate: "",
          scheduleQueueNo: null,
          scheduleStartTime: "",
          scheduleEndTime: "",
          scheduleStartDay: null,
          scheduleEndDay: null
        };

    let updateQuery;
    if (productIndex !== null && !isNaN(productIndex)) {
      const setFields = {};
      Object.entries(fields).forEach(([k, v]) => {
        setFields[`orderedProducts.${productIndex}.${k}`] = v;
      });
      updateQuery = { $set: setFields };
    } else {
      updateQuery = { $set: fields };
    }

    const updatedOrder = await Customer.findOneAndUpdate(filter, updateQuery, { new: true });
    if (!updatedOrder) {
      return res.status(404).json({ message: "Production order not found or unauthorized." });
    }

    await writeLog(
      req.user._id,
      "PRODUCTION_SCHEDULE",
      machineId
        ? `จัดคิวผลิตลูกค้า "${updatedOrder.name}" เข้าเครื่อง ${machineId} (${start === end ? start : `${start} ถึง ${end}`}${queueNo ? `, คิวที่ ${queueNo}` : ""})`
        : `ยกเลิกคิวผลิตลูกค้า "${updatedOrder.name}"`,
      req.user.name || req.user.email
    );

    return res.json(updatedOrder);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
