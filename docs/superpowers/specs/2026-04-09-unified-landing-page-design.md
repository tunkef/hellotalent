# Unified Landing Page — Spec

> Gate kaldiriliyor, tek LP olusturuluyor. bunq.com referans.

## Problem

Mevcut `index.html` (gate) bir "bariyer" — kullaniciyi hemen "Aday misin, Isveren misin?" secimi yapmaya zorluyor. Kesfetme alani yok, deger onerisi yok, social proof yok. Sadece acil ihtiyaci olan gelir, merakli gezgin kaybedilir.

## Vizyon

Gate kalkar. Tek bir landing page olur. Header'da **Adaylar / Kurumsal** toggle — tiklayinca ayni sayfada icerik degisir (bankacilik siteleri gibi: Bireysel/Kurumsal). bunq.com header yapisi referans: minimal, temiz, segment odakli.

## Kararlar

- **Segment isimleri:** "Adaylar" ve "Kurumsal" (isveren yerine)
- **Social proof:** Fake rakam YOK. 3 uye var, bunu gizlemiyoruz ama one de cikarmiyoruz.
- **Markalar:** 96 marka DB'de var ama bunlar gercek ortaklik degil, aday takip icin olusturulmus. Logo strip'te gosterilemez.
- **Yetkinlik matrisi:** Mevcut ama henuz tutarli degil, MVP boyunca iyilestirilecek. Vurgulama.
- **Pozisyonlama:** "Turkiye perakende sektorunun yetenek platformu" + "Magaza sektorundeki adaylar ve isveren sirketler burada bulusuyor"
- **Ucretsizlik:** Vurgula ama "sinirli sure" gibi sahte urgency yapma
- **Referans:** bunq.com header yapisi, minimal estetik, SaaS hissi

## Sayfa Yapisi

### Header (Tum sayfalarda ortak — shared.js)

```
[HelloTalent logo]  [Adaylar] [Kurumsal]  [Hakkimizda] [Iletisim]  |  [Giris Yap]
```

- **Adaylar** ve **Kurumsal** segment butonlari — aktif olan underline/highlight ile isaretli
- Tiklayinca: ayni sayfa, icerik degisir (SPA-like, URL hash veya smooth transition)
- **Giris Yap** butonu → giris.html'e yonlendirir
- Mobilde: hamburger menu, segment toggle korunur
- Mevcut shared.js header'i buna donusturulecek

### Hero Section (Segment'e gore degisiyor)

**Adaylar aktifken:**
```
Baslik: "Artik basvuru yok. Markalar seni buluyor."
Alt metin: "Perakende sektorune ozel profil olustur, sektorun guclu markalari seni kesfetsin. Tamamen ucretsiz."
CTA 1: [Google ile Uye Ol] (primary)
CTA 2: [Ucretsiz Hesap Olustur] (secondary, → giris.html?tab=aday)
Gorsel: mevcut hero-aday.webp veya Clatu illustration
```

**Kurumsal aktifken:**
```
Baslik: "Dogru yetenek bir tikla uzakta."
Alt metin: "Perakende sektorune ozel yetenek havuzuna erisin. Filtreleyin, inceleyin, hemen iletisime gecin."
CTA: [Ucretsiz Demo Talep Et] (primary, → #lead-form veya inline form)
Gorsel: mevcut hero-isveren.webp
```

### Pozisyonlama Strip (Her iki segment'te ortak)

Hero altinda, ince bir band:
```
"Turkiye perakende sektorunun yetenek platformu"
```

Veya daha conversational:
```
"Magaza sektorundeki adaylar ve isveren sirketler burada bulusuyor."
```

Sabit, segment degisince degismiyor. Site kimligini one cikarir.

### Features Section (Segment'e gore degisiyor)

**Adaylar:**
- Mevcut aday.html'deki bento kartlari (6 ozellik) — ama her karta 1 satirlik aciklama eklenir
- Kartlar: Akilli Profil, Yetkinlik Pratigi, AI CV Optimize, Markalar, Firsatlar, Studio

