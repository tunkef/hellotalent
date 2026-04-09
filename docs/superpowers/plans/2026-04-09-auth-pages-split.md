# Auth Pages Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kayit (uye-ol.html) ve giris (giris.html) sayfalarini ayir, KVKK acik riza ekle, kurumsal demo flow kur.

**Architecture:** Yeni `uye-ol.html` kayit sayfasi olusturulur. `giris.html`'den kayit formlari ve JS'leri cikar. Kurumsal giris sonrasi `demo-dashboard-ik.html` placeholder'a yonlenir. Wizard pre-fill `user_metadata.full_name` ve `phone`'u kullanir.

**Tech Stack:** Vanilla HTML/CSS/JS, Supabase Auth (signUp + user_metadata), mevcut RPC'ler (register_employer)

**Spec:** `docs/superpowers/specs/2026-04-09-auth-pages-split-design.md`

---

## Dosya Haritasi

| Dosya | Islem | Sorumluluk |
|-------|-------|------------|
| `uye-ol.html` | YENI | Kayit sayfasi — aday + kurumsal tab, form, validation, Supabase signUp |
| `demo-dashboard-ik.html` | YENI | Kurumsal demo placeholder — statik aday kartlari, CTA |
| `giris.html` | REVIZE | Kayit formlari + JS cikar, label guncelle, logo fix |
| `shared.js` | REVIZE | Login modal "Kayit ol" linkleri → uye-ol.html |
| `index.html` | REVIZE | CTA buton href'leri → uye-ol.html |
| `profil-bootstrap.js` | REVIZE | Employer routing ik.html → demo-dashboard-ik.html |
| `profil-wizard.js` | REVIZE | Step 1 ad/soyad + telefon pre-fill from user_metadata |
| `sitemap.xml` | REVIZE | uye-ol.html ekle |
| `tests/auth-pages.spec.js` | YENI | Smoke + form validation testleri |

---

### Task 1: uye-ol.html — Sayfa iskeleti + Aday kayit formu

**Files:**
- Create: `uye-ol.html`

- [ ] **Step 1: uye-ol.html HTML iskeleti + CSS olustur**

giris.html'in CSS yapisini temel al (`:root` tokenlari, `.header`, `.main`, `.card`, `.tab-toggle`, `.tab-btn`, `.field`, `.btn-submit`). Farklar:

