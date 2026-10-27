import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const evidenceRoot = path.join(repoRoot, "docs", "02-testing", "evidence");
const manifestPath = path.join(evidenceRoot, "screenshot-manifest.json");
const reports = {
  unit: [
    path.join(evidenceRoot, ".reports", "unit-backend.json"),
    path.join(evidenceRoot, ".reports", "frontend-unit.json")
  ],
  integration: [path.join(evidenceRoot, ".reports", "integration.json")]
};

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const escape = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

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

function cardHtml(level, item, assertion) {
  const passed = assertion.status === "passed";
  const statusText = passed ? "PASS" : String(assertion.status || "UNKNOWN").toUpperCase();
  const statusClass = passed ? "pass" : "fail";
  const duration = Number(assertion.duration || 0).toFixed(1);
  const executed = assertion.startTime
    ? new Date(assertion.startTime).toISOString().replace("T", " ").slice(0, 19) + " UTC"
    : "-";
  const environment = level === "integration"
    ? "Node.js 24.18.1 · Vitest 5.0.5 · MongoDB Memory Server"
    : "Node.js 24.18.1 · Vitest 5.0.5";
  const command = level === "integration"
    ? "vitest run tests/integration"
    : "vitest run tests/unit";
  const failure = (assertion.failureMessages || []).join("\n");
  return `
    <article class="card">
      <div class="top">
        <div>
          <div class="brand">ERP Naive Innova · Test Evidence</div>
          <div class="level">${escape(level === "integration" ? "Integration Test" : "Unit Test")}</div>
        </div>
        <div class="badge ${statusClass}">${escape(statusText)}</div>
      </div>
      <div class="id">${escape(item.id)}</div>
      <div class="title">${escape(item.title)}</div>
      <div class="chips">
        <span>${escape(item.module)}</span>
        <span>${escape(duration)} ms</span>
        <span>${escape(executed)}</span>
      </div>
      <table>
        <tr><th>Test file</th><td>${escape(assertion.file)}</td></tr>
        <tr><th>Suite</th><td>${escape(assertion.suite || "-")}</td></tr>
        <tr><th>Expected</th><td>${escape(item.expected)}</td></tr>
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
      body { margin: 0; padding: 28px; background: #eef2f0; }
      .card {
        width: 1000px; margin: 0 0 24px; padding: 28px 32px 22px;
        background: #fff; border: 1px solid #cfd8d2; border-left: 8px solid #1f6f43;
        font-family: Arial, Tahoma, sans-serif; color: #1f2937;
      }
      .top { display: flex; justify-content: space-between; align-items: flex-start; }
      .brand { font-size: 13px; font-weight: 700; letter-spacing: .04em; color: #1f6f43; text-transform: uppercase; }
      .level { margin-top: 5px; font-size: 12px; color: #667085; }
      .badge { padding: 8px 16px; border-radius: 4px; font-size: 14px; font-weight: 700; letter-spacing: .08em; }
      .badge.pass { background: #e8f5e9; color: #1b5e20; border: 1px solid #a5d6a7; }
      .badge.fail { background: #fdecea; color: #b71c1c; border: 1px solid #ef9a9a; }
      .id { margin-top: 22px; font-size: 14px; font-weight: 700; color: #43509b; letter-spacing: .04em; }
      .title { margin-top: 8px; font-size: 25px; line-height: 1.25; font-weight: 700; }
      .chips { margin-top: 14px; display: flex; flex-wrap: wrap; gap: 8px; }
      .chips span { padding: 5px 10px; border-radius: 999px; background: #f2f4f7; font-size: 11px; color: #475467; }
      table { width: 100%; margin-top: 20px; border-collapse: collapse; table-layout: fixed; }
      th, td { padding: 9px 10px; border-top: 1px solid #e4e7ec; vertical-align: top; text-align: left; font-size: 13px; }
      th { width: 140px; color: #667085; font-weight: 600; }
      td { overflow-wrap: anywhere; }
      code { font-family: Consolas, monospace; font-size: 12px; background: #f2f4f7; padding: 2px 5px; }
      .failure { margin-top: 16px; padding: 12px; background: #fff1f0; border: 1px solid #ffccc7; font-size: 11px; white-space: pre-wrap; }
      .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e4e7ec; font-size: 10px; color: #98a2b3; }
    </style>
  </head>
  <body>${cards.join("\n")}</body>
  </html>`;
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const summary = {};

for (const level of ["unit", "integration"]) {
  const assertions = loadAssertions(reports[level]);
  const items = manifest.levels[level] || [];
  const outputDir = path.join(evidenceRoot, "screenshots", level);
  fs.mkdirSync(outputDir, { recursive: true });

  const cards = [];
  const missing = [];
  for (const item of items) {
    const assertion = assertions.get(item.script);
    if (!assertion) {
      missing.push(item.id);
      continue;
    }
    cards.push({
      item,
      assertion,
      html: cardHtml(level, item, assertion)
    });
  }

  for (let start = 0; start < cards.length; start += 20) {
    const batch = cards.slice(start, start + 20);
    await page.setContent(pageHtml(batch.map((card) => card.html)), { waitUntil: "load" });
    for (let index = 0; index < batch.length; index += 1) {
      const card = batch[index];
      const target = path.join(outputDir, `${card.item.id}.png`);
      await page.locator(".card").nth(index).screenshot({ path: target, type: "png" });
    }
  }

  summary[level] = { expected: items.length, written: cards.length, missing };
  console.log(`${level}: ${cards.length}/${items.length} screenshots`);
  if (missing.length) console.log(`  missing: ${missing.join(", ")}`);
}

await browser.close();
fs.writeFileSync(
  path.join(evidenceRoot, "screenshot-capture-summary.json"),
  JSON.stringify({ generated_at: new Date().toISOString(), levels: summary }, null, 2)
);
