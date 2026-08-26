import express from "express";
import { checkAuth } from "../../middleware/auth.js";
import SupportTicket from "./support.model.js";

const router = express.Router();

router.use(checkAuth);

const isAdmin = (user) => user.role && (user.role.name === "Admin" || user.role === "Admin");

// POST — submit a support ticket
router.post("/", async (req, res) => {
  try {
    const { title, category, severity, description, contactEmail, reportedBy } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "กรุณาระบุหัวข้อปัญหา" });
    }

    const ticket = new SupportTicket({
      ownerId: req.user._id,
      title: String(title).trim(),
      category: category || "other",
      severity: ["low", "medium", "high", "critical"].includes(severity) ? severity : "low",
      description: description || "",
      contactEmail: contactEmail || "",
      reportedBy: reportedBy || req.user.name || req.user.email || ""
    });
    await ticket.save();

    // Mirror to the activity log so support requests show up in the audit trail.
    try {
      const ActivityLog = (await import("../logs/activityLog.model.js")).default;
      await new ActivityLog({
        ownerId: req.user._id,
        actionType: "SUPPORT",
        description: `แจ้งปัญหา/ขอความช่วยเหลือ: "${ticket.title}" (ระดับ: ${ticket.severity})`,
        operator: req.user.name || req.user.email
      }).save();
    } catch (logErr) {
      console.error("Failed to write support activity log:", logErr);
    }

    return res.status(201).json(ticket);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// GET — list tickets (admin sees all, else own)
router.get("/", async (req, res) => {
  try {
    const filter = isAdmin(req.user) ? {} : { ownerId: req.user._id };
    const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 }).limit(200);
    return res.json(tickets);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
