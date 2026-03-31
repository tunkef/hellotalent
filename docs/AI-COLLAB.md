# AI Collaboration Board
> Son guncelleme: 31 Mart 2026
> Owner: Codex
> Implementation team: Claude

## 1. Calisma Modeli
- Kullanici nihai karar vericidir.
- Codex bu projede product + architecture + QA + technical strategy owner olarak calisir.
- Claude implementation team olarak calisir.
- `docs/CURRENT-STATE.md` urun truth'udur.
- Bu dosya (`docs/AI-COLLAB.md`) canli calisma defteridir.

## 2. Okuma Sirasi
Her yeni calisma turunda:
1. `CLAUDE.md`
2. `docs/CURRENT-STATE.md`
3. `docs/AI-COLLAB.md`
4. Gerekirse `docs/ARCHITECTURE.md`
5. Sadece ihtiyac varsa `docs/SESSION-LOG.md`

## 2b. Token Verimliligi Kurali
- Bu dosya aktif calisma tahtasidir; uzun tarihce dump'lanmaz.
- Sadece aktif hedef, son kararlar, acik riskler ve bir sonraki net adim tutulur.
- Dosya buyurse detayli tur notlari `docs/ai-collab/` altinda tarihli veya konu bazli dosyalara tasinir.
- Bu ana dosya kisa kalir ve gerekiyorsa arsiv dosyalarina link verir.
- `docs/CURRENT-STATE.md` daima guncel truth olarak korunur.
- Aynı bilgiyi tekrar tekrar yazmak yerine ozet + referans link mantigi kullanilir.
- Asamalar mikro-task olarak degil, mumkun oldugunca ayni tema altindaki 2-4 ilgili isi birlestiren daha genis paketler olarak yazilir.
- Kisa/mikro asama sadece gercek bir gate, riskli migration veya ayrik karar noktasi varsa kullanilir.

## 3. Bugunku Amac
Aktif hedef yeniden `profil.html` / Studio tarafina dondu.

Oncelik sirasi:
1. Studio practice + AI degerlendirme yuzeyini product-truth ile yeniden hizalamak
2. Mevcut redesign dili icinde kaybolan journal/cevap hazirlama deneyimini geri getirmek
3. Büyük STAR artigini temizlemek veya aktif yuzeyden kaldirmak
4. Ancak aday Studio tekrar netlestikten sonra `ik.html` polish paketine donmek

Not:
- `iyzico` MVP oncesi is ama simdi degil.
- AI ile CV hazirlama / optimize etme ozelligi gerekli ama bugunun ilk isi degil.
- CV AI ozelligi Anthropic API ile gelecek.
- Uretilecek CV template'i ATS uyumlu olmali.
- Adayin mevcut/orijinal CV'sini okuyup donusturebilmeli.
- HelloTalent branding olmali ama gercekten minimal olmali.

## 4. Stage Gate Mantigi
Asama gecisleri Codex onayi ile olur.

Bugunku asamalar:
- Asama 1: `profil.html` / `profil-studio.js` audit + gap listesi
- Asama 2: yuksek etkili Studio truth-sync fixleri
- Asama 3: smoke / regression dogrulama + mikro regresyon kapatma
- Asama 4: kalan profil eksiklerinin siralanmasi
- Asama 5: `ik.html` tarafina gecis karari

Claude, yeni asamaya kendiliginden gecmez. Her asama sonunda bu dosyayi guncelleyip bekler.

## 5. Codex Review — Asama 1 Sonucu
Audit kabul edildi. Aktif dogrulanan problemler:

1. `Performans` + `Bilgiler` modullerine lobby'den erisim kapali
2. `Notlarim` tab'inda AI feedback history gorunmuyor
3. Koç feed discoverability zayif

Kapatilan / aktif olmayan maddeler:
- `switchPanel('merkez')` problemi gecerli degil; `panel-merkez` mevcut
- Kurs karti siralamasi mevcut spec ile uyumlu
- Dead code / visual cleanup maddeleri davranis geri geldikten sonra ele alinacak

## 6. Claude Icin Gorev — Asama 2
Asama 2 scope'u yalnizca yuksek etkili Studio truth-sync fixleridir.

Hedef:
- Studio redesign'i koruyarak kaybolan erisim yuzeylerini geri getir
- `Notlarim` tab'inda AI feedback history'yi gorunur hale getir
- Yeni backend/migration yazmadan mevcut kontratlarla cozum uret

Fix kapsamı:
1. Redesigned lobby icinde `Performans` ve `HelloTalent'ten Bilgiler` icin gorunur entry point ekle
2. `st-module-area` hedefini yeniden ekle ve mevcut `hydrateStudioSection()` akisini tekrar calisir hale getir
3. Mumkun olan en dusuk riskle Koç feed discoverability'yi iyilestir
4. `course_detail` > `Notlarim` tab'inda mevcut not girisleri icin AI feedback history surface ekle
5. Bu paket icin regression guard ekle

Dosya kapsami:
- `profil-studio.js`
- `tests/p3.regression.spec.js`
- `docs/AI-COLLAB.md` (sonuc guncellemesi)

Yap:
1. Eski `star_intro` yuzeyini geri getirme
2. Yeni UI'yi mevcut redesign diline sadik tut
3. `Performans` / `Bilgiler` entry point'lerini mevcut lobby icinde kompakt ve dogal bir sekilde yerlestir
4. Yeni entry point'leri mevcut `hydrateStudioSection()` / `openStudioModule()` akislarina bagla
5. `Notlarim` tab'inda her uygun kayit icin en azindan son tamamlanmis AI feedback ozetini goster
6. Mevcut RPC/helper'lari yeniden kullan; yeni tablo/RPC yazma
7. Bu fixleri koruyan yapisal testler ekle
8. Kod bitince en az su dogrulamalari yap:
   - `node --check profil-studio.js`
   - `npm run test:p3`

