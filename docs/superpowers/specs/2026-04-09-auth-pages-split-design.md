# Auth Pages Split — uye-ol.html + giris.html Revizyon

> Tarih: 9 Nisan 2026
> Durum: Onaylandi
> Iliskili: Asama 73

## Ozet

Mevcut `giris.html` (1247 satir) icinde giris + kayit formlari bir arada. Bu spec ile:
- Yeni `uye-ol.html` sayfasi olusturulur (kayit)
- `giris.html` sadelestirilerek sadece giris kalir
- Kurumsal kayit = otomatik lead, giris sonrasi `demo-dashboard-ik.html`
- KVKK acik riza ayri checkbox ile alinir
- Header logo'dan `.ai` kaldirilir

## 1. uye-ol.html (YENI SAYFA)

### Genel Yapi
- Tab toggle: **Adaylar** | **Kurumsal** (index.html ile tutarli renkler)
- Background: Aday = vermillion, Kurumsal = navy
- URL param: `?tab=kurumsal` ile kurumsal tab acik gelir
- Responsive: 390px mobil oncelikli, max-width 420px kart

### Aday Kayit Formu

| Sira | Alan | input type | Zorunlu | Kayit Yeri |
|------|------|-----------|---------|------------|
| 1 | Ad Soyad | text | Evet | `user_metadata.full_name` |
| 2 | E-posta | email | Evet | auth.users.email |
| 3 | Telefon | tel | Evet | `user_metadata.phone` |
| 4 | Sifre | password | Evet | auth.users (hashed) |
| 5 | Sifre Tekrar | password | Evet | client-side match |
| 6 | Gizlilik + Kullanim checkbox | checkbox | Evet | `user_metadata.privacy_consent_at` |
| 7 | KVKK Acik Riza checkbox | checkbox | Evet | `user_metadata.kvkk_explicit_consent_at` |