```html
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://browser.sentry-cdn.com https://www.googletagmanager.com https://www.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://cpwibefquojehjehtrog.supabase.co https://*.googleusercontent.com; connect-src 'self' https://cpwibefquojehjehtrog.supabase.co https://*.google-analytics.com https://*.sentry.io; object-src 'none'; base-uri 'self'; frame-ancestors 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Uye Ol — hellotalent</title>
<meta name="robots" content="noindex">
<!-- theme init script (giris.html'den birebir) -->
<script>(function(){var k='ht_theme_preference',s;try{s=localStorage.getItem(k)}catch(e){}var d=(s==='dark'||(s!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches));document.documentElement.setAttribute('data-theme',d?'dark':'light');})()</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=DM+Mono:wght@400&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

CSS: giris.html'den kopyala (`:root` ~ satir 17-33, `*` reset, `body`, `.header`, `.main`, `.card`, `.tab-toggle`, `.tab-btn`, `.field`, `.btn-submit`, `.error-msg`, `.register-link`, `.divider`, `.consent-label`, dark mode, responsive). Ek CSS:

```css
.field-hint {
  font-size: var(--text-sm);
  color: var(--muted);
  margin-top: 4px;
  line-height: 1.4;
}
.field-error {
  color: #DC2626;
  font-size: var(--text-sm);
  margin-top: 4px;
}
.match-ok { color: #16A34A; }
.match-fail { color: #DC2626; }
```

- [ ] **Step 2: Header + Tab toggle + Footer HTML**

```html
<header class="header">
  <a href="index.html" class="logo">hello<span>talent</span></a>
  <a href="index.html" class="back-link">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
    Ana Sayfa
  </a>
</header>

<main class="main">
  <div class="card">
    <div class="tab-toggle">
      <button class="tab-btn active-aday" id="tab-aday" onclick="switchTab('aday')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Adaylar
      </button>
      <button class="tab-btn" id="tab-kurumsal" onclick="switchTab('kurumsal')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        Kurumsal
      </button>
    </div>

    <div id="form-wrapper">
      <!-- ADAY KAYIT -->
      <div id="form-aday">
        <!-- Step 3'te doldurulacak -->
      </div>

      <!-- KURUMSAL KAYIT -->
      <div id="form-kurumsal" style="display:none;">
        <!-- Task 2'de doldurulacak -->
      </div>
    </div>
  </div>
</main>

<footer class="footer">
  © 2025 hellotalent · <a href="index.html" style="color:var(--muted);text-decoration:none;">Ana Sayfa</a>
</footer>
```

- [ ] **Step 3: Aday kayit formu HTML**

```html
<div id="form-aday">
  <h2 class="card-title">Kayit Ol</h2>
  <p class="card-sub">Ucretsiz aday hesabi olustur.</p>

  <div class="error-msg" id="err-aday-register"></div>

  <div class="field">
    <label for="aday-adsoyad">Ad Soyad <span style="color:var(--verm);">*</span></label>
    <input type="text" id="aday-adsoyad" class="aday" placeholder="Adiniz Soyadiniz" autocomplete="name" maxlength="100">
  </div>
  <div class="field">
    <label for="aday-email">E-posta <span style="color:var(--verm);">*</span></label>
    <input type="email" id="aday-email" class="aday" placeholder="ornek@email.com" autocomplete="email">
  </div>
  <div class="field">
    <label for="aday-telefon">Telefon <span style="color:var(--verm);">*</span></label>
    <input type="tel" id="aday-telefon" class="aday" placeholder="05XX XXX XX XX" autocomplete="tel" maxlength="17">
    <div class="field-hint">Sadece Turkiye cep telefonu (05XX)</div>
  </div>
  <div class="field">
    <label for="aday-sifre">Sifre <span style="color:var(--verm);">*</span></label>
    <input type="password" id="aday-sifre" class="aday" placeholder="En az 8 karakter" autocomplete="new-password">
    <div class="password-strength" id="aday-strength" style="margin-top:6px;">
      <div style="display:flex;gap:4px;margin-bottom:4px;">
        <div class="strength-bar" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:all 0.3s;"></div>
        <div class="strength-bar" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:all 0.3s;"></div>
        <div class="strength-bar" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:all 0.3s;"></div>
      </div>
      <div class="strength-label" style="font-size:var(--text-sm);color:var(--muted);"></div>
      <div class="strength-rules" style="font-size:var(--text-sm);margin-top:4px;line-height:1.6;">
        <div class="rule-check" data-rule="length">○ En az 8 karakter</div>
        <div class="rule-check" data-rule="upper">○ Buyuk harf (A-Z)</div>
        <div class="rule-check" data-rule="lower">○ Kucuk harf (a-z)</div>
        <div class="rule-check" data-rule="number">○ Rakam (0-9)</div>
        <div class="rule-check" data-rule="special">○ Ozel karakter (!@#$%._-)</div>
      </div>
    </div>
  </div>
  <div class="field">
    <label for="aday-sifre-tekrar">Sifre Tekrar <span style="color:var(--verm);">*</span></label>
    <input type="password" id="aday-sifre-tekrar" class="aday" placeholder="Sifrenizi tekrar girin" autocomplete="new-password">
    <div class="field-hint" id="aday-match-hint" style="display:none;"></div>
  </div>

  <label class="consent-label" style="display:flex;align-items:flex-start;gap:8px;margin:12px 0 8px;font-size:var(--text-sm);color:var(--muted);line-height:1.5;cursor:pointer;">
    <input type="checkbox" id="cb-aday-privacy" style="margin-top:3px;flex-shrink:0;">
    <span><a href="yasal.html#gizlilik" target="_blank" rel="noopener noreferrer" style="color:var(--verm);text-decoration:underline;">Gizlilik Politikasi</a>'ni ve <a href="yasal.html#kullanim" target="_blank" rel="noopener noreferrer" style="color:var(--verm);text-decoration:underline;">Kullanim Sartlari</a>'ni okudum, kabul ediyorum.</span>
  </label>
  <label class="consent-label" style="display:flex;align-items:flex-start;gap:8px;margin:0 0 16px;font-size:var(--text-sm);color:var(--muted);line-height:1.5;cursor:pointer;">
    <input type="checkbox" id="cb-aday-kvkk" style="margin-top:3px;flex-shrink:0;">
    <span><a href="yasal.html#kvkk" target="_blank" rel="noopener noreferrer" style="color:var(--verm);text-decoration:underline;">KVKK Aydinlatma Metni</a>'ni okudum, kisisel verilerimin islenmesine acik riza veriyorum.</span>
  </label>

  <button class="btn-submit btn-aday" type="button" id="btn-aday-kayit" disabled>Kayit Ol</button>

  <div style="display:flex;align-items:center;gap:12px;margin:16px 0;">
    <div style="flex:1;height:1px;background:var(--border);"></div>
    <span style="font-size:var(--text-base);color:var(--muted);">veya</span>
    <div style="flex:1;height:1px;background:var(--border);"></div>
  </div>

  <button type="button" id="btn-google-signup" style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;background:white;font-family:'Plus Jakarta Sans',sans-serif;font-size:var(--text-md);font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all 0.2s;margin-bottom:8px;">
    <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
    Google ile Uye Ol
  </button>
  <button type="button" id="btn-linkedin-signup" style="width:100%;padding:12px;border:1.5px solid var(--border);border-radius:10px;background:white;font-family:'Plus Jakarta Sans',sans-serif;font-size:var(--text-md);font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all 0.2s;">
    <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#0A66C2" d="M15.335 0H2.665A2.665 2.665 0 000 2.665v12.67A2.665 2.665 0 002.665 18h12.67A2.665 2.665 0 0018 15.335V2.665A2.665 2.665 0 0015.335 0zM5.339 15.337H2.67V6.747h2.67v8.59zM4.005 5.61a1.548 1.548 0 110-3.096 1.548 1.548 0 010 3.096zm11.332 9.727h-2.67v-4.177c0-.996-.018-2.278-1.388-2.278-1.39 0-1.601 1.086-1.601 2.207v4.248h-2.67V6.747h2.564v1.174h.035c.357-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.779 3.203 4.092v4.711z"/></svg>
    LinkedIn ile Uye Ol
  </button>

  <p class="register-link" style="margin-top:16px;">
    Zaten uye misin?
    <a href="giris.html" class="aday-link">Giris yap</a>
  </p>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add uye-ol.html
git commit -m "feat: uye-ol.html skeleton + aday registration form HTML"
```

---

### Task 2: uye-ol.html — Kurumsal kayit formu

**Files:**
- Modify: `uye-ol.html`

- [ ] **Step 1: Kurumsal kayit formu HTML**

`form-kurumsal` div'ini doldur:

```html
<div id="form-kurumsal" style="display:none;">
  <h2 class="card-title">Kurumsal Hesap Olustur</h2>
  <p class="card-sub">Sirketiniz icin kurumsal hesap olusturun.</p>

  <div class="error-msg" id="err-kurumsal-register"></div>

  <div class="field">
    <label for="k-adsoyad">Ad Soyad <span style="color:var(--navy);">*</span></label>
    <input type="text" id="k-adsoyad" placeholder="Adiniz Soyadiniz" autocomplete="name" maxlength="100">
  </div>
  <div class="field">
    <label for="k-sirket">Sirket Adi <span style="color:var(--navy);">*</span></label>
    <input type="text" id="k-sirket" placeholder="Orn: Zara Turkiye, Boyner Grup..." autocomplete="organization">
  </div>
  <div class="field">
    <label for="k-web">Sirket Web Sitesi</label>
    <input type="url" id="k-web" placeholder="https://sirketiniz.com" autocomplete="url">
    <div id="k-domain-hint" class="field-hint" style="display:none;"></div>
  </div>
  <div class="field">
    <label for="k-email">Kurumsal E-posta <span style="color:var(--navy);">*</span></label>
    <input type="email" id="k-email" placeholder="isim@sirket.com" autocomplete="email">
    <div id="k-email-warning" class="field-hint" style="display:none;background:#FEF3C7;color:#92400E;border:1px solid #FDE68A;padding:6px 10px;border-radius:6px;">
      Kisisel e-posta adresi tespit edildi. Kurumsal e-posta kullanmanizi oneriyoruz.
    </div>
  </div>
  <div class="field">
    <label for="k-telefon">Telefon <span style="color:var(--navy);">*</span></label>
    <input type="tel" id="k-telefon" placeholder="05XX XXX XX XX" autocomplete="tel" maxlength="17">
    <div class="field-hint">Sadece Turkiye cep telefonu (05XX)</div>
  </div>
  <div class="field">
    <label for="k-sifre">Sifre <span style="color:var(--navy);">*</span></label>
    <input type="password" id="k-sifre" placeholder="En az 8 karakter" autocomplete="new-password">
    <div class="password-strength" id="k-strength" style="margin-top:6px;">
      <div style="display:flex;gap:4px;margin-bottom:4px;">
        <div class="strength-bar" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:all 0.3s;"></div>
        <div class="strength-bar" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:all 0.3s;"></div>
        <div class="strength-bar" style="flex:1;height:3px;border-radius:2px;background:var(--border);transition:all 0.3s;"></div>
      </div>
      <div class="strength-label" style="font-size:var(--text-sm);color:var(--muted);"></div>
      <div class="strength-rules" style="font-size:var(--text-sm);margin-top:4px;line-height:1.6;">
        <div class="rule-check" data-rule="length">○ En az 8 karakter</div>
        <div class="rule-check" data-rule="upper">○ Buyuk harf (A-Z)</div>
        <div class="rule-check" data-rule="lower">○ Kucuk harf (a-z)</div>
        <div class="rule-check" data-rule="number">○ Rakam (0-9)</div>
        <div class="rule-check" data-rule="special">○ Ozel karakter (!@#$%._-)</div>
      </div>
    </div>
  </div>
  <div class="field">
    <label for="k-sifre-tekrar">Sifre Tekrar <span style="color:var(--navy);">*</span></label>
    <input type="password" id="k-sifre-tekrar" placeholder="Sifrenizi tekrar girin" autocomplete="new-password">
    <div class="field-hint" id="k-match-hint" style="display:none;"></div>
  </div>

  <label class="consent-label" style="display:flex;align-items:flex-start;gap:8px;margin:12px 0 8px;font-size:var(--text-sm);color:var(--muted);line-height:1.5;cursor:pointer;">
    <input type="checkbox" id="cb-k-privacy" style="margin-top:3px;flex-shrink:0;">
    <span><a href="yasal.html#gizlilik" target="_blank" rel="noopener noreferrer" style="color:var(--navy);text-decoration:underline;">Gizlilik Politikasi</a>'ni ve <a href="yasal.html#kullanim" target="_blank" rel="noopener noreferrer" style="color:var(--navy);text-decoration:underline;">Kullanim Sartlari</a>'ni okudum, kabul ediyorum.</span>
  </label>
  <label class="consent-label" style="display:flex;align-items:flex-start;gap:8px;margin:0 0 16px;font-size:var(--text-sm);color:var(--muted);line-height:1.5;cursor:pointer;">
    <input type="checkbox" id="cb-k-kvkk" style="margin-top:3px;flex-shrink:0;">
    <span><a href="yasal.html#kvkk" target="_blank" rel="noopener noreferrer" style="color:var(--navy);text-decoration:underline;">KVKK Aydinlatma Metni</a>'ni okudum, kisisel verilerimin islenmesine acik riza veriyorum.</span>
  </label>

  <button class="btn-submit btn-ik" type="button" id="btn-k-kayit" disabled>Kayit Ol</button>

  <p class="register-link" style="margin-top:16px;">
    Zaten hesabiniz var mi?
    <a href="giris.html?tab=kurumsal" class="ik-link">Giris yap</a>
  </p>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add uye-ol.html
git commit -m "feat: kurumsal registration form HTML in uye-ol.html"
```

---

### Task 3: uye-ol.html — JS: Tab switch, validation, password strength, phone format

**Files:**
- Modify: `uye-ol.html`

- [ ] **Step 1: shared.js import + Supabase helper + tab switch JS**

Sayfanin altinda (`</footer>` sonrasi):

```html
<script src="/shared.js?v=20260409b"></script>
<script>
function getSupa() { return HT.getSupa(); }

// ── TAB SWITCH ──
function switchTab(tab) {
  var adayForm = document.getElementById('form-aday');
  var kurumsalForm = document.getElementById('form-kurumsal');
  var adayBtn = document.getElementById('tab-aday');
  var kurumsalBtn = document.getElementById('tab-kurumsal');

  if (tab === 'aday') {
    adayForm.style.display = 'block';
    kurumsalForm.style.display = 'none';
    adayBtn.className = 'tab-btn active-aday';
    kurumsalBtn.className = 'tab-btn';
    document.body.style.background = 'var(--verm)';
  } else {
    adayForm.style.display = 'none';
    kurumsalForm.style.display = 'block';
    adayBtn.className = 'tab-btn';
    kurumsalBtn.className = 'tab-btn active-ik';
    document.body.style.background = 'var(--navy)';
  }
}

// URL param: ?tab=kurumsal
(function() {
  var p = new URLSearchParams(window.location.search);
  if (p.get('tab') === 'kurumsal') switchTab('kurumsal');
})();

// Oturum kontrolu — zaten giris yapmis kullaniciyi yonlendir
(async function() {
  var s = await getSupa().auth.getSession();
  if (s.data.session && s.data.session.user) {
    var role = s.data.session.user.user_metadata && s.data.session.user.user_metadata.role;
    window.location.href = role === 'employer' ? 'demo-dashboard-ik.html' : 'profil.html';
  }
})();
```

- [ ] **Step 2: Telefon formatter + GSM validator**

```js
// ── TELEFON FORMAT (05XX XXX XX XX) ──
function formatPhone(input) {
  var digits = input.value.replace(/\D/g, '');
  if (digits.length > 11) digits = digits.slice(0, 11);
  var formatted = '';
  if (digits.length > 0) formatted = digits.slice(0, 4);
  if (digits.length > 4) formatted += ' ' + digits.slice(4, 7);
  if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);
  if (digits.length > 9) formatted += ' ' + digits.slice(9, 11);
  input.value = formatted;
}

function isValidPhone(val) {
  var digits = val.replace(/\D/g, '');
  return /^05[0-9]{9}$/.test(digits);
}

document.getElementById('aday-telefon').addEventListener('input', function() { formatPhone(this); });
document.getElementById('k-telefon').addEventListener('input', function() { formatPhone(this); });
```

- [ ] **Step 3: Password strength indicator (reusable)**

giris.html'deki mevcut strength logic'i birebir al:

```js
// ── PASSWORD STRENGTH ──
function setupStrength(passwordId, containerId) {
  var input = document.getElementById(passwordId);
  var container = document.getElementById(containerId);
  if (!input || !container) return;
  var bars = container.querySelectorAll('.strength-bar');
  var label = container.querySelector('.strength-label');
  var rules = container.querySelectorAll('.rule-check');

  input.addEventListener('input', function() {
    var val = input.value;
    var checks = {
      length: val.length >= 8,
      upper: /[A-Z]/.test(val),
      lower: /[a-z]/.test(val),
      number: /[0-9]/.test(val),
      special: /[!@#$%._\-]/.test(val)
    };
    var passed = Object.values(checks).filter(Boolean).length;

    rules.forEach(function(r) {
      var rule = r.getAttribute('data-rule');
      r.textContent = (checks[rule] ? '● ' : '○ ') + r.textContent.replace(/^[●○]\s*/, '');
      r.style.color = checks[rule] ? '#16A34A' : 'var(--muted)';
    });

    var colors = ['#DC2626', '#F59E0B', '#16A34A'];
    var labels = ['Zayif', 'Orta', 'Guclu'];
    var level = passed <= 2 ? 0 : (passed <= 4 ? 1 : 2);
    bars.forEach(function(b, i) { b.style.background = i <= level ? colors[level] : 'var(--border)'; });
    label.textContent = val.length > 0 ? labels[level] : '';
    label.style.color = colors[level];
  });
}

setupStrength('aday-sifre', 'aday-strength');
setupStrength('k-sifre', 'k-strength');
```

- [ ] **Step 4: Password match check**

```js
// ── PASSWORD MATCH ──
function setupMatch(passwordId, confirmId, hintId) {
  var confirm = document.getElementById(confirmId);
  var hint = document.getElementById(hintId);
  if (!confirm || !hint) return;

  confirm.addEventListener('input', function() {
    var pw = document.getElementById(passwordId).value;
    var cf = confirm.value;
    if (cf.length === 0) { hint.style.display = 'none'; return; }
    hint.style.display = 'block';
    if (pw === cf) {
      hint.textContent = 'Sifreler eslesir';
      hint.className = 'field-hint match-ok';
    } else {
      hint.textContent = 'Sifreler eslesmedi';
      hint.className = 'field-hint match-fail';
    }
  });
}

setupMatch('aday-sifre', 'aday-sifre-tekrar', 'aday-match-hint');
setupMatch('k-sifre', 'k-sifre-tekrar', 'k-match-hint');
```

- [ ] **Step 5: Form validation — enable/disable submit buttons**

```js
// ── FORM VALIDATION (enable submit when all fields valid) ──
function validateAdayForm() {
  var name = document.getElementById('aday-adsoyad').value.trim();
  var email = document.getElementById('aday-email').value.trim();
  var phone = document.getElementById('aday-telefon').value;
  var pw = document.getElementById('aday-sifre').value;
  var pw2 = document.getElementById('aday-sifre-tekrar').value;
  var privacy = document.getElementById('cb-aday-privacy').checked;
  var kvkk = document.getElementById('cb-aday-kvkk').checked;

  var valid = name.length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    isValidPhone(phone) &&
    pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw) &&
    pw === pw2 &&
    privacy && kvkk;

  document.getElementById('btn-aday-kayit').disabled = !valid;
}

function validateKurumsalForm() {
  var name = document.getElementById('k-adsoyad').value.trim();
  var sirket = document.getElementById('k-sirket').value.trim();
  var email = document.getElementById('k-email').value.trim();
  var phone = document.getElementById('k-telefon').value;
  var pw = document.getElementById('k-sifre').value;
  var pw2 = document.getElementById('k-sifre-tekrar').value;
  var privacy = document.getElementById('cb-k-privacy').checked;
  var kvkk = document.getElementById('cb-k-kvkk').checked;

  var valid = name.length >= 2 &&
    sirket.length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    isValidPhone(phone) &&
    pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw) &&
    pw === pw2 &&
    privacy && kvkk;

  document.getElementById('btn-k-kayit').disabled = !valid;
}

// Bind all inputs
['aday-adsoyad','aday-email','aday-telefon','aday-sifre','aday-sifre-tekrar','cb-aday-privacy','cb-aday-kvkk'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', validateAdayForm);
});

['k-adsoyad','k-sirket','k-email','k-telefon','k-sifre','k-sifre-tekrar','cb-k-privacy','cb-k-kvkk'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', validateKurumsalForm);
});
```

- [ ] **Step 6: Kurumsal email domain warning (mevcut pattern)**

```js
// ── KURUMSAL EMAIL DOMAIN WARNING ──
(function() {
  var emailInput = document.getElementById('k-email');
  var warning = document.getElementById('k-email-warning');
  var freeProviders = ['gmail.com','hotmail.com','outlook.com','yahoo.com','yandex.com','icloud.com','mail.com','protonmail.com'];
  emailInput.addEventListener('input', function() {
    var domain = (emailInput.value.split('@')[1] || '').toLowerCase();
    warning.style.display = freeProviders.indexOf(domain) >= 0 ? 'block' : 'none';
  });
})();

