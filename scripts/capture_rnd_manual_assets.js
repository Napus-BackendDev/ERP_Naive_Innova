const puppeteer = require("../backend/node_modules/puppeteer-core");
const path = require("path");
const fs = require("fs");

const outDir = path.resolve("output/pdf/rnd_manual_assets");
fs.mkdirSync(outDir, { recursive: true });

const mockProduct = (overrides = {}) => ({
  formulaName: "เจลบำรุงและฟื้นฟูผิว สูตรโรงงาน",
  quantityKg: 12,
  quantityPcs: 120,
  bottleSize: "100 ml",
  fillVolume: 100,
  packagingType: "ขวด PET ใส 100 ml",
  nozzleType: "หัวปั๊มสีขาว",
  labelType: "สติกเกอร์กันน้ำ",
  brand: "DEMO PET LAB",
  customerFormulaType: "สูตรโรงงาน",
  isDevelopment: false,
  productionStatus: "รับใบสั่งผลิต",
  productionStep: 1,
  notes: "ข้อมูลตัวอย่างสำหรับอธิบายขั้นตอนในคู่มือ",
  ...overrides,
});

const mockOrder = (suffix, name, product, overrides = {}) => ({
  _id: `000000000000000000000${suffix}`,
  name,
  brand: product.brand,
  phone: "080-000-0000",
  address: "99 ถนนตัวอย่าง เขตตัวอย่าง กรุงเทพมหานคร 10000",
  orderType: product.isDevelopment ? "develop" : "lot",
  productionStatus: product.productionStatus,
  productionStep: product.productionStep,
  orderedProducts: [product],
  createdAt: "2026-07-28T03:30:00.000Z",
  updatedAt: "2026-07-30T03:30:00.000Z",
  ...overrides,
});

const mockOrders = [
  mockOrder("101", "ลูกค้าจำลอง พัฒนาสูตรใหม่", mockProduct({
    formulaName: "Calm Skin Serum สูตรพัฒนาใหม่",
    quantityKg: 0,
    quantityPcs: 0,
    brand: "NEW FORMULA DEMO",
    customerFormulaType: "พัฒนาสูตร",
    isDevelopment: true,
  })),
  mockOrder("102", "ลูกค้าจำลอง ปรับสูตร", mockProduct({
    formulaName: "Oil Shampoo สูตรโรงงาน",
    quantityKg: 10,
    quantityPcs: 100,
    brand: "ADJUST DEMO",
    customerFormulaType: "ปรับสูตร",
  })),
  mockOrder("103", "บริษัทตัวอย่าง เพ็ทแคร์ จำกัด", mockProduct({
    formulaName: "สเปรย์บำรุงขนสัตว์ สูตรโรงงาน",
    quantityKg: 12,
    quantityPcs: 120,
    brand: "FACTORY FORMULA DEMO",
  })),
  mockOrder("201", "บริษัท เดโม แลบ จำกัด", mockProduct({
    formulaName: "Dry Foam สัตว์เลี้ยง สูตรโรงงาน",
    quantityKg: 15,
    quantityPcs: 150,
    brand: "DEMO CARE",
    productionStatus: "กำลังผลิต",
    productionStep: 2,
  })),
  mockOrder("202", "ร้านเพ็ทช็อปตัวอย่าง", mockProduct({
    formulaName: "Oil Shampoo สูตรโรงงาน",
    quantityKg: 24,
    quantityPcs: 240,
    brand: "MOCK PET",
    productionStatus: "กำลังผลิต",
    productionStep: 2,
  })),
  mockOrder("301", "ลูกค้าทดลอง QC A", mockProduct({
    quantityKg: 12,
    quantityPcs: 120,
    brand: "QC DEMO",
    productionStatus: "รอ QC",
    productionStep: 5,
    rndQcChecklist: { appearance: "pass", ph: "6.8" },
  })),
  mockOrder("302", "ลูกค้าทดลอง QC B", mockProduct({
    formulaName: "สเปรย์กำจัดเชื้อรา สูตรโรงงาน",
    quantityKg: 6,
    quantityPcs: 60,
    brand: "TEST LAB",
    productionStatus: "รอ QC",
    productionStep: 5,
  })),
  mockOrder("401", "ลูกค้าตัวอย่างที่ผ่าน QC", mockProduct({
    formulaName: "Blue Treatment บำรุงขนสำหรับสัตว์เลี้ยง สูตรโรงงาน",
    quantityKg: 12,
    quantityPcs: 120,
    brand: "PASS DEMO",
    productionStatus: "รอบรรจุ",
    productionStep: 4,
    rndQcAt: "2026-07-30T02:15:00.000Z",
  })),
  mockOrder("402", "บริษัทตัวอย่าง งานสำเร็จ", mockProduct({
    formulaName: "bio shampoo สำหรับสัตว์เลี้ยง สูตรโรงงาน",
    quantityKg: 15,
    quantityPcs: 150,
    brand: "COMPLETE DEMO",
    productionStatus: "รอบรรจุ",
    productionStep: 4,
    rndQcAt: "2026-07-29T08:40:00.000Z",
  })),
];

