import express from "express";
import jwt from "jsonwebtoken";
import User from "../users/user.model.js";
import passport from "passport";
import { hashApprovalToken, sendDecisionNotifications } from "./approvalEmail.js";

const router = express.Router();

// Google OAuth Authorization Route
router.get("/google", passport.authenticate("google", {
  scope: ["profile", "email"],
  prompt: "select_account"
}));

// Google OAuth Callback Route
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${process.env.CLIENT_URL || "http://localhost:3000"}/login?error=OAuthFailed` }),
  async (req, res) => {
    try {
      const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
      if (req.user.authBlockedReason === "personal_email_required") {
        return res.redirect(`${clientUrl}/login?error=${encodeURIComponent("อีเมลบริษัทนี้ถูกบล็อก กรุณาใช้อีเมลส่วนตัวในการเข้าสู่ระบบ")}`);
      }
      if (req.user.approvalStatus === "pending") {
        const emailDelivery = req.user.$locals?.approvalEmailFailed ? "&emailDelivery=failed" : "";
        return res.redirect(`${clientUrl}/login?pendingApproval=1${emailDelivery}`);
      }
      if (req.user.approvalStatus === "rejected") {
        return res.redirect(`${clientUrl}/login?approval=rejected`);
      }

      const roleName = req.user.role && typeof req.user.role === "object" ? req.user.role.name : req.user.role;
      const token = jwt.sign(
        { userId: req.user._id, email: req.user.email, role: roleName || "User" },
        process.env.JWT_SECRET || "super_secret",
        { expiresIn: "7d" }
      );
      
      return res.redirect(`${clientUrl}/login?token=${token}&user=${encodeURIComponent(JSON.stringify({
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        avatarUrl: req.user.avatarUrl,
        role: roleName || "User"
      }))}`);
    } catch (error) {
      return res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}/login?error=${encodeURIComponent(error.message)}`);
    }
  }
);

router.get("/approve-first-login", (req, res) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const token = typeof req.query.token === "string" ? req.query.token : "";

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return res.redirect(`${clientUrl}/login?approval=invalid`);
  }

  return res.type("html").send(`<!doctype html>
    <html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>ยืนยันผู้เข้าใช้ Naive ERP</title></head>
    <body style="font-family:Arial,sans-serif;background:#f8fafc;color:#1f2937;margin:0;padding:24px">
      <main style="max-width:520px;margin:48px auto;background:white;border:1px solid #e2e8f0;border-radius:20px;padding:28px;box-shadow:0 10px 30px rgba(15,23,42,.08)">
        <h1 style="font-size:24px;color:#15803d">ยืนยันผู้เข้าใช้ระบบ</h1>
        <p>กดปุ่มด้านล่างเพื่ออนุญาตคำขอเข้าใช้ Naive ERP ครั้งแรก</p>
        <form method="post" action="/api/auth/approve-first-login">
          <input type="hidden" name="token" value="${token}">
          <button type="submit" style="border:0;border-radius:10px;background:#16a34a;color:white;padding:14px 22px;font-size:16px;font-weight:bold">ยืนยันให้เข้าใช้ระบบ</button>
        </form>
        <p style="color:#64748b;font-size:13px;margin-top:24px">หากไม่รู้จักผู้ขอเข้าใช้ ให้ปิดหน้านี้โดยไม่กดปุ่ม</p>
      </main>
    </body></html>`);
});

router.post("/approve-first-login", async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const token = typeof req.body.token === "string" ? req.body.token : "";

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return res.redirect(`${clientUrl}/login?approval=invalid`);
  }

  try {
    const user = await User.findOne({
      approvalStatus: "pending",
      approvalTokenHash: hashApprovalToken(token),
      approvalTokenExpiresAt: { $gt: new Date() }
    }).select("+approvalTokenHash +approvalTokenExpiresAt +approvalEmailSentAt");

    if (!user) return res.redirect(`${clientUrl}/login?approval=invalid`);

    user.approvalStatus = "approved";
    user.approvedAt = new Date();
    user.approvalTokenHash = undefined;
    user.approvalTokenExpiresAt = undefined;
    user.approvalEmailSentAt = undefined;
    await user.save();

    try {
      await sendDecisionNotifications(user, "approved");
    } catch (emailError) {
      console.error("Failed to send approval decision emails:", emailError.message);
    }

    return res.redirect(`${clientUrl}/login?approval=approved`);
  } catch (error) {
    return res.redirect(`${clientUrl}/login?approval=error`);
  }
});