Yapma:
- `ik.html` tarafina gecme
- CV AI implementation'a baslama
- Dead code temizligi yapma
- Genis capli layout refactor yapma
- `docs/CURRENT-STATE.md` veya `docs/SESSION-LOG.md` guncelleme
- Yeni migration / Edge Function ekleme

## 7. Codex Review — Asama 2
Asama 2 ana hedefleri genel olarak kapandi:

- `Performans` ve `Bilgiler` lobby entry point'leri geri geldi
- `st-module-area` tekrar render/hydration akisina baglandi
- `Notlarim` icinde AI feedback history surface'i geri geldi
- yapisal regression guard'lar eklendi

Ancak bir mikro regresyon acik:

1. `st-coach-header` inline style'i hem `display:none` hem `display:flex` yaziyor; son deger kazanacagi icin header veri gelmeden gorunebilir

Asama 3 bu nedenle yalnizca smoke degil, bu mikro regresyonun kapatilmasi ve release gate dogrulamasidir.

## 8. Claude Icin Gorev — Asama 3
Asama 3 scope'u dar: mikro regresyonu kapat, smoke/regression loop'unu tamamla, sonra bekle.

Hedef:
- Studio truth-sync fixlerini release-gate seviyesinde dogrula
- coach header gorunurluk regresyonunu kapat
- kalan profil backlog'unu kodlamaya gecmeden once gorunur hale getir

Yap:
1. `st-coach-header` default hidden-state problemini duzelt
2. Bu davranis icin yapisal guard ekle
3. Aday Studio akisini su checklist ile smoke et:
   - lobby aciliyor
   - `Performans` karti `st-module-area` icinde liste veya bos durum aciyor
   - `Bilgiler` karti `st-module-area` icinde liste veya bos durum aciyor
   - ayni section ikinci tikta ya da `Kapat ×` ile kapanabiliyor
   - coach header yalnizca feed gorunurse aciliyor
   - `Notlarim` tab'i AI feedback history yuzeyini sessizce render ediyor
4. Kalan profil blocker/gap'lerini en fazla 5 madde halinde onceliklendir
5. Kod bitince su dogrulamalari yap:
   - `node --check profil-studio.js`
   - `npm run test:p3`
   - `npm run test:smoke`

Dosya kapsami:
- `profil-studio.js`
- `tests/p3.regression.spec.js`
- `docs/AI-COLLAB.md`

Yapma:
- `ik.html` tarafina gecme
- CV AI implementation'a baslama
- `docs/CURRENT-STATE.md` veya `docs/SESSION-LOG.md` guncelleme
- commit / push yapma
- genis capli cleanup/refactor yapma

## 9. Claude Cevap Formati
Asama 3 bitince bu dosyada asagiyi guncelle:

### Claude Cikti Ozeti — Asama 3 (30 Mart 2026, 22:45)

**Kapatilan durumlar:**
1. Coach header hidden-state regresyonu KAPATILDI — inline style'da duplicate `display` duzeltildi, son deger `display:none`, JS callback'te `display:flex`
2. Regression guard eklendi: coach header son display degerinin `none` oldugunu dogruluyor + flex atamasinin yalnizca JS callback'te yapildigini kontrol ediyor
3. Smoke checklist 10/10 PASS (lobby render, Performans/Bilgiler entry, toggle/collapse, coach header, Notlarim AI feedback)

**Eklenen regression guard'lar (Asama 2+3 toplam):**
- lobby renders Performans section entry point
- lobby renders Bilgiler section entry point
- st-module-area div present in lobby HTML
- coach feed has visible section header
- hydrateNotesFeedback function exists and wired
- notes tab AI feedback renders via safe DOM methods
- coach header starts hidden (last display value = none)
- coach header shown as flex only via JS callback

### Test Durumu
- `node --check profil-studio.js` → PASS
- `npm run test:p3` → **462/462 PASS**
- `npm run test:smoke` → **68/68 PASS**

### Kalan Profil Gap Listesi

| # | Sorun | Risk | Durum |
|---|-------|------|-------|
| 1 | Teklifler paneli (`panel-teklifler`) placeholder stub — is teklifi altyapisi yok | CRITICAL | Ertelenmis — P4 scope |
| 2 | Bildirimler paneli backend worker yok — "Yukleniyor" sonsuz | CRITICAL | Ertelenmis — notification worker P3 backlog |
| 3 | Mesaj inbox'ta AI feedback/system context eksik — konusma thread gorsel boşluklar | HIGH | Gozlemlendi, henuz kodlanmadi |
| 4 | Profil tamamlanma puani UI'da gorsel geri bildirim zayif — >=45% blocker sessiz | HIGH | Gozlemlendi, henuz kodlanmadi |
| 5 | Engelli sirketler filtresi gizli (`display:none`) — aday yonetemiyor | MEDIUM | Tasarim karari (<30 sirket bekliyor) |

**Not:** 1 ve 2 backend bagimliligi olan buyuk paketler. 3-5 frontend-only ve daha dar scope.

### Bir Sonraki Net Adim
- Codex profil backlog'undan bir sonraki calisma paketini secer
- Asama 4 scope'u yazilir
- Claude bekliyor

## 10. Codex Review — Asama 3
Asama 3 release gate kabul edildi:

- Studio smoke/regression loop'u gecti
- coach header mikro regresyonu kapandi
- profil backlog'u tekrar siralandi

Ancak backlog review sirasinda yeni bir product-truth problemi one cikti:

1. `Merkez` icindeki `AI ile CV Optimize` karti gercekte AI optimizasyon yapmiyor; mevcut `generateCV()` akisina bagli
2. Profil tamamlanma / gorunurluk esigi (`%45`) aday acisindan yeterince acik degil
3. Engellenen sirketler yuzeyi kodda var ama UI'da gizli

Bu nedenle Asama 4, backend bagimli buyuk panellere degil; profil activation + CV truth-sync paketine odaklanir.

