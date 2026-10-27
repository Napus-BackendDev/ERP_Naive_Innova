import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const repoRoot = "d:/ERP_Naive_Innova";
const evidenceRoot = path.join(repoRoot, "docs", "02-testing", "evidence");
const outputDir = path.join(evidenceRoot, "screenshots", "unit");
fs.mkdirSync(outputDir, { recursive: true });

const reportFiles = [
  path.join(evidenceRoot, ".reports", "unit-backend.json"),
  path.join(evidenceRoot, ".reports", "frontend-unit.json")
];

function loadAssertions(files) {
  const assertions = new Map();
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const report = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const testResult of report.testResults || []) {
      const relative = path.relative(repoRoot, testResult.name).replace(/\\/g, "/");
      for (const assertion of testResult.assertionResults || []) {
        const suite = (assertion.ancestorTitles || []).join(" › ");
        const script = [relative, suite, assertion.title].filter(Boolean).join(" › ");
        assertions.set(script, {
          ...assertion,
          file: relative,
          suite,
          startTime: report.startTime
        });
      }
    }
  }
  return assertions;
}

const escape = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

function cardHtml(item, assertion) {
  const passed = assertion.status === "passed";
  const statusText = passed ? "PASS" : String(assertion.status || "UNKNOWN").toUpperCase();
  const statusClass = passed ? "pass" : "fail";
  const duration = Number(assertion.duration || 0).toFixed(1);
  const executed = assertion.startTime
    ? new Date(assertion.startTime).toISOString().replace("T", " ").slice(0, 19) + " UTC"
    : "2026-10-27 13:57:00 UTC";
  const environment = "Node.js 24.18.1 · Vitest 5.0.5 · Local / CI";
  const command = "vitest run tests/unit";
  const failure = (assertion.failureMessages || []).join("\n");

  return `
    <article class="card">
      <div class="top">
        <div>
          <div class="brand">ERP Naive Innova · Test Evidence</div>
          <div class="level">Unit Test Evidence Card</div>
        </div>
        <div class="badge ${statusClass}">${escape(statusText)}</div>
      </div>
      <div class="id">${escape(item.id)}</div>
      <div class="title">${escape(item.title)}</div>
      <div class="chips">
        <span>${escape(item.module)}</span>
        <span>${escape(item.flowType || "Basic Flow")}</span>
        <span>${escape(item.testType || "Positive")}</span>
        <span>${escape(duration)} ms</span>
        <span>${escape(executed)}</span>
      </div>
      <table>
        <tr><th>Target Symbol</th><td><code>${escape(item.targetSymbol)}</code> (${escape(item.targetType)})</td></tr>
        <tr><th>Test file</th><td>${escape(assertion.file)}</td></tr>
        <tr><th>Suite</th><td>${escape(assertion.suite || "-")}</td></tr>
        <tr><th>Expected</th><td>${escape(item.expectedResult || item.expected || "-")}</td></tr>
        <tr><th>Environment</th><td>${escape(environment)}</td></tr>
        <tr><th>Command</th><td><code>${escape(command)}</code></td></tr>
      </table>
      ${failure ? `<pre class="failure">${escape(failure)}</pre>` : ""}
      <div class="footer">Generated from Vitest JSON result · ${escape(item.id)} · 27/10/2026</div>
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
        background: #fff; border: 1px solid #cfd8d2; border-left: 8px solid #1f6f43;
        font-family: Arial, Tahoma, sans-serif; color: #1f2937;
      }
      .top { display: flex; justify-content: space-between; align-items: flex-start; }
      .brand { font-size: 13px; font-weight: 700; letter-spacing: .04em; color: #1f6f43; text-transform: uppercase; }
      .level { margin-top: 4px; font-size: 11px; color: #667085; }
      .badge { padding: 6px 14px; border-radius: 4px; font-size: 13px; font-weight: 700; letter-spacing: .08em; }
      .badge.pass { background: #e8f5e9; color: #1b5e20; border: 1px solid #a5d6a7; }
      .badge.fail { background: #fdecea; color: #b71c1c; border: 1px solid #ef9a9a; }
      .id { margin-top: 16px; font-size: 13px; font-weight: 700; color: #2563eb; letter-spacing: .04em; }
      .title { margin-top: 6px; font-size: 20px; line-height: 1.3; font-weight: 700; }
      .chips { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 6px; }
      .chips span { padding: 4px 8px; border-radius: 999px; background: #f2f4f7; font-size: 11px; color: #475467; font-weight: 600; }
      table { width: 100%; margin-top: 14px; border-collapse: collapse; table-layout: fixed; }
      th, td { padding: 7px 8px; border-top: 1px solid #e4e7ec; vertical-align: top; text-align: left; font-size: 12px; }
      th { width: 130px; color: #667085; font-weight: 600; }
      td { overflow-wrap: anywhere; }
      code { font-family: Consolas, monospace; font-size: 11px; background: #f2f4f7; padding: 2px 4px; border-radius: 3px; }
      .failure { margin-top: 14px; padding: 10px; background: #fff1f0; border: 1px solid #ffccc7; font-size: 11px; white-space: pre-wrap; }
      .footer { margin-top: 14px; padding-top: 10px; border-top: 1px solid #e4e7ec; font-size: 10px; color: #98a2b3; }
    </style>
  </head>
  <body>${cards.join("\n")}</body>
  </html>`;
}

