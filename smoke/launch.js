import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log(`\n\n=== PAGE ERROR ===\n${msg.text()}\n==================\n\n`);
    } else {
       console.log(`LOG: ${msg.text()}`);
    }
  });

  page.on('pageerror', exception => {
    errors.push(exception.message);
    console.log(`UNCAUGHT EXCEPTION: ${exception.message}`);
  });

  await page.goto('http://localhost:5173/');

  try {
    const launchBtn = page.locator('#btnGetStarted');
    await launchBtn.click({ timeout: 2000, force: true });
    console.log("Button clicked successfully");
  } catch (e) {
    console.log("Failed to click button:", e.message);
  }

  await page.waitForTimeout(2000);

  if (errors.length > 0) {
    console.log("DETECTED ERRORS:", errors);
  } else {
    console.log("NO ERRORS DETECTED");
  }

  await browser.close();
})();
