/**
 * K030 FAZ C — HT Duyurular frontend + admin composer source-content tests.
 * NO auth. NO runtime. Static source-level regression guard matching FAZ A/B pattern.
 */
var { test, expect } = require('@playwright/test');

var BASE = function (baseURL) { return baseURL || 'http://localhost:8080'; };

var fetchText = async function (request, baseURL, path) {
  var res = await request.get(BASE(baseURL) + path);
  expect(res.ok()).toBeTruthy();
  return await res.text();
};

test.describe('K030 FAZ C — HT Duyurular (source checks)', () => {

  test('profil-duyurular.js exposes loader + RPCs + sanitizer + var-only', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/profil-duyurular.js');
    expect(body).toContain('_htLoadDuyuruFeed');
    expect(body).toContain('_htRenderDuyuruPreviewCard');
    expect(body).toContain('get_announcements_feed');
    expect(body).toContain('toggle_announcement_like');
    expect(body).toContain('DOMPurify');
    expect(body).toContain('marked');
    expect(body).toMatch(/\(function\s*\(\)\s*\{[\s\S]*\}\)\(\);/);
    expect(body).toContain('var ');
    expect(body).not.toMatch(/^\s*const\s/m);
    expect(body).not.toMatch(/^\s*let\s/m);
  });

  test('admin-announcements.js exposes composer API + storage path + upload', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/admin-announcements.js');
    expect(body).toContain('_htAdminAnnouncements');
    expect(body).toContain('mount:');
    expect(body).toContain('refresh:');
    expect(body).toContain('ht_announcements');
    expect(body).toContain('ht_announcement_media');
    expect(body).toContain("'announcements/'");
    expect(body).toContain("storage.from('cvs').upload");
    // var-only
    expect(body).not.toMatch(/^\s*const\s/m);
    expect(body).not.toMatch(/^\s*let\s/m);
  });

  test('css/duyurular.css has BEM-lite classes + dark mode + reduced-motion + mobile', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/css/duyurular.css');
    expect(body).toContain('.ht-duyuru__card');
    expect(body).toContain('.ht-duyuru__carousel');
    expect(body).toContain('.ht-duyuru__like-btn');
    expect(body).toContain('.ht-duyuru__cta');
    expect(body).toContain('.ht-composer__modal');
    expect(body).toContain('.ht-composer__panel');
    expect(body).toContain('.ht-composer__form');
    expect(body).toContain('.ht-composer__media-row');
    expect(body).toContain('.ht-segment');
    expect(body).toContain("html[data-theme='dark']");
    expect(body).toContain('prefers-reduced-motion');
    expect(body).toContain('@media (max-width: 480px)');
  });

  test('profil.html wires marked + DOMPurify + duyurular assets + segment markup', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/profil.html');
    expect(body).toContain('marked@11/marked.min.js');
    expect(body).toContain('dompurify@3/dist/purify.min.js');
    expect(body).toContain('css/duyurular.css?v=20260413k');
    expect(body).toContain('profil-duyurular.js?v=20260413k');
    // Segment markup in #panel-bildirimler
    expect(body).toContain('data-segment="bildirim-duyuru"');
    expect(body).toContain('data-tab-content="bildirim"');
    expect(body).toContain('data-tab-content="duyuru"');
    expect(body).toContain('data-mount="duyuru-full-feed"');
  });

  test('profil-genel.js mounts duyuru feed when frozen', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/profil-genel.js');
    expect(body).toContain('_HT_STUDIO_FROZEN');
    expect(body).toContain('data-mount="duyuru-feed"');
    expect(body).toContain('_htLoadDuyuruFeed');
    expect(body).toMatch(/hydrateDuyuruFeed/);
  });

  test('admin.html has Duyurular nav-item + panel + script + switchPanel registration', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/admin.html');
    expect(body).toMatch(/data-panel="announcements"/);
    expect(body).toContain('id="panel-announcements"');
    expect(body).toContain('admin-announcements.js?v=20260413k');
    expect(body).toContain('profil-duyurular.js?v=20260413k');
    expect(body).toContain('css/duyurular.css?v=20260413k');
    // switchPanel dispatcher branch
    expect(body).toMatch(/name === 'announcements'[\s\S]{0,200}_htAdminAnnouncements/);
    // Ann-root mount target
    expect(body).toContain('id="ann-root"');
  });

  test('profil-inbox.js handles segment toggle + unread RPC', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/profil-inbox.js');
    expect(body).toContain('data-segment="bildirim-duyuru"');
    expect(body).toContain('get_unread_announcement_count');
    expect(body).toContain('_htLoadDuyuruFeed');
    expect(body).toContain('ht_last_duyuru_seen');
    expect(body).toContain('ht_bildirim_tab');
  });

  /* ── K030 FAZ C extension: view analytics (focal click removed, contain fits) ── */
  test('profil-duyurular.js tracks views via IntersectionObserver + RPC', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/profil-duyurular.js');
    expect(body).toContain('track_announcement_view');
    expect(body).toContain('IntersectionObserver');
    expect(body).toContain('threshold: 0.5');
    /* Final decision: object-fit:contain fit-on-screen, no per-image focal.
     * focal_x/focal_y DB columns stay for backward compat but frontend does
     * not compute objectPosition from them. */
  });

  test('admin-announcements.js has view_count column + focal backward-compat defaults', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/admin-announcements.js');
    expect(body).toContain('G\\u00F6r\\u00FCnt\\u00FClenme');
    expect(body).toContain('r.view_count');
    /* Focal click UX removed — final decision: contain-fit in feed.
     * Defaults (0.5, 0.5) stay in queuedMedia + insert payload for backward
     * compat with existing DB columns. */
    expect(body).toContain('focal_x');
    expect(body).toContain('focal_y');
  });

  test('feed carousel uses natural aspect (max-height bound)', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/css/duyurular.css');
    // K030 FAZ C hotfix 4: no fixed aspect-ratio, slide adapts to image shape
    expect(body).toMatch(/\.ht-duyuru__carousel-slide[\s\S]{0,600}max-height/);
    expect(body).not.toMatch(/\.ht-duyuru__carousel-slide[\s\S]{0,400}aspect-ratio:\s*16/);
  });

  test('CSP allows blob: for img + media (composer preview)', async ({ request, baseURL }) => {
    var admin = await fetchText(request, baseURL, '/admin.html');
    var profil = await fetchText(request, baseURL, '/profil.html');
    expect(admin).toMatch(/img-src[^;]*blob:/);
    expect(admin).toMatch(/media-src[^;]*blob:/);
    expect(profil).toMatch(/img-src[^;]*blob:/);
    expect(profil).toMatch(/media-src[^;]*blob:/);
  });

  test('migration 20260413202813 defines views table + focal cols + RPC', async ({ request, baseURL }) => {
    var body = await fetchText(request, baseURL, '/supabase/migrations/20260413202813_ht_ann_views_focal.sql');
    expect(body).toContain('ht_announcement_views');
    expect(body).toContain('track_announcement_view');
    expect(body).toContain('view_count');
    expect(body).toContain('focal_x');
    expect(body).toContain('focal_y');
    expect(body).toContain('get_announcements_feed');
  });
});
