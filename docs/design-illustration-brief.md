# HelloTalent Illustration Character System Brief

> Bu dosya Recraft MCP ile uretilecek SVG illustrasyonlarin karakter ve stil rehberidir.
> Kademeler tamamlandiktan sonra uretim baslar.

---

## Genel Kurallar

- **Format:** SVG, 1024x1024 viewBox, transparent background
- **Stil:** Flat ile Digital Illustration arasi (B-C arasi). Flat renkler ama hafif depth/shadow. Fotogercekci degil, karikatur de degil.
- **Ana stil referansi:** Recraft V3 `Roundish flat` — karakterlerde yuvarlatilmis form, temiz siluet, sempatik ama cocuksu olmayan yuz dili
- **Ikincil stil referansi:** Recraft V3 `Vivid shapes` — yuz/siluet sadeleştirmesi, net renk bloklari, daha grafik kompozisyon hissi
- **Arka plan / insansiz konsept referansi:** `Segmented Colors` — genis alanlarda, support visual zone'larda ve figursuz konseptlerde buyuk sekil bolmeleri ve sade editoryel yuzeyler
- **Yuz hatlari:** Var, ifade okunabiliyor ama stilize. Proportion gercekci, hafif stilize (bas biraz buyuk olabilir, eller detaysiz olabilir)
- **Edge:** Outlined degil, daha painterly/soft edge
- **Etnisite:** Turk gorunumlu, koyu sacli. Asla zenci, asyali, sarisn nordic
- **Yas hissi:** 25-33 arasi
- **Enerji:** Sakin, kendinden emin ama dinamik durus
- **Kiyafet:** Modern, asla klasik. Smart casual, hafif spor hafif sik
- **Marka/Text:** Asla yok. Magaza elementleri soyut, sempatik ama markasiz
- **Arka plan:** Transparent — karakter her sayfanin gradient/renk arka planina oturabilmeli
- **Tutarlilik:** Iki karakter yan yana kondugunda "ayni dunyadan" hissi vermeli
- **Renk davranisi:** Ana renkler vivid kalmali; ama kompozisyonu rahatlatmak icin arada warm ivory, soft peach, muted blush, dusty blue-grey gibi yumusatici destek tonlari eklenebilir
- **Shape language:** Karakterlerde `roundish flat` agirlikli, arka plan konseptlerinde `segmented` daha grafik kurgu kullanilabilir; ama butun sistem tek dunyadan gelmis gibi kalmali

---

## Karakter 1: Aday (Erkek)

### Kimlik
- Retail'de calisan/calismak isteyen genc erkek
- 25-28 yas hissi
- Enerjik, kariyer odakli, modern

### Kiyafet
- **Ust:** Bomber ceket veya duz oversize tisort
- **Alt:** Slim/duzgun pantolon, jean olabilir
- **Ayak:** Sneaker kesinlikle
- **Genel his:** Magazada calisan cool cocuk

### Renk Paleti
- **Agirlik:** Vermillion (#C94E28) — kiyafet ve aksanlarda hakim
- **Detaylar:** Navy (#1E2D5E) izleri — yaka, sneaker detayi, telefon kilifi
- **Denge:** %70 vermillion tonu, %30 navy tonu

### Poz (Landing Page)
- Ayakta, bir elinde telefon gosteriyor (profil/app), diger el cebinde veya dogal
- Hafif gulumseme, kameraya degil hafif yana bakis
- Statik degil ama yuruyor da degil — "az once bir yere gelmis" hissi
- Etrafinda: Retail + is arama baglamini anlatan markasiz, textsiz, yaklasimsal belirtecler olabilir
- Ornek belirtecler: profil/app karti silueti, arama/discovery halkasi, check isareti, konum pini, shopping bag, aski, raf hissi, shortlist/match ikonografisi
- Etraf unsurlari dekor icin degil, "retail'de is arayan aday" baglamini guclendirmek icin kullanilmali

---

## Karakter 2: Isveren (Kadin)

### Kimlik
- Retail direktoru/IK yoneticisi kadin
- 30-33 yas hissi
- Kendinden emin, samimi, asla soguk

### Kiyafet
- **Ust:** Modern blazer (yapilandirilmis ama rahat) veya modern trenchkot
- **Alt:** Modern kesim pantolon, kumas ama rahat
- **Ayak:** Minimal sneaker veya duz ayakkabi
- **Genel his:** "Bu kadin retail direktoru" ama samimi

### Renk Paleti
- **Agirlik:** Navy (#1E2D5E) — kiyafet ve aksanlarda hakim
- **Detaylar:** Vermillion (#C94E28) izleri — ic tisort, aksesuar, ayakkabi detayi
- **Denge:** %70 navy tonu, %30 vermillion tonu

### Poz (Landing Page)
- Ayakta, tablet veya telefon elinde, kendinden emin durus
- Hafif gulumseme, direkt bakis veya hafif acili
- Bir eli belde veya dogal
- Etrafinda: Ofis / HR / talent selection baglamini destekleyen markasiz, textsiz yaklasimsal belirtecler olabilir
- Ornek belirtecler: CV/aday kartlari, shortlist check'leri, mesaj/gorusme hissi, soyut dashboard bloklari, planning/takvim/team-selection simgeleri, masaustu veya tablet odakli HR atmosferi
- Etraf unsurlari soguk kurumsal degil; samimi ama profesyonel bir IK ortam hissi vermeli

---

## Kullanim Alanlari (Oncelik Sirasi)

### Faz 1 — Landing Pages
| Sayfa | Aday Karakteri | Isveren Karakteri |
|-------|---------------|-------------------|
| index.html (gate) | Ana illustrasyon — sol panel | Ana illustrasyon — sag panel |
| aday.html | Hero section | - |
| isveren.html | - | Hero section |

### Faz 2 — Dashboard (ileride)
| Alan | Kullanim |
|------|---------|
| Onboarding wizard | Step illustrasyonlari |
| Empty states | "Henuz deneyim eklenmedi" / "Henuz aday yok" |
| Profil avatar placeholder | Default avatar |
| Error/404 | Hata sayfasi |
| Basari/tamamlanma | "Profilin hazir!" / "Ilan yayinda!" |

---

## Recraft MCP Uretim Notlari

- Stil: insan karakterlerde once `digital_illustration` + `Roundish flat` referansi ile basla; gerekirse `flat_illustration_v2` sadece ikinci deneme olarak test et
- Yuz/siluet ve renk bloklarinda `Vivid shapes` referansi destekleyici olarak kullanilabilir
- Genis arka planlar, support visual zone'lar ve insansiz konseptler icin `Segmented Colors` referansi kullan
- Her iki karakter ayni prompt style ile uretilmeli (tutarlilik)
- Transparent background icin: tercihen SVG export; gerekirse PNG alpha gecici olabilir ama final hedef SVG-first/vector-first
- Transparent background sadece dis rect temizligi degil; ic negatif alanlar da gercekten seffaf olmali
- Cevresel simgeler text/marka icermemeli; baglam anlatmali ama clutter yaratmamali
- Renkler daima canli olmali ama sert vivid duvar gibi degil; gerektiğinde soft dengeleyici tonlarla rahatlatilmali
- 5000 kredi mevcut
- Ilk deneme: gate sayfasi icin 2 karakter, sonra iterate
