# HelloTalent — Karar Defteri

> Her önemli ürün kararı burada kayıt altına alınır. Neden o kararı aldık, alternatifleri neydi, kim karar verdi.

---

## K001 — Yaş/Cinsiyet Filtresi: Soft Signal
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna + Claude (HoP)
**Karar:** Yaş ve cinsiyet bilgisi işveren tarafında "tercih" olarak sunulacak, hard filter DEĞİL.
**Neden:** İş Kanunu md. 5 (eşit davranma) + KVKK. Yaş/cinsiyet bazlı hard filter ayrımcılık riski taşır.
**Uygulama:** Soft signal olarak skorlamaya düşük ağırlıkla katılır. UI'da "Tercih" etiketi kullanılır.
**Alternatif:** Hiç koymamak (B seçeneği) — reddedildi, işveren ihtiyacı var ama yasal çerçevede.
**Aksiyon:** KVKK detaylı hukuki inceleme gerekli, canlıya çıkmadan önce.

---

## K002 — İşveren Onboarding: Self-Serve + Admin Onay
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna
**Karar:** İşveren self-serve kayıt olur (şirket emaili zorunlu), ama admin onayı olmadan gerçek adaylara erişemez.
**Neden:** Outsourcing firmaları (Manpower vb.) aday çalabilir. Admin kapısı platform değerini korur.
**Uygulama:** Kayıt → demo (14 gün) → ödeme → provizyon → admin onay → erişim açılır.
**Detay:** Freemium = demo ekran (fake data). Ücretli üyelik olmadan gerçek aday yok.

---

## K003 — Başvuru Yok, Sadece Eşleştirme
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna
**Karar:** Geleneksel "ilan aç → başvuru al" modeli yok. İşveren pozisyon açar, sistem aday önerir.
**Neden:** Kariyer.net/LinkedIn'den ayrışma. Kalitesiz başvuru problemini çözme. Pasif aday avantajı.
**Uygulama:** Pozisyon filtreler → 12 sinyalli skorlama → önerilen aday listesi.
**Sonuç:** Aday hiçbir zaman "başvuru" yapmaz, sadece profil oluşturur ve bekler.

---

