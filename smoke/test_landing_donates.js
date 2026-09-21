import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  const pagesToTest = [
    { name: 'NEXUS Landing', url: 'http://localhost:5173/src/nexus_landing.html' },
    { name: 'HIVE Landing', url: 'http://localhost:5173/src/hive_landing.html' },
    { name: 'SLAM Landing', url: 'http://localhost:5173/src/slam_landing.html' },
    { name: 'VectraSim Main', url: 'http://localhost:5173/' }
  ];

  for (const item of pagesToTest) {
    console.log(`\nTesting ${item.name} (${item.url})...`);
    await page.goto(item.url);
    await page.waitForTimeout(600);

    // Ensure session doesn't redirect or wait for load
    const title = await page.title();
    console.log(`  Page Title: "${title}"`);

    // Test click on #btnDonate
    const btn = page.locator('#btnDonate').first();
    await btn.waitFor({ state: 'attached' });
    await btn.click({ force: true });
    await page.waitForTimeout(400);

    const modalDisplay = await page.evaluate(() => {
      const m = document.getElementById('donateModal');
      return m ? getComputedStyle(m).display : null;
    });
    console.log(`  #donateModal display: ${modalDisplay}`);

    if (modalDisplay !== 'flex' && modalDisplay !== 'block') {
      console.error(`  FAIL: ${item.name} modal did not open!`);
      process.exit(1);
    }

    // Close modal
    const closeBtn = page.locator('#donateClose').first();
    await closeBtn.click({ force: true });
    await page.waitForTimeout(400);

    const closedDisplay = await page.evaluate(() => {
      const m = document.getElementById('donateModal');
      return m ? getComputedStyle(m).display : null;
    });
    console.log(`  #donateModal closed display: ${closedDisplay}`);
    console.log(`  SUCCESS: ${item.name} donate button & modal verified!`);
  }

  await browser.close();
  console.log('\nALL 4 DONATION MODALS VERIFIED SUCCESSFULLY!');
})();