- Sifre strength indicator (mevcut pattern)
- Sifre match kontrolu (realtime, tekrar alani blur'da)
- Telefon: GSM regex (`05[0-9]{2} [0-9]{3} [0-9]{2} [0-9]{2}`), auto-format
- Buton: "Kayit Ol" — tum alanlar + iki checkbox onaylaninca aktif
- OAuth: Google ile Uye Ol + LinkedIn ile Uye Ol (sifre alanlari altinda, divider ile ayrilmis)
- Alt link: "Zaten uye misin? Giris yap" → `giris.html`

**OAuth ile kayit:** OAuth'tan gelen kullanicida telefon yok — `user_metadata.phone` bos kalir, wizard'in ilk adiminda sorulur. `full_name` OAuth provider'dan gelir.

### Kurumsal Kayit Formu

| Sira | Alan | input type | Zorunlu | Kayit Yeri |
|------|------|-----------|---------|------------|
| 1 | Ad Soyad | text | Evet | `user_metadata.full_name` |
| 2 | Sirket Adi | text | Evet | `user_metadata.company_name` + `hr_profiles.company_display_name` |
| 3 | Sirket Web Sitesi | url | Hayir | `user_metadata.company_website` |
| 4 | Kurumsal E-posta | email | Evet | auth.users.email |
| 5 | Telefon | tel | Evet | `user_metadata.phone` |
| 6 | Sifre | password | Evet | auth.users (hashed) |
| 7 | Sifre Tekrar | password | Evet | client-side match |
| 8 | Gizlilik + Kullanim checkbox | checkbox | Evet | `user_metadata.privacy_consent_at` |
| 9 | KVKK Acik Riza checkbox | checkbox | Evet | `user_metadata.kvkk_explicit_consent_at` |

- Kisisel email uyarisi (mevcut pattern: gmail/hotmail/yahoo → sari banner)
- Domain match hint (mevcut pattern: web sitesi vs email domain karsilastirma)
- OAuth YOK — sirket adi + web sitesi + telefon bilgisi gerekli
- Alt link: "Zaten hesabiniz var mi? Giris yap" → `giris.html?tab=kurumsal`

### KVKK Checkbox Metinleri

**Checkbox 1 (her iki taraf):**
> Gizlilik Politikasi'ni ve Kullanim Sartlari'ni okudum, kabul ediyorum.

**Checkbox 2 (her iki taraf):**
> KVKK Aydinlatma Metni'ni okudum, kisisel verilerimin islenmesine acik riza veriyorum.

Her iki checkbox'ta linkler `yasal.html#gizlilik`, `yasal.html#kullanim`, `yasal.html#kvkk` olarak acilir (target="_blank").

## 2. giris.html Revizyonu

### Kaldirilacaklar
- `aday-register-box` (satirlar ~383-425)
- `ik-register-box` (satirlar ~464-518)
- Kayit ile ilgili JS fonksiyonlari (`registerAday`, `registerIK` ve iliskili validation)

### Degisecekler
- Tab label: "IK" → "Kurumsal"
- "Henuz uye degil misin?" → `uye-ol.html`
- "IK hesabi yok mu?" → `uye-ol.html?tab=kurumsal`
- Header logo: `hellotalent.ai` → `hellotalent`
- Title: "Giris Yap — hellotalent.ai" → "Giris Yap — hellotalent"

### Kalacaklar (degismez)
- Aday giris formu (email + sifre + Google/LinkedIn OAuth)
- Kurumsal giris formu (email + sifre)
- MFA/TOTP challenge
- Rate limiting
- Sifremi unuttum modal
- Post-auth redirect logic
- Dark mode

## 3. demo-dashboard-ik.html (YENI — Placeholder)

- Kurumsal kullanici giris yapinca → buraya yonlenir (`user_metadata.role === 'employer'`)
- Basit placeholder sayfa:
  - Header: hellotalent logo + "Demo" badge + cikis butonu
  - Hero: "Demo Paneline Hos Geldiniz" + aciklama metni
  - Statik/fake aday kartlari (3-5 adet, gercek veri degil)
  - CTA: "Gercek adaylara erismek icin iletisime gecin" → iletisim.html
- Dark mode destegi
- MVP2'de `ik.html`'e gecis yapilinca bu sayfa devre disi kalir

### Auth Routing Degisikligi
- Mevcut: employer login → `ik.html`
- Yeni: employer login → `demo-dashboard-ik.html` (gecici, MVP2'ye kadar)
- `giris.html` JS'de: `role === 'employer'` → `demo-dashboard-ik.html`

## 4. Wizard Entegrasyonu

- `user_metadata.full_name` kayitta alinir
- `profil-wizard.js` Step 1'de ad/soyad alanlarina otomatik doldurulur
- Alanlar `readonly` degil, `value` olarak set edilir — kullanici duzenleyebilir
- Telefon: `user_metadata.phone` varsa Step 1'de otomatik dolar

## 5. Admin Gorunumu

- Kurumsal kayit = otomatik lead (mevcut `hr_profiles` INSERT trigger'i devam eder)
- Admin panelde `hr_profiles` listesinde telefon kolonu eklenir
- `user_metadata.phone` admin RPC ile okunur (mevcut `get_employer_details` genisletilir)
- Ek tablo gerekmez

## 6. Header Logo Degisikligi

- `giris.html`: `.logo` text → `hellotalent` (`.ai` yok)
- `uye-ol.html`: ayni
- `demo-dashboard-ik.html`: ayni
- `shared.js` header logo: `hello<span>talent</span>` → `.ai` zaten yok, degisiklik gerekmez
- `index.html` LP logo: `hello<em>talent</em>` → `.ai` zaten yok

## 7. Guvenlik

- Sifre strength: mevcut policy (8+ karakter, buyuk/kucuk/rakam/ozel)
- Telefon validation: GSM regex server-side de kontrol (RPC veya trigger)
- KVKK consent timestamp'leri `user_metadata`'da saklanir (ISO 8601)
- Rate limit: kayit formunda da 5 deneme / 120s cooldown
- CSRF: JWT mimarisi, ek onlem gerekmez
- Input sanitization: XSS icin textContent (innerHTML kullanilmayacak)

## 8. Scope Disi

- Passkey/WebAuthn (ayri task: PK1-PK3, yapilacaklar.md'de)
- Email dogrulama (Supabase confirm_email mevcut default)
- SMS OTP (telefon dogrulama — gelecek sprint)
- Kurumsal domain verification (P3 tasarimi, henuz build edilmedi)

## 9. Degisecek/Olusacak Dosyalar

| Dosya | Islem |
|-------|-------|
| `uye-ol.html` | YENI — kayit sayfasi |
| `demo-dashboard-ik.html` | YENI — kurumsal demo placeholder |
| `giris.html` | REVIZE — kayit formlari cikar, label guncelle, logo |
| `profil-wizard.js` | REVIZE — full_name + phone auto-fill |
| `index.html` | REVIZE — CTA buton href'leri `uye-ol.html`'e |
| `shared.js` | REVIZE — login modal "Kayit ol" linkleri |
| `sitemap.xml` | REVIZE — uye-ol.html ekle |
| `vault/02-urun/yapilacaklar.md` | REVIZE — passkey task'lari eklendi |
| Test dosyalari | REVIZE/YENI — smoke + form validation testleri |
