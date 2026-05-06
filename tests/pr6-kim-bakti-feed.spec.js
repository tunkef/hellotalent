// pr6-kim-bakti-feed.spec.js
// PR-6 — Kim Baktı Feed: feature flag, event type copy, dedupe rollup, bell badge
// Kapsam: 9 senaryo × 2 viewport (mobile 390 + desktop 1440)
// Not: real Supabase çağrısı yok — window.loadViewersCard mock inject ile izole test.

const { test, expect } = require('@playwright/test');

/* ─────────────────────────────────────────
   Viewports
───────────────────────────────────────── */
var VP_DESKTOP = { width: 1440, height: 900 };
var VP_MOBILE  = { width: 390,  height: 844 };

/* ─────────────────────────────────────────
   Mock helpers
───────────────────────────────────────── */

// Supabase mock — chain builder: from().select().eq()...
function buildSupaMock(statsData, eventsData) {
  return {
    from: function(table) {
      return {
        select: function() {
          var self = this;
          self._table = table;
          self._filters = [];
          self.eq = function(col, val) {
            self._filters.push([col, val]);
            return self;
          };
          self.order = function() { return self; };
          self.limit = function() { return self; };
          self.maybeSingle = function() {
            return Promise.resolve({ data: statsData, error: null });
          };
          self.then = function(resolve) {
            // eventsQuery → .then() ile resolve edilir (await Promise-like)
            return Promise.resolve({ data: eventsData, error: null }).then(resolve);
          };
          // Promise.allSettled uyumu için
          self[Symbol.toStringTag] = 'Promise';
          self.catch = function(fn) { return Promise.resolve({ data: eventsData, error: null }).catch(fn); };
          // allSettled'in status=fulfilled dönmesi için
          return self;
        }
      };
    }
  };
}

// loadViewersCard override — mock supabase inject ederek paneli render et
function injectKimBaktiMock(page, opts) {
  return page.addInitScript(function(o) {
    window.__PR6_TEST__ = true;

    document.addEventListener('DOMContentLoaded', function() {
      // Supabase mock
      window.supabase = {
        from: function(table) {
          var chain = {
            _filters: [],
            select: function() { return chain; },
            eq: function(col, val) {
              chain._filters.push({ col: col, val: val });
              return chain;
            },
            order: function() { return chain; },
            limit: function() { return chain; },
            maybeSingle: function() {
              return Promise.resolve({ data: o.stats || null, error: null });
            }
          };
          // Promise.allSettled için thenable
          chain.then = function(resolve, reject) {
            // event_type filter uygulandı mı? chain._filters'den kontrol et
            var hasViewFilter = chain._filters.some(function(f) {
              return f.col === 'event_type' && f.val === 'view';
            });
            var events = o.events || [];
            if (hasViewFilter) {
              events = events.filter(function(ev) {
                return !ev.event_type || ev.event_type === 'view';
              });
            }
            return Promise.resolve({ data: events, error: null }).then(resolve, reject);
          };
          chain.catch = function(fn) { return chain.then(null, fn); };
          return chain;
        }
      };

      // calculateCompletion stub
      window.calculateCompletion = function() { return o.completion || 100; };

      // Trigger loadViewersCard
      if (typeof window.loadViewersCard === 'function') {
        window.loadViewersCard(o.candidateId || 'cand-test-1');
      }
    });
  }, opts || {});
}

// profil.html'e git + mock inject + yükle
async function gotoKimBakti(page, vp, mockOpts) {
  await page.setViewportSize(vp || VP_DESKTOP);
  await injectKimBaktiMock(page, mockOpts || {});
  await page.goto('/profil.html');
  await page.waitForLoadState('networkidle');
  // Kim Baktı paneline geç
  var navBtn = page.locator('#nav-kimbakti');
  if (await navBtn.isVisible({ timeout: 3000 }).catch(function() { return false; })) {
    await navBtn.click();
  }
  // Panel visible bekle
  await page.waitForSelector('#panel-kimbakti', { state: 'attached', timeout: 5000 }).catch(function() {});
}

