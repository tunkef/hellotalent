# P3 Kapsamlı Test & Review Prompt

> Bu prompt'u Cursor'a (veya başka bir AI aracına) verin.
> Amaç: Bugün yapılan P3 değişikliklerini test etmek, bug bulmak, code quality sorunlarını raporlamak.

---

## Görev

Sen bir **QA mühendisi + code reviewer** olarak çalışıyorsun. hellotalent.ai projesinin bugün yapılan P3 Sprint değişikliklerini test et ve raporla.

## Proje Hakkında
- **Tech:** Vanilla HTML/CSS/JS + Supabase (PostgreSQL + Auth + RLS)
- **Hosting:** GitHub Pages (hellotalent.ai)
- **Kurallar:** CLAUDE.md dosyasını oku — `var` kullanımı zorunlu (const/let yasak), `console.log` yasak, Türkçe UI, innerHTML ile user data yasak

## Bugün Yapılan Değişiklikler (test edilecek)

### 1. Employer-Candidate Messaging (P3-D)
**Dosyalar:** `ik.html`, `profil-inbox.js`, `docs/migrations/031_employer_messages.sql`
- İşveren aday drawer'ında "✉️ Mesaj Gönder" butonu
- Mesaj compose modal (template seçimi, pozisyon seçimi, konu, mesaj)
- `send_employer_message` RPC çağrısı
- Template placeholder'ları: `{{sirket}}` ve `{{pozisyon}}`
- Candidate inbox: `profil-inbox.js` artık `employer_messages` tablosunu sorguluyor
- `mark_message_read` RPC ile okundu işaretleme
- Filtreler: Tümü, İşveren Mesajları, Okunmamış

**Test kontrolleri:**
- [ ] `openMesajModal()` fonksiyonu var mı ve doğru çalışıyor mu?
- [ ] Template seçildiğinde `{{sirket}}` ve `{{pozisyon}}` yer tutucuları değişiyor mu?
- [ ] `sendMesaj()` fonksiyonunda hata yönetimi var mı?
- [ ] `profil-inbox.js` doğru tabloyu sorguluyor mu? (`employer_messages`, `inbox_messages` DEĞİL)
- [ ] Modal `.show` class pattern ile açılıp kapanıyor mu? (display:none/flex DEĞİL)
- [ ] innerHTML ile user data kullanılmış mı? (XSS riski)

### 2. Visibility Enforcement (P3-D+)
**Dosyalar:** `ik.html`, `docs/migrations/032_visibility_enforcement.sql`
- `send_employer_message` 3 yeni kontrol: profile_completed, blocked_companies, hide_from_current_employer
- `check_candidate_visible_to_employer()` helper fonksiyonu
- `loadFollowers()` artık blocked + hidden filtresi yapıyor
- `loadLiveCandidates()` hide_from_current_employer artık company_id bazlı (string karşılaştırma DEĞİL)

**Test kontrolleri:**
- [ ] `loadFollowers()` fonksiyonunda `candidate_blocked_companies` sorgusu var mı?
- [ ] `loadFollowers()` fonksiyonunda `hide_from_current_employer` kontrolü var mı?
- [ ] `loadLiveCandidates()` hide kontrolü `hrProfile.company_id` kullanıyor mu? (`hrProfile.sirket` DEĞİL)
- [ ] Brands tablosundan name'ler çekilip karşılaştırılıyor mu?
- [ ] Companies tablosundan company_name çekilip karşılaştırılıyor mu?
- [ ] Hata durumunda graceful fallback var mı? (try/catch)

### 3. Premium Subscription System (P3-E)
**Dosyalar:** `ik.html`, `admin-employers.js`, `docs/migrations/033_subscriptions.sql`
- `subscriptions` tablosu: pro/enterprise planlar (demo = plan yok)
- `employer_daily_usage` tablosu: günlük kullanım takibi
- `get_employer_plan()`, `is_premium_employer()`, `check_employer_usage_limit()`, `increment_employer_usage()` RPC'leri
- `_employerPlan` global değişken, login'de yükleniyor
- Demo kullanıcı: günde 5 aday profili, mesaj gönderemez
- Sidebar'da plan göstergesi (Ücretsiz Plan / ⭐ Pro Plan / 🏢 Enterprise)

**Test kontrolleri:**
- [ ] `_employerPlan` değişkeni `var` ile tanımlanmış mı? (const/let DEĞİL)
- [ ] `get_employer_plan` RPC çağrısı `.catch()` ile korunuyor mu?
- [ ] `openDrawer()` async mi? (race condition fix)
- [ ] Demo kullanıcıda limit aşıldığında upgrade prompt gösteriliyor mu?
- [ ] `openMesajModal()` demo kullanıcıda modal açmadan engelliyor mu?
- [ ] `sendMesaj()` demo kullanıcıda ek kontrol yapıyor mu?
- [ ] admin-employers.js `queries[9]` null-safe mi?
- [ ] Subscriptions plan CHECK'te 'demo' YOK mu? (sadece 'pro', 'enterprise')
- [ ] `check_employer_usage_limit` ve `increment_employer_usage` fonksiyonlarında `is_employer()` guard var mı?