## K004 — Görüntüleme Limiti
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna + Claude (HoP)
**Karar:** İşveren aylık/haftalık aday görüntüleme kotasına tabi olacak (tier'a göre).
**Neden:** İşveren tüm aday tabanını görebilir — sınır olmazsa veri çalınabilir ve premium değer düşer.
**Uygulama:** employer_daily_usage tablosu mevcut, genişletilecek. Kota aşımında upgrade CTA.
**Detay:** Kesin rakamlar fiyatlandırma ile birlikte belirlenecek.

---

## K005 — Freshness: Aynı Adayı Tekrar Göstermeme
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna
**Karar:** İşveren aynı pozisyon için aynı adayı sadece 1 kez görür.
**Neden:** Çeşitlilik ve keşif. "Hep aynı 10 kişi" deneyimini önleme.
**Uygulama:** profile_views tablosu + employer_id + candidate_id + position_id unique constraint.
**İstisna:** Filtre değiştirildiğinde veya "tekrar göster" aksiyonu alındığında yeniden çıkabilir.

---

## K006 — Outsourcing Firmaları Yasak
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna
**Karar:** Toplu outsourcing firmaları (Manpower, Adecco, Randstad vb.) sisteme kabul edilmez.
**Neden:** Bu firmalar kendi aday havuzlarını doldurmak için platform verilerini sömürür.
**Uygulama:** Admin onay kapısında red. Red listesi tutulacak.
**İstisna:** Boutique headhunter firmalar kabul edilir (perakende odaklı, admin onaylı).

---

## K007 — Gelir Modeli: İki Taraflı Marketplace
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna
**Karar:** Hem adaydan (premium üyelik) hem işverenden (abonelik) gelir alınacak.
**Neden:** Tek taraflı model sürdürülebilir değil. İki taraflı gelir daha sağlıklı unit economics sağlar.
**Detay:** Kampanya geliri ek gelir kaynağı olarak eklenecek.
**Fiyatlandırma:** Beta sonrası belirlenecek. Önce product-market fit.

---

## K008 — MVP İki Aşamalı
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna
**Karar:** MVP 1 = aday toplama + lead toplama. MVP 2 = işveren dashboard + admin onay.
**Neden:** Cold start problemi. Önce aday tabanı olmadan işverene değer sunamazsın.
**Strateji:** 
- MVP 1: Aday kayıtları topla, segmentleri doldur. İşveren lead'leri topla, demo göster.
- MVP 2: Yeterli aday olunca işverene satış başla.
**Kriter:** Her segmentte 50+ tamamlanmış profil = MVP 2'ye geçiş sinyali.

---

## K009 — Takipçi Bilgisi: Total, Bireysel Değil
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna
**Karar:** İşveren toplam takipçi sayısını görebilir ama bireysel takipçileri göremez.
**Neden:** Bireysel takipçi listesi aday gizliliğini ihlal eder. "X kişisi bizi takip ediyor" bilgisi silah olabilir. Total rakam yeterli motivasyon sağlar.
**İstisna:** Aday "aktif iş arıyor" ve profili işverene öneri olarak düşerse, o zaman takip bilgisi sinyal olarak skorlamaya girer.

---

## K010 — Coach Sistemi: Gelir Modeli Yok (Şimdilik)
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna
**Karar:** Coach sistemi MVP'de gelir üretmeyecek. Network'ten gönüllü katkı.
**Neden:** Önce para kazanmaya başlamak lazım. Coach monetization ikinci sırada.
**Gelecek:** Tutarsa ücretli içerik, 1:1 mentorluk, platform komisyonu eklenebilir.

---

## K011 — Coğrafi Kapsam: Türkiye Geneli
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna
**Karar:** Başlangıçtan itibaren Türkiye geneli (81 il). İstanbul-first değil.
**Neden:** Perakende her ilde var. Sınırlamak aday tabanını gereksiz daraltır.
**Odak:** Doğal olarak İstanbul, Ankara, İzmir, Antalya, Bursa yoğun olacak ama kasıtlı kısıtlama yok.

---

## K012 — Newsletter: MVP 1'de Zorunlu
**Tarih:** 3 Nisan 2026  
**Karar veren:** Tuna
**Karar:** Newsletter sistemi MVP 1'de kurulacak.
**Neden:** Aday toplama fazında engagement ve retention için kritik. Yeni marka ekleme, platform güncellemeleri, sektör haberleri ile kullanıcıyı aktif tutma.
**Uygulama:** Resend veya benzeri provider + admin yönetim paneli.

---

## K013 — Gelir Ağırlığı: İşveren + Kampanya First
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna
**Karar:** Birincil gelir stratejisi işveren abonelik + kampanya gelirleri üzerine kurulacak. Aday premium düşük fiyatta tutulacak.
**Neden:** Adaylar perakende çalışanları — düşük gelir grubu. Premium'u pahalı tutmak aday tabanını daraltır. Platform değeri aday havuzunun büyüklüğünden gelir → aday tarafını ucuz tut ki havuz büyüsün, işverenden kazan.
**Uygulama:** Aday premium sembolik/düşük fiyat. İşveren abonelik + kampanya asıl gelir motoru.
**Gelir dağılımı hedefi:** ~%70 işveren abonelik, ~%20 kampanya, ~%10 aday premium.

---

## K014 — Fiyatlandırma: Kur Orantılı + İlk Yıl Özel
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna
**Karar:** Fiyatlar ilk yıla özel indirimli başlayacak. Kur orantılı güncelleme esnekliği olacak.
**Neden:** Geliştirici maliyetleri (Supabase, API'lar, hosting) dolar bazlı. Gelir TL. Şiddetli kur artışında fiyat güncelleme yapılabilmeli.
**Uygulama:**
- İlk yıl özel fiyat (early adopter avantajı)
- Sözleşmelerde "fiyat güncellemesi" maddesi
- Kur bazlı otomatik güncelleme DEĞİL, manual review ile güncelleme (müşteri güveni)
- 6 aylık veya yıllık review döngüsü
**Alternatif:** Dolar bazlı fiyatlandırma — reddedildi, Türkiye pazarında TL ile satış yapılmalı, dolar fiyat algıyı bozar.

---

## K015 — ik.html MVP 1'de Demo Ayrıştırması
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna + Claude (HoP)
**Karar:** MVP 1'de işveren tarafına sadece demo deneyimi sunulacak. Ayrı `ik-demo.js` modülü oluşturulacak. Gerçek ik.html dashboard'u MVP 2'de inşa edilecek.
**Neden:** İşveren demo'su fake data ile çalışacak. Gerçek aday tabanı olmadan full dashboard anlamsız. Demo ayrı tutularak ik.html'nin gerçek build'i bağımsız ilerleyebilir.
**Uygulama:** `ik-demo.js` — fake aday kartları, filtre simülasyonu, "Bu bir demodur" uyarısı. 14 gün limiti.

---

## K016 — Launch Öncesi KVKK Hukuki Danışmanlık Zorunlu
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna + Claude (HoP)
**Karar:** MVP 1 canlıya çıkmadan önce KVKK avukatıyla görüşme yapılacak. Bu bir launch blocker'dır.
**Neden:** Platform kişisel veri işliyor (ad, email, telefon, deneyim, yaş, cinsiyet, lokasyon). Aydınlatma metni, açık rıza, veri saklama süreleri, özel nitelikli veri işleme kuralları launch öncesi hazır olmalı. KVKK cezaları 1.9M TL'ye kadar çıkabiliyor.
**Aksiyon:** Tuna'nın avukat arkadaşıyla görüşme planlanacak. Çıktılar: güncel aydınlatma metni, rıza mekanizması, veri işleme envanteri.

---

## K017 — Analytics Altyapısı MVP 1 Zorunlu
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna + Claude (HoP)
**Karar:** MVP 1 launch öncesi minimum analytics altyapısı kurulacak.
**Neden:** Veri olmadan ürün kararı alınamaz. Kayıt funnel'ı, profil tamamlama, feature kullanımı ölçülmeli.
**Uygulama:** İki katmanlı yaklaşım — (1) Supabase'de `analytics_events` tablosu (funnel tracking), (2) Privacy-friendly sayfa analytics (Plausible veya Umami, self-hosted).

---

## K018 — Güvenlik Monitoring — Düşük Maliyetli Çözüm
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna + Claude (HoP)
**Karar:** Launch öncesi Supabase native monitoring + alerting kurulacak. Ek personel yerine online araçlarla sistem koruması sağlanacak.
**Neden:** Tek teknik kaynak AI araçları. Production incident'ta response time kritik. Supabase dashboard + email alert'leri + RLS audit script'leri yeterli başlangıç.
**Uygulama:** Supabase alerting, pg_cron health check, check-rls-guard.sh (mevcut), haftalık otomatik RLS audit.

---

## K019 — Distribution Stratejisi: 5.000 CV + LinkedIn + PeopleIn
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna
**Karar:** Cold start çözümü için mevcut varlıklar kullanılacak — founder-led distribution.
**Varlıklar:**
- 5.000 hazır CV (davet edilecek)
- 4.400 LinkedIn takipçi (%60 retail = ~2.600 hedef kitle)
- PeopleIn İK danışmanlığı (işveren warm intro)
- 15 şehirde aktif perakende ağı
- 200K TRY marketing bütçesi (MVP lansmanı)
**Strateji:** LinkedIn otomasyon + davet maili + sosyal medya kampanyası + kulaktan kulağa. İşveren tarafı PeopleIn ağı ile warm intro.

---

## K020 — Ekip Büyüklüğü: Yönetici Pozisyonunda Koşullu Aktif
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna
**Karar:** Ekip büyüklüğü dropdown'u sadece yönetici pozisyonu seçildiğinde aktif olacak. Satış danışmanı gibi rollerde görünmeyecek.
**Neden:** Satış danışmanı ekip yönetmiyor — gereksiz alan göstermek form friction yaratır. Yönetici seçtiğinde ise bu bilgi kritik (5 kişilik outlet vs 40 kişilik flagship farkı).
**Uygulama:** profil-wizard.js'de pozisyon/rol ailesi seçimine bağlı conditional rendering.

---

## K021 — Cinsiyet ve Yaş: Opsiyonel + Filtre Dışı
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna + Claude (HoP)
**Karar:** Cinsiyet ve doğum yılı alanları zorunluluktan opsiyonele çevrilecek. İşveren arama filtresinde hiçbir koşulda kullanılmayacak.
**Neden:** KVKK md.6 (özel nitelikli veri riski) + İş Kanunu md.5 (eşit davranma). Deneyim yılı zaten dolaylı yaş göstergesi. İşveren filtreleyemeyeceği veriyi toplamak riskli.
**Uygulama:** Migration: NOT NULL kaldır. Wizard: opsiyonel gösterim. search_employer_candidates RPC: bu alanları filtre parametrelerinden çıkar.

---

## K022 — KVKK Onayı: Kayıt Sırasında Tek Sefer
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna + Claude (HoP)
**Karar:** KVKK açık rıza onayı sadece kayıt sırasında (giris.html) bir kez alınacak. Profil wizard'da tekrar sorulmayacak.
**Neden:** Profil oluştururken tekrar sormak friction yaratır. Kayıt = sözleşme anı. Tarih damgası (`privacy_consent_at`) kaydedilecek.
**İstisna:** Avukat özel nitelikli veri (cinsiyet/yaş) için ayrı rıza gerektiğini söylerse, sadece o alanları doldurmaya çalışırken mini bilgilendirme gösterilir.
**Uygulama:** giris.html'de checkbox + gizlilik.html link + `candidates.privacy_consent_at` timestamp.

---

## K023 — Lokasyon Seçimi: Apple Tarzı Search→Chip
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna
**Karar:** Lokasyon seçiminde Apple tarzı search→chip kullanılacak. Stripe'ın bölge→şehir hiyerarşisi kullanılmayacak.
**Neden:** Search→chip daha temiz, daha az kalabalık. Mevcut 81 il dropdown kalabalık görünüyor.

---

## K024 — Stripe Tablo Formatı + Sticky Sidebar: Test Edilecek
**Tarih:** 3 Nisan 2026
**Karar veren:** Tuna
**Karar:** İşveren tarafında aday listesi tablo formatı ve sticky sidebar uygulanabilir — test edip karar verilecek.
**Not:** Kesin karar değil, deneme.

---

## K025 — AI Özellikleri Toplu Değerlendirme (4 Nisan 2026)
**Tarih:** 4 Nisan 2026
**Karar veren:** Tuna + Claude

### K025a — pgvector + Embedding Hybrid Search → DEFER
**Karar:** MVP 2 sonrasına ertelendi. Mevcut kural tabanlı eşleştirme korunacak.
**Neden:** 4 aday, description alanı boş, işveren tarafı aktif değil. Embedding'ler ölçekte değer üretir. Her profil güncelleme = API call maliyeti.
**Tetikleyici:** Segment başına 50+ aday + işveren "bulamıyorum" geri bildirimi.

### K025b — Conversational AI Mülakat Koçu → DEFER (GROWTH)
**Karar:** GROWTH fazına ertelendi. Mevcut STAR+T tek yönlü sistem korunacak.
**Neden:** Chat format = streaming, session management, prompt engineering, abuse prevention. Ayrı ürün seviyesi efor. Mevcut sistem çalışıyor ve beta için yeterli.
**Tetikleyici:** Studio aktif kullanıcı sayısı 50+ ve "daha gerçekçi pratik" geri bildirimi.

### K025c — Schema.org (JobPosting + Organization) → KISMEN ŞIMDI
**Karar:** Organization + WebSite schema şimdi eklenebilir. JobPosting schema MVP 2'de ilanlar açılınca.
**Neden:** Sıfır maliyet, yüksek SEO etkisi. Google Jobs görünürlüğü. Ama henüz ilan yok.
**Uygulama:** index.html'e Organization schema ekle (şimdi). ik.html pozisyon açma ile birlikte JobPosting schema (MVP 2).

### K025d — GEO / FAQ Schema → YAKIN (Coach Blog ile)
**Karar:** FAQ schema coach içerikleri blog olarak yayınlandığında eklenecek.
**Neden:** AI search motorlarında "perakende kariyer" sorgularında görünme. Coach yazıları = organik SEO (teori ödevi #6).
**Tetikleyici:** İlk 3-5 coach blog yazısı yayınlandığında.

### K025e — Mesajlaşmada AI Özetleme → DEFER (MVP 2 sonrası)
**Karar:** MVP 2 sonrasına ertelendi.
**Neden:** Şu an mesaj trafiği yok. 100+ aktif mesaj konuşması olunca değerli.
**Tetikleyici:** Aylık 100+ mesaj trafiği.

---


**Tarih:** 4 Nisan 2026
**Karar veren:** Tuna + Claude
**Karar:** pgvector semantic matching MVP 2 sonrasına ertelendi. Keyword search yeterli kalana kadar mevcut kural tabanlı eşleştirme korunacak.
**Neden:** DB'de 4 aday var, description alanı henüz boş, işveren tarafı aktif değil. Embedding'ler ölçekte değer üretir (100+ profil). Maliyet: her profil güncelleme = OpenAI API call.
**Uygulama:** Segment başına 50+ aday + işveren aktif arama + keyword search yetersiz geri bildirimi geldiğinde aktifleştir. AP5 (iş tanımı) zaten embedding pipeline'ının veri katmanını oluşturuyor.
**Alternatif:** Hemen implement et — reddedildi çünkü premature optimization, veri yok, maliyet/getiri oranı düşük.

---

## Karar Ekleme Şablonu

```markdown
## KXXX — [Başlık]
**Tarih:** [GG Ay YYYY]
**Karar veren:** [Kim]
**Karar:** [Net karar cümlesi]
**Neden:** [Motivasyon]
**Uygulama:** [Nasıl hayata geçecek]
**Alternatif:** [Reddedilen seçenekler ve nedenleri]
```

---

*Son güncelleme: 3 Nisan 2026*
