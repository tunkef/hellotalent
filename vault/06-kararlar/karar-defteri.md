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

### K025e — Gemma 4 Local AI (Embedding + WebGPU Koç + CV) → DEFER
**Karar:** Tümü ertelendi. EmbeddingGemma local embedding için maliyet avantajı var ama veri/ölçek yok. WebGPU mülakat koçu hedef kitle cihazlarında çalışmaz. CV multimodal mevcut Claude Sonnet pipeline'dan düşük kalite.
**Not:** Gemma 4 free tier — pgvector zamanı geldiğinde embedding provider olarak değerlendirilecek (OpenAI vs Gemma karşılaştırması).

### K025f — Mesajlaşmada AI Özetleme → DEFER (MVP 2 sonrası)
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

## K028 — Mobil Uygulama Stratejisi: 2 Fazlı Yaklaşım
**Tarih:** 6 Nisan 2026
**Karar veren:** Tuna
**Karar:** Faz 1: Capacitor ile mevcut vanilla JS'i sararak App Store'a çık (2-4 hafta). Faz 2: Product-market fit kanıtlandıktan sonra React Native + Expo (mobil) + Next.js (web) rewrite.
**Neden:** iOS PWA kısıtlamaları (push, background sync, storage) marketplace için yetersiz. Hemen React rewrite yapmak 3-6 ay + $10-30K maliyet — MVP 1 bitmeden ve gelir akışı yokken stratejik değil.
**Elenen alternatifler:** Flutter (Dart öğrenme eğrisi + kötü web SEO), Tauri Mobile (olgunlaşmamış ekosistem), Sadece PWA (iOS kısıtlamaları)
**Faz 2 tetikleyici:** Segment başına 50+ aday + işveren dönüşüm testi + gelir akışı aktif + WebView performans şikayeti
**Detay:** [[mobil-strateji-analiz]]

---

## K029 — Agent Skills Audit: 3 Katmanlı Hedefli Kod Denetimi
**Tarih:** 8 Nisan 2026
**Karar veren:** Tuna + Claude
**Karar:** 11 yeni engineering skill (Addy Osmani / Google + Supabase official) kurulumu sonrası, MVP 2'ye geçmeden önce 3 katmanlı hedefli audit yapılacak. Full line-by-line audit yapılmayacak — hedefli ve verimli.
**Neden:** Yeni skill'ler (security-hardening, code-simplification, performance-optimization, frontend-engineering, supabase-mastery vb.) daha yüksek standartlar getiriyor. Mevcut kod bu standartlara göre hiç denetlenmedi. Özellikle profil.html (6300+ satır) risk taşıyor. Design remediation (6 Nisan) yapısal temizlik yaptı ama security/a11y/performance açısından audit yapılmadı.
**Uygulama:** 3 katmanlı hedefli audit:
- **Katman 1 — Security Sweep (Kritik, ~30dk):** innerHTML kullanımı, PII logging, RLS gap'leri, service_role exposure, input validation eksikleri. Blocker bulunursa hemen fix.
- **Katman 2 — Code Simplification Pass (Yüksek, MVP 2 öncesi, ~1-2 saat):** profil.html'de 50+ satırlık fonksiyonlar, 3+ seviye nesting, dead code, Chesterton's Fence prensibiyle inceleme.
- **Katman 3 — A11y + Performance (Orta, MVP 2 sırasında incremental, ~2-3 saat):** Lighthouse baseline, ARIA labels, keyboard navigation, Core Web Vitals ölçüm, font/image optimization.
**Kapsam:** Öncelik profil.html (en büyük ve en karmaşık dosya), sonra ik.html, shared.js, giris.html.
**Alternatif:** Full audit (tüm dosyalar, satır satır) — reddedildi, çünkü design remediation zaten yapısal temizlik yaptı, MVP 2 öncesinde zaman kaybı olur. Hiç audit yapmamak — reddedildi, yeni standartlar uygulanmadan MVP 2'ye geçmek teknik borç biriktirir.

