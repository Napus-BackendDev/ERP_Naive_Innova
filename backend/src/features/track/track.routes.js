import express from "express";
import mongoose from "mongoose";
import Customer from "../customers/customer.model.js";

const router = express.Router();

router.get("/:tag", async (req, res) => {
  try {
    const rawTag = req.params.tag ? decodeURIComponent(req.params.tag).trim() : "";
    if (!rawTag) {
      return res.status(400).json({ success: false, message: "Tag parameter is required" });
    }

    const escapedTag = rawTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const conditions = [];

    if (mongoose.Types.ObjectId.isValid(rawTag)) {
      conditions.push({ _id: rawTag });
    }

    conditions.push({ trackingNo: { $regex: new RegExp(`^${escapedTag}$`, "i") } });

    const cleanJob = rawTag.replace(/^JOB-?/i, "").trim();
    if (cleanJob) {
      const escapedCleanJob = cleanJob.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      conditions.push({ _id: { $regex: new RegExp(`${escapedCleanJob}$`, "i") } });
    }

    const customer = await Customer.findOne({ $or: conditions })
      .select({
        _id: 1,
        trackingNo: 1,
        name: 1,
        brand: 1,
        line: 1,
        address: 1,
        createdAt: 1,
        updatedAt: 1,
        dueDate: 1,
        orderedProducts: 1
      })
      .lean();

    if (!customer) {
      return res.status(404).json({ success: false, message: "ไม่พบข้อมูลแท็กหรือคำสั่งซื้อนี้" });
    }

    const formattedCustomer = {
      ...customer,
      trackingNo: customer.trackingNo || `TG-${customer._id.toString().slice(-8).toUpperCase()}`,
      orderedProducts: Array.isArray(customer.orderedProducts) ? customer.orderedProducts : []
    };

    return res.json({ success: true, customer: formattedCustomer });
  } catch (error) {
    console.error("Error fetching tracking info:", error);
    return res.status(500).json({ success: false, message: "เกิดข้อผิดพลาดของเซิร์ฟเวอร์ในการดึงข้อมูลแท็ก" });
  }
});

export default router;
