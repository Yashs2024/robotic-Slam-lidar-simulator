const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/');
  
  await page.click('#btnDonate');
  await page.waitForTimeout(500);
  
  const display = await page.evaluate(() => document.getElementById('donateModal').style.display);
  console.log('Modal display:', display);
  
  await browser.close();
})();
