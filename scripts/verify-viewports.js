#!/usr/bin/env node
/* =========================================================
   VECTRASIM MULTI-VIEWPORT HORIZONTAL OVERFLOW & CTA VERIFIER
   1. Verifies scrollWidth <= clientWidth across all 4 pages
      and 5 standard viewports (320px, 375px, 768px, 1024px, 1440px).
   2. Verifies essential primary CTAs (#nav-enter, .btn-hero-launch,
      .header-cta) are never clipped offscreen by overflow:hidden.
   3. Parallelized & resource-blocked for ultra-fast (<3s) offline execution.
   ========================================================= */

import { chromium } from '@playwright/test';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Robust root resolution regardless of whether invoked from repo root or scripts/
const ROOT = existsSync(resolve(__dirname, '../package.json'))
  ? resolve(__dirname, '..')
  : process.cwd();

const TARGET_PAGES = [
  { name: 'Hub / Landing', relPath: 'index.html', distPath: 'dist/index.html' },
  { name: 'SLAM Simulator Landing', relPath: 'src/slam_landing.html', distPath: 'dist/src/slam_landing.html' },
  { name: 'NEXUS Kinematics Landing', relPath: 'src/nexus_landing.html', distPath: 'dist/src/nexus_landing.html' },
  { name: 'HIVE Swarm Landing', relPath: 'src/hive_landing.html', distPath: 'dist/src/hive_landing.html' }
];

