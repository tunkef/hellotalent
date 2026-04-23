/* TF3 — Hesap silme workflow revizyonu structural guard.
 * profil-settings.js delete confirm metin (30g dondurma vurgu + login-restore hint)
 * giris.html pending_deletion/frozen restore modal (finalizePostAuth + showAccountRestoreModal)
 */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test.describe('TF3 — Hesap silme workflow (30g freeze + login restore)', function () {
  test('profil-settings.js delete confirm emphasizes 30g dondurma + restore', function () {
    var src = read('profil-settings.js');
    var deleteBlock = src.match(/deleteBtn\.addEventListener[\s\S]{0,800}/);
    expect(deleteBlock).not.toBeNull();
    var body = deleteBlock[0];
    expect(body).toContain('dondurulacak');
    expect(body).toContain('kimse göremeyecek');
    expect(body).toContain('giriş yaparsan');
    expect(body).toContain('tekrar aktifleştirilecek');
    expect(body).toContain('30 gün');
    expect(body).toContain('KVKK md.11');
  });

  test('giris.html has finalizePostAuth function (candidate post-auth status check)', function () {
    var html = read('giris.html');
    expect(html).toContain('async function finalizePostAuth(');
    expect(html).toContain("from('candidates').select('account_status, deletion_requested_at')");
  });

  test('giris.html handles pending_deletion and frozen via restore modal', function () {
    var html = read('giris.html');
    var finalBlock = html.match(/async function finalizePostAuth[\s\S]*?^\}/m);
    expect(finalBlock).not.toBeNull();
    expect(finalBlock[0]).toContain("'pending_deletion'");
    expect(finalBlock[0]).toContain("'frozen'");
    expect(finalBlock[0]).toContain('showAccountRestoreModal');
  });

  test('giris.html showAccountRestoreModal creates restore + signout buttons', function () {
    var html = read('giris.html');
    var modalBlock = html.match(/function showAccountRestoreModal[\s\S]*?^\}/m);
    expect(modalBlock).not.toBeNull();
    var body = modalBlock[0];
    expect(body).toContain('Hesabımı Aktifleştir');
    expect(body).toContain('Çıkış yap');
    // Restore update: account_status = 'active', deletion_requested_at = null
    expect(body).toMatch(/update\(\{[^}]*account_status:\s*'active'[^}]*deletion_requested_at:\s*null/);
    // ARIA dialog semantic
    expect(body).toContain("setAttribute('role', 'dialog')");
    expect(body).toContain("setAttribute('aria-modal', 'true')");
  });

  test('giris.html restore modal shows correct copy per status', function () {
    var html = read('giris.html');
    var modalBlock = html.match(/function showAccountRestoreModal[\s\S]*?^\}/m);
    expect(modalBlock).not.toBeNull();
    var body = modalBlock[0];
    // pending_deletion: days remaining computed from deletion_requested_at
    expect(body).toContain('daysLeft');
    expect(body).toMatch(/30 \* 24 \* 60 \* 60 \* 1000/);
    expect(body).toContain('silmek üzereydin');
    // frozen: reactivation hint
    expect(body).toContain('dondurmuştun');
  });

  test('giris.html login handlers pass accountType to checkAndHandleMFA', function () {
    var html = read('giris.html');
    // aday loginAday → 'candidate'
    expect(html).toMatch(/checkAndHandleMFA\([^,]+,\s*'candidate'\)/);
    // ik loginIK → 'employer'
    expect(html).toMatch(/checkAndHandleMFA\('demo-dashboard-ik\.html',\s*'employer'\)/);
  });

  test('giris.html MFA challenge verify success → finalizePostAuth (not direct redirect)', function () {
    var html = read('giris.html');
    var verifyBlock = html.match(/wasSuccess = true;[\s\S]{0,400}/);
    expect(verifyBlock).not.toBeNull();
    expect(verifyBlock[0]).toContain('finalizePostAuth(redirectUrl, accountType)');
    // Eski direct redirect kaldirildi
    expect(verifyBlock[0]).not.toMatch(/window\.location\.href\s*=\s*redirectUrl/);
  });
});
