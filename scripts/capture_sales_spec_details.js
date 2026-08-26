const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const out = path.resolve("output/pdf/sales_manual_walkthrough_assets");
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const login = await page.request.post("http://localhost:5000/api/auth/mock-login");
  const auth = await login.json();
  await page.goto("http://localhost:3000/login");
  await page.evaluate(({ token, user }) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("theme", "dark");
  }, auth);
  await page.goto("http://localhost:3000/admin/sales", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /เพิ่มดีลใหม่|สร้างดีล|Lead/ }).first().click();
  await page.getByText("สั่งสินค้า", { exact: true }).click();
  await page.getByRole("button", { name: /เพิ่มใบสั่งผลิต/ }).click();
  await page.locator('button[title="ตั้งค่าข้อมูลสินค้าโดยละเอียด"]').first().click();
  const modal = page.getByText("ตั้งค่าข้อมูลสินค้าโดยละเอียด", { exact: true }).locator("..").locator("..").locator("..");
  await modal.screenshot({ path: path.join(out, "06-product-spec-label-top.png") });
  const scroll = page.locator(".overflow-y-auto").filter({ has: page.getByText("รายละเอียดสติกเกอร์", { exact: true }) }).first();
  await scroll.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(400);
  await modal.screenshot({ path: path.join(out, "06-product-spec-label-lot.png") });
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
