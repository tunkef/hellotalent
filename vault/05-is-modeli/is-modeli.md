# HelloTalent — İş Modeli & Gelir Stratejisi

## Model: İki Taraflı Marketplace (İşveren-Ağırlıklı)

```
┌──────────────┐                          ┌──────────────┐
│    ADAYLAR    │ ◄── Eşleştirme Motoru ──►│  İŞVERENLER  │
│              │                          │              │
│ Freemium     │                          │ Demo (14 gün)│
│ Premium (~$) │                          │ Ücretli ($$$)│
│  ~%10 gelir  │                          │  ~%70 gelir  │
└──────────────┘                          └──────┬───────┘
                                                 │
                                          ┌──────▼───────┐
                                          │  KAMPANYALAR  │
                                          │  ~%20 gelir   │
                                          └──────────────┘
```

### Gelir Stratejisi Felsefesi
> **Aday = havuz, İşveren = gelir.** Aday premium'u düşük tut ki havuz büyüsün.
> Platform değeri = aday havuz büyüklüğü × kalitesi. Bu büyüdükçe işveren daha çok öder.

### Kur Riski Yönetimi
- Geliştirici maliyetleri (Supabase, OpenAI, Anthropic, Resend) **dolar bazlı**
- Gelir **TL bazlı** → kur riski var
- Çözüm: İlk yıl özel fiyat + 6 aylık fiyat review döngüsü
- Otomatik kur endeksleme YOK (müşteri güvenini bozar), manual review ile güncelleme

---

## Gelir Kaynakları

### 1. Aday Premium Üyelik
**Hedef kitle:** Kariyer atlamak isteyen deneyimli profesyoneller

| Özellik | Freemium | Premium |
|---------|----------|---------|
| Profil oluşturma | Var | Var |
| Marka keşfi (96 marka) | Var | Var |
| Studio pratik | Sınırlı | Sınırsız |
| Coach içerikleri | Var | Var |
| Destek merkezi | Var | Var |
| Teklifler (temel) | Temel avantajlar | Premium avantajlar (marka indirimleri vb.) |
| Şirket takibi | Var | Var |
| **Beni Öne Çıkar** | Yok | **Var** — İşveren aramalarında üst sıra |
| **AI CV Optimize** | Yok | **Ayda 3 kez** |
| **AI Yetkinlik Değerlendirme** | Yok | **Sınırsız** |
| **Premium Teklifler** | Yok | **Marka indirim, özel avantajlar** |

**Fiyatlandırma önerisi (Head of Product tavsiyesi):**

| Plan | Aylık | Yıllık (aylık) | Not |
|------|-------|----------------|-----|
| Premium | 99-149 TL/ay | 69-99 TL/ay | Düşük tut — aday işçi, kazancı düşük |

> **Neden tek plan?** Birden fazla aday tier'ı karmaşıklık yaratır. Perakende çalışanlarının satın alma gücü düşük — tek bir uygun fiyatlı premium tier daha yüksek dönüşüm sağlar. Tier çeşitliliğini işveren tarafına bırak.

> **Neden düşük fiyat?** Aday premium asıl gelir kaynağı DEĞİL. Amaç havuzu büyütmek ve premium adayı "Beni Öne Çıkar" ile işverene daha görünür kılmak. Yüksek fiyat = düşük premium aday = işveren için daha az değer.

> **Beta dönemi:** 3 ay ücretsiz premium (mevcut yapı). İlk yıl özel fiyat ile early adopter avantajı.

---

### 2. İşveren Abonelik
**Hedef kitle:** Perakende şirketlerinin İK departmanları

**Kademe önerisi:**

| Plan | Aylık | İçerik |
|------|-------|--------|
| Plan | Normal Fiyat | İlk Yıl Özel | İçerik |
|------|-------------|---------------|--------|
| **Starter** | 4.990 TL/ay | ~3.490 TL/ay | 3 aktif pozisyon, 50 profil görüntüleme/ay, 2 kullanıcı, temel filtreler |
| **Professional** | 9.990 TL/ay | ~6.990 TL/ay | 10 aktif pozisyon, 200 profil görüntüleme/ay, 5 kullanıcı, gelişmiş filtreler, kampanya (1/ay) |
| **Enterprise** | Özel teklif | Özel teklif | Sınırsız pozisyon, sınırsız görüntüleme, sınırsız kullanıcı, öncelikli destek, dedicated account manager |

> **Neden bu fiyat aralığı?**
> - Kariyer.net ilan başı 3.000-8.000 TL, LinkedIn Recruiter Lite ~$170/ay
> - Headhunter fee: brüt maaş x 2-3 ay = 50.000-150.000 TL/pozisyon
> - HelloTalent sürekli erişim sunuyor, ilan başı değil — çok daha ekonomik
> - Starter planla bile 3 pozisyon açabilmek headhunter maliyetinin 1/10'u