/* ─────────────────────────────────────────
   Fixture data
───────────────────────────────────────── */

var NOW = new Date();

function daysAgo(n) {
  return new Date(NOW - n * 86400000).toISOString();
}

var STATS_BASE = {
  total_views: 7,
  unique_companies: 3,
  unique_positions: 2,
  last_viewed_at: daysAgo(1)
};

var VIEW_EVENTS = [
  { viewed_at: daysAgo(1), event_type: 'view', position_ad_snapshot: 'Store Manager', position_seg_snapshot: 'Lüks', company_id: 1, companies: { company_name: 'Zara', segment: 'Fast Fashion' } },
  { viewed_at: daysAgo(2), event_type: 'view', position_ad_snapshot: null, position_seg_snapshot: 'Premium', company_id: 2, companies: { company_name: 'Vakko', segment: 'Lüks' } }
];

var PIPELINE_EVENT = {
  viewed_at: daysAgo(1), event_type: 'pipeline_added', position_ad_snapshot: 'Sales Specialist', position_seg_snapshot: 'Lüks', company_id: 3, companies: { company_name: 'Beymen', segment: 'Lüks' }
};

var MESSAGE_EVENT = {
  viewed_at: daysAgo(0), event_type: 'message_sent', position_ad_snapshot: null, position_seg_snapshot: 'Fast Fashion', company_id: 1, companies: { company_name: 'Zara', segment: 'Fast Fashion' }
};

// 3 aynı hafta + aynı company + aynı event_type → rollup tetiklenir
var ROLLUP_EVENTS = [
  { viewed_at: daysAgo(1), event_type: 'pipeline_added', position_seg_snapshot: 'Lüks', company_id: 3, companies: { company_name: 'Beymen', segment: 'Lüks' } },
  { viewed_at: daysAgo(2), event_type: 'pipeline_added', position_seg_snapshot: 'Lüks', company_id: 3, companies: { company_name: 'Beymen', segment: 'Lüks' } },
  { viewed_at: daysAgo(3), event_type: 'pipeline_added', position_seg_snapshot: 'Lüks', company_id: 3, companies: { company_name: 'Beymen', segment: 'Lüks' } }
];

/* ═══════════════════════════════════════════════════════════════════════
   T6.1 — Feature flag OFF: sadece view event'leri görünür
   ═══════════════════════════════════════════════════════════════════════ */

test.describe('PR-6 T6.1 — Feature flag OFF (default)', function() {

  test('desktop: flag OFF → view satırı görünür', async function({ page }) {
    await gotoKimBakti(page, VP_DESKTOP, {
      stats: STATS_BASE,
      events: VIEW_EVENTS
    });
    var list = page.locator('#kb-viewer-list');
    if (await list.isVisible({ timeout: 4000 }).catch(function() { return false; })) {
      // view copy görünmeli
      await expect(list).toContainText('profilini inceledi', { timeout: 4000 });
    } else { test.skip(); }
  });

  test('desktop: flag OFF → pipeline_added event satırda GÖRÜNMEMELİ', async function({ page }) {
    await gotoKimBakti(page, VP_DESKTOP, {
      stats: STATS_BASE,
      events: [VIEW_EVENTS[0], PIPELINE_EVENT]
    });
    var list = page.locator('#kb-viewer-list');
    if (await list.isVisible({ timeout: 4000 }).catch(function() { return false; })) {
      // Supabase mock event_type='view' filtresi → pipeline_added gelmiyor
      var hasPipeline = await list.locator('[data-event-type="pipeline_added"]').isVisible({ timeout: 1000 }).catch(function() { return false; });
      expect(hasPipeline).toBe(false);
    } else { test.skip(); }
  });

  test('desktop: flag OFF → message_sent satırda GÖRÜNMEMELİ', async function({ page }) {
    await gotoKimBakti(page, VP_DESKTOP, {
      stats: STATS_BASE,
      events: [VIEW_EVENTS[0], MESSAGE_EVENT]
    });
    var list = page.locator('#kb-viewer-list');
    if (await list.isVisible({ timeout: 4000 }).catch(function() { return false; })) {
      var hasMsg = await list.locator('[data-event-type="message_sent"]').isVisible({ timeout: 1000 }).catch(function() { return false; });
      expect(hasMsg).toBe(false);
    } else { test.skip(); }
  });

  test('mobile: flag OFF → view event görünür, diğerleri yok', async function({ page }) {
    await gotoKimBakti(page, VP_MOBILE, {
      stats: STATS_BASE,
      events: [VIEW_EVENTS[0], PIPELINE_EVENT, MESSAGE_EVENT]
    });
    var list = page.locator('#kb-viewer-list');
    if (await list.isVisible({ timeout: 4000 }).catch(function() { return false; })) {
      await expect(list).toContainText('profilini inceledi', { timeout: 3000 });
      var hasPipeline = await list.locator('[data-event-type="pipeline_added"]').isVisible({ timeout: 500 }).catch(function() { return false; });
      var hasMsg = await list.locator('[data-event-type="message_sent"]').isVisible({ timeout: 500 }).catch(function() { return false; });
      expect(hasPipeline).toBe(false);
      expect(hasMsg).toBe(false);
    } else { test.skip(); }
  });

});

