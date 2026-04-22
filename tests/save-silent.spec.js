/* K046 — saveProfileRPC silent opt + skip/save-exit UX fix */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');
function readFromRepo(rel) { return fs.readFileSync(path.join(__dirname,'..',rel),'utf8'); }

test.describe('K046 — saveProfileRPC silent mode', function () {
  var uiJs, eventsJs;
  test.beforeAll(function () {
    uiJs = readFromRepo('profil-ui.js');
    eventsJs = readFromRepo('profil-events.js');
  });

  test('saveProfileRPC accepts opts with silent flag', function () {
    expect(uiJs).toMatch(/async function saveProfileRPC\(onComplete,\s*opts\)/);
    expect(uiJs).toMatch(/opts\.silent/);
  });

  test('success modal skipped when opts.silent', function () {
    // Near the modal-success show line, opts.silent guard must exist.
    var showLine = "document.getElementById('modal-success').classList.add('show')";
    var idx = uiJs.indexOf(showLine);
    expect(idx).toBeGreaterThan(-1);
    // Look at 400 chars before AND 50 chars after (covers wrapping `}` closer)
    var ctx = uiJs.substring(Math.max(0, idx - 700), idx + showLine.length + 100);
    expect(ctx).toMatch(/opts\.silent/);
  });

  test('btn-wiz-skip passes silent:true + clears returnToPanel', function () {
    var snippet = eventsJs.match(/btn-wiz-skip[\s\S]{0,900}/);
    expect(snippet).not.toBeNull();
    expect(snippet[0]).toContain('returnToPanel = null');
    expect(snippet[0]).toMatch(/saveProfileRPC\([\s\S]*?\{\s*silent:\s*true\s*\}/);
  });

  test('btn-wiz-save-exit passes silent:true + clears returnToPanel', function () {
    var snippet = eventsJs.match(/btn-wiz-save-exit[\s\S]{0,1500}/);
    expect(snippet).not.toBeNull();
    expect(snippet[0]).toContain('returnToPanel = null');
    expect(snippet[0]).toMatch(/saveProfileRPC\([\s\S]*?\{\s*silent:\s*true\s*\}/);
  });

  test('skip handler surfaces toast feedback (not modal)', function () {
    var snippet = eventsJs.match(/btn-wiz-skip[\s\S]{0,900}/);
    expect(snippet[0]).toContain('showToast');
  });
});
