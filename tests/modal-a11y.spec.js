/* ═══ modal-a11y.spec.js — Faz 1A modal hygiene guards ═══
   Hedef: tüm profil.html modal'larında focus trap + focus restore + scroll lock + ESC.
   Structural (no browser) — davranış Playwright E2E'de ayrı kapsanır. */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

function readFromRepo(relPath) {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
}

test.describe('Faz 1A — Modal a11y hygiene (focus trap, restore, scroll lock)', function () {
  var profilHtml, eventsJs, uiJs, sharedCss;

  test.beforeAll(function () {
    profilHtml = readFromRepo('profil.html');
    eventsJs = readFromRepo('profil-events.js');
    uiJs = readFromRepo('profil-ui.js');
    sharedCss = readFromRepo('shared.css');
  });

  test('profil-events.js: _htFocusTrap stores previous activeElement + restores on cleanup', function () {
    // Trigger element'i yakala
    expect(eventsJs).toMatch(/_htFocusTrap[\s\S]*?prevActive|lastFocus|previousActive/);
    // Cleanup fn focus restore
    expect(eventsJs).toMatch(/\.focus\(\)[\s\S]*?cleanup|return function\(\)[\s\S]*?focus/);
  });

  test('profil-events.js: MutationObserver covers all 5 modal selector families', function () {
    // Core .ht-modal__overlay + .lok-modal-overlay already covered
    expect(eventsJs).toContain('.ht-modal__overlay');
    expect(eventsJs).toContain('.lok-modal-overlay');
    // New: K041 — expand to remaining modal classes
    expect(eventsJs).toContain('.brand-follows-popup-overlay');
    expect(eventsJs).toContain('.pp-overlay');
    expect(eventsJs).toContain('.wlc-modal');
  });

  test('profil-events.js: cmdk modal uses .show class (no display:flex inline)', function () {
    // Legacy inline toggle retired — .show class pattern is single source of truth
    expect(eventsJs).not.toMatch(/cmdkOverlay\.style\.display\s*=\s*['"]flex['"]/);
    expect(eventsJs).not.toMatch(/cmdkOverlay\.style\.display\s*=\s*['"]none['"]/);
    // Class-based toggle
    expect(eventsJs).toMatch(/cmdkOverlay\.classList\.(add|remove)\(['"]show['"]\)/);
  });

  test('profil-events.js: ESC handler covers all modal families via MODAL_SELECTORS', function () {
    // Unified pattern — one array drives focus trap, scroll lock, and ESC close
    expect(eventsJs).toMatch(/MODAL_SELECTORS\s*=\s*\[[\s\S]*?\.ht-modal__overlay[\s\S]*?\.lok-modal-overlay[\s\S]*?\.brand-follows-popup-overlay[\s\S]*?\.pp-overlay[\s\S]*?\.wlc-modal[\s\S]*?\]/);
    // Document-level ESC handler references MODAL_SELECTORS (the second, global
    // handler — not the cmdk-input-scoped one which is intentionally narrow).
    var escBlocks = eventsJs.match(/e\.key\s*===\s*['"]Escape['"][\s\S]{0,400}/g);
    expect(escBlocks).not.toBeNull();
    var anyReferencesSelectors = escBlocks.some(function(b) { return /MODAL_SELECTORS/.test(b); });
    expect(anyReferencesSelectors).toBe(true);
  });

  test('profil-events.js: scroll lock wired via .ht-scroll-lock body class', function () {
    expect(eventsJs).toContain('ht-scroll-lock');
    // classList.toggle may pass a boolean 2nd arg — accept any signature
    expect(eventsJs).toMatch(/document\.body\.classList\.(add|remove|toggle)\(['"]ht-scroll-lock['"]/);
  });

  test('CSS: cmdk stripe from top + brand-follows-popup-overlay.show reveals', function () {
    var componentsCss = readFromRepo('css/components.css');
    var sirketlerCss = readFromRepo('css/panels/sirketler.css');
    // components.css owns cmdk layering override
    expect(componentsCss).toMatch(/#modal-cmdk\s*\{[^}]*align-items:flex-start/);
    expect(componentsCss).toContain('body.ht-scroll-lock');
    // sirketler.css owns follows-popup show class
    expect(sirketlerCss).toMatch(/\.brand-follows-popup-overlay\.show\s*\{\s*display:flex/);
  });

  test('profil.html: cmdk modal markup has no inline display:none/flex', function () {
    // Find the cmdk line
    var cmdkLine = profilHtml.match(/<div[^>]*id="modal-cmdk"[^>]*>/);
    expect(cmdkLine).not.toBeNull();
    // No inline display toggle — .show class owns visibility
    expect(cmdkLine[0]).not.toMatch(/display\s*:\s*(none|flex)/);
  });

  test('profil-ui.js: modal-success + modal-error open via .show class (preserved)', function () {
    expect(uiJs).toMatch(/getElementById\(['"]modal-success['"]\)\.classList\.add\(['"]show['"]\)/);
    expect(uiJs).toMatch(/getElementById\(['"]modal-error['"]\)\.classList\.add\(['"]show['"]\)/);
  });
});
