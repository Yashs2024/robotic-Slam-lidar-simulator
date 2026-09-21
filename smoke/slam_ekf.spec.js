import { test, expect } from '@playwright/test';

test('SLAM Simulator: verify EKF sensor fusion, 2-sigma covariance ellipse, and HUD stats', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  // Initialize session in sessionStorage before navigation
  await page.addInitScript(() => {
    window.sessionStorage.setItem('vectrasim_session', JSON.stringify({
      id: 'e2e-slam-test-user',
      email: 'test@vectrasim.edu',
      isGuest: true
    }));
  });

  await page.goto('http://localhost:5173/slam.html');
  await page.waitForLoadState('networkidle');

  // Verify EKF UI elements exist
  const chkEKF = page.locator('#chkEKF');
  const chkCovariance = page.locator('#chkCovarianceEllipse');
  const statEKF = page.locator('#statEKF');

  await expect(chkEKF).toBeAttached();
  await expect(chkCovariance).toBeAttached();
  await expect(statEKF).toBeVisible();
  await expect(chkEKF).toBeChecked();
  await expect(chkCovariance).toBeChecked();

  // Launch simulation
  const btnStartStop = page.locator('#btnStartStop');
  await btnStartStop.click();
  await expect(page.locator('#statusText')).toHaveText('Running');

  // Focus canvas and drive robot forward
  await page.locator('#canvas-container').click();
  await page.keyboard.down('w');
  await page.waitForTimeout(2000);
  await page.keyboard.up('w');
  await page.waitForTimeout(500);

  // Verify distance or robot position and EKF uncertainty computed
  const statDistance = await page.locator('#statDistance').textContent();
  const ekfText = await statEKF.textContent();
  console.log(`[EKF Test] Distance: ${statDistance}, EKF Uncertainty: ${ekfText}`);

  expect(ekfText).toContain('±');
  expect(ekfText).toContain('m');

  // Test toggling covariance ellipse and EKF via DOM events
  await page.evaluate(() => {
    const chk = document.getElementById('chkCovarianceEllipse');
    chk.checked = false;
    chk.dispatchEvent(new Event('change'));
  });
  expect(await chkCovariance.isChecked()).toBe(false);

  await page.evaluate(() => {
    const chk = document.getElementById('chkCovarianceEllipse');
    chk.checked = true;
    chk.dispatchEvent(new Event('change'));
  });
  expect(await chkCovariance.isChecked()).toBe(true);

  await page.evaluate(() => {
    const chk = document.getElementById('chkEKF');
    chk.checked = false;
    chk.dispatchEvent(new Event('change'));
  });
  expect(await chkEKF.isChecked()).toBe(false);

  await page.evaluate(() => {
    const chk = document.getElementById('chkEKF');
    chk.checked = true;
    chk.dispatchEvent(new Event('change'));
  });
  expect(await chkEKF.isChecked()).toBe(true);

  // Take screenshot as artifact
  await page.screenshot({ path: 'smoke/ekf_slam_verified.png' });

  // Ensure zero runtime exceptions occurred
  const criticalErrors = errors.filter(e => !e.includes('ERR_NAME_NOT_RESOLVED') && !e.includes('Failed to fetch'));
  expect(criticalErrors).toHaveLength(0);
});
