# İşveren Persona

## Kim?
Türkiye'de perakende operasyonu olan şirketlerin İK departmanları ve mağaza yöneticileri.

---

## Segmentler

### 1. Büyük Perakende Zinciri (Enterprise)
- **Örnekler:** Inditex (Zara, Pull&Bear), LCW, Boyner, FLO
- **Mağaza sayısı:** 100+
- **İK yapısı:** Merkez İK + bölge İK koordinatörleri
- **İhtiyaç:** Sürekli hacimli işe alım, turnover yönetimi
- **HelloTalent değeri:** Filtrelenmiş aday havuzu, kampanya ile employer branding
- **Karar verici:** İK Direktörü / İşe Alım Müdürü

### 2. Orta Ölçekli Marka (Growth)
- **Örnekler:** Network, Ipekyol, Vakko, Derimod
- **Mağaza sayısı:** 20-100
- **İK yapısı:** 1-3 kişilik İK ekibi
- **İhtiyaç:** Hedefli, kaliteli adaylara ulaşma
- **HelloTalent değeri:** Headhunter maliyeti olmadan doğru adayı bulma
- **Karar verici:** İK Müdürü / Genel Müdür

### 3. Lüks Segment (Premium)
- **Örnekler:** Louis Vuitton, Chanel, Beymen, Harvey Nichols
- **Mağaza sayısı:** 5-30
- **İK yapısı:** Küçük ama seçici ekip
- **İhtiyaç:** Çok spesifik profil (luxury deneyim, dil, temsil kabiliyeti)
- **HelloTalent değeri:** Segment filtresi ile luxury deneyimli adayları anında bul
- **Karar verici:** Retail Director / İK Müdürü

### 4. Headhunter Firma (B2B)
- **Örnekler:** Perakende odaklı boutique headhunter'lar
- **İhtiyaç:** Müşterileri için aday havuzu
- **HelloTalent değeri:** Kendi veritabanını HelloTalent ile zenginleştirme
- **Kısıtlama:** Admin onayı zorunlu, outsourcing firmaları (Manpower vb.) giremez
- **Karar verici:** Firma sahibi / Kıdemli danışman

---

## İşveren Yaşam Döngüsü

```
Keşif → Lead Form → Admin Onay → Kayıt → Şirket Profil → Pozisyon Aç → Aday Gör → İletişim
  │         │           │          │          │              │            │           │
  │         │           │          │          │              │            │           └─ Mesaj/arama
  │         │           │          │          │              │            └─ Önerilen adayları incele
  │         │           │          │          │              └─ Filtreler: segment, rol, deneyim...
  │         │           │          │          └─ Marka bilgileri, ekip atamaları
  │         │           │          └─ Şirket emaili ile giriş
  │         │           └─ HelloTalent admin kontrol (outsourcing reddi)
  │         └─ isveren.html lead formu + otomatik mail
  └─ Sosyal medya, telefon, referans
```

---

## Üyelik Modeli

### Freemium (14 Gün Demo)
- Sisteme giriş, demo ekran görüntüleme
- Fake/örnek aday profilleri ile sistemin nasıl çalıştığını görme
- Şirket profili oluşturma
- **Aday görüntüleme YOK** — gerçek adaylara erişim yok

### Ücretli Üyelik
- Pozisyon açma ve aday önerileri alma
- Aday profil görüntüleme (aylık/haftalık limit)
- Direkt mesajlaşma
- Ekip yönetimi (admin/recruiter/viewer rolleri)
- Kampanya yayınlama (ek ücretli)
- Takipçi sayısı görme (total, bireysel değil)

---

## İşveren Ekip Rolleri

| Rol | Yetkiler |
|-----|----------|
| **Admin** | Tam erişim: pozisyon, aday, team, kampanya, fatura |
| **Recruiter** | Pozisyon açma, aday görüntüleme, mesaj atma |
| **Viewer** | Sadece okuma: aday listesi, istatistikler |

---

## Kritik İşveren Akışı: Pozisyon → Aday Önerisi

```
1. İşveren pozisyon açar
   ├─ Rol: Mağaza Müdürü
   ├─ Segment tercihi: Sportswear
   ├─ Deneyim: Min 5 yıl
   ├─ Lokasyon: İstanbul, Anadolu Yakası
   ├─ Ekip yönetimi: Min 10 kişi
   └─ Ek tercihler: (soft signal, hard filter değil)

2. Sistem eşleştirir
   ├─ 12 sinyalli skorlama (0-100)
   ├─ Premium "Beni Öne Çıkar" adaylar üstte
   ├─ Her aday sadece 1 kez gösterilir (freshness)
   └─ Aday çeşitliliği: filtre genişletme önerisi

3. İşveren inceler
   ├─ Profil kartı görüntüleme
   ├─ Shortlist'e ekleme
   ├─ Direkt mesaj atma
   └─ "Bu tip daha çok" / "Bu tipi azalt" feedback

4. Görüntüleme limiti
   └─ Aylık/haftalık kota (tier'a göre)
```

---

## İşveren İçin Kampanya Sistemi

- **Amaç:** Employer branding + aday çekme
- **Türler:** Mağaza açılışı duyurusu, kariyer fırsatları, marka tanıtımı
- **Görünürlük:** Aday tarafında "Teklifler" bölümünde
- **Model:** Ücretli (fiyatlandırma henüz belirlenmedi)
- **Kısıtlama:** Admin tarafından yayın onayı

---

## Outsourcing / Kötüye Kullanım Önlemi

1. **Admin onay kapısı** — Her yeni şirket kaydı admin onayına düşer
2. **Provizyon sistemi** — Ödeme yapıldıysa onay beklerken provizyonda kalır
3. **Red listesi** — Toplu outsourcing firmaları (Manpower, Adecco vb.) reddedilir
4. **Sebep:** Bu firmalar aday çalar, kendi havuzlarını doldurur, platform değerini düşürür

---

*İlişkili: [[aday-persona]], [[kullanici-yolculugu-isveren]], [[is-modeli]]*
