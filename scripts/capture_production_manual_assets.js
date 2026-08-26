const puppeteer = require("../backend/node_modules/puppeteer-core");
const path = require("path");
const fs = require("fs");

const outDir = path.resolve("output/pdf/production_manual_assets");
fs.mkdirSync(outDir, { recursive: true });

const product = (overrides = {}) => ({
  formulaName: "Soothing Skin Gel สูตรโรงงาน",
  quantityKg: 12,
  quantityPcs: 120,
  bottleSize: "100 ml",
  fillVolume: 100,
  packagingType: "ขวด PET ใส 100 ml",
  nozzleType: "หัวปั๊มสีขาว",
  labelType: "สติกเกอร์ DEMO PET LAB",
  brand: "DEMO PET LAB",
  customerFormulaType: "สูตรโรงงาน",
  stickerWidth: 5,
  stickerHeight: 8,
  stickerOrderer: "ฝ่ายจัดซื้อ (ข้อมูลจำลอง)",
  lotNumber: "DEMO-260730-01",
  mfgDate: "2026-07-30",
  expDate: "2028-07-30",
  notes: "ข้อมูลจำลองสำหรับคู่มือ Production",
  ...overrides,
});

const order = (suffix, name, status, step, overrides = {}) => ({
  _id: `000000000000000000001${suffix}`,
  name,
  brand: "DEMO PET LAB",
  phone: "080-000-0000",
  address: "99 ถนนตัวอย่าง เขตตัวอย่าง กรุงเทพมหานคร 10000",
  orderType: "lot",
  productionStatus: status,
  productionStep: step,
  orderedProducts: [product({
    productionStatus: status,
    productionStep: step,
    ...overrides.product,
  })],
  createdAt: "2026-07-28T03:30:00.000Z",
  updatedAt: "2026-07-30T03:30:00.000Z",
  ...overrides,
});

const orders = [
  order("101", "บริษัทตัวอย่าง เพ็ทแคร์ จำกัด", "รอยืนยัน", 2),
  order("201", "คลินิกสัตว์ตัวอย่าง", "เลือกเครื่องจักร", 3, {
    product: { formulaName: "Gentle Coat Spray สูตรโรงงาน", quantityKg: 18, quantityPcs: 180 },
  }),
  order("202", "ร้านเพ็ทช็อปตัวอย่าง", "กำลังผลิต", 3, {
    scheduleMachineId: "machine-02",
    scheduleStartDate: "2026-07-31",
    scheduleEndDate: "2026-07-31",
    scheduleStartTime: "08:30",
    scheduleEndTime: "15:30",
    product: { formulaName: "Mild Pet Shampoo สูตรโรงงาน", quantityKg: 24, quantityPcs: 240 },
  }),
  order("301", "ลูกค้าจำลอง งานบรรจุ", "รอบรรจุ", 4, {
    packagingSubStep: "filling",
    product: { formulaName: "Natural Oil Shampoo สูตรโรงงาน" },
  }),
  order("302", "ลูกค้าจำลอง งานฉลาก", "รอบรรจุ", 4, {
    packagingSubStep: "labeling",
    product: { formulaName: "Daily Pet Powder สูตรโรงงาน", quantityKg: 15, quantityPcs: 150 },
  }),
  order("303", "ลูกค้าจำลอง งานยิง LOT", "รอบรรจุ", 4, {
    packagingSubStep: "lot",
    product: { formulaName: "Herbal Skin Spray สูตรโรงงาน", quantityKg: 8, quantityPcs: 80 },
  }),
  order("304", "ลูกค้าจำลอง งานซีลขวด", "รอบรรจุ", 4, {
    packagingSubStep: "sealing",
    product: { formulaName: "Gentle Eye Cleaner สูตรโรงงาน", quantityKg: 10, quantityPcs: 100 },
  }),
  order("401", "บริษัทตัวอย่าง รอ Final QC", "รอตรวจ QC รอบที่ 2", 5),
  order("402", "บริษัทตัวอย่าง งานสำเร็จ", "สำเร็จเสร็จสิ้น", 6, {
    product: { formulaName: "Soft Coat Conditioner สูตรโรงงาน", quantityKg: 20, quantityPcs: 200 },
  }),
];

const ingredients = [
  { _id: "ing-01", name: "Water (น้ำบริสุทธิ์ RO/DI)", openingStock: 65000, supplier: "ผู้ขายตัวอย่าง A", pricePerKg: 18 },
  { _id: "ing-02", name: "Glycerin", openingStock: 8500, supplier: "ผู้ขายตัวอย่าง B", pricePerKg: 95 },
  { _id: "ing-03", name: "Aloe Vera Extract", openingStock: 4200, supplier: "ผู้ขายตัวอย่าง C", pricePerKg: 420 },
];

