import express from "express";
import { checkAuth } from "../../middleware/auth.js";
import Customer, { normalizeOrderedProducts, LIST_PROJECTION } from "../customers/customer.model.js";
import CrmColumn from "./crmColumn.model.js";
import Product from "../products/product.model.js";
import { stockMovementDescription, writeStockMovementLog } from "../logs/stockMovementLog.js";

const router = express.Router();

// Apply auth middleware to all sales routes
router.use(checkAuth);

// Helper to map section ID to Thai stage name
const getSectionLabel = (sec) => {
  switch (sec) {
    case "s1": return "Lead (ผู้ติดต่อใหม่)";
    case "s2": return "Sample Sent (ส่งตัวอย่างแล้ว)";
    case "s6": return "Follow-up (ติดตามผล)";
    case "s10": return "Negotiation (เจรจาต่อรอง)";
    case "s11": return "Closed Won (ปิดการขายสำเร็จ)";
    default: return sec || "Lead (ผู้ติดต่อใหม่)";
  }
};

const isAdminUser = (req) =>
  req.user.role && (req.user.role.name === "Admin" || req.user.role === "Admin");

const getSampleStockLines = (orderType, orderedProducts) => {
  if (orderType !== "sample" || !Array.isArray(orderedProducts)) return [];
  return orderedProducts
    .map((item) => ({
      productId: item?.productId,
      qty: Math.max(0, parseInt(item?.quantity) || 0)
    }))
    .filter((item) => item.productId && item.qty > 0);
};

const sampleProductFilter = (productId, ownerId, isAdmin) => ({
  _id: productId,
  isSample: true,
  ...(isAdmin ? {} : { ownerId })
});

async function findSampleStockShortages(lines, ownerId, isAdmin) {
  const shortages = [];
  for (const line of lines) {
    const product = await Product.findOne(
      sampleProductFilter(line.productId, ownerId, isAdmin)
    ).lean();
    if (!product || (product.currentQuantity || 0) < line.qty) {
      shortages.push({
        productId: line.productId,
        name: product?.name || "",
        available: product?.currentQuantity || 0,
        requested: line.qty
      });
    }
  }
  return shortages;
}

async function deductSampleStock(lines, ownerId, isAdmin, order = null, operator = "ระบบ") {
  for (const line of lines) {
    const updated = await Product.findOneAndUpdate(
      {
        ...sampleProductFilter(line.productId, ownerId, isAdmin),
        currentQuantity: { $gte: line.qty }
      },
      { $inc: { currentQuantity: -line.qty } },
      { new: true }
    );
    if (!updated) continue;
    try {
      await writeStockMovementLog({
        ownerId,
        actionType: "STOCK",
        description: stockMovementDescription({ itemName: updated.name, direction: "out", amount: line.qty, unit: "ชิ้น", afterQuantity: updated.currentQuantity }),
        operator,
        itemType: "sampleProduct",
        itemId: updated._id,
        itemName: updated.name,
        direction: "out",
        amount: line.qty,
        unit: "ชิ้น",
        beforeQuantity: Number(updated.currentQuantity) + line.qty,
        afterQuantity: Number(updated.currentQuantity),
        source: "sales-sample",
        stage: "สร้างออเดอร์ตัวอย่าง / ตัดสต็อก",
        relatedOrderId: order?._id,
        relatedOrderName: order?.name || ""
      });
    } catch (logErr) {
      console.error("Failed to write sample-product movement log:", logErr);
    }
  }
}

const sampleStockMap = (orderType, orderedProducts) => {
  const map = new Map();
  for (const line of getSampleStockLines(orderType, orderedProducts)) {
    map.set(line.productId, (map.get(line.productId) || 0) + line.qty);
  }
  return map;
};

const sampleStockDelta = (fromOrderType, fromProducts, toOrderType, toProducts) => {
  const before = sampleStockMap(fromOrderType, fromProducts);
  const after = sampleStockMap(toOrderType, toProducts);
  const ids = new Set([...before.keys(), ...after.keys()]);
  return [...ids].map((productId) => ({
    productId,
    qty: (after.get(productId) || 0) - (before.get(productId) || 0)
  })).filter((line) => line.qty !== 0);
};

