/**
 * D2.8 realMode diagnostic — IK_DATA.realMode() + IK_SHELL.ctx kontrol
 *
 * Test: realMode() true mu dönüyor? Supabase çağrısı gerçekten atılıyor mu?
 * KPI değerleri 0 ise sebep: realMode false (ctx yok) mu, DB boş mu?
 */

const { test, expect } = require('@playwright/test');

test.describe('D2.8 realMode diagnostic', function () {
  test('IK_SHELL ctx + realMode + Supabase fetch verify', async function ({ page }) {
    await page.setViewportSize({ width: 1440, height: 900 });

    const supabaseRequests = [];
    page.on('request', function (req) {
      const url = req.url();
      if (url.includes('supabase.co')) {
        supabaseRequests.push({
          url: url.split('?')[0],
          method: req.method(),
        });
      }
    });

    await page.goto('/ik.html#dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(function () {});

    // Wait for ik-genel ready
    await page.waitForFunction(function () {
      return document.documentElement.getAttribute('data-ik-genel-ready') === '1';
    }, null, { timeout: 12000 }).catch(function () {});
    await page.waitForTimeout(1000);

    // Evaluate IK_SHELL ctx from page
    const ctxState = await page.evaluate(function () {
      var shell = window.IK_SHELL;
      var ht    = window.HT;
      var data  = window.IK_DATA;

      var hasHT    = typeof ht === 'object' && ht !== null;
      var hasSupa  = hasHT && typeof ht.getSupa === 'function' && !!ht.getSupa();
      var hasShell = typeof shell === 'object' && shell !== null;
      var hasCtx   = hasShell && typeof shell.ctx === 'object' && shell.ctx !== null;
      var hasHr    = hasCtx && typeof shell.ctx.hr === 'object' && shell.ctx.hr !== null;
      var companyId = hasHr ? shell.ctx.hr.company_id : null;
      var userId    = (hasCtx && shell.ctx.user) ? shell.ctx.user.id : null;
      var hrEmail   = (hasCtx && shell.ctx.user) ? shell.ctx.user.email : null;

      // realMode logic mimic
      var realModeResult = hasHT && hasSupa && hasShell && hasCtx && hasHr;

      return {
        hasHT:        hasHT,
        hasSupa:      hasSupa,
        hasShell:     hasShell,
        hasCtx:       hasCtx,
        hasHr:        hasHr,
        companyId:    companyId,
        userId:       userId ? userId.substring(0, 8) + '...' : null,
        hrEmail:      hrEmail,
        realMode:     realModeResult,
        genel_ready:  document.documentElement.getAttribute('data-ik-genel-ready'),
        kpiValues:    Array.from(document.querySelectorAll('.ik-kpi__value')).map(function (e) { return e.textContent.trim(); }),
        bentoCount:   document.querySelectorAll('.ik-genel__bento .ik-card').length,
      };
    });

    console.log('--- D2.8 realMode diagnostic ---');
    console.log('HT object:        ' + ctxState.hasHT);
    console.log('Supabase client:  ' + ctxState.hasSupa);
    console.log('IK_SHELL:         ' + ctxState.hasShell);
    console.log('ctx:              ' + ctxState.hasCtx);
    console.log('ctx.hr:           ' + ctxState.hasHr);
    console.log('company_id:       ' + ctxState.companyId);
    console.log('user_id:          ' + ctxState.userId);
    console.log('hr_email:         ' + ctxState.hrEmail);
    console.log('realMode():       ' + ctxState.realMode);
    console.log('genel_ready:      ' + ctxState.genel_ready);
    console.log('KPI values:       ' + JSON.stringify(ctxState.kpiValues));
    console.log('Bento count:      ' + ctxState.bentoCount);
    console.log('Supabase reqs:    ' + supabaseRequests.length);
    supabaseRequests.forEach(function (r) {
      console.log('  [' + r.method + '] ' + r.url);
    });
    console.log('--- end diagnostic ---');

    // Assertions
    expect(ctxState.hasHT,   'window.HT yok — shared.js yüklenmedi mi?').toBe(true);
    expect(ctxState.hasSupa, 'HT.getSupa() null — Supabase client init olmadı').toBe(true);
    expect(ctxState.hasShell,'window.IK_SHELL yok — ik-shell.js yüklenmedi mi?').toBe(true);
    expect(ctxState.hasCtx,  'IK_SHELL.ctx null — employer login tamamlanmadı').toBe(true);
    expect(ctxState.hasHr,   'IK_SHELL.ctx.hr null — hr_profiles row yok (company_id bağlantısı yok?)').toBe(true);
    expect(ctxState.realMode, 'realMode() false — empty state render ediliyor, Supabase çağrısı yok').toBe(true);
    expect(ctxState.genel_ready, 'data-ik-genel-ready sentinel set edilmedi').toBe('1');
    expect(ctxState.bentoCount, 'Bento kart sayısı 6 değil: ' + ctxState.bentoCount).toBe(6);
    expect(supabaseRequests.length, 'Supabase hiç çağrılmadı — realMode false veya adapter init olmadı').toBeGreaterThan(0);
  });
});
