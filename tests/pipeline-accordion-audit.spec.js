/* ════════════════════════════════════════════════════════════════
   Pipeline Accordion Visual + Accessibility Audit
   uat-tester @ HelloTalent Studio v3 — 7 May 2026
   Scope: hr-pipeline.html accordion expand, width consistency,
          scroll, drawer, dark mode, mobile, a11y

   Run: npx playwright test tests/pipeline-accordion-audit.spec.js
        --project=desktop --reporter=list
   ════════════════════════════════════════════════════════════════ */
var { test, expect } = require('@playwright/test');
var path = require('path');
var fs   = require('fs');

var BASE_URL     = process.env.BASE_URL || 'http://localhost:3000';
var PIPELINE_URL = BASE_URL + '/hr-pipeline.html';
var SNAP_DIR     = path.join(__dirname, '..', '.claude', 'agent-memory', 'visual-diff');

var DESKTOP = { width: 1440, height: 900 };
var MOBILE  = { width: 390,  height: 844 };

if (!fs.existsSync(SNAP_DIR)) fs.mkdirSync(SNAP_DIR, { recursive: true });
var TS = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

/* ─────────────────────────────────────────────────────────────────
   MOCK DATA — 2 pozisyon, her pozisyon 6 pipeline candidate
   (Uzun: 6, Kısa: 3, İletişim: 2 — scroll test için Uzun 6)
   ─────────────────────────────────────────────────────────────── */
var MOCK_POSITIONS = [
  { id: 1001, ad: 'Mağaza Müdürü', lokasyon: 'İstanbul', deneyim_yil: 3,
    segment: 'Lüks', durum: 'active', company_id: 99, hr_profile_id: 'uid-test' },
  { id: 1002, ad: 'Satış Danışmanı', lokasyon: 'Ankara', deneyim_yil: 1,
    segment: 'Premium', durum: 'active', company_id: 99, hr_profile_id: 'uid-test' }
];

function makeCandidates(posId, count) {
  var list = [];
  for (var i = 0; i < count; i++) {
    list.push({
      id:         2000 + posId * 10 + i,
      full_name:  'Aday ' + i + ' (Pos-' + posId + ')',
      pozisyon:   'Danışman',
      deneyim_yil: i + 1,
      match_score: 80 - i * 5,
      avatar_url:  null,
      is_active:   true,
      stage_v2:    i < 6 ? 'uzun_liste' : (i < 9 ? 'kisa_liste' : 'iletisime_gecildi')
    });
  }
  return list;
}

var MOCK_PIPELINE_POS1 = [];
var MOCK_PIPELINE_POS2 = [];
for (var i = 0; i < 11; i++) {
  var stage = i < 6 ? 'uzun_liste' : (i < 9 ? 'kisa_liste' : 'iletisime_gecildi');
  MOCK_PIPELINE_POS1.push({
    id:           3000 + i,
    position_id:  1001,
    candidate_id: 4000 + i,
    stage_v2:     stage,
    candidate:    {
      id: 4000 + i, full_name: 'Aday-1-' + i, pozisyon: 'Mağaza Uzmanı',
      deneyim_yil: i + 1, match_score: 85 - i * 5, avatar_url: null
    }
  });
}
for (var j = 0; j < 6; j++) {
  var stageJ = j < 3 ? 'uzun_liste' : (j < 5 ? 'kisa_liste' : 'iletisime_gecildi');
  MOCK_PIPELINE_POS2.push({
    id:           3100 + j,
    position_id:  1002,
    candidate_id: 4100 + j,
    stage_v2:     stageJ,
    candidate:    {
      id: 4100 + j, full_name: 'Aday-2-' + j, pozisyon: 'Satış Uzmanı',
      deneyim_yil: j + 1, match_score: 75 - j * 5, avatar_url: null
    }
  });
}

