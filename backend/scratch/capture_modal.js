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

    // Wait for the tabs to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("Switching to packaging tab...");
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const packagingTab = tabs.find(t => t.textContent.includes('บรรจุภัณฑ์'));
      if (packagingTab) {
        packagingTab.click();
      } else {
        throw new Error("Packaging tab not found. Tabs available: " + tabs.map(t => t.textContent).join(', '));
      }
    });

    // Wait for tab content transition
    await new Promise(resolve => setTimeout(resolve, 1500));

    console.log("Clicking 'เพิ่มบรรจุภัณฑ์' button...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent.includes('เพิ่มบรรจุภัณฑ์'));
      if (btn) {
        btn.click();
      } else {
        throw new Error("Button 'เพิ่มบรรจุภัณฑ์' not found. Buttons available: " + buttons.map(b => b.textContent).join(', '));
      }
    });

    console.log("Waiting for modal to appear...");
    await new Promise(resolve => setTimeout(resolve, 1500)); // wait for modal transition

    console.log("Taking screenshot...");
    await page.screenshot({
      path: 'C:\\Users\\asus\\.gemini\\antigravity\\brain\\7a53e3a1-dd78-45b7-bd41-b4c89e3bb2f0\\screenshot.png',
      fullPage: false
    });

    console.log("Screenshot saved successfully!");
  } catch (err) {
    console.error("Error during execution:", err);
    console.log("Taking error screenshot...");
    await page.screenshot({
      path: 'C:\\Users\\asus\\.gemini\\antigravity\\brain\\7a53e3a1-dd78-45b7-bd41-b4c89e3bb2f0\\screenshot.png',
      fullPage: false
    });
    console.log("Error screenshot saved.");
    await browser.close();
    process.exit(1);
  }

  await browser.close();
}

run().catch(err => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
