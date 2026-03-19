# Mülakat Tema Referansı

Bu doküman, `/Users/peopleintk/Desktop/peoplein/interview architect/0- architecht english/Interview Architects PDF.pdf.zip` içindeki **Interview Architects PDF.pdf** ile Hellotalent aday tarafı mülakat pratiği sistemini aynı modele bağlamak için hazırlanmıştır.

Amaç:
- Kaynak PDF'in kullandığı değerlendirme mantığını özetlemek
- Mevcut Hellotalent veri yapısındaki karşılığını göstermek
- `profil-mulakatkocu.js` içinde aday deneyimine nasıl entegre edilmesi gerektiğini netleştirmek

## 1. Kaynak PDF'den Çıkan Model

PDF taranmış/görsel tabanlı olduğu için metin doğrudan çıkarılamadı; ancak temsilî sayfalar görsel olarak incelendi. Yapı nettir:

1. Mülakat süreci
   - İş gereksinimlerini belirle
   - Yetkinlikleri seç
   - Her yetkinlik için mülakat sorularını seç
   - Görüşmeyi yürüt
   - Yanıtlardaki temaları tespit et
   - Yetkinliğe göre değerlendir
   - Öğrenme çevikliğini ayrıca değerlendir

2. Değerlendirme disiplini
   - Halo / horns effect
   - Similar-to-me bias
   - Contrast effect
   - Yanıtlarda kalıp arama
   - Tek bir örneğe değil, tekrar eden davranış örüntüsüne bakma

3. Her yetkinlik için sabit şablon
   - 1 yetkinlik başlığı
   - 10 mülakat sorusu
   - 5 soru teması
   - `Themes to listen for`
   - `Positive`
   - `Negative`
   - `Overuse`
   - `Competency interview category`

## 2. Hellotalent'taki Karşılığı

Kaynak model aslında ürün içinde iki ayrı dosyaya dağılmış durumda:

### Soru tarafı
- Dosya: `/Users/peopleintk/Downloads/Hellotalent/profil-mulakatkocu.js`
- Kaynak: `INTERVIEW_QUESTIONS`
- İçerik:
  - Yetkinlik bazlı soru havuzu
  - Her yetkinlikte 5 tema
  - Her temada 2 soru

Bu yapı, PDF'teki yetkinlik başına 10 soruluk interview guide ile doğrudan uyumludur.

### Davranış temaları tarafı
- Dosya: `/Users/peopleintk/Downloads/Hellotalent/profil-yetkinlik.js`
- Kaynak: `ANCHORS`
- İçerik:
  - `def`
  - `why`
  - `skilled`
  - `lessskilled`
  - `highlyskilled`
  - `overused`
  - `retail`
  - `interview`

Buradaki eşleşme:
- PDF `Positive` -> Hellotalent `skilled`
- PDF `Negative` -> Hellotalent `lessskilled`
- PDF `Overuse` -> Hellotalent `overused`
- Hellotalent'e özel ek katman -> `highlyskilled`, `why`, `retail`

## 3. Kritik Yorum

Mevcut ürün soruyu soruyor ama **neyin arandığını öğretmiyor**.

Bu nedenle aday:
- Hangi davranış sinyallerinin güçlü sayıldığını görmüyor
- Hangi cevapların zayıf / riskli sayıldığını öğrenmiyor
- Yetkinliğin aşırı kullanımının da risk olabileceğini fark etmiyor
- Soruyu yanıtladıktan sonra öğrenme kapanışı yaşamıyor

Bu da sistemi:
- pratik ekranı olmaktan çıkarıp
- soru okuma ekranına yaklaştırıyor

## 4. Doğru Entegrasyon İlkesi

Bu tema sistemi soru ekranına “uzun teori” olarak değil, **mikro koçluk katmanı** olarak girmelidir.

KISS yaklaşımı:

1. Önce soru
2. Sonra kısa düşünme alanı
3. Sonra `Bu soru neyi ölçüyor?`
4. Sonra `Güçlü sinyaller / Risk sinyalleri / Aşırı kullanım`
5. Sonra sıradaki soru

Buradaki prensip:
- Önce adayın kendi zihninde cevap üretmesi gerekir
- Sistem cevabı ezberletmemeli
- Ama ölçüm mantığını da görünür kılmalı

## 5. Önerilen Ürün Katmanı

### Yeni mikro akış

Her soru için:

1. `Soru`
   - Tek soru kartı
   - Tema etiketi görünür

2. `Kısa hazırlık`
   - Aday içinden yanıtlar
   - Dilerse `STAR İpucu` açar