---

## K030 — Stüdyo + Koç Dondurma + Duyurular Feed Sistemi
**Tarih:** 13 Nisan 2026
**Karar veren:** Tuna + Claude
**Karar:** Stüdyo paneli "yakında" grid ile dondurulur (4 kart: mülakat demoları, yetkinlik bazlı çalışma, mülakat teknikleri, mağaza bilgileri). Koç UI kapatılır, backend + DB dormant kalır. Yerine admin-driven "HelloTalent'ten Bilgiler" duyuru feed sistemi kurulur: `ht_announcements` tablo ailesi, LinkedIn-style composer (text + multi-image carousel + video + link + live preview), Genel Bakış paneli feed mount + mevcut bildirimler paneline toggle ("Bildirimler | Duyurular").
**Neden:** Stüdyo karmaşık ve tamamlanmamış, MVP 1 kritik yolu değil. Koç uzun süre pasif kalacak ama yapı korunacak. Admin adaylara hızlı haber kanalı istiyor (şirket girişleri, feature ipuçları, platform rehberi). "HT'ten Bilgiler" kavramı Stüdyo alt sekmesiydi, yeni feed'e taşınıyor ve Koç mantığıyla işliyor (tarih + like + media + yazı).
**Uygulama:** 3 ardışık PR:
- **FAZ A Decouple:** Koç ↔ Stüdyo ayrımı (cross-link map'ler dormant, `_htGenelCoachTeaser` boşalt, `openCoachDetail` stub). Minimal, güvenli.
- **FAZ B Freeze:** `profil.html` switchPanel guard, `panel-soon.js` + CSS, sidebar/bottom nav "Yakında" chip, `coach-studio.html` noindex + redirect, admin.html Studio tab disable, `profil-studio.js` FROZEN banner.
- **FAZ C Duyurular:** Yeni migration (3 tablo + RLS + RPC + trigger + storage policy), `profil-duyurular.js` feed client, `admin-announcements.js` composer, Bildirimler sayfası toggle.
**Prensipler:** Asla silme — kod + DB + data korunur. Unfreeze path her adımda dokümante. Regression sıfır (820 test suite). Vanilla JS pattern korunur.
**Elenen alternatifler:**
- Clean Archive (dosya taşıma) — merge riski, rollback büyür
- Feature Flag + Lazy Load — vanilla/IIFE/Safari `var` guard pattern'iyle çelişir
- Tam silme — "asla silme" prensibi ihlali
- Koç'u başka yere taşıma — scope patlar, ayrı iş olarak ertelendi
**Detay:** [[../../docs/superpowers/specs/2026-04-13-studio-freeze-duyurular-design]]

---

## K031 — Kim Baktı Backend Audit + Açık Backlog
**Tarih:** 14 Nisan 2026
**Karar veren:** Tuna + Claude
**Karar:** Profiline Bakanlar (Kim Baktı) panelinin frontend'i K060 ile editorial vocabulary'e taşındı. Backend audit'i yapıldı; veri katmanı kısmen hazır, kısmi eksik. Eksikler P0/P1/P2 olarak işaretlenip vault backlog'a alındı. Önce P0 maddeler kapatılmadan premium gate açılmaz.

### Frontend yapısı (HAZIR — K060)
- `css/panels/kimbakti.css` (420 satır, .kb-* vocab)
- `profil-kimbakti.js` rewritten — DOM template emitters editorial classes
- Tüm 16 ID korundu (kb-total, kb-chart, kb-segments, kb-seg-bars, kb-viewers, kb-viewer-list, kb-viewers-lock, kb-conversion, kb-conversion-body, kb-premium-cta, kb-empty, kb-empty-pct, kb-skeleton, kb-hero, kb-trend, kb-last-viewed)
- `loadViewersCard()` contract korundu, `supabase.from('candidate_view_stats')` + `.from('profile_view_events').select('*, companies(company_name, segment)')` çağrıları yapıyor

### Backend gerçek durumu
- ✅ EXISTS (live): `candidates.is_premium`, `candidates.premium_until` (`20260327000000_premium_entitlement.sql`)
- ⚠️ PARTIAL: `candidate_view_stats` tablosu — `docs/migrations/040_profile_view_tracking.sql`'de tanımlı ama `supabase/migrations/`'a promote edilmemiş. `20260406093548_supabase_advisor_fixes.sql` "SA2: SKIPPED — candidate_view_stats table does not exist" diyor.
- ⚠️ PARTIAL: `profile_view_events` tablosu — aynı arşiv migration'da, live DB'de yok büyük ihtimalle.
- ❌ MISSING: `companies.segment` kolonu — segment `brands` tablosunda, `companies`'te yok. `select('*, companies(segment)')` join'i her satırda silently null döner.
- ❌ MISSING: `is_premium` flag wire — `loadViewersCard()` her zaman hardcoded `var isPremium = false`. `_loadedDBData.profile.is_premium`'a bağlanmıyor. Premium aktif olsa bile panel locked kalır.
- ❌ MISSING: `track_profile_view` RPC yok. Yazma yolu `ik.html`'den direct `.insert()` — table yoksa silent fail.
- ❌ MISSING: Week-over-week trend backend. `_setStat('trend', '—')` placeholder.

### Backlog (öncelik sırasıyla)

**[P0] PVT-1** — `docs/migrations/040_profile_view_tracking.sql`'i `supabase/migrations/YYYYMMDDHHMMSS_promote_view_tracking.sql` olarak promote et + `npm run db:push` + live'da `profile_view_events` ve `candidate_view_stats` varlığını verify et. Aksi halde her aday "0 görüntülenme" görür kalıcı olarak.

**[P0] PVT-2** — `companies.segment` join hatası fix. Seçenekler:
- (a) Join'i kaldır, segment'i `position_seg_snapshot`'tan oku (zaten event satırında)
- (b) Insert sırasında employer'ın `hr_profiles.company_id → companies → brands` chain'inden segment çek ve `position_seg_snapshot`'a yaz
- (c) `companies.segment` kolonu ekleyen migration yaz (gerçeği `brands.segment` yansıtmıyor — önerilmez)

Önerilen: **(a)** — event satırından oku, join'i sil. Minimal değişiklik, semantik doğru.

**[P1] PVT-3** — `is_premium` flag wire. `profil-bootstrap.js`'te `loadViewersCard(cid)` çağrısına ikinci arg olarak `_loadedDBData.profile.is_premium` veya `kimbakti.js` içinde `_loadedDBData`'dan oku. Premium gate aktivasyonu için zorunlu.

**[P1] PVT-4** — `pve_employer_insert` RLS policy live'da çalışıyor mu doğrula. Migration 040'taki policy `EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid())` kontrolü — `ik.html` session bunu satisfies ediyor mu test et. Yoksa insert'ler 401/42501 ile fail eder.

**[P2] PVT-5** — `position_seg_snapshot` reliable populate. Şu an sadece employer drawer açtığında position context varsa yazılıyor. Generic profile views null kalıyor → segment chart çoğu kullanıcıda boş. Insert sırasında `hr_profiles → companies → brands.segment` chain'inden derive et.

**[P2] PVT-6** — Week-over-week trend backend. `candidate_view_stats`'a `views_last_week` + `views_prev_week` kolonları veya nightly cron RPC. UI `kb-trend` cell'i şu anda "—" placeholder gösteriyor.

**Neden bu sıra:** P0 olmadan panel her durumda 0 gösterir → kullanıcı beta'da güveni kaybeder. P1 olmadan premium subscription geliştirilse de panel açılmaz. P2'ler nice-to-have, MVP critical path değil.

**Detay:** [[../../docs/superpowers/specs/2026-04-14-kimbakti-redesign-mockup]] (frontend mockup), audit 14 Nisan session'ında.

---

*Son güncelleme: 14 Nisan 2026*
