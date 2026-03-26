-- Support Articles — Deep content rewrite + product-truth alignment
-- Date: 2026-03-26
-- Type: DATA UPDATE (no schema changes)
-- Purpose:
--   1. Rewrite all 6 existing articles with actionable, step-by-step Turkish content
--   2. Fix product-truth mismatch: Teklifler is campaigns/employer branding, NOT job offer inbox
--   3. Add new article for Mesajlar (DM inbox) — separate from Kampanyalar
--   4. Add new article for account lifecycle (freeze/delete)
--   5. All content uses proper Turkish characters and natural conversational tone

-- ═══════════════════════════════════════════════════
-- ARTICLE 1: Hesap ve Giriş — Login issues
-- ═══════════════════════════════════════════════════

UPDATE support_articles SET
  title = 'Hesabıma giriş yapamıyorum',
  summary = 'Şifre sıfırlama, e-posta doğrulama, Google/LinkedIn girişi ve yaygın giriş hatalarının çözümleri.',
  body_md = '## Önce Bunu Dene

Çoğu giriş sorunu birkaç basit adımla çözülür:

1. Sayfayı sert yenile: `Ctrl+Shift+R` (Mac: `Cmd+Shift+R`)
2. Tarayıcının çerezlerinin (cookies) açık olduğundan emin ol
3. Gizli/özel pencere modunda tekrar dene

## Şifreni mi Unuttun?

1. **giris.html** sayfasına git
2. "Şifremi Unuttum" bağlantısına tıkla
3. Kayıtlı e-posta adresini gir
4. Gelen kutundaki sıfırlama linkine tıkla — link 1 saat geçerlidir

> Sıfırlama maili gelmediyse spam/gereksiz klasörünü kontrol et. Mail ''auth@auth.hellotalent.ai'' adresinden gelir.

## E-posta Doğrulaması

Kayıt olduktan sonra e-posta adresine bir doğrulama maili gönderilir. Bu maili onaylamadan giriş yapamazsın.

**Mail gelmedi mi?**
- Spam/gereksiz klasörünü kontrol et
- Birkaç dakika bekle — bazen gecikmeler olabiliyor
- Hâlâ gelmediyse destek talebi oluştur

## Google veya LinkedIn ile Giriş

**Önemli:** Hangi yöntemle kayıt olduysan aynı yöntemle giriş yapmalısın.

- Google ile kayıt olduysan → "Google ile Giriş Yap" butonunu kullan
- LinkedIn ile kayıt olduysan → "LinkedIn ile Giriş Yap" butonunu kullan
- E-posta ile kayıt olduysan → e-posta ve şifreni gir

Farklı bir yöntem kullanırsan yeni bir hesap oluşabilir ve eski profiline erişemezsin.

## Hâlâ Sorun mu Var?

Giriş ekranında aldığın hata mesajını not al ve aşağıdaki butonla destek talebi oluştur. Ekran görüntüsü çekersen çözüm hızlanır.'
WHERE slug = 'hesabima-giris-yapamiyorum';

-- ═══════════════════════════════════════════════════
-- ARTICLE 2: Profil ve CV — CV upload
-- ═══════════════════════════════════════════════════

UPDATE support_articles SET
  title = 'CV yükleme sorunu',
  summary = 'Desteklenen dosya formatları, boyut limiti ve yükleme hatalarının çözümleri.',
  body_md = '## Desteklenen Dosya Özellikleri

- **Formatlar:** PDF, DOC, DOCX
- **Maksimum boyut:** 5 MB
- **Önerilen format:** PDF — tüm cihazlarda en tutarlı sonucu verir

## Yükleme Başarısız Oluyorsa

Sırasıyla şunları dene:

1. **Dosya boyutunu kontrol et** — 5 MB üzerindeki dosyalar reddedilir
2. **PDF formatına dönüştür** — Word dosyaları bazen sorun çıkarabilir
3. **Dosya adını sadeleştir** — Türkçe karakter, boşluk, `#`, `%`, `&` gibi özel karakterleri kaldır (örnek: `CV-Ali-Yilmaz.pdf`)
4. **Farklı tarayıcı dene** — Chrome en güvenilir sonucu verir
5. **Sayfayı sert yenile** — `Ctrl+Shift+R` (Mac: `Cmd+Shift+R`)

## CV Güncelleme

Yeni bir CV yüklemek için:

