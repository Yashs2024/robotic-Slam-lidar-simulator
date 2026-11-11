#!/usr/bin/env node
/* ===================================
   VECTRASIM BUILD VERIFICATION
   Checks dist/ against sitemap and 404 contract.
   =================================== */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const SITEMAP = join(ROOT, 'public', 'sitemap.xml');
const VERCEL = join(ROOT, 'vercel.json');

let failed = false;

function fail(msg) {
  console.error('❌  ' + msg);
  failed = true;
}

function pass(msg) {
  console.log('✅  ' + msg);
}

function warn(msg) {
  console.warn('⚠️  ' + msg);
}

if (!existsSync(DIST)) {
  fail(`dist/ directory not found at ${DIST}. Run "npm run build" first.`);
  process.exit(1);
}

if (!existsSync(SITEMAP)) {
  fail(`sitemap.xml not found at ${SITEMAP}`);
}

if (!existsSync(VERCEL)) {
  fail(`vercel.json not found at ${VERCEL}`);
}

if (failed) process.exit(1);

const sitemapXml = readFileSync(SITEMAP, 'utf-8');
const locMatches = sitemapXml.match(/<loc>(.*?)<\/loc>/g) || [];
const sitemapUrls = locMatches
  .map(m => m.replace('<loc>', '').replace('</loc>', '').trim())
  .map(url => {
    try {
      const u = new URL(url);
      return u.pathname;
    } catch {
      return null;
    }
  })
  .filter(Boolean)
  .map(p => p === '/' ? '/index.html' : p);

console.log(`\n📋 Sitemap URLs (${sitemapUrls.length}):`);
for (const u of sitemapUrls) console.log('   ' + u);

const distFiles = new Set();
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile()) distFiles.add(relative(DIST, full).replace(/\\/g, '/'));
  }
}
walk(DIST);

console.log(`\n📦 Dist files (${distFiles.size}):`);
for (const f of [...distFiles].sort()) console.log('   ' + f);

for (const url of sitemapUrls) {
  const distPath = url.startsWith('/') ? url.slice(1) : url;
  if (!distFiles.has(distPath)) {
    fail(`Sitemap URL "${url}" → "${distPath}" missing from dist/`);
  } else {
    pass(`Sitemap URL "${url}" exists`);
  }
}

if (!distFiles.has('404.html')) {
  fail('dist/404.html missing (required for Vercel 404 page)');
} else {
  pass('dist/404.html exists');
}

const vercelJson = JSON.parse(readFileSync(VERCEL, 'utf-8'));
const rewrites = vercelJson.rewrites || [];
const hasInvalidRewriteStatus = rewrites.some(r => 'status' in r);
if (hasInvalidRewriteStatus) {
  fail('vercel.json rewrites must not define "status" (invalid schema); Vercel serves dist/404.html natively');
} else {
  pass('vercel.json schema valid (dist/404.html served natively by Vercel)');
}

const notFoundHtml = readFileSync(join(DIST, '404.html'), 'utf-8');
const requiredMarkers = [
  'Signal lost',
  'Page not found',
  'robots',
  'noindex',
  'id="nf-path"',
  'id="nf-search-input"',
  'id="nf-results"',
  'Back to console',
  'SLAM',
  'NEXUS',
  'HIVE',
];
for (const marker of requiredMarkers) {
  if (!notFoundHtml.includes(marker)) {
    warn(`404.html missing expected marker: "${marker}"`);
  } else {
    pass(`404.html contains "${marker}"`);
  }
}

const themeCss = [...distFiles].some(f => f.startsWith('assets/theme') && f.endsWith('.css'));
const uiEnhCss = [...distFiles].some(f => f.startsWith('assets/') && f.includes('ui_enhancements') && f.endsWith('.css'));
const notFoundCssFile = [...distFiles].find(f => f.startsWith('assets/') && f.includes('not_found') && f.endsWith('.css'));
const notFoundCss = !!notFoundCssFile;

if (themeCss) pass('theme.css bundled');
else warn('theme.css NOT found in assets/ (may be missing from 404.html deps)');

if (uiEnhCss) pass('ui_enhancements.css bundled');
else warn('ui_enhancements.css NOT found in assets/');

if (notFoundCss) {
  pass('not_found.css bundled');
  const cssContent = readFileSync(join(DIST, notFoundCssFile), 'utf-8');
  const requiredTokens = ['--bg:', '--cyan:', '--text-main:', '--font-head:', '--font-body:', '--radius:'];
  for (const token of requiredTokens) {
    if (cssContent.includes(token)) {
      pass(`not_found.css contains token ${token}`);
    } else {
      warn(`not_found.css missing token ${token}`);
    }
  }
} else {
  warn('not_found.css NOT found in assets/');
}

console.log('\n' + '='.repeat(50));
if (!failed) {
  console.log('🎉  All checks passed');
  process.exit(0);
} else {
  console.log('💥  Verification failed');
  process.exit(1);
}