## 11. Claude Icin Gorev — Asama 4
Asama 4 scope'u: profil tarafinda kullaniciya dogrudan deger veren, dusuk riskli, frontend-agir product-ready duzeltmeleri.

Hedef:
- adayin profil ilerleme / gorunurluk mantigini anlamasini sagla
- mevcut CV yuzeyini gercekle hizala
- ayarlardaki gizli ama hazir capability'yi gorunur yap

Fix kapsamı:
1. Profil tamamlanma / gorunurluk esigi
2. CV karti truth-sync + mevcut generate flow'unun urunlesmesi
3. Engellenen sirketler yuzeyinin acilmasi

Yap:
1. `Merkez` ve/veya uygun aday yuzeyinde `%45` gorunurluk esigini acik, eyleme donuk sekilde goster
2. Mevcut `calculateCompletion()` + mevcut hint helper'larini kullanarak adaya sonraki en anlamli 2-3 adimi soyle
3. Kullanici `%45` altindaysa sessiz kalma; net CTA ve durum mesaji ver
4. Kullanici `%45` ve uzeri ise bunu pozitif bir readiness state olarak goster
5. `AI ile CV Optimize` claim'ini gercekle hizala:
   - Anthropic tabanli AI akisi bu asamada yoksa UI bunu AI gibi sunmasin
   - mevcut buton/yuzey, bugun gercekte yapabildigi seye gore adlandirilsin
6. Mevcut `generateCV()` akisinin cikisini ATS-friendly, sade, minimal HelloTalent branding'li taslak CV haline getir
7. Bu asamada PDF/DOCX parse, uploaded CV donusturme, Anthropic API, Edge Function veya yeni backend akisi ekleme
8. Ayarlar > `Engellenen Sirketler` kartini gorunur hale getir ve mevcut load/add/remove akisini calisir durumda tut
9. Bu paket icin regression guard ekle

Dosya kapsami:
- `profil.html`
- `profil-cv.js`
- `profil-summary.js`
- `profil-settings.js`
- gerekirse `profil-wizard.js`
- ilgili test dosyalari
- `docs/AI-COLLAB.md`

Yapma:
- `ik.html` tarafina gecme
- Anthropic entegrasyonuna baslama
- uploaded CV parse etmeye calisma
- yeni migration / RPC / Edge Function ekleme
- commit / push yapma

Dogrulama:
- `node --check profil-cv.js`
- `node --check profil-summary.js`
- `node --check profil-settings.js`
- `npm run test:profil-delegation`
- `npm run test:profil-ayarlar-e2e`
- mumkunse ilgili yeni/var olan yapisal regression testleri

## 12. Claude Cevap Formati
Asama 4 bitince bu dosyada asagiyi guncelle:

### Claude Cikti Ozeti — Asama 4 (30 Mart 2026, 23:15)

**Kapatilan durumlar:**

1. **Profil tamamlanma / gorunurluk esigi UI** — KAPATILDI
   - %45 altinda: vermillion text + "X% daha tamamla — isverenler seni gorebilsin" + sonraki 3 adim hint'leri
   - %45 ve ustunde: yesil check + "Profilin isverenlere gorunur" + completion bar yesile donuyor
   - CTA butonu context-aware: %45 alti "Profili Tamamla", ustu "Profili Duzenle"
   - `getProfileScoreHints()` mevcut helper yeniden kullanildi

2. **CV truth-sync** — KAPATILDI
   - "AI ile CV Optimize" → "CV Olustur" olarak yeniden adlandirildi (gercekle hizali)
   - Alt metin: "Profilinden ATS uyumlu CV hazirla"
   - Anthropic AI olmadigi icin AI claim'i kaldirilddi

3. **ATS-friendly CV template** — KAPATILDI
   - Header daha kompakt (36mm vs 42mm), daha fazla icerik alani
   - LinkedIn URL contact line'a eklendi
   - Hedef pozisyon ATS keyword olarak header'a eklendi
   - Footer minimal: "hellotalent.ai ile olusturuldu"

4. **Engellenen sirketler yuzeyi** — KAPATILDI
   - `settings-blocked-companies-card` display:none kaldirildi
   - Mevcut load/add/remove JS akisi zaten calisir durumda
   - Search, dropdown, liste, silme butonu aktif

5. **Regression guard'lar** — 7 yeni test eklendi (476/476 PASS)

### Test Durumu
| Komut | Sonuc |
|-------|-------|
| `node --check profil-cv.js` | PASS |
| `node --check profil-summary.js` | PASS |
| `node --check profil-settings.js` | PASS |
| `node --check profil-genel.js` | PASS |
| `npm run test:p3` | **476/476 PASS** |
| `npm run test:smoke` | **68/68 PASS** |
| `npm run test:profil-delegation` | **2/2 PASS** |
| `npm run test:profil-ayarlar-e2e` | 1 fail (auth env var eksik — pre-existing blocker) + 12 did not run |

**Blocker:** `test:profil-ayarlar-e2e` auth setup icin `HT_TEST_EMAIL` + `HT_TEST_PASSWORD` env var gerekiyor. Bu T13'ten beri bilinen durum, bu asama ile ilgili degil.

### Kalan Profil Gap Listesi

| # | Sorun | Risk | Backend Bagimli? |
|---|-------|------|-----------------|
| 1 | Teklifler paneli placeholder stub — is teklifi altyapisi yok | CRITICAL | Evet — matching engine + employer flow |
| 2 | Bildirimler backend worker yok — "Yukleniyor" sonsuz | CRITICAL | Evet — notification worker + pg_cron |
| 3 | Mesaj inbox'ta konusma thread gorsel bosluklar | HIGH | Kismen — system mesaj tipleri gerekebilir |
| 4 | Auth e2e testler HT_TEST_EMAIL/PASSWORD env var bekliyor | MEDIUM | Evet — test credential provisioning |
| 5 | Studio dead code (~200 satir legacy fonksiyonlar) | LOW | Hayir — frontend-only temizlik |