1. **Profil Merkezi** sayfasına git
2. CV bölümündeki mevcut dosyayı sil
3. Yeni dosyanı yükle

> CV''ni güncellemen profilinin işverenlere görünürlüğünü artırır — güncel bir CV daha fazla ilgi çeker.

## Dosya Seçme Penceresi Açılmıyorsa

Bu genellikle bir tarayıcı sorunu:
- Reklam engelleyicini geçici olarak kapat
- Pop-up engellemeyi hellotalent.ai için devre dışı bırak
- Gizli pencere modunda tekrar dene'
WHERE slug = 'cv-yukleme-sorunu';

-- ═══════════════════════════════════════════════════
-- ARTICLE 3: Profil ve CV — Profile visibility
-- ═══════════════════════════════════════════════════

UPDATE support_articles SET
  title = 'Profilim neden görünmüyor?',
  summary = 'Profilinin işverenlere görünür olması için gereken koşullar ve adım adım kontrol listesi.',
  body_md = '## Görünürlük Koşulları

Profilinin işverenlere görünmesi için **üç koşulun hepsini** sağlaman gerekir:

1. **Profil tamamlanma oranın en az %45 olmalı**
2. **"Beni Öner" özelliği açık olmalı**
3. **Hesabın aktif durumda olmalı**

## Adım Adım Kontrol Listesi

### 1. Profil Tamamlanma (%45 minimum)
Profil Merkezi''ndeki ilerleme çubuğunu kontrol et. Eksik alanları tamamla:

- **Ad soyad ve telefon** — zorunlu
- **Şehir (il)** — zorunlu
- **En az bir iş deneyimi** veya "Henüz iş deneyimim yok" seçimi
- **Müsaitlik durumu** — Tercihler bölümünden seç
- **Hedef pozisyon** — en az bir pozisyon ekle

### 2. Beni Öner
**Ayarlar → Görünürlük** bölümünden "Beni Öner" toggle''ını aç. Bu kapandığında profilin hiçbir işverene görünmez.

### 3. Hesap Durumu
Hesabın dondurulmuş veya silme sürecinde olmamalı. **Ayarlar → Hesap Yönetimi** bölümünden kontrol et.

## Her Şey Tamam Ama Hâlâ Görünmüyor?

Bazı durumlarda cache güncellemesi birkaç dakika sürebilir. 10 dakika bekleyip tekrar kontrol et. Sorun devam ederse destek talebi oluştur.'
WHERE slug = 'profilim-neden-gorunmuyor';

-- ═══════════════════════════════════════════════════
-- ARTICLE 4: Mesajlar ve Kampanyalar — Teklifler (campaigns)
-- Product-truth fix: Teklifler = campaigns/employer branding, NOT job offers
-- ═══════════════════════════════════════════════════

UPDATE support_articles SET
  title = 'Özel Teklifler nasıl çalışır?',
  summary = 'Teklifler panelindeki kampanyalar, indirim kodları ve işveren markası içerikleri.',
  body_md = '## Teklifler Nedir?

**Özel Teklifler** paneli, perakende markalarının hellotalent adaylarına özel olarak sunduğu içerikleri gösterir. Bunlar üç türde olabilir:

- **İşe Alım Kampanyaları** — Markaların aktif olarak ekip aradığı duyurular
- **İndirim ve Fırsatlar** — Sadece hellotalent adaylarına özel indirim kodları
- **İşveren Markası** — Şirket kültürü, kariyer günleri ve tanıtım içerikleri

> Teklifler, işverenlerden gelen birebir mesajlardan farklıdır. Birebir mesajlar için "Mesajlarım nasıl çalışır?" makalesine göz at.

## Tekliflere Nasıl Erişirim?

Kenar çubuğundan veya alt menüden **Teklifler** (ya da **Özel Teklifler**) paneline git. Cmd+K ile "Teklifler" yazarak da erişebilirsin. İki bölüm var:

- **Herkese Açık** — Tüm adayların görebildiği teklifler
- **Premium** — Sadece premium üyelerin erişebildiği özel içerikler

## Daha Fazla Teklif Görmek İçin

- Profilini eksiksiz doldur — markalar hedefli içerik sunarken profil eşleşmesine bakar
- "Beni Öner" özelliğini aç
- Premium üyeliğe geçerek özel tekliflere eriş

## Teklif Detayı Açılmıyor mu?

Sayfayı yenile ve tekrar dene. Sorun devam ederse destek talebi oluştur.',
  sort_order = 4
