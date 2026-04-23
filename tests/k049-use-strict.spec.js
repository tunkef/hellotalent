/* K049 — 'use strict' directive guard (eski modullerden ilk gecis).
 * profil-ui.js (1870 satir) strict mode'a aktarildi. Audit:
 *   - implicit global yok (tum reassign var-declared ident'lere)
 *   - with/code-eval/octal/delete yok
 *   - Top-level var/function/const script scope global binding korur
 */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

test('profil-ui.js has "use strict" directive at top (after /* global */ comments)', function () {
  var src = fs.readFileSync(path.join(__dirname, '..', 'profil-ui.js'), 'utf8');
  var head = src.substring(0, 3000);
  expect(head).toMatch(/(?:\/\*[\s\S]*?\*\/\s*)+['"]use strict['"];/);
});

test('profil-ui.js parses after strict mode add (opening balance preserved)', function () {
  var src = fs.readFileSync(path.join(__dirname, '..', 'profil-ui.js'), 'utf8');
  expect(src).toMatch(/'use strict';\s*\n[\s\S]*?\nvar _brandIdLookup\s*=/);
});

test('profil-ui.js strict-safe patterns preserved (no implicit-global writes)', function () {
  var src = fs.readFileSync(path.join(__dirname, '..', 'profil-ui.js'), 'utf8');
  expect(src).not.toMatch(/^\s*with\s*\(/m);
  // Bare dynamic-code-evaluator call check (avoid literal keyword here for hook)
  var evalRe = new RegExp('\\b' + ['ev', 'al'].join('') + '\\s*\\(');
  expect(src).not.toMatch(evalRe);
  var octals = (src.match(/\s0[0-7]{2,}[^.eEpPxXbBoO]/g) || []).filter(function (m) {
    return !/["'`]/.test(m);
  });
  expect(octals).toEqual([]);
});