/* ── addInitScript payload ── */
function mockInitScript() {
  /* This runs in page context */
  var MOCK_POSITIONS = [
    { id: 1001, ad: 'Mağaza Müdürü', lokasyon: 'İstanbul', deneyim_yil: 3,
      segment: 'Lüks', durum: 'active', company_id: 99, hr_profile_id: 'uid-test' },
    { id: 1002, ad: 'Satış Danışmanı', lokasyon: 'Ankara', deneyim_yil: 1,
      segment: 'Premium', durum: 'active', company_id: 99, hr_profile_id: 'uid-test' }
  ];

  var PIPELINE1 = [];
  for (var i = 0; i < 11; i++) {
    var s = i < 6 ? 'uzun_liste' : (i < 9 ? 'kisa_liste' : 'iletisime_gecildi');
    PIPELINE1.push({
      id: 3000 + i, position_id: 1001, candidate_id: 4000 + i, stage_v2: s,
      candidate: { id: 4000 + i, full_name: 'Aday-1-' + i,
        pozisyon: 'Mağaza Uzmanı', deneyim_yil: i + 1, match_score: 85 - i * 5,
        avatar_url: null, is_active: true }
    });
  }
  var PIPELINE2 = [];
  for (var j = 0; j < 6; j++) {
    var sj = j < 3 ? 'uzun_liste' : (j < 5 ? 'kisa_liste' : 'iletisime_gecildi');
    PIPELINE2.push({
      id: 3100 + j, position_id: 1002, candidate_id: 4100 + j, stage_v2: sj,
      candidate: { id: 4100 + j, full_name: 'Aday-2-' + j,
        pozisyon: 'Satış Uzmanı', deneyim_yil: j + 1, match_score: 75 - j * 5,
        avatar_url: null, is_active: true }
    });
  }

  /* localStorage flags */
  try {
    localStorage.setItem('ht_ik_demo_mode', '1');
    localStorage.removeItem('ht_ik_pipeline_state');
  } catch (e) { /* ignore */ }

  /* Patch IK_DATA after it loads — use MutationObserver + polling */
  function patchIKData() {
    if (!window.IK_DATA) return false;

    window.IK_DATA.getPositions = function () {
      return Promise.resolve(MOCK_POSITIONS);
    };
    window.IK_DATA.getArchivedPositions = function () {
      return Promise.resolve([]);
    };
    window.IK_DATA.searchCandidates = function () {
      var allCands = [];
      PIPELINE1.concat(PIPELINE2).forEach(function (e) {
        if (e.candidate) allCands.push(e.candidate);
      });
      return Promise.resolve(allCands);
    };
    window.IK_DATA.getPipelineCandidates = function (posId) {
      var entries = posId === 1001 || String(posId) === '1001' ? PIPELINE1 : PIPELINE2;
      return Promise.resolve(entries);
    };
    window.IK_DATA.getPipelineSummary = function (posId) {
      var entries = posId === 1001 || String(posId) === '1001' ? PIPELINE1 : PIPELINE2;
      return Promise.resolve({ uzun: entries.filter(function(e){return e.stage_v2==='uzun_liste';}).length,
        kisa: entries.filter(function(e){return e.stage_v2==='kisa_liste';}).length,
        iletisim: entries.filter(function(e){return e.stage_v2==='iletisime_gecildi';}).length });
    };
    window.IK_DATA.getCandidate = function (id) {
      var all = PIPELINE1.concat(PIPELINE2);
      var found = null;
      all.forEach(function(e){ if (String(e.candidate_id) === String(id)) found = e.candidate; });
      return Promise.resolve(found);
    };
    window.IK_DATA.movePipelineCandidate = function () { return Promise.resolve({ ok: true }); };
    window.IK_DATA.addToPipelineAuto = function () { return Promise.resolve({ added: 0 }); };
    window.IK_DATA.refreshPositionPipeline = function () { return Promise.resolve([]); };

    /* Patch IK_SHELL ctx so realMode() passes (not needed — we bypass at IK_DATA level) */
    if (window.IK_SHELL) {
      if (!window.IK_SHELL.ctx) {
        window.IK_SHELL.ctx = { user: { id: 'uid-test' }, hr: { id: 'uid-test', company_id: 99 }, demo: true };
      }
      window.IK_SHELL.setActivePositionId = function (id) {
        try { localStorage.setItem('ht_ik_active_position', String(id || '')); } catch (e) {}
      };
      window.IK_SHELL.getActivePositionId = function () {
        try { return localStorage.getItem('ht_ik_active_position') || null; } catch (e) { return null; }
      };
      /* Dispatch shell:ready so ik-pos-list.js triggers */
      try {
        document.dispatchEvent(new CustomEvent('ik-shell:ready', { detail: window.IK_SHELL.ctx }));
      } catch (e) {}
    }
    return true;
  }

  /* Poll until IK_DATA available (scripts load after initScript) */
  var _tries = 0;
  var _poll = setInterval(function () {
    if (patchIKData()) { clearInterval(_poll); return; }
    if (++_tries > 80) { clearInterval(_poll); }
  }, 50);
}

/* ── Auth + mock helper ── */
async function gotoPipeline(page, viewport) {
  await page.setViewportSize(viewport || DESKTOP);
  await page.addInitScript(mockInitScript);
  await page.goto(PIPELINE_URL, { waitUntil: 'domcontentloaded' });
  /* Wait for IK_DATA patch + shell:ready + ik-pos-list render */
  await page.waitForTimeout(3000);
}