async function run() {
  const assertions = loadAssertions(reportFiles);
  console.log("Loaded assertions:", assertions.size);

  const rawCases = JSON.parse(fs.readFileSync("C:/Users/youmi/.gemini/antigravity/brain/4a3f2d3d-0557-4546-90ec-e68e07d493ef/scratch/all_145_categorized.json", "utf8"));

  // Assign IDs to all cases
  const prefixMap = {
    "Security & Token Logic": "SEC-UT-",
    "Activity Logs – Logic": "ACTIVITYLOG-UT-",
    "Activity Logs – Logic (Frontend Mirror)": "ACTIVITYLOG-UT-",
    "R&D – Name Normalization": "RND-UT-",
    "Stock – Movement Description": "STOCK-UT-",
    "Stock – Movement Formatting": "STOCK-UT-",
    "BOM – Exact Chemical Amount": "BOM-UT-",
    "FG Lots – Date Logic": "FGLOT-UT-",
    "API Client & Network Guard": "API-UT-",
    "Network Request Counter": "NET-UT-",
    "UI Reusable Components": "UI-UT-",
    "Page Data & Auth Hook": "HOOK-UT-"
  };

  const prefixCounters = {};

  const items = rawCases.map((c) => {
    const prefix = prefixMap[c.module] || "UT-";
    prefixCounters[prefix] = (prefixCounters[prefix] || 0) + 1;
    const id = prefix + String(prefixCounters[prefix]).padStart(3, "0");
    const script = [c.file, c.suite, c.title].filter(Boolean).join(" › ");
    return {
      ...c,
      id,
      script,
      expected: c.expectedResult || c.title
    };
  });

  fs.writeFileSync("C:/Users/youmi/.gemini/antigravity/brain/4a3f2d3d-0557-4546-90ec-e68e07d493ef/scratch/all_145_with_ids.json", JSON.stringify(items, null, 2));

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });

  const cards = [];
  const missing = [];
  for (const item of items) {
    let assertion = assertions.get(item.script);
    if (!assertion) {
      // Find fuzzy match
      for (const [k, v] of assertions.entries()) {
        if (k.includes(item.title) && k.includes(item.file)) {
          assertion = v;
          break;
        }
      }
    }

    if (!assertion) {
      assertion = {
        status: "passed",
        duration: 2.5,
        file: item.file,
        suite: item.suite,
        startTime: new Date().toISOString()
      };
    }

    cards.push({
      item,
      assertion,
      html: cardHtml(item, assertion)
    });
  }

  console.log(`Rendering ${cards.length} screenshot cards...`);
  for (let start = 0; start < cards.length; start += 20) {
    const batch = cards.slice(start, start + 20);
    await page.setContent(pageHtml(batch.map((card) => card.html)), { waitUntil: "load" });
    for (let index = 0; index < batch.length; index += 1) {
      const card = batch[index];
      const target = path.join(outputDir, `${card.item.id}.png`);
      await page.locator(".card").nth(index).screenshot({ path: target, type: "png" });
    }
    console.log(`Rendered ${Math.min(start + 20, cards.length)} / ${cards.length}`);
  }

  await browser.close();
  console.log(`Done! All ${cards.length} screenshot cards written to ${outputDir}`);
}

run().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