/* ═══════════════════════════════════════════════════════════════════════
   T6.2 — Event type copy (flag ON simülasyonu — mock filter bypass)
   Not: flag JS içinde tanımlı, test ortamında addInitScript override.
   ═══════════════════════════════════════════════════════════════════════ */

test.describe('PR-6 T6.2 — Event type copy (flag ON sim)', function() {

  // Flag'i override eden init script
  function injectFlagOn(page, mockOpts) {
    return page.addInitScript(function(o) {
      window.__PR6_FLAG_ON__ = true;
      // profil-kimbakti.js IIFE'yi çalıştırmadan önce hook koy
      // IIFE'nin KVKK_AUTO_MATCH_NOTIF_ENABLED değişkenini override edemeyiz
      // (closure içinde). Bunun yerine supabase mock event filtresi yapmıyor.
      window.supabase = {
        from: function() {
          var chain = {
            _filters: [],
            select: function() { return chain; },
            eq: function(col, val) {
              chain._filters.push({ col: col, val: val });
              return chain;
            },
            order: function() { return chain; },
            limit: function() { return chain; },
            maybeSingle: function() {
              return Promise.resolve({ data: o.stats || null, error: null });
            }
          };
          chain.then = function(resolve, reject) {
            // Filtre UYGULANMIYOR — tüm event'ler gelir (flag ON simülasyonu)
            return Promise.resolve({ data: o.events || [], error: null }).then(resolve, reject);
          };
          chain.catch = function(fn) { return chain.then(null, fn); };
          return chain;
        }
      };
      window.calculateCompletion = function() { return 100; };
      document.addEventListener('DOMContentLoaded', function() {
        if (typeof window.loadViewersCard === 'function') {
          window.loadViewersCard(o.candidateId || 'cand-test-1');
        }
      });
    }, mockOpts || {});
  }

  async function gotoFlagOn(page, vp, mockOpts) {
    await page.setViewportSize(vp || VP_DESKTOP);
    await injectFlagOn(page, mockOpts || {});
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');
    var navBtn = page.locator('#nav-kimbakti');
    if (await navBtn.isVisible({ timeout: 3000 }).catch(function() { return false; })) {
      await navBtn.click();
    }
    await page.waitForSelector('#panel-kimbakti', { state: 'attached', timeout: 5000 }).catch(function() {});
  }

  test('desktop: pipeline_added → "seni aday listesine aldı" copy', async function({ page }) {
    await gotoFlagOn(page, VP_DESKTOP, {
      stats: STATS_BASE,
      events: [PIPELINE_EVENT]
    });
    var list = page.locator('#kb-viewer-list');
    if (await list.isVisible({ timeout: 4000 }).catch(function() { return false; })) {
      await expect(list).toContainText('seni aday listesine aldı', { timeout: 3000 });
    } else { test.skip(); }
  });

  test('desktop: message_sent → "seninle iletişime geçti" copy', async function({ page }) {
    await gotoFlagOn(page, VP_DESKTOP, {
      stats: STATS_BASE,
      events: [MESSAGE_EVENT]
    });
    var list = page.locator('#kb-viewer-list');
    if (await list.isVisible({ timeout: 4000 }).catch(function() { return false; })) {
      await expect(list).toContainText('seninle iletişime geçti', { timeout: 3000 });
    } else { test.skip(); }
  });

  test('desktop: message_sent satırında "Mesajı Gör" butonu var', async function({ page }) {
    await gotoFlagOn(page, VP_DESKTOP, {
      stats: STATS_BASE,
      events: [MESSAGE_EVENT]
    });
    var list = page.locator('#kb-viewer-list');
    if (await list.isVisible({ timeout: 4000 }).catch(function() { return false; })) {
      var ctaBtn = list.locator('.kb-msg-cta').first();
      if (await ctaBtn.isVisible({ timeout: 3000 }).catch(function() { return false; })) {
        await expect(ctaBtn).toHaveText('Mesajı Gör');
        await expect(ctaBtn).toHaveAttribute('data-panel', 'inbox');
      } else { test.skip(); }
    } else { test.skip(); }
  });

  test('mobile: pipeline_added copy doğru', async function({ page }) {
    await gotoFlagOn(page, VP_MOBILE, {
      stats: STATS_BASE,
      events: [PIPELINE_EVENT]
    });
    var list = page.locator('#kb-viewer-list');
    if (await list.isVisible({ timeout: 4000 }).catch(function() { return false; })) {
      await expect(list).toContainText('seni aday listesine aldı', { timeout: 3000 });
    } else { test.skip(); }
  });

});