async function applySampleStockDelta(delta, ownerId, isAdmin, order = null, operator = "ระบบ") {
  for (const line of delta.filter((item) => item.qty > 0)) {
    const updated = await Product.findOneAndUpdate(
      sampleProductFilter(line.productId, ownerId, isAdmin),
      { $inc: { currentQuantity: -line.qty } },
      { new: true }
    );
    if (!updated) continue;
    try {
      await writeStockMovementLog({
        ownerId,
        actionType: "STOCK",
        description: stockMovementDescription({ itemName: updated.name, direction: "out", amount: line.qty, unit: "ชิ้น", afterQuantity: updated.currentQuantity }),
        operator,
        itemType: "sampleProduct",
        itemId: updated._id,
        itemName: updated.name,
        direction: "out",
        amount: line.qty,
        unit: "ชิ้น",
        beforeQuantity: Number(updated.currentQuantity) + line.qty,
        afterQuantity: Number(updated.currentQuantity),
        source: "sales-sample",
        stage: "แก้ไขออเดอร์ตัวอย่าง / ตัดสต็อกเพิ่ม",
        relatedOrderId: order?._id,
        relatedOrderName: order?.name || ""
      });
    } catch (logErr) {
      console.error("Failed to write sample-product movement log:", logErr);
    }
  }
}

