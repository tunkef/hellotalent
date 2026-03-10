# Wizard Profil Düzenleme — Tasarım Dokümanı

**Tarih:** 2026-03-10
**Durum:** Onaylandı

---

## Problem

Aday profili 5 bilgi kartından oluşuyor (Kişisel, Kariyer, Eğitim, Tercihler, Lokasyon). Tüm kartlar tek sayfada alt alta. Aday yukarıda bir alan unutunca en aşağıdan tekrar yukarı çıkmak zorunda. Mobil ağırlıklı kullanım — kötü UX.

## Çözüm

LinkedIn onboarding tarzı **5 adımlı wizard**. Tek kart görünür, İleri/Geri ile geçiş, adım bazlı validasyon.

---

## Genel Yapı

- 5 adım: ① Kişisel → ② Kariyer → ③ Eğitim → ④ Tercihler → ⑤ Lokasyon
- Bir seferde tek kart görünür
- Progress bar üstte (sticky)
- İleri/Geri butonları altta (sticky bottom bar)
- İleri'ye basınca aktif adım validate edilir; hata varsa adımda kalınır
- Son adımda İleri yerine "Kaydet" butonu
- card-view-mode / edit-mode toggle kaldırılır — wizard'da her zaman edit mode

## Süreç Başlangıcı — Bilgilendirme Mesajı

Wizard açılmadan önce (ilk adımdan hemen önce veya overlay olarak) aday şu mesajı görür:

```
┌─────────────────────────────────────────────────┐
│  📋  Profilini Eksiksiz Doldur                  │
│                                                 │
│  Girdiğin bilgiler, işverenler tarafından       │
│  sana en uygun pozisyonları bulmak için          │
│  kullanılacak.                                   │
│                                                 │
│  Deneyimlerin, dil bilgin, maaş beklentin       │
│  ve lokasyon tercihlerini eksiksiz               │
│  doldurman, doğru fırsatlarla                   │
│  eşleşmeni sağlar.                              │
│                                                 │
│  Bilgilerini istediğin zaman                     │
│  güncelleyebilirsin.                             │
│                                                 │
│         [ Başlayalım → ]                        │
└─────────────────────────────────────────────────┘
```

Bu mesaj:
- İlk kez profil dolduran adaylara her zaman gösterilir
- Profili zaten kayıtlı olan geri dönen adaylara gösterilmez (direkt wizard açılır)

## Progress Bar

- Tamamlanan adım: yeşil daire + ✓, tıklanabilir
- Aktif adım: lacivert daire + pulse animasyonu
- Kilitli adım: gri daire, tıklanamaz
- Adımlar arası çizgi bağlantısı (completed = yeşil, diğer = gri)
- Mobilde adım isimleri gizlenir, sadece numaralı daireler görünür

## Bottom Navigation Bar

- Sticky bottom, güvenli alan desteği (safe-area-inset-bottom)
- Sol: "Geri" butonu (ilk adımda gizli)
- Sağ: "İleri" butonu (son adımda "Kaydet" olur)
- İleri butonu primary renk, Geri butonu secondary/ghost

## Animasyonlar

- İleri: mevcut kart sola kayar, yeni kart sağdan gelir (translateX, 300ms ease)
- Geri: mevcut kart sağa kayar, yeni kart soldan gelir
- Swipe desteği yok (yanlışlıkla kayma riski)

---

## Adım Detayları

### ① Kişisel Bilgiler

Zorunlu: Ad Soyad, Telefon, Cinsiyet, Yaş Aralığı, İl
Opsiyonel: Profil Fotoğrafı

### ② Kariyer Deneyimi

İki yol:

**A) İlk deneyim kutusu:**
"Henüz iş deneyimim yok, ilk adımımı bu fırsatla atmak istiyorum."
Kutu işaretlenirse validasyon geçer. Supabase'de `ilk_deneyim = true`.

**B) Deneyim kartları (en az 1 zorunlu):**
- Her kart: Şirket, Pozisyon, Başlangıç Ay/Yıl zorunlu
- "Halen çalışıyorum" işaretli değilse: Bitiş Ay/Yıl + Ayrılma Nedeni zorunlu
- İlk kart "Halen çalışıyorum" olabilir; ek kartlarda tüm alanlar zorunlu
- "İlk deneyim" kutusu + deneyim kartı birlikte olamaz (kart eklenince kutu kalkar)

