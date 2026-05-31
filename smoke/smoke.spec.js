import { test, expect } from '@playwright/test';

test('Full operator journey: registration, hub, and landing page validation', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    console.log(`CONSOLE [${msg.type()}]: ${msg.text()}`);
    if (msg.type() === 'error') {
      const text = msg.text();
      if (text.includes('supabase') || text.includes('429')) {
        return;
      }
      errors.push(text);
    }
  });

  page.on('pageerror', exception => {
    errors.push(exception.message);
    console.log(`UNCAUGHT EXCEPTION: ${exception.message}`);
  });

  // 1. Load the main landing page
  await page.goto('http://localhost:5173/');
  await expect(page).toHaveTitle(/RoboAI Suite/);
  await page.waitForTimeout(1000);

  // 2. Open login modal via one of the cards (e.g. SLAM)
  const slamCardLaunch = page.locator('.engine-card.slam').first();
  await slamCardLaunch.click();
  
  // Verify login modal is open
  const loginOverlay = page.locator('#login-overlay');
  await expect(loginOverlay).toHaveClass(/open/);

  // 3. Switch to SIGN UP tab and register
  await page.locator('#tab-signup').click();
  await page.fill('#su-name', 'E2E Tester');
  const uniqueEmail = `test_${Date.now()}@example.com`;
  await page.fill('#su-email', uniqueEmail);
  await page.fill('#su-pass', 'password123');
  await page.fill('#su-pass2', 'password123');
  await page.locator('#su-submit').click();

  // Wait for account creation and redirect
  // After signing up, we should be redirected to the targeted URL (slam_landing)
  await page.waitForURL(/slam_landing\.html/);
  console.log("Successfully redirected to SLAM Landing Page!");
  await expect(page).toHaveTitle(/SLAM/);

  // 4. Click nav-logo to go back to landing page then to hub, or direct navigation
  await page.goto('http://localhost:5173/');
  
  // Since we are logged in, we should be in the select engine hub
  const hubOverlay = page.locator('#hub-overlay');
  await expect(hubOverlay).toHaveClass(/open/);

  // 5. Test HIVE Landing Page
  const hiveHubBtn = page.locator('.hub-card.hc-hive');
  await hiveHubBtn.click();
  await page.waitForURL(/hive_landing\.html/);
  console.log("Successfully entered HIVE Landing Page!");
  await expect(page).toHaveTitle(/HIVE/);

  // 6. Test NEXUS Landing Page
  await page.goto('http://localhost:5173/');
  await expect(hubOverlay).toHaveClass(/open/);
  
  const nexusHubBtn = page.locator('.hub-card.hc-nexus');
  await nexusHubBtn.click();
  await page.waitForURL(/nexus_landing\.html/);
  console.log("Successfully entered NEXUS Landing Page!");
  await expect(page).toHaveTitle(/NEXUS/);

  // 7. Verify we didn't get any console errors or uncaught exceptions during navigation
  expect(errors.length).toBe(0);
  console.log("E2E Validation Complete: No errors detected.");
});