async function applyMockData(page) {
  await page.evaluate(() => {
    const replacements = [
      ["คุณโม บริษัทรวยมาก เทรดดิ้ง จำกัด", "บริษัทตัวอย่าง เพ็ทแคร์ จำกัด"],
      ["คุณใยแพร", "คุณอรุณ (ลูกค้าจำลอง)"],
      ["คุณมิรา", "บริษัท เดโม แลบ จำกัด"],
      ["อัครชา เชือนเชื้อ ( คุณเค้ก )", "คลินิกสัตว์ตัวอย่าง"],
      ["คุณฝ้าย รักษ์ษิณา มวยดี", "ร้านเพ็ทช็อปตัวอย่าง"],
      ["นรมน โลไทยสงค์", "ลูกค้าทดลอง B"],
      ["คุณชิชากร พิชญตรัยธร", "บริษัทตัวอย่าง C"],
      ["อริสรา หิรัญตียะกุล", "ลูกค้าทดลอง C"],
      ["ว่าที่ร้อยตรีพินิจ นารีจันทร์", "บริษัทตัวอย่าง D"],
      ["สเปรย์บำรุงขนสัตว์ สูตรโรงงาน", "Gentle Coat Spray สูตรตัวอย่าง"],
      ["Blue Treatment บำรุงขนสำหรับสัตว์เลี้ยง สูตรโรงงาน", "Soft Coat Conditioner สูตรตัวอย่าง"],
      ["bio shampoo สำหรับสัตว์เลี้ยง สูตรโรงงาน", "Mild Pet Shampoo สูตรตัวอย่าง"],
      ["Dry Foam สัตว์เลี้ยง สูตรโรงงาน", "Dry Foam Cleanser สูตรตัวอย่าง"],
      ["Oil Shampoo สูตรโรงงาน ปรับปรุง ของ พี่นาวิน", "Natural Oil Shampoo สูตรปรับปรุงตัวอย่าง"],
      ["Oil Shampoo สูตรโรงงาน", "Natural Oil Shampoo สูตรตัวอย่าง"],
      ["สเปรย์กำจัดเชื้อรา สูตรโรงงาน", "Herbal Skin Spray สูตรตัวอย่าง"],
      ["เจลบำรุงและฟื้นฟูผิว สูตรโรงงาน", "Soothing Skin Gel สูตรตัวอย่าง"],
      ["น้ำยาเช็ดคราบน้ำตา/ใบหู สำหรับสัตว์เลี้ยง สูตรโรงงาน", "Gentle Eye & Ear Cleanser สูตรตัวอย่าง"],
      ["แป้งกันคราบน้ำตาสัตว์เลี้ยง สูตรโรงงาน", "Pet Care Powder สูตรตัวอย่าง"],
      ["แป้งทาตัวสัตว์เลี้ยง สูตรโรงงาน", "Daily Pet Powder สูตรตัวอย่าง"],
      ["ทดสอบ - ทดสอบ (ทางเลือก 1)", "Trial Formula A สูตรตัวอย่าง"],
      ["ส - ทดสอบ (ทางเลือก 1)", "Trial Formula B สูตรตัวอย่าง"],
      ["กรุงเทพเคมีภัณฑ์", "ผู้ขายตัวอย่าง A"],
      ["MyskinRecipes", "ผู้ขายตัวอย่าง B"],
      ["ปัญญาเคมี", "ผู้ขายตัวอย่าง C"],
      ["PINNO", "ผู้ขายตัวอย่าง D"],
      ["เคมีคอสเมติกส์", "ผู้ขายตัวอย่าง E"],
      ["100 ชิ้น", "120 ชิ้น"],
      ["200 ชิ้น", "150 ชิ้น"],
      ["500 ชิ้น", "240 ชิ้น"],
      ["250 ml", "200 ml"],
      ["125 ml", "120 ml"],
    ];

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      let value = node.nodeValue || "";
      for (const [source, replacement] of replacements) {
        value = value.split(source).join(replacement);
      }
      node.nodeValue = value;
      node = walker.nextNode();
    }

    let badge = document.getElementById("manual-mock-data-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "manual-mock-data-badge";
      badge.textContent = "ข้อมูลจำลองสำหรับคู่มือ";
      Object.assign(badge.style, {
        position: "fixed",
        right: "22px",
        bottom: "18px",
        zIndex: "2147483647",
        padding: "8px 14px",
        borderRadius: "6px",
        background: "#f59e0b",
        color: "#111827",
        fontFamily: "sans-serif",
        fontSize: "14px",
        fontWeight: "700",
        boxShadow: "0 4px 14px rgba(0,0,0,.25)",
        pointerEvents: "none",
      });
      document.body.appendChild(badge);
    }
  });
}