### 4. SMS Phone Verification (P3-E)
**Dosyalar:** `docs/migrations/034_sms_phone_verification.sql`
- `phone_verifications` tablosu: OTP kodları
- `candidates.phone_verified` + `phone_verified_at` kolonları
- `request_phone_otp()`: 6 haneli OTP üretir, günde max 5 istek
- `verify_phone_otp()`: 3 deneme hakkı, 5 dk timeout

**Test kontrolleri:**
- [ ] OTP kodu 6 haneli mi? (`LPAD(FLOOR(RANDOM() * 1000000)::text, 6, '0')`)
- [ ] Rate limit: günde 5 istek kontrolü var mı?
- [ ] Expire: pending OTP'ler yeni istekte expire ediliyor mu?
- [ ] Max attempts: 3 deneme kontrolü doğru mu? (off-by-one yok mu?)
- [ ] Başarılı doğrulamada `candidates.phone_verified = true` oluyor mu?
- [ ] Tüm hata mesajları Türkçe mi?

### 5. Company Locations CRUD (P3-C)
**Dosyalar:** `ik.html`
- Şirket profil panelinde lokasyon kartı
- Şehir/tip/adres seçimi + ekleme/silme
- `loadLokasyonlar()`, `renderLokasyonlar()`, `addLokasyon()`, `removeLokasyon()`

**Test kontrolleri:**
- [ ] createElement + textContent kullanılmış mı? (innerHTML DEĞİL)
- [ ] `.maybeSingle()` kullanılmış mı nerede gerekli?
- [ ] Hata durumunda Türkçe mesaj gösteriliyor mu?

### 6. Positions Column Name
**Dosyalar:** `ik.html`
- Pozisyon sorgularında `.eq('durum', 'active')` kullanılmalı (`.eq('status', 'active')` DEĞİL)

**Test kontrolleri:**
- [ ] ik.html'de hiç `.eq('status'` geçiyor mu? (positions tablosu için hepsi `durum` olmalı)
- [ ] `employer_messages` tablosu sorguları `.eq('status'` kullanabilir (o tabloda kolon adı `status`)

---

## Genel Code Quality Kontrolleri

Tüm değişen dosyalarda şunları tara:

### JavaScript (ik.html, profil-inbox.js, admin-employers.js)
- [ ] `const` veya `let` kullanımı var mı? → **HATA** (sadece `var` kullanılmalı)
- [ ] `console.log` var mı? → **HATA** (sadece `console.error`/`console.warn` kullanılmalı)
- [ ] `innerHTML` ile user/DB data set ediliyor mu? → **XSS riski**
- [ ] Async fonksiyonlarda try/catch var mı?
- [ ] `.single()` kullanılmış mı? → **HATA** (`.maybeSingle()` kullanılmalı)
- [ ] Türkçe olmayan user-facing text var mı?
- [ ] "röportaj" kelimesi geçiyor mu? → **HATA** ("mülakat" olmalı)

### SQL (032, 033, 034 migration'ları)
- [ ] `GENERATED ALWAYS` var mı? → **HATA** (upsert'i engeller)
- [ ] `SECURITY DEFINER` fonksiyonlarda `SET search_path = public` var mı?
- [ ] RLS enable edilmiş mi? (tüm yeni tablolarda)
- [ ] Admin policy var mı? (`is_admin()`)
- [ ] `GRANT EXECUTE` var mı? (authenticated role'e)

---

## Rapor Formatı

Lütfen şu formatta raporla:

```
## 🔴 Kritik Buglar
(Uygulamayı bozan veya güvenlik açığı olan sorunlar)

## 🟡 Önemli Sorunlar
(Düzeltilmesi gereken ama acil olmayan)

## 🟢 İyileştirme Önerileri
(Nice-to-have, gelecekte yapılabilir)

## ✅ Geçen Kontroller
(Doğru çalışan ve standartlara uygun olan şeyler)
```

Her bulgu için:
1. **Dosya ve satır numarası**
2. **Sorunun açıklaması**
3. **Önerilen düzeltme** (kod snippet ile)

---

## Önemli Dosya Yolları

```
/Users/peopleintk/Downloads/Hellotalent/ik.html
/Users/peopleintk/Downloads/Hellotalent/profil-inbox.js
/Users/peopleintk/Downloads/Hellotalent/admin-employers.js
/Users/peopleintk/Downloads/Hellotalent/docs/migrations/031_employer_messages.sql
/Users/peopleintk/Downloads/Hellotalent/docs/migrations/032_visibility_enforcement.sql
/Users/peopleintk/Downloads/Hellotalent/docs/migrations/033_subscriptions.sql
/Users/peopleintk/Downloads/Hellotalent/docs/migrations/034_sms_phone_verification.sql
/Users/peopleintk/Downloads/Hellotalent/CLAUDE.md
/Users/peopleintk/Downloads/Hellotalent/.claude/rules/code-quality.md
/Users/peopleintk/Downloads/Hellotalent/playwright.config.js
/Users/peopleintk/Downloads/Hellotalent/tests/hellotalent.smoke.spec.js
```
