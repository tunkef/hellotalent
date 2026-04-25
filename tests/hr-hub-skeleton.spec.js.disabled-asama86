/* HR Hub iskelet smoke testi — Sprint 0 / FAZ B
   Kapsam:
   - 9 sayfa (ik + 8 panel) load
   - Master pattern: lp-hdr + lp-logo + skip-to-content
   - Subnav: 9 link tum sayfalarda gorunur
   - data-hr-page attribute her sayfada dogru
   - data-hr-link tum panel linklerinde mevcut
   - Markup-level test (auth gate yok — local file:// veya unauth state'te
     auth gate redirect olur, bu yuzden HTML statik kontrol yapilir).
*/
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const PAGES = [
  { file: 'ik.html',           hrPage: 'hub',        title: /Kurumsal panel/i },
  { file: 'hr-pipeline.html',  hrPage: 'pipeline',   title: /Pipeline/i },
  { file: 'hr-pool.html',      hrPage: 'pool',       title: /Havuz/i },
  { file: 'hr-messages.html',  hrPage: 'messages',   title: /Mesajlar/i },
  { file: 'hr-candidate.html', hrPage: 'candidate',  title: /Aday detay/i },
  { file: 'hr-campaigns.html', hrPage: 'campaigns',  title: /Kampanyalar/i },
  { file: 'hr-company.html',   hrPage: 'company',    title: /irket profili/i },
  { file: 'hr-team.html',      hrPage: 'team',       title: /Ekip/i },
  { file: 'hr-settings.html',  hrPage: 'settings',   title: /Ayarlar/i }
];

const SUBNAV_LINKS = ['hub','pipeline','pool','messages','candidate','campaigns','company','team','settings'];
const PANEL_JS = ['hr-shell.js','hr-data.js'];

