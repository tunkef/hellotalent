/* Faz 1F — profil-studio.js god-file split guards (K044) */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');
function readFromRepo(rel) { return fs.readFileSync(path.join(__dirname,'..',rel),'utf8'); }

test.describe('Faz 1F — Studio god-file split', function () {
  var coachJs, studioJs, profilHtml;
  test.beforeAll(function () {
    coachJs = readFromRepo('profil-studio-coach.js');
    studioJs = readFromRepo('profil-studio.js');
    profilHtml = readFromRepo('profil.html');
  });

  test('profil-studio.js shrunk below 4000 lines (was 4401)', function () {
    var lineCount = studioJs.split('\n').length;
    expect(lineCount).toBeLessThan(4000);
  });

  test('profil-studio-coach.js contains coach feed functions', function () {
    expect(coachJs).toContain('function hydrateCoachFeed');
    expect(coachJs).toContain('function applyCoachFilters');
    expect(coachJs).toContain('function renderCoachGrid');
    expect(coachJs).toContain('function buildCoachCard');
    expect(coachJs).toContain('function openCoachDetail');
    expect(coachJs).toContain('function toggleCoachLike');
    expect(coachJs).toContain('function trLowerCoach');
  });

  test('coach module declares shared SVG constants', function () {
    // closeSVG also used by studio.js drawer (line ~1322) — coach loads first
    expect(coachJs).toContain('var closeSVG =');
    expect(coachJs).toContain('var heartOutlineSVG =');
    expect(coachJs).toContain('var heartFilledSVG =');
    expect(coachJs).toContain('var arrowRightSVG =');
  });

  test('coach module exports openCoachDetail for legacy bento surface', function () {
    expect(coachJs).toContain('window.openCoachDetail = openCoachDetail');
  });

  test('profil-studio.js no longer defines coach render fns', function () {
    // Definitions moved — reference calls in studio.js are OK
    expect(studioJs).not.toMatch(/\nfunction hydrateCoachFeed/);
    expect(studioJs).not.toMatch(/\nfunction applyCoachFilters/);
    expect(studioJs).not.toMatch(/\nfunction buildCoachCard/);
    expect(studioJs).not.toMatch(/\nfunction openCoachDetail/);
    expect(studioJs).not.toMatch(/\nfunction trLowerCoach/);
  });

  test('profil-studio.js no longer declares coach SVG constants (moved)', function () {
    expect(studioJs).not.toMatch(/var heartOutlineSVG =/);
    expect(studioJs).not.toMatch(/var heartFilledSVG =/);
    expect(studioJs).not.toMatch(/var closeSVG =/);
    expect(studioJs).not.toMatch(/var arrowRightSVG =/);
  });

  test('profil-studio.js keeps cross-link maps + bridge helpers', function () {
    // These stay in studio.js — used by multiple sections
    expect(studioJs).toContain('COMP_TO_COACH_CATEGORY');
    expect(studioJs).toContain('COMP_TO_MODULE_SLUG');
    expect(studioJs).toContain('MODULE_SLUG_TO_COMP');
    expect(studioJs).toContain('COACH_CAT_TO_COMP');
    expect(studioJs).toContain('function navigateToCompPractice');
    expect(studioJs).toContain('function buildPracticeBridgeCTA');
  });

  test('profil-studio.js public API preserved', function () {
    expect(studioJs).toContain('window._htLoadStudio');
    expect(studioJs).toContain('window._htGenelCoachTeaser');
  });

  test('profil.html loads coach.js BEFORE studio.js (order matters for closeSVG)', function () {
    var coachIdx = profilHtml.indexOf('profil-studio-coach.js');
    var studioIdx = profilHtml.indexOf('profil-studio.js?');
    expect(coachIdx).toBeGreaterThan(-1);
    expect(studioIdx).toBeGreaterThan(-1);
    expect(coachIdx).toBeLessThan(studioIdx);
  });

  test('cache-bust bumped for split', function () {
    expect(profilHtml).toMatch(/profil-studio-coach\.js\?v=\d{8}/);
    expect(profilHtml).toMatch(/profil-studio\.js\?v=\d{8}/);
  });
});
