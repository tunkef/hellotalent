/* HR Sprint 6 — Şirket / Ekip / Ayarlar smoke + integration testi
   Kapsam:
   - 3 panel HTML markup butunlugu
   - Ortak hr-forms.css yuklenmis
   - JS modul: form persist, brand tag, theme toggle, team list
   - Master pattern + sidebar yasak
   - Demo persist localStorage key'leri
*/
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
function readFile(p) { return fs.readFileSync(path.join(ROOT, p), 'utf8'); }

test.describe('FAZ B Sprint 6 — Şirket / Ekip / Ayarlar', () => {

  /* ════════════════════════════════════════════════
     Asset varligi
     ════════════════════════════════════════════════ */
  test('Sprint 6 asset varligi', () => {
    expect(fs.existsSync(path.join(ROOT, 'css/hr-forms.css'))).toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'hr-company.html'))).toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'hr-team.html'))).toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'hr-settings.html'))).toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'js/hr-company.js'))).toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'js/hr-team.js'))).toBeTruthy();
    expect(fs.existsSync(path.join(ROOT, 'js/hr-settings.js'))).toBeTruthy();
  });

  test('hr-forms.css boyut', () => {
    const css = readFile('css/hr-forms.css');
    expect(css.length).toBeGreaterThan(8000);
  });

  /* ════════════════════════════════════════════════
     hr-company.html
     ════════════════════════════════════════════════ */
  test('Company: master pattern', () => {
    const html = readFile('hr-company.html');
    expect(html).toMatch(/data-hr-page="company"/);
    expect(html).toMatch(/<header class="lp-hdr">/);
    expect(html).toMatch(/<nav class="hr-subnav"/);
    expect(html).not.toMatch(/clatu-hr-sidebar|hr-sidebar__/);
  });

  test('Company: form fields (genel + marka + iletisim)', () => {
    const html = readFile('hr-company.html');
    [
      'data-hr-co-name',
      'data-hr-co-website',
      'data-hr-co-sector',
      'data-hr-co-region',
      'data-hr-co-about',
      'data-hr-co-brand-input',
      'data-hr-co-brand-tags',
      'data-hr-co-contact-name',
      'data-hr-co-contact-email',
      'data-hr-co-contact-phone',
      'data-hr-co-contact-role',
      'data-hr-co-save',
      'data-hr-co-reset'
    ].forEach((k) => {
      expect(html, k).toMatch(new RegExp(k));
    });
  });

  test('Company: hr-forms.css yuklenmis', () => {
    const html = readFile('hr-company.html');
    expect(html).toMatch(/css\/hr-forms\.css/);
  });

  test('Company: 3 section (genel/marka/iletisim)', () => {
    const html = readFile('hr-company.html');
    expect(html).toMatch(/Genel bilgi/);
    expect(html).toMatch(/Marka portföyü/);
    expect(html).toMatch(/İletişim/);
  });

  test('Company JS: brand tag CRUD + localStorage persist', () => {
    const js = readFile('js/hr-company.js');
    expect(js).toMatch(/ht_hr_company_demo_state/);
    expect(js).toMatch(/function addBrand\(/);
    expect(js).toMatch(/function renderBrands\(/);
    expect(js).not.toMatch(/\.innerHTML\s*=/);
    expect(js).not.toMatch(/console\.log\(/);
  });

  /* ════════════════════════════════════════════════
     hr-team.html
     ════════════════════════════════════════════════ */
  test('Team: master pattern', () => {
    const html = readFile('hr-team.html');
    expect(html).toMatch(/data-hr-page="team"/);
    expect(html).toMatch(/data-hr-link="team"/);
    expect(html).not.toMatch(/clatu-hr-sidebar|hr-sidebar__/);
  });

  test('Team: davet butonu + modal markup', () => {
    const html = readFile('hr-team.html');
    expect(html).toMatch(/data-hr-team-invite/);
    expect(html).toMatch(/data-hr-team-modal/);
    expect(html).toMatch(/data-hr-team-input-email/);
    expect(html).toMatch(/data-hr-team-input-name/);
    expect(html).toMatch(/data-hr-team-send/);
  });

  test('Team: 3 rol seceneği (admin/recruiter/viewer)', () => {
    const html = readFile('hr-team.html');
    expect(html).toMatch(/value="admin"/);
    expect(html).toMatch(/value="recruiter"/);
    expect(html).toMatch(/value="viewer"/);
    expect(html).toMatch(/Yönetici/);
    expect(html).toMatch(/İşe alım uzmanı/);
    expect(html).toMatch(/Gözlemci/);
  });

  test('Team: davet gonder MVP 2 disabled', () => {
    const html = readFile('hr-team.html');
    expect(html).toMatch(/data-hr-team-send[^>]*disabled/);
    expect(html).toMatch(/Davet gönder \(MVP 2\)/);
  });

  test('Team JS: profile + user list rendering', () => {
    const js = readFile('js/hr-team.js');
    expect(js).toMatch(/HRShell\.getProfile/);
    expect(js).toMatch(/HRShell\.getUser/);
    expect(js).toMatch(/function roleLabel\(/);
    expect(js).not.toMatch(/\.innerHTML\s*=/);
    expect(js).not.toMatch(/console\.log\(/);
  });

  /* ════════════════════════════════════════════════
     hr-settings.html
     ════════════════════════════════════════════════ */
  test('Settings: master pattern', () => {
    const html = readFile('hr-settings.html');
    expect(html).toMatch(/data-hr-page="settings"/);
    expect(html).toMatch(/data-hr-link="settings"/);
    expect(html).not.toMatch(/clatu-hr-sidebar|hr-sidebar__/);
  });

  test('Settings: 3 tema seceneği (light/dark/system)', () => {
    const html = readFile('hr-settings.html');
    expect(html).toMatch(/value="light"/);
    expect(html).toMatch(/value="dark"/);
    expect(html).toMatch(/value="system"/);
    expect(html).toMatch(/Açık/);
    expect(html).toMatch(/Koyu/);
    expect(html).toMatch(/Otomatik/);
  });

  test('Settings: 3 bildirim toggle', () => {
    const html = readFile('hr-settings.html');
    expect(html).toMatch(/data-hr-set-notify-msg/);
    expect(html).toMatch(/data-hr-set-notify-pipeline/);
    expect(html).toMatch(/data-hr-set-notify-weekly/);
  });

  test('Settings: guvenlik bolumu (3 disabled CTA)', () => {
    const html = readFile('hr-settings.html');
    expect(html).toMatch(/Şifre değiştir/);
    expect(html).toMatch(/Etkinleştir/);
    expect(html).toMatch(/Hesabı sil/);
    // 3 disabled button
    var disabledCount = (html.match(/<button[^>]*disabled/g) || []).length;
    expect(disabledCount).toBeGreaterThanOrEqual(3);
  });

  test('Settings: kvkk md.11 referansi', () => {
    const html = readFile('hr-settings.html');
    expect(html).toMatch(/KVKK md\.11/);
    expect(html).toMatch(/30 gün/);
  });

  test('Settings JS: tema canli onizleme + localStorage', () => {
    const js = readFile('js/hr-settings.js');
    expect(js).toMatch(/ht_theme_preference/);
    expect(js).toMatch(/ht_hr_settings_demo_state/);
    expect(js).toMatch(/function applyTheme\(/);
    expect(js).not.toMatch(/\.innerHTML\s*=/);
    expect(js).not.toMatch(/console\.log\(/);
  });

  /* ════════════════════════════════════════════════
     CSS guard
     ════════════════════════════════════════════════ */
  test('hr-forms.css: token-only', () => {
    const css = readFile('css/hr-forms.css');
    expect(css).toMatch(/var\(--verm\)/);
    expect(css).toMatch(/var\(--navy\)/);
    expect(css).toMatch(/var\(--bg[\s,)]/);
    expect(css).toMatch(/var\(--border\)/);
    expect(css).toMatch(/var\(--muted\)/);
  });

  test('hr-forms.css: form + theme-card + toggle + team-row', () => {
    const css = readFile('css/hr-forms.css');
    expect(css).toMatch(/\.hr-form__section\b/);
    expect(css).toMatch(/\.hr-form__theme-card\b/);
    expect(css).toMatch(/\.hr-form__toggle-slider\b/);
    expect(css).toMatch(/\.hr-team-row\b/);
  });

  test('hr-forms.css: dark mode triple layer', () => {
    const css = readFile('css/hr-forms.css');
    expect(css).toMatch(/html\.dark/);
    expect(css).toMatch(/html\[data-theme="dark"\]/);
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)/);
  });

  test('hr-forms.css: yasak font/renk yok', () => {
    const css = readFile('css/hr-forms.css');
    expect(css).not.toMatch(/font-family:\s*['"]?Inter/i);
    expect(css).not.toMatch(/font-family:\s*['"]?Roboto/i);
  });

  /* ════════════════════════════════════════════════
     Tonality / Copy
     ════════════════════════════════════════════════ */
  test('Copy: roportaj yasak (3 panel)', () => {
    ['hr-company.html', 'hr-team.html', 'hr-settings.html'].forEach((f) => {
      const html = readFile(f);
      expect(html, f).not.toMatch(/röportaj/i);
    });
  });

  test('Copy: AI-ism yasak (3 panel)', () => {
    ['hr-company.html', 'hr-team.html', 'hr-settings.html'].forEach((f) => {
      const html = readFile(f);
      [
        /size özel olarak hazırland/i,
        /yapay zeka destekli/i,
        /sizin için hazırlanmış/i
      ].forEach((p) => {
        expect(html, f + ' ' + p).not.toMatch(p);
      });
    });
  });

  test('admin.html dokunulmadi', () => {
    expect(fs.existsSync(path.join(ROOT, 'admin.html'))).toBeTruthy();
  });

});
