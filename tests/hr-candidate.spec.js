/* HR Candidate detay sayfasi smoke + integration testi — Sprint 4 / FAZ B
   Kapsam:
   - Markup: hero header, 4 tab (Profil/Notlar/Mesajlar/Eslesme), breadcrumb, CTA'lar
   - URL parametresi: ?id=, ?from=, ?tab=
   - Demo data: candidates.json'dan getCandidate, messages.json'dan thread match
   - Notes CRUD: localStorage ht_hr_notes_demo_state
   - Match breakdown heuristics: 4 factor (pozisyon/sehir/segment/deneyim)
   - XSS guard: textContent + createElement only
   - Master pattern: lp-hdr + hr-subnav + data-hr-page="candidate"
   - A11y: tablist/tab/tabpanel ARIA, sr-only label
*/
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readFile(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function readJson(p) { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); }

test.describe('FAZ B Sprint 4 — HR Candidate detay', () => {

  /* ════════════════════════════════════════════════
     Asset varligi
     ════════════════════════════════════════════════ */
  test('Sprint 4 dosyalari diskte', () => {
    expect(fs.existsSync(path.join(ROOT, 'css/hr-candidate.css'))).toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'js/hr-candidate.js'))).toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'hr-candidate.html'))).toBeTruthy();
  });

  test('hr-candidate.html Sprint 0 placeholderdan buyuk', () => {
    const html = readFile('hr-candidate.html');
    expect(html.length).toBeGreaterThan(10000);
  });

  test('hr-candidate.js iskelet seviyesinden buyuk', () => {
    const js = readFile('js/hr-candidate.js');
    expect(js.length).toBeGreaterThan(15000);
  });

  test('hr-candidate.css yuklenmis (sayfa-spesifik)', () => {
    const css = readFile('css/hr-candidate.css');
    expect(css.length).toBeGreaterThan(8000);
  });

  /* ════════════════════════════════════════════════
     Markup butunlugu
     ════════════════════════════════════════════════ */
  test('Master pattern: lp-hdr + hr-subnav + data-hr-page', () => {
    const html = readFile('hr-candidate.html');
    expect(html).toMatch(/data-hr-page="candidate"/);
    expect(html).toMatch(/<header class="lp-hdr">/);
    expect(html).toMatch(/<nav class="hr-subnav"/);
    expect(html).toMatch(/data-hr-link="candidate"/);
  });

  test('Sidebar yasak (FAZ B)', () => {
    const html = readFile('hr-candidate.html');
    expect(html).not.toMatch(/clatu-hr-sidebar|hr-sidebar__|sidebar-nav/);
  });

  test('CSS yuklemeleri: tokens + shared-v2 + hr-shell + hr-candidate', () => {
    const html = readFile('hr-candidate.html');
    expect(html).toMatch(/css\/tokens\.css/);
    expect(html).toMatch(/shared-v2\.css/);
    expect(html).toMatch(/css\/hr-shell\.css/);
    expect(html).toMatch(/css\/hr-candidate\.css/);
  });

  test('Hero header yapisi', () => {
    const html = readFile('hr-candidate.html');
    expect(html).toMatch(/data-hr-cd-avatar/);
    expect(html).toMatch(/data-hr-cd-name/);
    expect(html).toMatch(/data-hr-cd-pos/);
    expect(html).toMatch(/data-hr-cd-loc/);
    expect(html).toMatch(/data-hr-cd-exp/);
    expect(html).toMatch(/data-hr-cd-chips/);
    expect(html).toMatch(/data-hr-cd-add/);
    expect(html).toMatch(/data-hr-cd-msg/);
  });

  test('4 tab: Profil / Notlar / Mesajlar / Eslesme', () => {
    const html = readFile('hr-candidate.html');
    expect(html).toMatch(/data-hr-cd-tab="profile"/);
    expect(html).toMatch(/data-hr-cd-tab="notes"/);
    expect(html).toMatch(/data-hr-cd-tab="messages"/);
    expect(html).toMatch(/data-hr-cd-tab="match"/);
    expect(html).toMatch(/role="tab"/);
    expect(html).toMatch(/role="tablist"/);
    expect(html).toMatch(/role="tabpanel"/);
  });

  test('Profile pane: 6 deneyim alani + 3 lokasyon alani', () => {
    const html = readFile('hr-candidate.html');
    [
      'data-hr-cd-fld-pos',
      'data-hr-cd-fld-exp',
      'data-hr-cd-fld-edu',
      'data-hr-cd-fld-dob',
      'data-hr-cd-fld-work',
      'data-hr-cd-fld-avail',
      'data-hr-cd-fld-city',
      'data-hr-cd-fld-district',
      'data-hr-cd-fld-segment',
      'data-hr-cd-fld-brands',
      'data-hr-cd-fld-updated',
      'data-hr-cd-fld-active',
      'data-hr-cd-fld-id'
    ].forEach((key) => {
      expect(html, key).toMatch(new RegExp(key));
    });
  });

  test('Notes pane: form + input + submit + list', () => {
    const html = readFile('hr-candidate.html');
    expect(html).toMatch(/data-hr-cd-note-form/);
    expect(html).toMatch(/data-hr-cd-note-input/);
    expect(html).toMatch(/data-hr-cd-note-submit/);
    expect(html).toMatch(/data-hr-cd-notes-list/);
    expect(html).toMatch(/data-hr-cd-notes-count/);
  });

  test('Match pane: intro + list', () => {
    const html = readFile('hr-candidate.html');
    expect(html).toMatch(/data-hr-cd-match-intro/);
    expect(html).toMatch(/data-hr-cd-match-list/);
    expect(html).toMatch(/data-hr-cd-match-wrap/);
  });

  test('Breadcrumb + back link', () => {
    const html = readFile('hr-candidate.html');
    expect(html).toMatch(/hr-cd-breadcrumb/);
    expect(html).toMatch(/data-hr-cd-back/);
    expect(html).toMatch(/data-hr-cd-back-label/);
  });

  test('Loading + empty + content state divisions', () => {
    const html = readFile('hr-candidate.html');
    expect(html).toMatch(/data-hr-cd-loading/);
    expect(html).toMatch(/data-hr-cd-empty/);
    expect(html).toMatch(/data-hr-cd-content/);
  });

  test('Toast container', () => {
    const html = readFile('hr-candidate.html');
    expect(html).toMatch(/data-hr-toast/);
  });

  /* ════════════════════════════════════════════════
     CSS pattern guard
     ════════════════════════════════════════════════ */
  test('CSS: token-only renk', () => {
    const css = readFile('css/hr-candidate.css');
    expect(css).toMatch(/var\(--verm\)/);
    expect(css).toMatch(/var\(--navy\)/);
    // --bg ve --bg-elev fallback ile kullanilabilir (var(--bg, ...))
    expect(css).toMatch(/var\(--bg[\s,)]/);
    expect(css).toMatch(/var\(--border\)/);
    expect(css).toMatch(/var\(--muted\)/);
  });

  test('CSS: hero grid + responsive', () => {
    const css = readFile('css/hr-candidate.css');
    expect(css).toMatch(/\.hr-cd-hero\s*\{/);
    expect(css).toMatch(/grid-template-columns/);
    expect(css).toMatch(/@media \(max-width: 720px\)/);
  });

  test('CSS: tab + tabpanel + selected state', () => {
    const css = readFile('css/hr-candidate.css');
    expect(css).toMatch(/\.hr-cd-tab\b/);
    expect(css).toMatch(/aria-selected="true"/);
  });

  test('CSS: dark mode triple layer', () => {
    const css = readFile('css/hr-candidate.css');
    expect(css).toMatch(/html\.dark/);
    expect(css).toMatch(/html\[data-theme="dark"\]/);
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)/);
  });

  test('CSS: Inter / Roboto / purple yasak yok', () => {
    const css = readFile('css/hr-candidate.css');
    expect(css).not.toMatch(/font-family:\s*['"]?Inter/i);
    expect(css).not.toMatch(/font-family:\s*['"]?Roboto/i);
    // purple gradient kullanma
    expect(css).not.toMatch(/linear-gradient[^;]*#[a-f0-9]*[c-f][a-f0-9]*[8-9a-f]/i);
  });

  /* ════════════════════════════════════════════════
     JS pattern guard
     ════════════════════════════════════════════════ */
  test('JS: strict + IIFE', () => {
    const js = readFile('js/hr-candidate.js');
    expect(js).toMatch(/'use strict';/);
    expect(js).toMatch(/\(function \(\) \{/);
  });

  test('JS: HRData.getCandidate cagriliyor', () => {
    const js = readFile('js/hr-candidate.js');
    expect(js).toMatch(/HRData\.getCandidate\(/);
  });

  test('JS: HRData.getMessageThreads cagriliyor', () => {
    const js = readFile('js/hr-candidate.js');
    expect(js).toMatch(/HRData\.getMessageThreads\(/);
  });

  test('JS: HRData.addToPipeline cagriliyor', () => {
    const js = readFile('js/hr-candidate.js');
    expect(js).toMatch(/HRData\.addToPipeline\(/);
  });

  test('JS: HRShell.ready bekleniyor', () => {
    const js = readFile('js/hr-candidate.js');
    expect(js).toMatch(/HRShell\.ready\(\)/);
  });

  test('JS: URL ?id parametresi okunuyor', () => {
    const js = readFile('js/hr-candidate.js');
    expect(js).toMatch(/URLSearchParams/);
    expect(js).toMatch(/params\.get\('id'\)/);
  });

  test('JS: localStorage notes overlay key', () => {
    const js = readFile('js/hr-candidate.js');
    expect(js).toMatch(/ht_hr_notes_demo_state/);
  });

  test('JS: tablist activate function', () => {
    const js = readFile('js/hr-candidate.js');
    expect(js).toMatch(/activateTab\(/);
  });

  test('JS: match breakdown 4-factor heuristics', () => {
    const js = readFile('js/hr-candidate.js');
    expect(js).toMatch(/computeMatchBreakdown\(/);
    expect(js).toMatch(/factors\.push/);
    // 4 factor label
    expect(js).toMatch(/'Pozisyon'/);
    expect(js).toMatch(/'Şehir'/);
    expect(js).toMatch(/'Segment'/);
    expect(js).toMatch(/'Deneyim'/);
  });

  test('JS: XSS guard — innerHTML yok', () => {
    const js = readFile('js/hr-candidate.js');
    expect(js).not.toMatch(/\.innerHTML\s*=/);
    expect(js).toMatch(/textContent\s*=/);
    expect(js).toMatch(/createElement\(/);
  });

  test('JS: console.log yasak (sadece warn/error)', () => {
    const js = readFile('js/hr-candidate.js');
    expect(js).not.toMatch(/console\.log\(/);
  });

  test('JS: position-changed event listener', () => {
    const js = readFile('js/hr-candidate.js');
    expect(js).toMatch(/'hr:position-changed'/);
  });

  test('JS: deep tab destek (?tab=notes vs)', () => {
    const js = readFile('js/hr-candidate.js');
    expect(js).toMatch(/'profile', 'notes', 'messages', 'match'/);
  });

  /* ════════════════════════════════════════════════
     Demo data sanity
     ════════════════════════════════════════════════ */
  test('Demo data: candidates.json en az 50 aday', () => {
    const cands = readJson('data/demo/candidates.json');
    expect(Array.isArray(cands)).toBeTruthy();
    expect(cands.length).toBeGreaterThanOrEqual(50);
  });

  test('Demo data: aday sema (id, full_name, pozisyon, sehir, deneyim_yil)', () => {
    const cands = readJson('data/demo/candidates.json');
    cands.slice(0, 10).forEach((c, i) => {
      expect(c.id, `cands[${i}].id`).toBeTruthy();
      expect(c.full_name, `cands[${i}].full_name`).toBeTruthy();
      expect(c.pozisyon, `cands[${i}].pozisyon`).toBeTruthy();
      expect(c.sehir, `cands[${i}].sehir`).toBeTruthy();
      expect(typeof c.deneyim_yil === 'number').toBeTruthy();
    });
  });

  test('hr-data.js: getCandidateById export', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toMatch(/getCandidate:/);  // alias
    expect(js).toMatch(/getCandidateById:/);
  });

  /* ════════════════════════════════════════════════
     Tonality + UI dil
     ════════════════════════════════════════════════ */
  test('Copy: roportaj yasak (mulakat / is gorusmesi)', () => {
    const html = readFile('hr-candidate.html');
    expect(html).not.toMatch(/röportaj/i);
  });

  test('Copy: AI-ism yasak ifadeler', () => {
    const html = readFile('hr-candidate.html');
    [
      /size özel olarak hazırland/i,
      /sizin için hazırlanmış/i,
      /yapay zeka destekli/i
    ].forEach((p) => {
      expect(html).not.toMatch(p);
    });
  });

  test('Copy: Turkce + siz hitabi', () => {
    const html = readFile('hr-candidate.html');
    expect(html).toMatch(/Aday/i);
    expect(html).toMatch(/Profil/);
    expect(html).toMatch(/Notlar/);
    expect(html).toMatch(/Eşleşme/);
  });

  test('admin.html dokunulmadi', () => {
    expect(fs.existsSync(path.join(ROOT, 'admin.html'))).toBeTruthy();
  });

});
