# Hellotalent — Data Strategy Reference

Bu doküman her tablodaki verinin NEDEN toplandığını, NEREDE kullanılacağını ve NASIL eşleşeceğini tanımlar. Yeni tablo/kolon eklerken bu dosyayı referans al.

---

## 1. Veri Toplama Felsefesi

**Her veri noktasının 3 hedefi olmalı:**
1. **Candidate value** — Adayın profilini güçlendirir
2. **Employer value** — İşverenin doğru adayı bulmasını sağlar
3. **Platform intelligence** — Matching motorunu ve ürün kararlarını besler

Gereksiz veri toplama. Kullanılmayan her alan = aday kaybı (form friction).

---

## 2. Candidate Data Model — Amaç Haritası

### candidates (ana tablo)

| Kolon | Neden Toplanıyor | Nerede Kullanılıyor |
|-------|-------------------|---------------------|
| full_name | Kimlik, iletişim | Profil kartı, employer liste, admin |
| email | Auth, iletişim | Login, bildirim, employer iletişim |
| telefon | Doğrudan iletişim | Employer shortlist sonrası görünür |
| is_active | Aday görünürlük kontrolü | Employer listesinde filtreleme |
| hide_from_current_employer | Gizlilik | Employer query'den exclusion |
| avatar_url | Profesyonel görünüm | Profil kartı, employer liste |
| cv_url, cv_filename | Detaylı bilgi | Employer deep review, CV skoru |
| cv_uploaded_at | Güncellik sinyali | Quality score hesaplama |
| updated_at | Aktiflik sinyali | Employer sıralama, admin stale profil tespiti |

### candidate_experiences

| Kolon | Neden | Kullanım |
|-------|-------|----------|
| company_name | Geçmiş deneyim | Employer filter: segment, marka tanıma |
| position_title | Rol seviyesi | Employer filter: mevcut/son rol |
| devam_ediyor | Mevcut işveren tespiti | hide_from_current_employer logic |
| start_date, end_date | Deneyim yılı hesaplama | Employer filter: deneyim süresi |
| description | Detay | CV skoru, AI matching keyword extraction |

**Türetilen veriler (calculated):**
- `toplam_deneyim_yili` → start/end date'lerden hesaplanır
- `mevcut_isveren` → devam_ediyor = true olan kayıt
- `segment_deneyimi` → company_name + brand tablosu cross-reference

### candidate_education

| Kolon | Neden | Kullanım |
|-------|-------|----------|
| school_name | Eğitim seviyesi | Quality score, bazı employer tercihleri |
| degree | Derece | Filter (opsiyonel) |
| field_of_study | Alan | Retail relevance score |

### candidate_target_roles

| Kolon | Neden | Kullanım |
|-------|-------|----------|
| role_name | Hedef pozisyon | **PRIMARY MATCH FIELD** — employer arama |
| role_family | Rol ailesi | Employer filter: hedef rol ailesi |

### candidate_work_preferences

| Kolon | Neden | Kullanım |
|-------|-------|----------|
| work_type | Tam zamanlı/yarı/freelance | Employer filter: çalışma tipi |
| salary_expectation_min/max | Maaş beklentisi | Employer filter: maaş bandı |
| start_availability | Ne zaman başlayabilir | Employer filter: başlama süresi |
| relocation_open | Taşınmaya açık mı | Employer filter: lokasyon esnekliği |
| career_direction | Yukarı/yatay/segment değişim | Employer filter: kariyer yönü |

### candidate_languages

| Kolon | Neden | Kullanım |
|-------|-------|----------|
| language | Dil adı | Employer filter (özellikle luxury/international) |
| level | Seviye | Filter threshold |

### candidate_location_preferences

| Kolon | Neden | Kullanım |
|-------|-------|----------|
| city | Tercih edilen şehir | **PRIMARY MATCH FIELD** — lokasyon eşleşme |
| district | İlçe | Granüler lokasyon filtresi |

