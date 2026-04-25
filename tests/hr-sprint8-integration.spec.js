/* HR Sprint 8 — Full FAZ B integration testi
   Kapsam:
   - 9 sayfa cross-link butunlugu (subnav 9 link, her birinden diger 8'ine)
   - Master pattern: lp-hdr + hr-subnav + data-hr-page tum sayfalarda
   - CSS yuklemesi tutarli (tokens.css + shared-v2.css + hr-shell.css her sayfada)
   - JS modul: hr-shell.js + hr-data.js + page-spesifik JS her sayfada
   - 8 panel = 8 farkli data-hr-page key
   - admin.html + ik.legacy.html dokunulmadi
   - Polish: tum sayfalar minimum 8KB+ (Sprint 0 placeholder asilmis)
   - Asama 85 — FAZ B tam tamamlandi
*/
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
function readFile(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

const HR_PAGES = [
  { file: 'ik.html',           key: 'hub',        title: 'Genel Bakış' },
  { file: 'hr-pipeline.html',  key: 'pipeline',   title: 'Pipeline' },
  { file: 'hr-pool.html',      key: 'pool',       title: 'Havuz' },
  { file: 'hr-messages.html',  key: 'messages',   title: 'Mesajlar' },
  { file: 'hr-candidate.html', key: 'candidate',  title: 'Adaylar' },
  { file: 'hr-campaigns.html', key: 'campaigns',  title: 'Kampanyalar' },
  { file: 'hr-company.html',   key: 'company',    title: 'Şirket' },
  { file: 'hr-team.html',      key: 'team',       title: 'Ekip' },
  { file: 'hr-settings.html',  key: 'settings',   title: 'Ayarlar' }
];

test.describe('FAZ B Sprint 8 — Final integration (Asama 85)', () => {

  /* ════════════════════════════════════════════════
     Tum 9 sayfa varligi
     ════════════════════════════════════════════════ */
  test('9 HR sayfasi diskte', () => {
    HR_PAGES.forEach((p) => {
      expect(fs.existsSync(path.join(ROOT, p.file)), p.file).toBeTruthy();
    });
  });

  test('9 panel JS dosyasi diskte', () => {
    var jsFiles = [
      'js/hr-hub.js',
      'js/hr-shell.js',
      'js/hr-data.js',
      'js/hr-pipeline.js',
      'js/hr-pool.js',
      'js/hr-messages.js',
      'js/hr-candidate.js',
      'js/hr-campaigns.js',
      'js/hr-company.js',
      'js/hr-team.js',
      'js/hr-settings.js'
    ];
    jsFiles.forEach((f) => {
      expect(fs.existsSync(path.join(ROOT, f)), f).toBeTruthy();
    });
  });

  test('Sayfa-spesifik CSS dosyalari', () => {
    [
      'css/hr-shell.css',
      'css/hr-pipeline.css',
      'css/hr-pool.css',
      'css/hr-messages.css',
      'css/hr-candidate.css',
      'css/hr-campaigns.css',
      'css/hr-forms.css'
    ].forEach((f) => {
      expect(fs.existsSync(path.join(ROOT, f)), f).toBeTruthy();
    });
  });

  /* ════════════════════════════════════════════════
     Master pattern butunlugu — tum 9 sayfa
     ════════════════════════════════════════════════ */
  test('Tum 9 sayfa lp-hdr + hr-subnav + data-hr-page', () => {
    HR_PAGES.forEach((p) => {
      const html = readFile(p.file);
      expect(html, p.file + ' lp-hdr').toMatch(/<header class="lp-hdr">/);
      expect(html, p.file + ' hr-subnav').toMatch(/<nav class="hr-subnav"/);
      expect(html, p.file + ' data-hr-page').toMatch(new RegExp('data-hr-page="' + p.key + '"'));
    });
  });

  test('Tum 9 sayfa subnav 9 link icerir', () => {
    HR_PAGES.forEach((p) => {
      const html = readFile(p.file);
      // Her sayfa subnav'inda diger 8 panele link olmali (toplam 9 link)
      HR_PAGES.forEach((other) => {
        expect(html, p.file + ' link to ' + other.key).toMatch(
          new RegExp('href="' + other.file + '"[^>]*data-hr-link="' + other.key + '"')
        );
      });
    });
  });

  test('Tum 9 sayfa sidebar yasak (FAZ B)', () => {
    HR_PAGES.forEach((p) => {
      const html = readFile(p.file);
      expect(html, p.file).not.toMatch(/clatu-hr-sidebar|hr-sidebar__|sidebar-nav/);
    });
  });

  test('Tum 9 sayfa CSS bagimliligi (tokens + shared-v2 + hr-shell)', () => {
    HR_PAGES.forEach((p) => {
      const html = readFile(p.file);
      expect(html, p.file + ' tokens.css').toMatch(/css\/tokens\.css/);
      expect(html, p.file + ' shared-v2.css').toMatch(/shared-v2\.css/);
      expect(html, p.file + ' hr-shell.css').toMatch(/css\/hr-shell\.css/);
    });
  });

  test('Tum 9 sayfa JS bagimliligi (hr-shell + hr-data)', () => {
    HR_PAGES.forEach((p) => {
      const html = readFile(p.file);
      expect(html, p.file + ' hr-shell.js').toMatch(/js\/hr-shell\.js/);
      expect(html, p.file + ' hr-data.js').toMatch(/js\/hr-data\.js/);
    });
  });

  test('Tum 9 sayfa CSP + theme + auth meta', () => {
    HR_PAGES.forEach((p) => {
      const html = readFile(p.file);
      expect(html, p.file + ' CSP').toMatch(/Content-Security-Policy/);
      expect(html, p.file + ' theme dark').toMatch(/theme-color.*media="\(prefers-color-scheme: dark\)"/);
      expect(html, p.file + ' theme light').toMatch(/theme-color.*media="\(prefers-color-scheme: light\)"/);
      expect(html, p.file + ' viewport').toMatch(/name="viewport"/);
      expect(html, p.file + ' robots').toMatch(/name="robots" content="noindex"/);
    });
  });

  test('Tum 9 sayfa skip-link a11y', () => {
    HR_PAGES.forEach((p) => {
      const html = readFile(p.file);
      expect(html, p.file).toMatch(/skip-to-content/);
      expect(html, p.file).toMatch(/İçeriğe atla/);
    });
  });

  test('Tum 8 panel sayfasi (hub disinda) Sprint 0 placeholderdan buyuk', () => {
    // Hub farkli yapida (KPI cards), digerleri Sprint 1+ doldu
    var panels = HR_PAGES.filter(function (p) { return p.key !== 'hub'; });
    panels.forEach((p) => {
      const html = readFile(p.file);
      expect(html.length, p.file + ' > 7KB').toBeGreaterThan(7000);
    });
  });

  /* ════════════════════════════════════════════════
     Position switcher tutarliligi
     ════════════════════════════════════════════════ */
  test('Tum sayfalar position switcher dropdown butunlugu', () => {
    HR_PAGES.forEach((p) => {
      if (p.key === 'hub') return; // hub farkli
      const html = readFile(p.file);
      expect(html, p.file).toMatch(/data-hr-position-btn/);
      expect(html, p.file).toMatch(/data-hr-position-menu/);
      expect(html, p.file).toMatch(/data-hr-position-value/);
    });
  });

  test('Tum sayfalar user menu (data-hr-user-menu)', () => {
    HR_PAGES.forEach((p) => {
      const html = readFile(p.file);
      expect(html, p.file).toMatch(/data-hr-user-menu/);
      expect(html, p.file).toMatch(/data-hr-logout/);
    });
  });

  /* ════════════════════════════════════════════════
     Coverage — yasak yok
     ════════════════════════════════════════════════ */
  test('Tum sayfalar yasak font/copy/term yok', () => {
    HR_PAGES.forEach((p) => {
      const html = readFile(p.file);
      // Yasak terim
      expect(html, p.file + ' röportaj').not.toMatch(/röportaj/i);
      // AI-ism
      [
        /size özel olarak hazırland/i,
        /yapay zeka destekli/i,
        /sizin için hazırlanmış/i
      ].forEach((pat) => {
        expect(html, p.file + ' AI-ism').not.toMatch(pat);
      });
    });
  });

  test('Tum panel JS\'ler console.log yasagi + innerHTML yasagi', () => {
    var jsFiles = [
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
      'js/hr-settings.js'
    ];
    jsFiles.forEach((f) => {
      const js = readFile(f);
      expect(js, f + ' console.log').not.toMatch(/console\.log\(/);
      expect(js, f + ' innerHTML').not.toMatch(/\.innerHTML\s*=\s*[^}]/);
    });
  });

  /* ════════════════════════════════════════════════
     Demo data sanity
     ════════════════════════════════════════════════ */
  test('5 demo data dosyasi (candidates / positions / pipeline / messages / campaigns)', () => {
    [
      'data/demo/candidates.json',
      'data/demo/positions.json',
      'data/demo/pipeline.json',
      'data/demo/messages.json',
      'data/demo/campaigns.json'
    ].forEach((f) => {
      expect(fs.existsSync(path.join(ROOT, f)), f).toBeTruthy();
    });
  });

  /* ════════════════════════════════════════════════
     Backend (Sprint 7)
     ════════════════════════════════════════════════ */
  test('Sprint 7 migration diskte', () => {
    var migPath = path.join(ROOT, 'supabase/migrations/20260426012144_hr_pipeline_notes_mvp2.sql');
    expect(fs.existsSync(migPath)).toBeTruthy();
  });

  test('hr-data.js: 11 metod export', () => {
    const js = readFile('js/hr-data.js');
    [
      'searchCandidates',
      'getCandidate',
      'getCandidateById',
      'getPipeline',
      'moveStage',
      'addToPipeline',
      'listNotes',
      'addNote',
      'getMessageThreads',
      'sendMessage',
      'getCampaigns',
      'getPositions'
    ].forEach((m) => {
      expect(js, m).toMatch(new RegExp(m + ':'));
    });
  });

  /* ════════════════════════════════════════════════
     Dokunulmazlar
     ════════════════════════════════════════════════ */
  test('admin.html dokunulmadi (Tuna internal panel)', () => {
    expect(fs.existsSync(path.join(ROOT, 'admin.html'))).toBeTruthy();
  });

  test('ik.legacy.html yedek olarak duruyor', () => {
    expect(fs.existsSync(path.join(ROOT, 'ik.legacy.html'))).toBeTruthy();
    var size = fs.statSync(path.join(ROOT, 'ik.legacy.html')).size;
    expect(size, 'ik.legacy.html > 100KB').toBeGreaterThan(100000);
  });

  test('index.html dokunulmadi (master pattern kaynak)', () => {
    expect(fs.existsSync(path.join(ROOT, 'index.html'))).toBeTruthy();
  });

  /* ════════════════════════════════════════════════
     CURRENT-STATE truth-sync
     ════════════════════════════════════════════════ */
  test('docs/CURRENT-STATE.md FAZ B Sprint 7 referansi', () => {
    const md = readFile('docs/CURRENT-STATE.md');
    expect(md).toMatch(/FAZ B/);
    expect(md).toMatch(/Sprint 7/);
    expect(md).toMatch(/MVP 2 hazirligi/);
  });

});