// ── DOMAIN MATCH HINT ──
(function() {
  var webInput = document.getElementById('k-web');
  var emailInput = document.getElementById('k-email');
  var hint = document.getElementById('k-domain-hint');

  function checkDomainMatch() {
    var webVal = webInput.value.trim();
    var emailVal = emailInput.value.trim();
    if (!webVal || !emailVal || emailVal.indexOf('@') < 0) { hint.style.display = 'none'; return; }
    try {
      var webDomain = new URL(webVal.indexOf('://') < 0 ? 'https://' + webVal : webVal).hostname.replace('www.', '');
      var emailDomain = emailVal.split('@')[1].toLowerCase();
      if (webDomain === emailDomain) {
        hint.style.display = 'block';
        hint.textContent = 'Domain eslesiyor';
        hint.style.background = '#DCFCE7'; hint.style.color = '#166534'; hint.style.borderColor = '#BBF7D0';
      } else {
        hint.style.display = 'block';
        hint.textContent = 'Domain farkli: ' + webDomain + ' vs ' + emailDomain;
        hint.style.background = '#FEF3C7'; hint.style.color = '#92400E'; hint.style.borderColor = '#FDE68A';
      }
    } catch(e) { hint.style.display = 'none'; }
  }

  webInput.addEventListener('input', checkDomainMatch);
  emailInput.addEventListener('input', checkDomainMatch);
})();
```

- [ ] **Step 7: Close script tag**

```js
</script>
</body>
</html>
```

- [ ] **Step 8: Commit**

```bash
git add uye-ol.html
git commit -m "feat: uye-ol.html JS — tab switch, validation, phone format, strength, domain check"
```

---

### Task 4: uye-ol.html — JS: Supabase signUp (aday + kurumsal)

**Files:**
- Modify: `uye-ol.html`

- [ ] **Step 1: Aday signUp handler**

`validateKurumsalForm` fonksiyonundan sonra, `</script>` oncesine ekle:

```js
// ── ADAY SIGNUP ──
(function() {
  var btn = document.getElementById('btn-aday-kayit');
  btn.addEventListener('click', async function() {
    var errEl = document.getElementById('err-aday-register');
    errEl.style.display = 'none';

    var fullName = document.getElementById('aday-adsoyad').value.trim();
    var email = document.getElementById('aday-email').value.trim().toLowerCase();
    var phone = document.getElementById('aday-telefon').value.replace(/\D/g, '');
    var password = document.getElementById('aday-sifre').value;

    btn.disabled = true;
    btn.textContent = 'Kayit yapiliyor...';

    try {
      var { data, error } = await getSupa().auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            privacy_consent_at: new Date().toISOString(),
            kvkk_explicit_consent_at: new Date().toISOString(),
            age_confirmed: true
          }
        }
      });

      if (error) throw error;

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        errEl.textContent = 'Bu e-posta adresi zaten kayitli. Giris yapin veya farkli bir e-posta deneyin.';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Kayit Ol';
        return;
      }

      window.location.href = 'profil.html';
    } catch (err) {
      errEl.textContent = 'Hata: ' + (err.message || 'Bilinmeyen hata');
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Kayit Ol';
    }
  });
})();
```

- [ ] **Step 2: Kurumsal signUp handler**

```js
// ── KURUMSAL SIGNUP ──
(function() {
  var btn = document.getElementById('btn-k-kayit');
  btn.addEventListener('click', async function() {
    var errEl = document.getElementById('err-kurumsal-register');
    errEl.style.display = 'none';

    var fullName = document.getElementById('k-adsoyad').value.trim();
    var sirket = document.getElementById('k-sirket').value.trim();
    var website = document.getElementById('k-web').value.trim();
    var email = document.getElementById('k-email').value.trim().toLowerCase();
    var phone = document.getElementById('k-telefon').value.replace(/\D/g, '');
    var password = document.getElementById('k-sifre').value;

    btn.disabled = true;
    btn.textContent = 'Kayit yapiliyor...';

    try {
      var { data, error } = await getSupa().auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            role: 'employer',
            full_name: fullName,
            company_name: sirket,
            company_website: website,
            phone: phone,
            privacy_consent_at: new Date().toISOString(),
            kvkk_explicit_consent_at: new Date().toISOString(),
            age_confirmed: true
          }
        }
      });

      if (error) throw error;

      if (data.user && data.user.identities && data.user.identities.length === 0) {
        errEl.textContent = 'Bu e-posta adresi zaten kayitli.';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Kayit Ol';
        return;
      }

      // register_employer RPC — hr_profiles row olustur
      try {
        await getSupa().rpc('register_employer', {
          p_email: email,
          p_sirket: sirket,
          p_website: website || null
        });
      } catch (rpcErr) {
        console.warn('register_employer RPC basarisiz:', rpcErr.message);
      }

      window.location.href = 'demo-dashboard-ik.html';
    } catch (err) {
      errEl.textContent = 'Hata: ' + (err.message || 'Bilinmeyen hata');
      errEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Kayit Ol';
    }
  });
})();
```

- [ ] **Step 3: OAuth handlers (aday only)**

```js
// ── OAUTH (aday only) ──
(function() {
  var googleBtn = document.getElementById('btn-google-signup');
  var linkedinBtn = document.getElementById('btn-linkedin-signup');

  if (googleBtn) {
    googleBtn.addEventListener('click', async function() {
      await getSupa().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/profil.html' } });
    });
  }

  if (linkedinBtn) {
    linkedinBtn.addEventListener('click', async function() {
      await getSupa().auth.signInWithOAuth({ provider: 'linkedin_oidc', options: { redirectTo: window.location.origin + '/profil.html' } });
    });
  }
})();
```

- [ ] **Step 4: Commit**

```bash
git add uye-ol.html
git commit -m "feat: uye-ol.html signUp — aday + kurumsal Supabase auth + OAuth"
```

---

### Task 5: demo-dashboard-ik.html — Kurumsal demo placeholder

**Files:**
- Create: `demo-dashboard-ik.html`

- [ ] **Step 1: Tam sayfa olustur**

```html
<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-Frame-Options" content="DENY">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://cpwibefquojehjehtrog.supabase.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Demo Panel — hellotalent</title>
<meta name="robots" content="noindex">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<style>
:root { --navy:#1E2D5E; --verm:#C94E28; --bg:#F7F6F4; --text:#111; --muted:#6B7280; --border:#E5E3DF; }
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:'Plus Jakarta Sans',sans-serif; background:var(--bg); min-height:100vh; }
.demo-header { display:flex; align-items:center; justify-content:space-between; padding:16px 24px; background:white; border-bottom:1px solid var(--border); }
.demo-logo { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:18px; color:var(--navy); text-decoration:none; }
.demo-logo span { color:var(--verm); }
.demo-badge { background:var(--verm); color:white; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; margin-left:10px; }
.demo-logout { font-size:13px; color:var(--muted); cursor:pointer; background:none; border:1px solid var(--border); padding:8px 16px; border-radius:8px; font-family:inherit; }
.demo-logout:hover { border-color:var(--navy); color:var(--navy); }
.demo-hero { text-align:center; padding:60px 24px 40px; }
.demo-hero h1 { font-family:'Bricolage Grotesque',sans-serif; font-size:28px; font-weight:800; color:var(--navy); margin-bottom:12px; }
.demo-hero p { font-size:15px; color:var(--muted); max-width:480px; margin:0 auto; line-height:1.6; }
.demo-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; max-width:960px; margin:0 auto; padding:0 24px 40px; }
.demo-card { background:white; border:1px solid var(--border); border-radius:12px; padding:20px; position:relative; }
.demo-card::after { content:'DEMO'; position:absolute; top:12px; right:12px; background:var(--border); color:var(--muted); font-size:10px; font-weight:700; padding:2px 8px; border-radius:4px; }
.demo-card h3 { font-size:15px; font-weight:700; color:var(--text); margin-bottom:4px; }
.demo-card p { font-size:13px; color:var(--muted); line-height:1.5; }
.demo-card .tag { display:inline-block; font-size:11px; padding:3px 8px; border-radius:4px; margin-top:8px; margin-right:4px; background:var(--bg); color:var(--muted); border:1px solid var(--border); }
.demo-cta { text-align:center; padding:20px 24px 60px; }
.demo-cta a { display:inline-block; padding:14px 32px; background:var(--navy); color:white; border-radius:10px; font-weight:700; font-size:15px; text-decoration:none; transition:all .2s; }
.demo-cta a:hover { transform:translateY(-1px); box-shadow:0 4px 12px rgba(30,45,94,.2); }
.demo-cta p { font-size:13px; color:var(--muted); margin-top:12px; }
</style>
</head>
<body>