router.get("/reject-first-login", (req, res) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const token = typeof req.query.token === "string" ? req.query.token : "";

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return res.redirect(`${clientUrl}/login?approval=invalid`);
  }

  return res.type("html").send(`<!doctype html>
    <html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>ปฏิเสธผู้เข้าใช้ Naive ERP</title></head>
    <body style="font-family:Arial,sans-serif;background:#f8fafc;color:#1f2937;margin:0;padding:24px">
      <main style="max-width:520px;margin:48px auto;background:white;border:1px solid #e2e8f0;border-radius:20px;padding:28px;box-shadow:0 10px 30px rgba(15,23,42,.08)">
        <h1 style="font-size:24px;color:#dc2626">ปฏิเสธผู้เข้าใช้ระบบ</h1>
        <p>ยืนยันการปฏิเสธคำขอเข้าใช้ Naive ERP บัญชีนี้จะไม่สามารถเข้าสู่ระบบเป็นเวลา 4 ชั่วโมง</p>
        <form method="post" action="/api/auth/reject-first-login">
          <input type="hidden" name="token" value="${token}">
          <button type="submit" style="border:0;border-radius:10px;background:#dc2626;color:white;padding:14px 22px;font-size:16px;font-weight:bold">ยืนยันการปฏิเสธ</button>
        </form>
      </main>
    </body></html>`);
});

router.post("/reject-first-login", async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const token = typeof req.body.token === "string" ? req.body.token : "";

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return res.redirect(`${clientUrl}/login?approval=invalid`);
  }

  try {
    const user = await User.findOne({
      approvalStatus: "pending",
      approvalTokenHash: hashApprovalToken(token),
      approvalTokenExpiresAt: { $gt: new Date() }
    }).select("+approvalTokenHash +approvalTokenExpiresAt +approvalEmailSentAt");

    if (!user) return res.redirect(`${clientUrl}/login?approval=invalid`);

    user.approvalStatus = "rejected";
    user.rejectedAt = new Date();
    user.rejectedUntil = new Date(Date.now() + 4 * 60 * 60 * 1000);
    user.approvalTokenHash = undefined;
    user.approvalTokenExpiresAt = undefined;
    user.approvalEmailSentAt = undefined;
    await user.save();

    try {
      await sendDecisionNotifications(user, "rejected");
    } catch (emailError) {
      console.error("Failed to send rejection decision emails:", emailError.message);
    }

    return res.redirect(`${clientUrl}/login?approval=rejected&lockHours=4`);
  } catch (error) {
    return res.redirect(`${clientUrl}/login?approval=error`);
  }
});

// Mock Login for Dev testing (bypasses actual Google OAuth callback during local UI/UX test)
router.post("/mock-login", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production" || process.env.ENABLE_MOCK_LOGIN !== "true") {
      return res.status(404).json({ message: "Mock login is disabled." });
    }

    // Find the seeded mock admin
    let user = await User.findOne({ email: "mock.admin@naiveops.com" }).populate("role");
    if (!user) {
      const Role = (await import("../users/role.model.js")).default;
      let adminRole = await Role.findOne({ name: "Admin" });
      if (!adminRole) {
        adminRole = await Role.create({ name: "Admin", description: "ผู้ดูแลระบบสูงสุด", permissions: ["manage_users", "view_all_data", "edit_data"] });
      }
      user = await User.create({
        googleId: "mock-google-id-123",
        email: "mock.admin@naiveops.com",
        name: "Mock Admin",
        avatarUrl: "https://lh3.googleusercontent.com/a/default-user",
        role: adminRole._id
      });
      user.role = adminRole;
    }

    const roleName = user.role && typeof user.role === "object" ? user.role.name : user.role;
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: roleName || "User" },
      process.env.JWT_SECRET || "super_secret",
      { expiresIn: "7d" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({
      message: "Successfully logged in as Mock User.",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: roleName || "User"
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
  return res.json({ message: "Logged out successfully." });
});

// Get current user profile
router.get("/me", async (req, res) => {
  // If no auth token, returns null instead of throwing 401 directly, helping frontend handle session states
  try {
    const authHeader = req.headers.authorization;
    let token = "";

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) return res.json({ user: null });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super_secret");
    const user = await User.findById(decoded.userId).populate("role");
    if (!user) return res.json({ user: null });
    if (user.approvalStatus === "pending") {
      return res.status(403).json({ code: "PENDING_APPROVAL", message: "First-login approval is required." });
    }
    if (user.approvalStatus === "rejected") {
      return res.status(403).json({ code: "ACCESS_REJECTED", message: "Access request was rejected." });
    }
    
    // Format response role as a simple string name for frontend compatibility
    let userObj = user.toObject();
    if (userObj.role && typeof userObj.role === "object") {
      userObj.role = userObj.role.name;
    }
    
    return res.json({ user: userObj });
  } catch (err) {
    // Invalid JWT means session is no longer valid. Other errors (for example
    // a temporary MongoDB/network failure) must not look like a logged-out user.
    if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(err.name)) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }

    console.error("Failed to load current user:", err.message);
    return res.status(503).json({ message: "Authentication service temporarily unavailable." });
  }
});

export default router;
