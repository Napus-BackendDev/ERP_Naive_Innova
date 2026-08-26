const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const outDir = path.resolve("output/pdf/sales_manual_assets");
fs.mkdirSync(outDir, { recursive: true });

async function snap(page, name) {
  await page.waitForTimeout(900);
  const out = path.join(outDir, name);
  await page.screenshot({ path: out, fullPage: false });
  console.log(out);
}

async function clickIfVisible(locator) {
  if ((await locator.count()) > 0) {
    await locator.first().click();
    return true;
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const login = await page.request.post("http://localhost:5000/api/auth/mock-login");
  const data = await login.json();

  await page.goto("http://localhost:3000/login");
  await page.evaluate(({ token, user }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("theme", "dark");
  }, data);

  await page.goto("http://localhost:3000/admin/sales", { waitUntil: "networkidle" });
  await snap(page, "01_sales_kanban_dark.png");

  await clickIfVisible(page.getByRole("button", { name: /ลิสต์/ }));
  await snap(page, "02_sales_list_dark.png");

  await clickIfVisible(page.getByRole("button", { name: /บอร์ด/ }));
  await clickIfVisible(page.getByRole("button", { name: /เพิ่มดีล|สร้าง|Lead/i }));
  await snap(page, "03_create_sample_dark.png");

  await clickIfVisible(page.getByText("สั่งสินค้า", { exact: true }));
  await snap(page, "04_create_lot_dark.png");

  await clickIfVisible(page.getByText("พัฒนาสูตรเอง", { exact: true }));
  await snap(page, "05_create_develop_dark.png");

  await page.keyboard.press("Escape").catch(() => {});
  await page.goto("http://localhost:3000/admin/sales", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const card = page.locator("text=/ทดสอบ|Oil|สูตร|ล็อต|Lot/").first();
  if ((await card.count()) > 0) {
    await card.click();
    await page.waitForTimeout(900);
  }
  await snap(page, "06_sales_detail_docs_dark.png");

  await browser.close();
})();
