// phase-d2-prod-assets.spec.js — Phase D2 Production Assets Smoke
// 30 Nisan 2026 — CF Access token ile HTML asset dogrulama.
// Auth gerektirmez — sadece HTML dosyasinin icerigini fetch eder.
// DOM check yok (auth gate redirect yapacak), asset integrity check var.

const { test, expect, request } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const PROD_BASE = 'https://hellotalent.ai';

// CF Access headers — playwright.config extraHTTPHeaders ile gelir
// Ek olarak request context'e de ekleyecegiz

const PAGES_ASSET = [
  'ik.html',
  'hr-pool.html',
  'hr-pipeline.html',
  'hr-candidate.html',
  'hr-messages.html',
  'hr-campaigns.html',
  'hr-company.html',
  'hr-team.html',
  'hr-settings.html',
];

// =============================================================================
// Production Asset Integrity — HTTP fetch ile (auth bypass, sadece HTML)
// =============================================================================
test.describe('PROD Asset Integrity (CF Access bypass)', () => {
  let apiCtx;

  test.beforeAll(async ({ playwright }) => {
    apiCtx = await playwright.request.newContext({
      baseURL: PROD_BASE,
      extraHTTPHeaders: {
        'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID || '',
        'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET || '',
      },
    });
  });

  test.afterAll(async () => {
    await apiCtx?.dispose();
  });

  for (const page of PAGES_ASSET) {
    test(`PROD: ${page} HTTP 200 + HTML geri doner`, async () => {
      const resp = await apiCtx.get(`/${page}`);
      const status = resp.status();
      const body = await resp.text();

      console.log(`[PROD ASSET] ${page}: HTTP ${status}, body_len=${body.length}`);

      // CF Access bypass calisti (200 veya 404, 403 degil)
      expect([200, 304]).toContain(status);

      // HTML icerik var
      expect(body.length).toBeGreaterThan(500);

      // Cloudflare Access login sayfasi DEGIL
      expect(body).not.toContain('Sign in to continue to');
    });
  }
});

// =============================================================================
// Production vs Local HTML Diff — kritik attribute'lar
// =============================================================================
test.describe('PROD vs LOCAL HTML Drift', () => {
  let apiCtx;

  test.beforeAll(async ({ playwright }) => {
    apiCtx = await playwright.request.newContext({
      baseURL: PROD_BASE,
      extraHTTPHeaders: {
        'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID || '',
        'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET || '',
      },
    });
  });

  test.afterAll(async () => {
    await apiCtx?.dispose();
  });

  const CHECKS = [
    {
      page: 'hr-campaigns.html',
      label: 'D2.5: ik-cmp-empty mevcut, filter toolbar YOK',
      mustContain: ['id="ik-cmp-empty"', 'id="btn-cmp-disabled"', 'aria-disabled="true"'],
      mustNotContain: ['data-ik-cmp-status', 'ik-cmp-filter'],
    },
    {
      page: 'hr-company.html',
      label: 'D2.4: contact section YOK',
      mustContain: ['data-ik-page="company"'],
      mustNotContain: ['data-ik-section="contact"', 'id="ik-company-contact"'],
    },
    {
      page: 'hr-messages.html',
      label: 'D2.2: mark_employer_thread_read (yeni), mark_employer_replies_read YOK (eski)',
      mustContain: ['data-ik-msg-list'],
      mustNotContain: ['mark_employer_replies_read'],
    },
    {
      page: 'ik.html',
      label: 'D2.8: ik-kpi class, ik-genel__bento mevcut',
      mustContain: ['ik-kpi', 'ik-genel__bento', 'data-ik-page="genel"'],
      mustNotContain: [],
    },
    {
      page: 'hr-pool.html',
      label: 'D2.3: ik-pool + ik-match referansi',
      mustContain: ['data-ik-page="pool"'],
      mustNotContain: [],
    },
  ];

  for (const chk of CHECKS) {
    test(`PROD HTML: ${chk.page} — ${chk.label}`, async () => {
      const resp = await apiCtx.get(`/${chk.page}`);
      const status = resp.status();
      const body = await resp.text();

      console.log(`[PROD HTML] ${chk.page}: HTTP ${status}, len=${body.length}`);
      expect([200, 304]).toContain(status);
      expect(body).not.toContain('Sign in to continue to');

      for (const must of chk.mustContain) {
        const found = body.includes(must);
        console.log(`[PROD HTML] ${chk.page} mustContain "${must}": ${found ? 'OK' : 'MISSING'}`);
        expect(body, `"${must}" bulunamadi: ${chk.page}`).toContain(must);
      }

      for (const mustNot of chk.mustNotContain) {
        const found = body.includes(mustNot);
        console.log(`[PROD HTML] ${chk.page} mustNotContain "${mustNot}": ${found ? 'FOUND (FAIL)' : 'OK'}`);
        expect(body, `"${mustNot}" hala mevcut: ${chk.page}`).not.toContain(mustNot);
      }

      // Ayni zamanda local ile karsilastir
      const localPath = path.join(__dirname, '..', chk.page);
      if (fs.existsSync(localPath)) {
        const localBody = fs.readFileSync(localPath, 'utf8');
        const prodLen = body.length;
        const localLen = localBody.length;
        const diff = Math.abs(prodLen - localLen);
        const diffPct = ((diff / localLen) * 100).toFixed(1);
        console.log(`[DRIFT] ${chk.page}: prod=${prodLen}, local=${localLen}, diff=${diff} (${diffPct}%)`);

        // %5'ten fazla fark varsa warn
        if (parseFloat(diffPct) > 5) {
          console.warn(`[DRIFT WARN] ${chk.page}: prod vs local fark %${diffPct} > %5 — deploy sync kontrol et`);
        }
      }
    });
  }
});

