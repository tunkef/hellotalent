/* HR FAZ B — E2E browser smoke (Sprint 8 / Asama 85)
   Tum 9 panel HTTP 200 + DOM dogrulamasi + polish CSS yuklenmesi.
   Auth-walled olduklari icin gercek session gerekmez — bu test sadece
   panellerin gorsel iskelet bozulmadan ayakta oldugunu dogrular.

   Tuna brief: signup → wizard → hub → pipeline → havuz → mesaj →
   aday detay → kampanya → settings. Gercek auth env yoksa onun
   yerine static smoke calisir.
*/
const { test, expect } = require('@playwright/test');

const HR_PAGES = [
  { path: '/ik.html',           page: 'hub',       title: 'Kurumsal panel' },
  { path: '/hr-pipeline.html',  page: 'pipeline',  title: 'Pipeline' },
  { path: '/hr-pool.html',      page: 'pool',      title: 'Havuz' },
  { path: '/hr-messages.html',  page: 'messages',  title: 'Mesajlar' },
  { path: '/hr-candidate.html', page: 'candidate', title: 'Aday' },
  { path: '/hr-campaigns.html', page: 'campaigns', title: 'Kampanyalar' },
  { path: '/hr-company.html',   page: 'company',   title: 'Şirket' },
  { path: '/hr-team.html',      page: 'team',      title: 'Ekip' },
  { path: '/hr-settings.html',  page: 'settings',  title: 'Ayarlar' }
];

test.describe('FAZ B — E2E browser smoke (9 panel)', () => {

  for (const p of HR_PAGES) {
    test(p.path + ' HTTP 200 + ham HTML body data-hr-page + polish link', async ({ request }) => {
      // Auth gate JS'i page.goto ile redirect tetikler — biz ham HTML kontrol edecegiz.
      const resp = await request.get(p.path);
      expect(resp.status(), p.path + ' HTTP 200').toBe(200);
      const html = await resp.text();

      // body[data-hr-page] tagi ham HTML'de olmali
      expect(html, p.path + ' data-hr-page').toContain('data-hr-page="' + p.page + '"');

      // Polish CSS link head'de
      expect(html, p.path + ' polish link').toMatch(/css\/hr-polish\.css/);

      // Master pattern markup
      expect(html, p.path + ' lp-hdr').toMatch(/<header class="lp-hdr">/);
      expect(html, p.path + ' hr-subnav').toMatch(/<nav class="hr-subnav"/);
    });
  }

  test('hr-polish.css HTTP 200 + content-type CSS', async ({ page }) => {
    const resp = await page.goto('/css/hr-polish.css', { waitUntil: 'commit' });
    expect(resp.status()).toBe(200);
    const ct = (resp.headers()['content-type'] || '').toLowerCase();
    expect(ct).toContain('css');
  });

  test('hr-polish.css size: > 18KB (en az 700 satir)', async ({ request }) => {
    const resp = await request.get('/css/hr-polish.css');
    const body = await resp.text();
    expect(body.length, 'polish CSS body length').toBeGreaterThan(18000);
    // Polish dosyasinda 20 numarali bolum var
    expect(body).toMatch(/20\.\s+PRINT/);
  });

  test('hr-polish.css 8 panel data-hr-page selectorleri tam', async ({ request }) => {
    const resp = await request.get('/css/hr-polish.css');
    const css = await resp.text();
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
      expect(css).toContain(sel);
    });
  });

});
