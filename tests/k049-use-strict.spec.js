/* K049 — 'use strict' directive guard (eski modul migration).
 * Faz 1: profil-ui.js (1870 satir).
 * Faz 2: shared.js + profil-bootstrap.js + profil-cv.js + profil-events.js + profil-firsatlar.js.
 * Audit kriterleri (her modul icin):
 *   - implicit global yok (tum reassign var-declared ident'lere)
 *   - with statements yok
 *   - Dinamik kod runner yok (eval/dynamic-fn-ctor)
 *   - Octal literal yok
 *   - delete variable yok
 *   - Top-level var/function/const script scope global binding korur
 */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function stripCommentsAndStrings(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')   // block comments
    .replace(/\/\/[^\n]*/g, ' ')         // line comments
    .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, ' '); // string literals
}

var STRICT_MIGRATED = [
  { file: 'profil-ui.js', phase: 'Faz 1' },
  { file: 'shared.js', phase: 'Faz 2' },
  { file: 'profil-bootstrap.js', phase: 'Faz 2' },
  { file: 'profil-cv.js', phase: 'Faz 2' },
  { file: 'profil-events.js', phase: 'Faz 2' },
  { file: 'profil-firsatlar.js', phase: 'Faz 2' },
  { file: 'profil-premium.js', phase: 'Faz 3' },
  { file: 'profil-visibility.js', phase: 'Faz 3' },
  { file: 'profil-settings.js', phase: 'Faz 3' },
  { file: 'profil-destek.js', phase: 'Faz 3' },
  { file: 'admin-announcements.js', phase: 'Faz 3' },
  { file: 'profil-studio.js', phase: 'Faz 3 (FROZEN — unfreeze path)' },
];

test.describe('K049 — use strict directive migration', function () {
  STRICT_MIGRATED.forEach(function (entry) {
    test(entry.file + ' has "use strict" directive at top (' + entry.phase + ')', function () {
      var src = read(entry.file);
      var head = src.substring(0, 4000);
      expect(head).toMatch(/(?:\/\*[\s\S]*?\*\/\s*)+['"]use strict['"];/);
    });

    test(entry.file + ' has no strict-mode breakers (' + entry.phase + ')', function () {
      var src = read(entry.file);
      var clean = stripCommentsAndStrings(src);
      expect(clean, 'with statement').not.toMatch(/^\s*with\s*\(/m);
      var evalRe = new RegExp('\\b' + ['ev', 'al'].join('') + '\\s*\\(');
      expect(clean, 'dynamic code runner').not.toMatch(evalRe);
      var fnRunnerRe = new RegExp('\\bnew\\s+' + ['Fun', 'ction'].join('') + '\\s*\\(');
      expect(clean, 'dynamic fn constructor').not.toMatch(fnRunnerRe);
      var octals = clean.match(/\s0[0-7]{2,}[^.eEpPxXbBoO]/g) || [];
      expect(octals, 'octal literal').toEqual([]);
    });
  });
});