> **İlk yıl özel fiyat:** Early adopter müşterileri kilitlemek + referans vaka çalışması oluşturmak için %30 indirimli. İlk 20 ücretli müşteriye uygulanır.

> **Kur review:** 6 ayda bir fiyat review'ı. Dolar bazlı maliyet artışı > %15 ise güncelleme yapılır. Müşteriye 30 gün önceden bildirim zorunlu.

> **Kritik:** Fiyatlar beta sonrası belirlenir. Önce 10-20 ücretli müşteri ile doğrulanır, sonra optimize edilir.

---

### 3. Kampanya Geliri (Ek)
**Model:** İşveren employer branding / duyuru kampanyası yayınlar

| Kampanya Tipi | Önerilen Fiyat | Görünürlük |
|---------------|----------------|------------|
| Mağaza açılışı duyurusu | 2.500 TL/kampanya | Teklifler bölümünde 30 gün |
| Employer branding | 5.000 TL/kampanya | Teklifler + dashboard highlight |
| Sponsorlu pozisyon | 1.500 TL/pozisyon | Önerilen adaylarda üst sıra |

> **Not:** Kampanya fiyatlandırması beta sonrası netleşecek. İlk etapta Professional+ planlara dahil tutulabilir.

---

## Ödeme Altyapısı

| Bileşen | Tercih | Alternatif | Durum |
|---------|--------|------------|-------|
| Ödeme gateway | iyzico | Stripe | Henüz entegre değil |
| Abonelik yönetimi | iyzico subscription | Kendi sistemi | subscriptions tablosu hazır |
| Fatura | e-Arşiv entegrasyon | Manual | Gelecek |
| Provizyon | iyzico pre-auth | — | Admin onay akışı ile bağlantılı |

**Akış:**
```
İşveren plan seçer → iyzico ödeme → Provizyon oluşur
  → Admin onay → ONAYLA → Provizyon kesilir, erişim açılır
  → Admin → REDDET → Provizyon iptal, iade
```

---

## Temel Metrikler (KPI)

### Aday Tarafı
| Metrik | Tanım | Hedef (6 ay) |
|--------|-------|--------------|
| Toplam kayıt | Tüm kayıtlı adaylar | 5.000+ |
| Profil tamamlama | >= %45 profiller | > %60 |
| CV yükleme oranı | CV olan / toplam | > %40 |
| Freemium → Premium | Ücretli dönüşüm | > %5 |
| DAU/MAU | Günlük/aylık aktif | > %15 |

### İşveren Tarafı
| Metrik | Tanım | Hedef (6 ay) |
|--------|-------|--------------|
| Toplam lead | Lead formu dolduran | 200+ |
| Demo dönüşüm | Lead → demo giriş | > %30 |
| Ücretli dönüşüm | Demo → ücretli | > %15 |
| Aktif pozisyon | Açık pozisyon sayısı | 50+ |
| Churn (aylık) | İptal eden / toplam | < %5 |

### Platform
| Metrik | Tanım | Hedef |
|--------|-------|-------|
| MRR | Aylık tekrarlayan gelir | İzleme başlasın |
| Supply-demand ratio | Aday / açık pozisyon | > 20:1 |
| Match quality | Görüntüleme → shortlist | > %10 |
| Time to first match | Pozisyon açma → ilk shortlist | < 24 saat |

---

## Network Etkisi Stratejisi

```
Daha çok aday profili
  → İşveren için daha değerli (daha çok uygun aday)
  → Daha çok işveren
  → Aday için daha çok fırsat
  → Daha çok aday profili
  → ...
```

**Cold start çözümü (MVP 1):**
1. Önce aday topla (ücretsiz, düşük bariyer)
2. Aday tabanı yeterli olunca (segment başına 50+ aday) işverenlere sat
3. "Her segmentte hazır aday havuzu var" mesajıyla güven oluştur

---

## Fiyatlandırma Felsefesi

1. **Perakende çalışanı satın alma gücünü düşün** — Aday premium çok pahalı olmamalı
2. **Headhunter fee ile karşılaştır** — İşveren fiyatı headhunter'ın 1/10'u olmalı
3. **Değer bazlı** — Özellik bazlı değil, sonuç bazlı fiyatla (kaç aday gördün, kaç görüşme yaptın)
4. **Beta'da ücretsiz, doğrulama sonrası fiyatla** — Önce product-market fit, sonra monetization

---

*Son güncelleme: 3 Nisan 2026*
*İlişkili: [[vizyon-ve-misyon]], [[mvp-roadmap]], [[feature-map]]*
