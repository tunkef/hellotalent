# HelloTalent — MVP Roadmap

## Faz Yapısı

```
┌─────────────────────────────────────────────────────────────────┐
│                    MVP 1 — Aday Toplama                        │
│  "Aday tabanını oluştur, işveren ilgisini topla"               │
│  Süre: ~4-6 hafta                                              │
├─────────────────────────────────────────────────────────────────┤
│                    MVP 2 — İşveren Aktivasyonu                 │
│  "İşvereni sisteme al, eşleştirmeyi başlat"                   │
│  Süre: MVP 1 bitiş tarihine göre belirlenir                   │
├─────────────────────────────────────────────────────────────────┤
│                    MVP 3 — Monetization                        │
│  "Ödeme al, sürdürülebilir gelir oluştur"                     │
│  Süre: MVP 2 sonrası                                          │
├─────────────────────────────────────────────────────────────────┤
│                    GROWTH — Ölçeklendirme                      │
│  "Network etkisi, AI derinleştirme, genişleme"                │
└─────────────────────────────────────────────────────────────────┘
```

---

## MVP 1 — Aday Toplama

**Hedef:** Aday tabanı oluştur, segment başına 50+ profil. İşveren lead topla. Demo ekranı hazır.

**Bitiş kriteri:** Her segmentte 50+ tamamlanmış profil, 30+ işveren lead, demo çalışır durumda

**Distribution varlıkları:** 5.000 hazır CV, 4.400 LinkedIn (%60 retail), PeopleIn ağı, 15 şehir, 200K TRY bütçe

### Aday Tarafı (Mevcut — Polish & Launch)

| # | İş | Durum | Bağımlılık | Öncelik |
|---|-----|-------|------------|---------|
| A1 | Aday profil wizard + dashboard | Canlı | — | Done |
| A2 | Studio (STAR+T, streak, badge) | Canlı | — | Done |
| A3 | Marka keşfi + takip | Canlı | — | Done |
| A4 | Landing page (aday.html) | Canlı | — | Done |
| A5 | Dark mode | Canlı | — | Done |
| A6 | Newsletter kayıt sistemi | **YOK** | Mail altyapısı | **Yüksek** |
| A7 | Şirket takip CTA optimizasyonu | İyileştirme | — | Orta |
| A8 | Profil tamamlama push (email) | **YOK** | Email pipeline | Orta |

### İşveren Tarafı (Lead Toplama)

| # | İş | Durum | Bağımlılık | Öncelik |
|---|-----|-------|------------|---------|
| E1 | Lead form → otomatik mail sistemi | **YOK** | Mail adresi açılacak | **Kritik** |
| E2 | Lead form → Supabase kaydı | **YOK** | DB tablo | **Kritik** |
| E3 | İşveren landing page (isveren.html) | Canlı | — | Done |
| E4 | Demo ekranı (ik-demo.js, fake data, 14 gün) | **YOK** | — | **Kritik** |

### Admin Tarafı

| # | İş | Durum | Bağımlılık | Öncelik |
|---|-----|-------|------------|---------|
| D1 | Mini CRM — lead listesi + durum yönetimi | **YOK** | E2 | **Yüksek** |
| D2 | Aday segment dağılım dashboard | **YOK** | — | Orta |
| D3 | Newsletter yönetim paneli | **YOK** | A6 | Orta |
| D4 | Aday tamamlama oranı dashboard | **YOK** | — | Orta |

### Altyapı

| # | İş | Durum | Bağımlılık | Öncelik |
|---|-----|-------|------------|---------|
| I1 | Newsletter mail servisi kurulumu | **YOK** | Resend veya yeni provider | **Yüksek** |
| I2 | İşveren için ayrı mail adresi | **YOK** | Domain config | **Yüksek** |
| I3 | Lead tablosu + RLS | **YOK** | — | **Kritik** |

### Launch Blocker'lar (MVP 1 öncesi zorunlu)

| # | İş | Durum | Bağımlılık | Öncelik |
|---|-----|-------|------------|---------|
| L1 | Analytics altyapısı (event tracking + sayfa analytics) | **YOK** | — | **BLOCKER** |
| L2 | KVKK hukuki danışmanlık (avukat görüşmesi) | **YOK** | Tuna'nın avukat arkadaşı | **BLOCKER** |
| L3 | Aydınlatma metni + rıza mekanizması güncelleme | **YOK** | L2 | **BLOCKER** |
| L4 | Güvenlik monitoring (Supabase alerting + RLS audit) | **YOK** | — | **BLOCKER** |
| L5 | Google Analytics veya Plausible/Umami kurulumu | **YOK** | — | **BLOCKER** |

---

## MVP 2 — İşveren Aktivasyonu

**Hedef:** İşveren sisteme girer, pozisyon açar, aday görür, iletişime geçer.

**Ön koşul:** MVP 1 tamamlanmış, segment başına 50+ aday

### İşveren Dashboard (ik.html Rebuild)