<header class="demo-header">
  <div style="display:flex;align-items:center;">
    <a href="index.html" class="demo-logo">hello<span>talent</span></a>
    <span class="demo-badge">DEMO</span>
  </div>
  <button class="demo-logout" id="btn-logout">Cikis Yap</button>
</header>

<section class="demo-hero">
  <h1>Demo Paneline Hos Geldiniz</h1>
  <p>Asagida ornek aday profilleri gorebilirsiniz. Gercek aday havuzuna erismek ve eslesme motorumuzu deneyimlemek icin bizimle iletisime gecin.</p>
</section>

<div class="demo-grid">
  <div class="demo-card">
    <h3>Ayse K.</h3>
    <p>8 yil perakende deneyimi. Magaza muduru, luksude calistim.</p>
    <span class="tag">Luks</span><span class="tag">Magaza Muduru</span><span class="tag">Istanbul</span>
  </div>
  <div class="demo-card">
    <h3>Mehmet T.</h3>
    <p>5 yil fast fashion. Bolge sorumlusu, 12 magaza yonetimi.</p>
    <span class="tag">Fast Fashion</span><span class="tag">Bolge Sorumlusu</span><span class="tag">Ankara</span>
  </div>
  <div class="demo-card">
    <h3>Zeynep A.</h3>
    <p>3 yil kozmetik perakende. Satis danismani, egitim sertifikali.</p>
    <span class="tag">Kozmetik</span><span class="tag">Satis Danismani</span><span class="tag">Izmir</span>
  </div>
  <div class="demo-card">
    <h3>Can B.</h3>
    <p>6 yil spor perakende. Depo ve lojistik operasyon yoneticisi.</p>
    <span class="tag">Spor</span><span class="tag">Operasyon</span><span class="tag">Bursa</span>
  </div>
