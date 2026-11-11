import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST_DIR = join(process.cwd(), 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
  const url = new URL(req.url || '/', `http://localhost`);
  let pathname = url.pathname;
  if (pathname === '/') pathname = '/index.html';

  const filePath = join(DIST_DIR, pathname);
  try {
    const content = readFileSync(filePath);
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
    return;
  } catch {}

  try {
    const notFound = readFileSync(join(DIST_DIR, '404.html'));
    res.writeHead(404, { 'Content-Type': MIME['.html'] });
    res.end(notFound);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
}

test.describe('404 page contract', () => {
  let server;
  let baseUrl;

  test.beforeAll(async () => {
    server = createServer(serveStatic);
    await new Promise(resolve => server.listen(0, resolve));
    const addr = server.address();
    baseUrl = `http://localhost:${addr.port}`;
  });

  test.afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  test('unknown route returns HTTP 404 with branded content', async ({ request }) => {
    const res = await request.get(`${baseUrl}/this-route-does-not-exist-xyz`);
    expect(res.status()).toBe(404);
    const text = await res.text();
    expect(text).toContain('Signal lost');
    expect(text).toContain('404');
    expect(text).toContain('Back to console');
    expect(text).toContain('SLAM');
    expect(text).toContain('NEXUS');
    expect(text).toContain('HIVE');
  });

  test('known routes still return HTTP 200 (rewrite does not shadow)', async ({ request }) => {
    for (const path of ['/index.html', '/slam.html', '/nexus.html', '/hive.html']) {
      const res = await request.get(`${baseUrl}${path}`);
      expect(res.status()).toBe(200);
    }
  });

  test('sitemap-advertised privacy/terms return 200 (regression guard)', async ({ request }) => {
    for (const path of ['/privacy.html', '/terms.html']) {
      const res = await request.get(`${baseUrl}${path}`);
      expect(res.status()).toBe(200);
    }
  });

  test('404 page contains search input and results list', async ({ request }) => {
    const res = await request.get(`${baseUrl}/missing`);
    const text = await res.text();
    expect(text).toContain('id="nf-search-input"');
    expect(text).toContain('id="nf-results"');
  });
});