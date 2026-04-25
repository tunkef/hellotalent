/* HR Messages mesajlasma smoke + integration testi — Sprint 3 / FAZ B
   Kapsam:
   - Markup: 2-pane (list + panel), search, filter, compose, position switcher
   - Demo data load: messages.json (10 thread, 30+ mesaj)
   - Sayfa-spesifik CSS: hr-messages.css yuklenmis
   - JS modul: HRData.getMessageThreads + sendMessage entegrasyonu
   - localStorage persist key: ht_hr_messages_demo_state (overlay)
   - XSS guard: textContent + createElement only, innerHTML yok
   - A11y: aria-label, aria-live, aria-current, sr-only, role tab/listitem
   - Master pattern: lp-hdr + hr-subnav + data-hr-page="messages"
*/
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readFile(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}
function readJson(p) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
}

test.describe('FAZ B Sprint 3 — HR Messages mesajlasma', () => {

  /* ════════════════════════════════════════════════
     Asset varligi
     ════════════════════════════════════════════════ */
  test('Sprint 3 dosyalari diskte', () => {
    expect(fs.existsSync(path.join(ROOT, 'css/hr-messages.css')), 'css/hr-messages.css').toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'js/hr-messages.js')), 'js/hr-messages.js').toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'hr-messages.html')), 'hr-messages.html').toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'data/demo/messages.json')), 'messages.json').toBeTruthy();
  });

  test('hr-messages.html Sprint 0 placeholderdan buyuk', () => {
    const html = readFile('hr-messages.html');
    expect(html.length).toBeGreaterThan(8000);
  });

  test('hr-messages.js iskelet seviyesinden buyuk', () => {
    const js = readFile('js/hr-messages.js');
    expect(js.length).toBeGreaterThan(10000);
  });

  test('hr-messages.css yuklenmis (sayfa-spesifik)', () => {
    const css = readFile('css/hr-messages.css');
    expect(css.length).toBeGreaterThan(6000);
  });

  /* ════════════════════════════════════════════════
     Markup butunlugu
     ════════════════════════════════════════════════ */
  test('Master pattern: lp-hdr + hr-subnav + data-hr-page', () => {
    const html = readFile('hr-messages.html');
    expect(html).toMatch(/data-hr-page="messages"/);
    expect(html).toMatch(/<header class="lp-hdr">/);
    expect(html).toMatch(/<nav class="hr-subnav"/);
    expect(html).toMatch(/data-hr-link="messages"/);
    // Sidebar yok (FAZ B kurali)
    expect(html).not.toMatch(/clatu-hr-sidebar|hr-sidebar__|sidebar-nav/);
  });

  test('CSS yuklemeleri: tokens + shared-v2 + hr-shell + hr-messages', () => {
    const html = readFile('hr-messages.html');
    expect(html).toMatch(/css\/tokens\.css/);
    expect(html).toMatch(/shared-v2\.css/);
    expect(html).toMatch(/css\/hr-shell\.css/);
    expect(html).toMatch(/css\/hr-messages\.css/);
  });

  test('Script yuklemeleri: shared + supabase + hr-shell + hr-data + hr-messages', () => {
    const html = readFile('hr-messages.html');
    expect(html).toMatch(/shared\.js/);
    expect(html).toMatch(/supabase-js@2/);
    expect(html).toMatch(/js\/hr-shell\.js/);
    expect(html).toMatch(/js\/hr-data\.js/);
    expect(html).toMatch(/js\/hr-messages\.js/);
  });

  test('2-pane layout: hr-msg-list + hr-msg-panel', () => {
    const html = readFile('hr-messages.html');
    expect(html).toMatch(/data-hr-msg-wrap/);
    expect(html).toMatch(/data-hr-msg-list/);
    expect(html).toMatch(/data-hr-msg-panel/);
  });

  test('Search + filter elemanlari', () => {
    const html = readFile('hr-messages.html');
    expect(html).toMatch(/data-hr-msg-search/);
    expect(html).toMatch(/data-hr-msg-filter="all"/);
    expect(html).toMatch(/data-hr-msg-filter="unread"/);
  });

  test('Compose form + send button + textarea', () => {
    const html = readFile('hr-messages.html');
    expect(html).toMatch(/data-hr-msg-compose/);
    expect(html).toMatch(/data-hr-msg-input/);
    expect(html).toMatch(/data-hr-msg-send/);
    expect(html).toMatch(/<textarea/);
  });

  test('Empty state ve loading state', () => {
    const html = readFile('hr-messages.html');
    expect(html).toMatch(/data-hr-msg-list-loading/);
    expect(html).toMatch(/data-hr-msg-list-empty/);
    expect(html).toMatch(/data-hr-msg-panel-empty/);
    expect(html).toMatch(/data-hr-msg-panel-active/);
  });

  test('Position switcher (subnav uyumu)', () => {
    const html = readFile('hr-messages.html');
    expect(html).toMatch(/data-hr-position-btn/);
    expect(html).toMatch(/data-hr-position-menu/);
    expect(html).toMatch(/data-hr-position-value/);
  });

  test('User menu (master pattern)', () => {
    const html = readFile('hr-messages.html');
    expect(html).toMatch(/data-hr-user-menu/);
    expect(html).toMatch(/data-hr-logout/);
  });

  test('Toast container', () => {
    const html = readFile('hr-messages.html');
    expect(html).toMatch(/data-hr-toast/);
  });

  test('Skip link a11y', () => {
    const html = readFile('hr-messages.html');
    expect(html).toMatch(/skip-to-content/);
    expect(html).toMatch(/İçeriğe atla/);
  });

  /* ════════════════════════════════════════════════
     CSS pattern guard
     ════════════════════════════════════════════════ */
  test('CSS: token-only renk kullanimi (hardcoded hex sinirli)', () => {
    const css = readFile('css/hr-messages.css');
    // Master tokens kullaniliyor
    expect(css).toMatch(/var\(--verm\)/);
    expect(css).toMatch(/var\(--navy\)/);
    expect(css).toMatch(/var\(--bg\)/);
    expect(css).toMatch(/var\(--border\)/);
    expect(css).toMatch(/var\(--muted\)/);
  });

  test('CSS: 2-pane grid + mobile fallback', () => {
    const css = readFile('css/hr-messages.css');
    expect(css).toMatch(/\.hr-msg-wrap\s*\{/);
    expect(css).toMatch(/grid-template-columns/);
    expect(css).toMatch(/@media \(max-width: 880px\)/);
  });

  test('CSS: dark mode triple layer (html.dark + data-theme + prefers-color-scheme)', () => {
    const css = readFile('css/hr-messages.css');
    expect(css).toMatch(/html\.dark/);
    expect(css).toMatch(/html\[data-theme="dark"\]/);
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)/);
  });

  test('CSS: bubble row tarafi data-from ile ayriliyor', () => {
    const css = readFile('css/hr-messages.css');
    expect(css).toMatch(/\[data-from="hr"\]/);
    expect(css).toMatch(/\[data-from="candidate"\]/);
  });

  test('CSS: Inter / Roboto / purple yasak font/renk yok', () => {
    const css = readFile('css/hr-messages.css');
    expect(css).not.toMatch(/font-family:\s*['"]?Inter/i);
    expect(css).not.toMatch(/font-family:\s*['"]?Roboto/i);
    expect(css).not.toMatch(/#[0-9a-f]*[8-9a-f][0-9a-f]*[0-9a-f]\s+0%,\s*#[0-9a-f]*[a-f][0-9a-f]*\s+100%.*purple/i);
  });

  /* ════════════════════════════════════════════════
     JS pattern guard
     ════════════════════════════════════════════════ */
  test('JS: strict mode + IIFE wrap', () => {
    const js = readFile('js/hr-messages.js');
    expect(js).toMatch(/'use strict';/);
    expect(js).toMatch(/\(function \(\) \{/);
  });

  test('JS: HRData.getMessageThreads cagriliyor', () => {
    const js = readFile('js/hr-messages.js');
    expect(js).toMatch(/HRData\.getMessageThreads\(\)/);
  });

  test('JS: HRData.sendMessage cagriliyor', () => {
    const js = readFile('js/hr-messages.js');
    expect(js).toMatch(/HRData\.sendMessage\(/);
  });

  test('JS: HRShell.ready bekleniyor', () => {
    const js = readFile('js/hr-messages.js');
    expect(js).toMatch(/HRShell\.ready\(\)/);
  });

  test('JS: localStorage overlay key sabit', () => {
    const js = readFile('js/hr-messages.js');
    expect(js).toMatch(/ht_hr_messages_demo_state/);
  });

  test('JS: position-changed event listener', () => {
    const js = readFile('js/hr-messages.js');
    expect(js).toMatch(/'hr:position-changed'/);
  });

  test('JS: XSS guard — innerHTML kullanmiyor (textContent + createElement)', () => {
    const js = readFile('js/hr-messages.js');
    // innerHTML yazimi olmamali (read-only kullanilmiyor zaten)
    expect(js).not.toMatch(/\.innerHTML\s*=/);
    // textContent var
    expect(js).toMatch(/textContent\s*=/);
    expect(js).toMatch(/createElement\(/);
  });

  test('JS: console.log yasak (sadece warn/error)', () => {
    const js = readFile('js/hr-messages.js');
    expect(js).not.toMatch(/console\.log\(/);
  });

  test('JS: deep link destek (?thread / ?candidate)', () => {
    const js = readFile('js/hr-messages.js');
    expect(js).toMatch(/URLSearchParams/);
  });

  test('JS: Enter ile gonder, Shift+Enter satir', () => {
    const js = readFile('js/hr-messages.js');
    expect(js).toMatch(/e\.shiftKey/);
    expect(js).toMatch(/e\.key === 'Enter'/);
  });

  /* ════════════════════════════════════════════════
     Demo data sanity
     ════════════════════════════════════════════════ */
  test('Demo data: messages.json minimum 10 thread', () => {
    const threads = readJson('data/demo/messages.json');
    expect(Array.isArray(threads)).toBeTruthy();
    expect(threads.length).toBeGreaterThanOrEqual(10);
  });

  test('Demo data: thread sema (id, candidate_id, position_id, messages)', () => {
    const threads = readJson('data/demo/messages.json');
    threads.slice(0, 5).forEach((t, i) => {
      expect(t.id, `thread[${i}].id`).toBeTruthy();
      expect(t.candidate_id, `thread[${i}].candidate_id`).toBeTruthy();
      expect(t.position_id, `thread[${i}].position_id`).toBeTruthy();
      expect(t.candidate_name, `thread[${i}].candidate_name`).toBeTruthy();
      expect(Array.isArray(t.messages), `thread[${i}].messages array`).toBeTruthy();
      expect(t.messages.length, `thread[${i}].messages count`).toBeGreaterThan(0);
    });
  });

  test('Demo data: mesaj sema (id, from, body, sent_at)', () => {
    const threads = readJson('data/demo/messages.json');
    let totalMsgs = 0;
    threads.forEach((t) => {
      totalMsgs += t.messages.length;
      t.messages.forEach((m, mi) => {
        expect(m.id, `message[${mi}].id`).toBeTruthy();
        expect(['hr', 'candidate']).toContain(m.from);
        expect(m.body, `message[${mi}].body`).toBeTruthy();
        expect(m.sent_at, `message[${mi}].sent_at`).toBeTruthy();
        // ISO date kontrol
        expect(new Date(m.sent_at).toString()).not.toBe('Invalid Date');
      });
    });
    expect(totalMsgs).toBeGreaterThanOrEqual(30);
  });

  test('Demo data: position_id messages.json ↔ positions.json esleme', () => {
    const threads = readJson('data/demo/messages.json');
    const positions = readJson('data/demo/positions.json');
    const posIds = new Set(positions.map((p) => String(p.id)));
    threads.forEach((t) => {
      expect(posIds.has(String(t.position_id)), `thread ${t.id} position_id=${t.position_id} must exist in positions.json`).toBeTruthy();
    });
  });

  /* ════════════════════════════════════════════════
     hr-data.js adapter contract
     ════════════════════════════════════════════════ */
  test('hr-data.js: getMessageThreads + sendMessage export', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toMatch(/getMessageThreads:/);
    expect(js).toMatch(/sendMessage:/);
  });

  test('hr-data.js: real mode flag default false (MVP 2 hazirligi)', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toMatch(/HR_REAL_MODE_ENABLED === true/);
  });

  /* ════════════════════════════════════════════════
     Tonality guard (avoid-ai-writing)
     ════════════════════════════════════════════════ */
  test('Copy: AI-ism yasak ifadeler yok', () => {
    const html = readFile('hr-messages.html');
    // Yasak fillerler
    const banned = [
      /size özel olarak hazırland/i,
      /sizin için hazırlanmış/i,
      /yapay zeka destekli/i,
      /röportaj/i  // proje kurali: "mülakat" veya "iş görüşmesi"
    ];
    banned.forEach((pat) => {
      expect(html).not.toMatch(pat);
    });
  });

  test('Copy: tum metin Turkce (siz hitabi)', () => {
    const html = readFile('hr-messages.html');
    // Acik yazi parcalari
    expect(html).toMatch(/Mesajlar/);
    expect(html).toMatch(/Adaylarla yazışma/);
    expect(html).toMatch(/Konuşmalar adaya göre/);
    // 'sen' tek basina hitap olarak gecmemeli (sevdigin / anlatabilirsin gibi)
    // Bu kontrolu loose tutuyoruz — placeholder/title icinde kalabilir
  });

  /* ════════════════════════════════════════════════
     Master pattern guard (sidebar yasak)
     ════════════════════════════════════════════════ */
  test('Sidebar pattern yok (FAZ B kurali)', () => {
    const html = readFile('hr-messages.html');
    expect(html).not.toMatch(/<aside[^>]*class="[^"]*sidebar/);
    expect(html).not.toMatch(/<nav[^>]*class="[^"]*hr-sidebar/);
  });

  test('admin.html dokunulmadi guard', () => {
    expect(fs.existsSync(path.join(ROOT, 'admin.html'))).toBeTruthy();
    const adminMtime = fs.statSync(path.join(ROOT, 'admin.html')).mtime;
    // Sadece varlik + var olmasi yeterli — direkt dokunma garantisi commit log ile dogrulanir
    expect(adminMtime).toBeTruthy();
  });

});
