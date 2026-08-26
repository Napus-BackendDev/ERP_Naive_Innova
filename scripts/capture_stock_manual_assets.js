const puppeteer = require("../backend/node_modules/puppeteer-core");
const path = require("path");
const fs = require("fs");

const outDir = path.resolve("output/pdf/stock_manual_assets");
fs.mkdirSync(outDir, { recursive: true });

const ingredients = [
  { _id: "ing-01", name: "Water (น้ำบริสุทธิ์ RO/DI)", openingStock: 65000, supplier: "ผู้ขายตัวอย่าง A", pricePerKg: 18 },
  { _id: "ing-02", name: "Glycerin", openingStock: 8500, supplier: "ผู้ขายตัวอย่าง B", pricePerKg: 95 },
  { _id: "ing-03", name: "Aloe Vera Extract", openingStock: 4200, supplier: "ผู้ขายตัวอย่าง C", pricePerKg: 420 },
  { _id: "ing-04", name: "Natural Preservative", openingStock: 80, supplier: "ผู้ขายตัวอย่าง A", pricePerKg: 850 },
  { _id: "ing-05", name: "Chamomile Extract", openingStock: 0, supplier: "ผู้ขายตัวอย่าง C", pricePerKg: 620 },
];

const packagings = [
  { _id: "pkg-01", name: "ขวด PET ใส 100 ml", customer: "ระบบ", currentQuantity: 1200, note: "ขวดตัวอย่างกลาง", type: { _id: "type-01", name: "บรรจุภัณฑ์" } },
  { _id: "pkg-02", name: "หัวปั๊มสีขาว", customer: "ระบบ", currentQuantity: 980, note: "ใช้คู่กับขวด 100 ml", type: { _id: "type-02", name: "หัวปั๊ม" } },
  { _id: "pkg-03", name: "สติกเกอร์ DEMO PET LAB", customer: "บริษัทตัวอย่าง เพ็ทแคร์ จำกัด", currentQuantity: 320, note: "ฉลากลูกค้าเฉพาะราย", type: { _id: "type-03", name: "ฉลาก" } },
  { _id: "pkg-04", name: "กล่องไปรษณีย์ เบอร์ 0", customer: "ระบบ", currentQuantity: 45, note: "เตรียมสั่งเพิ่ม", type: { _id: "type-04", name: "กล่องไปรษณีย์" } },
];

const samples = [
  { _id: "sample-01", name: "Soothing Skin Gel ตัวอย่าง", formulaName: "Soothing Skin Gel สูตรโรงงาน", sku: "SMP-GEL-100", brand: "NAIVE DEMO", category: "สินค้าตัวอย่าง", size: "100 ml", currentQuantity: 48, note: "สำหรับส่งให้ลูกค้าทดลอง" },
  { _id: "sample-02", name: "Gentle Coat Spray ตัวอย่าง", formulaName: "Gentle Coat Spray สูตรโรงงาน", sku: "SMP-SPRAY-50", brand: "DEMO PET LAB", category: "สินค้าตัวอย่าง", size: "50 ml", currentQuantity: 12, note: "ใกล้ถึงจุดสั่งผลิตเพิ่ม" },
];

const fgLots = [
  { _id: "fg-01", lotNo: "DEMO-260730-01", formulaName: "Soothing Skin Gel สูตรโรงงาน", quantity: 120, unit: "ชิ้น", customer: "บริษัทตัวอย่าง เพ็ทแคร์ จำกัด", mfgDate: "2026-07-30", expDate: "2028-07-30" },
  { _id: "fg-02", lotNo: "DEMO-260728-02", formulaName: "Mild Pet Shampoo สูตรโรงงาน", quantity: 240, unit: "ชิ้น", customer: "ร้านเพ็ทช็อปตัวอย่าง", mfgDate: "2026-07-28", expDate: "2028-07-28" },
];

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "Access-Control-Allow-Credentials": "true",
};

async function decorate(page) {
  await page.evaluate(() => {
    let badge = document.getElementById("manual-mock-data-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "manual-mock-data-badge";
      badge.textContent = "ข้อมูลจำลองสำหรับคู่มือ";
      Object.assign(badge.style, {
        position: "fixed", right: "22px", bottom: "18px", zIndex: "2147483647",
        padding: "8px 14px", borderRadius: "6px", background: "#f59e0b",
        color: "#111827", fontFamily: "sans-serif", fontSize: "14px",
        fontWeight: "700", boxShadow: "0 4px 14px rgba(0,0,0,.25)",
        pointerEvents: "none",
      });
      document.body.appendChild(badge);
    }
  });
}