| # | İş | Durum | Bağımlılık | Öncelik |
|---|-----|-------|------------|---------|
| E4 | ~~Demo ekranı~~ → MVP 1'e taşındı (ik-demo.js) | — | — | — |
| E5 | Şirket profili onboarding (tek/çoklu marka) | Kısmen | — | **Kritik** |
| E6 | Ekip atama (admin/recruiter/viewer) | DB hazır | E5 | **Yüksek** |
| E7 | Pozisyon açma wizard | **YOK** | E5 | **Kritik** |
| E8 | Aday önerisi sistemi (pozisyon → filtre → skor) | Kısmen (search RPC var) | E7 | **Kritik** |
| E9 | Aday görüntüleme limiti (kota) | **YOK** | E8 | **Yüksek** |
| E10 | Shortlist yönetimi | **YOK** | E8 | **Yüksek** |
| E11 | Direkt mesajlaşma (mevcut iyileştirme) | Canlı | E8 | Orta |
| E12 | Kampanya yayınlama | DB hazır | E5 | Orta |
| E13 | Takipçi sayısı (total) görüntüleme | **YOK** | — | Düşük |
| E14 | Freshness: aynı adayı tekrar göstermeme | **YOK** | E8 | **Yüksek** |

### Admin Tarafı

| # | İş | Durum | Bağımlılık | Öncelik |
|---|-----|-------|------------|---------|
| D5 | İşveren onay kuyruğu | **YOK** | E5 | **Kritik** |
| D6 | Onay/red + provizyon akışı | **YOK** | D5 + ödeme | **Yüksek** |
| D7 | İşveren aktivite dashboard | **YOK** | E8 | Orta |
| D8 | Supply-demand gap analizi | **YOK** | E8 | Orta |

### Aday Tarafı (MVP 2 ilaveleri)

| # | İş | Durum | Bağımlılık | Öncelik |
|---|-----|-------|------------|---------|
| A9 | "Tercih" bazlı soft signal (yaş/cinsiyet) | **YOK** | KVKK review | Orta |
| A10 | Kim Baktı iyileştirme (işveren bilgisi) | Kısmen | E8 | Düşük |

### Altyapı

| # | İş | Durum | Bağımlılık | Öncelik |
|---|-----|-------|------------|---------|
| I4 | employer_searches log tablosu | **YOK** | — | **Yüksek** |
| I5 | profile_views tracking tablosu | **YOK** | — | **Yüksek** |
| I6 | shortlists tablosu | **YOK** | — | **Yüksek** |
| I7 | Pozisyon tablosu genişletme (filtre alanları) | Kısmen | — | **Kritik** |
| I8 | Görüntüleme limiti altyapısı | **YOK** | — | **Yüksek** |

---

## MVP 3 — Monetization

**Hedef:** Ödeme altyapısı, abonelik yönetimi, ilk gelir

| # | İş | Bağımlılık | Öncelik |
|---|-----|------------|---------|
| M1 | iyzico/Stripe entegrasyonu | iyzico credentials | **Kritik** |
| M2 | Aday premium checkout | M1 | **Kritik** |
| M3 | İşveren abonelik checkout | M1 | **Kritik** |
| M4 | Provizyon + admin onay + ödeme kesme | M1 + D5 | **Yüksek** |
| M5 | Fatura sistemi (e-Arşiv) | M1 | Orta |
| M6 | Kampanya ücretlendirme | M1 | Orta |
| M7 | Churn prevention (uyarı, uzatma) | M1 | Düşük |

---

## GROWTH — Ölçeklendirme (Post-MVP)

| # | İş | Kategori |
|---|-----|----------|
| G1 | Matching engine v2 (ML-based) | AI |
| G2 | Interview scheduling (platform içi) | Feature |
| G3 | Placement tracking (işe alım sonucu) | Analytics |
| G4 | Mobile app (PWA veya native) | Platform |
| G5 | Coach monetization | Gelir |
| G6 | Domain verification (otomatik) | Güvenlik |
| G7 | Bölgesel genişleme (Körfez, Balkanlar) | Growth |
| G8 | API entegrasyonları (ATS sistemleri) | B2B |
| G9 | Referral programı (aday getiren adaya puan) | Growth |
| G10 | Headhunter özel dashboard | Segment |

---

## Bağımlılık Haritası

```
I2 (mail adresi) ──► E1 (lead form mail)
                         │
I3 (lead tablosu) ──► E2 (lead → DB) ──► D1 (mini CRM)
                                              │
I1 (newsletter) ──► A6 (newsletter kayıt) ──► D3 (newsletter admin)

E5 (şirket profil) ──► E6 (ekip atama)
       │                     │
       ├──► E7 (pozisyon) ──► E8 (aday önerisi)
       │                          │
       │                     E14 (freshness)
       │                          │
       │                     E9 (görüntüleme limit)
       │                          │
       │                     E10 (shortlist)
       │
       └──► D5 (admin onay) ──► D6 (provizyon)
                                     │
                                M1 (ödeme) ──► M2, M3, M4
```

---

## Risk Tablosu

| Risk | Etki | Olasılık | Mitigasyon |
|------|------|----------|------------|
| Aday tabanı yeterli büyümez | Yüksek | Orta | Referral, sosyal medya, sektör etkinlikleri |
| İşveren dönüşüm düşük kalır | Yüksek | Orta | Demo ekran kalitesi, telefon satış |
| KVKK/yaş-cinsiyet ihlal riski | Yüksek | Düşük | "Tercih" modeli, hukuki danışmanlık |
| Outsourcing firması sızması | Orta | Orta | Admin onay kapısı, domain kontrolü |
| Rakip kopya | Orta | Düşük | Sektör derinliği, first-mover, veri avantajı |
| Teknik ölçek sorunu | Düşük | Düşük | Supabase managed, GitHub Pages CDN |

---

*Son güncelleme: 3 Nisan 2026*
*İlişkili: [[vizyon-ve-misyon]], [[feature-map]], [[is-modeli]]*