### ③ Eğitim Bilgileri

Zorunlu: Eğitim Seviyesi, Mezuniyet Yılı, Okul, Bölüm
Opsiyonel: Ekstra Eğitimler/Sertifikalar (max 5), Diller (max 5)

### ④ Tercihlerim

Zorunlu: Hedef Pozisyon (multi-select), Müsaitlik, Çalışma Şekli, Maaş Beklentisi, Mağaza Segmenti
Opsiyonel: İlgilendiğim Markalar

### ⑤ Lokasyon Tercihleri

Zorunlu: En az 1 şehir seçili

---

## Geri Dönen Aday (Güncelleme Akışı)

Profili kayıtlı aday tekrar geldiğinde:

1. Bilgilendirme mesajı gösterilmez (zaten doldurup kaydetmiş)
2. Wizard açılır, tüm adımlar "completed" ✅ olarak görünür
3. Tüm alanlar `loadProfile()` ile doldurulur
4. Progress bar'daki herhangi bir adıma tıklayarak doğrudan o adıma gidebilir
5. İstediği değişikliği yapar
6. Son adımda veya istediği adımda "Kaydet" ile günceller

Bu sayede 2 ay sonra gelen aday, sadece değiştirmek istediği bölüme tıklar ve günceller.

---

## Validasyon Stratejisi

**İki katmanlı (defense in depth):**

1. **Adım bazlı:** İleri'ye basınca `validateCard(aktifAdım)` çalışır
2. **Global:** Kaydet'e basınca `saveProfile()` içindeki validasyon tüm adımları kontrol eder

Hata gösterimi: ilgili input kırmızı border, üstte hata mesajı, otomatik scroll.

## localStorage Persist

```json
{
  "wizard_step": 2,
  "wizard_draft": { ... }
}
```

- Her İleri geçişinde mevcut adım verileri yazılır
- Sayfa yenilenince wizard_step'e göre doğru adıma dönülür
- Kaydet başarılı → localStorage temizlenir

---

## Supabase `candidates` Tablosu

| Kolon | Tip | HR Filtre |
|-------|-----|-----------|
| id | uuid PK | — |
| user_id | text unique | — |
| ad_soyad | text | Arama |
| telefon | text | — |
| cinsiyet | text | Filtre |
| yas_araligi | text | Filtre |
| adres_il | text | Filtre |
| profil_foto | text | — |
| deneyimler | jsonb | Arama |
| ilk_deneyim | boolean | Filtre |
| egitim_seviye | text | Filtre |
| okul | text | Arama |
| bolum | text | Arama |
| mezun_yil | integer | Filtre |
| ekstra_egitimler | jsonb | Arama |
| diller | jsonb | Filtre |
| pozisyon | jsonb | Filtre |
| musaitlik | text | Filtre |
| calisma_tipi | jsonb | Filtre |
| maas_beklenti | text | Filtre |
| segmentler | jsonb | Filtre |
| ilgilenen_markalar | jsonb | Arama |
| tercih_sehirler | jsonb | Filtre |
| created_at | timestamptz | Sıralama |
| updated_at | timestamptz | Sıralama |

### JSONB Yapıları

**deneyimler:**
```json
[{"sirket":"Zara","pozisyon":"Mağaza Müdürü","baslangic_ay":3,"baslangic_yil":2021,"devam_ediyor":true,"bitis_ay":null,"bitis_yil":null,"ayrilma_nedeni":null}]
```

**diller:**
```json
[{"dil":"İngilizce","seviye":"İleri"},{"dil":"Almanca","seviye":"Başlangıç"}]
```

**ekstra_egitimler:**
```json
[{"egitim_adi":"Perakende Yönetimi","kurum":"İstanbul Ticaret Üni.","yil":2022}]
```

---

## Mobil Öncelikler

- Progress bar: compact, sadece numaralı daireler
- Bottom bar: sticky, safe-area desteği
- Slide animasyonları: 300ms ease
- Touch: swipe yok, buton ile geçiş
- Font ve spacing: mobil-uyumlu (mevcut responsive yapı korunur)
