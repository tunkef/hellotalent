/* HR Campaigns kampanya panel smoke + integration testi — Sprint 5 / FAZ B
   Kapsam:
   - Markup: list + 4 status filter chip + new btn + 6-step wizard modal
   - Wizard: 6 step (isim, kanal, filtre, mesaj, zamanlama, onizleme)
   - Demo data: campaigns.json (5 kampanya, 3 status)
   - Demo persist: localStorage ht_hr_campaigns_demo_drafts
   - Yayinla disabled (MVP 2)
   - XSS guard: textContent + createElement only
   - Master pattern: lp-hdr + hr-subnav + data-hr-page="campaigns"
*/
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readFile(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }
function readJson(p) { return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8')); }

test.describe('FAZ B Sprint 5 — HR Campaigns kampanya', () => {

  /* ════════════════════════════════════════════════
     Asset varligi
     ════════════════════════════════════════════════ */
  test('Sprint 5 dosyalari diskte', () => {
    expect(fs.existsSync(path.join(ROOT, 'css/hr-campaigns.css'))).toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'js/hr-campaigns.js'))).toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'hr-campaigns.html'))).toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'data/demo/campaigns.json'))).toBeTruthy();
  });

  test('hr-campaigns.html Sprint 0 placeholderdan buyuk', () => {
    const html = readFile('hr-campaigns.html');
    expect(html.length).toBeGreaterThan(10000);
  });

  test('hr-campaigns.js iskelet seviyesinden buyuk', () => {
    const js = readFile('js/hr-campaigns.js');
    expect(js.length).toBeGreaterThan(10000);
  });

  test('hr-campaigns.css yuklenmis', () => {
    const css = readFile('css/hr-campaigns.css');
    expect(css.length).toBeGreaterThan(7000);
  });

  /* ════════════════════════════════════════════════
     Markup butunlugu
     ════════════════════════════════════════════════ */
  test('Master pattern: lp-hdr + hr-subnav + data-hr-page', () => {
    const html = readFile('hr-campaigns.html');
    expect(html).toMatch(/data-hr-page="campaigns"/);
    expect(html).toMatch(/<header class="lp-hdr">/);
    expect(html).toMatch(/<nav class="hr-subnav"/);
    expect(html).toMatch(/data-hr-link="campaigns"/);
  });

  test('Sidebar yasak (FAZ B)', () => {
    const html = readFile('hr-campaigns.html');
    expect(html).not.toMatch(/clatu-hr-sidebar|hr-sidebar__|sidebar-nav/);
  });

  test('Status filter 4 chip + count', () => {
    const html = readFile('hr-campaigns.html');
    expect(html).toMatch(/data-hr-cmp-status="all"/);
    expect(html).toMatch(/data-hr-cmp-status="draft"/);
    expect(html).toMatch(/data-hr-cmp-status="scheduled"/);
    expect(html).toMatch(/data-hr-cmp-status="sent"/);
    expect(html).toMatch(/data-hr-cmp-count-all/);
    expect(html).toMatch(/data-hr-cmp-count-draft/);
    expect(html).toMatch(/data-hr-cmp-count-scheduled/);
    expect(html).toMatch(/data-hr-cmp-count-sent/);
  });

  test('Yeni kampanya butonu', () => {
    const html = readFile('hr-campaigns.html');
    expect(html).toMatch(/data-hr-cmp-new/);
    expect(html).toMatch(/Yeni kampanya/);
  });

  test('Wizard modal markup', () => {
    const html = readFile('hr-campaigns.html');
    expect(html).toMatch(/data-hr-cmp-modal/);
    expect(html).toMatch(/data-hr-cmp-modal-close/);
    expect(html).toMatch(/data-hr-cmp-modal-backdrop/);
    expect(html).toMatch(/role="dialog"/);
  });

  test('Wizard 6 step (1-6 indicator + section)', () => {
    const html = readFile('hr-campaigns.html');
    for (var i = 1; i <= 6; i++) {
      expect(html, 'step-ind ' + i).toMatch(new RegExp('data-hr-cmp-step-ind="' + i + '"'));
      expect(html, 'step ' + i).toMatch(new RegExp('data-hr-cmp-step="' + i + '"'));
    }
  });

  test('Wizard form alanlari', () => {
    const html = readFile('hr-campaigns.html');
    expect(html).toMatch(/data-hr-cmp-input-title/);
    expect(html).toMatch(/data-hr-cmp-input-subject/);
    expect(html).toMatch(/data-hr-cmp-input-body/);
    expect(html).toMatch(/data-hr-cmp-input-city/);
    expect(html).toMatch(/data-hr-cmp-input-segment/);
    expect(html).toMatch(/data-hr-cmp-input-position/);
    expect(html).toMatch(/data-hr-cmp-input-min-exp/);
    expect(html).toMatch(/data-hr-cmp-input-schedule/);
  });

  test('Wizard footer 4 buton (prev/next/save/publish)', () => {
    const html = readFile('hr-campaigns.html');
    expect(html).toMatch(/data-hr-cmp-prev/);
    expect(html).toMatch(/data-hr-cmp-next/);
    expect(html).toMatch(/data-hr-cmp-save/);
    expect(html).toMatch(/data-hr-cmp-publish/);
  });

  test('Yayinla butonu MVP 2 kapali (disabled)', () => {
    const html = readFile('hr-campaigns.html');
    expect(html).toMatch(/data-hr-cmp-publish[^>]*disabled/);
    expect(html).toMatch(/Yayınla \(MVP 2\)/);
  });

  test('Onizleme alanlari (5 dt/dd)', () => {
    const html = readFile('hr-campaigns.html');
    expect(html).toMatch(/data-hr-cmp-preview-title/);
    expect(html).toMatch(/data-hr-cmp-preview-channel/);
    expect(html).toMatch(/data-hr-cmp-preview-target/);
    expect(html).toMatch(/data-hr-cmp-preview-msg/);
    expect(html).toMatch(/data-hr-cmp-preview-schedule/);
  });

  test('Toast container', () => {
    const html = readFile('hr-campaigns.html');
    expect(html).toMatch(/data-hr-toast/);
  });

  /* ════════════════════════════════════════════════
     CSS pattern guard
     ════════════════════════════════════════════════ */
  test('CSS: token-only', () => {
    const css = readFile('css/hr-campaigns.css');
    expect(css).toMatch(/var\(--verm\)/);
    expect(css).toMatch(/var\(--navy\)/);
    expect(css).toMatch(/var\(--bg[\s,)]/);
    expect(css).toMatch(/var\(--border\)/);
    expect(css).toMatch(/var\(--muted\)/);
  });

  test('CSS: modal + step indicator + radio + form', () => {
    const css = readFile('css/hr-campaigns.css');
    expect(css).toMatch(/\.hr-cmp-modal\b/);
    expect(css).toMatch(/\.hr-cmp-steps\b/);
    expect(css).toMatch(/\.hr-cmp-radio\b/);
    expect(css).toMatch(/\.hr-cmp-fld__input/);
    expect(css).toMatch(/\.hr-cmp-fld__textarea/);
  });

  test('CSS: dark mode triple layer', () => {
    const css = readFile('css/hr-campaigns.css');
    expect(css).toMatch(/html\.dark/);
    expect(css).toMatch(/html\[data-theme="dark"\]/);
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)/);
  });

  test('CSS: yasak font/renk yok', () => {
    const css = readFile('css/hr-campaigns.css');
    expect(css).not.toMatch(/font-family:\s*['"]?Inter/i);
    expect(css).not.toMatch(/font-family:\s*['"]?Roboto/i);
  });

  /* ════════════════════════════════════════════════
     JS pattern guard
     ════════════════════════════════════════════════ */
  test('JS: strict + IIFE', () => {
    const js = readFile('js/hr-campaigns.js');
    expect(js).toMatch(/'use strict';/);
    expect(js).toMatch(/\(function \(\) \{/);
  });

  test('JS: HRData.getCampaigns + searchCandidates kullaniliyor', () => {
    const js = readFile('js/hr-campaigns.js');
    expect(js).toMatch(/HRData\.getCampaigns\(/);
    expect(js).toMatch(/HRData\.searchCandidates\(/);
  });

  test('JS: HRShell.ready + getActivePosition kullaniliyor', () => {
    const js = readFile('js/hr-campaigns.js');
    expect(js).toMatch(/HRShell\.ready\(\)/);
    expect(js).toMatch(/HRShell\.getActivePosition/);
  });

  test('JS: localStorage drafts overlay key', () => {
    const js = readFile('js/hr-campaigns.js');
    expect(js).toMatch(/ht_hr_campaigns_demo_drafts/);
  });

  test('JS: TOTAL_STEPS = 6', () => {
    const js = readFile('js/hr-campaigns.js');
    expect(js).toMatch(/TOTAL_STEPS = 6/);
  });

  test('JS: showStep + captureStep + validateStep + saveDraft fonksiyonlari', () => {
    const js = readFile('js/hr-campaigns.js');
    expect(js).toMatch(/function showStep\(/);
    expect(js).toMatch(/function captureStep\(/);
    expect(js).toMatch(/function validateStep\(/);
    expect(js).toMatch(/function saveDraft\(/);
  });

  test('JS: ESC ile kapatma destegi', () => {
    const js = readFile('js/hr-campaigns.js');
    expect(js).toMatch(/'Escape'/);
    expect(js).toMatch(/closeWizard/);
  });

  test('JS: XSS guard — innerHTML yok', () => {
    const js = readFile('js/hr-campaigns.js');
    expect(js).not.toMatch(/\.innerHTML\s*=/);
    expect(js).toMatch(/textContent\s*=/);
    expect(js).toMatch(/createElement\(/);
  });

  test('JS: console.log yasak', () => {
    const js = readFile('js/hr-campaigns.js');
    expect(js).not.toMatch(/console\.log\(/);
  });

  /* ════════════════════════════════════════════════
     Demo data sanity
     ════════════════════════════════════════════════ */
  test('Demo data: campaigns.json en az 5 kayit', () => {
    const cmps = readJson('data/demo/campaigns.json');
    expect(Array.isArray(cmps)).toBeTruthy();
    expect(cmps.length).toBeGreaterThanOrEqual(5);
  });

  test('Demo data: kampanya sema (id, title, status, target/sent/opened/replied)', () => {
    const cmps = readJson('data/demo/campaigns.json');
    cmps.forEach((c, i) => {
      expect(c.id, `cmps[${i}].id`).toBeTruthy();
      expect(c.title, `cmps[${i}].title`).toBeTruthy();
      expect(['draft', 'scheduled', 'sent']).toContain(c.status);
      expect(typeof c.target_count === 'number').toBeTruthy();
      expect(typeof c.sent_count === 'number').toBeTruthy();
      expect(typeof c.opened_count === 'number').toBeTruthy();
      expect(typeof c.replied_count === 'number').toBeTruthy();
    });
  });

  test('Demo data: 3 farkli status temsil edilmis', () => {
    const cmps = readJson('data/demo/campaigns.json');
    const statuses = new Set(cmps.map((c) => c.status));
    expect(statuses.has('draft')).toBeTruthy();
    expect(statuses.has('sent')).toBeTruthy();
    // scheduled da var olmali (3-status coverage)
    expect(statuses.has('scheduled')).toBeTruthy();
  });

  /* ════════════════════════════════════════════════
     Tonality / copy
     ════════════════════════════════════════════════ */
  test('Copy: roportaj yasak', () => {
    const html = readFile('hr-campaigns.html');
    expect(html).not.toMatch(/röportaj/i);
  });

  test('Copy: AI-ism yasak ifadeler', () => {
    const html = readFile('hr-campaigns.html');
    [
      /size özel olarak hazırland/i,
      /yapay zeka destekli/i,
      /sizin için hazırlanmış/i
    ].forEach((p) => {
      expect(html).not.toMatch(p);
    });
  });

  test('Copy: KVKK uyumlu siz hitabi + Turkce', () => {
    const html = readFile('hr-campaigns.html');
    expect(html).toMatch(/Kampanyalar/);
    expect(html).toMatch(/aday/i);
    // Wizard step labels
    expect(html).toMatch(/Kanal/);
    expect(html).toMatch(/Filtre/);
    expect(html).toMatch(/Mesaj/);
    expect(html).toMatch(/Zamanlama/);
    expect(html).toMatch(/Önizleme/);
  });

  test('admin.html dokunulmadi', () => {
    expect(fs.existsSync(path.join(ROOT, 'admin.html'))).toBeTruthy();
  });

});