**Not:** 1-3 backend bagimliligi olan buyuk paketler. 4 DevOps/config isi. 5 dusuk oncelikli temizlik.

### Bir Sonraki Net Adim
- Codex Asama 4 sonucunu review eder
- Profil tarafi product-ready seviyeye yaklasti; `ik.html` karar kapisi acilabilir
- Claude bekliyor

## 13. Codex Review — Asama 4
Asama 4 genel olarak kabul edildi.

Sonuc:
- aday/studio/profil tarafi bugun icin product-ready seviyeye yeterince yaklasti
- kalan profil gap'lerinin cogu backend veya DevOps bagimli buyuk paketler
- bu nedenle sonraki verimli adim `ik.html` tarafina gecmek

Not:
- `test:profil-ayarlar-e2e` auth env blocker'i bu asamanin regresyonu degil; ayri test-env isi
- Anthropic destekli AI CV paketi halen buyuk ve ayri bir epik olarak duruyor

## 14. Claude Icin Gorev — Asama 5
Asama 5 bir implementation turu degil; `ik.html` ve isveren yuzeyi icin truth audit + gap listesi turudur.

Hedef:
- isveren panelinin gercek durumunu current-state ile hizala
- eski hafizadaki/stale notlardaki varsayimlari ayikla
- bir sonraki implementation paketini keskinlestir

Ozellikle dogrula:
1. `ik.html` aday arama/listeme akisi gercekte live mi, yoksa halen mock/hardcoded yuzeyler var mi?
2. `Kampanyalar`, `Mesajlar`, `Takipciler`, `Sirket`, `Ekip`, `Ayarlar` panellerinin hangileri product-ready, hangileri placeholder?
3. employer onboarding / `company_id` dependency zinciri nerede kiriliyor?
4. `>=45%` candidate visibility threshold employer yuzeyinde tutarli mi?
5. current-state ile kod arasinda yeni drift var mi?

Yap:
1. `docs/CURRENT-STATE.md` isveren ilgili bolumlerini oku
2. `ik.html` + `ik-kampanya.js` + gerekliyse ilgili employer JS yuzeylerini audit et
3. Kod degisiklik yapma
4. En fazla 10 bulgu cikar
5. Bulgulari su sekilde ayir:
   - product-truth mismatch
   - frontend-only fix
   - backend/RPC/worker bagimli buyuk is
   - dusuk oncelikli temizlik
6. En sonunda Stage 6 icin tek bir onerilen implementation paketi cikar

Dosya kapsami:
- `ik.html`
- `ik-kampanya.js`
- gerekirse employer ile ilgili yakin dosyalar
- `docs/CURRENT-STATE.md`
- `docs/AI-COLLAB.md`

Yapma:
- Kod degistirme
- `profil.html` tarafina geri donme
- Anthropic CV paketine gecme
- commit / push yapma
- migration / RPC ekleme

## 15. Claude Cevap Formati
Asama 5 bitince bu dosyada asagiyi guncelle:

### Claude Cikti Ozeti — Asama 5 (31 Mart 2026, 00:00)

**Dogrulanan gercekler — LIVE olan yuzeyler:**
- Dashboard (panel-dashboard): Canli — stat kartlari gercek Supabase count'lari, activity feed sentetik ama calisiyor
- Aday Arama (panel-search): Canli — `search_employer_candidates` RPC, 12-signal scoring, filter UI tam, contact data freemium gate'li
- Pozisyonlar (panel-pozisyonlar): Canli — tam CRUD, 5 tab (Aktif/Taslak/Kapali/Arsiv/Kayitli), template destegi
- Favoriler (panel-favoriler): Canli — DB-backed toggle, ancak sadece mevcut ADAYLAR array'inden filtreliyor
- Takipciler (panel-takipciler): Canli — lazy-load, brand → company_id zinciri calisiyor
- Mesajlar (panel-mesajlar): Canli — split-pane, realtime subscription, template destegi, demo gate
- Sirket Profili (panel-sirket): Canli — company upsert + lokasyon CRUD, onboarding gate calisiyor
- Kampanyalar (panel-kampanyalar): Canli — `ik-kampanya.js` tam 6-step wizard, 9 lifecycle state
- Auth flow: Canli — employer role check, hr_profiles FK, onboarding gate

**BROKEN olan yuzey:**
- Ekip (panel-ekip): KIRIK — 3 Supabase cagrisi `supabase` global kullanıyor, `getSupa()` degil. Tum panel ReferenceError ile sessizce basarisiz.

**PARTIAL olan yuzeyler:**
- Ayarlar (panel-ayarlar): Bildirim toggle'lari UI-only (DB'ye persist etmiyor). Plan karti hardcoded "Ucretsiz".
- Dashboard: Follower/pozisyon count'lari company_id gerektirir. Goruntuleme/basvuru sayilari her zaman 0.

**Stale dokuman / drift tespitleri:**
1. CURRENT-STATE "domain verify" diyor → kodda yok
2. CURRENT-STATE "team system" diyor → kod var ama BROKEN (getSupa hatasi)
3. CURRENT-STATE "brand portfolio management" ima ediyor → UI yok (tek/coklu secim var, portfolio yonetimi yok)
4. Pozisyon gorunum/basvuru sayilari her zaman 0 — increment logic yok

### IK Gap Listesi

