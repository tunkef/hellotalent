/**
 * K030 FAZ B — Studio freeze source-content tests
 *
 * Source-level regression guard. NO auth. NO runtime. Everything asserted by
 * fetching the static file contents served by the dev server and checking
 * for markers. Matches FAZ A pattern (tests/faz-a-decouple.spec.js).
 */
var { test, expect } = require('@playwright/test');

var BASE = function (baseURL) { return baseURL || 'http://localhost:8080'; };

var fetchText = async function (request, baseURL, path) {
  var res = await request.get(BASE(baseURL) + path);
  expect(res.ok()).toBeTruthy();
  return await res.text();
};

test.describe('K030 FAZ B — Studio freeze (source checks)', () => {

  test('panel-soon.js exposes renderer + all 4 Turkish card titles + IIFE var-only', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/panel-soon.js');
    expect(body).toContain('_htRenderPanelSoon');
    expect(body).toContain('Yakında');
    expect(body).toContain('Mülakat demoları');
    expect(body).toContain('Yetkinlik bazlı çalışma');
    expect(body).toContain('Mülakat teknikleri');
    expect(body).toContain('Mağaza bilgileri');
    // IIFE wrapper
    expect(body).toMatch(/\(function\s*\(\)\s*\{[\s\S]*\}\)\(\);/);
    // vanilla JS guard: no top-level const/let (var only inside IIFE)
    expect(body).toContain('var ');
    expect(body).not.toMatch(/^\s*const\s/m);
    expect(body).not.toMatch(/^\s*let\s/m);
  });

  test('css/panel-soon.css has BEM-lite classes + mobile + reduced-motion rules', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/css/panel-soon.css');
    expect(body).toContain('.ht-soon__card');
    expect(body).toContain('.ht-soon__chip');
    expect(body).toContain('.ht-soon__grid');
    expect(body).toContain('@media (max-width: 480px)');
    expect(body).toContain('prefers-reduced-motion');
  });

  test('shared.js defines freeze flag before any IIFE', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/shared.js');
    expect(body).toContain('window._HT_STUDIO_FROZEN = true;');
    // flag must appear before the main IIFE open
    var idxFlag = body.indexOf('window._HT_STUDIO_FROZEN');
    var idxIIFE = body.indexOf('(function');
    expect(idxFlag).toBeGreaterThan(-1);
    expect(idxIIFE).toBeGreaterThan(idxFlag);
  });

  test('profil-wizard.js mounts panel-soon when frozen + breadcrumb label', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/profil-wizard.js');
    expect(body).toContain('_HT_STUDIO_FROZEN');
    expect(body).toContain('_htRenderPanelSoon');
    // Source uses literal \u00fc escape, not actual character
    expect(body).toContain('St\\u00fcdyo - Yakinda');
  });

  test('profil-genel.js gates coach→Studio CTAs with freeze flag', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/profil-genel.js');
    expect(body).toContain('_HT_STUDIO_FROZEN');
    // practiceBtn appears behind a !window._HT_STUDIO_FROZEN guard
    expect(body).toMatch(/!window\._HT_STUDIO_FROZEN[\s\S]{0,400}practiceBtn/);
  });

  test('profil-studio.js keeps FAZ A FROZEN banner AND adds freeze flag gate', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/profil-studio.js');
    // FAZ A banner still present
    expect(body).toContain('FROZEN — 2026-04-13 (K030)');
    // FAZ B gate
    expect(body).toContain('_HT_STUDIO_FROZEN');
    // Like button path unchanged — still appended unconditionally
    expect(body).toContain("actionsEl.appendChild(likeBtn)");
  });

  test('profil.html wires panel-soon assets + sidebar Yakında chips + cache bust', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/profil.html');
    expect(body).toContain('<script src="panel-soon.js');
    expect(body).toContain('<link rel="stylesheet" href="css/panel-soon.css');
    expect(body).toContain('?v=20260413a');
    // Both #nav-mulakat and #nav-yetkinlik should carry the Yakında chip
    var mulakatBlock = body.substring(body.indexOf('id="nav-mulakat"'), body.indexOf('id="nav-yetkinlik"'));
    var yetkinlikBlock = body.substring(body.indexOf('id="nav-yetkinlik"'), body.indexOf('id="nav-yetkinlik"') + 600);
    expect(mulakatBlock).toContain('ht-chip--soon');
    expect(yetkinlikBlock).toContain('ht-chip--soon');
  });

  test('admin.html studio-modules tab disabled + switchPanel guard', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/admin.html');
    // is-disabled class sits on the same <div> as data-panel="studio-modules"
    expect(body).toMatch(/<div[^>]*is-disabled[^>]*data-panel="studio-modules"|<div[^>]*data-panel="studio-modules"[^>]*is-disabled/);
    expect(body).toContain('aria-disabled="true"');
    // switchPanel early return for freeze flag
    expect(body).toMatch(/studio-modules[\s\S]{0,200}_HT_STUDIO_FROZEN/);
  });

  test('coach-studio.html redirects to canonical shell + noindex meta', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/coach-studio.html');
    expect(body).toContain("window.location.replace('profil.html#mulakat')");
    expect(body).toContain('name="robots"');
    expect(body).toContain('noindex');
  });

  /* ── Hotfix 2026-04-13: post-UAT bugs ── */

  test('edu dash title + body render Yakında teaser when frozen', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/profil-genel.js');
    expect(body).toMatch(/buildEduDashCard[\s\S]{0,800}ht-chip--soon/);
    expect(body).toContain('gh-edu-soon-list');
    expect(body).toContain('gh-edu-soon-hint');
    expect(body).toMatch(/hydrateEduDash[\s\S]{0,800}_HT_STUDIO_FROZEN/);
  });

  test('coach editor pick header card wrapped in freeze guard', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/profil-genel.js');
    expect(body).toMatch(/_HT_STUDIO_FROZEN[\s\S]{0,200}gh-coach-header/);
  });

  test('edu dash yakında teaser CSS present', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/profil-genel.js');
    expect(body).toContain('.gh-edu-soon-list');
    expect(body).toContain('.gh-edu-soon-row');
    expect(body).toContain('.gh-edu-soon-title');
    expect(body).toContain('.gh-edu-soon-desc');
    expect(body).toContain('.gh-edu-soon-hint');
  });
});
