/* HR Sprint 8 — POLISH guard
   Tum 9 panel HTML'inde hr-polish.css link'i var mi?
   Polish layer regression korumasi.
*/
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
function readFile(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

const HR_PAGES = [
  'ik.html',
  'hr-pipeline.html',
  'hr-pool.html',
  'hr-messages.html',
  'hr-candidate.html',
  'hr-campaigns.html',
  'hr-company.html',
  'hr-team.html',
  'hr-settings.html'
];

test.describe('FAZ B Sprint 8 — Polish layer (Asama 85)', () => {

  test('css/hr-polish.css diskte ve > 5KB', () => {
    const fp = path.join(ROOT, 'css/hr-polish.css');
    expect(fs.existsSync(fp), 'hr-polish.css').toBeTruthy();
    const size = fs.statSync(fp).size;
    expect(size, 'hr-polish.css size').toBeGreaterThan(5000);
  });

  test('Tum 9 panel hr-polish.css link iceriyor', () => {
    HR_PAGES.forEach((file) => {
      const html = readFile(file);
      expect(html, file + ' polish link').toMatch(/css\/hr-polish\.css/);
    });
  });

  test('Tum 9 panel polish link en son CSS (override layer)', () => {
    // hr-polish.css link'i hr-shell.css'ten sonra gelmeli (override icin)
    HR_PAGES.forEach((file) => {
      const html = readFile(file);
      const shellIdx = html.indexOf('hr-shell.css');
      const polishIdx = html.indexOf('hr-polish.css');
      expect(shellIdx, file + ' shell exists').toBeGreaterThan(-1);
      expect(polishIdx, file + ' polish exists').toBeGreaterThan(-1);
      expect(polishIdx, file + ' polish after shell').toBeGreaterThan(shellIdx);
    });
  });

  test('hr-polish.css 20 ana bolum (token harmonization → mobile touch)', () => {
    const css = readFile('css/hr-polish.css');
    // Numarali bolum basliklari (1-20 araliginda)
    const sectionHeaders = css.match(/^\s*\d+\.\s+[A-Z]/gm) || [];
    expect(sectionHeaders.length, 'sections >= 18').toBeGreaterThanOrEqual(18);
  });

  test('hr-polish.css 8 panel data-hr-page selector iceriyor', () => {
    const css = readFile('css/hr-polish.css');
    [
      'data-hr-page="hub"',
      'data-hr-page="pipeline"',
      'data-hr-page="pool"',
      'data-hr-page="messages"',
      'data-hr-page="candidate"',
      'data-hr-page="campaigns"',
      'data-hr-page="company"',
      'data-hr-page="team"',
      'data-hr-page="settings"'
    ].forEach((sel) => {
      expect(css, sel).toContain(sel);
    });
  });

  test('hr-polish.css dark mode parite blogu', () => {
    const css = readFile('css/hr-polish.css');
    expect(css, 'dark selector').toMatch(/html\.dark|html\[data-theme="dark"\]/);
    // En az 5 dark mode override blogu olmali (input, pl-meta, msg, form, campaigns)
    const darkMatches = css.match(/html\[data-theme="dark"\]/g) || [];
    expect(darkMatches.length, 'dark blocks').toBeGreaterThanOrEqual(5);
  });

  test('hr-polish.css 44px touch target media query', () => {
    const css = readFile('css/hr-polish.css');
    expect(css, 'mobile query').toMatch(/@media\s*\(max-width:\s*768px\)/);
    expect(css, 'min-height 44px').toMatch(/min-height:\s*44px/);
  });

});
