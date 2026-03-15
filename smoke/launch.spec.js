import { test, expect } from '@playwright/test';

test('check console errors on launch', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log(`PAGE ERROR: ${msg.text()}`);
    }
  });
  
  page.on('pageerror', exception => {
    errors.push(exception.message);
    console.log(`UNCAUGHT EXCEPTION: ${exception.message}`);
  });

  await page.goto('http://localhost:5173/');
  
  try {
    const launchBtn = await page.locator('#btnGetStarted');
    await launchBtn.click({ timeout: 2000 });
    console.log("Button clicked successfully");
  } catch (e) {
    console.log("Failed to click button:", e.message);
  }

  // Wait a bit to catch async errors
  await page.waitForTimeout(1000);
  
  if (errors.length > 0) {
    console.log("DETECTED ERRORS:", errors);
  } else {
    console.log("NO ERRORS DETECTED");
  }
});