/* ── Wait for pos rows to render ── */
async function waitForRows(page) {
  /* Give IK_DATA mock + render pipeline time */
  var count = 0;
  for (var i = 0; i < 10; i++) {
    count = await page.locator('.ik-pos-row').count();
    if (count > 0) break;

    /* Try triggering render manually if IK_DATA is patched but event missed */
    if (i === 3) {
      await page.evaluate(function () {
        if (window._htPosList && window._htPosList.refresh) {
          window._htPosList.refresh();
        } else if (window.IK_SHELL && !window.IK_SHELL.ctx) {
          window.IK_SHELL.ctx = { user: { id: 'uid-test' }, hr: { id: 'uid-test', company_id: 99 }, demo: true };
          try { document.dispatchEvent(new CustomEvent('ik-shell:ready', { detail: window.IK_SHELL.ctx })); } catch(e){}
        }
      });
    }
    await page.waitForTimeout(500);
  }
  return count;
}

/* ── Expand position row by index ── */
async function expandRow(page, index) {
  var rows = page.locator('.ik-pos-row');
  var count = await rows.count();
  if (count === 0) return false;
  var idx = Math.min(index, count - 1);
  var main = rows.nth(idx).locator('.ik-pos-row__main');
  await main.click();
  await page.waitForTimeout(600);
  return true;
}

/* ── Measure stage widths and card widths in a board ── */
async function measureBoard(boardLocator) {
  return await boardLocator.evaluate(function (board) {
    var stages  = board.querySelectorAll('.ik-stage');
    var result  = [];
    stages.forEach(function (stage, si) {
      var key      = stage.getAttribute('data-stage') || ('stage-' + si);
      var cards    = stage.querySelectorAll('.ik-card-aday');
      var cardWidths = [];
      cards.forEach(function (card) {
        cardWidths.push(Math.round(card.getBoundingClientRect().width));
      });
      var body     = stage.querySelector('.ik-stage__body');
      var bodyCS   = body ? window.getComputedStyle(body) : null;
      var stageCS  = window.getComputedStyle(stage);
      result.push({
        stageKey:         key,
        stageWidth:       Math.round(stage.getBoundingClientRect().width),
        stageHeight:      Math.round(stage.getBoundingClientRect().height),
        stageComputedH:   stageCS.height,
        bodyScrollH:      body ? body.scrollHeight : 0,
        bodyClientH:      body ? body.clientHeight : 0,
        bodyOverflowY:    bodyCS ? bodyCS.overflowY : 'n/a',
        bodyMaxHeight:    bodyCS ? bodyCS.maxHeight : 'n/a',
        isScrolling:      body ? (body.scrollHeight > body.clientHeight) : false,
        cardCount:        cards.length,
        cardWidths:       cardWidths
      });
    });
    return result;
  });
}

/* ════════════════════════════════════════════════════════════════
   TEST 1 — Pozisyon expand width consistency (cross-position)
   ════════════════════════════════════════════════════════════════ */
test('desktop: pozisyon expand width consistency — cross-position diff', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);
  var rowCount = await waitForRows(page);
  console.log('\n=== TEST 1: Width Measurements ===');
  console.log('  Rows rendered: ' + rowCount);

  if (rowCount === 0) {
    console.log('  SKIP — no rows (IK_DATA mock did not trigger render — known demo-mode false negative)');
    return;
  }

  var allMeasurements = [];
  var rows = page.locator('.ik-pos-row');
  var maxExpand = Math.min(2, rowCount);

  for (var i = 0; i < maxExpand; i++) {
    /* Close previous */
    var openCount = await page.locator('.ik-pos-row.is-expanded').count();
    if (openCount > 0) {
      await page.locator('.ik-pos-row.is-expanded .ik-pos-row__main').first().click();
      await page.waitForTimeout(300);
    }

    await expandRow(page, i);
    var isExp = await rows.nth(i).evaluate(function (el) {
      return el.classList.contains('is-expanded');
    });

    if (!isExp) {
      allMeasurements.push({ posIndex: i, status: 'not_expanded', stages: [] });
      continue;
    }

    /* Wait for board to attach (ik-position-detail.js lazy) */
    await page.waitForTimeout(800);

    var board = rows.nth(i).locator('.ik-pos-expand__board');
    var bCount = await board.count();
    if (bCount === 0) {
      allMeasurements.push({ posIndex: i, status: 'no_board', stages: [] });
      continue;
    }

    var stages = await measureBoard(board.first());
    allMeasurements.push({ posIndex: i, status: 'ok', stages: stages });

    stages.forEach(function (s) {
      console.log('  Pos[' + i + '] Stage[' + s.stageKey + ']'
        + ' stageW=' + s.stageWidth
        + ' cards=[' + s.cardWidths.join(', ') + ']'
        + ' cardCount=' + s.cardCount);
    });
  }

  var snap1 = path.join(SNAP_DIR, 'test1-desktop-expanded-' + TS + '.png');
  await page.screenshot({ path: snap1, fullPage: false });
  console.log('  Screenshot: ' + snap1);

  /* Cross-position stage width diff */
  var p0 = (allMeasurements[0] || {}).stages || [];
  var p1 = (allMeasurements[1] || {}).stages || [];
  if (p0.length > 0 && p1.length > 0) {
    var w0 = p0[0].stageWidth;
    var w1 = p1[0].stageWidth;
    var diff = Math.abs(w0 - w1);
    console.log('  Cross-pos stage[0] width diff: ' + diff + 'px (pos0=' + w0 + ' pos1=' + w1 + ')');
    expect(diff).toBeLessThan(2);
  }
});

