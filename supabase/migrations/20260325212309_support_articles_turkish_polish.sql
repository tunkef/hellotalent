-- Support Articles — Turkish copy polish
-- Date: 2026-03-26
-- Type: DATA UPDATE (no schema changes)
-- Purpose: Replace ASCII Turkish seed copy with proper Turkish characters
--          and more natural, helpful article content.

UPDATE support_articles SET
  title = 'Hesabıma giriş yapamıyorum',
  summary = 'Şifre sıfırlama, e-posta doğrulama ve giriş sorunları için adımlar.',
  body_md = '## Giriş Sorunları

**Şifreni mi unuttun?**
Giriş sayfasındaki "Şifremi Unuttum" bağlantısına tıkla. Kayıtlı e-posta adresine şifre sıfırlama linki gönderilecek.

**E-posta doğrulaması yapmadın mı?**
Kayıt olurken girdiğin e-postaya gelen doğrulama mailini kontrol et. Gelen kutusunda bulamıyorsan spam veya gereksiz klasörünü de incele.

**Google veya LinkedIn ile giriş yapamıyor musun?**
Kayıt olduğun yöntemle giriş yaptığından emin ol. Örneğin Google ile kayıt olduysan, giriş sayfasında da "Google ile Giriş Yap" butonunu kullan.

**Hâlâ sorun mu yaşıyorsun?**
Aşağıdaki butona tıklayarak bir destek talebi oluşturabilirsin.'
WHERE slug = 'hesabima-giris-yapamiyorum';

UPDATE support_articles SET
  title = 'CV yükleme sorunu',
  summary = 'CV dosyanızı yüklerken karşılaştığınız sorunların çözümleri.',
  body_md = '## CV Yükleme

**Desteklenen formatlar:** PDF, DOC, DOCX
**Maksimum dosya boyutu:** 5 MB

**Yükleme başarısız oluyorsa:**
- Dosya boyutunun 5 MB''yi aşmadığından emin ol
- PDF formatını dene — en güvenilir format budur
- Farklı bir tarayıcı kullan veya sayfayı yenile
- Dosya adında özel karakter (ör. #, %, &) varsa kaldır

**CV''ni güncellemek için:**
Profil Merkezi sayfasındaki CV bölümünden mevcut dosyanı silip yenisini yükleyebilirsin.'
WHERE slug = 'cv-yukleme-sorunu';

UPDATE support_articles SET
  title = 'Profilim neden görünmüyor?',
  summary = 'Profilinin işverenlere görünür olması için gereken adımlar.',
  body_md = '## Profil Görünürlüğü

Profilinin işverenlere görünmesi için üç temel koşul var:

1. **Profil tamamlanma oranın en az %45 olmalı** — Profil Merkezi''nde tamamlanma yüzdesini görebilirsin.
2. **"Beni Öner" özelliği açık olmalı** — Ayarlar sayfasının Görünürlük bölümünden kontrol edebilirsin.
3. **Hesabın aktif durumda olmalı** — Dondurulmuş veya silme sürecindeki hesaplar işverenlere görünmez.

**Kontrol listesi:**
- Ad soyad, telefon ve il bilgilerin eksiksiz mi?
- En az bir iş deneyimi girdin mi ya da "Henüz iş deneyimim yok" seçeneğini işaretledin mi?
- Tercihler bölümünde müsaitlik durumunu seçtin mi?

Tüm bunları tamamladıysan ve profilin hâlâ görünmüyorsa destek talebi oluşturabilirsin.'
WHERE slug = 'profilim-neden-gorunmuyor';

UPDATE support_articles SET
  title = 'Teklifler nasıl çalışır?',
  summary = 'Özel teklifler ve işverenlerden gelen mesajlar hakkında bilgi.',
  body_md = '## Özel Teklifler

**Teklifler nedir?**
İşverenlerin sana özel gönderdiği iş fırsatlarıdır. Profilini ne kadar eksiksiz doldurursan, o kadar fazla teklif alma şansın artar.

**Nasıl teklif alırım?**
- Profilini eksiksiz doldur
- "Beni Öner" özelliğini aç
- Aktif olarak iş aradığını belirt

**Mesajlar**
İşverenlerden gelen mesajları Mesajlar bölümünden görebilirsin. Her mesaja yanıt verebilir, konuşmayı sürdürebilirsin.

**Premium ile daha fazla fırsat**
Premium üyelikle daha fazla teklif görüntüleme hakkı ve arama sonuçlarında öne çıkma avantajı elde edebilirsin.'
WHERE slug = 'teklifler-nasil-calisir';

UPDATE support_articles SET
  title = 'Premium üyelik nasıl işler?',
  summary = 'Premium özellikleri, fiyatlandırma ve üyelik yönetimi.',
  body_md = '## Premium Üyelik

**Premium avantajları:**
- Kim Baktı detayları — profilini hangi şirketin, hangi pozisyon için incelediğini gör
- Öne Çıkan Profil — işveren aramalarında üst sıralarda yer al
- Sınırsız Teklif Görüntüleme
- AI CV Oluşturucu
- Mülakat Koçu tam erişim

**Fiyatlandırma:**
Güncel fiyatlar ve plan seçenekleri için Premium bölümüne göz atabilirsin.

**İptal ve iade:**
Üyeliğini istediğin zaman iptal edebilirsin. İptal ettiğinde, aktif dönemin sonuna kadar premium avantajların devam eder.'
WHERE slug = 'premium-uyelik-nasil-isler';

UPDATE support_articles SET
  title = 'Tarayıcı uyumluluğu ve teknik sorunlar',
  summary = 'Desteklenen tarayıcılar ve sık karşılaşılan teknik sorunların çözümleri.',
  body_md = '## Teknik Bilgiler

**Desteklenen tarayıcılar:**
- Chrome (önerilen)
- Safari
- Firefox
- Edge

**Sayfa düzgün yüklenmiyor mu?**
- Sayfayı sert yenile: Ctrl+Shift+R (Mac için Cmd+Shift+R)
- Tarayıcı önbelleğini temizle
- Reklam engelleyicini geçici olarak kapat ve tekrar dene

**Mobil cihazlarda sorun mu yaşıyorsun?**
- En az iOS 15 veya Android 10 kullanmanı öneriyoruz
- Tarayıcının güncel sürümde olduğundan emin ol
- Yatay modda sorun yaşıyorsan dikey moda geç ve sayfayı yenile'
WHERE slug = 'tarayici-uyumlulugu';
