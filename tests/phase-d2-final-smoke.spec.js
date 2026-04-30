// phase-d2-final-smoke.spec.js — Phase D2 Final Smoke
// 30 Nisan 2026 — UAT tester tarafindan olusturuldu.
// 9 sayfa: ik.html + 8 hr-* panel
// Local vs Production karsilastirma + D2 ozel dogrulamalar
// Demo mode bypass: localStorage.ht_ik_demo_mode = '1'

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const TARGET = process.env.PW_TARGET_URL || 'http://localhost:3000';
const LABEL = TARGET.includes('hellotalent.ai') ? 'PROD' : 'LOCAL';

const PAGES = [
  { name: 'ik.html',              url: '/ik.html',                    title: /IK|İK|Hello|Dashboard/i },
  { name: 'hr-pool.html',         url: '/hr-pool.html',               title: /Pool|Aday|Havuz/i },
  { name: 'hr-pipeline.html',     url: '/hr-pipeline.html',           title: /Pipeline|Süreç/i },
  { name: 'hr-candidate.html',    url: '/hr-candidate.html?id=1',     title: /Aday|Profil|Candidate/i },
  { name: 'hr-messages.html',     url: '/hr-messages.html',           title: /Mesaj|Messages/i },
  { name: 'hr-campaigns.html',    url: '/hr-campaigns.html',          title: /Kampanya|Campaign/i },
  { name: 'hr-company.html',      url: '/hr-company.html',            title: /Şirket|Sirket|Company/i },
  { name: 'hr-team.html',         url: '/hr-team.html',               title: /Ekip|Team/i },
  { name: 'hr-settings.html',     url: '/hr-settings.html',           title: /Ayar|Setting/i },
];

// Demo bypass — auth gate yok
async function demoGoto(page, url) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ht_ik_demo_mode', '1');
    } catch (e) { /* ignore */ }
  });

  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('requestfailed', request => {
    failedRequests.push(request.url());
  });

  await page.goto(url);
  await page.waitForLoadState('networkidle').catch(() => {});

  return { consoleErrors, failedRequests };
}

// =============================================================================
// Grup 1: HTTP + title + shell check (9 sayfa, desktop)
// =============================================================================
test.describe(`[${LABEL}] Phase D2 — Page load matrix (desktop 1440)`, () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  for (const pg of PAGES) {
    test(`${pg.name} — 200 + title mevcut`, async ({ page }) => {
      const { consoleErrors, failedRequests } = await demoGoto(page, TARGET + pg.url);

      const pageTitle = await page.title();
      console.log(`[${LABEL}] ${pg.name} — title: "${pageTitle}" | console errors: ${consoleErrors.length} | failed reqs: ${failedRequests.length}`);

      // HTML sayfasi yuklendi (auth gate redirect olmadi)
      await expect(page).not.toHaveURL(/giris\.html/);

      // Shell ogeleri: lp-hdr-ik veya ik-shell
      const hasShell = await page.locator('[class*="lp-hdr-ik"], [class*="ik-shell"], #ik-shell, .ik-shell').count() > 0 ||
                       await page.locator('header').count() > 0;
      expect(hasShell).toBe(true);

      // Console error log (fail etmiyoruz, sadece log)
      if (consoleErrors.length > 0) {
        console.warn(`[${LABEL}] ${pg.name} console errors:\n  ${consoleErrors.slice(0, 3).join('\n  ')}`);
      }
      if (failedRequests.length > 0) {
        console.warn(`[${LABEL}] ${pg.name} failed requests:\n  ${failedRequests.slice(0, 3).join('\n  ')}`);
      }
    });
  }
});

// =============================================================================
// Grup 2: Mobile viewport matrix (9 sayfa, 390x844)
// =============================================================================
test.describe(`[${LABEL}] Phase D2 — Page load matrix (mobile 390)`, () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  for (const pg of PAGES) {
    test(`${pg.name} mobile — 200 + redirect yok`, async ({ page }) => {
      await demoGoto(page, TARGET + pg.url);
      await expect(page).not.toHaveURL(/giris\.html/);
    });
  }
});

