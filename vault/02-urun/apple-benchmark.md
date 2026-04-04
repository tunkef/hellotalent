# Kariyer Platformu Benchmark Analizi (Apple + Netflix + Stripe)

> Apple'ın Türkiye retail kariyer portalı (jobs.apple.com/tr-tr) profil yapısının HelloTalent ile karşılaştırmalı analizi.
> Kaynak: Tuna Kefeli'nin Store Manager başvurusu (3 Nisan 2026)

---

## Apple Profil Bölümleri

### 1. İletişim Bilgileri
- Ad / Soyadı
- **Tercih Edilen Ad** (inklüzif dokunuş)
- Tercih Edilen Mail Adresi (doğrulanmış ✓)
- Tercih Edilen Telefon Numarası
- Tercih Edilen Adres (ülke, ilçe, il, posta kodu)

### 2. Özgeçmiş / LinkedIn
- CV upload (PDF)
- LinkedIn profili URL

### 3. Eğitim Özeti
- Okul, bölüm/öğrenim alanı, derece, mezun mu?
- Çoklu kayıt destekli

### 4. İş Deneyimi Özeti
- İşveren (şirket adı)
- İş Unvanı
- Şu Anki İşveren (Evet/Hayır)
- Başlangıç / Bitiş Tarihi
- **İş Tanımı (serbest metin)** ← KRİTİK

### 5. Beceriler (Yetkinlik Düzeyleri)
- 5 seviyeli skala: 1-Başlangıç → 2-Temel → 3-Yetkin → 4-İleri → 5-Uzman
- Aday kendi becerilerini seviyelere yerleştirir
- 50+ beceri eklenebilir
- İşveren beceri + seviye ile filtreleyebilir

### 6. Diller
- Dil + Yetkinlik Düzeyi (Akıcı vb.)
- **Tercih Edilen** dil (Evet/Hayır)

### 7. Ek Dosyalar ve Bağlantılar
- Destekleyici dosyalar (portfolyo vb.)
- Destekleyici bağlantılar

### 8. Tercih Edilen Konumlar

### 9. Başka Bir Yerde Çalışma Tercihleri
- Taşınma isteği
- **Seyahat isteği** (ayrı soru)

### 10. Gizlilik Onayı
- Adaylar İçin Gizlilik Politikası Onayı (tarihli)
- Veri Kullanım Politikası Onayı (tarihli)

### 11. İlgilenilen Ekipler

### 12. İstihdam Türü

### 13. DEI Beyanı (Footer)
> "Apple'da hepimiz birbirimizden farklıyız. Ve bu farklılık, en güçlü noktamız."

---

## Apple Ne TOPLAMAZ?

| Veri | Apple | Not |
|------|-------|-----|
| Yaş / Doğum yılı | ❌ TOPLAMAZ | Deneyim yılından dolaylı çıkarılabilir |
| Cinsiyet | ❌ TOPLAMAZ | |
| Medeni durum | ❌ TOPLAMAZ | |
| Askerlik durumu | ❌ TOPLAMAZ | |
| Fotoğraf | ❌ TOPLAMAZ | |
| Maaş beklentisi | ❌ TOPLAMAZ | |
| Maaş geçmişi | ❌ TOPLAMAZ | |

**Sonuç:** Dünyanın en büyük perakende işverenlerinden biri bu bilgilerin hiçbirini toplamıyor. HelloTalent için KVKK revizyonlarını doğrulayan en güçlü benchmark.

---

## HelloTalent İçin 6 Aksiyon

### AKS-1: İş Tanımı Alanı Ekle (Tier 1 — MVP 1)
**Ne:** Her deneyim kaydına opsiyonel serbest metin "İş Tanımı" alanı
**Neden:** Apple'daki en değerli veri noktası. Ekip büyüklüğü, KPI, ciro, özel yetkinlikler tek alanda. Aday kendi deneyimini anlatıyor — işveren derinlik görüyor.
**Form friction:** Düşük (opsiyonel). Dolduranlar profil tamamlama puanı kazanır.
**Kolon:** `candidate_experiences.description` (text, nullable)
**Etki:** Profil kalitesini 3x artırır. Aynı "Mağaza Müdürü" unvanı altında 5 kişi vs 50 kişi farkı ortaya çıkar.