// Get all sales leads (Customer documents — separated from auth users)
router.get("/", async (req, res) => {
  try {
    const filter = isAdminUser(req) ? {} : { ownerId: req.user._id };
    // No consumer of this list (Sales board, Cockpit, Stock) reads QC media.
    const leads = await Customer.find(filter).select(LIST_PROJECTION).lean();
    return res.json(leads);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Create a new sales lead
router.post("/", async (req, res) => {
  try {
    const {
      name, brand, email, phone, line, facebook, tiktok, province, notes,
      estValue, payPct, paidAmount, section, contactPerson, contactName,
      address, orderType, orderedProducts: rawOrderedProducts,
      // Optional backdate from the Excel/CSV import: a valid date parks the card
      // on that day of the board (statusChangedAt drives the day grouping).
      createdAt: rawCreatedAt, statusChangedAt: rawStatusChangedAt
    } = req.body;

    // Only accept a sane past/near date, so a malformed cell can't stamp a card
    // in the year 1970 or far in the future.
    const backdate = (() => {
      const d = rawCreatedAt ? new Date(rawCreatedAt) : null;
      if (!d || isNaN(d)) return null;
      const yr = d.getFullYear();
      return yr >= 2000 && yr <= new Date().getFullYear() + 1 ? d : null;
    })();

    // Strip blank ObjectId/number link fields so unselected optional
    // packaging/label/scent/nozzle don't cast-fail into a 500. Keep undefined
    // as-is so an existing customer's orderedProducts isn't wiped on update.
    const orderedProducts = rawOrderedProducts === undefined
      ? undefined
      : normalizeOrderedProducts(rawOrderedProducts);

    const sampleStockLines = getSampleStockLines(orderType, orderedProducts || []);
    const sampleShortages = await findSampleStockShortages(sampleStockLines, req.user._id, isAdminUser(req));
    if (sampleShortages.length > 0) {
      return res.status(400).json({
        message: "Sample product stock is insufficient.",
        shortages: sampleShortages
      });
    }

    const finalName = name || contactPerson || contactName || "ลูกค้าใหม่";

    // Match an existing customer by email when one was provided
    let customer = email ? await Customer.findOne({ email }) : null;

    if (customer) {
      // Just update CRM/social fields on existing customer
      const updateFields = {
        name: finalName,
        brand: brand !== undefined ? brand : customer.brand,
        phone: phone !== undefined ? phone : customer.phone,
        line: line !== undefined ? line : customer.line,
        facebook: facebook !== undefined ? facebook : customer.facebook,
        tiktok: tiktok !== undefined ? tiktok : customer.tiktok,
        province: province !== undefined ? province : customer.province,
        notes: notes !== undefined ? notes : customer.notes,
        estValue: estValue !== undefined ? estValue : customer.estValue,
        payPct: payPct !== undefined ? payPct : customer.payPct,
        paidAmount: paidAmount !== undefined ? paidAmount : customer.paidAmount,
        section: section || customer.section,
        address: address !== undefined ? address : customer.address,
        orderType: orderType !== undefined ? orderType : customer.orderType
      };
      customer.set(updateFields);
      if (orderedProducts !== undefined) customer.orderedProducts = orderedProducts;
      await customer.save();
    } else {
      customer = new Customer({
        email: email || "",
        name: finalName,
        brand: brand || "",
        ownerId: req.user._id,
        phone: phone || "",
        line: line || "",
        facebook: facebook || "",
        tiktok: tiktok || "",
        province: province || "",
        notes: notes || "",
        estValue: estValue || 0,
        payPct: payPct || "",
        paidAmount: paidAmount || 0,
        section: section || "s1",
        address: address || "",
        orderType: orderType || "",
        orderedProducts: orderedProducts || [],
        // statusChangedAt is a plain field, so it takes the backdate directly and
        // is enough for the board's day grouping.
        ...(backdate ? { statusChangedAt: rawStatusChangedAt ? new Date(rawStatusChangedAt) : backdate } : {})
      });
      await customer.save();

      // createdAt/updatedAt are managed by mongoose timestamps and ignore any
      // value passed to the constructor, so a backdate has to be written after
      // the insert — otherwise the card sorts as "new". Mongoose also marks
      // createdAt immutable, which silently drops it from a model-level $set, so
      // this goes through the native driver which honours both fields.
      if (backdate) {
        await Customer.collection.updateOne(
          { _id: customer._id },
          { $set: { createdAt: backdate, updatedAt: backdate } }
        );
        customer = await Customer.findById(customer._id);
      }
    }

    await deductSampleStock(sampleStockLines, req.user._id, isAdminUser(req), customer, req.user.name || req.user.email);

    // Log lead creation
    try {
      const ActivityLog = (await import("../logs/activityLog.model.js")).default;
      const log = new ActivityLog({
        ownerId: req.user._id,
        actionType: "SALES_CRM",
        description: `สร้างดีลลูกค้าใหม่ "${finalName}" ในขั้นตอน "${getSectionLabel(section || "s1")}" (เบอร์โทร: ${phone || "-"}, ประเภทออเดอร์: ${orderType === "lot" ? "สั่งเป็นล็อต" : orderType === "sample" ? "สั่งเป็นตัวอย่าง" : "ไม่ระบุ"})`,
        operator: req.user.name || req.user.email
      });
      await log.save();
    } catch (logErr) {
      console.error("Failed to write activity log:", logErr);
    }

    return res.status(201).json(customer);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get Kanban board columns from DB
router.get("/columns", async (req, res) => {
  try {
    let columns = await CrmColumn.find({}).sort({ order: 1 });
    if (columns.length === 0) {
      const defaultCols = [
        { id: "s1", label: "Lead", isDefault: true, color: "#3b82f6", order: 0 },
        { id: "s2", label: "Sample Sent", isDefault: true, color: "#eab308", order: 1 },
        { id: "s6", label: "Follow-up", isDefault: true, color: "#f97316", order: 2 },
        { id: "s10", label: "Negotiation", isDefault: true, color: "#a855f7", order: 3 },
        { id: "s11", label: "Closed Won", isDefault: true, color: "#22c55e", order: 4 }
      ];
      columns = await CrmColumn.insertMany(defaultCols);
    }
    return res.json(columns);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Update/save Kanban board columns to DB
router.put("/columns", async (req, res) => {
  try {
    const columnsPayload = req.body;
    if (!Array.isArray(columnsPayload)) {
      return res.status(400).json({ message: "Payload must be an array of columns" });
    }

    // 1. Delete columns not present in the payload
    const keptIds = columnsPayload.map(col => col.id).filter(Boolean);
    await CrmColumn.deleteMany({ id: { $nin: keptIds } });

    // 2. Upsert each column in the payload to prevent unique index race conditions
    const promises = columnsPayload.map((col, index) => {
      return CrmColumn.findOneAndUpdate(
        { id: col.id },
        {
          $set: {
            label: col.label,
            isDefault: col.isDefault || false,
            color: col.color || "#3b82f6",
            rule: col.rule || { enabled: false, triggerDays: 7, targetColumnId: "" },
            order: index
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    });

    await Promise.all(promises);

    const columns = await CrmColumn.find({}).sort({ order: 1 });
    return res.json(columns);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Update sales lead
router.put("/:id", async (req, res) => {
  try {
    const filter = isAdminUser(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };

    const originalCustomer = await Customer.findOne(filter);
    if (!originalCustomer) {
      return res.status(404).json({ message: "Customer not found or unauthorized." });
    }

    const prevSection = originalCustomer.section;
    const updateData = { ...req.body };
    delete updateData.role; // legacy field from the old User-based shape
    if (updateData.section !== undefined && prevSection !== updateData.section) {
      updateData.statusChangedAt = new Date();
    }

    // Route orderedProducts through the document setter so legacy shapes
    // (single object / strings) are normalized by the schema hook.
    const orderedProducts = updateData.orderedProducts === undefined
      ? undefined
      : normalizeOrderedProducts(updateData.orderedProducts);
    delete updateData.orderedProducts;

    const nextOrderType = updateData.orderType !== undefined ? updateData.orderType : originalCustomer.orderType;
    const nextOrderedProducts = orderedProducts !== undefined ? orderedProducts : originalCustomer.orderedProducts;
    const sampleDelta = sampleStockDelta(
      originalCustomer.orderType,
      originalCustomer.orderedProducts || [],
      nextOrderType,
      nextOrderedProducts || []
    );
    const sampleDeductions = sampleDelta
      .filter((line) => line.qty > 0)
      .map((line) => ({ productId: line.productId, qty: line.qty }));
    const sampleShortages = await findSampleStockShortages(
      sampleDeductions,
      req.user._id,
      isAdminUser(req)
    );
    if (sampleShortages.length > 0) {
      return res.status(400).json({
        message: "Sample product stock is insufficient.",
        shortages: sampleShortages
      });
    }

    originalCustomer.set(updateData);
    if (orderedProducts !== undefined) originalCustomer.orderedProducts = orderedProducts;
    const updatedCustomer = await originalCustomer.save();
    await applySampleStockDelta(sampleDelta, req.user._id, isAdminUser(req), updatedCustomer, req.user.name || req.user.email);

    // Log lead update
    try {
      const ActivityLog = (await import("../logs/activityLog.model.js")).default;
      let logDesc = `อัปเดตข้อมูลดีลลูกค้า "${updatedCustomer.name}" (ประเภทออเดอร์: ${updatedCustomer.orderType === "lot" ? "สั่งเป็นล็อต" : updatedCustomer.orderType === "sample" ? "สั่งเป็นตัวอย่าง" : "ไม่ระบุ"})`;

      if (prevSection !== updatedCustomer.section) {
        logDesc = `ย้ายสถานะดีลลูกค้า "${updatedCustomer.name}" จาก "${getSectionLabel(prevSection)}" ไปยัง "${getSectionLabel(updatedCustomer.section)}"`;
      }

      const log = new ActivityLog({
        ownerId: req.user._id,
        actionType: "SALES_CRM",
        description: logDesc,
        operator: req.user.name || req.user.email
      });
      await log.save();
    } catch (logErr) {
      console.error("Failed to write activity log:", logErr);
    }

    return res.json(updatedCustomer);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete sales lead
router.delete("/:id", async (req, res) => {
  try {
    const filter = isAdminUser(req)
      ? { _id: req.params.id }
      : { _id: req.params.id, ownerId: req.user._id };

    const deletedCustomer = await Customer.findOneAndDelete(filter);
    if (!deletedCustomer) {
      return res.status(404).json({ message: "Customer not found or unauthorized." });
    }

    // Log lead deletion
    try {
      const ActivityLog = (await import("../logs/activityLog.model.js")).default;
      const log = new ActivityLog({
        ownerId: req.user._id,
        actionType: "SALES_CRM",
        description: `ลบดีลลูกค้า "${deletedCustomer.name}" ออกจากระบบ`,
        operator: req.user.name || req.user.email
      });
      await log.save();
    } catch (logErr) {
      console.error("Failed to write activity log:", logErr);
    }

    return res.json({ message: "Lead deleted successfully", id: req.params.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
