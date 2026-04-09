# HelloTalent — Yapılacaklar (Implementation Backlog)

> Bu doküman vault'taki tüm analizlerden çıkan implementasyon görevlerini öncelik sırasıyla listeler.
> Her görev tamamlandığında ☑ ile işaretlenir ve tarih eklenir.

---

## MVP 1 — Aday Toplama + Lead Toplama

### Launch Blocker'lar (Canlıya çıkmadan ÖNCE)

| # | Görev | Detay | Durum |
|---|-------|-------|-------|
| LB1 | Analytics event tracking kurulumu | Supabase `analytics_events` tablosu + HT.trackEvent() + ht_track bridge | ☑ 4 Nisan 2026 |
| LB2 | Sayfa analytics kurulumu | Cloudflare Web Analytics (zaten aktif, DNS proxy üzerinden) | ☑ 4 Nisan 2026 |
| LB3 | KVKK avukat görüşmesi | Tuna'nın avukat arkadaşıyla toplantı | ☐ |
| LB4 | Aydınlatma metni güncelleme | gizlilik.html, avukat çıktısına göre | ☐ |
| LB5 | Açık rıza mekanizması | giris.html'e KVKK + 18 yaş checkbox, privacy_consent_at + age_confirmed user_metadata | ☑ 4 Nisan 2026 |
| LB6 | Güvenlik monitoring | security_audit_log + run_rls_audit() + weekly cron + get_security_dashboard() + 2FA (TOTP) | ☑ 6 Nisan 2026 |
| LB7 | DEI beyanı footer'a ekle | shared.js footer — "HelloTalent'ta herkes eşittir..." | ☑ 4 Nisan 2026 |

### Aday Profil İyileştirmeleri (Tier 1)

| # | Görev | Detay | Dosyalar | Durum |
|---|-------|-------|----------|-------|
| AP1 | Ekip büyüklüğü alanı ekle | `candidate_experiences.takim_buyuklugu` — zaten mevcuttu | — | ☑ Zaten vardı |
| AP2 | Tercih edilen segment yapısal hale getir | `candidate_work_preferences.segmentler` (text[]) — multi-select chip | — | ☑ Zaten vardı |
| AP3 | Vardiya esnekliği ekle | `candidate_work_preferences.shift_flexibility` — dropdown | migration + profil-ui.js | ☑ 4 Nisan 2026 |
| AP4 | İhbar süresi ekle | `candidate_work_preferences.notice_period` — dropdown | migration + profil-ui.js | ☑ 4 Nisan 2026 |
| AP5* | **İş tanımı alanı ekle (Apple benchmark)** | `candidate_experiences.description` (text, nullable) — textarea, profil puanı +2 | migration + profil-ui.js | ☑ 4 Nisan 2026 |
| AP6* | Seyahat isteği ekle (Apple benchmark) | `candidate_work_preferences.travel_willingness` — dropdown | migration + profil-ui.js | ☑ 4 Nisan 2026 |

### KVKK Revizyonları

| # | Görev | Detay | Dosyalar | Durum |
|---|-------|-------|----------|-------|
| KV1 | Cinsiyet alanını opsiyonel yap | Default "Belirtmek istemiyorum", KVKK hint | profil.html | ☑ 4 Nisan 2026 |
| KV2 | Doğum yılı alanını opsiyonel yap | Default "Belirtmek istemiyorum", KVKK hint | profil.html | ☑ 4 Nisan 2026 |
| KV3 | Askerlik + engel durumuna opsiyonel notu | Default "Belirtmek istemiyorum", KVKK hint | profil.html | ☑ 4 Nisan 2026 |
| KV4 | İşveren filtresinden yaş/cinsiyet çıkar | Zaten yoktu — doğrulandı | — | ☑ 4 Nisan 2026 |

### İşveren Lead Sistemi