### AKS-2: Yetkinlik Haritasını Profil Kartına Yansıt (Tier 2 — MVP 2)
**Ne:** Studio pratik verilerinden türetilmiş yetkinlik seviyeleri profilde görünsün
**Neden:** Apple self-rate yapıyor. Biz AI + pratik bazlı **doğrulanmış yetkinlik** sunabiliriz — çok daha değerli.
**Mevcut:** Studio'da pratik yapılıyor, badge kazanılıyor ama işveren profil kartında bu görünmüyor.
**Hedef:** İşveren aday kartında "VM: Yetkin ✓, Ekip Yönetimi: Uzman ✓" görsün.

### AKS-3: Seyahat İsteği Ekle (Tier 1 — MVP 1)
**Ne:** "Seyahat etmek ister misiniz?" toggle/dropdown
**Neden:** Apple bunu taşınma'dan AYRI soruyor. Bölge müdürü pozisyonlarında kritik.
**Kolon:** `candidate_work_preferences.travel_willingness` (text: evet / kısmen / hayır)

### AKS-4: Gizlilik Onayı Mekanizması (Launch Blocker)
**Ne:** Kayıt sırasında 2 ayrı tarihli onay: Gizlilik Politikası + Veri Kullanım Politikası
**Neden:** Apple standardı. KVKK md.5 zorunluluğu. Tarih damgası kanıt niteliği taşır.
**Kolon:** `candidates.privacy_consent_at` + `candidates.data_usage_consent_at` (timestamptz)

### AKS-5: Tercih Edilen Dil İşareti (Tier 3 — Güzel dokunuş)
**Ne:** Dil kaydında "Bu benim tercih ettiğim iletişim dilim" toggle
**Neden:** Luxury mağazalarda dil kritik. İşveren hangi dilde iletişim kuracağını bilmeli.
**Kolon:** `candidate_languages.is_preferred` (boolean)

### AKS-6: DEI Beyanı Footer'a Ekle (Tier 1 — Kolay)
**Ne:** Apple'ın footer DEI beyanı gibi bir metin HelloTalent'a eklenmeli
**Neden:** Platform güvenilirliği, eşitlik mesajı, KVKK uyumlu imaj
**Metin önerisi:** "HelloTalent'ta herkes eşittir. Perakende sektörünün gücü farklılıklarımızdan gelir. Tüm adaylara adil ve eşit bir şekilde davranmayı taahhüt ediyoruz."
**Dosya:** shared.js footer bölümü

---

## Karşılaştırma Özeti

| Boyut | Apple | HelloTalent | Avantaj |
|-------|-------|-------------|---------|
| Deneyim derinliği | İş tanımı serbest metin | Sadece unvan + tarih | **Apple** |
| Yetkinlik sistemi | Self-rate 5'li skala | AI + STAR+T + pratik bazlı | **HelloTalent** (doğrulanmış) |
| Sektör odağı | Genel (tüm Apple rolleri) | Perakende-özel filtreler | **HelloTalent** |
| KVKK uyumu | Yaş/cinsiyet toplamaz, 2 ayrı onay | Yaş/cinsiyet topluyor (revize edilecek) | **Apple** (şimdilik) |
| Marka ekosistemi | Yok (tek şirket) | 96 marka, segment, takip | **HelloTalent** |
| Pasif aday | Yok (aktif başvuru) | Beni Öner, pasif keşfedilebilirlik | **HelloTalent** |

**Sonuç:** Apple'ın profil yapısından öğrenilecek çok şey var ama HelloTalent'ın doğrulanmış yetkinlik sistemi ve perakende-özel veri modeli benzersiz avantajlar. Eksikler kapatıldığında (iş tanımı, KVKK, gizlilik onayı) HelloTalent Apple'dan daha güçlü bir aday profili sunabilir.

---

---

## UI/UX İlham Notları (Edit Ekranları)

