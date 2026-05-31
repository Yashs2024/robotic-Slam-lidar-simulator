import { chromium } from 'playwright';
import path from 'path';

(async () => {
  console.log("Launching headless browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const errors = [];
  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      errors.push(text);
      console.log(`[PAGE ERROR] ${text}`);
    } else {
      console.log(`[PAGE LOG] ${text}`);
    }
  });

  page.on('pageerror', exception => {
    errors.push(exception.message);
    console.error(`[UNCAUGHT EXCEPTION] ${exception.stack}`);
  });

  console.log("Navigating to SLAM Simulator...");
  await page.goto('http://localhost:5173/slam.html');
  await page.waitForLoadState('networkidle');

  // Verify the Launch Sim button is visible
  const startBtn = page.locator('#btnStartStop');
  await startBtn.waitFor({ state: 'visible', timeout: 5000 });
  console.log("Launch Sim button is visible. Clicking it...");
  await startBtn.evaluate(el => el.click());

  // Wait a moment for simulation loop to start running
  await page.waitForTimeout(1000);

  // Click the Auto-Explore (Frontier) checkbox
  console.log("Locating Auto-Explore (Frontier) switch...");
  const frontierChk = page.locator('#chkFrontier');
  await frontierChk.waitFor({ state: 'attached', timeout: 3000 });
  
  // Check the checkbox if it is unchecked
  const isChecked = await frontierChk.isChecked();
  console.log(`Auto-Explore checked status before click: ${isChecked}`);
  if (!isChecked) {
    console.log("Checking Auto-Explore switch...");
    await frontierChk.evaluate(el => { el.checked = true; el.dispatchEvent(new Event('change')); });
  }

  // Monitor the simulation for 10 seconds, logging telemetry and taking screenshots every 2 seconds
  console.log("Monitoring simulation for 10 seconds...");
  const artifactDir = process.env.GEMINI_ARTIFACTS_DIR || path.join(process.cwd(), 'smoke');
  
  for (let i = 1; i <= 5; i++) {
    await page.waitForTimeout(2000);
    try {
      const telemetry = await page.evaluate(() => {
        return {
          running: window.running,
          robotX: window.robot ? window.robot.x : null,
          robotY: window.robot ? window.robot.y : null,
          robotPath: window.robot && window.robot.path ? window.robot.path.length : 0,
          explored: document.getElementById('statExplored')?.textContent,
          distance: document.getElementById('statDistance')?.textContent,
          collisions: document.getElementById('statCollisions')?.textContent,
        };
      });
      console.log(`[T+${i*2}s] Telemetry:`, telemetry);
      
      const debugScreenshotPath = path.join(artifactDir, `explore_debug_${i*2}s.png`);
      await page.screenshot({ path: debugScreenshotPath, timeout: 3000 });
      console.log(`[T+${i*2}s] Screenshot saved to: ${debugScreenshotPath}`);
    } catch (err) {
      console.error(`[T+${i*2}s] Error during monitoring: ${err.message}`);
    }
  }

  // Pause the simulation before taking the final screenshot
  console.log("Pausing simulation for screenshot...");
  try {
    await startBtn.evaluate(el => el.click(), { timeout: 5000 });
    console.log("Successfully paused simulation.");
  } catch (err) {
    console.error(`Failed to pause simulation: ${err.message}`);
  }
  
  await page.waitForTimeout(1000);

  console.log("Taking final screenshot of the simulation state...");
  const screenshotPath = path.join(artifactDir, 'explore_test.png');
  await page.screenshot({ path: screenshotPath, timeout: 5000 });
  console.log(`Screenshot saved to: ${screenshotPath}`);

  if (errors.length > 0) {
    console.log(`\nDONE. Completed with ${errors.length} console errors.`);
  } else {
    console.log("\nDONE. Simulation completed with zero console errors!");
  }

  await browser.close();
})();