| # | Görev | Detay | Dosyalar | Durum |
|---|-------|-------|----------|-------|
| LS1 | İşveren mail adresi aç | hellotalent.ai domain üzerinden | Domain config | ☐ |
| LS2 | Lead tablosu oluştur | `employer_leads` tablosu + status workflow + RLS | migration | ☑ 4 Nisan 2026 |
| LS3 | Lead form → Supabase kaydı | isveren.html → submit_employer_lead RPC | isveren.html | ☑ 4 Nisan 2026 |
| LS4 | Lead form → otomatik mail | email_outbox'a employer_lead_notification | RPC içinde | ☑ 4 Nisan 2026 |

### Admin Mini CRM

| # | Görev | Detay | Dosyalar | Durum |
|---|-------|-------|----------|-------|
| CR1 | Lead listesi sayfası | Admin panelde Leads sekmesi + tablo + filtre | admin.html + admin-leads.js | ☑ 4 Nisan 2026 |
| CR2 | Lead durum güncelleme | Dropdown: yeni/iletişime geçildi/demo/kayıt/red + kaydet | admin-leads.js | ☑ 4 Nisan 2026 |
| CR3 | Lead notları | Her lead'e inline not ekleme | admin-leads.js | ☑ 4 Nisan 2026 |
| CR4 | Segment dağılım dashboard | Aday segmentlerinin pie/bar chart görünümü | admin.html | ☐ |

### Passkey / Biometric Auth

| # | Görev | Detay | Dosyalar | Durum |
|---|-------|-------|----------|-------|
| PK1 | WebAuthn/Passkey entegrasyonu | Supabase WebAuthn API, credential registration + login flow | giris.html, uye-ol.html, profil-settings.js | ☐ |
| PK2 | Biometric prompt (Face ID / parmak izi) | navigator.credentials API, platform authenticator, mobil + tablet + desktop | giris.html | ☐ |
| PK3 | Passkey yönetim UI | Profil ayarlarında kayıtlı passkey listesi, ekle/sil | profil-settings.js | ☐ |

### Newsletter

| # | Görev | Detay | Dosyalar | Durum |
|---|-------|-------|----------|-------|
| NL1 | Newsletter subscriber tablosu | `newsletter_subscribers` — email, kaynak, tarih, aktif | migration | ☐ |
| NL2 | Kayıt sırasında newsletter opt-in | Checkbox: "Perakende kariyer haberlerini almak istiyorum" | giris.html + profil-wizard.js | ☐ |
| NL3 | Newsletter gönderim altyapısı | Resend bulk API entegrasyonu | Edge Function | ☐ |
| NL4 | Admin newsletter yönetimi | Oluştur, hedef kitle seç, gönder, rapor | admin.html + admin-newsletter.js | ☐ |

### İşveren Demo Ekranı

| # | Görev | Detay | Dosyalar | Durum |
|---|-------|-------|----------|-------|
| DE1 | ik-demo.js modülü oluştur | Fake aday kartları, filtre simülasyonu | ik-demo.js (yeni dosya) | ☐ |
| DE2 | Demo veri seti | 30-50 fake aday profili (çeşitli segment, deneyim, lokasyon) | ik-demo.js içinde veya JSON | ☐ |
| DE3 | "Bu bir demodur" uyarı sistemi | Belirgin banner + watermark | ik.html veya ik-demo.html | ☐ |
| DE4 | 14 gün süre limiti | Demo başlangıç tarihi + süre kontrolü | ik-demo.js + hr_profiles tablosu | ☐ |
| DE5 | Demo → ücretli dönüşüm CTA | "Gerçek adaylara erişmek için planınızı yükseltin" | ik-demo.js | ☐ |

---

## Agent Skills Audit — MVP 2 Hazırlığı (K029)