async function snap(page, name) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  await decorate(page);
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
  console.log(name);
}

async function clickText(page, text) {
  const clicked = await page.evaluate((label) => {
    const items = [...document.querySelectorAll("button")];
    const item = items.find((el) => (el.textContent || "").trim() === label)
      || items.find((el) => (el.textContent || "").trim().includes(label));
    if (!item) return false;
    item.click();
    return true;
  }, text);
  if (clicked) await new Promise((resolve) => setTimeout(resolve, 450));
  return clicked;
}

async function closeOverlay(page) {
  const closed = await clickText(page, "ยกเลิก");
  if (!closed) {
    await page.evaluate(() => {
      const overlays = [...document.querySelectorAll(".fixed")];
      const modal = overlays.find((el) => el.querySelector("form"));
      const close = modal?.querySelector("button");
      close?.click();
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle2" });
  const auth = await page.evaluate(async () => {
    const response = await fetch("http://localhost:5000/api/auth/mock-login", { method: "POST" });
    if (!response.ok) throw new Error(`Mock login failed: ${response.status}`);
    return response.json();
  });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("theme", "dark");
  }, auth);

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (request.method() !== "GET") return request.continue();
    const url = request.url();
    let body = null;
    if (/\/api\/bom\/ingredients(?:\?|$)/.test(url)) body = ingredients;
    else if (/\/api\/packaging(?:\?|$)/.test(url)) body = packagings;
    else if (/\/api\/products\?sample=true/.test(url)) body = samples;
    else if (/\/api\/fg\/lots(?:\?|$)/.test(url)) body = fgLots;
    else if (/\/api\/packaging-types(?:\?|$)/.test(url)) body = packagings.map((x) => x.type);
    else if (/\/api\/sales(?:\?|$)/.test(url)) body = [{ _id: "sale-01", name: "บริษัทตัวอย่าง เพ็ทแคร์ จำกัด" }];
    else if (/\/api\/bom\/formulas(?:\?|$)/.test(url)) body = [
      { _id: "formula-01", name: "Soothing Skin Gel สูตรโรงงาน" },
      { _id: "formula-02", name: "Mild Pet Shampoo สูตรโรงงาน" },
    ];
    else if (/\/api\/logs(?:\?|$)/.test(url)) body = [
      { _id: "log-01", category: "stock", description: 'ปรับปรุงสต็อกวัตถุดิบสารเคมี "Water (น้ำบริสุทธิ์ RO/DI)": เพิ่ม 5000 ก. - รับเข้าตามใบส่งของ DEMO-001', createdAt: "2026-07-30T03:30:00.000Z" },
    ];
    if (body !== null) {
      request.respond({ status: 200, headers: jsonHeaders, body: JSON.stringify(body) });
    } else request.continue();
  });

  await page.goto("http://localhost:3000/admin/stock", { waitUntil: "networkidle2" });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await snap(page, "01-stock-ingredients-dark.png");

  await clickText(page, "เพิ่มสารเคมี");
  await snap(page, "02-stock-add-ingredient-dark.png");
  await closeOverlay(page);

  await clickText(page, "ขวดและบรรจุภัณฑ์");
  await snap(page, "03-stock-packaging-dark.png");
  await clickText(page, "จัดการเอกสาร");
  await snap(page, "04-stock-documents-dark.png");
  await clickText(page, "จัดการเอกสาร");
  await clickText(page, "เพิ่มบรรจุภัณฑ์");
  await snap(page, "05-stock-add-packaging-dark.png");
  await closeOverlay(page);

  await clickText(page, "สินค้าตัวอย่าง (Sample)");
  await snap(page, "06-stock-samples-dark.png");
  await clickText(page, "เพิ่มสินค้าตัวอย่าง");
  await snap(page, "07-stock-add-sample-dark.png");
  await closeOverlay(page);

  await clickText(page, "สินค้าสำเร็จรูป (FG)");
  await snap(page, "08-stock-fg-dark.png");
  await clickText(page, "เพิ่มล็อตสินค้า");
  await snap(page, "09-stock-add-fg-lot-dark.png");
  await closeOverlay(page);

  await clickText(page, "สาร / วัตถุดิบ");
  const plusClicked = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll("tbody button")];
    const button = buttons.find((item) => (item.getAttribute("title") || "").includes("เพิ่ม"))
      || buttons[0];
    if (!button) return false;
    button.click();
    return true;
  });
  if (plusClicked) await snap(page, "10-stock-adjust-dark.png");

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
