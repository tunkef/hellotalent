-- Studio Phase 2b — Seed content for Performans + HelloTalent'ten Bilgiler
-- Date: 2026-03-26
-- Type: SEED
-- Purpose: Initial published modules to make Studio sections feel alive

-- ═══════════════════════════════════════════════
-- PERFORMANS — Retail KPI Literacy (4 modules)
-- ═══════════════════════════════════════════════

INSERT INTO studio_modules (section, module_type, slug, title, summary, body_md, duration_minutes, sort_order, status, published_at)
VALUES (
  'performans', 'lesson', 'ciro-sepet-donusum',
  'Ciro, sepet ortalaması ve dönüşüm oranı',
  'Perakendecinin üç temel metriğini anlayın. Bu sayıları okuyan, mağazasının hikayesini anlatır.',
  'Perakendede üç rakam her şeyi anlatır: ciro, sepet ortalaması ve dönüşüm oranı.

Ciro (Toplam Satış)
Günlük, haftalık veya aylık toplam satış tutarıdır. Tek başına bir şey söylemez — karşılaştırma gerektirir. Geçen haftayla, geçen yılın aynı haftasıyla, hedefle karşılaştırın.

Sepet Ortalaması
Toplam ciroyu işlem sayısına bölün. Müşteri başına harcamayı gösterir. Düşük sepet ortalaması, çapraz satış fırsatını işaret eder: "Bu ürünle şu da çok tercih ediliyor" cümlesi sepeti büyütür.

Dönüşüm Oranı
Mağazaya giren kişi sayısına karşı satış yapılan kişi sayısıdır. %100 dönüşüm yoktur, ama %15 ile %25 arasındaki fark büyük bir gelir farkı yaratır. Dönüşümü artırmak için: karşılama kalitesi, ihtiyaç analizi ve deneme odası yönlendirmesi kritiktir.

Bu üç metriği birlikte okuyun. Ciro düştüyse: sepet mi düştü, dönüşüm mü düştü, trafik mi azaldı? Cevap, aksiyon planınızı belirler.',
  8, 1, 'published', now()
),
(
  'performans', 'lesson', 'magaza-hedefleri-gunluk-operasyon',
  'Mağaza hedefleri ve günlük operasyon ilişkisi',
  'Aylık hedef nasıl günlük aksiyona dönüşür? Hedef takibini rutine dönüştürmenin pratik yolu.',
  'Aylık hedefiniz 500.000 TL. Bugün ne yapmanız gerekiyor?

Hedefi Günlere Bölün
Ayda 26 iş günü varsa, günlük hedefiniz ~19.200 TL. Ama her gün aynı değildir: hafta sonu trafiği yüksektir, pazartesi düşüktür. Geçmiş verilerden gün bazlı ağırlık çıkarın.

Saat Bazlı Kontrol
Günün ortasında hedefinizin neresinde olduğunuzu bilin. Öğlen %40 altındaysanız, öğleden sonra ekstra aksiyona geçin: vitrin değişikliği, aktif karşılama, sepet büyütme odaklı konuşmalar.

Ekiple Paylaşın
Hedef sadece müdürün bildiği bir sayı olmamalı. Ekibin günlük hedefi bilmesi, sahiplenmeyi artırır. "Bugün 8 işlemle kapatabiliriz" somut ve motive edicidir.

Günlük Kapanış Alışkanlığı
Gün sonunda 3 dakika ayırın: hedef tuttu mu, neden tutmadı, yarın ne farklı yapacağız? Bu alışkanlık, aylık sürprizleri ortadan kaldırır.',
  6, 2, 'published', now()
),
(
  'performans', 'lesson', 'kpi-dususu-yorumlama',
  'KPI düşüşünü yorumlama: nereden başlanır',
  'Satışlar düştüğünde panik değil analiz yapın. Doğru soruyu sormak, doğru aksiyonu başlatır.',
  'Satışlar düştüğünde ilk tepki genellikle "neden?" sorusudur. Ama doğru soru "nerede?" ile başlar.

Adım 1: Hangi Metrik Düştü?
Ciro düştüyse: trafik mi azaldı, dönüşüm mü düştü, sepet mi küçüldü? Üçü farklı aksiyonlar gerektirir.

Adım 2: Ne Zaman Başladı?
Dün mü, geçen hafta mı, ay başından beri mi? Zamanlama, nedeni işaret eder. Ani düşüş kampanya bitişi veya hava durumu olabilir. Kademeli düşüş operasyonel bir sorun olabilir.

Adım 3: Karşılaştırma Yap
Geçen yılın aynı dönemiyle karşılaştırın. Mevsimsel düşüş mü yoksa gerçek bir performans kaybı mı?

Adım 4: Mikro Verilere Bak
Ürün kategorisi bazında kırılım yapın. Belki genel ciro düştü ama aksesuar satışları arttı — bu, müşteri profilinin değiştiğini gösterir.

En Önemli Kural
Veriye duygusuz bakın. "İyi" veya "kötü" diye başlamayın, "ne değişti?" diye başlayın. Veri size yol gösterir, yargı değil.',
  7, 3, 'published', now()
),
(
  'performans', 'lesson', 'vaka-trafik-yuksek-satis-dusuk',
  'Vaka: Trafik yüksek, satış düşük',
  'Mağazaya giren çok ama satış düşük. Bu senaryonun kök nedenlerini ve çözüm yollarını inceleyin.',
  'Senaryo: Mağazanızda haftalık giriş sayısı 2.400, ama satış adedi sadece 180. Dönüşüm oranı %7,5 — sektör ortalamasının yarısı.

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
4. Sonuçları ekiple paylaşın ve bir sonraki hafta karşılaştırın',
  10, 4, 'published', now()
);