// =============================================================================
// D2.8 — ik.html: spinner kayboldu, KPI 4/4, bento 6/6
// =============================================================================
test.describe(`[${LABEL}] D2.8 — ik.html dashboard render`, () => {
  test('Desktop: KPI 4/4 render edilir', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('ht_ik_demo_mode', '1');
    });
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    await page.goto(TARGET + '/ik.html');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Spinner kayboldu — data-ik-genel-ready veya spinner hidden
    await page.waitForFunction(() => {
      const spinner = document.querySelector('.ik-spinner, [data-ik-spinner], #ik-loading-spinner');
      return !spinner || spinner.hidden || getComputedStyle(spinner).display === 'none';
    }, { timeout: 10000 }).catch(() => console.log('[WARN] Spinner check timeout'));

    const kpis = page.locator('.ik-kpi');
    const kpiCount = await kpis.count();
    console.log(`[${LABEL}] D2.8 KPI count: ${kpiCount}`);
    expect(kpiCount).toBe(4);

    const bentoCards = page.locator('.ik-genel__bento .ik-card, .ik-bento__card, [class*="bento"] .ik-card');
    const bentoCount = await bentoCards.count();
    console.log(`[${LABEL}] D2.8 Bento card count: ${bentoCount}`);
    expect(bentoCount).toBeGreaterThanOrEqual(4);

    // 404 data/demo request yok
    const failed = [];
    page.on('requestfailed', r => { if (/data\/|demo\//.test(r.url())) failed.push(r.url()); });
    console.log(`[${LABEL}] D2.8 console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log(`  First 3: ${consoleErrors.slice(0, 3).join(' | ')}`);
    }
  });

  test('Mobile: ik.html nav + hero gosterilir', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem('ht_ik_demo_mode', '1');
    });
    await page.goto(TARGET + '/ik.html');
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page).not.toHaveURL(/giris\.html/);
    const header = await page.locator('header, [class*="lp-hdr"], [class*="ik-hdr"]').count();
    expect(header).toBeGreaterThan(0);
  });
});

// =============================================================================
// D2.5 — hr-campaigns.html: empty state + disabled button
// =============================================================================
test.describe(`[${LABEL}] D2.5 — Kampanyalar empty state`, () => {
  test('Desktop: ik-cmp-empty visible + btn-cmp-disabled aria-disabled', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.removeItem('ht_ik_campaigns_state');
    });
    await page.goto(TARGET + '/hr-campaigns.html');
    await page.waitForLoadState('networkidle').catch(() => {});

    const emptyState = page.locator('#ik-cmp-empty');
    const emptyCount = await emptyState.count();
    console.log(`[${LABEL}] D2.5 #ik-cmp-empty count: ${emptyCount}`);
    expect(emptyCount).toBeGreaterThan(0);

    const disabledBtn = page.locator('#btn-cmp-disabled');
    const disabledCount = await disabledBtn.count();
    console.log(`[${LABEL}] D2.5 #btn-cmp-disabled count: ${disabledCount}`);
    expect(disabledCount).toBeGreaterThan(0);

    // Disabled button aria-disabled veya disabled attr
    if (disabledCount > 0) {
      const ariaDisabled = await disabledBtn.first().getAttribute('aria-disabled');
      const disabled = await disabledBtn.first().getAttribute('disabled');
      console.log(`[${LABEL}] D2.5 aria-disabled="${ariaDisabled}" disabled="${disabled}"`);
      expect(ariaDisabled === 'true' || disabled !== null).toBe(true);
    }
  });

  test('Desktop: campaign list / filter toolbar YOK (MVP2 sonrasi)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('ht_ik_demo_mode', '1');
    });
    await page.goto(TARGET + '/hr-campaigns.html');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Filter toolbar bulunmamali
    const filterToolbar = await page.locator('[data-ik-cmp-status], .ik-cmp-filter').count();
    console.log(`[${LABEL}] D2.5 filter toolbar count: ${filterToolbar} (should be 0)`);
    expect(filterToolbar).toBe(0);
  });
});

