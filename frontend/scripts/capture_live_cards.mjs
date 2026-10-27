import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const repoRoot = "d:/ERP_Naive_Innova";
const outputDir = path.join(repoRoot, "docs/02-testing/evidence/screenshots/integration");
fs.mkdirSync(outputDir, { recursive: true });

const liveCases = [
  {
    id: "LIVE-IT-001",
    module: "External Services (Live)",
    title: "Live external services — Google OAuth › redirects to the real Google consent screen with the configured client",
    expected: "ตอบ 302 ไป accounts.google.com พร้อม client_id/scope/redirect_uri จาก environment จริง",
    file: "backend/tests/live/external-services.test.js",
    suite: "Live external services — Google OAuth",
    reason: "รอตั้งค่า GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET จริง"
  },
  {
    id: "LIVE-IT-002",
    module: "External Services (Live)",
    title: "Live external services — Google OAuth › fails closed and redirects to the login error page without a code",
    expected: "ตอบ 302 ไป /login?error=OAuthFailed",
    file: "backend/tests/live/external-services.test.js",
    suite: "Live external services — Google OAuth",
    reason: "รอตั้งค่า GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET จริง"
  },
  {
    id: "LIVE-IT-003",
    module: "External Services (Live)",
    title: "Live external services — Gmail › authenticates the configured Gmail account",
    expected: "transporter.verify() resolve true ด้วย Gmail App Password จริง",
    file: "backend/tests/live/external-services.test.js",
    suite: "Live external services — Gmail",
    reason: "รอตั้งค่า GMAIL_USER / GMAIL_APP_PASSWORD จริง"
  },
  {
    id: "LIVE-IT-004",
    module: "External Services (Live)",
    title: "Live external services — Gmail › only targets plus-addresses derived from GMAIL_USER for live mail",
    expected: "getApproverEmails() คืนเฉพาะ plus-address ของ GMAIL_USER ที่มีอยู่ในระบบ",
    file: "backend/tests/live/external-services.test.js",
    suite: "Live external services — Gmail",
    reason: "รอตั้งค่า GMAIL_USER จริง"
  },
  {
    id: "LIVE-IT-005",
    module: "External Services (Live)",
    title: "Live external services — Gmail › sends the real first-login approval mail and stores a fresh token",
    expected: "ส่งอีเมลจริงสำเร็จ, token hash เป็น hex 64 ตัว, expiry อยู่ในอนาคต และบันทึก approvalEmailSentAt",
    file: "backend/tests/live/external-services.test.js",
    suite: "Live external services — Gmail",
    reason: "รอตั้งค่า GMAIL_USER / GMAIL_APP_PASSWORD / APPROVAL_BASE_URL จริง"
  },
  {
    id: "LIVE-IT-006",
    module: "External Services (Live)",
    title: "Live external services — Gmail › sends the real approval-decision notifications",
    expected: "sendDecisionNotifications() ส่งอีเมลจริงและ resolve โดยไม่ throw",
    file: "backend/tests/live/external-services.test.js",
    suite: "Live external services — Gmail",
    reason: "รอตั้งค่า GMAIL_USER / GMAIL_APP_PASSWORD จริง"
  }
];

function cardHtml(item) {
  return `
    <article class="card">
      <div class="top">
        <div>
          <div class="brand">ERP Naive Innova · Test Evidence</div>
          <div class="level">Integration Test Evidence Card (Live External Service)</div>
        </div>
        <div class="badge blocked">BLOCKED</div>
      </div>
      <div class="id">${item.id}</div>
      <div class="title">${item.title}</div>
      <div class="chips">
        <span>${item.module}</span>
        <span>Service-to-Service</span>
        <span>Gated Suite</span>
        <span>27/10/2026</span>
      </div>
      <table>
        <tr><th>Test file</th><td>${item.file}</td></tr>
        <tr><th>Suite</th><td>${item.suite}</td></tr>
        <tr><th>Expected</th><td>${item.expected}</td></tr>
        <tr><th>Blocking reason</th><td><strong style="color: #b45309">${item.reason}</strong></td></tr>
        <tr><th>Command</th><td><code>RUN_LIVE_INTEGRATION=true vitest run tests/live</code></td></tr>
      </table>
      <div class="footer">Live Test Gated · ${item.id} · 27/10/2026</div>
    </article>`;
}

function pageHtml(cards) {
  return `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 24px; background: #eef2f0; }
      .card {
        width: 1000px; margin: 0 0 20px; padding: 24px 28px 18px;
        background: #fff; border: 1px solid #cfd8d2; border-left: 8px solid #f59e0b;
        font-family: Arial, Tahoma, sans-serif; color: #1f2937;
      }
      .top { display: flex; justify-content: space-between; align-items: flex-start; }
      .brand { font-size: 13px; font-weight: 700; letter-spacing: .04em; color: #1f6f43; text-transform: uppercase; }
      .level { margin-top: 4px; font-size: 11px; color: #667085; }
      .badge.blocked { padding: 6px 14px; border-radius: 4px; font-size: 13px; font-weight: 700; letter-spacing: .08em; background: #fffbeb; color: #b45309; border: 1px solid #fcd34d; }
      .id { margin-top: 16px; font-size: 13px; font-weight: 700; color: #d97706; letter-spacing: .04em; }
      .title { margin-top: 6px; font-size: 20px; line-height: 1.3; font-weight: 700; }
      .chips { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
      .chips span { padding: 4px 8px; border-radius: 999px; background: #fef3c7; font-size: 11px; color: #92400e; font-weight: 600; }
      table { width: 100%; margin-top: 14px; border-collapse: collapse; table-layout: fixed; }
      th, td { padding: 7px 8px; border-top: 1px solid #e4e7ec; vertical-align: top; text-align: left; font-size: 12px; }
      th { width: 140px; color: #667085; font-weight: 600; }
      td { overflow-wrap: anywhere; }
      code { font-family: Consolas, monospace; font-size: 11px; background: #f2f4f7; padding: 2px 4px; border-radius: 3px; }
      .footer { margin-top: 14px; padding-top: 10px; border-top: 1px solid #e4e7ec; font-size: 10px; color: #98a2b3; }
    </style>
  </head>
  <body>${cards.join("\n")}</body>
  </html>`;
}

async function run() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });

  const cardsHtml = liveCases.map(c => cardHtml(c));
  await page.setContent(pageHtml(cardsHtml), { waitUntil: "load" });

  for (let i = 0; i < liveCases.length; i++) {
    const c = liveCases[i];
    const target = path.join(outputDir, `${c.id}.png`);
    await page.locator(".card").nth(i).screenshot({ path: target, type: "png" });
    console.log(`Saved ${c.id}.png`);
  }

  await browser.close();
  console.log("All 6 live blocked screenshot cards generated!");
}

run().catch(e => {
  console.error("Error:", e);
  process.exit(1);
});