3. `Bu soru neyi ölçüyor?`
   - Açılır / kapanır koç kartı
   - Aşağıdaki üç sütun ya da üç mini kart gösterilir:
   - `Güçlü sinyaller`
   - `Risk sinyalleri`
   - `Aşırı kullanım`

4. `Yanıtladım`
   - Aday yanıtladığını işaretler
   - Sistem küçük bir kapanış verir:
   - `İyi yanıtta şu görünür`
   - `Zayıf yanıtta şu görünür`
   - `Bu yetkinliği fazla kullanırsanız şu riske düşersiniz`

### Neden doğru?

Retail Learning Director gözüyle:
- Öğrenme kısa seanslarda daha kalıcı olur
- Değerlendirme mantığı görünür olursa aday yalnız soruya değil davranış modeline hazırlanır

HR Director gözüyle:
- Aday soruyu değil ölçüm kriterini anlar
- Bu da daha kaliteli STAR örnekleri üretir

Sorgulayan aday gözüyle:
- “Bu sorunun arkasında ne var?” sorusuna cevap alır
- Sistem daha akıllı ve öğretici görünür

## 6. Arayüz Kontratı

Tema katmanı aynı anda tüm ekranı doldurmamalı.

### Soru ekranında gösterilecek içerik

Varsayılan:
- Yetkinlik adı
- Yetkinlik kısa tanımı
- Soru teması
- Soru metni

İsteğe bağlı açılır alan:
- `Bu soru neyi ölçüyor?`
- `Güçlü sinyaller`
- `Risk sinyalleri`
- `Aşırı kullanım`

Sınırlar:
- İlk açılışta tüm `skilled / lessskilled / overused` maddeleri gösterilmemeli
- Her blokta önce 2 veya 3 madde gösterilmeli
- `Tüm sinyalleri görün` ikinci seviye açılım olabilir

## 7. Veri Kontratı

Uygulama tarafında yeni bir veri modeli zorunlu değildir. V1 için mevcut veri yeterlidir.

### Kullanılacak mevcut alanlar

- Soru teması:
  - `INTERVIEW_QUESTIONS[compCode][themeIndex].theme`

- Soru metni:
  - `INTERVIEW_QUESTIONS[compCode][themeIndex].q[]`

- Yetkinlik açıklaması:
  - `ANCHORS[compCode].def`

- Güçlü sinyaller:
  - `ANCHORS[compCode].skilled`

- Risk sinyalleri:
  - `ANCHORS[compCode].lessskilled`

- Aşırı kullanım:
  - `ANCHORS[compCode].overused`

### V1 öğretim kuralı

Tema bazlı tam eşleşme çıkarmaya çalışmak yerine:
- soru ekranı yetkinlik bazlı koçluk versin
- soru teması sadece bağlam ve odak hissi yaratsın

Bu yaklaşım neden doğru:
- PDF’te `themes to listen for` yetkinlik düzeyindedir
- Soru temaları yetkinliğin alt davranış alanlarını açar
- Tam bire bir eşleme yapılmaya çalışılırsa ürün gereksiz karmaşıklaşır

## 8. V2 İçin Doğru Genişleme

Eğer daha ileri gidilecekse, ikinci aşamada şu veri yapısı eklenebilir:

`QUESTION_THEME_COACHING[compCode][themeLabel] = {`
- `measures`
- `strong_signals`
- `risk_signals`
- `overuse_risk`
`}`

Ama bu V2 olmalıdır. V1 için gerekli değildir.

## 9. Önerilen UI Metinleri

### Açılır koç kartı başlığı
- `Bu soru neyi ölçüyor?`

### Güçlü sinyaller
- `Güçlü bir yanıtta şunları duymayı beklersiniz`

### Risk sinyalleri
- `Zayıf bir yanıtta şu riskler görünür`

### Aşırı kullanım
- `Bu yetkinlik güçlüdür; ama aşırı kullanılırsa şu riske dönüşebilir`

### Mikro kapanış
- `Bu soru, yalnızca ne yaptığınızı değil nasıl düşündüğünüzü de ölçer.`

## 10. Yetkinlik Örnekleri

### `ao` — Aksiyona Yönelim

Soru temaları:
- Önce harekete geçmek
- Fırsatları yakalamak
- Zor sorunlarla yüzleşmek
- Enerji ve çaba harcamak
- Hız ve insanları yönetmek

Güçlü sinyaller:
- Gereksiz planlama beklemeksizin zorluğa müdahale eder
- Yeni fırsatları tanımlar ve yakalar
- Zor konuların üzerine gider

Risk sinyalleri:
- Fazla onay bekler
- Belirsizlikte felç olur
- Zor durumlardan kaçınır