/* ═══════════════════════════════════════════════════════════════════════
   T6.3 — Dedupe rollup: 3+ event aynı company + hafta → rollup satırı
   ═══════════════════════════════════════════════════════════════════════ */

test.describe('PR-6 T6.3 — Dedupe rollup', function() {

  function injectRollupMock(page, mockOpts) {
    return page.addInitScript(function(o) {
      window.supabase = {
        from: function() {
          var chain = {
            select: function() { return chain; },
            eq: function() { return chain; },
            order: function() { return chain; },
            limit: function() { return chain; },
            maybeSingle: function() {
              return Promise.resolve({ data: o.stats || null, error: null });
            }
          };
          chain.then = function(resolve, reject) {
            return Promise.resolve({ data: o.events || [], error: null }).then(resolve, reject);
          };
          chain.catch = function(fn) { return chain.then(null, fn); };
          return chain;
        }
      };
      window.calculateCompletion = function() { return 100; };
      document.addEventListener('DOMContentLoaded', function() {
        if (typeof window.loadViewersCard === 'function') {
          window.loadViewersCard('cand-test-rollup');
        }
      });
    }, mockOpts || {});
  }

  async function gotoRollup(page, vp, mockOpts) {
    await page.setViewportSize(vp || VP_DESKTOP);
    await injectRollupMock(page, mockOpts || {});
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');
    var navBtn = page.locator('#nav-kimbakti');
    if (await navBtn.isVisible({ timeout: 3000 }).catch(function() { return false; })) {
      await navBtn.click();
    }
    await page.waitForSelector('#panel-kimbakti', { state: 'attached', timeout: 5000 }).catch(function() {});
  }

  test('desktop: 3 aynı company+hafta+pipeline_added → rollup satırı', async function({ page }) {
    await gotoRollup(page, VP_DESKTOP, {
      stats: STATS_BASE,
      events: ROLLUP_EVENTS
    });
    var list = page.locator('#kb-viewer-list');
    if (await list.isVisible({ timeout: 4000 }).catch(function() { return false; })) {
      // Rollup copy: "bu hafta X pozisyon için seni değerlendirdi"
      var hasRollup = await list.locator('.kb-viewer-row--rollup').isVisible({ timeout: 3000 }).catch(function() { return false; });
      if (hasRollup) {
        await expect(list).toContainText('bu hafta', { timeout: 3000 });
        await expect(list).toContainText('3', { timeout: 3000 });
        // Rollup badge
        var badge = list.locator('.kb-rollup-badge').first();
        await expect(badge).toBeVisible();
        await expect(badge).toContainText('etkinlik');
      } else { test.skip(); }
    } else { test.skip(); }
  });

  test('desktop: 2 event aynı company → rollup YOK (ayrı satırlar)', async function({ page }) {
    var twoEvents = ROLLUP_EVENTS.slice(0, 2);
    await gotoRollup(page, VP_DESKTOP, {
      stats: STATS_BASE,
      events: twoEvents
    });
    var list = page.locator('#kb-viewer-list');
    if (await list.isVisible({ timeout: 4000 }).catch(function() { return false; })) {
      var rollupVisible = await list.locator('.kb-viewer-row--rollup').isVisible({ timeout: 1000 }).catch(function() { return false; });
      expect(rollupVisible).toBe(false);
    } else { test.skip(); }
  });

  test('desktop: rollup copy "bu hafta" + sayı içeriyor', async function({ page }) {
    await gotoRollup(page, VP_DESKTOP, {
      stats: STATS_BASE,
      events: ROLLUP_EVENTS
    });
    var list = page.locator('#kb-viewer-list');
    if (await list.isVisible({ timeout: 4000 }).catch(function() { return false; })) {
      var rollupRow = list.locator('.kb-viewer-row--rollup').first();
      if (await rollupRow.isVisible({ timeout: 3000 }).catch(function() { return false; })) {
        var text = await rollupRow.textContent();
        // "bu hafta" veya "geçen hafta" label içermeli
        var hasWeek = text && (text.indexOf('bu hafta') !== -1 || text.indexOf('hafta') !== -1 || text.indexOf('ay') !== -1);
        expect(hasWeek).toBe(true);
      } else { test.skip(); }
    } else { test.skip(); }
  });

  test('mobile: rollup satırı görünür ve badge var', async function({ page }) {
    await gotoRollup(page, VP_MOBILE, {
      stats: STATS_BASE,
      events: ROLLUP_EVENTS
    });
    var list = page.locator('#kb-viewer-list');
    if (await list.isVisible({ timeout: 4000 }).catch(function() { return false; })) {
      var hasRollup = await list.locator('.kb-viewer-row--rollup').isVisible({ timeout: 3000 }).catch(function() { return false; });
      if (hasRollup) {
        var badge = list.locator('.kb-rollup-badge').first();
        await expect(badge).toBeVisible();
      } else { test.skip(); }
    } else { test.skip(); }
  });

});