const formulas = [{
  _id: "formula-01",
  name: "Soothing Skin Gel สูตรโรงงาน",
  productionMethod: ["ผสม Water และ Glycerin ให้เข้ากัน", "เติม Aloe Vera Extract แล้วกวนจนเนื้อสม่ำเสมอ"],
  note: "ควบคุมอุณหภูมิไม่เกิน 45 องศาเซลเซียส",
  ingredients: [
    { ingredient: ingredients[0], ratio: 0.95, group: "A", order: 1 },
    { ingredient: ingredients[1], ratio: 0.03, group: "A", order: 2 },
    { ingredient: ingredients[2], ratio: 0.02, group: "B", order: 3 },
  ],
}];

const packagings = [
  { _id: "pkg-01", name: "ขวด PET ใส 100 ml", customer: "ระบบ", currentQuantity: 1200, type: { name: "บรรจุภัณฑ์" } },
  { _id: "pkg-02", name: "หัวปั๊มสีขาว", customer: "ระบบ", currentQuantity: 1200, type: { name: "หัวปั๊ม" } },
  { _id: "pkg-03", name: "สติกเกอร์ DEMO PET LAB", customer: "บริษัทตัวอย่าง เพ็ทแคร์ จำกัด", currentQuantity: 500, type: { name: "ฉลาก" } },
];

const machines = [
  { _id: "machine-01", id: "machine-01", name: "เครื่องผสมสุญญากาศ 100 ลิตร", status: "active", capacity: 100, supportedFormulas: [] },
  { _id: "machine-02", id: "machine-02", name: "เครื่องผสมสเตนเลส 50 ลิตร", status: "active", capacity: 50, supportedFormulas: [] },
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
  await new Promise((resolve) => setTimeout(resolve, 600));
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
  if (clicked) await new Promise((resolve) => setTimeout(resolve, 500));
  return clicked;
}

async function clickContent(page, text) {
  const clicked = await page.evaluate((label) => {
    const items = [...document.querySelectorAll("div, span, p")];
    const item = items.find((el) => (el.textContent || "").trim() === label);
    if (!item) return false;
    item.click();
    return true;
  }, text);
  if (clicked) await new Promise((resolve) => setTimeout(resolve, 500));
  return clicked;
}

async function scrollTop(page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const el of document.querySelectorAll("*")) {
      if (el.scrollHeight > el.clientHeight) el.scrollTop = 0;
    }
  });
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
    if (/\/api\/production\/orders(?:\?|$)/.test(url)) body = orders;
    else if (/\/api\/bom\/formulas(?:\?|$)/.test(url)) body = formulas;
    else if (/\/api\/bom\/ingredients(?:\?|$)/.test(url)) body = ingredients;
    else if (/\/api\/fg\/skus(?:\?|$)/.test(url)) body = [];
    else if (/\/api\/machines(?:\?|$)/.test(url)) body = machines;
    else if (/\/api\/packaging(?:\?|$)/.test(url)) body = packagings;
    else if (/\/api\/nozzles(?:\?|$)/.test(url)) body = [];
    if (body !== null) {
      request.respond({ status: 200, headers: jsonHeaders, body: JSON.stringify(body) });
    } else request.continue();
  });

  await page.goto("http://localhost:3000/admin/production", { waitUntil: "networkidle2" });
  await new Promise((resolve) => setTimeout(resolve, 1400));
  await snap(page, "01-production-received-dark.png");

  await clickContent(page, "บริษัทตัวอย่าง เพ็ทแคร์ จำกัด");
  await snap(page, "02-production-preparation-dark.png");

  await clickText(page, "สายการผลิต");
  await scrollTop(page);
  await snap(page, "03-production-line-dark.png");

  await clickText(page, "จัดคิว");
  await snap(page, "04-production-schedule-dark.png");
  await clickText(page, "ยกเลิก");

  await clickText(page, "บรรจุ / ติดสติ๊กเกอร์ / ยิง LOT / ซีลขวด");
  await scrollTop(page);
  await snap(page, "05-production-packaging-dark.png");

  await clickText(page, "ผลิตสินค้าสำเร็จ / Final QC / รอส่งลูกค้า");
  await scrollTop(page);
  await snap(page, "06-production-final-qc-dark.png");

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