async function snap(page, name) {
  await new Promise((resolve) => setTimeout(resolve, 650));
  await applyMockData(page);
  const output = path.join(outDir, name);
  await page.screenshot({ path: output, fullPage: false });
  console.log(output);
}

async function clickButton(page, text) {
  const clicked = await page.evaluate((label) => {
    const button = [...document.querySelectorAll("button")].find((item) =>
      (item.textContent || "").trim().includes(label)
    );
    if (!button) return false;
    button.click();
    return true;
  }, text);
  if (clicked) await new Promise((resolve) => setTimeout(resolve, 450));
  return clicked;
}

async function clickExactText(page, text) {
  const clicked = await page.evaluate((label) => {
    const item = [...document.querySelectorAll("div, p, span")].find(
      (element) => (element.textContent || "").trim() === label
    );
    if (!item) return false;
    item.click();
    return true;
  }, text);
  if (clicked) await new Promise((resolve) => setTimeout(resolve, 450));
  return clicked;
}

async function scrollToTop(page) {
  await page.evaluate(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    for (const element of document.querySelectorAll("*")) {
      if (element.scrollHeight > element.clientHeight) {
        element.scrollTop = 0;
      }
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 250));
}

async function scrollContentTo(page, top) {
  await page.evaluate((offset) => {
    for (const element of document.querySelectorAll("*")) {
      if (element.scrollHeight > element.clientHeight) {
        element.scrollTop = offset;
      }
    }
  }, top);
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
  const data = await page.evaluate(async () => {
    const response = await fetch("http://localhost:5000/api/auth/mock-login", { method: "POST" });
    if (!response.ok) throw new Error(`Mock login failed: ${response.status}`);
    return response.json();
  });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("theme", "dark");
  }, data);

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const isOrdersRequest =
      request.method() === "GET" &&
      /\/api\/production\/orders(?:\?|$)/.test(request.url());
    if (isOrdersRequest) {
      request.respond({
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "http://localhost:3000",
          "Access-Control-Allow-Credentials": "true",
        },
        body: JSON.stringify(mockOrders),
      });
      return;
    }
    request.continue();
  });

  await page.goto("http://localhost:3000/admin/rnd", { waitUntil: "networkidle2" });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await snap(page, "01-rnd-overview-dark.png");
  await scrollContentTo(page, 180);
  await snap(page, "01b-rnd-order-types-dark.png");
  await scrollToTop(page);

  await clickExactText(page, "บริษัทตัวอย่าง เพ็ทแคร์ จำกัด");
  await snap(page, "02-rnd-order-detail-dark.png");

  const qcVisible = await page.evaluate(() => {
    const item = [...document.querySelectorAll("h4, p, div")].find((element) =>
      (element.textContent || "").trim().startsWith("วิธีการ QC")
    );
    if (!item) return false;
    item.scrollIntoView({ block: "center" });
    return true;
  });
  if (qcVisible) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await snap(page, "03-rnd-order-qc-method-dark.png");
  }

  await clickButton(page, "กำลังผลิต/กำลังพัฒนาสูตร");
  await scrollToTop(page);
  await snap(page, "04-rnd-producing-dark.png");

  await clickButton(page, "Inprocess QC");
  await scrollToTop(page);
  await clickExactText(page, "ลูกค้าทดลอง QC A");
  await scrollToTop(page);
  await snap(page, "05-rnd-inprocess-qc-dark.png");

  await clickButton(page, "งานที่เสร็จสิ้นแล้ว");
  await scrollToTop(page);
  await snap(page, "06-rnd-completed-dark.png");

  await clickButton(page, "Stock วัตถุดิบสารเคมี");
  await scrollToTop(page);
  await snap(page, "07-rnd-chemical-stock-dark.png");

  await clickButton(page, "สูตรคำนวณ BOM");
  await scrollToTop(page);
  await snap(page, "08-rnd-bom-matrix-dark.png");

  await clickButton(page, "จัดการสูตรผลิต");
  await snap(page, "09-rnd-formula-manager-dark.png");

  await clickButton(page, "สร้างสูตรใหม่");
  await snap(page, "10-rnd-formula-editor-dark.png");

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