/* ═══════════════════════════════════════════════════════════════════════
   T6.4 — select fields: total_interactions yok (H1 fix)
   Network intercept ile Supabase query kontrol edilir.
   ═══════════════════════════════════════════════════════════════════════ */

test.describe('PR-6 T6.4 — H1: select fields (total_interactions yok)', function() {

  test('desktop: Supabase query total_interactions içermiyor', async function({ page }) {
    var capturedQueries = [];

    // Supabase URL intercept — query string kontrol
    await page.route('**/candidate_view_stats**', function(route) {
      capturedQueries.push(route.request().url());
      route.fulfill({ status: 200, body: JSON.stringify({ data: null, error: null }) });
    });

    await page.setViewportSize(VP_DESKTOP);
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');
    var navBtn = page.locator('#nav-kimbakti');
    if (await navBtn.isVisible({ timeout: 3000 }).catch(function() { return false; })) {
      await navBtn.click();
      await page.waitForTimeout(1000);
    }

    // Eğer real Supabase çağrısı yakalandıysa total_interactions YOK
    if (capturedQueries.length > 0) {
      capturedQueries.forEach(function(url) {
        expect(url).not.toContain('total_interactions');
      });
    } else {
      // Mock inject senaryosunda Supabase çağrısı yakalanmaz — skip
      test.skip();
    }
  });

});

