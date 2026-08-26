import express from "express";
import User from "./user.model.js";
import { checkAuth, checkAdmin } from "../../middleware/auth.js";
import { sendDecisionNotifications } from "../auth/approvalEmail.js";

const router = express.Router();

router.use(checkAuth);
router.use(checkAdmin); // Restrict user management to admins only

import { ensureSystemRoles, roleForEmail } from "./systemRoles.js";

// Get all roles in system (for select inputs)
router.get("/roles", async (req, res) => {
  try {
    const roles = await ensureSystemRoles();
    return res.json([roles.Admin, roles.User]);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}).populate("role").sort({ name: 1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Let an Admin review the same first-login request from User Management.
router.post("/:id/approval", async (req, res) => {
  try {
    const { decision } = req.body;
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: "Decision must be approved or rejected." });
    }

    const user = await User.findById(req.params.id).populate("role");
    if (!user) return res.status(404).json({ message: "User not found." });
    if (user.approvalStatus !== "pending") {
      return res.status(409).json({ message: "คำขอนี้ได้รับการตรวจสอบแล้ว" });
    }

    const now = new Date();
    const roles = await ensureSystemRoles();
    user.approvalStatus = decision;
    // Approval grants access as User only. Admin elevation is a separate,
    // explicit action performed after approval from the edit-role control.
    user.role = roles.User._id;
    user.approvalTokenHash = undefined;
    user.approvalTokenExpiresAt = undefined;
    user.approvalEmailSentAt = undefined;

    if (decision === "approved") {
      user.approvedAt = now;
      user.rejectedAt = undefined;
      user.rejectedUntil = undefined;
    } else {
      user.rejectedAt = now;
      user.rejectedUntil = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    }

    await user.save();

    try {
      await sendDecisionNotifications(user, decision);
    } catch (emailError) {
      console.error("Failed to send approval decision emails:", emailError.message);
    }

    try {
      const ActivityLog = (await import("../logs/activityLog.model.js")).default;
      await ActivityLog.create({
        ownerId: req.user._id,
        actionType: "USER",
        description: `${decision === "approved" ? "อนุมัติ" : "ปฏิเสธ"}คำขอเข้าใช้งานของ "${user.name}" (${user.email})`,
        operator: req.user.name || "Admin"
      });
    } catch (e) {}

    await user.populate("role");
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Pre-create/Add a new user
router.post("/", async (req, res) => {
  try {
    const { name, email, role, line, facebook, tiktok } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists." });
    }

    const roles = await ensureSystemRoles();
    const assignedRole = Object.values(roles).find((item) => item._id.toString() === role || item.name === role)
      || await roleForEmail(email);

    // Google ID can be randomly set for pre-created user until they log in first time
    const newUser = new User({
      googleId: `precreated-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email,
      name,
      role: assignedRole._id,
      line: line || "",
      facebook: facebook || "",
      tiktok: tiktok || ""
    });
    await newUser.save();
    await newUser.populate("role");

    try {
      const ActivityLog = (await import("../logs/activityLog.model.js")).default;
      await ActivityLog.create({
        ownerId: req.user._id,
        actionType: "USER",
        description: `สร้างผู้ใช้งานใหม่ "${name}" (${email})`,
        operator: req.user.name || "Admin"
      });
    } catch (e) {}

    return res.status(201).json(newUser);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Update a user
router.put("/:id", async (req, res) => {
  try {
    const { name, email, role, line, facebook, tiktok } = req.body;
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email;
    if (line !== undefined) updateFields.line = line;
    if (facebook !== undefined) updateFields.facebook = facebook;
    if (tiktok !== undefined) updateFields.tiktok = tiktok;

    if (role !== undefined) {
      const roles = await ensureSystemRoles();
      const assignedRole = Object.values(roles).find((item) => item._id.toString() === role || item.name === role);
      if (!assignedRole) {
        return res.status(400).json({ message: "Role must be Admin or User." });
      }
      updateFields.role = assignedRole._id;
    } else if (email !== undefined) {
      const currentUser = await User.findById(req.params.id).select("email");
      const assignedRole = await roleForEmail(email ?? currentUser?.email);
      updateFields.role = assignedRole._id;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    ).populate("role");
    
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    try {
      const ActivityLog = (await import("../logs/activityLog.model.js")).default;
      await ActivityLog.create({
        ownerId: req.user._id,
        actionType: "USER",
        description: `อัปเดตข้อมูลผู้ใช้งาน "${user.name}" (${user.email})`,
        operator: req.user.name || "Admin"
      });
    } catch (e) {}

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Delete a user
router.delete("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("role");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const selfDeleted = req.user._id.toString() === req.params.id;
    if (user.role?.name === "Admin") {
      const roles = await ensureSystemRoles();
      const otherApprovedAdmins = await User.countDocuments({
        _id: { $ne: user._id },
        role: roles.Admin._id,
        approvalStatus: "approved"
      });
      if (otherApprovedAdmins === 0) {
        return res.status(400).json({
          message: "ไม่สามารถลบ Admin คนสุดท้ายได้ กรุณาตั้ง Admin คนอื่นก่อน"
        });
      }
    }

    await user.deleteOne();

    try {
      const ActivityLog = (await import("../logs/activityLog.model.js")).default;
      await ActivityLog.create({
        ownerId: req.user._id,
        actionType: "USER",
        description: `ลบผู้ใช้งาน "${user.name}" (${user.email}) ออกจากระบบ`,
        operator: req.user.name || "Admin"
      });
    } catch (e) {}

    return res.json({ message: "User deleted successfully.", selfDeleted });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;