**Kurumsal:**
- Mevcut isveren.html'deki bento kartlari (6 ozellik) — ayni sekilde aciklama eklenir
- Kartlar: Canli Yetenek Havuzu, Yetkinlik Eslestirme, Direkt Mesaj, Isveren Markasi, Pozisyon Yonetimi, Ekip Is Birligi

### Steps Section (Segment'e gore degisiyor)

**Adaylar:** 3 adim (profil olustur → gelistir → markalar seni bulsun)
**Kurumsal:** 3 adim (kayit ol → pozisyon ac → adaylarla ileti sim kur)

Mevcut step kartlari aynen kullanilabilir.

### Final CTA (Segment'e gore degisiyor)

**Adaylar:**
```
"Hazir misin?"
"Sadece 2 dakikani alir. CV zorunlu degil. Tamamen ucretsiz."
[Google ile Uye Ol] [Ucretsiz Hesap Olustur]
```

**Kurumsal:**
```
"Ekibinizi kurmaya baslayin."
"24 saat icinde size donecegiz."
[Lead form: Ad, Email, Sirket, Telefon (opsiyonel), Magaza sayisi]
```

### Footer (Mevcut shared.js footer korunur)

Degisiklik yok — mevcut 3-kolon footer yeterli.

## "Uye Ol" Akisi

Sag ustteki "Giris Yap" → giris.html (mevcut)

Alternatif: "Uye Ol" tiklandiginda split overlay:
```
┌─────────────────────────────────────┐
│        HelloTalent'e Katil          │
│                                     │
│  [Bireysel Uye Ol]  [Kurumsal]     │
│   (aday kayit)      (isveren kayit) │
└─────────────────────────────────────┘
```

Bu overlay mevcut giris.html'e yonlendirme yapar (tab=aday veya tab=ik).

## Teknik Yaklasim

### Dosya Stratejisi

- `index.html` → tamamen yeniden yazilir (gate kalkar, tek LP olur)
- `aday.html` → SILINIR (icerigi index.html'e tasindi)
- `isveren.html` → SILINIR (icerigi index.html'e tasindi)
- `shared.js` → header yapisi guncellenir (segment toggle)
- `shared.css` → header + segment toggle stilleri

### Segment Toggle Mekanizmasi

```javascript
// URL hash ile state: index.html#adaylar veya index.html#kurumsal
// Default: #adaylar
// Toggle tiklandiginda: icerik fade-out → degistir → fade-in
// Smooth transition, sayfa reload yok
```

### SEO Etkileri

- `aday.html` ve `isveren.html` kalkinca mevcut Google index'i kirilir
- Cozum: 301 redirect veya meta refresh (GitHub Pages 301 desteklemez, meta refresh kullan)
- `sitemap.xml` guncellenir
- Her segment icin ayri `<title>` ve `<meta description>` dinamik set edilir

### Responsive

- Desktop: yan yana layout (hero sol metin, sag gorsel)
- Tablet: ust ust (metin → gorsel)
- Mobil: segment toggle header'da korunur, hamburger icine girmez
- Touch target: minimum 44x44px

## Kapsam Disi

- Profil dashboard (profil.html) degismiyor
- IK dashboard (ik.html) degismiyor
- Giris sayfasi (giris.html) degismiyor
- Admin panel degismiyor
- Hakkimizda ve iletisim sayfalari degismiyor (sadece header guncellenir)
- Supabase/backend degisiklik yok

## Basari Kriterleri

1. Gate bariyer hissi ortadan kalkiyor
2. Kullanici 3 saniyede ne sitesi oldugunu anliyor
3. Segment toggle sorunsuz calisiyor (desktop + mobil)
4. Mevcut aday.html ve isveren.html icerikleri korunuyor
5. Dark mode calisiyor
6. Lighthouse Performance > 90
7. Mobil responsive sorunsuz (390x844)
