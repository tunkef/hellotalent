/* HR Pipeline kanban smoke + integration testi — Sprint 1 / FAZ B
   Kapsam:
   - Markup: 5-stage kanban iskeleti, position switcher, drawer, modal, toast
   - Demo data load: pipeline.json + positions.json + candidates.json valid
   - Stage mapping: raw stage → 5-key columns
   - Drag-drop attr (desktop): draggable=true on cards
   - Mobile fallback (390×844): card cursor, stage modal binding hazir
   - Position switcher menu: dropdown markup mevcut
   - Adapter genisleme: getCandidate / moveStage / getPipeline / getPositions
   - JS modul: STAGES + state + match calc fonksiyonlari (HR_PIPELINE_TEST flag)

   Auth gate yok — bu test markup + asset + adapter seviyesinde calisir.
   Real browser interaction testi auth gate sonrasi yapilir (Sprint 7).
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

test.describe('FAZ B Sprint 1 — HR Pipeline kanban', () => {

  /* ════════════════════════════════════════════════
     Asset varligi
     ════════════════════════════════════════════════ */
  test('Yeni Sprint 1 dosyalari diskte', () => {
    expect(fs.existsSync(path.join(ROOT, 'css/hr-pipeline.css')), 'css/hr-pipeline.css').toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'js/hr-pipeline.js')), 'js/hr-pipeline.js').toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'hr-pipeline.html')), 'hr-pipeline.html').toBeTruthy();
  });

  test('hr-pipeline.html boyut Sprint 0 placeholderdan buyuk', () => {
    const html = readFile('hr-pipeline.html');
    // Sprint 0 placeholder ~6.6KB. Sprint 1 dolu sayfa minimum 10KB+
    expect(html.length).toBeGreaterThan(8000);
  });

  test('hr-pipeline.js boyut iskelet seviyesinden buyuk', () => {
    const js = readFile('js/hr-pipeline.js');
    // Sprint 0 iskelet ~600 byte. Sprint 1 minimum 10KB+
    expect(js.length).toBeGreaterThan(15000);
  });

  /* ════════════════════════════════════════════════
     Markup
     ════════════════════════════════════════════════ */
  test('hr-pipeline.html — master pattern', () => {
    const html = readFile('hr-pipeline.html');
    expect(html).toContain('<header class="lp-hdr">');
    expect(html).toContain('class="lp-logo"');
    expect(html).toContain('<a class="skip-to-content"');
    expect(html).toContain('data-hr-page="pipeline"');
    expect(html).toContain('class="hr-subnav"');
  });

  test('hr-pipeline.html — page header', () => {
    const html = readFile('hr-pipeline.html');
    expect(html).toContain('hr-pg-head__title');
    expect(html).toContain('data-hr-pipeline-title');
    expect(html).toContain('data-hr-add-candidate');
    expect(html).toContain('data-hr-new-position');
  });

  test('hr-pipeline.html — meta bar 3 alan', () => {
    const html = readFile('hr-pipeline.html');
    expect(html).toContain('data-hr-pl-position');
    expect(html).toContain('data-hr-pl-total');
    expect(html).toContain('data-hr-pl-active');
  });

  test('hr-pipeline.html — board container', () => {
    const html = readFile('hr-pipeline.html');
    expect(html).toContain('data-hr-board');
    expect(html).toContain('data-hr-board-loading');
    expect(html).toContain('data-hr-board-empty');
  });

  test('hr-pipeline.html — drawer markup', () => {
    const html = readFile('hr-pipeline.html');
    expect(html).toContain('data-hr-drawer');
    expect(html).toContain('data-hr-drawer-backdrop');
    expect(html).toContain('data-hr-drawer-close');
    expect(html).toContain('data-hr-drawer-body');
  });

  test('hr-pipeline.html — stage modal markup (mobile fallback)', () => {
    const html = readFile('hr-pipeline.html');
    expect(html).toContain('data-hr-stage-modal');
    expect(html).toContain('data-hr-stage-modal-backdrop');
    expect(html).toContain('data-hr-stage-modal-close');
    expect(html).toContain('data-hr-stage-modal-list');
  });

  test('hr-pipeline.html — position switcher menu var', () => {
    const html = readFile('hr-pipeline.html');
    expect(html).toContain('data-hr-position-btn');
    expect(html).toContain('data-hr-position-menu');
    expect(html).toContain('hr-position-switcher-wrap');
  });

  test('hr-pipeline.html — toast container', () => {
    const html = readFile('hr-pipeline.html');
    expect(html).toContain('data-hr-toast');
  });

  test('hr-pipeline.html — Turkce empty state copy', () => {
    const html = readFile('hr-pipeline.html');
    expect(html).toMatch(/Bu pozisyonda aday yok/);
    expect(html).toMatch(/Havuza git/);
  });

  test('hr-pipeline.html — yasak emoji yok', () => {
    const html = readFile('hr-pipeline.html');
    // Emoji range: U+1F300..U+1FAFF + sik kullanilanlar
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
  });

  test('hr-pipeline.html — yasak font (Inter/Roboto) yok', () => {
    const html = readFile('hr-pipeline.html');
    expect(html).not.toMatch(/['"]Inter['"]/);
    expect(html).not.toMatch(/['"]Roboto['"]/);
  });

  test('hr-pipeline.html — script siralama dogru (shell→data→pipeline)', () => {
    const html = readFile('hr-pipeline.html');
    const shellIdx = html.indexOf('hr-shell.js');
    const dataIdx = html.indexOf('hr-data.js');
    const plIdx = html.indexOf('hr-pipeline.js');
    expect(shellIdx).toBeGreaterThan(0);
    expect(dataIdx).toBeGreaterThan(shellIdx);
    expect(plIdx).toBeGreaterThan(dataIdx);
  });

  /* ════════════════════════════════════════════════
     CSS
     ════════════════════════════════════════════════ */
  test('css/hr-pipeline.css — 5 stage dot color', () => {
    const css = readFile('css/hr-pipeline.css');
    expect(css).toContain('hr-stage__dot--yeni');
    expect(css).toContain('hr-stage__dot--gorustum');
    expect(css).toContain('hr-stage__dot--mulakat');
    expect(css).toContain('hr-stage__dot--teklif');
    expect(css).toContain('hr-stage__dot--kapandi');
  });

  test('css/hr-pipeline.css — drag visual states', () => {
    const css = readFile('css/hr-pipeline.css');
    expect(css).toContain('hr-card-pl--dragging');
    expect(css).toContain('hr-stage--drop-target');
  });

  test('css/hr-pipeline.css — kanban grid + mobile breakpoint', () => {
    const css = readFile('css/hr-pipeline.css');
    expect(css).toMatch(/grid-template-columns: repeat\(5/);
    expect(css).toMatch(/@media \(max-width: 900px\)/);
    expect(css).toMatch(/@media \(max-width: 640px\)/);
  });

  test('css/hr-pipeline.css — dark mode override', () => {
    const css = readFile('css/hr-pipeline.css');
    expect(css).toMatch(/html\.dark \.hr-stage/);
    expect(css).toMatch(/html\.dark \.hr-card-pl/);
    expect(css).toMatch(/html\.dark \.hr-drawer__panel/);
  });

  test('css/hr-pipeline.css — drawer + modal + toast tanimli', () => {
    const css = readFile('css/hr-pipeline.css');
    expect(css).toContain('.hr-drawer');
    expect(css).toContain('.hr-stage-modal');
    expect(css).toContain('.hr-toast');
  });

  /* ════════════════════════════════════════════════
     JS modul ici — STAGES + helpers
     ════════════════════════════════════════════════ */
  test('hr-pipeline.js — 5-stage spec dogru', () => {
    const js = readFile('js/hr-pipeline.js');
    expect(js).toMatch(/key: 'yeni'/);
    expect(js).toMatch(/key: 'gorustum'/);
    expect(js).toMatch(/key: 'mulakat'/);
    expect(js).toMatch(/key: 'teklif'/);
    expect(js).toMatch(/key: 'kapandi'/);
  });

  test('hr-pipeline.js — stage raw→key mapping mevcut', () => {
    const js = readFile('js/hr-pipeline.js');
    expect(js).toContain('rawToStageKey');
    expect(js).toContain('stageKeyToRaw');
    expect(js).toMatch(/raws: \['basvuru'\]/);
    expect(js).toMatch(/raws: \['on_eleme'\]/);
  });

  test('hr-pipeline.js — drag-drop event handler', () => {
    const js = readFile('js/hr-pipeline.js');
    expect(js).toContain('dragstart');
    expect(js).toContain('dragover');
    expect(js).toContain('drop');
    expect(js).toContain('hr-stage--drop-target');
    expect(js).toContain('moveCardToStage');
  });

  test('hr-pipeline.js — mobile fallback stage modal', () => {
    const js = readFile('js/hr-pipeline.js');
    expect(js).toContain('openStageModal');
    expect(js).toContain('closeStageModal');
    expect(js).toContain('isMobileViewport');
  });

  test('hr-pipeline.js — drawer + adapter getCandidate', () => {
    const js = readFile('js/hr-pipeline.js');
    expect(js).toContain('openDrawer');
    expect(js).toContain('closeDrawer');
    expect(js).toContain('HRData.getCandidate');
  });

  test('hr-pipeline.js — position switcher menu render', () => {
    const js = readFile('js/hr-pipeline.js');
    expect(js).toContain('renderPositionMenu');
    expect(js).toContain('selectPosition');
    expect(js).toContain('HRShell.setActivePosition');
  });

  test('hr-pipeline.js — XSS guvenli (innerHTML kullanmaz)', () => {
    const js = readFile('js/hr-pipeline.js');
    // Sadece statik string SVG icin DOMParser kullanilir, innerHTML hicbir yerde dinamik
    // not: 'innerHTML' kelimesi yorumlarda gecebilir; gercek kullanim icin = innerHTML pattern
    expect(js).not.toMatch(/\.innerHTML\s*=/);
  });

  test('hr-pipeline.js — IIFE strict mode + use strict', () => {
    const js = readFile('js/hr-pipeline.js');
    expect(js).toMatch(/^\/\*[\s\S]*?\*\/[\s\S]*'use strict';/);
    expect(js).toMatch(/\(function \(\) \{[\s\S]*\}\)\(\);[\s]*$/);
  });

  /* ════════════════════════════════════════════════
     Adapter genisleme — js/hr-data.js
     ════════════════════════════════════════════════ */
  test('hr-data.js — getCandidate alias eklendi', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toContain('getCandidate: getCandidateById');
  });

  test('hr-data.js — pipeline overlay localStorage', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toContain('DEMO_PIPELINE_KEY');
    expect(js).toContain('readPipelineOverlay');
    expect(js).toContain('writePipelineOverlay');
    expect(js).toContain('clearPipelineOverlay');
    expect(js).toContain('_clearPipelineOverlay');
  });

  test('hr-data.js — moveStage demo persist', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toMatch(/moveStage[\s\S]*writePipelineOverlay/);
  });

  test('hr-data.js — getPipeline overlay merge', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toMatch(/readPipelineOverlay\(\)/);
    expect(js).toMatch(/pipeline_merged/);
  });

  /* ════════════════════════════════════════════════
     Demo data integrity
     ════════════════════════════════════════════════ */
  test('demo/pipeline.json — gecerli JSON + en az 5 satir', () => {
    const rows = readJson('data/demo/pipeline.json');
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(5);
    rows.forEach(r => {
      expect(r).toHaveProperty('id');
      expect(r).toHaveProperty('position_id');
      expect(r).toHaveProperty('candidate_id');
      expect(r).toHaveProperty('stage');
    });
  });

  test('demo/pipeline.json — stage degerleri tanimli set icinde', () => {
    const rows = readJson('data/demo/pipeline.json');
    const allowed = ['basvuru','on_eleme','mulakat','teklif','kapandi','kapandi_kazandi','kapandi_kaybettik'];
    rows.forEach(r => {
      expect(allowed).toContain(r.stage);
    });
  });

  test('demo/pipeline.json — her satirin candidate_id candidates.json icinde mevcut', () => {
    const pipeline = readJson('data/demo/pipeline.json');
    const candidates = readJson('data/demo/candidates.json');
    const ids = new Set(candidates.map(c => c.id));
    const orphans = pipeline.filter(r => !ids.has(r.candidate_id));
    expect(orphans, `orphan rows: ${orphans.map(o => o.id).join(',')}`).toEqual([]);
  });

  test('demo/pipeline.json — her satirin position_id positions.json icinde mevcut', () => {
    const pipeline = readJson('data/demo/pipeline.json');
    const positions = readJson('data/demo/positions.json');
    const ids = new Set(positions.map(p => p.id));
    const orphans = pipeline.filter(r => !ids.has(r.position_id));
    expect(orphans, `orphan rows: ${orphans.map(o => o.id).join(',')}`).toEqual([]);
  });

  test('demo/positions.json — en az 1 pozisyon + sema', () => {
    const positions = readJson('data/demo/positions.json');
    expect(positions.length).toBeGreaterThanOrEqual(1);
    positions.forEach(p => {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('title');
      expect(p).toHaveProperty('city');
      expect(p).toHaveProperty('segment');
    });
  });

  test('demo/candidates.json — en az 20 aday', () => {
    const cands = readJson('data/demo/candidates.json');
    expect(cands.length).toBeGreaterThanOrEqual(20);
  });

  /* ════════════════════════════════════════════════
     Cross-page tutarlik
     ════════════════════════════════════════════════ */
  test('hr-pipeline.html subnav 9 link icerir + pipeline aktif', () => {
    const html = readFile('hr-pipeline.html');
    const links = ['hub','pipeline','pool','messages','candidate','campaigns','company','team','settings'];
    links.forEach(l => {
      expect(html).toContain(`data-hr-link="${l}"`);
    });
  });

  test('hr-pipeline.html — CSP icerir (master pattern)', () => {
    const html = readFile('hr-pipeline.html');
    expect(html).toMatch(/Content-Security-Policy/);
    expect(html).toContain("default-src 'self'");
  });

  test('hr-pipeline.html — viewport meta + theme-color (light/dark)', () => {
    const html = readFile('hr-pipeline.html');
    expect(html).toMatch(/<meta name="viewport"[^>]*width=device-width/);
    expect(html).toMatch(/theme-color.*prefers-color-scheme: light/);
    expect(html).toMatch(/theme-color.*prefers-color-scheme: dark/);
  });

  /* ════════════════════════════════════════════════
     Copy / TR + AI-ism temiz
     ════════════════════════════════════════════════ */
  test('Stage isimleri TR + 5 column dogru ifade', () => {
    const js = readFile('js/hr-pipeline.js');
    expect(js).toMatch(/title: 'Yeni'/);
    expect(js).toMatch(/title: 'Görüştüm'/);
    expect(js).toMatch(/title: 'Mülakat'/);
    expect(js).toMatch(/title: 'Teklif'/);
    expect(js).toMatch(/title: 'Kapandı'/);
  });

  test('Copy AI-ism filtresi (yasakli klise yok)', () => {
    const html = readFile('hr-pipeline.html');
    const js = readFile('js/hr-pipeline.js');
    const all = (html + '\n' + js).toLowerCase();
    // AI-ism kara liste — Tuna avoid-ai-writing skill kuralı
    const banned = [
      'in today\'s fast-paced',
      'leverage ai',
      'unleash',
      'embark on',
      'delve into',
      'in the realm of',
      'cutting-edge',
      'state-of-the-art'
    ];
    banned.forEach(b => {
      expect(all, `banned phrase: ${b}`).not.toContain(b);
    });
    // Mulakat yerine roportaj YASAK (CLAUDE.md kural)
    expect(all).not.toContain('röportaj');
  });

  test('Mulakat veya is gorusmesi terimi kullanilmis', () => {
    // En az birinde "mülakat" gecmeli (stage adi)
    const js = readFile('js/hr-pipeline.js');
    expect(js).toMatch(/[Mm]ülakat/);
  });
});
