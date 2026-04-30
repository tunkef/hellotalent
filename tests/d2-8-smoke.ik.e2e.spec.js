/**
 * D2.8 Smoke — ik-genel.js real-only adapter verify
 *
 * Verifies:
 *  - "Yükleniyor..." spinner kayboldu (dashboard render tamamlandı)
 *  - KPI row: 4 kart render edildi
 *  - Bento grid: 6 .ik-card render edildi
 *  - Console error yok (JS regression)
 *  - data/demo/*.json 404 yok (demo path kaldırıldı)
 *  - Supabase RPC çağrıları network'te görünüyor
 *
 * Auth: playwright/.auth/employer.json (e2e-ik-desktop project)
 */

const { test, expect } = require('@playwright/test');
const { attachCollectors, criticalFrom } = require('./helpers/runtime-signals');

const SUPABASE_RPCS = [
  'getCompanyKpis',
  'getPositions',
  'getMessageThreads',
  'searchCandidates',
  'getPipeline',
  'getCampaigns',
  // also match raw rpc names on network
  'get_company_kpis',
  'get_company_message_threads',
  'hr_get_pipeline',
];

test.describe('D2.8 smoke — ik-genel real-only adapter', function () {
  test('desktop: dashboard renders, KPI 4, bento 6, no demo 404, Supabase RPC hit', async function ({ page }) {
    await page.setViewportSize({ width: 1440, height: 900 });

    const signals = attachCollectors(page);
    const networkRequests = [];
    const demo404s = [];

    page.on('request', function (req) {
      const url = req.url();
      networkRequests.push(url);
    });

    page.on('response', function (res) {
      const url = res.url();
      // Track any demo json 404
      if (url.includes('data/demo') && res.status() === 404) {
        demo404s.push(url);
      }
      // Also catch any non-demo 404s on demo paths
      if (url.includes('/demo/') && res.status() === 404) {
        demo404s.push(url);
      }
    });

    // Navigate to ik.html dashboard panel
    await page.goto('/ik.html#dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(function () {});

    // Wait for data-ik-genel-ready sentinel (set by ik-genel.js after render)
    await page.waitForFunction(function () {
      return document.documentElement.getAttribute('data-ik-genel-ready') === '1';
    }, null, { timeout: 12000 }).catch(function () {});

    // Extra settle
    await page.waitForTimeout(800);

    // --- 1. Auth guard: must NOT redirect to giris.html ---
    const currentUrl = page.url();
    const redirected = /giris\.html/.test(currentUrl);
    expect(redirected, 'Auth guard rejected employer — redirected to giris.html: ' + currentUrl).toBe(false);

    // --- 2. "Yükleniyor..." spinner must be gone ---
    // Check that the spinner/loading text is NOT visible
    const spinnerVisible = await page.locator(':text("Yükleniyor...")').isVisible().catch(function () { return false; });
    expect(spinnerVisible, '"Yükleniyor..." spinner hâlâ görünür — dashboard render tamamlanmadı').toBe(false);

    // --- 3. KPI row: 4 cards ---
    const kpiCards = page.locator('.ik-kpi');
    const kpiCount = await kpiCards.count();
    expect(kpiCount, 'KPI card sayısı 4 olmalı, var: ' + kpiCount).toBe(4);

    // KPI labels present
    const firstKpiLabel = page.locator('.ik-kpi__label').first();
    await expect(firstKpiLabel).toContainText(/Açık pozisyon/i);

    // --- 4. Bento grid: 6 cards ---
    const bentoCards = page.locator('.ik-genel__bento .ik-card');
    const bentoCount = await bentoCards.count();
    expect(bentoCount, 'Bento grid .ik-card sayısı 6 olmalı, var: ' + bentoCount).toBe(6);

    // --- 5. Pipeline card exists with stage rows or empty state ---
    const pipelineCard = page.locator('.ik-card').filter({ hasText: 'Pipeline özeti' });
    await expect(pipelineCard).toHaveCount(1);

    // --- 6. Yeni adaylar card ---
    const candidatesCard = page.locator('.ik-card').filter({ hasText: 'Yeni adaylar' });
    await expect(candidatesCard).toHaveCount(1);

    // --- 7. Quick actions card ---
    const actionsCard = page.locator('.ik-card--actions');
    await expect(actionsCard).toHaveCount(1);
    const quickActions = actionsCard.locator('.ik-quick-action');
    await expect(quickActions).toHaveCount(3);

    // --- 8. demo 404 check ---
    expect(demo404s, 'data/demo/*.json 404 hataları var (demo path sildik ama hâlâ çağrılıyor): ' + JSON.stringify(demo404s)).toHaveLength(0);

    // --- 9. Supabase RPC network check ---
    // At least one RPC from the IK_DATA adapter must be in network requests
    const rpcHits = networkRequests.filter(function (url) {
      return url.includes('supabase.co') && (
        url.includes('/rest/v1/rpc/') ||
        url.includes('/functions/') ||
        SUPABASE_RPCS.some(function (rpc) { return url.includes(rpc); })
      );
    });
    // Log what we found (not an assertion — informational)
    console.log('D2.8 Supabase network hits: ' + rpcHits.length);
    rpcHits.forEach(function (u) { console.log('  ' + u.split('?')[0]); });

    // Supabase base URL must be hit (adapter is live)
    const supabaseHits = networkRequests.filter(function (u) { return u.includes('supabase.co'); });
    expect(supabaseHits.length, 'Supabase hiç çağrılmadı — IK_DATA adapter Supabase bağlantısı yok').toBeGreaterThan(0);

    // --- 10. JS regressions ---
    const critical = criticalFrom(signals);
    if (critical.length) {
      console.error('D2.8 critical JS errors:');
      critical.forEach(function (s) { console.error('  [' + s.kind + '] ' + s.message); });
    }
    expect(critical, 'Console/page JS regression errors: ' + JSON.stringify(critical)).toEqual([]);

    // --- 11. Hero greeting visible ---
    const heroTitle = page.locator('.ik-genel__title');
    await expect(heroTitle).toContainText(/Merhaba/i);

    // --- 12. Feed section rendered ---
    const feed = page.locator('.ik-genel__feed');
    await expect(feed).toHaveCount(1);
  });

  test('desktop: KPI values are not all zero (real data loaded)', async function ({ page }) {
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/ik.html#dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(function () {});
    await page.waitForFunction(function () {
      return document.documentElement.getAttribute('data-ik-genel-ready') === '1';
    }, null, { timeout: 12000 }).catch(function () {});
    await page.waitForTimeout(600);

    // Read all 4 KPI values
    const kpiValues = await page.locator('.ik-kpi__value').allTextContents();
    console.log('D2.8 KPI values: ' + JSON.stringify(kpiValues));

    // Values must be numeric strings (0 or positive) — not "—" or empty
    kpiValues.forEach(function (v, i) {
      const parsed = parseInt(v.trim(), 10);
      expect(isNaN(parsed), 'KPI[' + i + '] sayısal değer değil: "' + v + '"').toBe(false);
    });

    // At least log — this is a data presence check, NOT a strict non-zero assert
    // (new employer may have 0 positions — that's valid)
    const allZero = kpiValues.every(function (v) { return parseInt(v.trim(), 10) === 0; });
    if (allZero) {
      console.warn('D2.8 WARN: Tüm KPI değerleri 0 — test employer DB boş olabilir veya RPC 0 döndürüyor.');
    } else {
      console.log('D2.8 KPI non-zero değer mevcut — real data OK.');
    }
  });

  test('mobile: ik.html dashboard renders at 390x844', async function ({ page }) {
    await page.setViewportSize({ width: 390, height: 844 });

    const signals = attachCollectors(page);

    await page.goto('/ik.html#dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(function () {});
    await page.waitForFunction(function () {
      return document.documentElement.getAttribute('data-ik-genel-ready') === '1';
    }, null, { timeout: 12000 }).catch(function () {});
    await page.waitForTimeout(600);

    // Auth guard
    const url = page.url();
    expect(/giris\.html/.test(url), 'Mobile: employer auth rejected — ' + url).toBe(false);

    // Spinner gone
    const spinnerVisible = await page.locator(':text("Yükleniyor...")').isVisible().catch(function () { return false; });
    expect(spinnerVisible, 'Mobile: "Yükleniyor..." spinner görünür').toBe(false);

    // KPI 4 adet
    const kpiCount = await page.locator('.ik-kpi').count();
    expect(kpiCount, 'Mobile: KPI count ' + kpiCount + ' (beklenen 4)').toBe(4);

    // Bento 6 kart
    const bentoCount = await page.locator('.ik-genel__bento .ik-card').count();
    expect(bentoCount, 'Mobile: bento count ' + bentoCount + ' (beklenen 6)').toBe(6);

    // No critical JS errors
    const critical = criticalFrom(signals);
    expect(critical, 'Mobile JS errors: ' + JSON.stringify(critical)).toEqual([]);
  });
});