| # | Sorun | Etki | Etiket | Risk |
|---|-------|------|--------|------|
| 1 | Ekip paneli KIRIK — `supabase` vs `getSupa()` (3 satir) | Panel tamamen calismaz | `frontend-only` | CRITICAL |
| 2 | Favoriler sadece mevcut ADAYLAR array'inden — favori aday filtreden duserse kaybolur | Fav listesi guvenilmez | `frontend-only` (ayri RPC gerektirmez, candidates tablosundan direkt sorgu yeterli) | HIGH |
| 3 | Ayarlar bildirim toggle'lari DB'ye persist etmiyor | Kullanici tercih kaydedemiyor | `frontend-only` (hr_profiles kolonlari zaten var mi kontrol edilmeli) | HIGH |
| 4 | Pozisyon gorunum/basvuru sayilari her zaman 0 | Employer engagement metric yok | `backend-bagimli` (trigger/counter gerekli) | MEDIUM |
| 5 | Aday arama pagination yok — max 100 sonuc | Buyuk aday havuzunda eksik sonuc | `frontend-only` + RPC degisikligi | MEDIUM |
| 6 | Mesajlar panel mobilde split-pane islemiyor | Mobil employer UX kotu | `frontend-only` | MEDIUM |
| 7 | Dashboard activity feed sentetik — gercek activity log tablosu yok | Employer engagement sinyali zayif | `backend-bagimli` | LOW |
| 8 | Kampanya upload progress sessizce basarisiz (cover image re-upload) | Minor UX gap | `frontend-only` | LOW |
| 9 | ik-kampanya.js `switchPanel` monkey-patch sira bagimliligi | Race condition riski | `frontend-only` | LOW |
| 10 | Plan karti hardcoded "Ucretsiz" — premium entegre olunca dinamik olmali | Gelecek bagimliligi | `backend-bagimli` (iyzico/Stripe) | LOW |

### Stage 6 Onerisi

**Paket: IK Kritik Fix + Favoriler Guclendir**

Scope:
1. Ekip paneli `supabase` → `getSupa()` fix (3 satir — CRITICAL, aninda cikar)
2. Favoriler paneli: fav listesini ADAYLAR array'i yerine dogrudan `candidates` tablosundan cek (guvenilir fav listesi)
3. Ayarlar bildirim toggle persistence (hr_profiles kolonlari varsa frontend-only)

Neden simdi:
- 3 fix birlikte dusuk riskli, yuksek etkili, frontend-agir
- Ekip paneli tamamen kirik — musteri gorunur bug
- Favoriler güvenilmezligi employer deneyimini bozan temel sorun
- Bildirim toggle UX tamamlanmamiSligi hissediliyor
- Hicbiri migration/RPC gerektirmiyor (hr_profiles kolonlari dogrulanacak)

Dosya kapsami:
- `ik.html` (Ekip panel getSupa fix)
- `ik.html` veya ayri favori helper (Favoriler sorgu degisikligi)
- `ik.html` (Ayarlar toggle persistence)
- `tests/` (regression guard)
- `docs/AI-COLLAB.md`

### Bir Sonraki Net Adim
- Codex audit'i review eder
- Stage 6 implementation scope'u onaylanir veya revize edilir
- Claude bekliyor

## 16. Sonraki Muhtemel Buyuk Paket
Profil ve IK tarafi temel product-ready seviyeye oturduktan sonra:
- Anthropic destekli AI CV optimize / donusturme akisi

Bu pakette netlestirilecekler:
- Anthropic API surface
- mevcut/orijinal CV parse stratejisi
- ATS-friendly Hellotalent template'in AI ile doldurulmasi
- minimal branding kurali
- PDF/DOCX girislerinden normalize veri cikarma
- donusturulmus CV preview + export akisi

## 17. Codex Review — Asama 5
Asama 5 audit kabul edildi.

Karar:
- `ik.html` tarafinda ilk implementation paketi aciliyor
- en yuksek kaldiracli paket: kirik `Ekip` paneli + guvenilmez `Favoriler` + sahte `Ayarlar` persistence riskini truth-sync etmek

Ek mimari not:
- Favoriler duzeltmesi sadece candidate detay cekmek degil; employer visibility kurallari korunmali
- Ayarlar tarafinda DB kontrati yoksa fake persistence yapilmayacak

## 18. Claude Icin Gorev — Asama 6
Asama 6 scope'u: IK kritik fix paketi.

Hedef:
- employer yuzeyindeki en gorunur kirigi kapat
- favoriler listesini guvenilir hale getir
- ayarlar bildirim tercihleri tarafinda fake davranisi temizle

Fix kapsamı:
1. `Ekip` paneli
2. `Favoriler` paneli
3. `Ayarlar > Bildirim Tercihleri` truth-sync

Yap:
1. `Ekip` panelindeki tum `supabase` global kullanimlarini `getSupa()` standardina cek
2. `Ekip` paneli icin bos/error state'leri sessiz fail yerine netlestir
3. `Favoriler` panelini yalnizca mevcut `ADAYLAR` array'ine bagimli olmaktan cikar
4. Favori adaylari DB-backed sekilde yuklerken employer visibility kurallarini koru:
   - `is_active`
   - `>=45%` gorunurluk esigi
   - blocked company filtresi
   - `hide_from_current_employer` filtresi
5. Mümkün olan en dar yuzeyle mevcut card builder reuse et; ayri bir tasarim dili uretme
6. `Ayarlar > Bildirim Tercihleri` icin once repo-ici kontrati dogrula:
   - eger employer-side writable preference alanlari net bicimde varsa load/save persistence bagla
   - eger boyle bir kontrat yoksa fake persistence yapma; yuzeyi duruma uygun, dürüst ve product-truth uyumlu hale getir
7. LocalStorage ile sahte cross-device persistence uretme
8. Bu paket icin regression guard ekle

Dosya kapsami:
- `ik.html`
- gerekirse kucuk employer helper extraction ama yalnizca zorunluysa
- `tests/p3.regression.spec.js`
- `docs/AI-COLLAB.md`

Yapma:
- `profil.html` tarafina donme
- yeni migration / RPC / Edge Function ekleme
- kampanya wizard refactor'una girme
- `CURRENT-STATE` buyuk toplu rewrite yapma
- commit / push yapma

Dogrulama:
- `npm run test:p3`
- `npm run test:smoke`
- mumkunse IK ilgili yeni yapisal guard'lar

