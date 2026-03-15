import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('ERROR:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });

  page.on('requestfailed', request => {
    console.log('FAILED REQUEST:', request.url(), request.failure().errorText);
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await browser.close();
})();
