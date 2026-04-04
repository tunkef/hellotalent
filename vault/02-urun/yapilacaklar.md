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
| LB6 | Güvenlik monitoring | Supabase alerting + haftalık RLS audit | ☐ |
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
| SA1 | search_path fix (32 fonksiyon) | `ALTER FUNCTION ... SET search_path = public` — Security Advisor warning | Düşük |
| SA2 | candidate_view_stats RLS policy ekle | RLS enabled ama policy yok — Security Advisor info | Düşük |
| SA3 | FK index'ler (99 tablo) | Unindexed foreign keys — Performance Advisor info | 1000+ aday milestone |
| SA4 | pg_cron campaign interval azalt | end_expired + activate_due her dakika → her saat | Düşük |
| SA5 | bio'yu search RPC'ye ekle | İşverenler aday bio'sunu göremez — audit finding | Orta |

---

## Yapılacaklar Güncelleme Kuralı

- Her görev tamamlandığında ☑ + tarih eklenir
- Yeni görevler keşfedildikçe ilgili MVP bölümüne eklenir
- Öncelik değişiklikleri karar defterine (K###) kayıt edilir
- Bu dosya her sprint/session başında kontrol edilir

---

*Son güncelleme: 4 Nisan 2026*
*İlişkili: [[mvp-roadmap]], [[veri-modeli-analiz]], [[feature-map]], [[karar-defteri]]*