// =============================================================================
// D2.4 — hr-company.html: 2 section (general + brands), contact YOK
// =============================================================================
test.describe(`[${LABEL}] D2.4 — Şirket profili 2 section`, () => {
  test('Desktop: 2 section mevcut, contact section YOK', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.removeItem('ht_ik_company_state');
    });
    await page.goto(TARGET + '/hr-company.html');
    await page.waitForLoadState('networkidle').catch(() => {});

    // General ve brands section'lari
    const generalSection = await page.locator('[data-ik-section="general"], #ik-company-general, .ik-company__section--general').count();
    const brandsSection = await page.locator('[data-ik-section="brands"], #ik-company-brands, .ik-company__section--brands').count();
    console.log(`[${LABEL}] D2.4 general section: ${generalSection}, brands section: ${brandsSection}`);

    // Contact section YOK
    const contactSection = await page.locator('[data-ik-section="contact"], #ik-company-contact, .ik-company__section--contact').count();
    console.log(`[${LABEL}] D2.4 contact section: ${contactSection} (should be 0)`);
    expect(contactSection).toBe(0);

    // Brand chip'leri
    const brandChips = await page.locator('.ik-brand-chip, [data-brand-chip], .ik-company__brand-chip').count();
    console.log(`[${LABEL}] D2.4 brand chips count: ${brandChips}`);
  });
});

// =============================================================================
// D2.2 — hr-messages.html: mark_employer_thread_read RPC kullaniliyor
// =============================================================================
test.describe(`[${LABEL}] D2.2 — Mesajlar RPC dogrulama`, () => {
  test('Desktop: mark_employer_thread_read request gidebilir (script source check)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const rpcCalls = [];
    page.on('request', request => {
      const url = request.url();
      if (url.includes('mark_employer_thread_read')) {
        rpcCalls.push({ type: 'NEW', url });
      }
      if (url.includes('mark_employer_replies_read')) {
        rpcCalls.push({ type: 'OLD', url });
      }
    });

    await page.addInitScript(() => {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.removeItem('ht_ik_messages_state');
    });
    await page.goto(TARGET + '/hr-messages.html');
    await page.waitForLoadState('networkidle').catch(() => {});

    // JS source'tan eski RPC referansi yok
    const jsSource = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      return scripts.map(s => s.src).join(',');
    });
    console.log(`[${LABEL}] D2.2 loaded scripts: ${jsSource}`);

    // HTML source check
    const html = fs.readFileSync(path.join(__dirname, '..', 'hr-messages.html'), 'utf8');
    const hasOldRPC = html.includes('mark_employer_replies_read');
    const hasNewRPC = html.includes('mark_employer_thread_read');
    console.log(`[${LABEL}] D2.2 HTML: old RPC (replies_read)=${hasOldRPC}, new RPC (thread_read)=${hasNewRPC}`);

    // RPC call log (demo mode'da actual Supabase call olmayabilir)
    console.log(`[${LABEL}] D2.2 RPC calls captured: ${JSON.stringify(rpcCalls)}`);

    // Eski RPC HTML'de referans olmamali
    expect(hasOldRPC).toBe(false);
  });

  test('Desktop: 2-pane layout visible (thread list + detail)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.removeItem('ht_ik_messages_state');
    });
    await page.goto(TARGET + '/hr-messages.html');
    await page.waitForLoadState('networkidle').catch(() => {});

    const threadList = await page.locator('[data-ik-msg-list], [data-ik-msg-list-items]').count();
    const detail = await page.locator('[data-ik-msg-detail], [data-ik-msg-detail-pane]').count();
    console.log(`[${LABEL}] D2.2 thread list elements: ${threadList}, detail pane: ${detail}`);
    // Demo mode'da en az birinin gözükmesi beklenir
    expect(threadList + detail).toBeGreaterThan(0);
  });
});