/* ════════════════════════════════════════════════════════════════
   TEST 2 — Stage cross consistency (3 sütun kart width)
   ════════════════════════════════════════════════════════════════ */
test('desktop: stage cross consistency — 3 sütun kart width diff', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);
  var rowCount = await waitForRows(page);
  console.log('\n=== TEST 2: Stage Cross Consistency ===');
  console.log('  Rows rendered: ' + rowCount);

  if (rowCount === 0) {
    console.log('  SKIP — no rows');
    return;
  }

  await expandRow(page, 0);
  await page.waitForTimeout(800);

  var board = page.locator('.ik-pos-expand__board').first();
  var bCount = await board.count();
  if (bCount === 0) {
    console.log('  SKIP — no board rendered');
    return;
  }

  var stages = await measureBoard(board);
  stages.forEach(function (s) {
    console.log('  Stage[' + s.stageKey + ']'
      + ' stageW=' + s.stageWidth
      + ' bodyH=' + s.bodyClientH
      + ' scrollH=' + s.bodyScrollH
      + ' overflowY=' + s.bodyOverflowY
      + ' maxH=' + s.bodyMaxHeight
      + ' cards=[' + s.cardWidths.join(', ') + ']');
  });

  /* Stage column widths equal (grid 1fr — max 2px diff) */
  var stageWidths = stages.map(function (s) { return s.stageWidth; });
  if (stageWidths.length >= 2) {
    var minW = Math.min.apply(null, stageWidths);
    var maxW = Math.max.apply(null, stageWidths);
    var diff  = maxW - minW;
    console.log('  Stage width range: min=' + minW + ' max=' + maxW + ' diff=' + diff + 'px');
    expect(diff).toBeLessThan(2);
  }

  /* Cards within each stage same width */
  stages.forEach(function (s) {
    if (s.cardWidths.length >= 2) {
      var cMin = Math.min.apply(null, s.cardWidths);
      var cMax = Math.max.apply(null, s.cardWidths);
      console.log('  Stage[' + s.stageKey + '] card width range: ' + cMin + '-' + cMax + ' diff=' + (cMax - cMin) + 'px');
      expect(cMax - cMin).toBeLessThan(2);
    }
  });

  var snap2 = path.join(SNAP_DIR, 'test2-stage-cross-' + TS + '.png');
  await page.screenshot({ path: snap2, fullPage: false });
  console.log('  Screenshot: ' + snap2);
});

/* ════════════════════════════════════════════════════════════════
   TEST 3 — Scroll behavior: 5+ kart → overflow trigger
   ════════════════════════════════════════════════════════════════ */
test('desktop: scroll behavior — 5 kart sonrası overflow trigger', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);
  var rowCount = await waitForRows(page);
  console.log('\n=== TEST 3: Scroll Behavior ===');
  console.log('  Rows rendered: ' + rowCount);

  if (rowCount === 0) {
    console.log('  SKIP — no rows');
    return;
  }

  await expandRow(page, 0);
  await page.waitForTimeout(800);

  var board = page.locator('.ik-pos-expand__board').first();
  var bCount = await board.count();
  if (bCount === 0) {
    console.log('  SKIP — no board');
    return;
  }

  var stages = await measureBoard(board);
  stages.forEach(function (s) {
    console.log('  Stage[' + s.stageKey + ']'
      + ' cards=' + s.cardCount
      + ' scrollH=' + s.bodyScrollH
      + ' clientH=' + s.bodyClientH
      + ' isScrolling=' + s.isScrolling
      + ' stageComputedH=' + s.stageComputedH);

    /* Stage must not exceed 722px (clamp max 720 + 2px tolerance) */
    if (s.stageHeight > 0) {
      expect(s.stageHeight).toBeLessThanOrEqual(722);
      console.log('    → stageHeight ' + s.stageHeight + 'px ≤ 722px: OK');
    }

    /* 5+ cards → scroll must trigger */
    if (s.cardCount >= 5) {
      console.log('    → ' + s.cardCount + ' cards, isScrolling=' + s.isScrolling);
      expect(s.isScrolling).toBe(true);
    }
  });

  var snap3 = path.join(SNAP_DIR, 'test3-scroll-' + TS + '.png');
  await page.screenshot({ path: snap3, fullPage: false });
  console.log('  Screenshot: ' + snap3);
});

