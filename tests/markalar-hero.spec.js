/* ═══ markalar-hero.spec.js — K040 structural guards ═══
   Hero "Takip Ettiklerin" CTA → modal migration.
   Context: legacy vermillion strip removed; catalog count ("32 MARKA") dropped
   because pool grows and misled users. Single modal trigger = hero CTA.
   Axe-core yok, static HTML + CSS + JS checks. */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

function readFromRepo(relPath) {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
}

test.describe('K040 — Markalar hero CTA + modal refactor', function () {
  var profilHtml;
  var sirketlerCss;
  var markalarJs;

  test.beforeAll(function () {
    profilHtml = readFromRepo('profil.html');
    sirketlerCss = readFromRepo('css/panels/sirketler.css');
    markalarJs = readFromRepo('profil-markalar.js');
  });

  test('profil.html: catalog count + total-count id removed', function () {
    expect(profilHtml).not.toContain('id="sk-total-count"');
    // Guard against regression where "X MARKA" misleading caption returns
    expect(profilHtml).not.toMatch(/id="sk-followed-count"[^>]*>[^<]*<\/span>\s*TAKİP\s*·\s*</);
  });

  test('profil.html: legacy vermillion strip anchors removed', function () {
    expect(profilHtml).not.toContain('id="sk-followed-card"');
    expect(profilHtml).not.toContain('id="sk-followed-count2"');
    expect(profilHtml).not.toContain('id="sk-followed-all"');
    expect(profilHtml).not.toContain('id="sk-followed-row"');
    expect(profilHtml).not.toContain('sk-card--followed');
  });

  test('profil.html: hero CTA button present with a11y attrs', function () {
    expect(profilHtml).toContain('id="sk-hero-cta"');
    expect(profilHtml).toContain('aria-haspopup="dialog"');
    expect(profilHtml).toContain('aria-controls="brand-follows-popup-overlay"');
    expect(profilHtml).toContain('id="sk-hero-cta-count"');
    // Hidden by default — JS reveals when count > 0
    expect(profilHtml).toMatch(/id="sk-hero-cta"[^>]*\bhidden\b/);
  });

  test('K042: hero CTA has no arrow icon (brand rule)', function () {
    // Extract CTA button block
    var ctaBlock = profilHtml.match(/<button[^>]*id="sk-hero-cta"[\s\S]*?<\/button>/);
    expect(ctaBlock).not.toBeNull();
    // No arrow characters / no sk-hero__cta-arrow class
    expect(ctaBlock[0]).not.toMatch(/[→←›»]/);
    expect(ctaBlock[0]).not.toContain('sk-hero__cta-arrow');
  });

  test('K042: hero topmeta no longer shows duplicate "TAKİP" count', function () {
    // Only "MARKALAR" eyebrow remains; count lives in CTA only
    var topmetaBlock = profilHtml.match(/<div class="sk-hero__topmeta">[\s\S]*?<\/div>/);
    expect(topmetaBlock).not.toBeNull();
    expect(topmetaBlock[0]).not.toMatch(/TAKİP/);
    expect(topmetaBlock[0]).not.toContain('id="sk-followed-count"');
  });

  test('K042: hero CTA border-radius ≤ 12px (pill shape banned by Tuna)', function () {
    var css = readFromRepo('css/panels/sirketler.css');
    var ctaBlock = css.match(/\.sk-hero__cta\s*\{[^}]*\}/);
    expect(ctaBlock).not.toBeNull();
    // Pill radius (999px) banned — must be ≤ 12px for editorial hard-corner language
    expect(ctaBlock[0]).not.toMatch(/border-radius:\s*999px/);
    var radiusMatch = ctaBlock[0].match(/border-radius:\s*(\d+)px/);
    expect(radiusMatch).not.toBeNull();
    expect(parseInt(radiusMatch[1], 10)).toBeLessThanOrEqual(12);
  });

  test('profil.html: modal gained search input + labelled title', function () {
    expect(profilHtml).toContain('id="brand-follows-popup-search"');
    expect(profilHtml).toContain('aria-labelledby="brand-follows-popup-title"');
    expect(profilHtml).toContain('id="brand-follows-popup-title"');
    expect(profilHtml).toContain('id="brand-follows-popup-count"');
  });

  test('sirketler.css: new hero CTA vocabulary + dead strip classes purged', function () {
    expect(sirketlerCss).toContain('.sk-hero__cta');
    expect(sirketlerCss).toContain('.sk-hero__cta-count');
    // K042: arrow class retired (no-arrow-icons rule)
    expect(sirketlerCss).not.toContain('.sk-hero__cta-arrow');
    // Dead code purge — strip classes must not linger
    expect(sirketlerCss).not.toContain('.sk-card--followed');
    expect(sirketlerCss).not.toContain('.sk-followed__chip');
    expect(sirketlerCss).not.toContain('.sk-followed__head');
    expect(sirketlerCss).not.toContain('.sk-followed__all');
    expect(sirketlerCss).not.toContain('.sk-followed__row');
  });

  test('sirketler.css: modal search input + title count tokens wired', function () {
    expect(sirketlerCss).toContain('.brand-follows-popup-search');
    expect(sirketlerCss).toContain('.brand-follows-popup-title-count');
    // Focus visible ring for keyboard users
    expect(sirketlerCss).toMatch(/\.brand-follows-popup-close:focus-visible/);
    expect(sirketlerCss).toMatch(/\.brand-follows-popup-unfollow:focus-visible/);
  });

  test('profil-markalar.js: hero CTA wired, total-count reference removed', function () {
    expect(markalarJs).toContain("getElementById('sk-hero-cta')");
    expect(markalarJs).toContain("getElementById('sk-hero-cta-count')");
    expect(markalarJs).toContain("getElementById('brand-follows-popup-search')");
    // total count + count2 should not appear (dead references)
    expect(markalarJs).not.toContain('sk-total-count');
    expect(markalarJs).not.toContain('sk-followed-count2');
    expect(markalarJs).not.toContain('sk-followed-all');
    expect(markalarJs).not.toContain('sk-followed-row');
    expect(markalarJs).not.toContain('sk-followed-card');
  });

  test('profil-markalar.js: modal search + focus restore implemented', function () {
    expect(markalarJs).toContain('_ht_popup_last_focus');
    expect(markalarJs).toContain("toLocaleLowerCase('tr-TR')");
    // Escape handler still present
    expect(markalarJs).toContain('_htBrandFollowsPopupEsc');
  });

  test('profil-markalar.js: public API preserved (no breaking renames)', function () {
    expect(markalarJs).toContain('window.openBrandFollowsPopup');
    expect(markalarJs).toContain('window.closeBrandFollowsPopup');
    expect(markalarJs).toContain('window.toggleBrandFollow');
    expect(markalarJs).toContain('window.loadSirketlerPanel');
  });

  test('cache-bust bumped for K040 assets', function () {
    var cssMatch = profilHtml.match(/sirketler\.css\?v=([^"'\s]+)/);
    var jsMatch = profilHtml.match(/profil-markalar\.js\?v=([^"'\s]+)/);
    expect(cssMatch).not.toBeNull();
    expect(jsMatch).not.toBeNull();
    // Must differ from legacy K037 bump (v=20260417j / 20260417f)
    expect(cssMatch[1]).not.toBe('20260417j');
    expect(jsMatch[1]).not.toBe('20260417f');
  });
});
