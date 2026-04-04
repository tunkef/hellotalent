# Aday Kullanıcı Yolculuğu

## Genel Akış

```
KEŞIF → KAYIT → PROFİL → GELİŞİM → EŞLEŞME → GÖRÜŞME → İŞE BAŞLAMA
```

---

## 1. Keşif
**Tetikleyici:** Sosyal medya, referans, Google araması, mağaza içi tanıtım

**Temas noktaları:**
- LinkedIn / X paylaşımları
- Sektör etkinlikleri
- Mevcut kullanıcı referansı
- Newsletter
- Google organic (SEO)

**Hedef:** hellotalent.ai → index.html → "Aday mısın?" → aday.html

---

## 2. Kayıt
**Sayfa:** aday.html → giris.html (aday tab)

**Akış:**
```
"Ücretsiz Başla" CTA
  → giris.html Aday tab
  → Google OAuth veya Email/Şifre
  → profil.html (ilk giriş → wizard başlar)
```

**Kritik metrik:** Kayıt conversion oranı (landing → kayıt)

---

## 3. Profil Tamamlama
**Sayfa:** profil.html → profil-wizard.js

**4 Adımlı Wizard:**
```
Adım 1: Kişisel Bilgiler
  → Ad soyad, telefon, cinsiyet, doğum yılı, lokasyon
  → LinkedIn URL (opsiyonel)

Adım 2: Deneyim
  → Şirket, marka, pozisyon, tarih aralığı
  → "Devam ediyorum" toggle
  → Çoklu deneyim ekleme

Adım 3: Eğitim & Dil & Sertifika
  → Eğitim seviyesi, okul, bölüm
  → Diller ve seviyeleri
  → Sertifikalar

Adım 4: Tercihler
  → Hedef roller (rol ailesi + unvan)
  → Çalışma tipi (tam/yarı/freelance)
  → Tercih şehirler/ilçeler
  → Ne zaman başlayabilir
  → Kariyer yönü (yukarı/yatay/segment değişim)
```

**Profil tamamlama puanı:** >= %45 threshold → "Beni Öner" aktif olabilir

**Kritik metrik:** Profil tamamlama oranı, CV yükleme oranı

---

## 4. Gelişim (Engagement Loop)
**Sayfa:** profil.html → Studio, Markalar, Yetkinlik panelleri

**Günlük döngü:**
```
Giriş yap
  → Genel Bakış dashboard (streak, badge, öneriler)
  → Studio: STAR+T pratik yap
  → Badge kazan, streak koru
  → Coach içerikleri oku
  → Markalar keşfet, takip et
```

**Retention mekanizmaları:**
- Streak sistemi (günlük seri)
- Badge koleksiyonu (9 rozet)
- AI değerlendirme (premium)
- Coach içerikleri (yeni içerik bildirimi)
- Spaced repetition (tekrar önerisi)

**Kritik metrik:** DAU/MAU, streak uzunluğu, Studio pratik sayısı

---

## 5. Eşleşme (Pasif)
**Aday aktif bir şey yapmaz** — sistem çalışır.

```
İşveren pozisyon açar
  → Sistem adayları skorlar (12 sinyal, 0-100)
  → Aday listeye düşer
  → Premium "Beni Öne Çıkar" → üst sıra
  → İşveren profili inceler
```

**Aday ne görür?**
- "Kim Baktı" — profilini inceleyen işveren sayısı
- Mesaj geldiğinde bildirim (email + in-app)
- Teklifler bölümünde kampanyalar

**Aday ne GÖRMEZ?**
- Hangi pozisyonlara önerildiği
- Kaç kez listeye düştüğü
- Hangi işverenin aradığı (mesaj atmadıysa)

---

## 6. Görüşme
**Tetikleyici:** İşveren mesaj atar

```
İşveren DM → Aday inbox'ta görür → Reply atar → Telefon/görüşme organize
```

**Platform dışı:** Görüşme ve işe alım süreci platform dışında devam eder (şimdilik)

---

## 7. Freemium → Premium Dönüşüm Noktaları

| Tetikleyici | Premium CTA |
|-------------|-------------|
| AI değerlendirme kullandı (1 hak bitti) | "Premium ile sınırsız AI değerlendirme" |
| CV optimize kullandı (1 hak bitti) | "Premium ile ayda 3 optimize" |
| Beni Öne Çıkar denemek istiyor | "Premium ile öncelikli görünürlük" |
| Teklifler bölümünde premium avantajlar | "Premium ile tüm avantajlara eriş" |

---

*İlişkili: [[aday-persona]], [[feature-map]], [[is-modeli]]*
