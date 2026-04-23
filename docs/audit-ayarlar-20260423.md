# Profil Ayarlar Derinlemesine Audit — 23 Nisan 2026

**Kapsam:** profil-settings.js (874 satir) + profil-ayarlar.js (153 satir) + css/panels/ayarlar.css (1047 satir) + profil.html ayarlar bolumu (1313-1730).

**4 eksen:** UX, A11y, Guvenlik/KVKK, Tutarlilik/Tasarim.

---

## OZET TABLOSU

| # | Bulgu | Eksen | Oncelik | Aksiyon |
|---|-------|-------|---------|---------|
| 1 | Banner JS-set raw hex (#FEF3C7/#92400E/#FEE2E2/#991B1B) — K049 hex purge ihlali | Tutarlilik | YUKSEK | **FIX** (class + token) |
| 2 | Buton metin re-set'leri orijinal HTML metiniyle uyumsuz (5 yerde) | UX | ORTA | **FIX** (capture+restore) |
| 3 | MFA disable verify phase'inde "Vazgec" butonu yok — state corrupt riski | UX/Guvenlik | ORTA | **FIX** (cancel button + state reset) |
| 4 | Sifre minimum 6 karakter — modern standart 8+ | Guvenlik | ORTA | **FIX** (8 karakter + UX hint) |
| 5 | account-status-banner role="status" eksik | A11y | DUSUK | **FIX** (HTML attr) |
| 6 | Inline style.cssText ile dinamik element olusturma (chip/dropdown) | Tutarlilik | DUSUK | RAPOR (buyuk refactor) |
| 7 | _htAlert / _htConfirm modal helpers inline style | Tutarlilik | DUSUK | RAPOR (buyuk refactor) |
| 8 | MFA QR kod alt text generic ("QR Kod") | A11y | DUSUK | RAPOR (minor copy) |
| 9 | MFA disable code retry frontend warning yok (Supabase rate-limit backend'de) | Guvenlik | ORTA | RAPOR (Supabase ayar) |
| 10 | Theme seg aria-checked HTML'de hardcoded — JS guncellemiyorsa screen reader yanlis okur | A11y | ORTA | YANLIS POZITIF — profil-ayarlar.js:114 sync ediyor |

---

## DETAY BULGULAR

### 1. Banner JS-set raw hex — K049 ihlali (FIX)

**Dosya:** profil-settings.js:551-552, 567-568.

K049 hex purge disiplini sadece CSS dosyalarini sifirladi, ama JS'den raw hex set etmek ayni problemi devam ettiriyor:
- Theme/dark mode'a uyumsuz (renkler hardcoded light)
- Token reuse yok
- CSP nonce policy katisirsa risk

**Fix:** banner.classList.add('ayr-banner--frozen') + .ayr-banner--frozen { background: var(--warning-soft); color: var(--warning); } CSS class. Dark mode token-driven flip.

### 2. Buton metin re-set'leri uyumsuz (FIX)

**Dosya:** profil-settings.js:237, 275, 313, 384, 694.

Ornek farkliliklar:
- HTML "Doğrulama gönder" → JS reset "Doğrulama Gönder" (case farkli)
- HTML "Tercihleri kaydet" → JS reset "Bildirim Tercihlerini Kaydet" (text farkli)
- HTML "Tercihleri kaydet" → JS reset "İletişim Tercihlerini Kaydet" (text farkli)
- HTML "Verilerimi indir" → JS reset "Verilerimi İndir (KVKK md.11)" (text farkli)
- HTML "Etkinleştir" → JS reset "İki Adımlı Doğrulamayı Etkinleştir" (text farkli)

**UX impact:** Kullanici bir kez butona basarsa, button metni degisiyor. Tekrar girise kadar yanlis label.

**Fix:** Buton click handler basinda `var origText = btn.textContent;` capture + finally `btn.textContent = origText;` restore.

### 3. MFA disable verify phase'inde Vazgec yok (FIX)

**Dosya:** profil-settings.js:751-809.

State machine: `mfaDisablePhase = 'confirm'` baslar, kullanici "Kapat" butonuna basinca confirm-modal aciliyor. Onaylarsa state `verify`'a geciyor. Verify phase'inde:
- Btn text "Kodu Doğrula ve Kapat" olur
- Kod input + 6 haneli verify
- Vazgec/Cancel butonu YOK

**Bug:** Kullanici verify phase'inde vazgecmek isterse, sayfayi yenilemek zorunda. State `verify`'da kalir, mesaj div'i temizlenmez.

**Fix:** Verify phase'inde inline "Vazgec" butonu ekle. Tiklayinca: state='confirm', btn text restore, mesaj clear.

### 4. Sifre minimum 6 → 8 karakter (FIX)

**Dosya:** profil-settings.js:111 + profil.html:1389 placeholder.

OWASP/NIST guidelines: 8+ karakter minimum. Supabase default 6 ama frontend tighter validation OK.

**Fix:** `< 8` + UX hint placeholder "En az 8 karakter".

### 5. Banner A11y role="status" (FIX)

**Dosya:** profil.html:1684.

A11y: Screen reader banner'in goruntulendigini duyurmaz. role="status" veya role="alert" (frozen/pending_deletion uyari icin alert daha uygun).

**Fix:** role="status" aria-live="polite".

---

## RAPOR (UYGULAMADIK — BUYUK REFACTOR)

### 6. Inline style.cssText dinamik element

**Dosya:** profil-settings.js:428, 434, 484, 487-488, 513-514, 558-560, 575-577.

Blocked company chip + dropdown items + banner JS-created button — hepsi inline style.cssText. Theme/dark mode'a uyumsuz.

**Onerilen refactor:** components.css'e .ht-blocked-chip, .ht-blocked-dropdown-item, .ayr-banner__action class'lari. JS sadece createElement + className. Sonraki pass.

### 7. _htAlert / _htConfirm modal inline style

**Dosya:** profil-settings.js:24-57.

_htAlert ve _htConfirm dynamic modal generate ediyor — div'lerde inline style="max-width:360px;..." vs.

**Onerilen refactor:** components.css'e .ht-modal--alert + .ht-modal--confirm variants. Bonus: ARIA dialog roles. Sonraki pass.

### 8. MFA QR kod alt text generic

**Dosya:** profil-settings.js:680.

Mevcut: alt="QR Kod" — generic.

**Onerilen:** "2FA dogrulama uygulaman ile bu QR kodu tara". Minor copy fix.

### 9. MFA disable code retry frontend warning yok

Supabase MFA challengeAndVerify brute-force koruma backend'de var (rate-limit). Ama frontend'de "X kere yanlis girildi, bekle" warning yok. UX iyilestirme.

**Onerilen:** 3 yanlis denemeden sonra UX uyari + 30sn lockout. Sonraki guvenlik pass.

### 10. Theme seg aria-checked — YANLIS POZITIF

**Dosya:** profil.html:1636-1647 + profil-ayarlar.js:114.

Ilk audit'te HTML'de aria-checked hardcoded oldugu icin JS sync siphesi vardi. profil-ayarlar.js:114 incelendi — `opt.setAttribute('aria-checked', match ? 'true' : 'false')` zaten her syncThemeSeg() cagrisinda guncelleniyor. **Sorun yok, screen reader dogru state okuyor.**

---

## SIRADAKI ADIMLAR

1. **Bu pass'te uygulanan 5 fix** (commit: K049 ayarlar audit fixes)
2. **Buyuk refactor (6, 7)** ayri pass — ayarlar inline style migration
3. **A11y deep dive (8, 10)** — tum profil sayfasi screen reader audit
4. **Guvenlik (9)** — Supabase MFA brute-force UX warning
