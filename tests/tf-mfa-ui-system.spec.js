/* TF1 + TF2 — MFA UI fix + sistem dogrulama structural guard.
 * TF1: profil.html MFA enroll dedicated class'lar + ayarlar.css mfa-enroll block
 * TF2: giris.html MFA challenge emoji-free + brute-force lockout;
 *      profil-settings.js unverified factor cleanup + enroll defensive cleanup
 */
var test = require('@playwright/test').test;
var expect = require('@playwright/test').expect;
var fs = require('fs');
var path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test.describe('TF1 — MFA enroll UI class refactor', function () {
  test('profil.html MFA enroll uses dedicated layout classes', function () {
    var html = read('profil.html');
    expect(html).toContain('class="mfa-enroll"');
    expect(html).toContain('class="mfa-enroll__verify-row"');
    expect(html).toContain('class="ayr-btn ayr-btn--primary mfa-enroll__verify-btn"');
    expect(html).toContain('class="ayr-btn ayr-btn--ghost mfa-enroll__cancel-btn"');
    // inputmode + autocomplete one-time-code (a11y + mobile keyboard)
    expect(html).toMatch(/id="mfa-verify-code"[^>]*inputmode="numeric"/);
    expect(html).toMatch(/id="mfa-verify-code"[^>]*autocomplete="one-time-code"/);
  });

  test('ayarlar.css MFA enroll layout block present', function () {
    var css = read('css/panels/ayarlar.css');
    expect(css).toContain('.mfa-enroll {');
    expect(css).toContain('.mfa-enroll__verify-row');
    expect(css).toContain('.mfa-enroll__verify-btn');
    expect(css).toContain('.mfa-enroll__cancel-btn');
    // Mobile responsive kontrol
    expect(css).toMatch(/@media \(max-width: 600px\)[\s\S]{0,200}\.mfa-enroll__verify-row/);
  });
});

test.describe('TF2 — MFA system hardening', function () {
  test('giris.html MFA challenge has NO emoji (brand no-emoji rule)', function () {
    var html = read('giris.html');
    // Check MFA challenge block — no 🔐 or other emoji
    var mfaBlock = html.substring(html.indexOf('showMfaChallengeModal'));
    expect(mfaBlock).not.toContain('🔐'); // 🔐
    expect(mfaBlock).not.toContain("'🔐'");
    expect(mfaBlock).not.toContain('"🔐"');
  });

  test('giris.html MFA challenge uses createElementNS for SVG (CSP safe)', function () {
    var html = read('giris.html');
    var mfaBlock = html.substring(html.indexOf('showMfaChallengeModal'));
    expect(mfaBlock).toContain('_mkSvgLock');
    expect(mfaBlock).toContain('createElementNS');
    expect(mfaBlock).toContain('http://www.w3.org/2000/svg');
  });

  test('giris.html MFA challenge has progressive lockout (3=30sn → 7+=24h)', function () {
    var html = read('giris.html');
    expect(html).toContain('mfaChallengeFailCount');
    expect(html).toContain('MFA_CHALLENGE_THRESHOLD');
    expect(html).toContain('computeChallengeLockoutMs');
    expect(html).toContain('formatChallengeCountdown');
    expect(html).toContain('applyChallengeLockout');
    // Progresif basamaklar
    expect(html).toMatch(/failCount === 3\) return 30 \* 1000/);
    expect(html).toMatch(/failCount === 4\) return 2 \* 60 \* 1000/);
    expect(html).toMatch(/failCount === 5\) return 10 \* 60 \* 1000/);
    expect(html).toMatch(/failCount === 6\) return 60 \* 60 \* 1000/);
    expect(html).toMatch(/return 24 \* 60 \* 60 \* 1000/);
  });

  test('profil-settings.js has progressive MFA lockout (matches giris.html schema)', function () {
    var src = read('profil-settings.js');
    expect(src).toContain('computeMfaLockoutMs');
    expect(src).toContain('formatLockoutCountdown');
    expect(src).toMatch(/failCount === 3\) return 30 \* 1000/);
    expect(src).toMatch(/failCount === 4\) return 2 \* 60 \* 1000/);
    expect(src).toMatch(/failCount === 5\) return 10 \* 60 \* 1000/);
    expect(src).toMatch(/failCount === 6\) return 60 \* 60 \* 1000/);
    expect(src).toMatch(/return 24 \* 60 \* 60 \* 1000/);
  });

  test('giris.html MFA modal has ARIA dialog semantics', function () {
    var html = read('giris.html');
    var mfaBlock = html.substring(html.indexOf('showMfaChallengeModal'));
    expect(mfaBlock).toContain("setAttribute('role', 'dialog')");
    expect(mfaBlock).toContain("setAttribute('aria-modal', 'true')");
    expect(mfaBlock).toContain("setAttribute('aria-labelledby', 'mfa-challenge-title')");
  });

  test('profil-settings.js has cleanupUnverifiedFactors helper', function () {
    var src = read('profil-settings.js');
    expect(src).toContain('cleanupUnverifiedFactors');
    // Called from checkMfaStatus AND from enroll defensive path
    var cleanupCalls = (src.match(/cleanupUnverifiedFactors/g) || []).length;
    expect(cleanupCalls).toBeGreaterThanOrEqual(3); // decl + checkMfaStatus × 2 + enroll pre-check
  });

  test('profil-settings.js enroll defensive cleanup before new enroll', function () {
    var src = read('profil-settings.js');
    // Enable handler must call listFactors + cleanup BEFORE enroll
    var enableBlock = src.match(/btnEnable\.addEventListener[\s\S]*?catch \(e\)/);
    expect(enableBlock).not.toBeNull();
    expect(enableBlock[0]).toContain('cleanupUnverifiedFactors');
    expect(enableBlock[0]).toContain('mfa.enroll');
    // Ensure cleanup happens BEFORE enroll
    var cleanupIdx = enableBlock[0].indexOf('cleanupUnverifiedFactors');
    var enrollIdx = enableBlock[0].indexOf('mfa.enroll');
    expect(cleanupIdx).toBeLessThan(enrollIdx);
  });

  test('profil-settings.js MFA lockout helper present (Faz 3 audit #9)', function () {
    var src = read('profil-settings.js');
    expect(src).toContain('applyMfaLockout');
    expect(src).toContain('MFA_FAIL_THRESHOLD');
    // Progresif lockout: MFA_LOCKOUT_MS flat const yerine computeMfaLockoutMs fn
    expect(src).toContain('computeMfaLockoutMs');
    expect(src).toContain('mfaEnrollFailCount');
    expect(src).toContain('mfaDisableFailCount');
  });
});