### Beceri Slider (5 kutucuk)
- Her beceri: isim + 5 kutucuklu bar + çöp kutusu
- Tıkla → seviye seç → renk değişir (açık mavi→koyu mor gradient)
- 3'lü grid layout — kompakt ama okunabilir
- Alt etiket: 1-Başlangıç / 2-Temel / 3-Yetkin / 4-İleri / 5-Uzman
- **HT uyarlama:** Retail skill etiketleri (12 opsiyon) için benzer slider. Ama biz ayrıca Studio pratik verisinden doğrulanmış seviye gösterebiliriz (Apple'da yok)

### Lokasyon Seçimi (Search → Chip)
- Tek arama kutusu: "Şehir, Eyalet veya Ülke/Bölge" placeholder
- Yaz → autocomplete → seç → chip olarak eklenir (x ile sil)
- Seçilen lokasyonlar input altında tag/chip olarak sıralanır
- **HT uyarlama:** 81 il dropdown + ilçe multi-select yerine search→chip. Çok daha temiz. Bizim şehir seçicisi kalabalık görüntü veriyor — bu çözer

### Deneyim Formu
- İşveren: search input (arama ikonu + x butonu)
- İş Unvanı: text input
- Şu Anki İşveren: Evet/Hayır radio (horizontal)
- Tarihler: Ay dropdown + Yıl dropdown (2x2 grid)
- İş Tanımı: textarea (büyük, resize edilebilir)
- "Kaldır" link (mavi, alt kısımda)
- **HT uyarlama:** Mevcut deneyim formumuz benzer ama İş Tanımı textarea'sı YOK — eklenecek

### Dil Seçimi
- Dil dropdown + Yetkinlik dropdown (yan yana)
- "Tercih edilen dil olarak kullanılsın mı?" checkbox
- "Kaldır" + "Dil ekle" linkleri
- **HT uyarlama:** Bizim dil formu zaten benzer, sadece "tercih edilen" checkbox eklenecek

### Eğitim Formu
- Okul: search input
- Öğrenim Alanı: search input
- Derece: dropdown
- Mezun/Tamamlandı: 3 opsiyon radio (Evet / Hayır / Hâlâ Devam Ediyorum)
- "Kaldır" + "Eğitim ekle" linkleri
- **HT uyarlama:** Bizde "Hâlâ devam ediyorum" seçeneği yok — eklenebilir

### İstihdam Türü
- Checkbox (çoklu seçim): Stajyer / Yarı Zamanlı / Tam Zamanlı
- Bizde dropdown (tek seçim) — Apple checkbox tercih etmiş çünkü biri birden fazla türe açık olabilir
- **HT uyarlama:** Çalışma tipi'ni checkbox'a çevir

### İletişim Bilgileri
- "Tercih Edilen Ad (isteğe bağlı)" — inklüzif dokunuş
- Email doğrulama ✓ rozeti
- "Mail adresi ekleyin" / "Telefon numarası ekleyin" — çoklu iletişim
- Adres: Ülke dropdown + Adres satırı 1-2 + İl + Eyalet + Posta Kodu
- **HT uyarlama:** Email doğrulama rozeti eklenebilir (Supabase Auth zaten doğruluyor, UI'da göster)

### CV Upload
- Dosya adı + yüklenme tarihi + "Kaldır" link
- LinkedIn ile otomatik doldurma butonu ("Apply With LinkedIn")
- **HT uyarlama:** LinkedIn import gelecek fazda değerlendirilebilir

### Gizlilik Onayı
- Ülke seçimi dropdown ile ülkeye özel gizlilik metni
- "Adaylar İçin Gizlilik Politikası Onayı" — tarih damgalı
- "Veri Kullanım Politikası Onayı" — tarih damgalı
- **HT uyarlama:** KVKK onayı tarih damgalı kayıt — launch blocker

### Genel Tasarım Prensipleri
- **Beyaz zemin, minimal border** — form alanları rounded, hafif gri border
- **Bölüm başlıkları sol, form alanları sağ** — two-column layout
- **"Düzenle" linkleri sağ üstte** — inline edit, sayfa yenileme yok
- **Mavi CTA butonu, beyaz iptal** — tutarlı renk dili
- **"Kaldır" / "Ekle" linkleri** — destructive action mavi link, kırmızı değil
- **Çok temiz whitespace** — formlar nefes alıyor, sıkışık değil
- **Fresh ve temiz:** Tuna'nın dediği gibi "doldurmak istiyor insan" hissi yaratıyor

---

---

## Netflix Benchmark (3 Nisan 2026)

**Felsefe:** "CV'ni at, gerisini biz hallederiz." Profil formu yok — sadece CV upload, sistem AI ile eşleştirir.

**UI özellikleri:**
- Dark theme (Netflix markası)
- İlk ekran: CV upload modal → "Özgeçmişinizin iş aramasına izin verin"
- Split-pane: sol ilan listesi, sağ ilan detayı
- "Atla" butonu — friction sıfır
- 646 açık iş, tek sayfada filtreleme

**HelloTalent için çıkarım:**
- CV upload → otomatik profil doldurma (Growth fazı — cv-optimize Edge Function zaten parse edebiliyor)
- Split-pane layout: işveren tarafında aday listesi (sol) + aday detay (sağ) için ideal

**Toplamadıkları:** Yaş, cinsiyet, hiçbir detaylı form alanı. Sadece CV.

---

## Stripe Benchmark (3 Nisan 2026)

**Felsefe:** "Tasarım = güven." Minimal, fonksiyonel, her piksel kasıtlı.

**UI özellikleri:**
- İş arama: 4 filtre tek satırda (Keyword + Teams + Office + Remote)
- Tablo listesi: Role | Team | Location (bayrak ikonu ile ülke)
- İlan detay: sol içerik, sağ sticky sidebar (Office, Team, Type + Apply CTA)
- Başvuru formu: tek sayfa, ~10 alan, CV upload 3 yöntem (Attach/Dropbox/Manual)
- "Autofill with MyGreenhouse" — otomatik doldurma
- Breadcrumb: Roles at Stripe / Role details / Application

**Lokasyon filtresi:** Bölge → Şehir hiyerarşisi (North America → Atlanta, Chicago...)
- HelloTalent alternatifi: Marmara → İstanbul, Bursa... veya Apple tarzı search→chip

**Başvuru formu alanları:**
1. First Name / Last Name
2. Email
3. Country + Phone
4. Resume/CV (Attach / Dropbox / Enter manually)
5. Cover Letter (opsiyonel)
6. Country of residence
7. Anticipated work countries (checkbox)
8. LinkedIn URL
9. Most recent school
10. Most recent degree
11. WhatsApp opt-in
12. BrightHire consent (interview recording)
13. EU privacy notice link

**Toplamadıkları:** Yaş, cinsiyet, medeni durum — hiçbiri.

**HelloTalent için çıkarımlar:**
- Tablo formatı aday listesi (Role | Team | Location) → İşveren aday listesine uyarla
- Sticky sidebar → aday kartı detayında kullan
- Bölge→şehir hiyerarşik lokasyon filtresi alternatifi
- Breadcrumb navigasyon (Roles / Details / Apply) → ik.html'de benzer yapı

---

## Üç Platform Ortak Çıkarım

| Konu | Apple | Netflix | Stripe | HelloTalent Aksiyonu |
|------|-------|---------|--------|---------------------|
| Yaş/cinsiyet toplama | ❌ | ❌ | ❌ | Opsiyonel yap, filtreden çıkar |
| CV upload | ✅ | ✅ (tek yol) | ✅ (3 yöntem) | Mevcut — iyileştir |
| İş tanımı serbest metin | ✅ | CV'de | CV'de | **EKLE (Tier 1)** |
| Beceri/yetkinlik | ✅ (5'li skala) | ❌ | ❌ | Studio verisini profilde göster |
| Gizlilik onayı (tarihli) | ✅ (2 ayrı) | ✅ | ✅ (EU notice) | **EKLE (Launch blocker)** |
| Lokasyon seçimi | Search→chip | Keyword | Bölge→şehir | **Search→chip (Apple tarzı)** |
| Otomatik doldurma | LinkedIn import | CV parse | MyGreenhouse | Growth fazı |
| DEI beyanı | ✅ (footer) | ✅ (footer) | ✅ (detaylı) | **EKLE (Tier 1)** |

---

*Son güncelleme: 3 Nisan 2026*
*İlişkili: [[veri-modeli-analiz]], [[yapilacaklar]], [[karar-defteri]]*