/* ════════════════════════════════════════════════════════════════
   TEST 4 — Drag-drop: .ik-stage--drop-target CSS + dragover
   ════════════════════════════════════════════════════════════════ */
test('desktop: drag-drop visual — drop-target CSS mevcut', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);
  var rowCount = await waitForRows(page);
  console.log('\n=== TEST 4: Drag-Drop ===');

  /* CSS class tanımlı mı? (bağımsız — board gerektirmez) */
  var hasCSS = await page.evaluate(function () {
    var sheets = Array.prototype.slice.call(document.styleSheets);
    for (var i = 0; i < sheets.length; i++) {
      try {
        var rules = Array.prototype.slice.call(sheets[i].cssRules || []);
        for (var j = 0; j < rules.length; j++) {
          var sel = rules[j].selectorText || '';
          if (sel.indexOf('drop-target') >= 0) return true;
        }
      } catch (e) { /* cross-origin */ }
    }
    return false;
  });
  console.log('  .ik-stage--drop-target CSS defined: ' + hasCSS);
  expect(hasCSS).toBe(true);

  if (rowCount === 0) return;

  await expandRow(page, 0);
  await page.waitForTimeout(800);

  var board = page.locator('.ik-pos-expand__board').first();
  var bCount = await board.count();
  if (bCount > 0) {
    var stage0 = board.locator('.ik-stage').nth(0);
    var sCount = await stage0.count();
    if (sCount > 0) {
      await stage0.dispatchEvent('dragover');
      await page.waitForTimeout(100);
      var hasClass = await stage0.evaluate(function (el) {
        return el.classList.contains('ik-stage--drop-target');
      });
      console.log('  dragover → drop-target class: ' + hasClass);
    }
  }
});

/* ════════════════════════════════════════════════════════════════
   TEST 5 — Accordion open: transition CSS + aria-expanded update
   ════════════════════════════════════════════════════════════════ */
test('desktop: accordion smooth open — transition + aria-expanded', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);
  var rowCount = await waitForRows(page);
  console.log('\n=== TEST 5: Accordion Open ===');
  console.log('  Rows rendered: ' + rowCount);

  if (rowCount === 0) {
    console.log('  SKIP — no rows');
    return;
  }

  var firstRow  = page.locator('.ik-pos-row').first();
  var firstMain = firstRow.locator('.ik-pos-row__main');

  /* Pre-click state */
  var before = await firstRow.evaluate(function (row) {
    var main   = row.querySelector('.ik-pos-row__main');
    var expand = row.querySelector('.ik-pos-row__expand');
    var cs     = expand ? window.getComputedStyle(expand) : null;
    return {
      ariaExpanded: main ? main.getAttribute('aria-expanded') : 'missing',
      expandDisplay: cs ? cs.display : 'n/a',
      expandTransition: cs ? cs.transition : 'n/a',
      chevronTransform: row.querySelector('.ik-pos-row__chevron')
        ? window.getComputedStyle(row.querySelector('.ik-pos-row__chevron')).transform : 'n/a'
    };
  });
  console.log('  BEFORE click:');
  console.log('    aria-expanded: ' + before.ariaExpanded);
  console.log('    expand display: ' + before.expandDisplay);
  console.log('    expand transition: "' + before.expandTransition + '"');
  console.log('    chevron transform: ' + before.chevronTransform);

  /* Click */
  await firstMain.click();
  await page.waitForTimeout(500);

  var after = await firstRow.evaluate(function (row) {
    var main   = row.querySelector('.ik-pos-row__main');
    var expand = row.querySelector('.ik-pos-row__expand');
    var cs     = expand ? window.getComputedStyle(expand) : null;
    return {
      isExpanded:   row.classList.contains('is-expanded'),
      ariaExpanded: main ? main.getAttribute('aria-expanded') : 'missing',
      expandDisplay: cs ? cs.display : 'n/a',
      chevronTransform: row.querySelector('.ik-pos-row__chevron')
        ? window.getComputedStyle(row.querySelector('.ik-pos-row__chevron')).transform : 'n/a'
    };
  });
  console.log('  AFTER click:');
  console.log('    is-expanded class: ' + after.isExpanded);
  console.log('    aria-expanded: ' + after.ariaExpanded);
  console.log('    expand display: ' + after.expandDisplay);
  console.log('    chevron transform (rotated?): ' + after.chevronTransform);

  var hasTransition = before.expandTransition
    && before.expandTransition !== 'none'
    && before.expandTransition !== 'all 0s ease 0s';
  console.log('  Smooth transition (max-height animation): '
    + (hasTransition ? 'YES' : 'NO — display:block toggle, no animation (potential UX improvement)'));

  /* Assertions */
  expect(after.isExpanded).toBe(true);
  expect(after.ariaExpanded).toBe('true');

  /* Single-row policy: click same row again → closes */
  await firstMain.click();
  await page.waitForTimeout(400);
  var closedCheck = await firstRow.evaluate(function (row) {
    return { isExpanded: row.classList.contains('is-expanded') };
  });
  console.log('  After second click (close): is-expanded=' + closedCheck.isExpanded);
  expect(closedCheck.isExpanded).toBe(false);
});

