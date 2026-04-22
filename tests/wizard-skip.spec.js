/* Faz 2E — Wizard skip opsiyonu (K045) */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');
function readFromRepo(rel) { return fs.readFileSync(path.join(__dirname,'..',rel),'utf8'); }

test.describe('Faz 2E — Wizard skip (Daha sonra doldur)', function () {
  var profilHtml, wizardJs, eventsJs;
  test.beforeAll(function () {
    profilHtml = readFromRepo('profil.html');
    wizardJs = readFromRepo('profil-wizard.js');
    eventsJs = readFromRepo('profil-events.js');
  });

  test('profil.html: btn-wiz-skip button exists with ghost variant + tooltip', function () {
    expect(profilHtml).toContain('id="btn-wiz-skip"');
    // Class + id may appear in either order on the same <button> tag
    var btnTag = profilHtml.match(/<button[^>]*id="btn-wiz-skip"[^>]*>/);
    expect(btnTag).not.toBeNull();
    expect(btnTag[0]).toContain('ht-btn--ghost');
    expect(btnTag[0]).toContain('title=');
    expect(btnTag[0]).toContain('style="display:none');
    expect(profilHtml).toContain('Daha sonra doldur');
  });

  test('profil-wizard.js renderWizard reveals skip at Step 3+ (not on final)', function () {
    var fn = wizardJs.match(/function renderWizard[\s\S]{0,2000}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toContain('btn-wiz-skip');
    // Must show only when wizStep >= 3 AND wizStep < TOTAL_STEPS
    expect(fn[0]).toMatch(/btnSkip\.style\.display\s*=\s*\(wizStep\s*>=\s*3/);
  });

  test('profil-events.js: skip handler saves + navigates to genel + toasts', function () {
    var snippet = eventsJs.match(/btn-wiz-skip[\s\S]{0,800}/);
    expect(snippet).not.toBeNull();
    expect(snippet[0]).toContain("switchPanel('genel')");
    expect(snippet[0]).toContain('saveProfileRPC');
    expect(snippet[0]).toContain('showToast');
    // Reset dirty flag so future panel switch doesn't re-trigger modal
    expect(snippet[0]).toContain('wizardDirty = false');
  });
});
