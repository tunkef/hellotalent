#!/usr/bin/env node
/**
 * Sprint 8 Polish — Screenshot Pipeline
 * 4 panel × 2 viewport × 2 mode = 16 screenshot
 * Output: .playwright-mcp/sprint8-{page}-{viewport}-{mode}.png
 */
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT_DIR = path.join(__dirname, '..', '.playwright-mcp');
fs.mkdirSync(OUT_DIR, { recursive: true });

const PAGES = [
  { slug: 'ik', url: '/ik.html' },
  { slug: 'pipeline', url: '/hr-pipeline.html' },
  { slug: 'pool', url: '/hr-pool.html' },
  { slug: 'messages', url: '/hr-messages.html' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const MODES = ['light', 'dark'];

(async () => {
  const browser = await chromium.launch();
  const results = [];

  for (const vp of VIEWPORTS) {
    for (const mode of MODES) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: mode === 'dark' ? 'dark' : 'light',
      });
      const page = await ctx.newPage();

      // Stub Supabase auth state — bypass mode for tkefeli@peoplein.com.tr
      await page.addInitScript(() => {
        try {
          localStorage.setItem('ht_test_bypass', 'true');
          localStorage.setItem('ht_role', 'employer');
        } catch (_) {}
      });

      for (const p of PAGES) {
        const fname = `sprint8-${p.slug}-${vp.name}-${mode}.png`;
        const fp = path.join(OUT_DIR, fname);
        try {
          await page.goto(BASE + p.url, { waitUntil: 'networkidle', timeout: 15000 });
          // Force theme via data-theme attr if present in shared-v2
          await page.evaluate((m) => {
            try { document.documentElement.setAttribute('data-theme', m); } catch (_) {}
          }, mode);
          await page.waitForTimeout(800); // allow CSS transitions
          await page.screenshot({ path: fp, fullPage: true });
          results.push({ page: p.slug, vp: vp.name, mode, ok: true, file: fname });
        } catch (err) {
          results.push({ page: p.slug, vp: vp.name, mode, ok: false, error: err.message });
        }
      }
      await ctx.close();
    }
  }

  await browser.close();

  console.log('\n=== Sprint 8 Screenshot Report ===');
  results.forEach((r) => {
    if (r.ok) console.log(`OK   ${r.file}`);
    else console.log(`FAIL ${r.page}-${r.vp}-${r.mode}: ${r.error}`);
  });
  const okCount = results.filter((r) => r.ok).length;
  console.log(`\nTotal: ${okCount}/${results.length}`);
  process.exit(okCount === results.length ? 0 : 1);
})();