### candidate_brand_interests

| Kolon | Neden | Kullanım |
|-------|-------|----------|
| brand_id | İlgilendiği marka | Employer: "bizi isteyen adaylar" filtresi |

### candidate_company_follows

| Kolon | Neden | Kullanım |
|-------|-------|----------|
| company_id | Takip ettiği şirket | Intent signal — employer'a "bu aday sizi takip ediyor" |

---

## 3. Employer Filter Mimarisi

### Minimum Filter Panel (İlk Ekran)

```
┌─────────────────────────────────────┐
│  Lokasyon          [İstanbul    ▼]  │
│  Rol               [Store Mgr  ▼]  │
│  Segment           [Luxury     ▼]  │
│  Deneyim           [3-5 yıl   ▼]  │
│  Çalışma Tipi      [Tam zamanlı▼]  │
│  Başlama Zamanı    [Hemen      ▼]  │
│                                     │
│  [🔍 Ara]  [⚙ Detaylı Filtre]     │
└─────────────────────────────────────┘
```

**Veri kaynakları:**
- Lokasyon → candidate_location_preferences.city
- Rol → candidate_target_roles.role_family
- Segment → candidate_experiences × brands.segment (türetilmiş)
- Deneyim → candidate_experiences'dan hesaplanmış yıl
- Çalışma tipi → candidate_work_preferences.work_type
- Başlama → candidate_work_preferences.start_availability

### Advanced Filters (Detaylı)

| Filter | Veri Kaynağı | Notlar |
|--------|-------------|--------|
| Ekip yönetimi | candidate_experiences.managed_team (YENİ) | Boolean + team_size |
| Maaş bandı | candidate_work_preferences.salary_min/max | Range slider |
| Dil | candidate_languages | Multi-select |
| Kariyer yönelimi | candidate_work_preferences.career_direction | Yukarı/yatay/segment |
| İlgilendiği markalar | candidate_brand_interests | "Bizi isteyen adaylar" |
| Profil skoru | Hesaplanmış | Tamamlama % + CV + güncellik |
| CV var/yok | candidates.cv_url IS NOT NULL | Binary |
| Mevcut işveren gizliliği | candidates.hide_from_current_employer | Employer'ın kendisi hariç |
| Relocation açıklığı | candidate_work_preferences.relocation_open | Boolean |
| Premium aday | candidates.is_featured (GELECEK) | Boost sıralama |
| Mağaza açılışı deneyimi | candidate_experiences.store_opening (YENİ) | Boolean |
| Omni-channel/VM/CRM | candidate_experiences.special_skills (YENİ) | Tag array |
| Çok lokasyonlu deneyim | candidate_experiences.multi_location (YENİ) | Boolean |

### Segment Taxonomy

```
luxury        → Louis Vuitton, Chanel, Vakko, Beymen
premium       → Massimo Dutti, COS, Lacoste, Tommy Hilfiger
mass_market   → Zara, H&M, LC Waikiki, Mango, Bershka
sportswear    → Nike, Adidas, Puma, Under Armour
cosmetics     → Sephora, MAC, Watsons, Gratis
electronics   → Apple Retail, Samsung, MediaMarkt
f_and_b       → Starbucks, Kahve Dünyası
```

Segment bilgisi `brands.segment` kolonundan gelir, candidate'ın çalıştığı şirketler üzerinden türetilir.

---

## 4. Matching Engine — Hybrid Model

### Felsefe: "AI suggests, human confirms"

```
Layer 1: Automatic Pre-Ranking (Sistem)
    ↓
Layer 2: Manual Recruiter Refinement (İnsan)
    ↓
Layer 3: Feedback Learning Loop (Öğrenme)
```

### Layer 1 — Automatic Pre-Ranking

Employer filtre girdiğinde sistem 25/50/100 aday önerir. Sıralama skoru:

```
match_score = (
    hard_filter_fit    × 0.30   -- lokasyon, çalışma tipi, maaş
  + retail_fit         × 0.25   -- segment, rol, deneyim yılı
  + intent_fit         × 0.20   -- kariyer yönü, relocation, aktiflik
  + profile_quality    × 0.15   -- tamamlama %, CV, güncellik
  + behavior_signal    × 0.10   -- markayı takip ediyor mu, aktif arama modu
)
```

**Hard filter fit:** Binary pass/fail + closeness scoring
- Exact city match = 1.0, same region = 0.7, relocation open = 0.5
- Exact role match = 1.0, same family = 0.8, adjacent = 0.5

**Retail fit:** Segment alignment scoring
- Same segment experience = 1.0
- Adjacent segment = 0.6 (luxury → premium ok, mass → luxury harder)
- Deneyim yılı: sweet spot range matching

**Intent fit:** How ready is the candidate
- Aktif arama modu ON = 1.0, recent update = 0.7, stale = 0.3
- Career direction match = 1.0, open = 0.7, mismatch = 0.2
- "Bu markayı takip ediyor" = bonus 0.2

**Profile quality:** Data completeness signal
- Profil % tamamlama / 100
- CV uploaded = +0.2
- Doğrulanmış telefon = +0.1
- Son 30 gün güncelleme = +0.1

**Behavior signal:** Platform engagement
- candidate_company_follows: employer's brand = +0.3
- candidate_brand_interests: employer's brand = +0.2
- Last login < 7 days = +0.1

### Layer 2 — Manual Recruiter Refinement

Employer actions:
- **Pin** — adayı listenin üstüne sabitle
- **Exclude** — bu adayı bir daha gösterme
- **Shortlist** — görüşme havuzuna al
- **Note** — özel not düş
- **"Bu tip daha çok"** — similar candidates boost
- **"Bu tipi azalt"** — negative signal

### Layer 3 — Feedback Learning Loop

Tracked events (izlenen aksiyonlar):

| Event | Signal | Kullanım |
|-------|--------|----------|
| profile_viewed | Weak interest | Genel ranking boost |
| profile_expanded | Medium interest | Matching refinement |
| shortlisted | Strong interest | Pattern learning |
| interview_requested | Conversion | Matching model training |
| rejected | Negative signal | False positive detection |
| rejection_reason | Why negative | Granüler model improvement |

**MVP'de Layer 3 sadece tracking olacak** — gerçek ML model eğitimi Phase 3+.

---

## 5. Admin Panel — Control Tower

### A. Funnel Health (Ana Sayfa)

| Metrik | Query | Aksiyon Eşiği |
|--------|-------|---------------|
| Toplam aday | COUNT(candidates) | — |
| Aktif aday | COUNT WHERE is_active = true | < %60 ise sorun |
| Profil tamamlama oranı | AVG(profil_%) | < %50 ise onboarding fix |
| CV yükleyen oran | COUNT WHERE cv_url IS NOT NULL / total | < %30 ise prompt ekle |
| Son 7 gün kayıt | COUNT WHERE created_at > now() - 7d | Trend izle |
| Son 30 gün kayıt | COUNT WHERE created_at > now() - 30d | Trend izle |
| Employer search sayısı | COUNT(employer_searches) | 0 ise demand yok |
| Görüntülenen aday | COUNT(profile_views) | Supply-demand gap |
| Shortlist'e düşen | COUNT(shortlists) | Conversion signal |

### B. Candidate Quality Dashboard

- Rol ailesi dağılımı (pie/bar chart)
- Şehir dağılımı (map veya bar)
- Segment dağılımı
- Deneyim seviyesi histogram
- Incomplete profil oranı (aksiyon gerekli)
- CV'siz aday oranı
- Top talent clusters (yüksek quality score + aktif)

### C. Employer Activity

- Hangi employer ne arıyor (search log)
- En çok kullanılan filtreler
- Sonuç bulunamayan aramalar (**supply gap = ürün fırsatı**)
- Düşük conversion aramalar (çok baktı, az shortlist)
- Çok görüntülenip aksiyon alınmayan adaylar

