-- FAZ 1E — Studio module copy cleanup
-- Date: 2026-03-27
-- Type: DATA UPDATE (idempotent)
-- Purpose: Align live studio_modules with FAZ 1E copy edits:
--   title case → sentence case, remove unsourced claims, naturalize Turkish copy

-- ═══════════════════════════════════════════════
-- PERFORMANS modules (4) — title case fix
-- ═══════════════════════════════════════════════

UPDATE studio_modules SET
  title = 'Ciro, sepet ortalaması ve dönüşüm oranı'
WHERE slug = 'ciro-sepet-donusum' AND section = 'performans';

UPDATE studio_modules SET
  title = 'Mağaza hedefleri ve günlük operasyon ilişkisi'
WHERE slug = 'magaza-hedefleri-gunluk-operasyon' AND section = 'performans';

UPDATE studio_modules SET
  title = 'KPI düşüşünü yorumlama: nereden başlanır'
WHERE slug = 'kpi-dususu-yorumlama' AND section = 'performans';

UPDATE studio_modules SET
  title   = 'Vaka: Trafik yüksek, satış düşük',
  body_md = 'Senaryo: Mağazanızda haftalık giriş sayısı 2.400, ama satış adedi sadece 180. Dönüşüm oranı %7,5 — sektör ortalamasının yarısı.

Olası Neden 1: Karşılama Eksikliği
Müşteri girdi ama kimse ilgilenmedi. Perakende sektöründe ilk 30 saniyede karşılanmayan müşterinin satın alma olasılığı belirgin şekilde düşer.

Olası Neden 2: Ürün Bulunabilirliği
Beden eksikleri, dağınık raflar veya fiyat etiketi eksikliği müşteriyi kaybettirir. Trafik yüksekse ürün hazırlığı kritiktir.

Olası Neden 3: Deneme Odası Darboğazı
Müşteri denemek istiyor ama sıra var veya oda kirli. Deneme odası deneyimi, dönüşümün en güçlü tetikleyicisidir.

Olası Neden 4: Yanlış Trafik
AVM içi mağazalarda geçiş trafiği yüksek olabilir. Vitrin ve mağaza girişi "doğru müşteriyi" çekiyor mu?

Aksiyon Planı
1. Bir hafta boyunca karşılama oranını ölçün
2. Deneme odası bekleme süresini kaydedin
3. Beden eksiklerini günlük kontrol edin
4. Sonuçları ekiple paylaşın ve bir sonraki hafta karşılaştırın'
WHERE slug = 'vaka-trafik-yuksek-satis-dusuk' AND section = 'performans';


-- ═══════════════════════════════════════════════
-- BİLGİLER modules (4) — copy + title fixes
-- ═══════════════════════════════════════════════

UPDATE studio_modules SET
  title   = 'Profilinizi İşverenlerin Gözünden Düzenleyin',
  summary = 'İşverenler profilinize baktığında ne görüyor? İlk izlenimi iyileştirmenin 5 pratik adımı.',
  body_md = 'İşverenler bir adayın profilini çok kısa sürede tarar. Bu sürede fark yaratmak için:

1. Fotoğrafınızı Ekleyin
Fotoğraflı profiller daha fazla görüntülenir. Profesyonel olmak zorunda değil, ama net ve güncel olmalı.

2. Deneyimlerinizi Eksiksiz Yazın
Her deneyim için: şirket, pozisyon, tarih aralığı ve kısa açıklama. "Mağaza Müdürü" yeterli değil — "12 kişilik ekiple aylık 800K ciro hedefini yönettim" çok daha etkili.

3. Tercihlerinizi Güncel Tutun
Hangi şehirlerde çalışabileceğiniz, müsaitlik durumunuz ve çalışma tipiniz (tam zamanlı, yarı zamanlı) işverenlerin sizi bulmasını doğrudan etkiler.

4. Hedef Pozisyon Belirleyin
Wizard''ın 4. adımında hedef pozisyon seçmek, size uygun pozisyonlarla eşleşme puanınızı artırır. "Mağaza Müdürü" hedefleyen bir aday, bu pozisyon için +18 puan alır.

5. "Beni Öner" Özelliğini Açın
Ayarlar > Görünürlük bölümünden "Beni Öner" aktifken, işverenler sizi arama sonuçlarında görebilir. Kapalıyken profiliniz gizlidir.'
WHERE slug = 'profil-guclu-hale-getirme' AND section = 'bilgiler';

UPDATE studio_modules SET
  title = 'Teklifler ve mesajlar nasıl yönetilir'
WHERE slug = 'teklifler-mesajlar-yonetimi' AND section = 'bilgiler';

UPDATE studio_modules SET
  title = 'Görünürlük ayarları ne işe yarar'
WHERE slug = 'gorunurluk-ayarlari' AND section = 'bilgiler';

UPDATE studio_modules SET
  title   = 'Stüdyo''dan en iyi nasıl faydalanılır',
  body_md = 'Stüdyo, HelloTalent''ın kariyer gelişim alanıdır. Dört bölümden oluşur ve her biri farklı bir ihtiyaca cevap verir.

Yetenek — Rolünde En İyisi Ol
29 yetkinlik ve 289 soru ile mülakat hazırlığı yapabilirsiniz. Bir rol seçin, o role ait yetkinlikleri inceleyin, sorularla pratik yapın. Ücretsiz hesapla 2 yetkinliğe erişebilirsiniz. Farklı roller seçerek farklı yetkinlikleri keşfedebilirsiniz.

Koç — Uzmanlardan Öğren
Sektör deneyimi olan koçların yazdığı makaleler. Mülakat ipuçları, kariyer rehberleri, yetkinlik analizleri. Kategoriye göre filtreleyebilir, beğenebilirsiniz.

Performans — Rakamları Öğren
Mağaza KPI''ları, satış matematiği, dönüşüm oranları. Bu bölüm, sayıları anlayan ve anlatan adaylar yetiştirmek için tasarlandı.

HelloTalent''ten Bilgiler — Platformu Tanı
Profilinizi nasıl güçlendirirsiniz, mesajları nasıl yönetirsiniz, görünürlük ayarları ne işe yarar. Platformu verimli kullanmanız için.

Haftada bir modül tamamlamak bile mülakat hazırlığınızda somut fark yaratır.'
WHERE slug = 'studyodan-en-iyi-faydalanma' AND section = 'bilgiler';