> 11 yeni engineering skill kurulumu sonrası hedefli kod denetimi. Full audit değil — 3 katmanlı, verimli.
> Karar: [[karar-defteri#K029]]

### Katman 1 — Security Sweep (Kritik — Blocker)

| # | Görev | Detay | Dosyalar | Durum |
|---|-------|-------|----------|-------|
| AU1 | innerHTML taraması | 1 CRITICAL (XSS full_name), 3 HIGH fix | profil-studio.js, profil-markalar.js, profil-settings.js, profil-destek.js | ☑ 8 Nisan 2026 |
| AU2 | PII logging kontrolü | 7 raw error → .message fix | admin-coach-content.js, profil-ui.js, ik.html | ☑ 8 Nisan 2026 |
| AU3 | RLS gap analizi | 30+ tablo RLS aktif, ~39 GRANT eksik (functional risk yok) | Supabase | ☑ 8 Nisan 2026 |
| AU4 | Input validation audit | Telefon GSM regex, email regex, sifre strength, maxlength | profil-wizard.js, profil-settings.js, giris.html, ik.html | ☑ 8 Nisan 2026 |
| AU5 | service_role exposure | Client-side PASS, dev dosyalarda key rotation onerisi | Tum HTML/JS | ☑ 8 Nisan 2026 |
| AU6 | Security headers | X-Frame-Options + CSP + Referrer-Policy 13 HTML, CORS restrict 4 Edge Function | Tum sayfalar + Edge Functions | ☑ 8 Nisan 2026 |

### Katman 2 — Code Simplification Pass (Yüksek — MVP 2 Öncesi)

| # | Görev | Detay | Dosyalar | Durum |
|---|-------|-------|----------|-------|
| AU7 | Büyük fonksiyon tespiti | Top 15 fonksiyon raporlandi (en buyuk: injectCSS 890 sat → css/studio.css'e extract edildi) | profil-studio.js | ☑ 8 Nisan 2026 |
| AU8 | Deep nesting düzeltme | 9 bulgu raporlandi (max seviye 9). Audit tamamlandi, fix'ler gelecek sprint'te | profil-settings.js, profil-destek.js | ☑ 8 Nisan 2026 (audit) |
| AU9 | Dead code temizliği | _loadStart, 14-var DOM snapshot, experiences[] silindi | profil-bootstrap.js, profil-ui.js | ☑ 8 Nisan 2026 |
| AU10 | Naming tutarlılığı | 10 bulgu raporlandi. Audit tamamlandi, rename'ler gelecek sprint'te | profil-ui.js, ik.html, profil-genel.js | ☑ 8 Nisan 2026 (audit) |
| AU11 | Duplicate logic tespiti | work_prefs 35-satir dedup (_applyWorkPrefs), admin builder 3x dedup (shared helpers) | profil-draft.js, profil-bootstrap.js, admin-*.js | ☑ 8 Nisan 2026 |

### Katman 3 — A11y + Performance (Orta — MVP 2 Sırasında İncremental)

| # | Görev | Detay | Dosyalar | Durum |
|---|-------|-------|----------|-------|
| AU12 | Lighthouse baseline tahmini | Font/image/script/CSS analizi tamamlandi | Tum sayfalar | ☑ 8 Nisan 2026 (audit) |
| AU13 | ARIA labels ekleme | 5 modal'a role=dialog+aria-modal, 3 close buton'a aria-label, sidebar tabindex+role | ik.html, giris.html, profil.html | ☑ 8 Nisan 2026 |
| AU14 | Keyboard navigation | Modal focus trap (profil/ik/giris), Escape handler, sidebar keyboard | profil-events.js, ik.html, giris.html | ☑ 8 Nisan 2026 |
| AU15 | Font loading optimizasyonu | fonts.gstatic.com preconnect 13 HTML, gereksiz weight'ler kaldirildi (Bricolage 200, DM Mono 300) | Tum HTML | ☑ 8 Nisan 2026 |
| AU16 | Image optimization | 9 SVG'ye width/height eklendi, 3 unused gate asset silindi (386KB), SVGO denendi (zaten optimize) | aday/isveren/hakkimizda.html, assets/gate/ | ☑ 8 Nisan 2026 |
| AU17 | Supabase query optimization | select('*') → explicit columns (ik.html), limit() 4 sorguya eklendi, N+1 yok | ik.html, admin-coach-content.js | ☑ 8 Nisan 2026 |
| AU18 | Core Web Vitals risk analizi | INP fix (400ms→50ms setTimeout), CLS fix (SVG dimensions). Tam Lighthouse olcumu gelecek sprint | shared.js, isveren.html | ☑ 8 Nisan 2026 (kismi) |

---

## MVP 2 — İşveren Aktivasyonu

### Aday Profil İyileştirmeleri (Tier 2)

| # | Görev | Detay | Durum |
|---|-------|-------|-------|
| AP5 | Mağaza açılışı deneyimi toggle | `candidate_experiences.store_opening` (boolean) | ☐ |
| AP6 | Çok mağaza yönetimi toggle | `candidate_experiences.multi_store` (boolean) | ☐ |
| AP7 | Retail skill etiketleri | `candidate_experiences.retail_skills` (text[]) — 12 opsiyon | ☐ |
| AP8 | Ehliyet alanı | `candidates.has_driving_license` (boolean) | ☐ |
| AP9 | İş arama sebebi | `candidate_work_preferences.job_search_reason` (text) | ☐ |

### İşveren Dashboard (ik.html)

| # | Görev | Detay | Durum |
|---|-------|-------|-------|
| IK1 | Pozisyon açma wizard | Rol, marka, lokasyon, aday kriterleri, ek tercihler | ☐ |
| IK2 | Aday önerisi sistemi | Pozisyon filtrelerine göre search_employer_candidates çağrısı | ☐ |
| IK3 | Freshness kontrolü | Daha önce gösterilen adayı tekrar göstermeme | ☐ |
| IK4 | Aday görüntüleme limiti | Aylık/haftalık kota + kota aşım CTA | ☐ |
| IK5 | Shortlist yönetimi | Aday shortlist'e ekleme/çıkarma | ☐ |
| IK6 | Detaylı filtre paneli | Ekip, retail skills, dil, ehliyet, vardiya, kalite sinyalleri | ☐ |
| IK7 | Kampanya yayınlama | Mevcut wizard'ı end-to-end çalışır hale getir | ☐ |

### Admin

| # | Görev | Detay | Durum |
|---|-------|-------|-------|
| AD1 | İşveren onay kuyruğu | Kayıt → kuyruk → incele → onayla/reddet | ☐ |
| AD2 | Provizyon akışı | Ödeme → provizyon → admin onay → kes/iptal | ☐ |
| AD3 | İşveren aktivite dashboard | Son giriş, pozisyon sayısı, mesaj sayısı | ☐ |
| AD4 | Supply-demand gap analizi | Çok aranan ama bulunamayan roller/segmentler | ☐ |

---

## Yapılacaklar Güncelleme Kuralı

### Supabase Advisor Fix'leri (Acil Değil)

| # | Görev | Detay | Öncelik |
|---|-------|-------|---------|
| SA1 | search_path fix (8 fonksiyon) | `ALTER FUNCTION ... SET search_path = public` — Security Advisor warning | ☑ 6 Nisan 2026 |
| SA2 | candidate_view_stats RLS policy ekle | Tablo mevcut değil — geçersiz görev | ☑ N/A (tablo yok) |
| SA3 | FK index'ler (7 kolon) | campaign_clicks/redemptions/reviews, inbox_messages, email_jobs | ☑ 6 Nisan 2026 |
| SA4 | pg_cron campaign interval azalt | activate/end: */5 → saatlik, archive: daily (degismedi) | ☑ 6 Nisan 2026 |
| SA5 | bio'yu search RPC'ye ekle | candidates.bio → search_employer_candidates output | ☑ 6 Nisan 2026 |

---

## Yapılacaklar Güncelleme Kuralı

- Her görev tamamlandığında ☑ + tarih eklenir
- Yeni görevler keşfedildikçe ilgili MVP bölümüne eklenir
- Öncelik değişiklikleri karar defterine (K###) kayıt edilir
- Bu dosya her sprint/session başında kontrol edilir

---

*Son güncelleme: 8 Nisan 2026*
*İlişkili: [[mvp-roadmap]], [[veri-modeli-analiz]], [[feature-map]], [[karar-defteri]]*