</div>

<div class="demo-cta">
  <a href="iletisim.html">Gercek Adaylara Erisin</a>
  <p>Ekibimiz sizinle iletisime gececek ve sirketinize ozel bir demo hazirlayacak.</p>
</div>

<script src="/shared.js?v=20260409b"></script>
<script>
(async function() {
  var supa = HT.getSupa();
  var { data } = await supa.auth.getSession();
  if (!data.session) { window.location.href = 'giris.html?tab=kurumsal'; return; }
  var role = data.session.user.user_metadata && data.session.user.user_metadata.role;
  if (role !== 'employer') { window.location.href = 'profil.html'; return; }
})();

document.getElementById('btn-logout').addEventListener('click', async function() {
  await HT.getSupa().auth.signOut();
  window.location.href = 'index.html';
});
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add demo-dashboard-ik.html
git commit -m "feat: demo-dashboard-ik.html — kurumsal demo placeholder page"
```

---

### Task 6: giris.html — Kayit formlari cikar, label guncelle, logo fix

**Files:**
- Modify: `giris.html`

- [ ] **Step 1: Aday kayit formunu (aday-register-box) HTML'den kaldir**

giris.html'de `<!-- Aday Kayit (register) -->` yorumundan `</div><!-- /aday-register-box -->` kapanisina kadar olan blok (satirlar ~383-425) silinir.

- [ ] **Step 2: IK kayit formunu (ik-register-box) HTML'den kaldir**

giris.html'de `<!-- IK Kayit (register) -->` yorumundan `</div><!-- /ik-register-box -->` kapanisina kadar olan blok (satirlar ~464-518) silinir.

- [ ] **Step 3: "Kayit ol" linklerini uye-ol.html'e yonlendir**

Aday tarafinda (aday-login-box icindeki satirlar ~377-380):
```html
<!-- Eski -->
<p class="register-link">
  Henuz uye degil misin?
  <a href="#" class="aday-link" id="link-aday-show-register">Hemen kayit ol</a>