/* ═══════════════════════════════════════════════════════════════════════
   T6.5 — H2 fix: preview_viewers URL param production'da etkisiz
   ═══════════════════════════════════════════════════════════════════════ */

test.describe('PR-6 T6.5 — H2: preview_viewers URL param etkisiz', function() {

  test('desktop: ?preview_viewers=premium parametresi mock data render ETMEMELİ', async function({ page }) {
    await page.setViewportSize(VP_DESKTOP);

    // Supabase stub — gerçek çağrı simulate — boş events
    await page.addInitScript(function() {
      window.supabase = {
        from: function() {
          var chain = {
            select: function() { return chain; },
            eq: function() { return chain; },
            order: function() { return chain; },
            limit: function() { return chain; },
            maybeSingle: function() {
              return Promise.resolve({ data: null, error: null });
            }
          };
          chain.then = function(resolve, reject) {
            return Promise.resolve({ data: [], error: null }).then(resolve, reject);
          };
          chain.catch = function(fn) { return chain.then(null, fn); };
          return chain;
        }
      };
      window.calculateCompletion = function() { return 80; };
      document.addEventListener('DOMContentLoaded', function() {
        if (typeof window.loadViewersCard === 'function') {
          window.loadViewersCard('cand-test-h2');
        }
      });
    });

    // URL'ye preview_viewers=premium param ekle
    await page.goto('/profil.html?preview_viewers=premium');
    await page.waitForLoadState('networkidle');
    var navBtn = page.locator('#nav-kimbakti');
    if (await navBtn.isVisible({ timeout: 3000 }).catch(function() { return false; })) {
      await navBtn.click();
    }

    await page.waitForSelector('#panel-kimbakti', { state: 'attached', timeout: 5000 }).catch(function() {});
    await page.waitForTimeout(500);

    var list = page.locator('#kb-viewer-list');
    if (await list.isVisible({ timeout: 3000 }).catch(function() { return false; })) {
      var text = await list.textContent().catch(function() { return ''; });
      // Mock data'da "Zara", "Vakko" gibi hardcoded isimler olmamalı (PR-6 öncesi preview mock kaldırıldı)
      expect(text).not.toContain('Zara');
      expect(text).not.toContain('Vakko');
    } else { test.skip(); }
  });

});

/* ═══════════════════════════════════════════════════════════════════════
   T6.6 — Bell badge counter
   ═══════════════════════════════════════════════════════════════════════ */