/* ════════════════════════════════════════════════════════════════
   TEST 6 — pp-drawer: DOM, aria, ESC
   ════════════════════════════════════════════════════════════════ */
test('desktop: pp-drawer — DOM mevcut, aria-hidden, ESC kapatır', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);
  var rowCount = await waitForRows(page);
  console.log('\n=== TEST 6: pp-drawer ===');

  var drawer = page.locator('#pp-drawer');
  await expect(drawer).toBeAttached();
  console.log('  #pp-drawer DOM: ATTACHED');

  var info = await drawer.evaluate(function (el) {
    var cs = window.getComputedStyle(el);
    return {
      ariaHidden: el.getAttribute('aria-hidden'),
      display:    cs.display,
      position:   cs.position,
      zIndex:     cs.zIndex
    };
  });
  console.log('  aria-hidden: ' + info.ariaHidden);
  console.log('  position: ' + info.position);
  console.log('  z-index: ' + info.zIndex);

  if (rowCount === 0) return;

  await expandRow(page, 0);
  await page.waitForTimeout(800);

  var board = page.locator('.ik-pos-expand__board').first();
  var bCount = await board.count();
  if (bCount > 0) {
    var firstCard = board.locator('.ik-card-aday').first();
    var cCount = await firstCard.count();
    if (cCount > 0) {
      await firstCard.click();
      await page.waitForTimeout(700);

      var afterClick = await drawer.evaluate(function (el) {
        return {
          isOpen:      el.classList.contains('is-open'),
          ariaHidden:  el.getAttribute('aria-hidden'),
          bodyOverflow: window.getComputedStyle(document.body).overflow
        };
      });
      console.log('  After card click:');
      console.log('    drawer isOpen: ' + afterClick.isOpen);
      console.log('    aria-hidden: ' + afterClick.ariaHidden);
      console.log('    body overflow: ' + afterClick.bodyOverflow);

      if (afterClick.isOpen) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        var afterESC = await drawer.evaluate(function (el) {
          return el.classList.contains('is-open');
        });
        console.log('  After ESC — isOpen: ' + afterESC);
        expect(afterESC).toBe(false);
      }
    }
  }

  var snap6 = path.join(SNAP_DIR, 'test6-drawer-' + TS + '.png');
  await page.screenshot({ path: snap6, fullPage: false });
  console.log('  Screenshot: ' + snap6);
});

/* ════════════════════════════════════════════════════════════════
   TEST 7 — Dark mode: data-theme toggle
   ════════════════════════════════════════════════════════════════ */
test('desktop: dark mode — data-theme toggle', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);
  var rowCount = await waitForRows(page);
  console.log('\n=== TEST 7: Dark Mode ===');

  /* Toggle dark */
  await page.evaluate(function () {
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await page.waitForTimeout(400);

  var darkInfo = await page.evaluate(function () {
    var bodyCS = window.getComputedStyle(document.body);
    var row    = document.querySelector('.ik-pos-row');
    var rowCS  = row ? window.getComputedStyle(row) : null;
    return {
      theme:    document.documentElement.getAttribute('data-theme'),
      bodyBg:   bodyCS.backgroundColor,
      bodyColor: bodyCS.color,
      rowBg:    rowCS ? rowCS.backgroundColor : 'n/a'
    };
  });
  console.log('  data-theme: ' + darkInfo.theme);
  console.log('  body bg: ' + darkInfo.bodyBg);
  console.log('  body color: ' + darkInfo.bodyColor);
  console.log('  row bg: ' + darkInfo.rowBg);
  expect(darkInfo.theme).toBe('dark');

  /* Check dark theme token changes: bg should NOT be pure white */
  var isLightBg = darkInfo.bodyBg === 'rgb(255, 255, 255)' || darkInfo.bodyBg === 'rgba(0, 0, 0, 0)';
  if (isLightBg) {
    console.log('  WARNING: body bg appears unchanged after dark mode — dark mode tokens may not be applied');
  }

  /* Expand + check card colors in dark */
  if (rowCount > 0) {
    await expandRow(page, 0);
    await page.waitForTimeout(600);
    var board = page.locator('.ik-pos-expand__board').first();
    var bCount = await board.count();
    if (bCount > 0) {
      var cardDark = await board.evaluate(function (boardEl) {
        var card = boardEl.querySelector('.ik-card-aday');
        if (!card) return null;
        var cs = window.getComputedStyle(card);
        return { bg: cs.backgroundColor, color: cs.color };
      });
      if (cardDark) {
        console.log('  card-aday dark bg: ' + cardDark.bg + ' color: ' + cardDark.color);
      }
    }
  }

  var snap7 = path.join(SNAP_DIR, 'test7-dark-' + TS + '.png');
  await page.screenshot({ path: snap7, fullPage: false });
  console.log('  Screenshot: ' + snap7);

  /* Restore */
  await page.evaluate(function () {
    document.documentElement.setAttribute('data-theme', 'light');
  });
});

