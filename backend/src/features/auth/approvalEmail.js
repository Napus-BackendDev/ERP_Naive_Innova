import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../users/user.model.js";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_APPROVER_EMAILS = [
  "nawin.mfu24@gmail.com",
  "nawin.wora@gmail.com",
  "napus.dev@gmail.com",
  "ohohako09@gmail.com"
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: requiredEnv("GMAIL_USER"),
      pass: requiredEnv("GMAIL_APP_PASSWORD")
    }
  });
}

export function hashApprovalToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function getApproverEmails() {
  const adminUsers = await User.find({}).select("email").populate({
    path: "role",
    match: { name: "Admin" },
    select: "name"
  });
  const emails = adminUsers.filter((user) => user.role).map((user) => user.email);
  if (emails.length) {
    return [...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  }

  const configured = process.env.LOGIN_APPROVER_EMAILS || process.env.LOGIN_APPROVER_EMAIL;
  const fallback = configured ? configured.split(",") : DEFAULT_APPROVER_EMAILS;
  return [...new Set(fallback.map((email) => email.trim().toLowerCase()).filter(Boolean))];
}

function emailLayout({ eyebrow, title, accent, body, footer }) {
  return `<!doctype html>
  <html lang="th"><body style="margin:0;padding:0;background:#f1f5f9">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;font-family:Arial,'Noto Sans Thai',sans-serif;color:#1e293b">
          <tr><td style="height:8px;background:${accent}"></td></tr>
          <tr><td style="padding:32px 32px 12px">
            <div style="font-size:12px;font-weight:700;letter-spacing:1.4px;color:${accent};text-transform:uppercase">${eyebrow}</div>
            <h1 style="margin:10px 0 0;font-size:26px;line-height:1.35;color:#0f172a">${title}</h1>
          </td></tr>
          <tr><td style="padding:8px 32px 32px">${body}</td></tr>
          <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;line-height:1.6">${footer}</td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

function userCard(user) {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px">
    <tr><td style="padding:18px">
      <div style="font-size:12px;color:#64748b;margin-bottom:6px">ผู้ขอเข้าใช้ระบบ</div>
      <div style="font-size:17px;font-weight:700;color:#0f172a">${escapeHtml(user.name)}</div>
      <div style="font-size:14px;color:#475569;margin-top:4px">${escapeHtml(user.email)}</div>
    </td></tr>
  </table>`;
}

export async function sendDecisionNotifications(user, decision) {
  const approved = decision === "approved";
  const actionThai = approved ? "อนุมัติ" : "ปฏิเสธ";
  const accent = approved ? "#16a34a" : "#dc2626";
  const sender = requiredEnv("GMAIL_USER");
  const transporter = createTransporter();
  const approverEmails = await getApproverEmails();
  const decidedAt = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Bangkok"
  }).format(new Date());

  const adminHtml = emailLayout({
    eyebrow: "ERP PetCare Security",
    title: `ดำเนินการ${actionThai}ผู้ใช้แล้ว`,
    accent,
    body: `${userCard(user)}
      <p style="margin:0;color:#475569;line-height:1.7">ระบบบันทึกผลเป็น <strong style="color:${accent}">${actionThai}</strong> เมื่อ ${escapeHtml(decidedAt)}</p>
      <p style="margin:12px 0 0;color:#475569;line-height:1.7">${approved ? "ผู้ใช้สามารถเข้าสู่ระบบด้วย Google ได้ตามปกติ" : "ผู้ใช้ถูกระงับการเข้าสู่ระบบเป็นเวลา 4 ชั่วโมง"}</p>`,
    footer: "ข้อความนี้ส่งอัตโนมัติเพื่อแจ้งผลการตรวจสอบสิทธิ์ผู้เข้าใช้ระบบ"
  });

  const userHtml = emailLayout({
    eyebrow: "ERP PetCare Access",
    title: approved ? "คำขอเข้าใช้ระบบได้รับการอนุมัติ" : "คำขอเข้าใช้ระบบถูกปฏิเสธ",
    accent,
    body: `<p style="margin:12px 0;color:#475569;line-height:1.8">สวัสดี ${escapeHtml(user.name)}</p>
      <p style="margin:0;color:#475569;line-height:1.8">${approved
        ? "คุณสามารถกลับไปเข้าสู่ระบบ ERP PetCare ด้วยบัญชี Google ได้ทันที และการเข้าสู่ระบบครั้งต่อไปไม่ต้องขออนุมัติซ้ำ"
        : "บัญชีของคุณถูกระงับการเข้าสู่ระบบเป็นเวลา 4 ชั่วโมง หลังครบกำหนด คุณสามารถเข้าสู่ระบบด้วย Google เพื่อส่งคำขอใหม่ได้"}</p>`,
    footer: "หากคุณไม่ได้เป็นผู้ส่งคำขอนี้ กรุณาติดต่อผู้ดูแลระบบ"
  });

  await Promise.all([
    transporter.sendMail({
      from: `ERP PetCare Security <${sender}>`,
      to: approverEmails,
      subject: `[ERP PetCare] ${actionThai}ผู้ใช้ ${user.email} แล้ว`,
      text: `ดำเนินการ${actionThai}ผู้ใช้แล้ว\n\nชื่อ: ${user.name}\nอีเมล: ${user.email}\nเวลา: ${decidedAt}`,
      html: adminHtml
    }),
    transporter.sendMail({
      from: `ERP PetCare Security <${sender}>`,
      to: user.email,
      subject: approved
        ? "[ERP PetCare] คำขอเข้าใช้ระบบได้รับการอนุมัติ"
        : "[ERP PetCare] คำขอเข้าใช้ระบบถูกปฏิเสธ",
      text: approved
        ? `สวัสดี ${user.name}\n\nคำขอได้รับการอนุมัติ คุณสามารถเข้าสู่ระบบด้วย Google ได้ทันที`
        : `สวัสดี ${user.name}\n\nคำขอถูกปฏิเสธ บัญชีถูกระงับ 4 ชั่วโมง หลังจากนั้นจึงส่งคำขอใหม่ได้`,
      html: userHtml
    })
  ]);
}