const VIEWPORTS = [
  { name: 'Mobile S', width: 320, height: 600 },
  { name: 'Mobile M', width: 375, height: 667 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Desktop S', width: 1024, height: 768 },
  { name: 'Desktop L', width: 1440, height: 900 }
];

// Essential Primary CTAs that must be in-bounds and not clipped offscreen
const ESSENTIAL_CTA_SELECTORS = [
  '#nav-enter',
  '.btn-hero-launch',
  '.header-cta'
];

async function verifyViewports() {
  const startTime = Date.now();
  console.log('📐 Starting Multi-Viewport Horizontal Scroll & CTA Visibility Verification...');
  const browser = await chromium.launch({ headless: true });
  let totalTests = 0;
  const failures = [];

  // Execute all 4 pages in parallel for speed (<3s total)
  await Promise.all(
    TARGET_PAGES.map(async target => {
      const targetFile = existsSync(resolve(ROOT, target.distPath))
        ? resolve(ROOT, target.distPath)
        : resolve(ROOT, target.relPath);

      const fileUrl = pathToFileURL(targetFile).href;
      const page = await browser.newPage();

      // Block external fonts/CDNs to eliminate network latency & ensure offline determinism
      await page.route('**/*', route => {
        const url = route.request().url();
        if (
          url.includes('fonts.googleapis.com') ||
          url.includes('fonts.gstatic.com') ||
          url.includes('cdnjs.cloudflare.com')
        ) {
          return route.abort();
        }
        return route.continue();
      });

      try {
        await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 6000 });

        for (const vp of VIEWPORTS) {
          totalTests++;
          await page.setViewportSize({ width: vp.width, height: vp.height });

          const metrics = await page.evaluate(ctas => {
            const doc = document.documentElement;
            const body = document.body;
            const scrollWidth = Math.max(doc.scrollWidth, body ? body.scrollWidth : 0);
            const clientWidth = doc.clientWidth;
            const overflowX = scrollWidth - clientWidth;

            // 1. Offending elements causing document horizontal overflow
            const offenders = [];
            if (overflowX > 0) {
              const allElements = document.querySelectorAll('*');
              for (const el of allElements) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.right > clientWidth + 1) {
                  const style = window.getComputedStyle(el);
                  if (
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0' &&
                    style.position !== 'fixed'
                  ) {
                    offenders.push({
                      selector:
                        el.tagName.toLowerCase() +
                        (el.id ? '#' + el.id : '') +
                        (el.className && typeof el.className === 'string'
                          ? '.' + el.className.trim().split(/\s+/).join('.')
                          : ''),
                      right: Math.round(rect.right),
                      width: Math.round(rect.width),
                      excess: Math.round(rect.right - clientWidth)
                    });
                  }
                }
              }
              offenders.sort((a, b) => b.excess - a.excess);
            }

            // 2. Offscreen / clipped primary CTA check
            // Detects CTAs pushed offscreen even when parent has overflow: hidden
            const clippedCtas = [];
            for (const sel of ctas) {
              const els = document.querySelectorAll(sel);
              for (const el of els) {
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden') continue;
                const r = el.getBoundingClientRect();
                if (r.width === 0 && r.height === 0) continue;

                // Subpixel threshold: 1px tolerance
                const isClippedRight = r.right > clientWidth + 1;
                const isClippedLeft = r.left < -1;

                if (isClippedRight || isClippedLeft) {
                  clippedCtas.push({
                    selector: sel,
                    id: el.id || '',
                    text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30),
                    left: Math.round(r.left),
                    right: Math.round(r.right),
                    width: Math.round(r.width),
                    excessRight: isClippedRight ? Math.round(r.right - clientWidth) : 0,
                    excessLeft: isClippedLeft ? Math.round(-r.left) : 0
                  });
                }
              }
            }

            return {
              scrollWidth,
              clientWidth,
              overflowX,
              offenders: offenders.slice(0, 5),
              clippedCtas
            };
          }, ESSENTIAL_CTA_SELECTORS);

          let hasFailure = false;

          if (metrics.overflowX > 0) {
            hasFailure = true;
            const msg = `${target.name} at ${vp.width}px (${vp.name}) has document horizontal overflow: scrollWidth (${metrics.scrollWidth}px) > clientWidth (${metrics.clientWidth}px) [Excess: +${metrics.overflowX}px]`;
            console.error(`  ❌  ${msg}`);
            for (const off of metrics.offenders) {
              console.error(`      -> Culprit: <${off.selector}> right=${off.right}px (+${off.excess}px)`);
            }
            failures.push({ page: target.name, viewport: vp.width, type: 'overflow', error: msg });
          }

          if (metrics.clippedCtas.length > 0) {
            hasFailure = true;
            for (const cta of metrics.clippedCtas) {
              const detail = cta.excessRight > 0
                ? `right (${cta.right}px) exceeds clientWidth (${metrics.clientWidth}px) by +${cta.excessRight}px`
                : `left (${cta.left}px) is offscreen (<0px) by ${cta.excessLeft}px`;
              const msg = `${target.name} at ${vp.width}px (${vp.name}) has clipped primary CTA: <${cta.selector}> "${cta.text}" [${detail}] (clipped by container overflow)`;
              console.error(`  ❌  ${msg}`);
              failures.push({ page: target.name, viewport: vp.width, type: 'clipped_cta', error: msg, cta });
            }
          }

          if (!hasFailure) {
            console.log(`  ✅  ${target.name} - ${vp.name} (${vp.width}px): ${metrics.clientWidth}px / ${metrics.scrollWidth}px (zero overflow, CTAs visible)`);
          }
        }
      } catch (err) {
        const msg = `${target.name} error: ${err.message}`;
        console.error(`  ❌  ${msg}`);
        failures.push({ page: target.name, error: msg });
      } finally {
        await page.close();
      }
    })
  );

  await browser.close();
  const elapsed = Date.now() - startTime;

  console.log('\n' + '='.repeat(60));
  console.log(`⏱️  Verification completed in ${elapsed}ms (${(elapsed / 1000).toFixed(2)}s)`);
  if (failures.length === 0) {
    console.log(`🎉  All ${totalTests} viewport tests passed with ZERO horizontal overflow and ALL primary CTAs visible!`);
    return true;
  } else {
    console.error(`💥  Verification failed: ${failures.length} issue(s) detected across ${totalTests} viewport tests.`);
    return false;
  }
}

// Self-run if invoked directly
if (process.argv[1] && process.argv[1].endsWith('verify-viewports.js')) {
  verifyViewports().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
  });
}

export { verifyViewports };