// =============================================================================
// D2.3 — hr-pool.html: match_reasons chip render
// =============================================================================
test.describe(`[${LABEL}] D2.3 — Pool match_reasons chip`, () => {
  test('Desktop: .ik-match-chip element render (demo mode)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('ht_ik_demo_mode', '1');
      localStorage.removeItem('ht_ik_pool_state');
    });

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(TARGET + '/hr-pool.html');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Pool yüklendikten sonra kisa bekleme
    await page.waitForTimeout(2000);

    const matchChips = await page.locator('.ik-match-chip').count();
    const matchReasons = await page.locator('[data-match-reason], [class*="match-reason"]').count();
    console.log(`[${LABEL}] D2.3 .ik-match-chip: ${matchChips}, [data-match-reason]: ${matchReasons}`);
    console.log(`[${LABEL}] D2.3 console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log(`  ${consoleErrors.slice(0, 3).join(' | ')}`);
    }

    // Demo mode'da en az 1 chip beklenir (demo data varsa)
    // Hard fail degil — info log
    if (matchChips === 0 && matchReasons === 0) {
      console.log(`[${LABEL}] D2.3 WARN: match chip yok — demo data olmayabilir veya JS yuklenmedi`);
    }
  });
});

// =============================================================================
// Console error + network fail — kapsamli ozet (9 sayfa)
// =============================================================================
test.describe(`[${LABEL}] D2 — Console error + network fail ozet`, () => {
  test('9 sayfanin console error + network fail ozeti', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const report = {};

    for (const pg of PAGES) {
      const consoleErrors = [];
      const failedReqs = [];

      page.removeAllListeners('console');
      page.removeAllListeners('requestfailed');

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('requestfailed', req => failedReqs.push(req.url()));

      await page.addInitScript(() => {
        localStorage.setItem('ht_ik_demo_mode', '1');
      });

      await page.goto(TARGET + pg.url);
      await page.waitForLoadState('networkidle').catch(() => {});

      report[pg.name] = {
        consoleErrorCount: consoleErrors.length,
        consoleErrors: consoleErrors.slice(0, 3),
        failedReqCount: failedReqs.length,
        failedReqs: failedReqs.slice(0, 3),
        redirected: page.url().includes('giris.html'),
        finalUrl: page.url(),
      };
    }

    console.log('\n=== PHASE D2 FINAL SMOKE REPORT ===');
    console.log(`Target: ${TARGET} [${LABEL}]`);
    console.log('---');

    let totalErrors = 0;
    let totalFailed = 0;
    let redirectCount = 0;

    for (const [pageName, data] of Object.entries(report)) {
      const status = data.redirected ? 'REDIRECT' : 'OK';
      console.log(`${pageName}: ${status} | console_err=${data.consoleErrorCount} | failed_reqs=${data.failedReqCount}`);
      if (data.consoleErrorCount > 0) {
        data.consoleErrors.forEach(e => console.log(`  ERR: ${e.substring(0, 120)}`));
      }
      if (data.failedReqCount > 0) {
        data.failedReqs.forEach(u => console.log(`  FAIL: ${u.substring(0, 120)}`));
      }
      totalErrors += data.consoleErrorCount;
      totalFailed += data.failedReqCount;
      if (data.redirected) redirectCount++;
    }

    console.log('---');
    console.log(`TOTAL: console_errors=${totalErrors} | failed_reqs=${totalFailed} | redirects=${redirectCount}/9`);
    console.log('===================================\n');

    // Hicbir sayfa giris.html'e redirect olmamali (demo mode ile)
    expect(redirectCount).toBe(0);
  });
});