</p>

<!-- Yeni -->
<p class="register-link">
  Henuz uye degil misin?
  <a href="uye-ol.html" class="aday-link">Hemen kayit ol</a>
</p>
```

IK tarafinda (ik-login-box icindeki satirlar ~456-461):
```html
<!-- Eski -->
<p class="register-link">
  IK hesabi yok mu?
  <a href="#" class="ik-link" id="link-ik-show-register">Kayit ol</a>
  <span style="color:var(--muted);"> · </span>
  <a href="/iletisim.html" class="ik-link">Demo talep et</a>
</p>

<!-- Yeni -->
<p class="register-link">
  Kurumsal hesabiniz yok mu?
  <a href="uye-ol.html?tab=kurumsal" class="ik-link">Kayit ol</a>
</p>
```

- [ ] **Step 4: Tab label "IK" → "Kurumsal"**

giris.html HTML'deki tab buton'unda (satir ~334):
```html
<!-- Eski -->
<button class="tab-btn" id="tab-ik" onclick="switchTab('ik')">...</button>

<!-- Yeni: label text'i degistir, icon ayni kalir -->
Kurumsal
```

Card title'lar:
- "IK Paneline Giris" → "Kurumsal Giris"
- "Aday havuzuna erismek icin IK hesabinla giris yap." → "Sirketiniz icin kurumsal hesabinizla giris yapin."

- [ ] **Step 5: Header logo .ai kaldir**

giris.html header'inda (satir ~325):
```html
<!-- Eski -->
<a href="index.html" class="logo">hello<span>talent</span>.ai</a>

