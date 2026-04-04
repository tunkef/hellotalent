# İşveren Kullanıcı Yolculuğu

## Genel Akış

```
KEŞIF → LEAD → DEMO → ONAY → ŞİRKET KURULUM → POZİSYON → ADAY → GÖRÜŞME → İŞE ALIM
```

---

## 1. Keşif
**Tetikleyici:** HelloTalent satış araması, LinkedIn, referans, sektör etkinliği

**Temas noktaları:**
- Telefon ile satış (Kişi 1 — İşveren Yöneticisi)
- LinkedIn outreach
- İşveren landing page (isveren.html)
- Sektör networkü

---

## 2. Lead Formu
**Sayfa:** isveren.html

**Akış:**
```
İşveren landing page inceler
  → "Bize Ulaşın" / lead formu doldurur
  → Otomatik mail gider (HelloTalent mail + admin CRM kaydı)
  → Kişi 1 telefon açar, demo planlar
```

**Form alanları:** Şirket adı, yetkili ad/soyad, şirket emaili, telefon, marka sayısı

**Admin tarafı:** Mini CRM'de lead olarak görünür (durum: yeni)

---

## 3. Demo (14 Gün Freemium)
**Sayfa:** giris.html (İK tab) → ik.html

**Ön koşul:** Şirket emaili ile kayıt

**Demo deneyimi:**
```
İK paneline giriş
  → Demo ekranı karşılar
  → Fake/örnek aday profilleri görünür
  → "Bu bir demo ekranıdır" uyarısı belirgin
  → Filtreleme, profil inceleme deneyimi
  → Gerçek adaylara erişim YOK
  → 14 gün süre limiti
```

**Amaç:** Sistemin nasıl çalıştığını göstermek, satış dönüşümü için güven oluşturmak

**Kritik metrik:** Demo → ücretli dönüşüm oranı

---

## 4. Admin Onay
**Tetikleyici:** İşveren ücretli üyelik satın alır

```
Ödeme yapılır → Provizyon oluşur
  → Admin kuyruğuna düşer
  → Admin inceler:
      ├─ Gerçek perakende şirketi mi?
      ├─ Outsourcing firması mı? (RED)
      ├─ Domain doğrulama
      └─ Marka/şirket eşleştirme
  → ONAYLA → Provizyon kesilir, erişim açılır
  → REDDET → Provizyon iptal, üyelik iptal
```

**Red nedenleri:** Outsourcing (Manpower vb.), sahte kayıt, uygunsuz faaliyet

---

## 5. Şirket Kurulum
**Sayfa:** ik.html → şirket profili bölümü

**Adımlar:**
```
1. Şirket bilgileri
   → Şirket adı, logo, sektör, mağaza sayısı
   → Tek marka mı çoklu marka mı?

2. Marka eşleştirme
   → Sistem: "Bu markalar sizin mi?" (brands tablosu)
   → Tek marka: otomatik eşleşme
   → Çoklu marka: holding yapısı kurulumu

3. Ekip ataması
   → Admin: tam yetki
   → Recruiter: pozisyon + aday + mesaj
   → Viewer: sadece okuma
   → Şirket emaili ile davet

4. Şirket profili tamamla
   → Hakkında metni, çalışan sayısı, merkez lokasyon
```

---

## 6. Pozisyon Açma
**Kritik akış — HelloTalent'ın ana değer üretim noktası**

```
"Yeni Pozisyon Aç" butonu
  │
  ├─ Pozisyon bilgileri
  │   → Rol: Mağaza Müdürü, Satış Danışmanı, VM, vb.
  │   → Marka (çoklu marka ise hangisi)
  │   → Lokasyon: İl + ilçe(ler)
  │
  ├─ Aday kriterleri
  │   → Segment tercihi: luxury / premium / mass / sportswear / cosmetics
  │   → Minimum deneyim yılı
  │   → Minimum ekip büyüklüğü (opsiyonel)
  │   → Çalışma tipi: tam zamanlı / yarı zamanlı
  │   → Başlama zamanı: hemen / 2 hafta / 1 ay
  │
  ├─ Ek tercihler (soft signal — KVKK uyumlu)
  │   → Yaş aralığı tercihi (hard filter DEĞİL)
  │   → Cinsiyet tercihi (hard filter DEĞİL)
  │   → Dil gereksinimleri
  │   → Özel yetkinlikler (omni-channel, mağaza açılışı, VM)
  │
  └─ Pozisyon yayınla → Sistem eşleştirmeye başlar
```

---

## 7. Aday Önerisi & İnceleme
**Sistemin çekirdek döngüsü**

```
Pozisyon filtreleri → search_employer_candidates RPC
  │
  ├─ 12 sinyalli skorlama (0-100)
  │   → Hard filter fit (lokasyon, çalışma tipi)     × 0.30
  │   → Retail fit (segment, rol, deneyim)            × 0.25
  │   → Intent fit (aktiflik, kariyer yönü)            × 0.20
  │   → Profile quality (tamamlama, CV, güncellik)     × 0.15
  │   → Behavior signal (takip, aktif arama)           × 0.10
  │
  ├─ Premium boost
  │   → "Beni Öne Çıkar" aktif adaylar üst sırada
  │
  ├─ Freshness kontrolü
  │   → Daha önce gösterilen aday tekrar gösterilmez
  │   → "Bu tip daha çok" → benzer profil boost
  │   → "Bu tipi azalt" → negatif sinyal
  │
  └─ Görüntüleme limiti
      → Aylık/haftalık kota (abonelik tier'a göre)
      → Kota dolduğunda: "Limitiniz doldu, yükseltme yapın"
```

**İşveren aksiyonları:**
- Profil kartı görüntüle (detay aç)
- Shortlist'e ekle
- Direkt mesaj at
- Not düş
- Reddet (bir daha gösterme)
- Filtre genişlet ("sportswear yerine fast fashion da olur")

---

## 8. İletişim & Görüşme

```
İşveren mesaj atar (employer_messages)
  → Aday inbox'ta görür + email bildirimi
  → Aday reply atar (candidate_message_replies)
  → Telefon/görüşme organize edilir
  → Platform dışı süreç devam eder
```

**Gelecek:** Interview scheduling, görüşme sonucu feedback, placement tracking

---

## 9. Kampanya Yayınlama (Ek Değer)

```
"Kampanya Oluştur" 
  → Kampanya wizard (ik-kampanya.js)
  → Tür: Mağaza açılışı / Employer branding / İş fırsatı
  → İçerik: Görsel + metin + CTA
  → Admin onayına gider
  → Aday tarafında "Teklifler" bölümünde görünür
  → Ücretli (fiyatlandırma TBD)
```

---

## Kritik Metrikler

| Metrik | Hedef | Ölçüm |
|--------|-------|-------|
| Lead → Demo dönüşüm | > %30 | CRM |
| Demo → Ücretli dönüşüm | > %15 | CRM |
| Pozisyon başına önerilen aday | > 20 | Analytics |
| Görüntüleme → Shortlist oranı | > %10 | Search log |
| Shortlist → Mesaj oranı | > %30 | Message log |
| Mesaj → Görüşme oranı | Tracking dışı (şimdilik) | — |

---

*İlişkili: [[isveren-persona]], [[feature-map]], [[is-modeli]]*