Aşırı kullanım:
- Başkalarının görüşünü almadan aşırı hızlı ilerler
- Sonuçları yeterince düşünmeden hareket eder

### `ce` — Etkili İletişim

Soru temaları:
- Yaklaşımı dinleyiciye uyarlamak
- Dinleyiciyle bağ kurmak
- Kilit noktaları görünür kılmak
- Fikir ifadesini teşvik etmek
- Farklı iletişim yöntemleri kullanmak

Güçlü sinyaller:
- Mesajını kitleye göre ayarlar
- Aktif dinler
- Bilgiyi zamanında paylaşır

Risk sinyalleri:
- Netlikte zorlanır
- Aynı tonu herkese uygular
- Karşı tarafı gerçekten dinlemez

Aşırı kullanım:
- Fazla bilgi yükler
- İçeriğin önüne stil geçer

### `cf` — Müşteri Odaklılık

Soru temaları:
- Kaybedilmek üzere olan müşteriyi tutmak
- Zor müşteri talepleriyle başa çıkmak
- Müşteri sorunlarıyla yüzleşmek
- Geri bildirimle yaklaşımı değiştirmek
- Müşteri bilgisini toplamak ve kullanmak

Güçlü sinyaller:
- İhtiyacı önceden sezer
- Çözüm geliştirir ve takip eder
- Geri bildirimi iyileştirmeye çevirir

Risk sinyalleri:
- Varsayımla hareket eder
- Müşteri sorununda savunmaya geçer
- İlişkiyi sürdüremez

Aşırı kullanım:
- Müşteriyi memnun etmek için şirket sınırlarını aşırı esnetir

### `ea` — Sorumluluk Alma

Soru temaları:
- Kişisel sorumluluk almak
- Hedef belirlemek ve ilerlemeyi ölçmek
- Beklentileri netleştirmek
- Sonuçları takip etmek
- Geribildirim döngülerini kullanmak

Güçlü sinyaller:
- Sahiplik alır
- İlerlemeyi izler
- Beklentileri netleştirir

Risk sinyalleri:
- Kişisel sorumluluktan kaçar
- Son dakika sürprizleri yaşar
- Dışsal mazeret üretir

Aşırı kullanım:
- Aşırı kontrol ve baskı yaratır
- Sadece sayısal metriklere saplanır

### `dw` — Ekip Yönlendirme

Soru temaları:
- Yön belirlemek
- Etkili biçimde delege etmek
- Projeyi rayında tutmak
- Rehberlik ile güçlendirmeyi dengelemek
- Engelleri kaldırmak

Güçlü sinyaller:
- Net sorumluluk verir
- Delege eder
- İşi tıkayan engelleri kaldırır

Risk sinyalleri:
- Belirsiz talimat verir
- Her şeyi kendisi yapmaya çalışır
- Mikro yönetim yapar

Aşırı kullanım:
- Gereğinden fazla yönlendirme yapar
- Gerçekçi olmayan beklenti oluşturur

### `at` — Yetenek Çekme

Soru temaları:
- Yetenek ihtiyacını değerlendirmek
- Dışarıdan aday işe almak
- Potansiyel mi mevcut beceri mi
- Kişiyi doğru değerlendirmek
- Zor işe alım kararları

Güçlü sinyaller:
- İhtiyaca uygun yeteneği tanımlar
- İç/dış denge kurar
- Tutarlı değerlendirme süreci kullanır

Risk sinyalleri:
- Doğru yeteneği aramakta ısrar etmez
- Süreçsiz seçim yapar
- Yargı kalitesi zayıftır

Aşırı kullanım:
- Standartları gereğinden fazla yükseltir
- Aşırı analiz yüzünden bekler

## 11. Uygulama Kararı

V1 için en doğru karar:
- soru ekranında tema öğretimini açılır koç kartı olarak vermek
- `Yanıtladım` sonrası mikro davranış özeti göstermek
- tüm yetkinlik makalesini tekrar açmamak
- adayın dikkatini sorudan koparmamak

## 12. Claude İçin Kullanım Notu

Claude bir sonraki aşamada şu dosyaları birlikte okumalı:
- `/Users/peopleintk/Downloads/Hellotalent/docs/mulakat-theme-reference.md`
- `/Users/peopleintk/Downloads/Hellotalent/profil-mulakatkocu.js`
- `/Users/peopleintk/Downloads/Hellotalent/profil-yetkinlik.js`
- `/Users/peopleintk/Downloads/Hellotalent/docs/handoff.md`

Ve şu prensibi izlemeli:
- soru bazlı deneyim korunacak
- davranış teması öğretilecek
- ama kullanıcı uzun metne boğulmayacak