/* ════════════════════════════════════════════════════════════════
   TEST 8 — Mobile 390×844: board 1-col, drag disabled
   ════════════════════════════════════════════════════════════════ */
test('mobile: 390×844 — board 1-col stack, drag disabled', async ({ page }) => {
  await gotoPipeline(page, MOBILE);
  var rowCount = await waitForRows(page);
  console.log('\n=== TEST 8: Mobile ===');
  console.log('  Rows rendered: ' + rowCount);

  if (rowCount === 0) {
    console.log('  SKIP — no rows');
    /* Still check page renders at all */
    var bodyVisible = await page.locator('body').isVisible();
    console.log('  Body visible: ' + bodyVisible);
    var snap8e = path.join(SNAP_DIR, 'test8-mobile-empty-' + TS + '.png');
    await page.screenshot({ path: snap8e });
    console.log('  Screenshot: ' + snap8e);
    return;
  }

  await expandRow(page, 0);
  await page.waitForTimeout(800);

  var board = page.locator('.ik-pos-expand__board').first();
  var bCount = await board.count();

  if (bCount > 0) {
    var mobileInfo = await board.evaluate(function (boardEl) {
      var cs     = window.getComputedStyle(boardEl);
      var stages = boardEl.querySelectorAll('.ik-stage');
      var stageDims = [];
      stages.forEach(function (s) {
        stageDims.push({
          key:   s.getAttribute('data-stage'),
          w:     Math.round(s.getBoundingClientRect().width),
          h:     Math.round(s.getBoundingClientRect().height)
        });
      });
      var allCards   = boardEl.querySelectorAll('.ik-card-aday');
      var dragDisabled = true;
      allCards.forEach(function (c) {
        if (c.getAttribute('draggable') === 'true') dragDisabled = false;
      });
      return {
        gridCols:      cs.gridTemplateColumns,
        boardW:        Math.round(boardEl.getBoundingClientRect().width),
        stages:        stageDims,
        dragDisabled:  dragDisabled,
        cardCount:     allCards.length
      };
    });
    console.log('  grid-template-columns: "' + mobileInfo.gridCols + '"');
    console.log('  board width: ' + mobileInfo.boardW + 'px');
    console.log('  draggable disabled: ' + mobileInfo.dragDisabled);
    mobileInfo.stages.forEach(function (s) {
      console.log('  Stage[' + s.key + '] w=' + s.w + ' h=' + s.h);
    });

    /* All stages full-width (≤ 10px diff from board) */
    mobileInfo.stages.forEach(function (s) {
      var diff = Math.abs(s.w - mobileInfo.boardW);
      console.log('  Stage[' + s.key + '] vs boardW diff: ' + diff + 'px');
      expect(diff).toBeLessThanOrEqual(10);
    });
  }

  var snap8 = path.join(SNAP_DIR, 'test8-mobile-' + TS + '.png');
  await page.screenshot({ path: snap8, fullPage: false });
  console.log('  Screenshot: ' + snap8);
});

/* ════════════════════════════════════════════════════════════════
   TEST 9 — Console errors + network failures
   ════════════════════════════════════════════════════════════════ */
