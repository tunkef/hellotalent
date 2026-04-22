/* Faz 3 — LOW audit cleanup (K047) */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');
function readFromRepo(rel) { return fs.readFileSync(path.join(__dirname,'..',rel),'utf8'); }

test.describe('Faz 3A — Font-family token adoption', function () {
  test('Panel CSS files use var(--font-*) — raw strings reduced', function () {
    var files = [
      'css/profil-extras.css',
      'css/panels/sirketler.css',
      'css/panels/destek.css',
      'css/panels/ayarlar.css',
      'css/panels/inbox.css',
      'css/panels/bildirimler.css',
      'css/panels/firsatlar.css',
      'css/panels/genel-bakis.css',
      'css/panels/premium.css',
      'css/layout.css',
      'css/components.css'
    ];
    for (var i = 0; i < files.length; i++) {
      var css = readFromRepo(files[i]);
      // No raw 'Plus Jakarta Sans' left (all should be var(--font-body))
      expect(css).not.toMatch(/'Plus Jakarta Sans'/);
      // Same for Bricolage + DM Mono
      expect(css).not.toMatch(/'Bricolage Grotesque'/);
      expect(css).not.toMatch(/'DM Mono'/);
    }
  });
});

test.describe('Faz 3C — Delete confirm timeout extended', function () {
  test('attachDeleteConfirm uses 4500ms (was 2500ms)', function () {
    var uiJs = readFromRepo('profil-ui.js');
    var fnBody = uiJs.match(/function attachDeleteConfirm[\s\S]{0,1500}/);
    expect(fnBody).not.toBeNull();
    expect(fnBody[0]).toContain('4500');
    expect(fnBody[0]).not.toMatch(/},\s*2500\)/);
  });
});

test.describe('Faz 3D — Header tablist a11y pattern complete', function () {
  var profilHtml, inboxJs;
  test.beforeAll(function () {
    profilHtml = readFromRepo('profil.html');
    inboxJs = readFromRepo('profil-inbox.js');
  });

  test('tab buttons have id + aria-controls pointing to panels', function () {
    expect(profilHtml).toContain('id="popup-tab-bildirim"');
    expect(profilHtml).toContain('id="popup-tab-duyuru"');
    expect(profilHtml).toContain('aria-controls="popup-notif-list"');
    expect(profilHtml).toContain('aria-controls="popup-duyuru-list"');
  });

  test('panels have role=tabpanel + aria-labelledby', function () {
    // popup-notif-list
    expect(profilHtml).toMatch(/id="popup-notif-list"[^>]*role="tabpanel"[^>]*aria-labelledby="popup-tab-bildirim"/);
    // popup-duyuru-list
    expect(profilHtml).toMatch(/id="popup-duyuru-list"[^>]*role="tabpanel"[^>]*aria-labelledby="popup-tab-duyuru"/);
  });

  test('tablist has aria-label', function () {
    expect(profilHtml).toMatch(/role="tablist"\s+aria-label="[^"]+"/);
  });

  test('roving tabindex — active tab tabindex=0, inactive -1', function () {
    var drawerSeg = profilHtml.match(/<div class="header-popup-seg"[\s\S]*?<\/div>/);
    expect(drawerSeg).not.toBeNull();
    expect(drawerSeg[0]).toMatch(/aria-selected="true"[^>]*tabindex="0"|tabindex="0"[^>]*aria-selected="true"/);
    expect(drawerSeg[0]).toMatch(/aria-selected="false"[^>]*tabindex="-1"|tabindex="-1"[^>]*aria-selected="false"/);
  });

  test('profil-inbox.js keyboard nav — Arrow/Home/End', function () {
    expect(inboxJs).toContain('ArrowLeft');
    expect(inboxJs).toContain('ArrowRight');
    expect(inboxJs).toContain("'Home'");
    expect(inboxJs).toContain("'End'");
    expect(inboxJs).toContain('_switchDrawerTab');
  });

  test('tab switch updates tabindex for roving focus', function () {
    var switcher = inboxJs.match(/_switchDrawerTab[\s\S]{0,800}/);
    expect(switcher).not.toBeNull();
    expect(switcher[0]).toMatch(/setAttribute\(\s*['"]tabindex['"]\s*,\s*active\s*\?\s*['"]0['"]\s*:\s*['"]-1['"]/);
  });
});
