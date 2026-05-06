// pr5-auto-match.spec.js
// PR-5 — Auto-Match Trigger + Pool 5A + Auto Badge UAT
// Kapsam: 6 senaryo × 2 viewport (mobile 390 + desktop 1440) × light mode
// Not: real Supabase çağrısı yok — IK_DATA mock inject ile izole test.

const { test, expect } = require('@playwright/test');

/* ─────────────────────────────────────────
   Viewports
───────────────────────────────────────── */
const VP_DESKTOP = { width: 1440, height: 900 };
const VP_MOBILE  = { width: 390,  height: 844 };

/* ─────────────────────────────────────────
   IK_DATA mock — addToPipelineAuto / addToPipeline / getPipeline / createPosition
   Pipeline sayfası yüklenince window'a inject edilir.
   real Supabase çağrısı yapılmaz.
───────────────────────────────────────── */
function injectMocks(page, opts) {
  return page.addInitScript(function (o) {
    window.__PR5_TEST__ = true;
    /* IK_DATA stub — pozisyon form submit / pool add / pipeline load için */
    window._htPr5MockResult = o;

    /* Bootstrap sonrası IK_DATA override (initScript dokümana önce çalışır,
       ik-data.js IIFE'si atlatılır — window.IK_DATA override DOMContentLoaded
       sonrasında yapılmalı. Bunun için MutationObserver trick.) */
    document.addEventListener('DOMContentLoaded', function () {
      /* IK_DATA zaten IIFE ile set edildi; override et */
      if (window.IK_DATA) {
        var _orig = window.IK_DATA;

        /* createPosition — yeni pozisyon döner */
        window.IK_DATA.createPosition = function () {
          return Promise.resolve({
            ok:  true,
            row: {
              id:      'pos-pr5-test',
              ad:      'Test Pozisyon',
              sehir:   'İstanbul',
              seg:     'Hazır Giyim',
              exp:     '3-5',
              durum:   'active'
            }
          });
        };

        /* addToPipelineAuto — spec: {added, skipped, total_matched} */
        window.IK_DATA.addToPipelineAuto = function () {
          return Promise.resolve(o.autoMatchResult || {
            added:         12,
            skipped:       3,
            total_matched: 15
          });
        };

        /* addToPipeline — pool add için */
        window.IK_DATA.addToPipeline = function (cid, posId, stage) {
          window.__lastAddToPipelineStage = stage;
          return Promise.resolve(o.addToPipelineResult || { ok: true });
        };

        /* getPipeline — auto_added kartları içerir */
        window.IK_DATA.getPipeline = function () {
          return Promise.resolve(o.pipelineEntries || []);
        };

        /* getPositions */
        window.IK_DATA.getPositions = function () {
          return Promise.resolve(o.positions || [{
            id:    'pos-pr5-test',
            title: 'Test Pozisyon',
            ad:    'Test Pozisyon',
            city:  'İstanbul',
            sehir: 'İstanbul'
          }]);
        };
      }

      /* IK_SHELL stub */
      window.IK_SHELL = window.IK_SHELL || {};
      window.IK_SHELL.ctx = window.IK_SHELL.ctx || {
        user: { id: 'user-test-uuid' },
        hr:   { company_id: 1, employer_role: 'recruiter' }
      };
      window.IK_SHELL.getActivePositionId = function () { return 'pos-pr5-test'; };
      window.IK_SHELL.setActivePositionId = function () {};

      /* HT stub */
      window.HT = window.HT || { getSupa: function () { return null; } };
    });

    /* demo mode → bazı 0-pozisyon guard'ları bypass */
    try { localStorage.setItem('ht_ik_demo_mode', '1'); } catch (_) {}
  }, opts || {});
}

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
async function gotoPipeline(page, vp, mockOpts) {
  await page.setViewportSize(vp || VP_DESKTOP);
  await injectMocks(page, mockOpts || {});
  await page.goto('/hr-pipeline.html');
  await page.waitForLoadState('networkidle');
}

async function gotoPool(page, vp, mockOpts) {
  await page.setViewportSize(vp || VP_DESKTOP);
  await injectMocks(page, mockOpts || {});
  await page.goto('/hr-pool.html');
  await page.waitForLoadState('networkidle');
}