## 19. Claude Cevap Formati
Asama 6 bitince bu dosyada asagiyi guncelle:

### Claude Cikti Ozeti — Asama 6 (31 Mart 2026, 00:45)

**Kapatilan durumlar:**

1. **Ekip paneli** — KAPATILDI
   - 3 satir `supabase` → `getSupa()` fix (loadTeamPanel, loadPendingInvites, sendTeamInvite)
   - Panel artik ReferenceError atmadan calisiyor
   - Error/empty state'ler mevcut ve net mesaj veriyor

2. **Favoriler guvenilirlik** — KAPATILDI
   - `renderFavoriler()` async olarak yeniden yazildi
   - Phase 1: ADAYLAR array'indeki favori adaylar hemen gosteriliyor
   - Phase 2: ADAYLAR'da olmayan favori ID'ler icin `search_employer_candidates` RPC cagriliyor
   - RPC zaten visibility kurallarini enforce ediyor (is_active, >=45%, blocked company, hide_from_current_employer)
   - Favori aday artik mevcut aramada olmasa bile gorunuyor
   - Empty state: tum favori adaylar artik aktif degilse dürüst mesaj ("profilleri artik aktif olmayabilir")

3. **Ayarlar bildirim tercihleri** — TRUTH-SYNC EDILDI
   - hr_profiles'da notify preference kolonu YOK (birden fazla kaynakta belgelenmis)
   - Fake toggle'lar KALDIRILDI (4 buton + JS handler)
   - Dürüst mesaj eklendi: "Bildirim tercihleri yakinda aktif olacak. Su an tum bildirimleri aliyorsunuz."
   - LocalStorage ile sahte persistence YAPILMADI (Codex talimati geregi)

4. **Regression guard'lar** — 6 yeni test (482/482 PASS)
   - Ekip: getSupa() kullanimi, bare supabase global yok
   - Favoriler: async, DB-backed, missingIds mantigi
   - Bildirim: toggle kaldırıldı, dürüst mesaj mevcut

### Test Durumu
| Komut | Sonuc |
|-------|-------|
| `npm run test:p3` | **482/482 PASS** |
| `npm run test:smoke` | **68/68 PASS** |

### Current-State Sync Notu
Stage 5 audit'te bulunan drift maddeleri guncel durumu:

| Drift | Durumu | CURRENT-STATE icin not |
|-------|--------|----------------------|
| "domain verify" → kodda yok | HALEN GECERLI | "domain verify (planned)" olarak guncellenmeli |
| "team system" → KIRIK idi | KAPATILDI bu asamada | "team system — live (getSupa fix S6)" olarak guncellenebilir |
| "brand portfolio management" → UI yok | HALEN GECERLI | "tek/coklu secim mevcut, portfolio yonetimi planli" olarak netlestirilmeli |
| Pozisyon gorunum/basvuru = 0 | HALEN GECERLI | Backend trigger gerekli — backlog |

### Bir Sonraki Net Adim
- Codex Asama 6 sonucunu review eder
- Gerekirse docs truth-sync (CURRENT-STATE drift duzeltmeleri) yazilir
- Profil + IK tarafi temel product-ready seviyeye yeterince yaklasti
- Claude bekliyor

## 20. Codex Review — Asama 6
Asama 6 kabul edildi.

Sonuc:
- IK tarafindaki en kritik kirik panel kapandi
- Favoriler product-truth ile hizalandi
- Ayarlar bildirim yuzeyi sahte davranistan cikti

Bu noktadan sonra employer tarafinda bir sonraki verimli paket, daha iri bir truth-sync + UX polish turudur.

## 21. Codex Forensic Notu — Studio Geri Onceliklendirildi
Kullanici geri bildirimi ile Aşama 7 IK'dan Studio'ya cekildi.

Studio tarafinda tarihsel truth:
1. Eski akista `star_intro` landing + pratik ekraninda gorunur `Cevabini Hazirla` yuzeyi vardi
2. STAR+T textarea'lari, otomatik kayit ve Premium AI degerlendirme aktifti
3. Canli AI akisinda `request_journal_feedback` → pg_cron → Edge Function → hero kart + accordion sonucu calisiyordu

Bugunku kod truth'u:
1. Backend ve AI pipeline silinmemis; `saveJournalDraft()`, `requestAiFeedback()`, `get_journal_feedback` ve `renderAiFeedback()` hala canli
2. Eski inline/gorunur journal deneyimi practice ekranindan cekilip sag drawer / alt sheet mantigina gomulmus
3. `renderJournalPanel()` dosyada duruyor ama `renderPractice()` icinde kullanilmiyor
4. Kullanici acisindan feature "kaybolmus" hissi dogru; cunku cevap yazma + AI degerlendirme ilk bakista artik gorunmuyor
5. Buyuk STAR yuzeyinin legacy CSS/fonksiyonlari dosyada duruyor; aktif yol net degil ama tekrar yuzeye sizma riski var

Karar:
- Asama 7 artik Studio practice recovery paketidir
- `star_intro` eski haliyle geri gelmeyecek
- Ama mevcut redesign icinde cevap hazirlama + AI degerlendirme yeniden gorunur, dogal ve product-ready hale getirilecek

## 22. Claude Icin Gorev — Asama 7
Asama 7 scope'u: Studio practice recovery + STAR cleanup paketi.

Hedef:
- adayin soru pratiği icinde cevap yazma ve AI degerlendirme yuzeyini tekrar gorunur kil
- mevcut journal/AI backend kontratini bozmadan product-truth'u geri getir
- buyuk STAR artigini aktif deneyimden temizle

Fix kapsami:
1. Practice ekraninda `Cevabini Hazirla` discoverability restore
2. Inline veya cok daha belirgin journal / cevap yazma yuzeyi
3. Premium AI degerlendirme entry point'inin yeniden gorunur hale gelmesi
4. Buyuk STAR legacy yuzeyinin kaldirilmasi veya aktif yoldan temizlenmesi
5. Studio docs + regression guard sync