### D. Matching Performance

- AI score yüksek + recruiter açtı oranı (precision)
- Shortlist pattern analizi
- False positive yoğunluğu
- Hiç görüntülenmeyen aday kümeleri (**orphan candidates**)
- Employer'ın sonuç alamadığı filtre kombinasyonları

### E. Operations / Moderation

- Problemli profiller (spam, fake, duplicate)
- Upload hataları
- Employer access log
- Privacy edge case'ler
- Manual override ihtiyacı olan eşleşmeler

### F. Sales Panel

- Freemium vs Premium aday sayısı
- Premium conversion rate
- Employer abone sayısı + abonelik durumu
- MRR / ARR tracking
- Churn risk employers

---

## 6. Gelecek Tablolar (Henüz Yok, Planlanacak)

| Tablo | Amaç | Bağımlılık |
|-------|------|------------|
| employer_searches | Arama log'u | ik.html live data sonrası |
| profile_views | Görüntüleme tracking | ik.html live data sonrası |
| shortlists | Employer shortlist | ik.html live data sonrası |
| matching_scores | Pre-computed match scores | Matching engine build sonrası |
| notifications | Bildirim sistemi | Email service sonrası |
| interview_requests | Görüşme talepleri | Shortlist sonrası |
| feedback_events | Layer 3 learning data | Matching engine sonrası |
| subscriptions | Premium/abonelik | Payment integration sonrası |
| admin_audit_log | Admin aksiyonları | Admin panel build ile |

---

## 7. Yeni Kolon Gereksinimleri (Mevcut Tablolara Eklenecek)

### candidates tablosuna:
- `profile_completion_pct` (INTEGER) — hesaplanmış tamamlama yüzdesi
- `quality_score` (FLOAT) — composite kalite skoru
- `is_featured` (BOOLEAN, default false) — premium öne çıkan
- `last_login_at` (TIMESTAMPTZ) — aktiflik sinyali
- `search_mode` (ENUM: active/passive/hidden) — aktif arama modu

### candidate_experiences tablosuna:
- `managed_team` (BOOLEAN) — ekip yönetti mi
- `team_size` (INTEGER, nullable) — kaç kişilik ekip
- `store_opening` (BOOLEAN) — mağaza açılışı deneyimi
- `multi_location` (BOOLEAN) — çok lokasyon deneyimi
- `special_skills` (TEXT[], nullable) — omni-channel, VM, CRM vs.

### brands tablosuna:
- `segment` (ENUM) — luxury/premium/mass_market/sportswear/cosmetics/electronics/f_and_b

---

## 8. RLS Policy Stratejisi

| Actor | candidates | experiences | companies | shortlists | profile_views |
|-------|-----------|-------------|-----------|------------|---------------|
| Candidate (own) | CRUD | CRUD | READ | READ (own) | READ (own) |
| Employer (auth) | READ (is_active=true, privacy rules) | READ | READ | CRUD (own) | INSERT |
| Admin (service role) | ALL | ALL | ALL | ALL | ALL |

**Privacy kuralları:**
- `is_active = false` → employer göremez
- `hide_from_current_employer = true` + employer.company matches candidate.current_employer → exclude
- Premium candidate → sıralamada üstte, extra bilgi görünür
- Telefon → sadece shortlist sonrası görünür

---

## KURAL: Yeni Veri Ekleme Kontrol Listesi

Yeni bir kolon/tablo eklemeden önce şu 3 soruyu sor:

1. **Bu veri adaya ne katıyor?** (Profilini güçlendiriyor mu?)
2. **Bu veri employer'a ne katıyor?** (Doğru adayı bulmayı kolaylaştırıyor mu?)
3. **Bu veri platforma ne katıyor?** (Matching/analytics'i iyileştiriyor mu?)

3'ünden en az 2'sine "evet" diyemiyorsan, ekleme.
