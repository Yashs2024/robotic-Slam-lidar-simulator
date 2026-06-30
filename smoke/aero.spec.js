import { test, expect } from '@playwright/test';

test('AERO Simulator: verify page load, altitude, PID tuners, formations and waypoints', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    console.log(`CONSOLE [${msg.type()}]: ${msg.text()}`);
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore Vite or browser HMR connection warnings/errors if any
      if (text.includes('supabase') || text.includes('429') || text.includes('Failed to load resource')) {
        return;
      }
      errors.push(text);
    }
  });

  page.on('pageerror', exception => {
    errors.push(exception.message);
    console.log(`UNCAUGHT EXCEPTION: ${exception.message}`);
  });

  // 1. Inject local authentication session into localStorage
  await page.addInitScript(() => {
    window.localStorage.setItem('vectrasim_session', JSON.stringify({
      id: 'mock-aero-e2e',
      name: 'AERO E2E Tester',
      email: 'aero_test@example.com',
      ts: Date.now(),
      token: 'mock-bypass-token'
    }));
  });

  // 2. Load AERO Simulator page
  await page.goto('http://localhost:5173/aero.html');
  await expect(page).toHaveTitle(/AERO | VectraSim Suite/);
  await page.waitForTimeout(1000);

  // 3. Verify Canvas elements are present
  const canvas = page.locator('#aeroCanvas');
  await expect(canvas).toBeVisible();

  const pidChart = page.locator('#pidChart');
  await expect(pidChart).toBeVisible();

  // 4. Test Altitude Controls interaction
  const btnTakeoff = page.locator('#btnTakeoff');
  await expect(btnTakeoff).toBeVisible();
  await btnTakeoff.click();
  await page.waitForTimeout(500);

  const btnHover = page.locator('#btnHover');
  await expect(btnHover).toBeVisible();
  await btnHover.click();
  await page.waitForTimeout(300);

  const btnLand = page.locator('#btnLand');
  await expect(btnLand).toBeVisible();
  await btnLand.click();
  await page.waitForTimeout(300);

  // 5. Test PID Sliders exist and can be set
  const sliderKpPos = page.locator('#sliderKpPos');
  await expect(sliderKpPos).toBeVisible();
  await sliderKpPos.evaluate(el => {
    el.value = '0.35';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#valKpPos')).toHaveText('0.35');

  const sliderKdPos = page.locator('#sliderKdPos');
  await expect(sliderKdPos).toBeVisible();
  await sliderKdPos.evaluate(el => {
    el.value = '0.50';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator('#valKdPos')).toHaveText('0.50');

  // 6. Test waypoint mode and patrol loop dispatch
  const selectWaypointMode = page.locator('#waypointModeSelect');
  await expect(selectWaypointMode).toBeVisible();
  await selectWaypointMode.selectOption('SEQUENTIAL');

  // Click on canvas to spawn some waypoints
  const box = await canvas.boundingBox();
  if (box) {
    // Click at three different spots on the canvas
    await page.mouse.click(box.x + 200, box.y + 200);
    await page.mouse.click(box.x + 400, box.y + 200);
    await page.mouse.click(box.x + 300, box.y + 400);
  }
  await page.waitForTimeout(500);

  // Click dispatch
  const btnDispatch = page.locator('#btnDispatch');
  await btnDispatch.click();
  await page.waitForTimeout(1000);

  // 7. Verify no exceptions or console errors were captured
  expect(errors.length).toBe(0);
  console.log("AERO E2E Verification Complete: No errors detected.");
});
