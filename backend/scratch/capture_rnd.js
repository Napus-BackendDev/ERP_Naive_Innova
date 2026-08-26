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

    console.log("Navigating to RND page...");
    await page.goto('http://localhost:3000/admin/rnd', { waitUntil: 'networkidle2' });

    // Wait for the content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("Taking screenshot...");
    await page.screenshot({
      path: 'C:\\Users\\asus\\.gemini\\antigravity\\brain\\7a53e3a1-dd78-45b7-bd41-b4c89e3bb2f0\\screenshot.png',
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
