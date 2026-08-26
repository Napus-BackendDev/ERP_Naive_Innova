import puppeteer from 'puppeteer-core';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    console.log("Navigating to login...");
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });

    console.log("Filling login credentials...");
    await page.type('input[placeholder="name@company.com"]', 'admin@example.com');
    await page.type('input[placeholder="••••••••"]', 'password');

    console.log("Submitting login form...");
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    console.log("Navigating to stock page...");
    await page.goto('http://localhost:3000/admin/stock', { waitUntil: 'networkidle2' });

    // Wait for the content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("Switching to packaging tab...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const packagingTab = buttons.find(b => b.textContent.includes('บรรจุภัณฑ์'));
      if (packagingTab) {
        packagingTab.click();
      } else {
        throw new Error("Packaging tab not found");
      }
    });

    // Wait for transition
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log("Taking screenshot...");
    await page.screenshot({
      path: 'C:\\Users\\asus\\.gemini\\antigravity-cli\\brain\\61cb7a8c-d48b-4e51-9dbb-80d4759b229e\\stock_screenshot.png',
      fullPage: false
    });

    console.log("Screenshot saved successfully!");
  } catch (err) {
    console.error("Error during execution:", err);
    await browser.close();
    process.exit(1);
  }

  await browser.close();
}

run().catch(err => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