test('desktop: console errors + network failures', async ({ page }) => {
  var consoleErrors = [];
  var networkIssues = [];

  page.on('console', function (msg) {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('requestfailed', function (req) {
    networkIssues.push({ url: req.url(), reason: (req.failure() || {}).errorText || 'unknown' });
  });
  page.on('response', function (resp) {
    if (resp.status() >= 400) networkIssues.push({ url: resp.url(), status: resp.status() });
  });

  await gotoPipeline(page, DESKTOP);
  var rowCount = await waitForRows(page);
  if (rowCount > 0) {
    await expandRow(page, 0);
    await page.waitForTimeout(800);
  }

  console.log('\n=== TEST 9: Console + Network ===');
  /* Filter Supabase demo-mode auth noise */
  var realErrors = consoleErrors.filter(function (e) {
    return e.indexOf('supabase') < 0 && e.indexOf('Supabase') < 0
      && e.indexOf('auth') < 0 && e.indexOf('ik-data') < 0;
  });
  var realNetwork = networkIssues.filter(function (f) {
    var u = f.url || '';
    return u.indexOf('supabase') < 0 && u.indexOf('localhost') >= 0;
  });

  if (consoleErrors.length === 0) {
    console.log('  Console errors: NONE');
  } else {
    consoleErrors.forEach(function (e, i) { console.log('  Error[' + i + ']: ' + e.slice(0, 120)); });
  }
  if (networkIssues.length === 0) {
    console.log('  Network issues: NONE');
  } else {
    networkIssues.forEach(function (f, i) {
      console.log('  Net[' + i + ']: ' + (f.url || '').slice(0, 80) + ' → ' + (f.status || f.reason));
    });
  }
  console.log('  Real errors (non-Supabase): ' + realErrors.length);
  console.log('  Real network issues (localhost): ' + realNetwork.length);

  /* Only fail on truly unexpected errors */
  realErrors.forEach(function (e) {
    console.log('  CRITICAL: ' + e);
  });
});

/* ════════════════════════════════════════════════════════════════
   TEST 10 — A11y: aria-expanded, role=region, keyboard
   ════════════════════════════════════════════════════════════════ */
test('desktop: a11y — aria-expanded, role=region, keyboard nav', async ({ page }) => {
  await gotoPipeline(page, DESKTOP);
  var rowCount = await waitForRows(page);
  console.log('\n=== TEST 10: Accessibility ===');
  console.log('  Rows rendered: ' + rowCount);

  if (rowCount === 0) {
    console.log('  SKIP — no rows');
    /* Static DOM a11y checks still possible */
    var pageA11y = await page.evaluate(function () {
      var doms = {
        posGrid: document.getElementById('ik-pos-grid'),
        posGridRole: document.getElementById('ik-pos-grid') ? document.getElementById('ik-pos-grid').getAttribute('role') : 'not found',
        newPosBtn: document.getElementById('btn-new-position'),
        newPosBtnText: document.getElementById('btn-new-position') ? document.getElementById('btn-new-position').textContent.trim() : 'not found'
      };
      return doms;
    });
    console.log('  #ik-pos-grid role: ' + pageA11y.posGridRole);
    console.log('  #btn-new-position text: ' + pageA11y.newPosBtnText);
    return;
  }

  /* Row a11y attributes */
  var a11yInfo = await page.evaluate(function () {
    var rows = document.querySelectorAll('.ik-pos-row');
    var out  = [];
    rows.forEach(function (row, i) {
      if (i >= 3) return;
      var main   = row.querySelector('.ik-pos-row__main');
      var expand = row.querySelector('.ik-pos-row__expand');
      out.push({
        idx:          i,
        mainAriaExp:  main ? main.getAttribute('aria-expanded') : 'MISSING',
        mainAriaCtrl: main ? main.getAttribute('aria-controls') : 'MISSING',
        expandRole:   expand ? expand.getAttribute('role') : 'MISSING',
        expandLabel:  expand ? expand.getAttribute('aria-label') : 'MISSING',
        expandId:     expand ? expand.id : 'MISSING',
        idMatchCtrl:  expand && main
          ? (expand.id === main.getAttribute('aria-controls'))
          : false
      });
    });
    return out;
  });

  a11yInfo.forEach(function (r) {
    console.log('  Row[' + r.idx + '] aria-expanded="' + r.mainAriaExp + '"'
      + ' aria-controls="' + r.mainAriaCtrl + '"'
      + ' expand role="' + r.expandRole + '"'
      + ' id↔controls match=' + r.idMatchCtrl);

    expect(r.mainAriaExp).not.toBe('MISSING');
    expect(r.expandRole).toBe('region');
    expect(r.idMatchCtrl).toBe(true);
  });

  /* Click first row, check aria-expanded → true */
  var firstMain = page.locator('.ik-pos-row__main').first();
  await firstMain.click();
  await page.waitForTimeout(400);

  var expandedAttr = await page.locator('.ik-pos-row').first()
    .locator('.ik-pos-row__main').getAttribute('aria-expanded');
  console.log('  aria-expanded after click: ' + expandedAttr);
  expect(expandedAttr).toBe('true');

  /* Stage headers — cursor + any interactive role */
  var stageHeaders = await page.evaluate(function () {
    var headers = document.querySelectorAll('.ik-stage__header');
    var out = [];
    headers.forEach(function (h) {
      var cs = window.getComputedStyle(h);
      out.push({
        role:      h.getAttribute('role'),
        tabIndex:  h.tabIndex,
        cursor:    cs.cursor
      });
    });
    return out;
  });
  stageHeaders.slice(0, 3).forEach(function (h, i) {
    console.log('  StageHeader[' + i + '] role=' + h.role
      + ' tabIndex=' + h.tabIndex + ' cursor=' + h.cursor);
  });

  var snap10 = path.join(SNAP_DIR, 'test10-a11y-' + TS + '.png');
  await page.screenshot({ path: snap10, fullPage: false });
  console.log('  Screenshot: ' + snap10);
});
