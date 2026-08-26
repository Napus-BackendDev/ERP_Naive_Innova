const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const outDir = path.resolve("output/pdf/sales_manual_assets");
fs.mkdirSync(outDir, { recursive: true });

async function snap(page, name) {
  await page.waitForTimeout(700);
  const out = path.join(outDir, name);
  await page.screenshot({ path: out, fullPage: false });
  console.log(out);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
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
  await page.waitForTimeout(1000);

  await page.mouse.click(584, 522);
  await snap(page, "07_card_three_dot_menu_dark.png");

  await browser.close();
})();