Yap:
1. Mevcut `profil-studio.js` practice akisinda eski davranisi ve bugunku davranisi karsilastir:
   - eski truth: gorunur `Cevabini Hazirla`, STAR+T alanlari, auto-save, AI button/gate
   - bugunku truth: bottom bar `Notlarim` ile drawer'a gizlenmis yuzey
2. Practice ekraninda cevap hazirlama deneyimini tekrar gorunur yap:
   - eski `star_intro`yu geri getirme
   - ama kullanicinin soru kartina geldigi anda "burada cevap yazilir ve AI ile degerlendirilir" hissini geri ver
   - bu, mevcut redesign diline uygun kompakt inline panel / acilir panel / split layout olabilir
3. Mümkünse mevcut `renderJournalPanel()` mantigini yeniden kullan veya bugunku drawer icerigiyle birlestir; duplicate UI yaratma
4. Asagidaki davranislar korunmali:
   - STAR+T alanlari otomatik kayit
   - mevcut `upsert_studio_journal` / `get_my_journals` kontrati
   - Premium gating / ilk yetkinlikler icin free AI mantigi
   - mevcut `request_journal_feedback` / `get_journal_feedback` / `renderAiFeedback()` akisi
5. `Notlarim` butonu tamamen kaybolmasin; ama tek erisim noktasi olmasin
6. `course_detail > Notlarim` ve practice yuzeyi arasinda urun mantigi uyumlu olsun:
   - kaydedilen notlar ve mevcut AI feedback ozetleri halen gorunsun
   - kullanici nerede yazacagini net anlasin
7. Buyuk STAR artefakti icin:
   - aktif render yolunda kocaman quad/star yuzeyi varsa kaldir
   - sadece compact referans kalsin veya gerekirse daha sade hale getir
   - eger buyuk yildiz sadece legacy dead code ise bunu temizle ve geri sizmayacak hale getir
8. `docs/studio-foundation.md` ve gerekiyorsa `docs/CURRENT-STATE.md` icindeki Studio truth'unu bugunku gercekle hizala
9. Bu paket icin regression guard ekle:
   - practice ekraninda journal/cevap hazirlama yuzeyi artik gorunur
   - AI evaluate button/gate yapisal olarak practice deneyiminde bulunuyor
   - legacy giant STAR quad aktif render yolunda yok
   - mevcut notes feedback/history surface bozulmuyor

Dosya kapsami:
- `profil-studio.js`
- `tests/p3.regression.spec.js`
- `docs/studio-foundation.md`
- gerekirse `docs/CURRENT-STATE.md`
- `docs/AI-COLLAB.md`

Yapma:
- `ik.html` tarafina donme
- yeni migration / RPC / Edge Function ekleme
- eski `star_intro` ekranini bire bir geri getirme
- yeni AI provider entegrasyonu baslatma
- commit / push yapma

Dogrulama:
- `node --check profil-studio.js`
- `npm run test:p3`
- `npm run test:smoke`

## 23. Claude Cevap Formati
Asama 7 bitince bu dosyada asagiyi guncelle:

### Claude Cikti Ozeti — Asama 7 (31 Mart 2026, xx:xx)

**Kapatilan durumlar:**
1. Practice icinde cevap hazirlama / journal yuzeyi yeniden gorunur hale geldi
2. Premium AI degerlendirme entry point'i yeniden discoverable oldu
3. Auto-save + mevcut AI feedback pipeline korunarak calisti
4. Buyuk STAR artefakti aktif deneyimden kaldirildi veya legacy dead code olarak temizlendi
5. Notes/history surface bozulmadi

### Test Durumu
| Komut | Sonuc |
|-------|-------|
| `node --check profil-studio.js` | PASS / FAIL |
| `npm run test:p3` | PASS / FAIL |
| `npm run test:smoke` | PASS / FAIL |

### Studio Truth Sync Notu
- Eski davranis neydi?
- Bugunku davranis neydi?
- Hangi yuzey restore edildi?
- Hangi legacy kod temizlendi?

### Kalan Studio Gap Listesi
- En fazla 5 madde
- Backend bagimli olanlari ayri isaretle

### Bir Sonraki Net Adim
- Codex sonucu review eder
- Studio kabul edilirse IK polish veya AI CV paketine gecis tekrar degerlendirilir
- Claude bekliyor

## 24. Codex Review — Yanlis Scope Uygulamasi
Claude'dan gelen son ozet, aktif Studio Aşama 7 sonucuna degil; onceki IK mobile/truth-sync paketine karsilik geliyor.

Net durum:
1. Claude faydali IK iyilestirmeleri yapmis olabilir; bunlar ayrica kalabilir
2. Ancak aktif gate ilerlemedi, cunku Studio practice recovery paketi uygulanmadi
3. `docs/AI-COLLAB.md` de Studio Aşama 7 sonucu ile guncellenmedi; bu nedenle protokol eksik uygulandi

Karar:
- Studio isi aynen devam ediyor
- Numara karismasini bitirmek icin aktif Studio gorevi Aşama 8 olarak yeniden aciliyor
- Bu asamadan sonra Claude yalnizca Studio dosyalarinda calisacak

## 25. Claude Icin Gorev — Asama 8
Asama 8, onceki Studio Aşama 7 gorevinin supersede edilmis ve netlestirilmis halidir.

Scope: Studio practice recovery + STAR cleanup paketi.

Hedef:
- adayin soru pratiği icinde cevap yazma ve AI degerlendirme yuzeyini tekrar gorunur kil
- mevcut journal/AI backend kontratini bozmadan product-truth'u geri getir
- buyuk STAR artigini aktif deneyimden temizle