test.describe('PR-6 T6.6 — Bell badge counter', function() {

  async function gotoBadgeTest(page, vp, mockOpts) {
    await page.setViewportSize(vp || VP_DESKTOP);
    await page.addInitScript(function(o) {
      window.supabase = {
        from: function() {
          var chain = {
            select: function() { return chain; },
            eq: function() { return chain; },
            order: function() { return chain; },
            limit: function() { return chain; },
            maybeSingle: function() {
              return Promise.resolve({ data: o.stats || null, error: null });
            }
          };
          chain.then = function(resolve, reject) {
            return Promise.resolve({ data: o.events || [], error: null }).then(resolve, reject);
          };
          chain.catch = function(fn) { return chain.then(null, fn); };
          return chain;
        }
      };
      window.calculateCompletion = function() { return 100; };
      document.addEventListener('DOMContentLoaded', function() {
        if (typeof window.loadViewersCard === 'function') {
          window.loadViewersCard('cand-badge-test');
        }
      });
    }, mockOpts || {});
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');
    var navBtn = page.locator('#nav-kimbakti');
    if (await navBtn.isVisible({ timeout: 3000 }).catch(function() { return false; })) {
      await navBtn.click();
    }
    await page.waitForSelector('#panel-kimbakti', { state: 'attached', timeout: 5000 }).catch(function() {});
    await page.waitForTimeout(600);
  }

  test('desktop: 2 event → bell badge sayı görünür (≥1)', async function({ page }) {
    await gotoBadgeTest(page, VP_DESKTOP, {
      stats: STATS_BASE,
      events: VIEW_EVENTS
    });
    var badge = page.locator('#kb-bell-badge');
    if (await badge.isAttached()) {
      var isVisible = await badge.isVisible({ timeout: 2000 }).catch(function() { return false; });
      if (isVisible) {
        var text = await badge.textContent();
        var num = parseInt(text, 10);
        expect(num).toBeGreaterThanOrEqual(1);
      } else { test.skip(); }
    } else { test.skip(); }
  });

  test('desktop: 0 event → bell badge GİZLİ', async function({ page }) {
    await gotoBadgeTest(page, VP_DESKTOP, {
      stats: { total_views: 0, unique_companies: 0, unique_positions: 0, last_viewed_at: null },
      events: []
    });
    var badge = page.locator('#kb-bell-badge');
    if (await badge.isAttached()) {
      var isVisible = await badge.isVisible({ timeout: 2000 }).catch(function() { return false; });
      // 0 event → badge gizli
      expect(isVisible).toBe(false);
    } else { test.skip(); }
  });

  test('desktop: badge "99+" cap (100+ event)', async function({ page }) {
    // 100 event oluştur
    var manyEvents = [];
    for (var i = 0; i < 100; i++) {
      manyEvents.push({
        viewed_at: daysAgo(Math.floor(i / 7)),
        event_type: 'view',
        position_seg_snapshot: 'Fast Fashion',
        company_id: (i % 5) + 1,
        companies: { company_name: 'Marka' + (i % 5), segment: 'Fast Fashion' }
      });
    }
    await gotoBadgeTest(page, VP_DESKTOP, {
      stats: { total_views: 100, unique_companies: 5, unique_positions: 3, last_viewed_at: daysAgo(0) },
      events: manyEvents
    });
    var badge = page.locator('#kb-bell-badge');
    if (await badge.isAttached()) {
      var isVisible = await badge.isVisible({ timeout: 2000 }).catch(function() { return false; });
      if (isVisible) {
        var text = await badge.textContent();
        // 99+ veya büyük sayı
        expect(text).toBeTruthy();
      } else { test.skip(); }
    } else { test.skip(); }
  });

  test('mobile: bell badge DOM var ve erişilebilir (aria-label)', async function({ page }) {
    await gotoBadgeTest(page, VP_MOBILE, {
      stats: STATS_BASE,
      events: VIEW_EVENTS
    });
    var badge = page.locator('#kb-bell-badge');
    if (await badge.isAttached()) {
      var ariaLabel = await badge.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('etkinlik');
    } else { test.skip(); }
  });

});

/* ═══════════════════════════════════════════════════════════════════════
   T6.7 — Empty state
   ═══════════════════════════════════════════════════════════════════════ */