-- ═══════════════════════════════════════════════
-- HELLOTALENT'TEN BİLGİLER — Platform Enablement (4 modules)
-- ═══════════════════════════════════════════════

INSERT INTO studio_modules (section, module_type, slug, title, summary, body_md, duration_minutes, sort_order, status, published_at)
VALUES (
  'bilgiler', 'article', 'profil-guclu-hale-getirme',
  'Profilinizi İşverenlerin Gözünden Düzenleyin',
  'İşverenler profilinize baktığında ne görüyor? İlk izlenimi iyileştirmenin 5 pratik adımı.',
  'İşverenler bir adayın profilini çok kısa sürede tarar. Bu sürede fark yaratmak için:

1. Fotoğrafınızı Ekleyin
Fotoğraflı profiller daha fazla görüntülenir. Profesyonel olmak zorunda değil, ama net ve güncel olmalı.

2. Deneyimlerinizi Eksiksiz Yazın
Her deneyim için: şirket, pozisyon, tarih aralığı ve kısa açıklama. "Mağaza Müdürü" yeterli değil — "12 kişilik ekiple aylık 800K ciro hedefini yönettim" çok daha etkili.

3. Tercihlerinizi Güncel Tutun
Hangi şehirlerde çalışabileceğiniz, müsaitlik durumunuz ve çalışma tipiniz (tam zamanlı, yarı zamanlı) işverenlerin sizi bulmasını doğrudan etkiler.

4. Hedef Pozisyon Belirleyin
Wizard''ın 4. adımında hedef pozisyon seçmek, size uygun pozisyonlarla eşleşme puanınızı artırır. "Mağaza Müdürü" hedefleyen bir aday, bu pozisyon için +18 puan alır.

5. "Beni Öner" Özelliğini Açın
Ayarlar > Görünürlük bölümünden "Beni Öner" aktifken, işverenler sizi arama sonuçlarında görebilir. Kapalıyken profiliniz gizlidir.',
  5, 1, 'published', now()
),
(
  'bilgiler', 'article', 'teklifler-mesajlar-yonetimi',
  'Teklifler ve mesajlar nasıl yönetilir',
  'İşveren mesajlarına nasıl yanıt verilir, teklifler nasıl değerlendirilir, thread''ler nasıl çalışır.',
  'HelloTalent''ta işverenler size doğrudan mesaj gönderebilir. Bu mesajlar genellikle bir pozisyon teklifi veya ön görüşme davetidir.

Mesajları Görüntüleyin
Profil sayfanızda Mesajlar panelinden tüm thread''lerinizi görebilirsiniz. Okunmamış mesajlar mavi nokta ile işaretlenir.

Yanıt Verin
Her mesaja yanıt yazabilirsiniz. Yanıtlarınız işverene anında iletilir. Kısa ve profesyonel yanıtlar en etkili olanlardır: "Merhaba, pozisyonla ilgileniyorum. Uygun olduğum saatleri paylaşabilir miyim?"

Bildirim Ayarları
Yeni mesaj geldiğinde e-posta bildirimi alırsınız. Bu bildirimi Ayarlar > Bildirimler bölümünden yönetebilirsiniz.

Mesajları Silme
Bir thread''i silmek istiyorsanız, mesaj listesinde kaydırarak çöp kutusu ikonuna basın. Silinen mesajlar, işveren yeni bir mesaj gönderirse yeniden aktifleşir.

İpucu
Mesajlara 24 saat içinde yanıt veren adaylar, işverenler tarafından daha aktif ve ilgili olarak değerlendiriliyor.',
  4, 2, 'published', now()
),
(
  'bilgiler', 'article', 'gorunurluk-ayarlari',
  'Görünürlük ayarları ne işe yarar',
  'Profilinizi kim görebilir, "Beni Öner" ne yapar, mevcut işverenden gizlenme nasıl çalışır.',
  'HelloTalent''ta üç temel görünürlük kontrolünüz var:

Beni Öner (Ana Görünürlük)
Bu ayar açıkken, profiliniz işverenlerin aday arama sonuçlarında görünür. Kapatırsanız hiçbir işveren sizi bulamaz — mevcut konuşmalarınız devam eder ama yeni eşleşme olmaz.

Aktif Olarak İş Arıyorum
Bu işaret, işverenlere "şu an aktif" olduğunuzu söyler. Aktif arayan adaylar arama sonuçlarında daha yüksek puanla çıkar (+20 puan). Hemen iş değiştirmek istemiyorsanız bile açık tutabilirsiniz — fırsatları görmek için.

Mevcut İşverenden Gizle
Şu an çalıştığınız şirkete ait işverenler sizi arama sonuçlarında göremez. Bu özellik, iş ararken mevcut işvereninizin haberi olmaması için tasarlanmıştır. Gizleme şirket bazlıdır, marka bazlı değildir.

Önemli: Profil Tamamlama
Görünürlük ayarlarınız açık olsa bile, profil tamamlama oranınız %45 altındaysa işverenlere görünmezsiniz. Önce profilinizi tamamlayın, sonra görünürlüğü açın.',
  4, 3, 'published', now()
),
(
  'bilgiler', 'article', 'studyodan-en-iyi-faydalanma',
  'Stüdyo''dan en iyi nasıl faydalanılır',
  'Stüdyo''nun dört bölümünü tanıyın ve kariyer gelişiminiz için en verimli kullanma yollarını keşfedin.',
  'Stüdyo, HelloTalent''ın kariyer gelişim alanıdır. Dört bölümden oluşur ve her biri farklı bir ihtiyaca cevap verir.

Yetenek — Rolünde En İyisi Ol
29 yetkinlik ve 289 soru ile mülakat hazırlığı yapabilirsiniz. Bir rol seçin, o role ait yetkinlikleri inceleyin, sorularla pratik yapın. Ücretsiz hesapla 2 yetkinliğe erişebilirsiniz. Farklı roller seçerek farklı yetkinlikleri keşfedebilirsiniz.

Koç — Uzmanlardan Öğren
Sektör deneyimi olan koçların yazdığı makaleler. Mülakat ipuçları, kariyer rehberleri, yetkinlik analizleri. Kategoriye göre filtreleyebilir, beğenebilirsiniz.

Performans — Rakamları Öğren
Mağaza KPI''ları, satış matematiği, dönüşüm oranları. Bu bölüm, sayıları anlayan ve anlatan adaylar yetiştirmek için tasarlandı.

HelloTalent''ten Bilgiler — Platformu Tanı
Profilinizi nasıl güçlendirirsiniz, mesajları nasıl yönetirsiniz, görünürlük ayarları ne işe yarar. Platformu verimli kullanmanız için.

Haftada bir modül tamamlamak bile mülakat hazırlığınızda somut fark yaratır.',
  5, 4, 'published', now()
);