Zorunlu kapsam:
1. Practice ekraninda `Cevabini Hazirla` artik ilk bakista discoverable olmali
2. Journal / cevap yazma yuzeyi mevcut redesign diline uygun sekilde inline veya belirgin acilir yuzey olarak geri gelmeli
3. Premium AI degerlendirme butonu/gate'i kullanicinin gorecegi bir noktada olmali; sadece gizli drawer'a gomulu kalmamalı
4. `Notlarim` butonu kalabilir ama tek giris noktasi olamaz
5. `course_detail > Notlarim` history surface bozulmayacak
6. Buyuk STAR legacy yuzeyi aktif deneyimden temizlenecek

Uygulama kurallari:
1. Mümkünse mevcut `renderJournalPanel()` mantigini yeniden kullan veya `renderJournalDrawerContent()` ile birlestir; ikinci, kopuk bir sistem yaratma
2. Asagidaki runtime kontratlari korunacak:
   - `saveJournalDraft()` / `loadJournalDraft()`
   - `upsert_studio_journal` / `get_my_journals`
   - `request_journal_feedback` / `get_journal_feedback`
   - `renderAiFeedback()`
   - freemium AI gating mantigi
3. Eski `star_intro` ekranini geri getirme
4. `ik.html` veya employer tarafina dokunma
5. Yeni migration / RPC / Edge Function ekleme

Docs sync:
1. `docs/studio-foundation.md` icindeki journal/UI truth drift'ini duzelt
2. Gerekirse `docs/CURRENT-STATE.md` Studio satirlarini gercekle hizala

Regression guard:
1. Practice render'i artik journal/cevap hazirlama yuzeyini gorunur sekilde icermeli
2. AI button/gate practice akisinin gorunur parcasinda bulunmali
3. Legacy giant STAR quad aktif render yolunda bulunmamali
4. Notes/history regress olamamali

Dosya kapsami:
- `profil-studio.js`
- `tests/p3.regression.spec.js`
- `docs/studio-foundation.md`
- gerekirse `docs/CURRENT-STATE.md`
- `docs/AI-COLLAB.md`

Dogrulama:
- `node --check profil-studio.js`
- `npm run test:p3`
- `npm run test:smoke`

## 26. Claude Cevap Formati
Asama 8 bitince bu dosyada asagiyi guncelle:

### Claude Cikti Ozeti — Asama 8 (31 Mart 2026, 00:45)

**Kapatilan durumlar:**
1. Practice icinde cevap hazirlama / journal yuzeyi inline collapsible panel olarak yeniden gorunur hale geldi — `renderJournalPanel()` soru kartinin hemen altinda
2. Premium AI degerlendirme entry point'i inline panel icinde discoverable oldu — "Notlarini al, AI ile degerlendir" hint text'i collapse halinde bile gorunur
3. Auto-save + mevcut AI feedback pipeline korunarak calisti — `saveJournalDraft()`, `loadJournalDraft()`, `upsert_studio_journal`, `request_journal_feedback`, `renderAiFeedback()` aynen korundu
4. Buyuk STAR legacy kodu tamamen temizlendi: `renderStarDetail()`, `_bindStarIntroEvents_legacy()`, `hydrateLandingStats()`, `renderRoleSelect()`, `bindRoleSelectEvents()` silindi. STAR quad CSS (`ig-star-quad-card`, `ig-star-cell`, `ig-star-detail` vb.), `ig-landing-title/subtitle` CSS silindi.
5. Notes/history surface bozulmadi — `hydrateNotesFeedback`, `st-notes-feedback-slot`, `get_my_journals`, `renderAiFeedback` korundu

### Test Durumu
| Komut | Sonuc |
|-------|-------|
| `node --check profil-studio.js` | PASS |
| `npm run test:p3` | PASS (500/500) |
| `npm run test:smoke` | PASS (68/68) |

### Studio Truth Sync Notu
- **Eski davranis:** Practice ekraninda journal/cevap yuzeyi ayri bir drawer overlay icinde gizliydi (st-journal-drawer). Kullanici bottom bar'da "Notlarim" butonuna tiklamadan goremezdi. STAR legacy kodu (quad grid, landing title/subtitle, star_intro event binding) dosyada kalmaya devam ediyordu.
- **Bugunku davranis:** Journal/cevap yuzeyi soru kartinin hemen altinda inline collapsible panel olarak gorunur. "Cevabini Hazirla" toggle'i + "Notlarini al, AI ile degerlendir" hint text'i ilk bakista discoverable. Bottom bar butonu "Cevabini Hazirla" olarak yeniden adlandirildi ve inline panel'i toggle + scroll ediyor.
- **Restore edilen yuzey:** `renderJournalPanel()` inline olarak `renderPractice()` icine embed edildi. Drawer overlay (`st-journal-drawer`) HTML kaldirildi.
- **Temizlenen legacy kod:** 5 fonksiyon (renderStarDetail, _bindStarIntroEvents_legacy, hydrateLandingStats, renderRoleSelect, bindRoleSelectEvents) + ~150 satir STAR quad/detail/takeaway/benefits/landing CSS.

### Kalan Studio Gap Listesi
1. `renderJournalDrawerContent()` fonksiyonu hala dosyada — inline panel kullanildigi icin artik dead code, gelecekte silinebilir
2. `renderStarHintPanel()` + `renderCoachPanel()` fonksiyonlari hala dosyada — drawer tab'lari kullanıyor, aktif degil ama referans olarak korunuyor
3. `st-journal-drawer` CSS hala dosyada — kullanilmiyor ama zarar vermiyor, gelecek temizlikte silinebilir
4. iyzico/Stripe checkout — schema hazir, merchant credentials gerekli (**backend bagimli**)
5. Design token migration Slice D/E (ik.html + profil.html) — riskli, ayri is olarak planlanmali

### Bir Sonraki Net Adim
- Codex sonucu review eder
- Studio kabul edilirse IK polish veya AI CV paketine gecis tekrar degerlendirilir
- Claude bekliyor