WHERE slug = 'teklifler-nasil-calisir';

-- ═══════════════════════════════════════════════════
-- ARTICLE 5: Premium ve Ödeme
-- ═══════════════════════════════════════════════════

UPDATE support_articles SET
  title = 'Premium üyelik nasıl işler?',
  summary = 'Premium özellikleri, plan seçenekleri, üyelik yönetimi ve iptal süreci.',
  body_md = '## Premium Ne Sağlar?

Premium üyelik profilinin daha fazla işveren tarafından görülmesini ve platforma tam erişimini sağlar:

- **Kim Baktı Detayları** — Profilini hangi şirketin, hangi pozisyon için incelediğini gör
- **Öne Çıkan Profil** — İşveren aramalarında üst sıralarda yer al
- **Premium Teklifler** — Sadece premium üyelere açık özel teklifler ve fırsatlar
- **Mülakat Koçu Tam Erişim** — 29 yetkinlik ve 289 soru ile sınırsız pratik
- **AI CV Oluşturucu** — Yapay zeka destekli CV hazırlama

## Plan Seçenekleri

Güncel fiyatlar ve plan karşılaştırması için **Premium** paneline git. Aylık ve yıllık seçenekler mevcut.

## Üyelik Yönetimi

### Üyeliği İptal Etme
Üyeliğini istediğin zaman iptal edebilirsin:
1. **Premium** paneline git
2. "Üyeliğimi İptal Et" seçeneğini kullan
3. Aktif döneminin sonuna kadar premium avantajların devam eder

### Ödeme Sorunu
Ödeme başarısız olursa:
- Kartının limiti ve geçerlilik tarihini kontrol et
- Farklı bir kart dene
- Banka tarafında 3D Secure onayını tamamladığından emin ol

## Soru mu Var?

Ödeme ile ilgili her türlü sorunda destek talebi oluşturabilirsin.'
WHERE slug = 'premium-uyelik-nasil-isler';

-- ═══════════════════════════════════════════════════
-- ARTICLE 6: Teknik Sorunlar
-- ═══════════════════════════════════════════════════

UPDATE support_articles SET
  title = 'Tarayıcı uyumluluğu ve teknik sorunlar',
  summary = 'Desteklenen tarayıcılar, sayfa yükleme sorunları ve mobil cihaz ipuçları.',
  body_md = '## Desteklenen Tarayıcılar

- **Chrome** — önerilen, en iyi deneyim
- **Safari** — destekleniyor
- **Firefox** — destekleniyor
- **Edge** — destekleniyor

## Sayfa Yüklenmiyor veya Boş Görünüyor

Sırasıyla şunları dene:

1. **Sert yenile:** `Ctrl+Shift+R` (Mac: `Cmd+Shift+R`)
2. **Tarayıcı önbelleğini temizle:** Ayarlar → Gizlilik → Tarama verilerini temizle
3. **Reklam engelleyicini geçici olarak kapat** — bazı engelleyiciler Supabase bağlantısını kesiyor
4. **Gizli/özel pencere modunda dene** — eklenti çakışmasını test eder
5. **Farklı bir tarayıcı dene** — Chrome önerilir

## Mobil Cihaz Sorunları

- **iOS:** En az iOS 15 gerekli. Safari veya Chrome kullan.
- **Android:** En az Android 10 gerekli. Chrome önerilir.
- **Sayfa kaydırılmıyor mu?** Yatay modda (landscape) sorun yaşıyorsan dikey moda geç
- **Yazı çok küçük mü?** Tarayıcının zoom ayarını kontrol et, %100 olmalı

## Form Alanları Düzgün Çalışmıyor

- iPhone''da form alanına tıklayınca yakınlaşma oluyorsa bu beklenen bir davranış
- Otomatik doldurma (autofill) sorun çıkarıyorsa tarayıcı ayarlarından kapat

## Hâlâ Çözüm Bulamadın?

Destek talebi oluştururken şu bilgileri ekle:
- Hangi tarayıcı ve sürüm (ör. Chrome 124)
- Masaüstü mü, mobil mi
- Hangi sayfada sorun yaşıyorsun
- Aldığın hata mesajı (varsa)'
WHERE slug = 'tarayici-uyumlulugu';

-- ═══════════════════════════════════════════════════
-- NEW ARTICLE 7: Mesajlar ve Kampanyalar — Mesajlar (DM inbox)
-- This is the separate product surface from Kampanyalar
-- ═══════════════════════════════════════════════════

