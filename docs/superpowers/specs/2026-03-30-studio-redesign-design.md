# Stüdyo Redesign — Design Spec
> Tarih: 30 Mart 2026 | Onay: Tuna Kefeli

## 1. Amaç
Stüdyo panelini LinkedIn Learning / Udemy seviyesinde bir öğrenme deneyimine dönüştürmek.

## 2. Ekran Akışı
```
lobby (learning path) → course_detail (tab'lı) → practice (focus mode) → completion → session_complete
```
Kaldırılan: `star_intro` (dev yıldız ekranı), `role_select` (ayrı ekran → lobby içine taşınır)

## 3. Dosya Rename
`profil-mulakatkocu.js` → `profil-studio.js`
- profil.html script tag güncelle
- Test dosyalarındaki referanslar güncelle
- CURRENT-STATE.md, ARCHITECTURE.md güncelle
- `window._htLoadMulakat` → `window._htLoadStudio`
- Cache-bust version ekle

## 4. Lobby — Learning Path

Layout: Tam panel genişliği, bento grid

- Hero card (vermillion, span-3): Aktif rol + genel ilerleme + streak + "Rol Değiştir"
- Rol seçimi: ilk girişte hero içinde inline dropdown, sonra "Rol Değiştir" link
- Yetkinlik kartları (bento grid, span-1): Her yetkinlik bir kurs kartı
  - Yetkinlik adı (Bricolage Grotesque)
  - KF kategorisi alt başlık
  - Mini progress bar
  - Süre badge (~7 dk)
  - Durum: tamamlandı / devam ediyor / kilitli
  - Sıralı: tamamlanan üstte, aktif ortada, kilitli altta
- STAR+T referans kartı (span-1, navy): Küçük, tıkla-expand
- Badge strip altta

## 5. Course Detail — Yetkinlik Detay

Layout: Tam genişlik, tab yapısı

- Compact hero (navy gradient): Yetkinlik adı + KF + ilerleme + süre + "Pratiğe Başla →"
- Tab bar: Genel Bakış | Sorular | Notlarım
- Genel Bakış: Tanım, Neden Önemli, Sinyal kartları (2 kolon, tekrar eden başlık yok), STAR+T mini kart
- Sorular: Temiz liste, tema başlığı sadece ilk seferde, tamamlanmış → yeşil check
- Notlarım: Journal + AI feedback geçmişi

## 6. Practice — Focus Mode

Layout: Tam genişlik, açık arka plan (beyaz/cream, dark: koyu ama navy değil)

- Üst bar (sabit): ← Geri | Progress bar (3/10) | Yetkinlik adı | Atla
- Ortada soru kartı (max-width: 720px, ortada): Tema + soru metni (Plus Jakarta Sans 17px)
- Alt action bar (sabit): İpucu | Hazırlık Notlarım | Sonraki →
- Sağdan drawer (ihtiyaç anında): STAR+T, sinyaller, koç notları. Mobilde alt sheet.

## 7. Genişlik Politikası
Tüm ekranlar panel genişliğinde (diğer panellerle aynı, max-width yok).
Pratik soru kartı max-width: 720px ile ortada.

## 8. Design System
- Bento grid skill kuralları (16px radius, 24px hero, standart shadows)
- Renkler: design token'lar — navy sadece accent kartlarda
- Fontlar: Bricolage Grotesque / Plus Jakarta Sans / DM Mono

## 9. Kapsam Dışı
- Performans modülü (Çok Yakında)
- HelloTalent Bilgileri modülü (Çok Yakında)
- Koç feed (mevcut kalır)
- AI feedback pipeline (mevcut çalışıyor)
- Streak mekanizması (mevcut çalışıyor)
