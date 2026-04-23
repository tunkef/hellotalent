/* TF6 ikinci round — Ayarlar UI/UX detayli revizyon.
 * Toggle sag + auto-save + Beta avantajlari Hesap'a + 2FA modal + Hesap yonetimi kart dolgun
 */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test.describe('TF6 ikinci round — Ayarlar UI/UX detaylar', function () {
  test('toggle row row-reverse — toggle sagda, metin solda', function () {
    var css = read('css/panels/ayarlar.css');
    var block = css.match(/#panel-ayarlar \.ayr-toggle-row \{[\s\S]*?\}/);
    expect(block).not.toBeNull();
    expect(block[0]).toMatch(/flex-direction:\s*row-reverse/);
    expect(block[0]).toMatch(/justify-content:\s*flex-start/);
  });

  test('auto-save: "Tercihleri kaydet" butonlari kaldirildi', function () {
    var html = read('profil.html');
    expect(html).not.toContain('id="btn-save-notifications"');
    expect(html).not.toContain('id="btn-save-contact-prefs"');
    // Auto-save mesaj yeri kaldi
    expect(html).toContain('id="notifications-msg"');
    expect(html).toContain('id="contact-prefs-msg"');
    expect(html).toMatch(/ayr-msg--auto/);
  });

  test('profil-settings.js toggle change → auto-save', function () {
    var src = read('profil-settings.js');
    // btn-save-notifications click handler YOK
    var oldPattern1 = /document\.getElementById\('btn-save-notifications'\)[\s\S]{0,200}addEventListener\('click'/;
    expect(src).not.toMatch(oldPattern1);
    // Yeni: toggle change → autoSave fn
    expect(src).toMatch(/els\.forEach\(function\(el\)\{[\s\S]*?addEventListener\('change',\s*autoSave\)/);
    // Notification + contact iki autoSave fn
    var autoSaveCount = (src.match(/async function autoSave/g) || []).length;
    expect(autoSaveCount).toBeGreaterThanOrEqual(2);
  });

  test('Beta avantajlari kartı Hesap section\'ında', function () {
    var html = read('profil.html');
    // Hesap section bul, beta kart icinde olmali
    var hesapBlock = html.match(/<section[^>]*id="ayr-s-hesap"[\s\S]*?<\/section>/);
    expect(hesapBlock).not.toBeNull();
    expect(hesapBlock[0]).toContain('id="ayr-beta-card"');
    expect(hesapBlock[0]).toContain('Beta avantajları');
    // Görünüm section'da beta YOK
    var gorunumBlock = html.match(/<section[^>]*id="ayr-s-gorunum"[\s\S]*?<\/section>/);
    expect(gorunumBlock).not.toBeNull();
    expect(gorunumBlock[0]).not.toContain('id="ayr-beta-card"');
    // Görünüm tek kart (tema) — grid-2 kaldirildi
    expect(gorunumBlock[0]).not.toContain('ayr-grid-2');
  });

  test('2FA modal — inline kart yerine Clatu modal overlay', function () {
    var html = read('profil.html');
    // Modal markup
    expect(html).toContain('id="mfa-enroll-modal"');
    expect(html).toContain('class="mfa-modal-overlay"');
    expect(html).toContain('class="mfa-modal"');
    expect(html).toContain('class="mfa-modal__head"');
    expect(html).toContain('class="mfa-modal__foot"');
    expect(html).toContain('id="btn-mfa-modal-close"');
    // Modal hidden attribute
    expect(html).toMatch(/id="mfa-enroll-modal"[^>]*hidden/);
    // Inline mfa-enroll-state kaldirildi — modal icine gecti
    var cards = html.match(/<section[^>]*id="ayr-s-guvenlik"[\s\S]*?<\/section>/);
    expect(cards).not.toBeNull();
    expect(cards[0]).not.toContain('id="mfa-enroll-state"');
  });

  test('profil-settings.js modal open/close logic', function () {
    var src = read('profil-settings.js');
    expect(src).toContain('mfa-enroll-modal');
    expect(src).toContain('btn-mfa-modal-close');
    // Overlay click + ESC close
    expect(src).toMatch(/if \(e\.target === enrollModal\)/);
    expect(src).toMatch(/e\.key === 'Escape'/);
    // mfa-modal-open body class
    expect(src).toContain("classList.add('mfa-modal-open')");
    expect(src).toContain("classList.remove('mfa-modal-open')");
  });

  test('Hesap yönetimi kartı içerik dolgun (3 bullet fact list)', function () {
    var html = read('profil.html');
    var cardBlock = html.match(/<div class="ayr-card ayr-card--danger" id="settings-account-management-card">[\s\S]*?<\/div>\s*<\/div>\s*<div class="ayr-footer">/);
    expect(cardBlock).not.toBeNull();
    expect(cardBlock[0]).toContain('ayr-fact-list');
    expect(cardBlock[0]).toContain('Dondur:');
    expect(cardBlock[0]).toContain('Sil:');
    expect(cardBlock[0]).toContain('Veri indir:');
  });

  test('ayarlar.css TF6 ikinci additions present', function () {
    var css = read('css/panels/ayarlar.css');
    expect(css).toContain('.ayr-fact-list');
    expect(css).toContain('.mfa-status-line');
    expect(css).toContain('.ayr-msg--auto');
    expect(css).toContain('.mfa-modal-overlay');
  });
});