<!-- Yeni -->
<a href="index.html" class="logo">hello<span>talent</span></a>
```

Title tag (satir 9):
```html
<title>Giris Yap — hellotalent</title>
```

- [ ] **Step 6: JS — Kayit ile ilgili IIFE'leri ve toggle handler'larini kaldir**

giris.html JS'inde (satirlar ~854-873 arasi toggle IIFE + ~954-1042 aday register IIFE + ~1044-1120 IK register IIFE) silinir.

Consent checkbox validation JS'i de silinir (artik uye-ol.html'de).

- [ ] **Step 7: Employer post-login redirect guncelle**

giris.html JS'inde satirlar ~610-613:
```js
// Eski
checkAndHandleMFA(role === 'employer' ? 'ik.html' : getCandidatePostAuthUrl());

// Yeni
checkAndHandleMFA(role === 'employer' ? 'demo-dashboard-ik.html' : getCandidatePostAuthUrl());
```

Ayni sekilde `loginIK()` fonksiyonunda (satir ~731):
```js
// Eski
checkAndHandleMFA('ik.html');

// Yeni
checkAndHandleMFA('demo-dashboard-ik.html');
```

- [ ] **Step 8: URL param "ik" → "kurumsal" destegi (backward compat)**

switchTab fonksiyonunda (satir ~617):
```js
// Tab ismi "ik" kalir (internal), ama URL param hem "ik" hem "kurumsal" kabul eder
var urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('tab') === 'ik' || urlParams.get('tab') === 'kurumsal') {
  switchTab('ik');
}
```

- [ ] **Step 9: Commit**

```bash
git add giris.html
git commit -m "fix: giris.html — strip registration forms, update labels, employer→demo redirect"
```

---

### Task 7: shared.js + index.html — Link guncelleme

**Files:**
- Modify: `shared.js`
- Modify: `index.html`

- [ ] **Step 1: shared.js login modal — "Kayit ol" link ekle**

shared.js satir ~85-101 arasi login modal kartlarinda, her kardin altina "veya kayit ol" linki ekle:

```js
// Aday karti icinde (lmc-desc sonrasina)
'        <div class="lmc-sub" style="font-size:11px;color:var(--muted);margin-top:6px;">veya <a href="uye-ol.html" style="color:var(--verm);text-decoration:underline;">Kayit ol</a></div>',

// IK karti icinde
'        <div class="lmc-sub" style="font-size:11px;color:var(--muted);margin-top:6px;">veya <a href="uye-ol.html?tab=kurumsal" style="color:var(--navy);text-decoration:underline;">Kayit ol</a></div>',
```

- [ ] **Step 2: index.html — Aday CTA butonlari → uye-ol.html**

index.html satirlar ~300-304 (hero CTA) ve ~414-418 (final CTA):
```html
<!-- Eski -->
<button class="btn-g" onclick="window.location.href='/giris.html?tab=aday'">Google ile Uye Ol</button>
<a href="/giris.html?tab=aday" class="btn-p">Ucretsiz Hesap Olustur</a>

<!-- Yeni -->
<button class="btn-g" onclick="window.location.href='/uye-ol.html'">Google ile Uye Ol</button>
<a href="/uye-ol.html" class="btn-p">Ucretsiz Hesap Olustur</a>
```

index.html header (satir ~276):
```html
<!-- Eski -->
<a class="lp-hdr-cta" href="giris.html">Giris Yap</a>

<!-- Degismez — bu giris icin, dogru -->
```

- [ ] **Step 3: Kurumsal lead form → uye-ol.html yonlendirme**

index.html kurumsal segmentindeki lead form (satirlar ~587-668) kalabilir VEYA "Kayit Ol" butonuna donusturulur. Spec'e gore lead form kalkiyor, yerine:

```html
<!-- Lead form yerine basit CTA -->
<section class="cta-end s" id="lead-form">
  <div class="s-inner" style="text-align:center;padding:60px 0;">
    <h2 style="font-family:var(--font-d);font-size:clamp(24px,3vw,32px);font-weight:800;color:var(--text-primary);margin-bottom:12px;">Hazir misiniz?</h2>
    <p style="font-size:15px;color:var(--text-muted);margin-bottom:28px;max-width:420px;margin-left:auto;margin-right:auto;">Ucretsiz kurumsal hesap olusturun ve demo panelimizi hemen kesfetmeye baslayin.</p>
    <a href="uye-ol.html?tab=kurumsal" class="btn-p" style="font-size:16px;padding:16px 40px;">Kurumsal Hesap Olustur</a>
  </div>
</section>
```

- [ ] **Step 4: Commit**

```bash
git add shared.js index.html
git commit -m "feat: update CTAs — login modal + index.html → uye-ol.html"
```

---

### Task 8: profil-bootstrap.js + profil-wizard.js — Pre-fill + employer routing

**Files:**
- Modify: `profil-bootstrap.js`
- Modify: `profil-wizard.js`

- [ ] **Step 1: profil-bootstrap.js — Employer routing → demo-dashboard-ik.html**

profil-bootstrap.js satir ~91-94:
```js
// Eski
if (currentUser.user_metadata && currentUser.user_metadata.role === 'employer') {
  window.location.href = 'ik.html';
  return;
}

// Yeni
if (currentUser.user_metadata && currentUser.user_metadata.role === 'employer') {
  window.location.href = 'demo-dashboard-ik.html';
  return;
}
```

- [ ] **Step 2: profil-bootstrap.js — full_name pre-fill from user_metadata**

profil-bootstrap.js satir ~117-120 (metaName logic):
```js
// Mevcut (sadece sidebar icin)
var metaName = (currentUser.user_metadata && (currentUser.user_metadata.full_name || currentUser.user_metadata.name)) || '';