export async function sendFirstLoginApproval(user) {
  const now = Date.now();
  const token = crypto.randomBytes(32).toString("hex");
  user.approvalTokenHash = hashApprovalToken(token);
  user.approvalTokenExpiresAt = new Date(now + TOKEN_TTL_MS);
  user.approvalEmailSentAt = new Date(now);
  await user.save();

  // Approval links are opened from Gmail, often on another device. Production
  // must therefore use a public HTTPS origin, never a localhost address.
  const backendUrl = (
    process.env.APPROVAL_BASE_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:5000"
  ).replace(/\/$/, "");
  const approvalUrl = `${backendUrl}/api/auth/approve-first-login?token=${encodeURIComponent(token)}`;
  const rejectionUrl = `${backendUrl}/api/auth/reject-first-login?token=${encodeURIComponent(token)}`;
  const approverEmails = await getApproverEmails();

  try {
    await createTransporter().sendMail({
      from: `ERP PetCare Security <${requiredEnv("GMAIL_USER")}>`,
      to: approverEmails,
      subject: `ยืนยันผู้เข้าใช้ ERP PetCare ครั้งแรก: ${user.email}`,
      text: [
        "มีคำขอเข้าใช้ ERP PetCare ผ่าน Google เป็นครั้งแรก",
        `ชื่อ: ${user.name}`,
        `อีเมล: ${user.email}`,
        "หากเป็นผู้ใช้ที่ได้รับอนุญาต ให้เปิดลิงก์นี้ภายใน 24 ชั่วโมง:",
        approvalUrl,
        "หากต้องการปฏิเสธคำขอ ให้เปิดลิงก์นี้:",
        rejectionUrl
      ].join("\n\n"),
      html: emailLayout({
        eyebrow: "First Login Request",
        title: "คำขอเข้าใช้ ERP PetCare ครั้งแรก",
        accent: "#16a34a",
        body: `${userCard(user)}
          <p style="margin:0;color:#475569;line-height:1.7">กรุณาตรวจสอบข้อมูล แล้วเลือกดำเนินการภายใน 24 ชั่วโมง</p>
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px"><tr>
            <td style="padding-right:10px"><a href="${approvalUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:14px 22px;border-radius:10px;text-decoration:none;font-weight:700">ยืนยัน</a></td>
            <td><a href="${rejectionUrl}" style="display:inline-block;background:#ffffff;color:#dc2626;border:1px solid #dc2626;padding:13px 22px;border-radius:10px;text-decoration:none;font-weight:700">ปฏิเสธ</a></td>
          </tr></table>`,
        footer: "ลิงก์ใช้ได้ครั้งเดียวและหมดอายุใน 24 ชั่วโมง การปฏิเสธจะระงับบัญชี 4 ชั่วโมง"
      })
    });
    return true;
  } catch (error) {
    user.approvalTokenHash = undefined;
    user.approvalTokenExpiresAt = undefined;
    user.approvalEmailSentAt = undefined;
    await user.save();
    throw error;
  }
}