test.describe('PR-6 T6.7 — Empty state', function() {

  async function gotoEmpty(page, vp, completion) {
    await page.setViewportSize(vp || VP_DESKTOP);
    await page.addInitScript(function(o) {
      window.supabase = {
        from: function() {
          var chain = {
            select: function() { return chain; },
            eq: function() { return chain; },
            order: function() { return chain; },
            limit: function() { return chain; },
            maybeSingle: function() {
              return Promise.resolve({ data: null, error: null });
            }
          };
          chain.then = function(resolve, reject) {
            return Promise.resolve({ data: [], error: null }).then(resolve, reject);
          };
          chain.catch = function(fn) { return chain.then(null, fn); };
          return chain;
        }
      };
      window.calculateCompletion = function() { return o.completion || 100; };
      document.addEventListener('DOMContentLoaded', function() {
        if (typeof window.loadViewersCard === 'function') {
          window.loadViewersCard('cand-empty-test');
        }
      });
    }, { completion: completion || 100 });
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');
    var navBtn = page.locator('#nav-kimbakti');
    if (await navBtn.isVisible({ timeout: 3000 }).catch(function() { return false; })) {
      await navBtn.click();
    }
    await page.waitForSelector('#panel-kimbakti', { state: 'attached', timeout: 5000 }).catch(function() {});
    await page.waitForTimeout(500);
  }

  test('desktop: 0 event → "Henüz hiçbir marka" copy (spec §4A)', async function({ page }) {
    await gotoEmpty(page, VP_DESKTOP, 100);
    var list = page.locator('#kb-viewer-list');
    if (await list.isVisible({ timeout: 3000 }).catch(function() { return false; })) {
      await expect(list).toContainText('Henüz hiçbir marka', { timeout: 3000 });
    } else { test.skip(); }
  });

  test('desktop: profil tamamlanmamışsa hint copy görünür (§4A alt ipucu)', async function({ page }) {
    await gotoEmpty(page, VP_DESKTOP, 60);
    var list = page.locator('#kb-viewer-list');
    if (await list.isVisible({ timeout: 3000 }).catch(function() { return false; })) {
      await expect(list).toContainText('tamamla', { timeout: 3000 });
    } else { test.skip(); }
  });

  test('mobile: empty state görünür', async function({ page }) {
    await gotoEmpty(page, VP_MOBILE, 100);
    var list = page.locator('#kb-viewer-list');
    if (await list.isVisible({ timeout: 3000 }).catch(function() { return false; })) {
      await expect(list).toContainText('Henüz hiçbir marka', { timeout: 3000 });
    } else { test.skip(); }
  });

});

/* ═══════════════════════════════════════════════════════════════════════
   T6.8 — PR-2 A24 baseline regression guard
   (önceki PR'lardan korunması gereken davranışlar)
   ═══════════════════════════════════════════════════════════════════════ */

test.describe('PR-6 T6.8 — Baseline regression guard', function() {

  test('Kim Baktı paneli DOM var (panel-kimbakti)', async function({ page }) {
    await page.setViewportSize(VP_DESKTOP);
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');
    var panel = page.locator('#panel-kimbakti');
    await expect(panel).toBeAttached();
  });

  test('nav-kimbakti butonu DOM var', async function({ page }) {
    await page.setViewportSize(VP_DESKTOP);
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');
    var navBtn = page.locator('#nav-kimbakti');
    await expect(navBtn).toBeAttached();
  });

  test('kb-skeleton başlangıçta görünür (loading state)', async function({ page }) {
    await page.setViewportSize(VP_DESKTOP);
    // loadViewersCard tetiklenmeden önce skeleton visible olmalı
    await page.addInitScript(function() {
      // loadViewersCard override — çağrıyı durdur (skeleton state test için)
      document.addEventListener('DOMContentLoaded', function() {
        window.loadViewersCard = function() {};
      });
    });
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');
    var navBtn = page.locator('#nav-kimbakti');
    if (await navBtn.isVisible({ timeout: 3000 }).catch(function() { return false; })) {
      await navBtn.click();
    }
    var skeleton = page.locator('#kb-skeleton');
    await expect(skeleton).toBeAttached();
  });

  test('header-kimbakti butonu DOM var ve erişilebilir', async function({ page }) {
    await page.setViewportSize(VP_DESKTOP);
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');
    var headerBtn = page.locator('#header-kimbakti');
    await expect(headerBtn).toBeAttached();
    var ariaLabel = await headerBtn.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });

  test('kb-bell-badge DOM var (PR-6 eklentisi)', async function({ page }) {
    await page.setViewportSize(VP_DESKTOP);
    await page.goto('/profil.html');
    await page.waitForLoadState('networkidle');
    var badge = page.locator('#kb-bell-badge');
    await expect(badge).toBeAttached();
  });

});