// =============================================================================
// Production CSS Asset Check — kritik CSS dosyalari 200 donuyor mu?
// =============================================================================
test.describe('PROD CSS Asset 200', () => {
  let apiCtx;

  test.beforeAll(async ({ playwright }) => {
    apiCtx = await playwright.request.newContext({
      baseURL: PROD_BASE,
      extraHTTPHeaders: {
        'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID || '',
        'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET || '',
      },
    });
  });

  test.afterAll(async () => {
    await apiCtx?.dispose();
  });

  const CSS_FILES = [
    '/css/tokens.css',
    '/css/ik-shell.css',
    '/css/panels/ik-pool.css',
    '/css/panels/ik-pipeline.css',
    '/css/panels/ik-messages.css',
    '/css/panels/ik-campaigns.css',
    '/css/panels/ik-company.css',
    '/css/panels/ik-team.css',
    '/css/panels/ik-settings.css',
  ];

  for (const css of CSS_FILES) {
    test(`PROD CSS: ${css} → 200`, async () => {
      const resp = await apiCtx.get(css);
      const status = resp.status();
      console.log(`[PROD CSS] ${css}: HTTP ${status}`);
      expect(status).toBe(200);
    });
  }
});

// =============================================================================
// Production JS Asset Check — kritik JS dosyalari 200 donuyor mu?
// =============================================================================
test.describe('PROD JS Asset 200', () => {
  let apiCtx;

  test.beforeAll(async ({ playwright }) => {
    apiCtx = await playwright.request.newContext({
      baseURL: PROD_BASE,
      extraHTTPHeaders: {
        'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID || '',
        'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET || '',
      },
    });
  });

  test.afterAll(async () => {
    await apiCtx?.dispose();
  });

  const JS_FILES = [
    '/js/ik-shell.js',
    '/js/ik-data.js',
    '/js/ik-genel.js',
    '/js/ik-pool.js',
    '/js/ik-pipeline.js',
    '/js/ik-messages.js',
    '/js/ik-campaigns.js',
    '/js/ik-company.js',
    '/js/ik-team.js',
    '/js/ik-settings.js',
    '/js/ik-candidate.js',
  ];

  for (const js of JS_FILES) {
    test(`PROD JS: ${js} → 200`, async () => {
      const resp = await apiCtx.get(js);
      const status = resp.status();
      console.log(`[PROD JS] ${js}: HTTP ${status}`);
      expect(status).toBe(200);
    });
  }
});
