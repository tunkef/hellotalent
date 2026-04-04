# HelloTalent — Sistem Mimarisi (Ürün Perspektifi)

## Genel Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Static)                      │
│                    GitHub Pages + Cloudflare                 │
│                                                             │
│  index.html ── aday.html ── isveren.html ── giris.html     │
│       │                                        │            │
│       └──────────────┬─────────────────────────┘            │
│                      │                                      │
│              ┌───────▼───────┐                              │
│              │   AUTH GUARD   │                              │
│              └───┬───────┬───┘                              │
│                  │       │                                   │
│         ┌────────▼──┐  ┌─▼────────┐                        │
│         │profil.html│  │ ik.html  │                        │
│         │(26 JS mod)│  │(İK panel)│                        │
│         └────────┬──┘  └─┬────────┘                        │
│                  │       │                                   │
│         ┌────────▼──┐  ┌─▼────────┐                        │
│         │admin.html │  │coach-    │                        │
│         │(yönetim)  │  │studio    │                        │
│         └───────────┘  └──────────┘                        │
└────────────────────────┬────────────────────────────────────┘
                         │ Supabase JS Client
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      SUPABASE                               │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │PostgreSQL│  │   Auth   │  │ Storage  │  │Edge Fns  │   │
│  │ 45+ tablo│  │Google/   │  │ CV/Avatar│  │AI/Email  │   │
│  │ RLS      │  │Email     │  │ Campaign │  │ 3 fn     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                             │
│  ┌──────────┐  ┌──────────────────────────────────────┐    │
│  │ pg_cron  │  │           RPC Functions               │    │
│  │Email send│  │ save_candidate_profile                │    │
│  │AI process│  │ search_employer_candidates             │    │
│  │Auto-close│  │ send_employer_message                  │    │
│  └──────────┘  │ request_journal_feedback               │    │
│                │ create_support_ticket                   │    │
│                └──────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   External Services  │
              ├──────────────────────┤
              │ Resend (Email)       │
              │ OpenAI (AI Feedback) │
              │ Anthropic (CV Opt.)  │
              │ iyzico (Ödeme - TBD) │
              └─────────────────────┘
```

---

## Veri Akışları

### 1. Aday Kayıt → Profil Tamamlama
```
giris.html → Supabase Auth → auth.users satırı oluşur
  → profil.html → profil-wizard.js → save_candidate_profile RPC
  → candidates + tüm child tablolar atomik kayıt
  → profile_completion_pct trigger hesaplar
  → email_outbox → candidate_welcome email
```

### 2. İşveren Pozisyon → Aday Eşleştirme
```
ik.html → Pozisyon wizard → positions tablosu INSERT
  → search_employer_candidates RPC çağrısı
  → 12 sinyalli skorlama (server-side)
  → Sonuçlar: aday kartları (skor, profil özeti)
  → İşveren aksiyonu: görüntüle / shortlist / mesaj
  → profile_views + employer_searches log
  → employer_daily_usage güncelle (kota kontrolü)
```

### 3. Mesajlaşma
```
İşveren mesaj atar → send_employer_message RPC
  → employer_messages INSERT
  → email_outbox INSERT (aday bildirim)
  → pg_cron → Resend API → aday email alır
  → Aday reply → candidate_message_replies
  → Realtime subscription ile anlık görüntüleme
```

### 4. AI Pipeline
```
Aday "AI ile Değerlendir" tıklar
  → request_journal_feedback RPC → candidate_journal_feedback (pending)
  → pg_cron trigger → journal-feedback Edge Function
  → OpenAI gpt-4.1-mini → structured JSON response
  → complete_journal_feedback RPC → status: completed
  → Client poll → UI'da sonuç göster
```

### 5. Lead → CRM (MVP 1 — İnşa edilecek)
```
isveren.html lead formu → Supabase INSERT (employer_leads tablosu)
  → email_outbox → HelloTalent mail adresine bildirim
  → Admin panel → Mini CRM'de lead olarak görünür
  → Kişi 1 telefon açar → lead durumu güncellenir
```

### 6. Newsletter (MVP 1 — İnşa edilecek)
```
Aday kayıt olduğunda → newsletter_subscribers tablosu
  → Admin panel → newsletter oluştur + hedef kitle seç
  → Resend bulk API → toplu gönderim
  → Tracking: açılma, tıklama (opsiyonel)
```

---

## Eşleştirme Motoru — Detay

### 12 Sinyalli Skorlama (0-100)

```
match_score = (
    hard_filter_fit    × 0.30   -- lokasyon, çalışma tipi
  + retail_fit         × 0.25   -- segment, rol, deneyim yılı
  + intent_fit         × 0.20   -- kariyer yönü, aktiflik, müsaitlik
  + profile_quality    × 0.15   -- tamamlama %, CV, güncellik
  + behavior_signal    × 0.10   -- marka takip, aktif arama
)
```

### Soft Signal Katmanı (KVKK Uyumlu)

```
Yaş tercihi (soft):
  Aday yaşı tercih aralığında → +0.05 bonus
  Aday yaşı dışında → 0 (ceza YOK, sadece bonus yok)

Cinsiyet tercihi (soft):
  Eşleşme → +0.03 bonus
  Eşleşmeme → 0 (ceza YOK)
```

> **Kritik:** Soft signal hiçbir zaman adayı filtrelemez veya gizlemez. Sadece sıralama'da minimal bonus verir.

### Premium Boost
```
"Beni Öne Çıkar" aktif → match_score × 1.15 (15% boost)
  → Sonuç: Premium aday benzer skorlu free adayın önüne geçer
  → Ama düşük match_score'lu premium, yüksek match_score'lu free'yi geçemez
```

---

## Güvenlik Katmanları

| Katman | Mekanizma |
|--------|-----------|
| Auth | Supabase Auth (Google OAuth + email/password) |
| Authorization | RLS (Row Level Security) her tabloda |
| Data isolation | get_my_candidate_id() + is_employer() helpers |
| Privacy | hide_from_current_employer, blocked_companies |
| Admin gate | İşveren onay akışı |
| API security | Service role sadece Edge Functions'ta |
| Input validation | Frontend + RLS double-check |

---

## Ölçeklendirme Notları

| Bileşen | Mevcut Kapasite | Darboğaz Noktası | Çözüm |
|---------|----------------|-------------------|--------|
| Frontend | GitHub Pages + Cloudflare | ~100K concurrent | CDN zaten var |
| Database | Supabase Free/Pro | ~500K rows | Supabase Pro upgrade |
| Storage | Supabase Storage | 1GB free | Pro plan |
| Auth | Supabase Auth | 50K MAU (free) | Pro plan |
| Email | Resend | 3000/ay (free) | Resend Pro |
| AI | OpenAI/Anthropic API | Rate limits | Batch processing |

**Mevcut mimari 10.000+ aday ve 500+ işveren için yeterli.** Ölçek darboğazı yakın vadede beklenmez.

---

*İlişkili: [[feature-map]], [[mvp-roadmap]]*