INSERT INTO support_articles (slug, category, title, summary, body_md, sort_order) VALUES
('mesajlarim-nasil-calisir', 'mesajlar_teklifler',
 'Mesajlarım nasıl çalışır?',
 'İşveren mesajlarını görüntüleme, yanıtlama ve konuşma takibi.',
 '## Mesajlar Nedir?

**Mesajlar** paneli, işverenlerin sana doğrudan gönderdiği kişisel mesajları gösterir. Bir işveren profilini inceledikten sonra sana özel bir mesaj gönderebilir — bu mesajlar Mesajlar panelinde görünür.

> Mesajlar, Özel Teklifler panelinden farklıdır. Teklifler, markaların tüm adaylara sunduğu kampanya ve fırsatlardır. Mesajlar ise birebir iletişimdir.

## Mesajlarıma Nasıl Erişirim?

- Üst menüdeki **zarf ikonuna** tıkla (bildirim noktası yeni mesaj olduğunu gösterir)
- Kenar çubuğundan veya alt menüden **Mesajlar** paneline git
- Cmd+K ile "Mesajlar" yazarak da erişebilirsin

## Mesaj Yanıtlama

Bir mesaja tıkladığında konuşma görünümü açılır. Alt kısımdaki yazı alanına yanıtını yaz ve gönder butonuna bas.

**İpuçları:**
- `Enter` tuşu mesajı gönderir
- Yeni satır için `Shift+Enter` kullan
- Yanıtların işverene anında iletilir

## Okundu Bilgisi

- **İletildi** — Mesajın işverene ulaştı
- **Görüldü** — İşveren mesajını okudu

## Mesaj Bildirimleri

Yeni mesaj geldiğinde:
- Üst menüdeki zarf ikonunda kırmızı nokta belirir
- Kayıtlı e-posta adresine bildirim gönderilir

**Bildirim almak istemiyorsan:** Ayarlar → Bildirimler bölümünden e-posta bildirimlerini kapatabilirsin.

## Mesaj Silme

Bir konuşmayı silmek için mesaj satırının üzerine geldiğinde görünen çöp kutusu ikonuna tıkla. Silinen mesajlar "Silinenler" filtresiyle tekrar görüntülenebilir.',
 3)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  body_md = EXCLUDED.body_md,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ═══════════════════════════════════════════════════
-- NEW ARTICLE 8: Hesap ve Giriş — Account lifecycle
-- ═══════════════════════════════════════════════════

INSERT INTO support_articles (slug, category, title, summary, body_md, sort_order) VALUES
('hesabimi-dondurmak-veya-silmek-istiyorum', 'hesap_giris',
 'Hesabımı dondurmak veya silmek istiyorum',
 'Hesap dondurma, silme talebi, geri alma süreci ve KVKK hakları.',
 '## Hesap Dondurma

Hesabını geçici olarak dondurmak istiyorsan:

1. **Ayarlar → Hesap Yönetimi** bölümüne git
2. "Hesabımı Dondur" butonuna tıkla
3. Onay verdikten sonra hesabın dondurulur

**Dondurulmuş hesap:**
- Profilin işverenlere görünmez
- Giriş yapmaya devam edebilirsin
- İstediğin zaman tekrar aktifleştirebilirsin — Ayarlar bölümünden "Hesabımı Aktifleştir" butonuna tıkla

## Hesap Silme

Hesabını kalıcı olarak silmek istiyorsan:

1. **Ayarlar → Hesap Yönetimi** bölümüne git
2. "Hesabımı Sil" butonuna tıkla
3. 30 günlük bekleme süresi başlar (KVKK md.11 gereği)

**Bekleme süreci boyunca:**
- Giriş yapabilirsin
- "Vazgeç" butonuyla silme talebini iptal edebilirsin
- 30 gün sonunda hesabın ve tüm verilerin kalıcı olarak silinir

## KVKK Hakların

KVKK md.11 kapsamında aşağıdaki haklara sahipsin:
- Verilerinin işlenip işlenmediğini öğrenme
- Verilerini indirme (Ayarlar → Verilerimi İndir)
- Düzeltme talep etme
- Silme talep etme

Detaylı bilgi için gizlilik politikamızı inceleyebilirsin.',
 2)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  body_md = EXCLUDED.body_md,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