function readFile(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

test.describe('FAZ B Sprint 0 — HR Hub iskelet', () => {

  test('Tum 9 sayfa diskte var', () => {
    for (const p of PAGES) {
      const full = path.join(ROOT, p.file);
      expect(fs.existsSync(full), `${p.file} mevcut`).toBeTruthy();
    }
  });

  test('Tum panel JS ve shell asset diskte var', () => {
    const assets = [
      'css/hr-shell.css',
      'js/hr-shell.js',
      'js/hr-data.js',
      'js/hr-hub.js',
      'js/hr-pipeline.js',
      'js/hr-pool.js',
      'js/hr-messages.js',
      'js/hr-candidate.js',
      'js/hr-campaigns.js',
      'js/hr-company.js',
      'js/hr-team.js',
      'js/hr-settings.js',
      'data/demo/candidates.json',
      'data/demo/pipeline.json',
      'data/demo/messages.json',
      'data/demo/positions.json',
      'data/demo/campaigns.json',
      'ik.legacy.html'
    ];
    for (const a of assets) {
      expect(fs.existsSync(path.join(ROOT, a)), `${a} mevcut`).toBeTruthy();
    }
  });

  for (const p of PAGES) {
    test(`${p.file} — markup iskelet`, () => {
      const html = readFile(p.file);

      // Title
      expect(html).toMatch(/<title>[^<]*hellotalent\.ai<\/title>/);

      // Master pattern
      expect(html).toContain('<header class="lp-hdr">');
      expect(html).toContain('class="lp-logo"');
      expect(html).toContain('hello<em>talent</em>');
      expect(html).toContain('skip-to-content');

      // body data-hr-page
      const bodyRe = new RegExp(`<body[^>]*data-hr-page="${p.hrPage}"`);
      expect(html).toMatch(bodyRe);

      // Subnav var
      expect(html).toContain('hr-subnav');
      expect(html).toContain('aria-label="Kurumsal panel navigasyonu"');

      // 9 subnav link mevcut
      for (const key of SUBNAV_LINKS) {
        expect(html, `${p.file} subnav link ${key}`).toContain(`data-hr-link="${key}"`);
      }

      // Shell asset link
      expect(html).toContain('css/hr-shell.css');
      expect(html).toContain('shared-v2.css');
      expect(html).toContain('js/hr-shell.js');
      expect(html).toContain('js/hr-data.js');

      // User menu + position switcher slot
      expect(html).toContain('data-hr-user-menu-btn');
      expect(html).toContain('data-hr-position-btn');
      expect(html).toContain('data-hr-logout');

      // CSP guard (FAZ B'de iframe guard korunur)
      expect(html).toContain('frame-ancestors \'none\'');
    });
  }

  test('ik.html dashboard kartlari + KPI', () => {
    const html = readFile('ik.html');
    // 8 panel quick-card'i hub'da listelenir (her panel HTML'ine href)
    const panelHrefs = [
      'hr-pipeline.html','hr-pool.html','hr-messages.html','hr-candidate.html',
      'hr-campaigns.html','hr-company.html','hr-team.html','hr-settings.html'
    ];
    for (const href of panelHrefs) {
      // hr-quick-card href icinde olmali (subnav disinda da)
      const occurrences = (html.match(new RegExp(href, 'g')) || []).length;
      expect(occurrences, `${href} subnav + quick-card iki yerde`).toBeGreaterThanOrEqual(2);
    }
    // KPI grid
    expect(html).toContain('data-hr-kpi="positions"');
    expect(html).toContain('data-hr-kpi="pipeline"');
    expect(html).toContain('data-hr-kpi="messages"');
    // Greeting placeholder
    expect(html).toContain('data-hr-greeting');
  });

  test('hr-shell.js HRShell global API + auth gate fonksiyonlari', () => {
    const js = readFile('js/hr-shell.js');
    expect(js).toContain('window.HRShell');
    expect(js).toContain('authGate');
    expect(js).toContain('PANEL_REGISTRY');
    expect(js).toContain('signOut');
    expect(js).toContain('get_onboarding_state');
    expect(js).toContain('giris.html?tab=ik');
    expect(js).toContain('isveren-onboarding.html');
  });

  test('hr-data.js dual-mode adapter + 9 metod', () => {
    const js = readFile('js/hr-data.js');
    expect(js).toContain('window.HRData');
    expect(js).toContain('isRealMode');
    // Public metodlar
    const methods = [
      'searchCandidates','getCandidateById','getPipeline','moveStage','addToPipeline',
      'listNotes','addNote','getMessageThreads','sendMessage','getCampaigns','getPositions'
    ];
    for (const m of methods) {
      expect(js, `HRData.${m} tanimli`).toContain(m);
    }
    // Demo + real mode iki yol
    expect(js).toContain('HR_REAL_MODE_ENABLED');
    expect(js).toContain('data/demo/');
  });

  test('Demo data iceriksel sanity (50 aday + 5 pozisyon + threadler)', () => {
    const candidates = JSON.parse(readFile('data/demo/candidates.json'));
    expect(Array.isArray(candidates)).toBeTruthy();
    expect(candidates.length).toBeGreaterThanOrEqual(50);
    // Her aday kritik alanlara sahip
    for (const c of candidates) {
      expect(c.id).toBeTruthy();
      expect(c.full_name).toBeTruthy();
      expect(c.pozisyon).toBeTruthy();
      expect(c.sehir).toBeTruthy();
    }

    const positions = JSON.parse(readFile('data/demo/positions.json'));
    expect(positions.length).toBeGreaterThanOrEqual(5);

    const pipeline = JSON.parse(readFile('data/demo/pipeline.json'));
    expect(pipeline.length).toBeGreaterThanOrEqual(15);

    const threads = JSON.parse(readFile('data/demo/messages.json'));
    expect(threads.length).toBeGreaterThanOrEqual(10);
    let totalMessages = 0;
    for (const t of threads) totalMessages += (t.messages || []).length;
    expect(totalMessages).toBeGreaterThanOrEqual(20);

    const campaigns = JSON.parse(readFile('data/demo/campaigns.json'));
    expect(campaigns.length).toBeGreaterThanOrEqual(3);
  });

  test('hr-shell.css temel class\'lar tanimli', () => {
    const css = readFile('css/hr-shell.css');
    const classes = [
      '.hr-page','.hr-subnav','.hr-subnav-link','.hr-container','.hr-section',
      '.hr-pg-head','.hr-card','.hr-quick-card','.hr-kpi','.hr-empty-state',
      '.hr-loading','.hr-position-switcher','.hr-user-menu-btn','.hr-user-menu',
      '.hr-dashboard-grid','.hr-banner'
    ];
    for (const c of classes) {
      expect(css, `${c} CSS tanimli`).toContain(c);
    }
    // Dark mode + reduced-motion + responsive
    expect(css).toContain('html[data-theme="dark"]');
    expect(css).toContain('prefers-color-scheme: dark');
    expect(css).toContain('@media (max-width: 768px)');
  });

  test('Master pattern butunlugu — auth sayfalariyla logo + lp-hdr ayni', () => {
    const ik = readFile('ik.html');
    const giris = readFile('giris.html');
    // Logo: hello<em>talent</em>
    const logoRe = /<a class="lp-logo"[^>]*>hello<em>talent<\/em><\/a>/;
    expect(ik).toMatch(logoRe);
    expect(giris).toMatch(logoRe);
    // lp-hdr-inner yapisi
    expect(ik).toContain('<div class="lp-hdr-inner">');
    expect(giris).toContain('<div class="lp-hdr-inner">');
  });

  test('admin.html DOKUNULMADI (Tuna kurali)', () => {
    // admin.html FAZ B kapsami disinda — sadece varlik kontrol
    expect(fs.existsSync(path.join(ROOT, 'admin.html'))).toBeTruthy();
  });

});