// Ek: wizard f-adsoyad alanina da set et (eger bos ise)
var nameField = document.getElementById('f-adsoyad');
if (nameField && !nameField.value && metaName) {
  nameField.value = metaName;
}
```

- [ ] **Step 3: profil-bootstrap.js — phone pre-fill from user_metadata**

Ayni blokta, metaName satirindan sonra:
```js
var metaPhone = (currentUser.user_metadata && currentUser.user_metadata.phone) || '';
var phoneField = document.getElementById('f-telefon');
if (phoneField && !phoneField.value && metaPhone) {
  // Format: 05XXXXXXXXX → 05XX XXX XX XX
  var d = metaPhone.replace(/\D/g, '');
  if (d.length === 11) {
    phoneField.value = d.slice(0,4) + ' ' + d.slice(4,7) + ' ' + d.slice(7,9) + ' ' + d.slice(9,11);
  } else {
    phoneField.value = metaPhone;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add profil-bootstrap.js profil-wizard.js
git commit -m "feat: wizard pre-fill full_name + phone from user_metadata, employer→demo routing"
```

---

### Task 9: sitemap.xml + test dosyasi

**Files:**
- Modify: `sitemap.xml`
- Create: `tests/auth-pages.spec.js`

- [ ] **Step 1: sitemap.xml — uye-ol.html ekle**

```xml
<url>
  <loc>https://hellotalent.ai/uye-ol.html</loc>
  <changefreq>monthly</changefreq>
  <priority>0.7</priority>
</url>
```

- [ ] **Step 2: tests/auth-pages.spec.js — smoke testler**

```js
var { test, expect } = require('@playwright/test');

test.describe('uye-ol.html', function() {
  test('page loads with aday tab active', async function({ page }) {
    await page.goto('/uye-ol.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#form-aday')).toBeVisible();
    await expect(page.locator('#form-kurumsal')).toBeHidden();
  });

  test('tab=kurumsal opens kurumsal form', async function({ page }) {
    await page.goto('/uye-ol.html?tab=kurumsal', { waitUntil: 'networkidle' });
    await expect(page.locator('#form-kurumsal')).toBeVisible();
    await expect(page.locator('#form-aday')).toBeHidden();
  });

  test('aday form has all required fields', async function({ page }) {
    await page.goto('/uye-ol.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#aday-adsoyad')).toBeVisible();
    await expect(page.locator('#aday-email')).toBeVisible();
    await expect(page.locator('#aday-telefon')).toBeVisible();
    await expect(page.locator('#aday-sifre')).toBeVisible();
    await expect(page.locator('#aday-sifre-tekrar')).toBeVisible();
    await expect(page.locator('#cb-aday-privacy')).toBeVisible();
    await expect(page.locator('#cb-aday-kvkk')).toBeVisible();
    await expect(page.locator('#btn-aday-kayit')).toBeVisible();
    await expect(page.locator('#btn-aday-kayit')).toBeDisabled();
  });

  test('kurumsal form has all required fields', async function({ page }) {
    await page.goto('/uye-ol.html?tab=kurumsal', { waitUntil: 'networkidle' });
    await expect(page.locator('#k-adsoyad')).toBeVisible();
    await expect(page.locator('#k-sirket')).toBeVisible();
    await expect(page.locator('#k-web')).toBeVisible();
    await expect(page.locator('#k-email')).toBeVisible();
    await expect(page.locator('#k-telefon')).toBeVisible();
    await expect(page.locator('#k-sifre')).toBeVisible();
    await expect(page.locator('#k-sifre-tekrar')).toBeVisible();
    await expect(page.locator('#cb-k-privacy')).toBeVisible();
    await expect(page.locator('#cb-k-kvkk')).toBeVisible();
    await expect(page.locator('#btn-k-kayit')).toBeVisible();
    await expect(page.locator('#btn-k-kayit')).toBeDisabled();
  });

  test('aday phone formats correctly', async function({ page }) {
    await page.goto('/uye-ol.html', { waitUntil: 'networkidle' });
    await page.fill('#aday-telefon', '05321234567');
    var val = await page.inputValue('#aday-telefon');
    expect(val).toBe('0532 123 45 67');
  });

  test('password match hint shows', async function({ page }) {
    await page.goto('/uye-ol.html', { waitUntil: 'networkidle' });
    await page.fill('#aday-sifre', 'Test1234!');
    await page.fill('#aday-sifre-tekrar', 'Test1234!');
    await expect(page.locator('#aday-match-hint')).toBeVisible();
    await expect(page.locator('#aday-match-hint')).toContainText('eslesir');
  });

  test('no horizontal scroll on mobile', async function({ page }) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/uye-ol.html', { waitUntil: 'networkidle' });
    var hs = await page.evaluate(function() {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hs).toBe(false);
  });
});

test.describe('demo-dashboard-ik.html', function() {
  test('page loads with demo badge', async function({ page }) {
    await page.goto('/demo-dashboard-ik.html', { waitUntil: 'networkidle' });
    // Will redirect to giris.html if not logged in — just check no crash
    await page.waitForTimeout(2000);
    var url = page.url();
    expect(url.includes('demo-dashboard') || url.includes('giris')).toBe(true);
  });
});

test.describe('giris.html updates', function() {
  test('no registration forms exist', async function({ page }) {
    await page.goto('/giris.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#aday-register-box')).toHaveCount(0);
    await expect(page.locator('#ik-register-box')).toHaveCount(0);
  });

  test('kayit ol link points to uye-ol.html', async function({ page }) {
    await page.goto('/giris.html', { waitUntil: 'networkidle' });
    var link = page.locator('a[href="uye-ol.html"]');
    await expect(link).toBeVisible();
  });

  test('logo does not contain .ai', async function({ page }) {
    await page.goto('/giris.html', { waitUntil: 'networkidle' });
    var logoText = await page.locator('.logo').textContent();
    expect(logoText).not.toContain('.ai');
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add sitemap.xml tests/auth-pages.spec.js
git commit -m "feat: sitemap + auth-pages smoke tests"
```

---

### Task 10: Cache-bust + AI-COLLAB guncelleme

**Files:**
- Modify: Multiple HTML files (cache-bust)
- Modify: `docs/AI-COLLAB.md`

- [ ] **Step 1: shared.js cache-bust guncelle (tum HTML dosyalari)**

```bash
sed -i '' 's|shared\.js?v=[^"]*|shared.js?v=20260409c|g' index.html giris.html uye-ol.html demo-dashboard-ik.html hakkimizda.html iletisim.html yasal.html profil.html admin.html coach-studio.html ik.html sifre-yenile.html
```

- [ ] **Step 2: AI-COLLAB.md guncelle**

Asama 73 blogu ekle, aktif is durumunu guncelle.

- [ ] **Step 3: Full Playwright test suite calistir**

```bash
npx playwright test --reporter=dot
```

Beklenen: 1218+ test PASS (yeni auth-pages testleri dahil), 3 bilinen auth fail.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: cache-bust + AI-COLLAB update for Asama 73"
```

- [ ] **Step 5: Push**

```bash
git push origin main
```