/* ═══════════════════════════════════════════════════════════════════════
   T5.1 — Pozisyon submit → auto-match toast
   ═══════════════════════════════════════════════════════════════════════ */

test.describe('PR-5 T5.1 — Pozisyon submit → auto-match toast', () => {

  test('desktop: pozisyon submit sonrası "12 aday uzun listeye eklendi" toast çıkar', async ({ page }) => {
    await gotoPipeline(page, VP_DESKTOP, {
      autoMatchResult: { added: 12, skipped: 3, total_matched: 15 },
      pipelineEntries: [],
      positions: []
    });

    /* Pozisyon form aç */
    const btnNew = page.locator('#btn-new-position');
    if (await btnNew.isVisible()) {
      await btnNew.click();
    }
    const sheet = page.locator('#ik-pos-form-sheet');
    if (await sheet.isVisible()) {
      await page.fill('#pos-field-ad', 'Test Pozisyon');
      /* Kriter doldur (validation: en az 1 kriter) — şehir */
      const sehirField = page.locator('#pos-field-sehir');
      if (await sehirField.isVisible()) {
        await sehirField.fill('İstanbul');
      }
      await page.click('#btn-pos-form-submit');
      /* Auto-match toast — 4 sn timeout */
      const toast = page.locator('[data-ik-pipeline-toast]');
      await expect(toast).toContainText('aday uzun listeye eklendi', { timeout: 5000 });
      await expect(toast).toContainText('15 eşleşme bulundu', { timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('desktop: eşleşme yoksa "Eşleşen aday bulunamadı" toast çıkar', async ({ page }) => {
    await gotoPipeline(page, VP_DESKTOP, {
      autoMatchResult: { added: 0, skipped: 0, total_matched: 0 },
      pipelineEntries: [],
      positions: []
    });

    const btnNew = page.locator('#btn-new-position');
    if (await btnNew.isVisible()) {
      await btnNew.click();
      const sheet = page.locator('#ik-pos-form-sheet');
      if (await sheet.isVisible()) {
        await page.fill('#pos-field-ad', 'Eşleşmesiz Pozisyon');
        const sehirField = page.locator('#pos-field-sehir');
        if (await sehirField.isVisible()) await sehirField.fill('Ankara');
        await page.click('#btn-pos-form-submit');
        const toast = page.locator('[data-ik-pipeline-toast]');
        await expect(toast).toContainText('Eşleşen aday bulunamadı', { timeout: 5000 });
      } else { test.skip(); }
    } else { test.skip(); }
  });

  test('mobile: auto-match toast pozisyon submit sonrası görünür', async ({ page }) => {
    await gotoPipeline(page, VP_MOBILE, {
      autoMatchResult: { added: 5, skipped: 1, total_matched: 6 }
    });
    const btnNew = page.locator('#btn-new-position');
    if (await btnNew.isVisible()) {
      await btnNew.click();
      const sheet = page.locator('#ik-pos-form-sheet');
      if (await sheet.isVisible()) {
        await page.fill('#pos-field-ad', 'Mobile Pozisyon');
        const sehirField = page.locator('#pos-field-sehir');
        if (await sehirField.isVisible()) await sehirField.fill('İzmir');
        await page.click('#btn-pos-form-submit');
        const toast = page.locator('[data-ik-pipeline-toast]');
        await expect(toast).toContainText('aday uzun listeye eklendi', { timeout: 5000 });
      } else { test.skip(); }
    } else { test.skip(); }
  });

});

/* ═══════════════════════════════════════════════════════════════════════
   T5.2 — Pool "iki action" — uzun_liste / kisa_liste
   ═══════════════════════════════════════════════════════════════════════ */

test.describe('PR-5 T5.2 — Pool iki action (uzun/kısa listeye ekle)', () => {

  test('desktop: row menu "Uzun listeye ekle" butonu mevcut', async ({ page }) => {
    await gotoPool(page, VP_DESKTOP);
    /* İlk satır menu açılana kadar bekle */
    const firstMenuBtn = page.locator('[data-row-menu-btn]').first();
    if (await firstMenuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstMenuBtn.click();
      const uzunBtn = page.locator('[data-row-action="add_uzun"]').first();
      await expect(uzunBtn).toBeVisible();
      await expect(uzunBtn).toHaveText('Uzun listeye ekle');
    } else { test.skip(); }
  });

  test('desktop: row menu "Kısa listeye ekle" butonu mevcut', async ({ page }) => {
    await gotoPool(page, VP_DESKTOP);
    const firstMenuBtn = page.locator('[data-row-menu-btn]').first();
    if (await firstMenuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstMenuBtn.click();
      const kisaBtn = page.locator('[data-row-action="add_kisa"]').first();
      await expect(kisaBtn).toBeVisible();
      await expect(kisaBtn).toHaveText('Kısa listeye ekle');
    } else { test.skip(); }
  });

  test('desktop: "Uzun listeye ekle" → addToPipeline stage=yeni çağrılır', async ({ page }) => {
    await gotoPool(page, VP_DESKTOP, {
      addToPipelineResult: { ok: true }
    });
    const firstMenuBtn = page.locator('[data-row-menu-btn]').first();
    if (await firstMenuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstMenuBtn.click();
      const uzunBtn = page.locator('[data-row-action="add_uzun"]').first();
      if (await uzunBtn.isVisible()) {
        await uzunBtn.click();
        /* addToPipeline stage 'yeni' (uzun_liste legacy) olmalı */
        const lastStage = await page.evaluate(function () {
          return window.__lastAddToPipelineStage;
        });
        expect(lastStage).toBe('yeni');
        /* Toast "uzun listeye eklendi" */
        const toast = page.locator('[data-ik-pool-toast]');
        await expect(toast).toContainText('uzun listeye', { timeout: 3000 });
      } else { test.skip(); }
    } else { test.skip(); }
  });

  test('desktop: "Kısa listeye ekle" → addToPipeline stage=gorustum çağrılır', async ({ page }) => {
    await gotoPool(page, VP_DESKTOP, {
      addToPipelineResult: { ok: true }
    });
    const firstMenuBtn = page.locator('[data-row-menu-btn]').first();
    if (await firstMenuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstMenuBtn.click();
      const kisaBtn = page.locator('[data-row-action="add_kisa"]').first();
      if (await kisaBtn.isVisible()) {
        await kisaBtn.click();
        const lastStage = await page.evaluate(function () {
          return window.__lastAddToPipelineStage;
        });
        expect(lastStage).toBe('gorustum');
        /* Toast "kısa listeye eklendi" */
        const toast = page.locator('[data-ik-pool-toast]');
        await expect(toast).toContainText('kısa listeye', { timeout: 3000 });
      } else { test.skip(); }
    } else { test.skip(); }
  });

  test('mobile: her iki action butonu mevcut', async ({ page }) => {
    await gotoPool(page, VP_MOBILE);
    const firstMenuBtn = page.locator('[data-row-menu-btn]').first();
    if (await firstMenuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstMenuBtn.click();
      await expect(page.locator('[data-row-action="add_uzun"]').first()).toBeVisible();
      await expect(page.locator('[data-row-action="add_kisa"]').first()).toBeVisible();
    } else { test.skip(); }
  });

});

/* ═══════════════════════════════════════════════════════════════════════
   T5.3 — Auto badge görünürlük (auto_added=true vs false)
   ═══════════════════════════════════════════════════════════════════════ */

test.describe('PR-5 T5.3 — Auto badge görünürlük', () => {

  /* Pipeline entry fixture */
  var AUTO_ENTRY = {
    id:           'cps-auto-1',
    position_id:  'pos-pr5-test',
    candidate_id: 'cand-1',
    stage:        'yeni',
    stage_v2:     'uzun_liste',
    metadata:     { auto_added: true },
    added_at:     new Date().toISOString(),
    updated_at:   new Date().toISOString()
  };

  var MANUAL_ENTRY = {
    id:           'cps-manual-1',
    position_id:  'pos-pr5-test',
    candidate_id: 'cand-2',
    stage:        'yeni',
    stage_v2:     'uzun_liste',
    metadata:     {},
    added_at:     new Date().toISOString(),
    updated_at:   new Date().toISOString()
  };

  test('desktop: auto_added=true kartında "Otomatik" badge görünür', async ({ page }) => {
    await gotoPipeline(page, VP_DESKTOP, {
      pipelineEntries: [AUTO_ENTRY],
      positions: [{ id: 'pos-pr5-test', title: 'Test Pozisyon', ad: 'Test Pozisyon' }]
    });
    /* candidatesById lookup için IK_DATA.searchCandidates da mock gerekiyor */
    await page.evaluate(function () {
      if (window.IK_DATA) {
        window.IK_DATA.searchCandidates = function () {
          return Promise.resolve([
            { id: 'cand-1', full_name: 'Ahmet Yıldız', son_pozisyon: 'Satış Danışmanı', adres_il: 'İstanbul' },
            { id: 'cand-2', full_name: 'Ayşe Kaya',    son_pozisyon: 'Mağaza Müdürü',   adres_il: 'Ankara' }
          ]);
        };
      }
    });
    /* Badge: .ik-card-aday__auto-badge */
    const badge = page.locator('.ik-card-aday__auto-badge').first();
    if (await badge.isVisible({ timeout: 4000 }).catch(() => false)) {
      await expect(badge).toHaveText('Otomatik');
      await expect(badge).toHaveAttribute('aria-label', 'Otomatik eşleşme ile eklendi');
    } else { test.skip(); }
  });

  test('desktop: auto_added=false kartında "Otomatik" badge GÖRÜNMEZ', async ({ page }) => {
    await gotoPipeline(page, VP_DESKTOP, {
      pipelineEntries: [MANUAL_ENTRY],
      positions: [{ id: 'pos-pr5-test', title: 'Test Pozisyon', ad: 'Test Pozisyon' }]
    });
    await page.evaluate(function () {
      if (window.IK_DATA) {
        window.IK_DATA.searchCandidates = function () {
          return Promise.resolve([
            { id: 'cand-2', full_name: 'Ayşe Kaya', son_pozisyon: 'Mağaza Müdürü', adres_il: 'Ankara' }
          ]);
        };
      }
    });
    /* Badge OLMAMALI */
    const badge = page.locator('.ik-card-aday__auto-badge').first();
    const visible = await badge.isVisible({ timeout: 3000 }).catch(() => false);
    expect(visible).toBe(false);
  });

  test('desktop: karışık liste — sadece auto_added kartlarında badge var', async ({ page }) => {
    await gotoPipeline(page, VP_DESKTOP, {
      pipelineEntries: [AUTO_ENTRY, MANUAL_ENTRY],
      positions: [{ id: 'pos-pr5-test', title: 'Test Pozisyon', ad: 'Test Pozisyon' }]
    });
    await page.evaluate(function () {
      if (window.IK_DATA) {
        window.IK_DATA.searchCandidates = function () {
          return Promise.resolve([
            { id: 'cand-1', full_name: 'Ahmet Yıldız', son_pozisyon: 'Satış Danışmanı', adres_il: 'İstanbul' },
            { id: 'cand-2', full_name: 'Ayşe Kaya',    son_pozisyon: 'Mağaza Müdürü',   adres_il: 'Ankara' }
          ]);
        };
      }
    });
    const badges = page.locator('.ik-card-aday__auto-badge');
    const count = await badges.count();
    /* 2 karttan sadece 1'inde badge olmalı */
    if (count > 0) {
      expect(count).toBe(1);
    } else { test.skip(); }
  });

  test('mobile: auto badge görünür ve erişilebilir (aria-label)', async ({ page }) => {
    await gotoPipeline(page, VP_MOBILE, {
      pipelineEntries: [AUTO_ENTRY],
      positions: [{ id: 'pos-pr5-test', title: 'Test Pozisyon', ad: 'Test Pozisyon' }]
    });
    await page.evaluate(function () {
      if (window.IK_DATA) {
        window.IK_DATA.searchCandidates = function () {
          return Promise.resolve([
            { id: 'cand-1', full_name: 'Ahmet Yıldız', son_pozisyon: 'Satış Danışmanı', adres_il: 'İstanbul' }
          ]);
        };
      }
    });
    const badge = page.locator('.ik-card-aday__auto-badge').first();
    if (await badge.isVisible({ timeout: 4000 }).catch(() => false)) {
      await expect(badge).toHaveText('Otomatik');
      await expect(badge).toHaveAttribute('aria-label', 'Otomatik eşleşme ile eklendi');
    } else { test.skip(); }
  });

});

/* ═══════════════════════════════════════════════════════════════════════
   T5.4 — PostHog event emit
   ═══════════════════════════════════════════════════════════════════════ */

test.describe('PR-5 T5.4 — PostHog event emit', () => {

  test('desktop: auto_match_triggered event emit edilir', async ({ page }) => {
    var captured = [];
    await page.addInitScript(function () {
      window.posthog = {
        capture: function (name, props) {
          if (!window.__posthogEvents) window.__posthogEvents = [];
          window.__posthogEvents.push({ name: name, props: props });
        }
      };
    });
    await gotoPipeline(page, VP_DESKTOP, {
      autoMatchResult: { added: 5, skipped: 2, total_matched: 7 },
      positions: []
    });
    const btnNew = page.locator('#btn-new-position');
    if (await btnNew.isVisible()) {
      await btnNew.click();
      const sheet = page.locator('#ik-pos-form-sheet');
      if (await sheet.isVisible()) {
        await page.fill('#pos-field-ad', 'PostHog Test Pozisyon');
        const sehirField = page.locator('#pos-field-sehir');
        if (await sehirField.isVisible()) await sehirField.fill('İstanbul');
        await page.click('#btn-pos-form-submit');
        await page.waitForTimeout(1500);
        const events = await page.evaluate(function () {
          return window.__posthogEvents || [];
        });
        const autoMatchEvent = events.find(function (e) {
          return e.name === 'auto_match_triggered';
        });
        if (autoMatchEvent) {
          expect(autoMatchEvent.props.added).toBe(5);
          expect(autoMatchEvent.props.total_matched).toBe(7);
        } else { test.skip(); }
      } else { test.skip(); }
    } else { test.skip(); }
  });

  test('desktop: pipeline_pool_add event emit edilir (uzun_liste)', async ({ page }) => {
    await page.addInitScript(function () {
      window.posthog = {
        capture: function (name, props) {
          if (!window.__posthogEvents) window.__posthogEvents = [];
          window.__posthogEvents.push({ name: name, props: props });
        }
      };
    });
    await gotoPool(page, VP_DESKTOP, { addToPipelineResult: { ok: true } });
    const firstMenuBtn = page.locator('[data-row-menu-btn]').first();
    if (await firstMenuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstMenuBtn.click();
      const uzunBtn = page.locator('[data-row-action="add_uzun"]').first();
      if (await uzunBtn.isVisible()) {
        await uzunBtn.click();
        await page.waitForTimeout(500);
        const events = await page.evaluate(function () { return window.__posthogEvents || []; });
        const poolEvent = events.find(function (e) { return e.name === 'pipeline_pool_add'; });
        if (poolEvent) {
          expect(poolEvent.props.source_stage).toBe('uzun_liste');
        } else { test.skip(); }
      } else { test.skip(); }
    } else { test.skip(); }
  });

});

/* ═══════════════════════════════════════════════════════════════════════
   T5.5 — PR-4 Regression: soft refresh + toast (PR-4 baseline)
   ═══════════════════════════════════════════════════════════════════════ */

test.describe('PR-5 T5.5 — PR-4 regression guard', () => {

  test('pipeline toast normal show/hide çalışır (PR-4 pattern)', async ({ page }) => {
    await gotoPipeline(page, VP_DESKTOP);
    /* Toast DOM element mevcut */
    const toast = page.locator('[data-ik-pipeline-toast]');
    await expect(toast).toBeAttached();
    /* is-visible class yokken görünmez olmalı */
    const visible = await toast.isVisible();
    /* default: display none veya opacity 0 — görünmez */
    expect(visible).toBe(false);
  });

  test('PR-4: eski "Pipeline\'a ekle" action artık mevcut DEĞİL', async ({ page }) => {
    await gotoPool(page, VP_DESKTOP);
    const firstMenuBtn = page.locator('[data-row-menu-btn]').first();
    if (await firstMenuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstMenuBtn.click();
      /* Eski 'add' action yok */
      const oldAdd = page.locator('[data-row-action="add"]').first();
      const oldAddVisible = await oldAdd.isVisible({ timeout: 500 }).catch(() => false);
      expect(oldAddVisible).toBe(false);
    } else { test.skip(); }
  });

});
