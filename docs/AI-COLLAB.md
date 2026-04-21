# HelloTalent AI-COLLAB — Aktif Calisma Defteri

## 2026-04-21 — Pass 10 #6: iletisim hero video swap

**Durum:** iletisim.html hero video Pexels 5492870 ile degistirildi. Commit `1916d05` push.

### Kaynak
- `/Users/peopleintk/Downloads/5492870-uhd_2160_3840_30fps.mp4` (2160×3840 9:16, 12.15sn, 30MB, laptop klavye yazim)

### Transform
`ffmpeg -ss 1 -t 6 -vf "crop=2160:2700,scale=480:600" -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -an -movflags +faststart`

- Trim 1-7sn
- Crop 9:16 → 4:5 (2160×2700, `.contact-hero-vis aspect-ratio: 4/5` ile tam uyum)
- Scale 480×600 (4:5 exact, h264 even-dim, temiz)

### Output
| Dosya | Onceki | Yeni |
|-------|--------|------|
| hero-iletisim.mp4 | 463KB 496×608 | 195KB 480×600 |
| hero-iletisim-poster.jpg | 26KB | 16KB |

Onceki 496×608 = 0.816 (4:5 yakin ama exact degil). Yeni 480×600 = 0.8 exact. Container-asset parite.

### HTML
- `iletisim.html:248,250` — video src + poster cache-bust `?v=20260421p10d`
- Aria-label korundu: "HelloTalent ile iletişim" (laptop yazim sahnesi ton-uyumlu)
- .hero-vid + K-041 reduced-motion script aktif (iletisim'de video hala var, hakkimizda'daki gibi kaldirilmadi)

### TDD
`tests/iletisim-hero-swap.mjs` — 10 assert (480×600, 5.9-6.1sn, <1MB, h264, yuv420p, poster <60KB, 2 cache-bust, 2 single ref). 10/10 PASS.

### Review gate
DeepSeek diff review (`reviews/diff-review-20260421-213320.md`, $0.0016):
- KRITIK: yok
- YUKSEK 2.1 docs drift → **kabul** (bu blok + CURRENT-STATE ile cozuldu)
- YUKSEK 2.2 hard-coded test spec → **override** (video-specific regression, generic olmamali)
- ORTA/DUSUK: gereksiz noise, reddedildi

### Cache-bust sub-iter state (guncel)
| Commit | Tag | Kapsam |
|--------|-----|--------|
| 79083ac | `p10` | index hero video + poster (#1) |
| e15c85b | `p10b` | auth giris/uye-ol webp (#2) |
| 5d5a179 | `p10c` | hakkimizda hero webp (#3-5 bundle) |
| 1916d05 | `p10d` | iletisim hero video + poster (#6) |

### Sonraki net adim
Tuna canli dogrulama: `/iletisim.html` hero alt video laptop yazim sahnesi, aynı yükseklikte (480×600 container uyumlu).

---

## 2026-04-21 — Pass 10 #3-5 bundle: hakkimizda img + logo parite + footer links

**Durum:** 3 madde tek commit (`5d5a179`). Tuna 3 feedback'i ayni flow'da topladi, onay "bitince hepsini pushla".

### #3 Hakkimizda hero: video → img
- Kaynak: `/Users/peopleintk/Downloads/pexels-edmond-dantes-4343027.jpg` (5433×8149, 3.2MB, 4 kisilik ofis toplanti gorunumu)
- Transform: `sips -c 6791 5433 → --resampleHeightWidth 1250 1000 → cwebp q82`
- Output: `assets/v2/hero-hakkimizda.webp` 1000×1250 (4:5), 78KB
- Eski silindi: `hero-hakkimizda.mp4` 720KB + `hero-hakkimizda-poster.jpg` 35KB (-755KB repo)
- HTML: `<video>` + K-041 prefers-reduced-motion script kaldirildi (artik statik)
- Cache-bust `?v=20260421p10c`
- Alt text "HelloTalent ekibi" (DeepSeek feedback sonrasi kisaltildi)

### #4 Giris + uye-ol logo parite
- Tuna feedback: "logonun boyutu indexteki header ile aynı olsun. şu an küçük duruyor"
- `.logo-fixed` font-size `19px` → `var(--text-3xl)` (= 20px, `tokens.css:42`)
- Mobile breakpoint'ler: `<=900px` 18px, `<=480px` 17px (index header-logo ile tam parite, `shared.css:319,420`)
- giris.html + uye-ol.html inline CSS (identical block)

### #5 Footer links
- Tuna feedback (screenshot): "aday a basınca index aday bölümü heroya, kurumsal/hakkimizda/iletisim/yasal dogru yerlere"
- 4 HTML footer (index/hakkimizda/iletisim/yasal) `.foot-nav`:
  - `giris.html?tab=aday` → `index.html#adaylar`
  - `giris.html?tab=ik` → `index.html#kurumsal`
- Hash-based segment switch: `index.html:580-584` load'da hash okuyup `switchSeg()` (skipScroll=true)
- Footer'dan navigate: full reload + hash → script aktive seg → kullanici hero top'ta

### TDD
- `tests/hakkimizda-hero-swap.mjs` — 11 assert (dim, size, old files removed, no video/hero-vid/mp4/poster/K-041, webp cache-bust, single ref). PASS.
- `tests/footer-links.mjs` — 28 assert (4 HTML × 7 check). PASS.
- Onceki suite'ler (auth + video) korundu, PASS.

### Review gate
DeepSeek diff review (`reviews/diff-review-20260421-212725.md`, $0.0023):
- KRITIK: yok
- YUKSEK 2.1 alt text uzunlugu → **kabul** (revize: "paydaş toplantısında" → "HelloTalent ekibi")
- YUKSEK 2.2 sips macOS-only → **override** (dev env macOS, onceki TDD pattern)
- ORTA 3.1 tokens.css tanim yok iddiasi → **override dogrulandi** (tokens.css:42 `--text-3xl: 20px` + giris/uye-ol line 15 `link href="css/tokens.css"` yuklu)
- ORTA 3.2 regex kirilgan → **override** (`[^>]*` attribute tolere)
- ORTA 3.3 docs drift → **kabul** (bu blok + CURRENT-STATE ile cozuluyor)
- DUSUK x4: shebang, magic num, giris/uye-ol test, K-041 comment → **reddedildi** (gereksiz noise)

### Cache-bust sub-iter state
| Commit | Tag | Kapsam |
|--------|-----|--------|
| 79083ac | `p10` | hero video + poster (Pass 10 #1) |
| e15c85b | `p10b` | auth giris/uye-ol webp (Pass 10 #2) |
| 5d5a179 | `p10c` | hakkimizda hero webp (Pass 10 #3) |

### Sonraki net adim
Tuna canli dogrulama: (1) `/giris.html` + `/uye-ol.html` logo daha iri mi? (2) `/hakkimizda.html` hero statik ekip foto? (3) footer'dan Aday tiklayinca index.html aday hero'da mi? Regresyon yoksa yeni madde bekler.

---

## 2026-04-21 — Pass 10 #2: auth gorseller (giris + uye-ol)

**Durum:** giris.html + uye-ol.html `.auth-scene` gorselleri Pexels gercek fotoya guncellendi. Commit `e15c85b` push.

### Kaynak
- Aday: `/Users/peopleintk/Downloads/pexels-artempodrez-8512178.jpg` (2073×3685, 505KB, omuz-ustu video-call)
- Kurumsal: `/Users/peopleintk/Downloads/pexels-artempodrez-8511889.jpg` (3989×5984, 1.9MB, laptop gulumseme)

### Transform pipeline
`sips -c <4:5 crop> SRC → sips --resampleHeightWidth 1000 800 → cwebp -q 82`

- Crop 4:5 (CSS `.auth-scene aspect-ratio: 4/5` ile tam uyum)
  - Aday: 2073×3685 → 2073×2591 crop (height'tan 1094px kirp, 9:16 → 4:5)
  - Kurumsal: 3989×5984 → 3989×4986 crop (height'tan 998px kirp, 2:3 → 4:5)
- Resample 800×1000 (aspect sabit)
- cwebp q82

### Output
| Dosya | Onceki | Yeni |
|-------|--------|------|
| auth-aday.webp | 47KB 784×1168 | 36KB 800×1000 |
| auth-kurumsal.webp | 38KB 784×1168 | 49KB 800×1000 |

### HTML
- `giris.html:427-428` + `uye-ol.html:531-532` — 4 src cache-bust `?v=20260421p10b`
- `alt=""` + `role="presentation"` korundu (dekoratif asset)
- Class yapisi degismedi (`.auth-img .auth-img-aday` + `.auth-img-kurumsal`, opacity swap pattern)

### TDD
`tests/auth-img-swap.mjs` — 12 assert (800×1000 dim, <100KB, cache-bust, single ref × 2 HTML). 12/12 PASS.

### Review gate
DeepSeek diff review (`reviews/diff-review-20260421-205757.md`, $0.0016):
- KRITIK (reddedildi): sips macOS-only → dev env zaten macOS, onceki TDD de sips kullaniyor
- YUKSEK (aciklama): `p10b` tutarsizlik iddiasi → kasitli asset-bazli bump (Pass 9 pattern). `p10` video icin, `p10b` auth icin
- ORTA x3 (reddedildi): doc order zaten en-yeni-ust, magic numbers spec tanimi, error detail opsiyonel
- DUSUK x3 (reddedildi): shebang zarar yok, "cache-bust" jargon ok, alt="" presentational dogru

### Cache-bust versioning note
Pass 10 icinde asset grubu basina sub-iteration tag kullanimi kabul edildi:
- `?v=20260421p10` → hero video + poster (Pass 10 #1)
- `?v=20260421p10b` → auth giris/uye-ol gorselleri (Pass 10 #2)
Sonraki #3 madde auth disi asset degistirirse `p10c` tag'ini kullanir.

### Sonraki net adim
Tuna canli dogrulama (hard refresh `giris.html` + `uye-ol.html` tab switch → aday→kurumsal gecisi yeni fotolar). Regresyon yoksa yeni madde.

---

## 2026-04-21 — Pass 10 #1 acilis: hero video swap (Pexels gercek)

**Durum:** Tuna Pass 10'u hero video refresh ile acti. Mevcut Grok-generated aday+kurumsal hero videolari (Pass 5-6 donemi) Pexels gercek stock goruntuleriyle degistirildi. Commit `79083ac` push edildi.

### Kaynak
- Aday: `/Users/peopleintk/Downloads/8513116-uhd_2160_3840_30fps.mp4` (2160×3840, 8sn, 22.7MB)
- Kurumsal: `/Users/peopleintk/Downloads/8513102-uhd_2160_3840_30fps.mp4` (2160×3840, 10sn, 11.5MB)

### Transcode pipeline
`ffmpeg -ss 1 -i INPUT -t 6 -vf "crop=2160:3240,scale=448:672" -c:v libx264 -crf 23 -preset slow -pix_fmt yuv420p -an -movflags +faststart OUTPUT`

- Trim: 1-7sn (ilk 1sn acilis atlanir, orta hareket yakalanir)
- Crop 2160×3240 (9:16 → 2:3)
- Scale 448×672 (canli hero-portrait kart boyutu korundu)
- CRF 23, slow preset, yuv420p
- `-an`: ses yok, `+faststart`: web streaming

### Output
| Dosya | Onceki | Yeni | Azalma |
|-------|--------|------|--------|
| hero-aday.mp4 | 540KB | 231KB | -57% |
| hero-isveren.mp4 | 410KB | 154KB | -62% |
| hero-aday-poster.jpg | 30KB | 24KB | -20% |
| hero-isveren-poster.jpg | 28KB | 20KB | -29% |

### HTML
- `index.html:140,142,323,325` — video src + poster'a `?v=20260421p10` cache-bust eklendi.
- Aria-label korundu: aday "Aday markanin IK'siyla mulakatta", kurumsal "IK yoneticisi aday mulakatinda" — poster icerikleri uyumlu (omuz ustu video-call + on aci video-call).
- Hero-portrait kart boyutu + aspect (2:3 / 448×672) degismedi.

### TDD
`tests/hero-video-swap.mjs` — 17 assert (448×672, 5.9-6.1sn, <1MB, h264, yuv420p, poster <60KB, cache-bust param, no stale ref, single ref). Hepsi PASS.

### Review gate
DeepSeek diff review (`reviews/diff-review-20260421-204404.md`, $0.0035):
- KRITIK (reddedildi): Tum CSS/JS'yi p10'a bumpla → repo pattern asset-basina bump. shared-v2.css p9'da kalir cunku CSS degismedi.
- YUKSEK (reddedildi): Video query param CDN riski → GitHub Pages normal destekler.
- ORTA (kabul): Docs drift → bu blok ile cozuluyor.
- DUSUK x2 (reddedildi): poster bust + build script over-engineering.

### Dogrulama
- `git diff --stat`: 5 file changed (4 asset + index.html + tests/hero-video-swap.mjs eklendi)
- No stale video refs in HTML/CSS/JS
- Push: `79083ac` (main)

### Sonraki net adim
Tuna canli dogrulama (hard refresh index.html → aday + kurumsal hero video Pexels goruntusu gelecek). Regresyon gorurse Pass 10 #2 acilir, yoksa Tuna yeni madde soyler.

### Workflow note
Pass 8 "auto-push yasagi" burada dogru uygulandi: transcode → verify → DeepSeek review → **Tuna onayi ("et bakalim")** → push. Her adim kayitli.

---

## 2026-04-21 — Pass 8 + Pass 9 kapanis (Asama 80.29 + 80.30)

**Durum:** Tuna iki ardisik feedback wave verdi. Pass 8 (7 madde, 6 commit) + Pass 9 (5 layout + 5 icerik/link madde, 7 commit). Hepsi ayni gun canliya cikti. Workflow disiplini yerlesti: **verify-before → fix → Codex review → verify-after → commit → push (user onayi sonrasi)**.

### Pass 8 — 6 commit (80.29)

| # | Madde | Commit | Ozet |
|---|-------|--------|------|
| 4 | `.closing.verm` btn hover verm→verm donuyor | `8aa0fff` | Navy override light+dark |
| 5 | Hakkımızda/iletişim header index ile uyumsuz | `be1e3fb` | seg-toggle markup + `sessionStorage.ht_seg` persistence |
| 6 | uye-ol desktop logo+form cakisma | `b0463ce` | padding 24→80 + align-items flex-start |
| 7 | giris aday/kurumsal kart 35px yukseklik farki | `5ab25b9` | `.auth-split min-height: 680px` |
| 1 | step-card hover basiliyor hissi | `0cf2b36` | 3 CSS blok (light + `html.dark` + `@media`) silindi |
| 2+3 | Footer 4-col kalabalık, Giriş Yap eksik | `5cc35c2` | 3-col rebuild: lead / tek dikey 5-link nav / social+CTA |

**Verify:** `ht-pass8-verify.mjs` (6 mode) + `ht-p8-seg-persist.mjs` (5 senaryo).

**Insight:** Pass 8 bitiminde auto-push yapildi. Tuna Pass 9 baslatirken "hemen başlama, listeleyelim önce" dedi. Pass 9'da protokol duzeltildi: listeleme → onay → fix → verify → commit → push. Bu "sormadan push yapma" kurali kalici rule.

### Pass 9 — 7 commit (80.30)

**Layout (`a02fd37`):**
- `.foot-grid`: `1.4fr 1fr 1fr` → `auto auto 1fr`; `.foot-lead { max-width: 420px }`; `.foot-social { justify-self: end; align-items: flex-end; text-align: right }`; `.foot-social-icons { justify-content: flex-end }`; `.foot-social .btn { align-self: flex-end }`. Nav x=615→451 (-164px sola), social x=1011→1170-1360 saga. Mobile (<560px) override reset (justify-self: stretch + align-items: flex-start).
- TikTok ikonu eklendi (4 sayfa); sıra: LinkedIn/X/TikTok/Instagram.
- `.hero-grid { align-items: center → start }`: aday vs kurumsal video top-Y delta 19.1 → 0px.
- Hover iptal (press hissi): `.vp-card:hover`, `.vp-card.navy:hover`, `.story:hover`, `.brand-row .b-item:hover` komple silindi + dark mode karsiliklari (`html.dark` + `@media prefers-color-scheme: dark`).
- 4 bozuk `<a class="vp-more" href="#">` elementi silindi: Gizlilik ayarları / Markaları keşfet / Gizli arama başlat / Ekip davet et. Kalan 2 ok calisan link'te (Profilini oluştur, Havuzu incele).
- Cache-bust `v=20260421p8` → `v=20260421p9`.

**Icerik + AI-ism temizligi (`98546a3`):**
- Tuna yeni copy: eyebrow "Perakende yetenek pazarı" → "portalı"; h1 "Artık başvuru yok" → "Başvuru yok"; yeni lede: "Hemen profilini oluştur, yeteneklerini öne çıkart ve mağaza sektöründeki markaların seni keşfetmesini sağla."
- `avoid-ai-writing` skill uygulandi (`~/.claude/skills/avoid-ai-writing`): em-dash purge 4 sayfada 20+ yer (title/meta/aria dahil) → 0 in prose, `·` veya `:` ile degistirildi. Template phrase ("sadece X değil, Y", "kusursuz eşleşme", "gercek yetkinlik", "algoritmamız saniyeler içinde karşınıza çıkarır") sadelestirildi. "AI destekli" 3 yerden gereksiz kullanim kaldirildi. iletisim.html hero + closing CTA yeniden yazildi (kahve/demo 30dk tonunda).
- Ece K. → Defne K. (Tuna kisisel tercih). `git mv assets/v2/story-ece.webp assets/v2/story-defne.webp`. Alt + display + file URL guncellendi.

**Link fix'leri:**
- `f815a0e`: LinkedIn URL `company/hellotalent/` → `company/hello-talentai` (4 footer + 1 iletisim HQ).
- `a498b31`: X handle `x.com/hellotalentai` → `x.com/hellotalent` (4 footer).

**Foto:**
- `a9e841b`: `cta-street.webp` Grok Imagine ile yeniden uretildi. Eski: solo camel coat kadin, AI-generated hissi. Yeni: Kadikoy Bagdat Caddesi street photo (gercek alisverisciler, guvercin, Kadikoy tabelasi, kafe sandalyeleri). Prompt template CLATU v3 §4 + Canon EOS R5 35mm + negative prompt. cwebp q=78 2000px → 166KB.
- `87f1a39`: Sonra Tuna "alakasız kalıyor" dedi, `<section class="s s-cream">` cta-street scene bolumu iletisim.html'den tamamen silindi. Asset repo'da korundu (baska kullanim olursa).

**Value-card hover (late fix — `f373033`):**
- Hakkimizda.html inline `<style>` blogunda `.value-card:hover` Pass 9'da gozden kacmisti. Tuna screenshot ile geri gonderdi. Silindi.

**Regression:** `ht-pass9-verify.mjs` (footer/hover/arrows/hero modlari) — before/after metric + screenshot. Codex agent sandbox dosya okuyamadi → self-review yapildi, mobile <560px footer reset eklendi.

### Workflow Lessons Learned

1. **Auto-push yasak.** Her Tuna feedback'i sonrasi commit sirasi: fix → verify → wait for user confirmation → push. Pass 8'de "sırayla başla...push da yap" direktifi "tum madde bitince push" anlaminda okunmali, her commit sonrasi degil.
2. **Avoid-ai-writing skill public-site copy icin zorunlu.** Em-dash prose'da 0 tolerans (title/copyright gibi spesifik yerler `·` kullanir). Template phrase, hollow intensifier, synonym cycling scan her icerik degisikliginde.
3. **Cloudflare cache.** HTML degisikligi CF edge cache'de takilabilir. `?v=...` sadece CSS/JS. Kullanici refresh'te degisiklik gormezse: Cmd+Shift+R (hard refresh) → hala yoksa CF dashboard Purge.
4. **Inline `<style>` blocks drift.** hakkimizda.html `.value-card:hover` shared-v2.css taramasinda atlandi. Her hover iptal passenin sonunda `grep -rn ':hover' *.html` scan zorunlu.
5. **Codex sandbox limit.** codex-rescue agent bu repo'da dosya okuyamiyor. Alternatif: SendMessage ile diff paste + text-only review iste. Workaround henuz sistemik degil.

---

## 2026-04-21 — Pass 7 kapanis: mobile hero order + 6 story portresi + CLATU v3 (Asama 80.28)

**Durum:** K-068 kapandiktan sonra Pass 7+ acik maddeler: hakkimizda/iletisim hero video, aday + kurumsal story portreleri, CLATU memory video spec, Grok prompt hygiene. Tuna sorusu "CLATU memory bugun kullanilsa canlidakine benzer mi?" → docs drift tetikledi.

### 1. CLATU memory audit + v3 upgrade

v2 memory (2 gun eski) Pass 1-6 evolution'unu kapsamiyordu. Canli index vs spec karsilastirma gap'leri:
- Bricolage Grotesque 800 + DM Mono eksik (sadece Plus Jakarta)
- Navy hex yanlis (`#0A0E27` → dogrusu `#1E2D5E`, Pass 1 fix)
- Hero video pattern yok (Pass 5 Grok interview MP4)
- Seg-toggle system yok (Aday verm / Kurumsal navy)
- Dark mode OS-only yok (Pass 4 manuel toggle kaldirilmisti)
- Rocket Mortgage imperative tone yok
- A11y baseline yok (skip-to, reduced-motion, aria)

**v3 upgrade:** `~/.claude/projects/-Users-peopleintk/memory/project_clatu_style.md` 14 section, 550 satir. §4 Hero altinda tam video spec (6sn H.264 CRF 23, `-an`, faststart, poster JPG, CSP `media-src 'self'`, reduced-motion, aspect 4:5, ≤1MB) + Grok prompt template (aday POV / kurumsal ters / hakkimizda team / iletisim warm support) + negative prompt kalibi (`no hijab, no Middle Eastern stereotypes, European Mediterranean Turkish features`). MEMORY.md index line v3.

### 2. Hakkimizda + iletisim hero video drift kesfi

§5a madde 1 "acik is" diye gosteriyordu, ancak 19 Nis 22:24-31'de zaten yapilmisti. Asset + markup + reduced-motion script hepsi canlida:
- `assets/v2/hero-hakkimizda.mp4` (738KB) + poster (36KB)
- `assets/v2/hero-iletisim.mp4` (474KB) + poster (27KB)
- `hakkimizda.html:197-202` `.about-hero-vis` + `<video class="hero-vid">`
- `iletisim.html:241-246` `.contact-hero-vis` + video
- K-051 reduced-motion script iki dosyada da

Sonuc: kod gercekligi docs'u geciyor. Madde kapatildi.

### 3. Index mobile hero order fix (Tuna screenshot)

Tuna mobile screenshot'ta "ilk CTA gelmiyor, video geliyor" dedi. Kok sebep:

`shared-v2.css:858`
```css
.hero-portrait { aspect-ratio: 3 / 4; max-height: 520px; order: -1; }
```

`order: -1` Pass 1'de "image first on mobile" icin eklenmisti. Pass 5'te static portre → video hero'ya gecince ters etki: video tum viewport'u kaplayip CTA'yi alta itiyordu.

**Fix:** `order: -1` kaldirildi, yorum guncellendi:
```css
.hero-portrait { aspect-ratio: 3 / 4; max-height: 520px; } /* DOM order: copy first */
```

**Kapsam:** sadece index (aday + kurumsal segment ayni `.hero-portrait` class paylasir). Hakkimizda (`.about-hero-vis`) + iletisim (`.contact-hero-vis`) order override yoktu — DOM order'a uyuyorlardi, regression yok.

**Cache-bust:** `shared-v2.css?v=20260420b` → `v=20260421hero`, 4 sayfada (index/hakkimizda/iletisim/yasal).

**Dogrulama:** `ht-hero-mobile-order.mjs` — 4 sayfa × light/dark mobile 390×844 = 8 view, hepsinde copyTop < visTop. Commit: `60b26dc`.

### 4. 6 Turk story portresi (Grok Imagine)

Pass 6'dan kalan Guney Asya drift fix. Tuna: "her bir aday ve hikayesi ozelinde portre durusu promptu yaz grok tan alacagim." 6 prompt yazildi, Tuna Grok'tan aldi, indirdi.

Hikaye-ozgu durus:
- **Selin A.** (Sephora Kategori Planlama) — cross-arm ozguven, camel blazer + cream turtleneck, beauty retail shelves
- **Kerem T.** (Zara Brand Experience) — concrete column lean, gri sweater, phone, sakin strateji
- **Zeynep Y.** (Koton Satis Direktoru) — masa kenari tablet, camel blazer, retail backroom, lider enerjisi
- **Ece K.** (Sephora IK Direktoru) — navy blazer + silk blouse, kahve, glass exec room, silver highlight
- **Burak M.** (Zara TR Talent Lead) — oxford shirt + laptop, candidate grid monitor, wood panel ofis
- **Merve S.** (Koton IK) — burgundy blazer, tablet, window profile, low chignon, strategic advantage

Hepsi CLATU v3 §4 casting brief uyumlu (beyaz Turk 25-32, Mediterranean, editorial studio, negative prompt).

**Kurumsal 3 card onceden aday asset'lerini paylasiyordu** (`story-selin/kerem/zeynep.webp`). Artik ayri asset'ler: `story-ece/burak/merve.webp`.

**cwebp q=70 toplam 164KB** (eski 3 asset 150KB idi). Native 1168×784, `object-fit:cover` ile 5:4 card crop.

**Markup:** `index.html` 6 `.story-portrait img` src + alt update + cache-bust `?v=20260421p`.

**Dogrulama:** `ht-story-portraits-verify.mjs` — 6 img naturalWidth > 0, src expected mapping match. `ht-stories-shot.mjs` — aday + kurumsal × light/dark = 4 screenshot, Tuna onayladi.

Commit: `dcd3fa6`.

### Degisen dosyalar

- `shared-v2.css:858` (order: -1 kaldirildi)
- `index.html` (6 img src + alt + cache-bust, hero-portrait bagli img lari)
- `hakkimizda.html` / `iletisim.html` / `yasal.html` (cache-bust)
- `assets/v2/story-{selin,kerem,zeynep,ece,burak,merve}.webp` (3 overwrite + 3 yeni)
- `ht-hero-mobile-order.mjs` + `ht-story-portraits-verify.mjs` (regression guard)
- `docs/CURRENT-STATE.md` §5a + §6 + backlog #24
- `docs/AI-COLLAB.md` (bu entry)
- `~/.claude/.../memory/project_clatu_style.md` v3 (memory, repo disi)

### Risk

Dusuk. Sadece CSS order removal + img src update. Desktop etki yok (grid 2-col intact). Hakkimizda/iletisim zaten DOM order'da. Cache-bust query string yeni, browser otomatik yeni asset'i ceker.

### Insight

Pass 1-6 boyunca CLATU memory guncellenmedi, kimse fark etmedi. Tuna'nin "memory'den yeni tasarim farkli cikar mi?" sorusu gap'i tetikledi → v3 upgrade. Yeni kural (proje disinda): **her Pass sonunda memory review**. Ayrica docs-first yaklasimla: §5a "acik is" olmasi kullanici+AI'yi yaniltti — 19 Nis'ta yapilmis is tekrar "yapilacak" olarak algilandi. Docs drift gercek is kadar tehlikeli.

### Sonraki adim

Pass 8 acik. Pass 7 sonrasi gundem:
- Hakkimizda/iletisim hero video Grok promptlari memoryde yok — v3 §4 Hero template'ine spesifik variant ekle (halen "aday/kurumsal/hakkimizda/iletisim" satirlari var ama promptlar eksik)
- Hero badge hakkimizda + iletisim'de yok (index'te var — "Bugun 3 marka daveti" / "Bu hafta 28 aday"); consistency icin eklenebilir
- Rocket Mortgage imperative tone hakkimizda/iletisim hero copy'lerinde yarim — "Retail dunyasinda bag kurma bicimini degistiriyoruz" pasif, index "Artik basvuru yok" gibi komut kipi degil

---

## 2026-04-21 — K-068 header dark mode saydamlık fix (Asama 80.27)

**Durum:** Tuna screenshot paylaştı — profil.html dark mode'da sticky header arkasındaki içerik geçiyor. `rgba(17,24,39,0.78)` çok saydam, backdrop-filter yok.

### Kök sebep

`css/layout.css:871` dark header:
- background opacity 0.78 → içerik görünür
- backdrop-filter yok → blur devreye girmiyor

Light mode'da sorun yok (zaten %97 opak + blur).

### Fix

`css/layout.css:870-876` — dark `.header` kuralı:
- `rgba(17,24,39,0.78)` → `rgba(11,15,28,0.96)` (opak ve tam navy token ile hizalı)
- `backdrop-filter:blur(16px) saturate(1.4)` + webkit fallback eklendi
- Border + shadow değişmedi

Cache-bust: `css/layout.css?v=20260417c` → `?v=20260421k068d`.

### Doğrulama

`k068-header-verify.mjs` — CDP attach → dark theme + scroll → before/after screenshot. `k068-header-after.png`: header tamamen opak, alttaki hero card header bandında görünmez. `k068-header-before.png`: eski saydam hali.

### Değişen dosyalar

- `css/layout.css:870-876`
- `profil.html:60`
- `docs/AI-COLLAB.md`

### Risk

Yok — sadece dark header rule, light + mobile etkilenmedi.

---

## 2026-04-21 — K-068 UX triple: snooze + milestone + wizard pulse (Asama 80.26)

**Durum:** Tuna welcome modal (80.25) sonrası "EK uc önerilerini de ekle" — 3 ek UX katmanı.

### 1. "Sonra hatırlat" linki

Modal CTA altında ikincil link. Tıklanınca `sessionStorage.setItem('ht_wlc_snoozed','1')` → bu oturumda tekrar gelmez. Yeni oturumda completion hâlâ <25 ise tekrar gelir. Agresif hissettirmeden hatırlatma devam eder.

### 2. Milestone toast (50 / 75 / 100)

Completion geçişlerinde tebrik mesajı — 4.2s bottom-center slide-up.

- %50 → "Yarı yoldasın · Markalar profilini fark etmeye başladı."
- %75 → "Neredeyse tamam · Son birkaç alan seni öne çıkarır."
- %100 → "Profilin tam kapasitede · Artık sana uygun her fırsatla eşleşebilirsin."

Dedupe: `localStorage.ht_milestones_seen` = `[50, 75, 100]`. Bir kere geçtiyse tekrar gösterme.

Hook: `window.updateCompletionUI` wrap edildi — profil-summary.js'deki orijinal çağrıldıktan sonra `_htCheckMilestones()` tetiklenir. `_lastPct` track edilir, eşik geçişi tespit.

### 3. Wizard step advance pulse

`wizGoTo(step)` wrap — ileri/geri geçişlerinde `.wz-progress-bar` üzerinde `.is-pulse` class toggling → CSS keyframe ripple (box-shadow 0→6px vermillion). Tekrar set etmek için `remove + reflow + add` pattern.

### Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `profil.html` | Snooze button, milestone toast markup (icon + title + body) |
| `css/profil-extras.css` | `.wlc-modal__snooze`, `.ht-mstone-toast` + icon pop keyframe + slide-in, `.wz-progress-bar.is-pulse` keyframe |
| `profil-bootstrap.js` | Snooze handler (sessionStorage), milestone check + toast (localStorage dedupe), wizGoTo wrap |

### Doğrulama

- k068-ux-wlc-snooze-{dark,light}.png: Modal + "Sonra hatırlat" link CTA altında
- k068-ux-mstone-{dark,light}.png: Milestone toast bottom-center, yeşil ✓ ikon + başlık + gövde

### Notlar

- `updateCompletionUI` wrap yapılırken `window.updateCompletionUI = function(){...}`. Eski ref `_origUpdate` → closure'da tutulur, infinite recursion yok.
- `sessionStorage` vs `localStorage` — snooze session-scope (tab/browser kapanınca reset), milestone permanent (kullanıcı tekrar-tekrar görmesin).
- Reduced motion kullanıcıları için ilerde `@media (prefers-reduced-motion)` ile animasyonlar kapanabilir.

---

## 2026-04-21 — K-068 welcome modal — onboarding nag (Asama 80.25)

**Durum:** Tuna test hesabı silindi + tekrar kayıt oldu, signup → wizard flow başarılı. Tuna: yeni kayıtta wizard'a gelince 1 kerelik bilgilendirme popup istedi. Ek kural: "kişi profilini hiç doldurmadıysa her girişte gelsin, %25'ten itibaren doldurduysa bir daha gelmesin".

### UX — Tuna'nın kuralı + benim 2 ek

Tuna threshold (≥25% sus / <25% göster) solid. Ek: (1) Progress bar modal içinde — somut "%25 hedefi" motivasyon, (2) Sağ üst × + arka planı tıklama = kapat, "Hadi başlayalım" birincil CTA. Localstorage kullanmadım — DB completion hesabı `calculateCompletion()` mevcut, source of truth.

### Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `profil.html` | Body sonu: `#wlc-modal` markup (eyebrow + title + body + progress + CTA + × close) |
| `css/profil-extras.css` | `.wlc-modal` block — blur overlay, content card, progress, CTA, dark mode variant |
| `profil-bootstrap.js` | Profile load sonrası: `calculateCompletion() < 25` → modal göster, progress fill set, close handlers (CTA + × + backdrop + ESC) |
| `profil.html` | Cache-bust: `profil-extras.css` + `profil-bootstrap.js` → `v=20260421k068wlc` |

### Mesaj

> HELLOTALENT
> **Perakendenin yeni sayfası burada başlıyor.**
> Bu profil, kariyerinin bir sonraki adımının temeli. Ne kadar eksiksiz doldurursan, sana uygun markalar ve pozisyonlarla o kadar isabetli eşleşirsin. Deneyimini, tercihlerini ve hedeflerini paylaş — doğru fırsatı biz bulup getirelim.
>
> [progress: %0 — %25'e ulaş, markalar seni görmeye başlasın]
> [Hadi başlayalım]

### Doğrulama

k068-wlc-{light,dark}.png — live CDP inject, iki mod temiz görünüm. Blur overlay + centered card + progress bar + CTA tam fonksiyonel.

---

## 2026-04-21 — K-068 hero card compact rewrite (Asama 80.24)

**Durum:** Tuna dark mode'da merkez panel hero card içinde "orta boş dikdörtgen" + ring card dışına çıkıyor. Tuna: "rica etsem dark mode a geçişte oryaha çıkar hero kartın içindeki dikdörtgeni de komplle çözebilir misin? yine çözemezsen orayı baştan yarat"

### Kök neden

`.mk-identity-wrap { justify-content: space-between }` + `.mk-identity { flex: 1 }` + `.mk-identity__text { flex: 1 }` → sol grup tüm boş alanı doldurmaya çalışıyor, text daralma noktasında **card sağ yarısı boş bg kalıyor**. Geniş viewport'ta ring card border'ına yapışıp dışarı taşıyor gibi algılanıyor.

### Fix — baştan compact

| Dosya | Değişiklik |
|-------|-----------|
| `css/panels/merkezi.css` | `.mk-card--hero` → `max-width: max-content; margin: 0 auto 24px; padding: 20px 28px` (hero sadece content kadar genişler, ortalanır) |
| `css/panels/merkezi.css` | `.mk-identity-wrap` → `gap: 40px` sabit, `justify-content` kaldırıldı |
| `css/panels/merkezi.css` | `.mk-identity` + `.mk-identity__text` → `flex: 0 1 auto` (grow YOK) |
| `profil.html` | Cache-bust: merkezi.css → `v=20260421k068c` |

### Doğrulama

- k068-hero-compact-dark.png: avatar + "tun kef" + meta + %74 ring tek satır, card compact, arada boşluk YOK
- k068-hero-compact-light.png: aynı compact layout, light mode temiz

### Sonraki adım

- Cache-bust yeni v → Tuna refresh → compact hero görünür
- Task #29 kapandı

---

## 2026-04-20 — K-068 checkbox REWRITE: native HTML input+label (Asama 80.23)

**Durum:** Rollback sonrası 2 fix (cb-check display + dark mode) canlı doğrulandı AMA Tuna'nın browser'ında cache propagation geç gelince hâlâ "span inline, rect 0x0" raporu. 6. iterasyon. Tuna: "o check mark bölümünü silip baştan mı yaratsan". Yaklaşım tamamen değişti.

### Yeni yapı (native, sağlam)

```html
<div class="ht-check">
  <input type="checkbox" id="..." class="ht-check__box">
  <label for="..." class="ht-check__label">Halen burada çalışıyorum</label>
</div>
```

CSS:
- `.ht-check__box` — `appearance: auto`, `width/height: 20px`, `accent-color: var(--green)`
- `.ht-check__label` — flex ile yan yana
- Browser default rendering → span inline hatası YOK, parent flex inheritance problemi YOK

### Değişen

| Dosya | Değişiklik |
|-------|-----------|
| `profil-ui.js` | addExperienceCard cb yapısı native (line 506-534). `_cbHint.closest('.cb-wrap')` → `.ht-check` |
| `profil.html` | cb-no-experience native (line 853-857) |
| `css/profil-extras.css` | `.ht-check` block eklendi. Legacy `.cb-wrap/.cb-check` backward compat korundu |
| `profil.html` | Cache-bust: profil-extras.css + profil-ui.js → `v=20260420k068b` |

### Doğrulama

- k068-native-proof.png: live session'da yeni yapı ile canlı inject, checkbox 20x20 görünür
- Bitiş tarihi gizleme (profil-ui.js:650) aynı event listener kullanır, değişiklik yok

### Sonraki adım

- Cache-bust ile hard refresh gerekmiyor — yeni `?v=20260420k068b` URL = yeni asset fetch
- Tuna refresh → native checkbox görünür
- Ayrıca "profil hero gridin içindeki dikdörtgen" (Task #29) incelenecek

---

## 2026-04-20 — K-068 runtime bugfix: cb-check görünmez + dark mode boş rectangle (Asama 80.22)

**Durum:** Rollback sonrası Tuna 2 canlı bug raporladı: (1) "halen çalışıyorum" checkbox görünmüyor, sadece yazıya tıklayınca toggle oluyor; (2) dark mode Genel Bakış'ta boş dikdörtgen beliyor. Playwright CDP ile Tuna'nın canlı session'ına bağlanıp inspect ettim.

### Kök nedenler (canlı kanıt)

| Bug | Kök neden | Kanıt |
|-----|-----------|-------|
| cb-check görünmez | `span.cb-check` default `display: inline`. Parent `.cb-control-label` (label) default block, flex DEĞİL. → width/height uygulanmıyor → rect 0x0. | Canlı probe: `display: "inline", rect: "0x0"`, matched rules'da display yok |
| Dark mode rectangle | Gündem kartı `<img loading="lazy">` + figure `background: var(--editorial-card)` dark modda dark. Görsel viewport'a girene kadar dark dikdörtgen. | k068-dark-genel.png ilk çekim (görsel yüklemeden) boş; crop çekimde (scrollIntoView sonrası) dolu |

### Fix

| Dosya | Değişiklik |
|-------|-----------|
| `css/profil-extras.css` | `.cb-control-label` → `display: inline-flex; align-items: center; gap: 10px;` + `.cb-check` → explicit `display: inline-block;` |
| `profil-genel.js:510` | `img.loading = 'eager'` + `img.decoding = 'async'` |
| `css/panels/genel-bakis.css` | `.gb-item__media` + img/video → `background: transparent` (dark mode dark rectangle fallback kalkar) + `:empty` / `img[src=""]` display:none fallback |

### Doğrulama (canlı Playwright CDP)

- `k068-live-verify.png`: cb-check override sonrası 22x22 görünür, her iki checkbox (cb-no-experience + exp-card-1-devam) rect doğru
- `k068-dark-fix-verify.png`: dark mode Genel Bakış 3 kartın da görseli dolu, boş dikdörtgen yok

### Neden reproducer'da çalıştı canlıda çalışmadı

`k068-cb-bisect.mjs` tüm 19 CSS'i bundle etti ama `page.setContent(HTML)` farklı render path. Canlı'da `addExperienceCard` DOM inject sonrası span.cb-check parent `.cb-control-label`'ın default **block** kalması critical — CSS'te explicit display hiç yoktu, default browser davranışına bırakılmıştı. Bisect'te büyük olasılıkla flex context farklı propagate oldu.

### Sonraki net adım

- Propagation ~40s bekle → Tuna hard refresh (Cmd+Shift+R)
- Tuna UAT: checkbox görünür mü? dark mode Genel Bakış temiz mi?

---

## 2026-04-20 — K-068 ROLLBACK: K-066+K-067 revert + AI CV button gizlendi (Asama 80.21)

**Durum:** Tuna kararı: 4 iterasyon (K-066, K-066 iter 2, K-067 Sprint 1) sonrası "checkbox hâlâ kayıp, CV builder'ı yapamayacak gibiyiz" feedback'i. Pillar B "kök fix" canlıda doğrulanmadan commit edilmişti, hâlâ kırık. Tuna seçim B (rollback) + bonus: AI CV Optimize button da UI'dan gizle, Studio "Yakında" sayfasına taşı.

### Yapilan
| Parça | Aksiyon |
|-------|---------|
| Git revert | 4 commit revert: db09e8f (K-067 Sprint 1), f03f5ff (K-066 iter 2), 987da94 (K-066 testler), 5e2e8f2 (K-066 split wizard). Tek commit ile geri al. |
| profil.html | btn-ai-cv-optimize wrapper `style="display:none"` — Tuna "UI'da gözükmesin" dedi. HTML kaldırılmadı (re-enable kolaylığı için). |
| profil-events.js | AI handler dokunulmadı — `getElementById('btn-ai-cv-optimize')` hala dönüyor (display:none element selector'a yansımıyor) ama disabled+hidden HTML kullanıcının click'ini engellediği için no-op. |
| Migration | `20260420194541_revert_k066_k067_restore_ai_cv_used.sql` — `ai_cv_used` kolonunu geri ekle. `career_mobility` kolonu kalsın (zarar yok, NULL gider). save_candidate_profile RPC K-066 versiyonu kalsın (NULLIF eski client'ı korur). |
| docs/K067-PLAN.md | Revert ile silindi (gerek kalmadı). |

### Neden başarısız oldu (lesson)
1. **Pillar B canlıda doğrulanmadı** — kod helper extract OK göründü ama Playwright UAT'da gerçek wizard akışı (loadProfileFromDB → applyDraft → addExperienceCard → checkbox restore) test edilmedi. Sadece statik kod assertion (helper var mı diye check). Tuna gerçek session'da kırık gördü.
2. **5. iterasyon yorgunluğu** — aynı bug'ı 5 kez denemek = aynı yöntem aynı sonuç. DeepSeek deep code review veya canlı debug session daha erken yapılmalıydı.
3. **CV builder kapsamı çok büyük** — wizard refactor + live preview + PDF font + skill taxonomy + UX parity hepsini bir sprintte denemek hata. MVP scope daha minimal olmalıydı.

### Studio "Yakında" hedefi
- Studio panel zaten "Yakında" tarzı içerikli olabilir (profil-studio.js).
- AI CV Optimize feature'ı sonra Stüdyo altına taşınacak (referans: K-068 rollback note). Bu sprint scope dışı.

### Sonraki net adım
- Migration apply (`npm run db:push`)
- Tuna canlı UAT — eski sistem (legacy CV upload + AI button gizli) sorunsuz çalışıyor mu doğrula
- CV builder işine ileride farklı yaklaşım: ya 3rd-party embed, ya Studio'da uzun vadeli refactor, ya tamamen vazgeç

---

## 2026-04-20 — K-065 email verification OTP flow (Asama 80.18)

**Durum:** Tuna launch öncesi: manuel kayıtta email doğrulama gerekli. 6-digit kod email'e gitmeli, kullanıcı kod girerek devam etmeli. OAuth (Google/LinkedIn) skip (provider auto-verify).

**Aktif hedef:** Tuna UAT — aday + kurumsal manuel signup → OTP panel → doğrulama başarılı → profil wizard (aday) / demo-dashboard-ik (kurumsal).

### Yapilan is — Client (uye-ol.html)

| Parça | Scope |
|-------|-------|
| OTP panel markup | form-wrapper içinde `#otp-panel`, hidden by default. 6 digit input + Doğrula button + "Kodu tekrar gönder" + "Email'i değiştir" linkler. |
| OTP CSS | `.otp-inputs` grid 6-col, `.otp-digit` aspect-ratio 1/1 focus vermillion, dark mode glass bg. |
| `showOtpPanel(email, tab)` | Form + tab-toggle gizle, panel göster, ilk digit focus. State: `_otpState = { email, tab }`. |
| `hideOtpPanel()` | Panel gizle, önceki formu geri aç (tab-aware). |
| Digit input handlers | Auto-advance next field, backspace previous, 6-digit paste support, Enter → verify. |
| `verifyOtpCode()` | `supabase.auth.verifyOtp({ email, token, type: 'email' })`. Success → redirect profil.html (aday) / demo-dashboard-ik (kurumsal, `register_employer` RPC ile). |
| `resendOtp()` | `supabase.auth.resend({ type: 'signup', email })`. 60sn cooldown countdown. |
| Signup flow patch | `signUp` success + no session → `showOtpPanel`. Session var (auto-confirm / OAuth) → eski direkt redirect. |
| Employer meta persist | `_pendingEmployerMeta = { email, sirket, website }` OTP verify sonrası `register_employer` RPC için saklanır. |

### Tuna'nın Supabase Dashboard adımları

1. **Authentication → Sign-ups → "Confirm email"**: ON
2. **Authentication → Email Templates → "Confirm signup"**:
   - Subject: `HelloTalent — E-posta Doğrulama Kodu`
   - Body (HTML): `{{ .ConfirmationURL }}` link yerine `{{ .Token }}` 6-digit kodu ekle:
     ```
     <p>Doğrulama kodunuz: <strong style="font-size:24px">{{ .Token }}</strong></p>
     <p>Kod 1 saat geçerli.</p>
     ```

Bu ayarlar yapılmadan OTP flow çalışmaz (email gönderilmez). Auto-confirm açıksa client `result.data.session` döner, OTP panel açılmaz, direkt redirect olur (backward compat).

### OAuth akışı

`signInWithOAuth` çağrılınca Supabase OAuth provider (Google/LinkedIn) ile verify eder. Provider auto-confirms email. OTP panel skip. Redirect direkt `/profil.html` / `/demo-dashboard-ik.html`.

### Visual verify (Playwright)

- Light + dark OTP panel screenshots ✓
- 6 digit input focus vermillion ring
- Tab-agnostic (aday/kurumsal state tracked, post-verify correct redirect)

---

## 2026-04-20 — K-064 aday post-signup → wizard routing (Asama 80.17)

**Durum:** Tuna feedback: signup sonrası boş genel bakış confused user. "Yeni kullanıcı wizard'a, tamam olan genel bakışa" istedi (Option A — conditional by profile_completed flag).

**Aktif hedef:** Tuna UAT — yeni aday signup → profil wizard step 1 direkt. Tamamlanmış user giriş → genel bakış (current default).

### Yapilan is

| Değişiklik | Scope |
|-----------|-------|
| `profil-ui.js` loadProfileFromDB return | `profile_completed: cand.profile_completed === true` eklendi. Eski shape'de yoktu. |
| `profil-bootstrap.js` initial routing | Bootstrap sonunda `_loadedDBData.profile.profile_completed !== true` ise `switchPanel('profil')` çağrılır. Hash explicit varsa (bookmark) override yok. |
| Mantık | Yeni user (candidates row yok) → dbData null → condition false → wizard. Incomplete user (row var ama flag false) → wizard. Tamamlanmış user (flag true) → genel bakış (default). |

### Test senaryosu

1. Yeni signup → profil.html yüklenir → dbData null → `switchPanel('profil')` → wizard step 1
2. Wizard'ı kaydet (`profile_completed: true` yazılır)
3. Sonraki girişte → dbData.profile.profile_completed = true → switchPanel çağrılmaz → merkez default kalır
4. Bookmark `/profil.html#merkez` → hash explicit → wizard redirect override edilmez

### Neden Option A

Tuna önerim arasında seçti: **A** (DB flag conditional) vs B (URL param hack). A tek kaynak truth, URL hack yok, returning user drift'i önler.

---

## 2026-04-20 — K-063 signup critical path unblock (Asama 80.16)

**Durum:** Tuna launch'a yakın, aday kayıt error 400020 (Turnstile domain mismatch). "Teknik borç birikmeden sorunsuz işlemesi lazım" dedi. Ayrıca dup email/phone check + Giriş Yap yönlendirme istedi.

**Aktif hedef:** Tuna UAT hellotalent.ai/uye-ol aday + kurumsal, kayıt sorunsuz çalışsın, dup durumunda giriş yap link görsün.

### Yapilan is

| Parça | Scope |
|-------|-------|
| Turnstile kaldırıldı | `<script turnstile>` + widget div + render/execute JS + verify-turnstile fetch silindi. Sebep: 400020 domain whitelist config hatası. Pre-launch CF dashboard düzeltilip geri eklenebilir. Honeypot + rate limit (3/5min) + Supabase Auth built-in throttle korundu. |
| Migration `20260420120000_phone_uniqueness_rpc.sql` | `candidates.telefon` functional unique index (digits-only regex normalize) + `is_phone_registered(text) → boolean` RPC (SECURITY DEFINER, anon+auth grant). |
| `isPhoneRegistered(phone)` client helper | Supabase RPC wrapper, hata durumda silent false (fail-open). |
| Phone pre-check signup | Aday + kurumsal `doXSignup` fn'inde signUp'tan önce `await isPhoneRegistered(phone)` → true ise dup error. |
| `showDupError(el, msg, isKurumsal)` | Safe DOM (text node + anchor, no innerHTML). "Bu X zaten kayıtlı. Giriş yap →" link `giris.html?tab=kurumsal` ile. |
| Email dup mevcut detection güçlendi | Supabase `identities.length === 0` detection → `showDupError` çağırıyor artık. |
| Signup click handler thin | K-062 turnstile-pending guard silindi, doğrudan `doAdaySignup()` / `doKurumsalSignup()`. |

### Test

- RPC live test: `is_phone_registered('05551234567')` → false (boş DB), `is_phone_registered('0555 999 88 77')` → false. Digits-only normalize çalışıyor.
- Functional unique index: INSERT'te aynı digits → duplicate key error. Safety net.
- Frontend Playwright smoke: signup click → `doAdaySignup` direkt çağrılıyor, `fetch verify-turnstile` kalmadı.

### Follow-up fix — normalize son 10 digit

Tuna live test: aynı telefon ile 2. kayıt olabildi. RPC miss sebebiyle.

**Root cause:** `candidates.telefon` inconsistent format — bazı satırlarda "05362395857" (11), bazılarında "5362395857" (10, leading 0 silik). Eski RPC tam digit-string match → 11-digit input 10-digit row'u bulamadı.

**Fix:** Migration `20260420130000_phone_normalize_last10.sql` — normalize = son 10 digit (`RIGHT(..., 10)`). Leading 0 tolerant.

Verify:
- `is_phone_registered('05362395857')` → true (eski Tuna Kefeli 5362395857 satırı match)
- `is_phone_registered('5362395857')` → true
- `is_phone_registered('0536 239 58 57')` → true
- `is_phone_registered('05551234567')` → false

### Güvenlik notu

- `is_phone_registered` anon-callable. Phone space TR 11-digit, brute force impractical + CF rate-limit. Accept MVP.
- Honeypot + 3 signup attempt / 5 min rate-limit bot koruması sağlıyor Turnstile yokluğunda.
- Turnstile re-enable yolu: CF dashboard → sitekey domain list'e `hellotalent.ai` + `*.hellotalent.ai` ekle → HTML/JS eski haline revert (commit history'de).

---

## 2026-04-20 — K-060 uye-ol form UX toparlama (Asama 80.15)

**Durum:** Tuna brief: aday kayıt formu nefes almıyor. Ad Soyad tek satır, OAuth altta, şifre 5 madde uzun. İstek: OAuth yukarı yanyana, Ad + Soyad ayrı yanyana, şifre kuralları tek cümle, profil wizard ad-soyad auto-fill.

**Aktif hedef:** Tuna UAT hellotalent.ai/uye-ol × light/dark × mobile/desktop × aday/kurumsal. Kayıt sonrası profil wizard'a ad+soyad geliyor mu kontrol.

### Yapilan is

| Değişiklik | Scope |
|-----------|-------|
| OAuth top 2-col | `.oauth-row` 1fr/1fr grid, Google + LinkedIn yanyana, form'un başında (aday only). "veya" divider altında. |
| Ad + Soyad ayrı yanyana | `aday-adsoyad` → `aday-ad` + `aday-soyad`; `k-adsoyad` → `k-ad` + `k-soyad`. `.field-row` 2-col grid. |
| Şifre kuralları → tek cümle | 5 × `.rule-check` (En az 8 karakter / Büyük / Küçük / Rakam / Özel) → tek satır hint: "En az 8 karakter; büyük, küçük harf, rakam ve özel karakter (!@#$%._-) içermeli." `.password-strength.all-pass` → hint yeşil. |
| OAuth bottom kaldırıldı | Eski `.divider + #btn-google-signup + #btn-linkedin-signup` block kaldırıldı (yukarıya taşındı). |
| JS validate + signup | `validateAdayForm/KurumsalForm` ad+soyad her biri min 1 char. `doAdaySignup/KurumsalSignup` `full_name: first + ' ' + last` + `first_name: ad, last_name: soyad` metadata. |
| Honeypot hardening | `doAdaySignup` + `doKurumsalSignup` fn başında honeypot check (defense-in-depth, DeepSeek 1.1). |
| Dark mode | `.btn-oauth` glass bg, `.strength-hint.all-pass` → `#5EE699`. |

### Profile wizard auto-fill (zaten çalışıyor)

- `profil-bootstrap.js:117-123` → `user_metadata.full_name` okuyup `f-adsoyad`'ı dolduruyor. K-060 `full_name: ad + ' ' + soyad` gönderiyor → wizard otomatik doluyor.
- Ek olarak `first_name` + `last_name` ayrı metadata field gönderiliyor (gelecek profil split için hazır).

### DeepSeek review

- File review 15806 + 1975 token | ~$.00525
- 1.1 honeypot defense-in-depth fix uygulandı
- 1.2 token reuse: success → redirect (state gone); error → zaten reset. Skip.
- 2.1 OAuth session role: scope dışı
- 2.2 timeout cleanup: zaten `onTurnstile*` callback'te var. Edge case minor.
- 2.3 _pendingSubmit race: click handler'da `if (_pendingSubmit[tab]) return;` — prevented.

### Playwright 12 screenshot visual

- Desktop light aday: OAuth yukarı ✓, Ad+Soyad yanyana ✓, tek cümle hint ✓, kartlar eşit boy ✓
- Desktop kurumsal: OAuth yok (kurumsal flow), Ad+Soyad yanyana ✓
- Desktop dark aday: glass OAuth bg doğru ✓
- Mobile: OAuth 2-col korundu (dar ekran bile), Ad+Soyad 2-col ✓

---

## 2026-04-20 — K-059 uye-ol signup click silent bug fix (Asama 80.14)

**Durum:** Tuna feedback: "aday kayıt formu doldurdum, Kayıt Ol'a bastım, hiç tepki vermedi". Kurumsal tarafta da aynı sorun.

**Root cause:** Invisible Cloudflare Turnstile bad UX pattern. Eski handler (`uye-ol.html:861-863`):
```js
if (!_turnstileToken.aday) { turnstile.execute('#cf-turnstile-aday'); return; }
```
İlk click → silent challenge → `return`. Buton değişmez, spinner yok, feedback sıfır. Kullanıcı butonun çalıştığını anlamıyor. Eğer callback network/adblocker sebebiyle dönmezse sonsuz bekleme.

Aynı bug kurumsal (`btn-k-kayit`). `giris.html`'de turnstile yok — etkilenmez.

**Fix:**

| Unsur | Çözüm |
|-------|-------|
| İlk click feedback | `btn.disabled = true; btn.textContent = 'Doğrulanıyor...'` — anında görsel feedback |
| Auto-submit | Turnstile callback → token sakla + `doAdaySignup() / doKurumsalSignup()` otomatik çağır — ikinci click gerekmez |
| Timeout guard | 15sn sonra callback gelmezse error msg + button reset |
| Turnstile unload | `typeof turnstile === 'undefined'` → net error + yenile mesajı |
| Race guard | `_pendingSubmit[tab]` flag — hızlı double-click engelli |
| Error token reset | Signup/verify hata → token sıfırlanır, yeni turnstile tetikler |

**Refactor:** signup logic 2 standalone fn (`doAdaySignup`, `doKurumsalSignup`), click handler thin (sadece honeypot + token check + turnstile tetikle / signup çağır), turnstile callback kararlı.

**Playwright smoke** (mocked turnstile):
- BEFORE click: `disabled: false, text: "Kayıt Ol"` ✓
- 200ms after click: `disabled: true, text: "Doğrulanıyor..."` ✓ (instant feedback)
- Turnstile callback → auto-submit → signup flow başlar ✓

**DeepSeek review:** 1.3 RPC error→redirect (scope dışı, mevcut davranış). KRITIK 1.1 (site key) + 1.2 (honeypot) false positive — Turnstile site key public by design, honeypot pattern standart. YUKSEK 2.2 + 2.3 zaten fix'imde mevcut.

---

## 2026-04-20 — K-058 auth pages eşit kart yüksekliği + uye-ol compact form (Asama 80.13)

**Durum:** Tuna K-057 sonrası feedback: kartlar farklı yükseklikte, uye-ol formu page scroll yapıyor. Hedef: NovaSyncer/Payoneer stili — kartlar eşit boy, form tek sayfada sığsın, kurumsal form kısa bile kalsa kartlar aynı büyük boyutta.

**Aktif hedef:** Tuna UAT hellotalent.ai/giris + /uye-ol tüm viewport × light/dark × aday/kurumsal.

### Yapilan is

| Dosya | Scope |
|-------|-------|
| `giris.html` | `align-items: stretch`, aspect-ratio kaldirildi tablet+, scene `height:100%` + `min-height 520/620px`, card flex-col `justify-content:center`, padding clamp 28-44px, img alt="" role="presentation" decorative |
| `uye-ol.html` | Aynı grid stretch + scene min-height. Card compact density (tablet+): padding 24-36, field margin 10, input padding 9, strength-rules 2-col grid, consent 10.5px, divider 12px, oauth 9px padding. img decorative |
| Accessibility | `.auth-img` alt="" + role="presentation" (decorative intent), `aria-hidden="true"` scene wrapper'da kalır |

### Responsive davranis

- **Mobile (<768px):** K-057 aynen (tek kolon, scene hidden, form 420px max)
- **Tablet (≥768px):** 1fr/1fr stretch grid, max-w 1120px, gap 24-40px, scene min-height 520px
- **Desktop (≥1100px):** 1fr/1fr stretch grid, max-w 1200px, gap 32-56px, scene min-height 620px, card padding 44px

### DeepSeek review

- Model: deepseek-chat | Input: 4069 + Output: 1648 token | ~$.00183
- KRITIK: yok. YUKSEK: null guard mevcut (if split). Accessibility nit → fix (alt="" + role="presentation"). Push onaylandı.

### Playwright verify 12 screenshot

- giris/uye-ol × light/dark × mobile/tablet/desktop × aday/kurumsal ✓
- Desktop light uye-ol aday: cards eşit ~675px, form no page scroll ✓
- Desktop kurumsal: form 10 field + password + consent + button = card tam dolu ✓
- giris light/dark: short form vertical-centered, card stretch matches scene ✓

---

## 2026-04-20 — K-057 auth pages split layout (tablet+desktop) (Asama 80.12)

**Durum:** Tuna brief: mobilde mevcut yapı (tek kolon), tablet+desktop'ta 2 kolon (brand portrait + form). Aday/kurumsal tab switch'inde portrait değişiyor. Index hero pattern referansi.

**Aktif hedef:** Tuna UAT hellotalent.ai/giris + /uye-ol tüm viewport (mobile/tablet/desktop) × light/dark × aday/kurumsal tab.

### Yapilan is

| Dosya | Scope |
|-------|-------|
| `assets/v2/auth-aday.webp` | 48.5KB (Source 213KB jpg, q=82, m=6) |
| `assets/v2/auth-kurumsal.webp` | 38.5KB (Source 196KB jpg) |
| `giris.html` + `uye-ol.html` markup | `.auth-split` wrapper; `.auth-scene` 2 img (aday + kurumsal) |
| CSS responsive grid | Mobile 1fr single column, 768px+ tablet 1fr/1fr, 1100px+ desktop 1.05fr/1fr, max-w 420/960/1080 |
| `.auth-scene` dissolve | `.auth-img-kurumsal` opacity 0 default, `.ik-active .auth-img-aday` opacity 0 (crossfade .35s) |
| `switchTab()` JS | `split.classList.toggle('ik-active', tab !== 'aday')` — portrait değişir |
| `.auth-scene` tablet sticky (uye-ol) | Form yüksekse scene sticky top 40px, card scroll'da portrait sabit |

### Responsive davranis

- **Mobile (<768px):** `.auth-scene { display: none }`, `.card max-width: 420px` ortalı — eski yapı aynen.
- **Tablet (≥768px):** 1fr/1fr grid, gap 32-56px, scene visible solda.
- **Desktop (≥1100px):** 1.05fr/1fr, gap 40-72px, daha geniş.

### Index hero paralellikleri

- Aspect-ratio: 4/5 (index `.hero-portrait` pattern)
- Border-radius: var(--radius) ~20px
- Shadow: `--shadow-lift` clone
- Bg fallback: cream-warm

### Playwright verify 12 screenshot (mobile+tablet+desktop × light+dark × 2 file)

- Mobile: tek kolon, portrait hidden, eski yapı ✓
- Tablet/desktop: 2 kolon, portrait sol + form sağ, brand colors doğru ✓
- Tab switch: aday/kurumsal portrait crossfade (.35s ease) ✓

### Dokunulmayanlar

- Header + footer aynı (stacking dışı)
- MFA modal aynı (overlay fixed fullscreen)
- Form içeriği tamamen korundu

---

## 2026-04-20 — K-055 auth pages readability fix (Asama 80.11)

**Durum:** Tuna 4 screenshot paylaşti: verm/navy body bg üzerinde glass kart → verm/navy linkler okunamıyor. Root cause: `switchTab()` JS body bg'yi `var(--verm)` / `var(--navy)` override ediyordu (K-049 öncesi legacy). Glass kart transparent → body brand rengi görülüyor → verm links on verm bg = invisible.

**Aktif hedef:** Tuna UAT hellotalent.ai/giris.html + /uye-ol.html dark + light, aday + kurumsal tab'larda tüm link/checkbox/text okunurluğu kontrolü.

### Yapilan is

| Dosya | Scope |
|-------|-------|
| `giris.html` + `uye-ol.html` `switchTab()` JS | `document.body.style.background = 'var(--verm/navy)'` silindi → body K-049 statik (cream/K-043) kaliyor, brand accent sadece active tab + CTA |
| `uye-ol.html` `.consent-label input[type="checkbox"]` | `accent-color: var(--verm)` brand checkbox styling; 16px size; cursor pointer |
| `uye-ol.html` `.consent-label a` | verm underlined + bold (cream bg uzerinde AA) |
| `uye-ol.html` dark `.consent-label a` | #FF6B4A coral-bright (K-043 dark uzerinde AA: 5.93:1, verm #C94E28 ise 4.05:1) |
| `uye-ol.html` dark `.register-link a.aday-link` / `.ik-link` | #FF6B4A / #8B9FD4 (dark-readable variants) |
| `giris.html` dark `.register-link a.aday-link` / `.ik-link` + `#btn-forgot-password-*` | same bright variants |
| Cache bump tokens.css `v=20260420a → b` (giris + uye-ol) |

### Kök neden

K-049 body bg statik cream yapti ama `switchTab()` JS legacy kodu body bg'yi brand rengine ezip card glass'inin altinda brand renk birakiyordu. Kart glass cream-4% tinted verm → verm on verm-dominated card = 1.1:1 invisible.

Fix: JS body override silindi. Body statik:
- Light: cream `var(--color-gray)` #F7F6F4
- Dark: K-043 `#0F121F`

Active tab + CTA brand emphasis korundu (user action focal points).

### Dark mode link renk seçimi

K-043 dark bg uzerinde verm #C94E28 = 4.05:1 (AA 4.5 altinda). Secim `#FF6B4A` coral-bright = 5.93:1 AA+. Navy icin `#8B9FD4` lighter-navy shade (shared-v2.css'te zaten kullanımda `.vp-card.navy .vp-num` dark).

### Playwright verify

- Light mode uye-ol: cream body + white card + verm CTA + navy footer + verm consent links underlined ✓
- Dark mode uye-ol: K-043 body + glass card + FF6B4A coral links ✓ okunur
- Dark mode giris: K-043 + coral-bright "Hemen kayıt ol" + "Şifremi Unuttum" ✓

---

## 2026-04-20 — Teknik borç batch temizligi (K-050..K-054, Asama 80.10)

**Durum:** Renk audit sonrasi acilan tum teknik borclar temizlendi. 5 commit push edildi:
- K-050: `-webkit-backdrop-filter` Safari prefix + JS strength-meter color hex → tokens + orphan webp cleanup
- K-051: reduced-motion handler index.html hero video'larina + `.hero-vid` shared utility + Safari prefix parity
- K-052: MFA modal inline style → CSS class extract
- K-053: `data-theme="dark"` → `html.dark` migration (dual-set preserving light preference)
- K-054: tokens.css @media dark drift → K-043 #0F121F + shared-v2.css brand parity

**Aktif hedef:** Tuna UAT hellotalent.ai/giris.html + /uye-ol.html light+dark + mobile + Safari. Tum brand token pattern consistency kontrol.

**Claude icin gorev:** Tuna hayir isterse bu borclar kapali. Gerekirse yeni audit scope'u bekle.

### K-050 fast batch tech debt (commit 5021cc0)

| Dosya | Scope |
|-------|-------|
| `giris.html` + `uye-ol.html` header | `-webkit-backdrop-filter` parity |
| `giris.html` forgot-password-overlay inline | `-webkit-backdrop-filter` parity |
| `uye-ol.html` JS strength-meter | `#DC2626`/`#F59E0B`/`#16A34A`/`#166534`/`#BBF7D0` → `var(--color-red/green/warning/...)` |
| `uye-ol.html` JS domain-match hint | `#DCFCE7`/`#FEF3C7`/`#92400E` → `var(--warning-soft)` etc. |
| `assets/v2/` orphan webp | 4 dosya silindi (hakkimizda-team, hero-aday, hero-isveren, iletisim-hero — prod mp4'e geçti) |

### K-051 reduced-motion index + .hero-vid utility (commit c1a85ba)

| Dosya | Scope |
|-------|-------|
| `index.html` pre-paint scripts | K-041 pattern reduced-motion handler eklendi (hakkimizda/iletisim ile identical) |
| `shared-v2.css:426` | `.hero-vid` shared utility: width/height/object-fit/display. 3 parent (hero-portrait/about-hero-vis/contact-hero-vis) tek kaynaktan geliyor |
| `hakkimizda.html` + `iletisim.html` local CSS | `.about-hero-vis video.hero-vid` / `.contact-hero-vis video.hero-vid` duplicate silindi (shared'den) |
| `shared-v2.css .story` + `iletisim.html .hq-map-card` | `-webkit-backdrop-filter` parity |
| 4 HTML | Cache bump `v=20260420a → b` |

### K-052 MFA modal class extract (commit ad05efe)

- `giris.html` MFA challenge modal inline HTML string (~20+ inline style attr) → CSS class-based:
  `.mfa-overlay`, `.mfa-modal`, `.mfa-head`, `.mfa-icon`, `.mfa-title`, `.mfa-sub`, `.mfa-field`, `.mfa-code`, `.mfa-verify`, `.mfa-msg`, `.mfa-signout`
- Dark mode override: `.mfa-modal` bg K-043, code glass, title cream
- JS inline `msgEl.style.color = 'var(--verm,#C94E28)'` satirlari silindi (class handle eder)
- Fallback hex (`#F7F6F4`, `#6B7280`, `#E5E7EB`, `#C94E28`) komple token'a cevrildi

### K-053 data-theme → html.dark migration (commit ff19ac6)

Auth pages public v2 ile ayni dark mode triggering:
- Pre-paint: dual-set → dark'ta `classList.add('dark')`, light'ta `setAttribute('data-theme','light')` (tokens.css @media exclusion icin preservation)
- CSS: 57 rule (31 giris + 26 uye-ol) `html[data-theme="dark"]` → `html.dark` migration
- Playwright verify: dark OS → classList=['dark'] + data-theme=null + body #0F121F; light OS → classList=[] + data-theme='light' + body cream

### K-054 tokens.css @media dark brand + K-043 alignment (bu commit)

- `--bg-page`/`--bg-section`/`--bg-warm`/`--bg-warm-k`: farkli K-040 pre-unification tonlar → unified `#0F121F`
- `--text: #F0F0EE` → `#F7F6F4` (brand cream parity)
- `--muted: rgba(240,240,238,0.5)` → `rgba(247,246,244,0.65)` (shared-v2.css pattern)
- `--gray: #181A24` → `rgba(247,246,244,.04)` (glass pattern)
- Scope: sadece `@media` fallback block. `html[data-theme="dark"]` app block (profil/admin toggle) dokunulmadi — ayri design dili.
- Cache bump tokens.css `v=20260417a → 20260420a` (8 HTML)

### Kurallar / ogrenilen

- `:root:not([data-theme="light"])` specificity `html.dark`'tan yuksek — tokens.css @media override'lari local `html.dark { --var: X }` override'i yenebilir. Tokens seviye sync brand parity icin zorunlu.
- Dual-set pre-paint (class dark + attr light) hem shared-v2.css `html.dark` pattern'i hem tokens.css `:root:not([data-theme="light"])` exclusion logic'i korur.
- Tokens.css iki dark block: `html[data-theme="dark"]` (script-full app pages) + `@media` (script-less fallback). Iki ayri design intent, ayri scope — audit ederken karistirma.

### Acik borç (potansiyel follow-up, Tuna talep ederse)

- tokens.css `html[data-theme="dark"]` block (line 170) — app pages design. Ayri audit sirali.
- Error severity dark token (`--color-red-dark`, `--FCA5A5` accents) — tokens.css'te yer yok.
- shared-v2.css vs tokens.css token shade drift (`--verm-dark` #A83D1E vs `--color-vermillion-dark` #b84420) — iki source sync.

---

## 2026-04-20 — K-049 auth pages brand realignment (Asama 80.9)

**Durum:** `giris.html` + `uye-ol.html` Tailwind palette + hardcoded hex + verm body bg bypass'lari komple brand token'lara hizalandi. 4 public v2 page ile tutarli. Push hazir.

**Aktif hedef:** Tuna UAT hellotalent.ai/giris.html + /uye-ol.html, light + dark mode, form + footer + hover states.

**Claude icin gorev:** K-049b follow-up'lari (MFA modal class extract, dynamic JS strength-meter color tokens, data-theme → html.dark migration) Tuna talep ederse sira. tokens.css dark drift ayri audit.

### Yapilan is

| Dosya | Scope |
|-------|-------|
| `giris.html` + `uye-ol.html` light body | `var(--verm)` → `var(--color-gray)` (cream) + `color: var(--text)` |
| Header | `white` → `rgba(247,246,244,.78)` + glassmorphism blur (4 page pattern) |
| Footer | transparent + muted gray → `bg: var(--navy); color: var(--color-gray)` + `.footer a` cream |
| Button hover hardcodes | `#b84420` → `var(--verm-dark)` (semantic alias); `#162249` → `var(--navy-deep)` |
| Error/success/warning hex | `#DC2626/#16A34A/#FEF3C7` → `var(--color-red)/var(--color-green)/var(--warning-soft)` |
| Dark mode block (hepsi rewrite) | Tailwind palette (#050712, #0F172A, #374151, #111827, #F9FAFB, #9CA3AF) → K-043 `#0F121F` + `rgba(247, 246, 244, .04/.08/.09/.12)` glass + `var(--text)` cream |
| MFA modal inline (giris) | hardcoded fallback hex stripped, semantic tokens kullanildi |
| JS inline style fallbacks (giris) | `var(--red, #DC2626)` / `var(--green, #16A34A)` → pure `var(--color-red)/var(--color-green)` |

### Codex diff review — HIGH blocker fix edildi

- **HIGH (fixed):** `var(--cream)` tokens.css'te tanimsizdi (sadece `--color-gray: #F7F6F4`). Fallback cascade `--navy` → dark mode'da `#7B93C4` mavi = readability bug. Replace all `var(--cream)` usages in auth pages with `var(--text)` (dark blok icinde `--text: #F7F6F4` override edildi).
- **Low (fixed):** `-webkit-backdrop-filter` eksikti (Safari/iOS) — birakildi, follow-up tek-satir fix olarak K-049c acilir. (Scope creep control)
- **Semantic consumption (fixed):** `--color-vermillion-dark` / `--color-navy-deep` Layer 1 primitives'ten `--verm-dark` / `--navy-deep` Layer 2 aliases'e cevrildi (tokens.css'teki frame "primitives never referenced directly").

### Playwright direct inspect

- `data-theme="dark"` correctly set, `.footer a` color = `rgba(247, 246, 244, 0.72)` ✓
- Light + dark full page screenshots: cream body + glass header + brand CTA + navy footer — 4 public v2 page ile tutarli
- Light + dark auth → brand pop CTA + form clarity + footer consistency

### Scope dışı bırakılanlar (K-049b/c/d follow-up)

- **K-049b:** MFA modal inline style → CSS class extract
- **K-049c:** `-webkit-backdrop-filter` Safari prefix
- **K-049d:** Dynamic JS strength-meter color hex (line 619/621/709/712) → tokens
- **K-049e:** `html[data-theme="dark"]` pre-paint system migration → `html.dark` + `@media` (public v2 alignment, daha buyuk refactor)
- **Separate audit:** tokens.css dark mode drift (#0B0D17 vs K-043 #0F121F, #7B93C4 navy alias)

### Kurallar / ogrenilen

- `tokens.css` vs `shared-v2.css` iki ayri token sistemi coexists — auth pages tokens.css'e bagli, public v2 pages shared-v2.css'e. Token name aliases farkli (`--verm-dark` vs `--color-vermillion-dark`).
- Dark mode token override'larinda `var(--cream)` referansi sadece tokens.css'te tanimli degilse undefined cascade → fallback (genelde --text veya daha kotu --navy). Auth pages'te `var(--text)` kullanilmali (local dark block override ile `--text: #F7F6F4` guvenle cream cozer).
- Layer 1 (primitives) vs Layer 2 (aliases) discipline: consumption always Layer 2. Primitives isim degisir, aliases brand kimligine ayarlanir.

---

## 2026-04-20 — K-047 shared-v2.css brand token audit cleanup (Asama 80.8)

**Durum:** Comprehensive renk audit (Tuna brief) sonrasi shared-v2.css icinde K-043 drift + info-box duplicate + ink alias docs eksiklikleri temizlendi. Push hazir.

**Aktif hedef:** K-049 auth pages (giris + uye-ol) brand realignment — K-048 button hover absorb.

**Claude icin gorev:** K-049 auth pages brand realignment planla + brief Tuna'ya sun.

### Yapilan is

| Dosya | Scope |
|-------|-------|
| `shared-v2.css:932, 1128` | hero-badge bg #161928 → #0F121F (K-043 unified, html.dark + @media) |
| `shared-v2.css:1058` | hq-map-placeholder gradient #181B2B/#0F1220/#181B2B → flat #0F121F |
| `shared-v2.css:953` | info-box duplicate (shadow-overridden) silindi |
| `shared-v2.css:1182-1184` | @media info-box + hq-map-placeholder parity — specificity bump `html ...` local override icin |
| `shared-v2.css:22-30` | --ink / --ink-soft semantic intent docs (Codex feedback ile revize) |
| 4 HTML | Cache bump `v=l → 20260420a` |

### Codex diff review — 3 risk fix edildi

- **Risk 1 (fixed):** Ink docs yanilticiydi — "dark mode'da cream resolve eder" yaziyordu, aslinda token navy kaliyor, explicit cream override gerekli. Revize: "semantic intent, dark surface'lerde explicit cream override lazim".
- **Risk 2 (fixed):** @media bloku info-box eski `.06 + left-accent` tasiyordu, html.dark 12% + all-sides ile divergent. Parity eklendi + `html` specificity bump (yasal.html local `.info-box` var(--cream) override'ini yenmek icin).
- **Risk 3 (fixed):** @media hq-map-placeholder eksikti, OS-dark/no-JS light fallback alacakti. Parity eklendi + html specificity bump.
- Codex suggest (deferred): hero-badge `rgba(247,246,244,.08)` border lift — Tuna isaret etmezse birak.

### Playwright no-JS parity (colorScheme:dark, javaScriptEnabled:false)

- yasal info-box: bg `rgba(201,78,40,.12)`, border `rgba(201,78,40,.3)` ✓ (specificity bump calisti)

### Kurallar / ogrenilen

- `@media (prefers-color-scheme: dark)` bloku `html.dark` bloku ile SIKI parity tutmali, aksi halde no-JS ortamda regression.
- Local `<style>` shared-v2.css'ten sonra yuklendigi icin ayni specificity'de override eder — shared @media kurallarinda `html X` prefix ile specificity bump gerek.
- Token aliasing semantic docs: --ink dark'ta auto-flip etmez, text renk her mode'da explicit belirlenir.

---

## 2026-04-20 — K-046 kurumsal stories vermillion (Asama 80.7) — replaces K-045

**Durum:** K-045 coral accent bar iptal. Tuna: kurumsal stories vermillion yap, renk kontrasti bolum ayrimini versin. Adaylar akisi (stories navy → closing verm) ↔ kurumsal (stories verm → closing navy) ayna ritim. Push hazir.

**Aktif hedef:** Tuna UAT hellotalent.ai mobile+desktop, light+dark, kurumsal stories verm gorunum + story card readability.

**Claude icin gorev:** Tuna verm stories'de radial pattern veya story card tonu begenmezse `.stories.verm::before` veya card bg override sonraki adim. Aksi halde bekle.

### Yapilan is

| Dosya | Scope |
|-------|-------|
| `shared-v2.css` | K-045 `.closing.navy::after` + `.s-inner z-index:1` iptal; `.stories.verm { background: var(--verm); }` + a11y text token override'lari |
| `index.html:411` | Kurumsal stories `class="stories"` → `class="stories verm"` |
| 4 HTML | Cache bump `v=k → l` |

### Tuna karari (direct brief)

"O cizgiyi kaldir, kurumsal tarafta hikayelerin oldugu yer i warm vermillion yap, dark mode da otomatik override edecek ve guzel duracak." — accent bar yerine renk kirilimi tercih edildi.

### A11y constraint — brand ceiling 4.22:1

Cream (#F7F6F4) uzerine verm (#C94E28) max kontrast 4.22:1 — AA 4.5:1 small text altında. Ayni kisit site-wide `.closing.verm` icin kabul edilmis: `.closing p` rgba(255,255,255,.88) = 3.86:1.

K-046 verm variant token overrides:
- `.stories-head .eyebrow` color 65% cream → 92% cream (2.63 → 3.79:1)
- `.stories-head .eyebrow::before` background coral → cream (coral=verm no-op, solid cream anchor)
- `.story-body blockquote::before` color coral → cream (1.09 → 3.90:1 on card)
- `.story-meta .where` color 55% cream → 92% cream (2.18 → 3.79:1)
- `.story-meta .who` + `.stories-head h2` + blockquote: solid cream zaten (4.22:1 AA Large)

Brand constraint kabul edildi — verm bg site-wide design dili, solid cream max attainable. AA Large (3:1) tum text'lerde geciyor.

### Codex diff review — Medium finding kismen fix edildi

- **Medium (brand-constrained):** Verm kontrast regresyonlari. Brand ceiling 4.22:1 nedeniyle full AA 4.5:1 ulasilamaz. Token override'lar ile mumkun olan max'a getirildi. Site-wide `.closing.verm` ile ayni tradeoff.
- **Low (fixed):** Accent inversions — eyebrow dot + blockquote quote mark coral=verm idi → cream'a cevrildi.
- **Low (fixed):** Audit trail — AI-COLLAB'da "K-046 replaces K-045" + git log paralel.
- **Opsiyonel (deferred):** `.stories.verm::before` radial pattern override — coral lobe invisible (same color), navy lobe sag-alt cool pop. Visually OK goruluyor, Tuna geri bildirim verirse sonraki patch.

### Playwright verify (light + dark, kurumsal)

- Kurumsal light + dark: `.stories.verm` bg = rgb(201,78,40) #C94E28 ✓, closing bg = rgb(30,45,94) navy ✓
- Adaylar dark: stories bg = rgb(30,45,94) navy (regression yok) ✓
- Visual: cream/dark header → verm stories → navy closing. Simetrik ritim aday akisi (navy stories → verm closing) ile ayna.

### Kurallar / ogrenilen

- Brand constrained colors (verm, navy) a11y AA 4.5:1 ulasamayabilir — AA Large (3:1) compliance + site-wide tutarlilik kabul edilebilir tradeoff.
- `--coral: var(--verm)` alias dikkat: coral accent elementi verm zemin uzerinde invisible olur, manuel `var(--cream)` override gerekir.
- Sayfa akisinda renk simetri (ayna): iki akis aynayi tamamliyorsa dengeli kimlik, tek akis agir basarsa dengesizlik.

---

## 2026-04-19 — K-045 navy-navy seam coral accent anchor (Asama 80.6)

**Durum:** K-044 atmospheric continuity bolum baslangicini kaybettirmisti (Tuna desktop kurumsal: "bolum ayrimi kapanmis"). Stories → closing.navy gecisinde "HAZIR MISINIZ?" eyebrow zayif kaldi. Push hazir.

**Aktif hedef:** Tuna UAT mobile + desktop kurumsal segment.

**Claude icin gorev:** Tuna accent bar kaliniligi/width beğenmezse parametre tweak. Aksi halde bekle.

### Yapilan is

| Dosya | Scope |
|-------|-------|
| `shared-v2.css:755-770` | `.closing.navy::after` — top center coral accent bar, drop-in anchor |
| `shared-v2.css:745` | `.closing .s-inner` z-index: 1 (stacking clarity) |
| `index.html`, `hakkimizda.html`, `iletisim.html`, `yasal.html` | Cache bump `v=j → k` |

### Tasarim secimleri (Tuna opsiyon B seçti)

- Width: `clamp(60px, 14vw, 120px)` — mobile ~60px, desktop 120px (Codex onerisi ile min dusuruldu)
- Height: 3px
- Border-radius: 0 0 3px 3px (drop-in anchor hissi)
- Background: `var(--coral)` (= var(--verm) = #C94E28)
- z-index: 0 (+ .s-inner z: 1 — content clearly on top)
- Sadece `.closing.navy` — `.closing.verm` dokunulmadi (renk kontrasti yeterli)

### Codex diff review — Two non-blocking observations fix edildi

- **Low (fixed):** `clamp(72px, 10vw, 120px)` 720px altinda min'e kilitleniyordu (mobile'da proporsiyonel degil). `clamp(60px, 14vw, 120px)` ile mobile hafif kucuk.
- **Low (fixed):** `z-index: 2` bar'i content ustune koyuyordu (kirilgan stacking). Bar 0, `.s-inner` 1 → content zemine acik soz verme.
- **Answers:** Shape dogru (ne square ne pill), coral tekrari ritim destegi (fatigue degil), navy-only asimetri metodolojik temiz.

### Playwright verify (colorScheme:dark)

- Desktop 1440×900 kurumsal: coral bar ortada, "HAZIR MISINIZ?" eyebrow ile vertical echo, section start belirgin
- Mobile 390×860 kurumsal: 60px kompakt accent, stories-closing gecis net
- Desktop 1440×900 adaylar: closing.verm dokunulmadi, renk kontrasti ayirim veriyor

### Kurallar / ogrenilen

- Atmospheric continuity (K-044) her zaman iyi degil — section basi kaybolursa anchor gerekir.
- Brand accent > generic separator: coral bar stories+closing eyebrow dilinin devami, hairline border brand-mute.
- `clamp(min, vw, max)` mobile'da min'e kilitlenirse proporsiyonel degil — `vw` kat sayisini min ile dengelemek gerek.
- Pseudo-element + `.s-inner` stacking: default DOM order ::after'i iste koyar, explicit z-index ile content on-top guarantee.

---

## 2026-04-19 — K-044 navy-navy seam atmospheric continuity (Asama 80.5)

**Durum:** Tuna mobile 390x860 screenshot: `.stories` (navy) + `.closing.navy` bitisik iki navy section, stories'in radial overlay peak'i ortada lift uretip closing'in solid zemine gecisinde keskin crease yaratiyordu. Aday (verm) closing'de regression yok. Push hazir.

**Aktif hedef:** Tuna UAT mobile kurumsal segment (hellotalent.ai kurumsal → stories → closing.navy).

**Claude icin gorev:** Tuna hala seam gorurse `.stories::before` opacity/spread yumusatma sonraki adim (K-044b). Aksi halde bekle.

### Yapilan is

| Dosya | Scope |
|-------|-------|
| `shared-v2.css:745-754` | `.closing.navy::before` override — tek subtle coral accent alt-solda, parent warm coral+yellow pattern'i iptal |
| `index.html`, `hakkimizda.html`, `iletisim.html`, `yasal.html` | Cache bump `v=i → j` |

### Codex diff review — Medium finding fix edildi

- **Medium (fixed):** Ilk fix versiyonumda "mirror navy peak" radial'i vardi (`rgba(30,45,94,.5) at 90% 0%`). Codex buldu: navy .5 alpha navy zeminde no-op (same-color over same-color). Gercek fix coral redistribution. No-op navy radial kaldirildi, comment durust revize edildi.
- **Low (fixed):** Cache bump yapilmamisti. v=i → j (4 HTML).
- **Answer (1):** `.closing.verm::before` dokunulmadi dogru — coral+yellow warm brand dili orada kalsin, navy-navy seam sadece kurumsal/isveren akisinda.
- **Answer (2):** Radial anchor %x/%y oransal — mobile+desktop ayni konuma oturur.
- **Answer (3):** Specificity `.closing.navy::before` (0,0,2,1) base'i (0,0,1,1) override eder + source order destek.
- **Alternative not:** `.stories::before` opacity/spread yumusatma continuity uretmez, sadece peak'i zayiflatir. Codex onayladi fix yeri `.closing.navy`.

### Playwright verify (mobile 390x860, dark, kurumsal)

- Before: stories coral/yellow warm lobe closing'e tasiyordu → navy section warm atmosphere ile karisiyordu + stories radial lift → crease
- After: stories continuous navy deniz, closing.navy ayni deniz uzerinde subtle coral accent (sol-alt) → yumusak gecis, brand coral dili korundu
- Aday segment closing.verm: dokunulmadi, regression yok

### Kurallar / ogrenilen

- Ayni renk uzerine ayni renk alfa = no-op. Radial "lift" etkisi istiyorsan ton farki gerekiyor (navy-lighter / navy-dark vs navy).
- Base `.closing::before` verm brand icin tasarlandi (coral+yellow). Navy modifier kendi override'ini gerektirir.
- Codex review dunyada "bu radial visible mi" sorusunu static CSS tarafindan cevapliyor — bizim playwright pixel sample teyit etti.

---

## 2026-04-19 — K-043 dark mode tek ton politika (Asama 80.4) — replaces K-040

**Durum:** K-040 2-ton ABA ritim Tuna tarafindan geri cekildi. Screenshot ile tek hex `#0F121F` (rgb 15,18,31) verdi, "dark mode'daki butun beyaz + warm-cream zeminler bu tona override etsin, navy + vermillion degismesin". Push hazir.

**Aktif hedef:** Tuna UAT (hellotalent.ai dark mode 4 sayfa tutarlik + JS disabled test).

**Claude icin gorev:** Tuna ton onaylarsa: kart-level transparan rgba yuzeyler kontrol edilsin (sekin edebiliyorsa minimal tweak). Aksi halde bekle.

### Yapilan is

| Dosya | Scope |
|-------|-------|
| `shared-v2.css` `html.dark` blok | body + .s-cream/.s-warm/.s-white tek `#0F121F`. Comment K-043 replaces K-040. |
| `shared-v2.css` `html.dark` hero ozel | `.about-hero`, `.contact-hero` `#0B0D17` → `#0F121F` |
| `shared-v2.css` `html.dark` brand-strip + hq-map | `#0F1220` → `#0F121F` (yakin zaten, unify) |
| `shared-v2.css` `@media (prefers-color-scheme: dark)` blok | Ayni tokenler senkron + `html .about-hero, html .contact-hero, html .hq-map` (specificity bump — local `<style>` override'lari icin) + brand-strip bg unified |
| `index.html`, `hakkimizda.html`, `iletisim.html`, `yasal.html` | Cache bump `v=h → i` |

### Onemli kesif — CSS specificity bug (K-043 sirasinda yakalandi)

`hakkimizda.html` ve `iletisim.html` head icindeki local `<style>` bloklari `.about-hero { background: var(--cream); }` ve `.contact-hero { ... }` tanimliyor. Ayni specificity'de (0,0,1,0) shared-v2.css'ten sonra yuklendikleri icin override ediyorlar. JS pre-paint `html.dark` class ekledigi icin `html.dark .about-hero` (specificity 0,0,2,0) bunu atliyor — ama JS disabled ortamda `@media` `.about-hero` tek triger kalinca local kazaniyor.

Fix: `@media` blogunda `html .about-hero` / `html .contact-hero` / `html .hq-map` formu (specificity 0,0,1,1) local override'larini yener. `html.dark` tarafi dokunulmadi, zaten calisiyordu.

### Codex diff review — Medium finding fix edildi

- **Medium (fixed):** `@media` bloku K-043 hero/brand-strip/hq-map override'larini tasimiyordu. No-JS ortamda regression. Fix: @media'ya specificity bump ile eklendi.
- **Low (fixed):** `@media` eski "Brand strip — stays cream surface but inverted" yorumu K-043 ile celisiyordu. Guncellendi.
- **Suggestion (applied):** Comment'e "replaces K-040 2-tone ABA" eklendi.
- **`cta-street` scene:** Codex separate risk belirtmedi (object-fit cover dar viewport crop algisi — patch'ten bagimsiz).

### Playwright audit — iki path

**JS-on, colorScheme:dark, html.dark class:**
- Tum 4 sayfa: body + section + hero ozel + brand-strip + hq-map = `rgb(15,18,31)`
- Navy (`.stories`, `.closing.navy`) + verm (`.closing.verm`) intact

**JS-off, colorScheme:dark, @media tek trigger:**
- Tum 4 sayfa: body + section + hero ozel + brand-strip + hq-map = `rgb(15,18,31)`
- Parity tam: html.dark path ile @media path identical output uretiyor

### A11y

- `--cream` (#F7F6F4) uzerine `#0F121F` kontrast = **16.98:1** (WCAG AAA)

### Kurallar / ogrenilen

- Local `<style>` shared-v2.css'ten sonra yuklenir — ayni specificity'de local kazanir. Override icin shared tarafi specificity bumplamak gerek.
- Dark mode'da JS-based (html.dark) + @media-based iki trigger identical olmali; aksi halde no-JS ortamda regression.
- Ton politika degisince git log + comment'te "replaces K-XXX" ibaresi + audit trail acik olur.

---

## 2026-04-19 — K-042 iletisim hero Grok video entegrasyonu (Asama 80.3)

**Durum:** Iletisim hero `.contact-hero-vis` statik webp → Grok interview video. K-041 ile identical pattern. Push hazir.

**Aktif hedef:** Push sonrasi Tuna UAT (iletisim hero video + dark mode + mobile).

**Claude icin gorev:** Tuna istediginde: (1) K-041b cleanup — `.hero-vid` shared utility + reduced-motion handler consolidation (index hero video'lari + hakkimizda + iletisim tek kaynaktan), (2) orphan webp cleanup (`iletisim-hero.webp`, `hero-aday.webp`, `hero-isveren.webp` artik referanslanmiyor), (3) story card AI portreleri yenileme.

### Yapilan is

| Dosya | Scope |
|-------|-------|
| `assets/v2/hero-iletisim.mp4` | 474KB, H.264, 496×608, 6.04s, ses yok |
| `assets/v2/hero-iletisim-poster.jpg` | 27KB, ilk frame |
| `iletisim.html` CSP | `media-src 'self'` eklendi |
| `iletisim.html` `.contact-hero-vis` CSS | `video.hero-vid` selector eklendi |
| `iletisim.html` hero markup | `<img>` → `<video class="hero-vid" autoplay muted loop playsinline poster>` |
| `iletisim.html` pre-paint scripts | K-041 reduced-motion handler (hakkimizda ile identical) |

**Cache bump yok** — shared-v2.css degismedi, K-041 ogrenisi.

### Playwright verify (file://)

- normal: readyState 4, paused false, 496×608, autoplay+muted+loop+playsinline ✓
- reduced-motion: `reducedMotion: 'reduce'` → paused true, autoplay attribute removed ✓

### Codex diff review — GO (No blocking findings)

- CSP tutarli, directive catismasi yok.
- Dark mode hero+s-warm kaynasma hala ayni low-sev risk; video section boundary uretmiyor, Tuna isaret etmezse birak.
- Reduced-motion handler selector dogru, sorun davranisin ortaklastirilmamis olmasi (K-041b teknik borc).
- Repo size OK: v2 assets 2.7MB, Pages limitine uzak. Orphan webp cleanup opsiyon.
- aria-label kabul edilebilir; `role="img"` semantik olarak daha net (opsiyon).
- DOMContentLoaded tek check: kullanici OS reduced-motion'i sayfa aciktayken degistirirse live sync yok. K-041 ile ayni teknik borc.

### Teknik borclar (ayri ticket)

- **K-041b:** reduced-motion handler `index.html` hero video'larina uygulama + `.hero-vid` shared utility consolidation (CSS + script, tek kaynak).
- **K-042b:** Orphan asset cleanup — `iletisim-hero.webp`, `hero-aday.webp`, `hero-isveren.webp`.

---

## 2026-04-19 — K-041 hakkimizda hero Grok video entegrasyonu (Asama 80.2)

**Durum:** Hakkımızda hero `.about-hero-vis` statik webp → Grok interview video. Index hero pattern identical. Push hazir.

**Aktif hedef:** Push sonrasi Tuna UAT (hakkimizda video play, poster, mobile).

**Claude icin gorev:** Tuna istediginde: (1) iletisim hero video entegrasyonu ayni pattern, (2) story card AI portrelerinin Grok video / fotograf ile yenilenmesi. Pre-existing `index.html` hero video'larina da reduced-motion handler eklemek (K-041b teknik borc).

### Yapilan is

| Dosya | Scope |
|-------|-------|
| `assets/v2/hero-hakkimizda.mp4` | 737KB, H.264, 496×608, 6.04s, ses yok |
| `assets/v2/hero-hakkimizda-poster.jpg` | 35KB, ilk frame |
| `hakkimizda.html` CSP | `media-src 'self'` eklendi |
| `hakkimizda.html` `.about-hero-vis` CSS | `video.hero-vid` selector eklendi |
| `hakkimizda.html` hero markup | `<img>` → `<video class="hero-vid" autoplay muted loop playsinline poster>` |
| `hakkimizda.html` pre-paint scripts | K-041 reduced-motion handler — `matchMedia('(prefers-reduced-motion: reduce)')` true ise `autoplay` kaldirilir + `pause()` |

### ffmpeg pipeline (memory'de var)

```
ffmpeg -i src.mp4 -an -c:v libx264 -crf 23 -preset medium -movflags +faststart -pix_fmt yuv420p dest.mp4
ffmpeg -ss 0.1 -i src.mp4 -vframes 1 -q:v 3 poster.jpg
```

### Playwright verify (lokal, file://)

- Video load: src + poster path OK, readyState 4, paused false, vw/vh 496/608
- Reduced-motion: `reducedMotion: 'reduce'` context → paused true, autoplay removed
- Normal-motion: paused false, autoplay true

### Codex diff review — GO (1 a11y finding → fix applied)

- **a11y (fixed):** reduced-motion handler eklendi.
- **Cache bump (fixed):** shared-v2.css v=i geri alindi v=h — shared dosya degismedi, index ile parity.
- **Selector scope:** `.about-hero-vis video.hero-vid` scoped tutuldu; shared utility'e cikarmak icin 3. kullanim beklenecek.
- **aria-label:** mevcut kabul edilebilir; Tuna isterse `role="img"` ek sonra.
- **Pre-existing teknik borc:** `frame-ancestors` + `X-Frame-Options` meta warning (HTTP header olarak set gerekli — scope disi).

### Kurallar / ogrenilen

- `.hero-vid` su an 2 farkli parent altinda (`.hero-portrait` + `.about-hero-vis`). 3. kullanim gelince shared utility'e cikart.
- Reduced-motion handler tum hero video'lara uygulanmali — index.html'e K-041b ayri fix.
- Cache bump sadece dogrudan degisen asset icin. shared dosya dokunulmadiysa bump yapma.

---

## 2026-04-19 — K-040 dark mode section tone normalization (Asama 80.1)

**Durum:** Tuna raporu: dark mode'da aday segment section'ları "siyah → farkli siyah → farkli siyah → navy → verm" drift okundu. Navy + verm OK, ama 3 yakin koyu ton (`#0B0D17/#0F1220/#151829`, luminance jump ~2-3pt) intentional rhythm olarak okunmuyordu.

**Aktif hedef:** Push sonrasi Tuna UAT (adaylar + kurumsal + hakkimizda + iletisim dark mode).

**Claude icin gorev:** Tuna "iletisim hero + s-warm kaynasmis" dese 1px `rgba(247,246,244,.06)` top border ekle (Codex low-sev bulgusu); aksi halde bekle.

### Yapilan is

| Dosya | Scope |
|-------|-------|
| `shared-v2.css:864-871` html.dark bloku | 2-ton ABA: s-cream+s-warm → `#0B0D17`, s-white → `#141724` |
| `shared-v2.css:1061-1068` @media(prefers-color-scheme:dark) bloku | Ayni 3 token senkron |
| `index.html`, `hakkimizda.html`, `iletisim.html`, `yasal.html` | Cache bump `shared-v2.css?v=20260419g → h` |

### Playwright audit (file:// + colorScheme:dark, lokal, CF Access public'i kapali)

- `index#adaylar` / `aday.html` redirect: `#0B0D17 → #141724 → #0B0D17 → navy → verm` (ABA)
- `hakkimizda`: `A → B → A → B → verm` (ABAB)
- `iletisim`: `A → A → B → A` (hero + s-warm bitisik ayni ton, Codex low-sev)
- `isveren` redirect: `navy → B → A → navy → navy` (eskiden de navy+navy bitisik)
- `yasal`: etkilenmedi (hero navy, panel transparent)

### Codex diff review — GO (No blocking findings)

- A11y kontrast: `--cream` uzerine `#0B0D17`=17.93:1, `#141724`=16.51:1 (AAA).
- Senkron: 3 `.s-*` token iki blokta identical. Diger dark override'lari (seg-toggle/value-card/hq-map) sadece `html.dark` tarafinda — bug degil, bakim riski olarak not dustu; comment bunu yansitacak sekilde revize edildi.
- Low-sev: iletisim hero+s-warm kaynasma, sadece Tuna geri bildirim verirse separator.

### Kurallar / ogrenilen

- Dark mode'da tonal rhythm subtle olamaz: luminance jump <5pt → drift okunur. 2-ton ABA veya 1-ton + separator.
- shared-v2.css dark blok duplikasyonu (html.dark + @media) sadece base tokenleri icin parity istiyor; sayfa-ozel override'lar tek blokta kalabilir.
- `aday.html` + `isveren.html` meta-refresh redirect, CSS yok — cache bump gerekmiyor.

---

## 2026-04-19 — Public-site v2 feedback iterasyonu (Pass 1-6) + Grok hero video loop (Asama 80)

**Durum:** Tuna home session + handoff molasi. Canlı site üzerinden 10+ feedback turu yapıldı, hepsi peş peşe deploy edildi (`8050cce → a1bad9e`, 8 commit). Index hero (aday + kurumsal) Grok interview video'larına çevrildi — seamless 6sn loop autoplay/muted. Tuna "OHA ÇOK GÜZEL OLDU" ile kapattı.

**Aktif hedef:** Bir sonraki oturumda hakkımızda + iletişim hero'larına aynı video pattern + story card AI drift (Güney Asya/hijab) yenilemesi.

**Claude için görev:** Sonraki oturumda: (1) hakkımızda/iletişim hero Grok prompt + ffmpeg + entegre; (2) 6 story card portre yenileme; (3) `project_clatu_style.md` video spec. Detay liste `docs/CURRENT-STATE.md §5a`.

### Bu oturumda yapılanlar — commit sırası

| Commit | İş | Scope |
|--------|-----|-------|
| `8050cce` | brand palette restore + dark mode | `--ink → navy`, `.theme-toggle`, pre-paint, kontrast |
| `dd79677` | feedback pass 2 | Footer canonical, logo 38px, "Peoplein İK Ltd. Şti.", mockup badge drop, button 10px, eyebrow margin, `:has()` seg-toggle, split-card, fact ortalı |
| `ae13763` | feedback pass 3 | "Hesap aç" → `uye-ol.html?tab=kurumsal`, Maps iframe + CSP `frame-src`, Aday sol/Kurumsal sağ, trustpill drop |
| `377cf9b` | footer logo bold | `font-variation-settings: wght 800, opsz 14` |
| `06e9599` | footer dedupe | Aday kolonundan Hakkımızda drop |
| `28e270f` | hero alignment + segment-aware login | hakkimizda/iletisim top padding index'e hizalandı, vis 4:5, `switchSeg` Giriş Yap `?tab=` dynamic, kurumsal eyebrow "Neden HelloTalent" |
| `93fee09` | dark mode toggle kaldırıldı | OS-only + `matchMedia('change')` listener |
| `a1bad9e` | Grok hero video loop | `hero-aday.mp4` 540KB + `hero-isveren.mp4` 410KB, ffmpeg first-frame poster, CSP `media-src 'self'`, `<video autoplay muted loop playsinline>` |

### Öğrenilenler / kurallar

- **Feedback cycle ritmi:** screenshot oku → teşhis → minimal targeted fix → `v=2026041<letter>` cache bump → commit + push → 40sn propagation → hard refresh. Caveman tutuldu.
- **`replace_all` tehlikesi:** çoklu HTML dosyasında aynı `<li><a>` pattern birden fazla kolonda varsa replace_all hepsini siler. Bu oturumda Bilgi kolonu Hakkımızda yanlışlıkla silindi (commit `06e9599` geri ekledi). **Kural: replace_all öncesi `grep -c` ile beklenen eşleşme sayısını doğrula.**
- **Grok video workflow (tam pipeline):**
  1. Prompt: "Cinematic editorial, Mediterranean Turkish Caucasian features, light olive skin, Kodak Portra 400, over-the-shoulder framing" + negative "no hijab, no South Asian, no Middle Eastern stereotypes, no watermark, no text". Aday POV = interviewer omuz foreground + aday yüz focus. Kurumsal POV = candidate omuz foreground + HR yüz focus (simetrik).
  2. Grok output: ~448×672 H.264 MP4.
  3. ffmpeg ses strip + web-opt: `ffmpeg -i src.mp4 -an -c:v libx264 -crf 23 -preset medium -movflags +faststart -pix_fmt yuv420p dest.mp4` → ~500KB.
  4. Poster ilk frame: `ffmpeg -ss 0.1 -i src.mp4 -vframes 1 -q:v 3 poster.jpg` → ~30KB.
  5. HTML: `<video class="hero-vid" autoplay muted loop playsinline preload="metadata" poster="...">` + CSS `object-fit: cover`.
  6. CSP: `media-src 'self'` eklenmeli.
- **Dark mode OS-only karar:** Tuna OS'ta dark kullanıyor, manuel toggle kafa karışıklığı yarattı. Pre-paint script `matchMedia('(prefers-color-scheme: dark)')` okur, `matchMedia('change')` listener OS değişince live tepki verir. localStorage yok.
- **Seg-toggle pill (999px) intentional** — diğer butonlar 10px, seg-toggle pill kalmasına Tuna onay verdi (video üzerinde estetik).
- **Recraft realistic karakter drift** — Türk fenotipini tutturamadı, Güney Asya/Arabic'e kaydı + hijab üretti. Recraft karakter odaklı brief için yetersiz. Grok Imagine video'da (image-to-video) Türk/Akdeniz prompt'ları çok daha tutarlı.

### Açık riskler / dikkat

- **Story card AI portreleri (3 aday + 3 kurumsal)** hala Recraft drift (Güney Asya). Hakkımızda iletişim hero portreleri hala webp.
- **Kurumsal "Neden HelloTalent"** sadece eyebrow + lede güçlendirildi; Tuna yeni section beklemişse oturum başında netleştir.
- **Linter drift:** bazı HTML editleri "File modified by user or linter" hata verdi — muhtemelen editor auto-format. Edit yerine Python/sed daha güvenli multi-file için.

### Memory update

- `project_clatu_style.md` — v2 Editorial Photography + portre casting brief (beyaz Türk, 25-32, yakışıklı/güzel) eklendi.
- `MEMORY.md` index satırı güncellendi.

---

## 2026-04-18–19 — Public-site v2 redesign production'a + K-036/037/038 hotfixes + K032 Faz 4 (Asama 79)

**Durum:** Üç büyük iş bloğu tek günde kapandı: K032 Faz 4 (test suite hardening), üç codependent hotfix (K-036 admin hash-restore + K-037 ik gate + K-038 ik SELECT repair), public-site v2 redesign canlıya alındı. Giriş sayfalarına (giris/aday/isveren/uye-ol) dokunulmadı — prod auth flow intact.

**Aktif hedef:** Tuna production UAT (hellotalent.ai + hakkimizda + iletisim + yasal dark mode/mobile/hamburger). Gerçek işveren login flow doğrulama (K-037 canlı etki).

**Claude için görev:** Yok — Tuna UAT + feedback bekliyor. Sorun bulursa targeted fix pattern (class-level override > token override, dark mode rule'lar).

### Commit sırası

| Commit | Ne | Scope |
|--------|-----|-------|
| `3c88ad1` | K032 Faz 4 kapanis | Test suite + helpers + runbook |
| `a8910e4` | K-036 + K-037 + K-038 | Admin hash-restore + ik gate + ik SELECT |
| `f8acd5c` | Public-site v2 redesign | 4 sayfa + shared-v2.css + assets/v2/ |

### K032 Faz 4 (commit 3c88ad1)

**Codex plan review** bir kez no-output döndü → pragmatik Tuna onay + Claude self-spec + Codex diff review gate.

- **K-2 panel activation assert** (3 spec): `expect(activePanelId).toBe('panel-' + hash)` eklendi. profil `yetkinlik` hash router aliases'a takıldı (`profil-events.js:508`) → `PANEL_ID_ALIASES = { yetkinlik: 'mulakat' }` + `expectedPanelIdFor(hash)` helper. admin.html hash-restore yoktu (K-036 backlog entry) → o zaman "always dashboard" assert.
- **K-3 admin auth setup**: login sonrası `/admin.html` navigate + `#admin-shell.active` visibility 10s timeout assert + storageState save. admin_users lookup gate setup'ta kanıt işleniyor.
- **O-1 seed helper**: `scripts/_supa-admin.mjs` (145 satır) — `loadAdminEnv`, `makeReq`, `ensureUser`, `refuseEmail`, `validateCreds`, `findUserByEmail`. 3 seed refaktör.
- **O-2 test helper**: `tests/helpers/runtime-signals.js` — shared IGNORE/REGRESSION + `attachCollectors`/`criticalFrom`/`contextSnapshot`/`waitForBootSettle`.
- **O-3 flakiness**: `waitForBootSettle(page, {sentinelTimeoutMs, settleMs})` — profil.html `_htBootstrapDone` sentinel wait + microtask flush.
- **O-4 runbook**: `docs/SECURITY-RUNBOOK.md` — service_role rotate (§1) + test_account audit (§2, 4 SQL) + incident response (§3) + local dev hygiene (§4).

**Codex diff review**: 1. iter NO-GO (3 bug: profil yetkinlik alias, admin hash-restore yok, K-3 `is_admin()` yanlış referans). Düzeltildi. 2. iter timeout (codex-rescue runtime sorunu). Self-audit + empirical regression (161/161 yeşil) gate yerine geçti.

**Test**: 161/161 K032 suite yeşil (16 Faz 1 + 54 Faz 2 + 40 Faz 3A + 48 Faz 3B + 3 setup), desktop + mobile. Pre-existing profil.ayarlar-toggles 6 fail (sidebar race) scope dışı.

### K-036 + K-037 + K-038 (commit a8910e4)

**Kritik insight**: Üç sorun codependent. K-037 tek başına fix edilmez çünkü K-038 üstte session'ı bozuyor.

**K-036 admin hash-restore**:
- `admin.html showAdminDashboard`: `window.location.hash` oku + `switchPanel(hash, navEl)` çağır, bilinmeyen hash'lerde `loadDashboardOverview()` fallback.
- `hashchange` listener mount (`#admin-shell.active` guard) → browser back/forward + cross-panel deep links.

**K-037 ik onboarding gate**:
- `ik.html:2427` (boot) + `ik.html:2508` (switchPanel): `!hrProfile.sirket` → `!hrProfile.company_id`.
- `company_id` semantik doğru ("işveren şirkete bağlı mı"), zaten SELECT'te, save flow `link_employer_to_company` RPC set ediyor. RPC fail olursa `company_id=null` kalır → gate kapalı kalır → kullanıcı retry eder (fail-safe).
- `saveSirket` companion fix: RPC success sonrası `onboarding_completed=true` PATCH (fire-and-forget). `is_employer()` RPC bu flag'i bekliyor (`supabase/migrations/20260408154354_sec_hr_profiles_guard.sql`).

**K-038 ik SELECT repair (K-037 debug sırasında keşfedildi)**:
- `ik.html:2365` SELECT `avatar_url` kolonu istiyordu — `hr_profiles` tablosunda bu kolon YOK.
- PostgREST 400 `column hr_profiles.avatar_url does not exist` döndürüyordu.
- Hata `try{ } catch(e){} ` içinde sessizce yutuluyordu.
- `prof` null → `hrProfile={}` boş objede kalıyor → K-037 fix bile etkisizdi (`company_id` undefined).
- SELECT listesinden `avatar_url` çıkarıldı. Form-prefill için eksik kolonlar (sirket, sektor, buyukluk, web_sitesi, segment, merkez_sehir, magaza_sayisi, aciklama, aranan_profil, calisma_saatleri, linkedin, career_page_url, company_type) eklendi.

**Test altyapı update**:
- `scripts/seed-test-employer.mjs`: companies tablosuna "Peoplein Test" row + slug + hr_profile.company_id link + `onboarding_completed=true` seed.
- `tests/smoke.runtime.ik.e2e.spec.js` K-2: "always panel-sirket" → strict `panel-<hash>` (K-037+K-038 landed).
- `tests/smoke.runtime.admin.e2e.spec.js` K-2: "always panel-dashboard" → strict `panel-<hash>` (K-036 landed).

**Codex diff review**: GO-WITH-FIX. Blocker: `saveSirket` missing `onboarding_completed` write. Aynı commit'te kapatıldı. 159/159 K032 suite yeşil.

**Prod impact uyarı**: K-037 + K-038 gerçek işveren login flow'unu da etkiliyordu. Her fresh load'da #sirket'e zorlanıyor, gate release olamıyor. Bu commit ilk kez canlıda gate açılıyor.

### Public-site v2 redesign (commit f8acd5c)

**Tuna yönü**: Mockup v2 (Rocket Mortgage bold direction + HelloTalent Clatu-first brand merge) 13 polish turundan sonra onay aldı. 4 sayfa canlıya → giriş sayfaları dokunma.

**Tasarım dili**:
- Bricolage Grotesque 800 display (clamp 40-96px imperative headline), Plus Jakarta Sans body, DM Mono.
- Palette: Vermillion #C94E28 (aday), Navy #1E2D5E (kurumsal), Cream #F7F6F4 (base), Coral #FF6B4A (dark accent).
- Türk tipi portraits — 8 Recraft webp, "beyaz Türk, kumral/chestnut saç, genç yetişkin + yetişkin karışık, kadın/erkek". 2 iterasyon ("eli yüzü düzgün" feedback sonrası regen).
- Image compression: cwebp q=70 m=6 → 17MB → 434KB (40× azalma, PSNR 37.8-42.9dB natural texture korundu).

**Prod entegrasyon stratejisi** (zero regression):
- `shared-v2.css` (~42KB) yeni bağımsız stylesheet. Mevcut `shared.css` diğer sayfalar (profil/ik/admin/coach-studio/giris) için korundu.
- `assets/v2/` yeni namespace. Orijinal `assets/` dokunulmadı.
- 4 HTML dosyası mockups'dan prod path'e kopyalandı + stylesheet/asset yolları güncellendi + CSP/OG/Schema meta restore edildi + canonical URL set.
- `index.html` Supabase auth redirect script korundu (`app_metadata.role` → profil/ik).

**Mobile responsive**:
- Hamburger menü (segment toggle + linkler + Giriş CTA) — önceki mockup sorunu: mobile'da segment toggle görünmez idi.
- Hero portrait `order: -1` — mobile'da image first.
- Hero badge safe position (left/bottom 12px, max-width calc, font smaller @560).
- Stories mobile collapse @768 — ilk 2 görünür + "Tüm hikayeleri gör" toggle fade-in.
- Brand strip 1-col stacked + separators @520 (önceki 3×2 grid sıkışıktı).
- Footer 2-col @960 / 1-col @560.

**Dark mode** (2 CSS pass):
- Pass 1: `html.dark` class + `@media (prefers-color-scheme: dark)` dual trigger, 60+ base override.
- Pass 2 (kullanıcı şikayetinden sonra): targeted `.lede`/`.fact span`/`.contact-card p`/`.hq-info p`/`.value-card p`/`.step-card p`/`.split-2 p`/`.closing p`/yasal `h2`/`h3`/table + map placeholder.
- Kritik keşif: 6 step card paragrafı `style="color:var(--ink-soft)"` inline — dark mode override'ı CSS specificity'de geçiyordu. `.step-p` class extraction zorunlu.
- Token override sınırı: `html.dark { --muted: rgba(247,246,244,.72); }` tek token override OK. `--ink`, `--border` vb. global override regression yarattı (footer bg cream'e döndü). Sadece class-level override kullandık.
- Coral dark variant `rgba(255,107,74,.88)` (saf coral agresif geliyordu).
- KVKK tablo dark: TH background `var(--navy)` (AA kontrast).

**A11y** (WCAG 2.1 AA):
- `skip-to-content` utility (visually hidden default, focus visible).
- `*:focus-visible` brand outline (2px verm / dark'ta coral).
- `prefers-reduced-motion` respect (tüm transition'lar `.01ms`).
- `<main id="main">` landmark wrapping.
- `aria-expanded` + `aria-hidden` hamburger button + menu.
- `--muted` token: `#6F7493` (4.2:1) → `#5D6283` (4.9:1 on cream).

**Value cards flex pattern**:
```css
.vp-card { display: flex; flex-direction: column; height: 100%; }
.vp-card .vp-more { margin-top: auto; }
```
Kart yükseklikleri farklı content olsa bile CTA bottom anchored. Underline hover.

**SEO**:
- Her sayfada CSP + OG + Twitter card + canonical URL.
- index.html: Schema.org JSON-LD `@type: WebSite`.
- Robots: `index, follow` (mockup'taki `noindex` kaldırıldı).

**Copy fix**:
- "96 markası seni arasında bulsun" → "96 markası arasından seni seçsin" (grammar).
- "retail" → "perakende" consistency (Türkçe body copy).
- Story alt text descriptive ("Sephora'da kategori planlama ekibine geçen Selin A. portresi (temsili)").
- Stories disclaimer eklendi ("Hikayeler mockup dönemi için temsilidir...").

**SAAS dil temizliği**:
- "Demo talep et" tüm instances (12 adet) → "Kurumsal hesap aç" (direct signup flow).
- "demo panel ve canlı havuz" → "yetenek havuzu ve işveren araçları".
- Hakkımızda 2-split right block copy ters düzeltildi (Adaylar eyebrow altında işveren cümleleri vardı → "Profilini oluştur, markalar seni bulsun").
- "Kurumsal panel" SAAS btn → "İşveren olarak başla".

**İletişim map placeholder**:
- Google Maps iframe localhost + CSP'de yüklenmiyordu → styled placeholder: diagonal gradient + grid pattern + pulsing vermillion location pin + HQ info card. Canlıda isteğe göre iframe geri eklenebilir.

**Playwright QA**: 4 sayfa × light/dark × desktop 1440 + mobile 390 = 16+ görünüm verify. Mobile hamburger açık durumu test edildi. 80+ dark mode rule AA kontrast.

### Açık riskler / sonraki adımlar

- **Tuna prod UAT**: hellotalent.ai (+hakkimizda/iletisim/yasal) dark mode + mobile + hamburger + gerçek işveren login flow. K-036 bookmark test (`/admin.html#brands` doğrudan açılış). K-037 gerçek işveren onboarding döngüsünden çıkabildiği teyit.
- **Giriş sayfaları v2 redesign** — henüz yapılmadı. Prod'da giris.html + aday.html + isveren.html + uye-ol.html mevcut legacy design'da. Ayrı mockup iterasyonu.
- **K-037 DeepSeek audit** (prod employer data etkileşimi) — gerekirse.
- **İletişim map iframe restore** — prod'da Google Maps embed geri eklenebilir (CSP zaten izin veriyor `frame-src https://www.google.com`).
- `profil.ayarlar-toggles.e2e` 6 pre-existing fail — ayrı sprint (sidebar-user-name visibility race).
- Kim Bakti backend PVT-1..6 (K031) hala backlog.
- K031 Kim Bakti backend hala bekliyor.

---

## 2026-04-17 — K032 Audit + Husky --no-stash Fix (Asama 78 gece kapanis)

**Durum:** K032 Faz 1+2+3 push sonrasi teknik borc audit'i. 2 paralel agent (code-reviewer + husky-drift Explore) + targeted regression. 3 KRITIK + 4 ORTA + 3 LOW bulgu. 2 kritik simdi fix (Husky + K-1), K-2/K-3 + 4 orta Faz 4 backlog'a somut kapsamla gecti. Commit `3668add` push edildi.

**Husky scope-drift root cause:**
- lint-staged v16.4.0 `git stash --keep-index` mekanizmasi partial staging durumunda (staged + unstaged mix) unstaged dosyalari commit'e aliyordu.
- Paralel tasarim session'in unstaged degisiklikleri K032 commit'lerine sizdi (0c25753 ornegi — mesaj "test" ama icinde 4 tasarim dosyasi).
- Fix: `.husky/pre-commit` `npx lint-staged` → `npx lint-staged --no-stash`. 1 satir, backup stash devre disi, sadece explicit staged dosyalar commit'e girer. Bu commit'in kendi kaniti: 3 staged + 1 unstaged (ik.html paralel session), sadece 3 commit'te.

**K-1 seed-test-user.mjs metadata fix:**
- Candidate test user'da `user_metadata.test_account: true` flag eksikti (employer + admin'de zaten vardi).
- `updateUserPassword` → `updateUser` rename: mevcut user'da da metadata PUT alir, existing-user branch'i artik metadata drift yapmaz.
- Idempotent rerun dogrulandi, candidate id=77 update path yesil.

**Audit sonuclari:**
- Secret hijyen: TEMIZ (`.env.local` git-ignored, seed script'te hardcode yok, history'de sizinti yok, sadece placeholder referanslari `sb_secret_...`)
- Scope-drift icerigi: Design Refactor Faz 1c sagliklı DRY, runtime regresyonsuz (testler 479/479 yesil)
- ESLint: 0 error (7 warning = test dosyalari scope disi, bilincli)
- Docs sync: CURRENT-STATE + karar-defteri + AI-COLLAB K032 tam
- Skill awareness: `.agents/skills/*/SKILL.md` K032 smoke suite bilmiyor (low priority)

**Faz 4 backlog (karar defterinde somutlasti, ~40 dk toplam):**
- K-2 (Kritik, 15 dk): 3 e2e spec'te `.panel.active` okunuyor ama assert edilmiyor. Routing bug sessiz yesil riski. Fix: `expect(activePanel).toBe(hash)`.
- K-3 (Kritik, 10 dk): `auth.setup.admin.js` login sonrasi profil.html'de storageState, admin.html'e navigate etmeden. Session yeterli mi belirsiz. Fix: setup'ta /admin.html navigate + lokator verify.
- O-1 (Orta): 3 seed script helper extraction (`scripts/_supa-admin.mjs`) — coach rol gelmeden.
- O-2 (Orta): 4 test helper extraction (`tests/helpers/runtime-signals.js`) — `admin.e2e` eksik `demo-dashboard-ik.html` IGNORE drift basladi.
- O-3 (Orta): `waitForTimeout` → `page.waitForFunction` uygulama-tarafli sentinel, CI flakiness riski.
- O-4 (Orta): `docs/SECURITY-RUNBOOK.md` yok, service_role rotate prosedurunu belgele.

**Targeted regression:** smoke.runtime.spec.js + p3.regression.spec.js desktop = **479/479 yesil (7.2s)**. K032 Faz 1+2+3 kendi koşumları oturum boyunca yeşildi: 16 + 52 + 40 + 48 + 4 setup = 160.

**Full suite hang:** `--reporter=line | tail -10` 30+ dk hang etti, output file'a yazilmadi, kill edildi. Ek borc: `--reporter=list` + explicit output dosyasi kullan (O-5 backlog — karar defterine eklenebilir).

**Genel verdict:** Orta borc → **Dusuk borc** (Husky + K-1 fix sonrasi). Kritik 2 bulgu (K-2/K-3) Faz 4 somut backlog, production zarar yok.

**Commit:** `3668add` (fix k032 audit paketi). Tasarim dosyalarina SIFIR temas — paralel tasarim session'in isine cakisma yok.

---

## 2026-04-17 — Design Refactor Faz 2 Pass 3 — JS-driven emoji → SVG (ICON_SVG helper)

**Durum:** ik.html JS-renderli emoji'ler SVG'ye gecti. Yeni `ICON_SVG` helper map + `iconSvg(name)` fonksiyonu, tum icon isimlerini tek yerden sunuyor. Activity feed, empty state'ler ve match score pill SVG'ye donusturuldu.

**ICON_SVG helper (yeni):**
- 22 feather-style icon: dot_green/verm/navy/muted, edit, lock, list, archive, user, users, star, star_fill, heart, heart_fill, search, mail, file, bolt, wave, building, tag, alert, check
- Tumu currentColor + stroke-based (renk var() ile override edilebilir)

**Activity feed (panel-dashboard):**
- Pozisyon icons: 🟢📝🔒📋 → `dot_green/edit/lock/list`
- Aday kaydi: 👤 → `user`
- Favoriler: ⭐ → `star_fill`
- Takipci: 💜 → `heart_fill`
- Empty state: 📋 → 32px SVG list
- Render loop: `iconSpan.textContent` → `iconSpan.innerHTML = iconSvg(a.icon)` + 24x24 flex container

**Pozisyonlar empty states (5 tip):**
- active/draft/closed/archived/template → `list/edit/lock/archive/star`
- msgs struct: `{i:'emoji'}` → `{i:'iconName'}`
- .empty-icon CSS: font-size:40px → SVG width:40px, color:var(--muted) opacity:0.55

**Marka bakti / Takipciler empty states:**
- 🏢 no-company → building SVG (48px inline)
- 🏷️ no-brand → tag SVG
- 👥 empty follower → users SVG

**Diger:**
- ⚠️ error empty-state → `alert` SVG
- 👋 welcome banner → wave SVG
- 🔍 search empty (2 yer) → `search` SVG
- ⚡ match score pill → `bolt` SVG (inline-flex gap)

**Kapsam disi (button-label emojiler, iconographic convention):**
- ★ favori / 📄 CV / ✉️ mesaj button'lari (label prefix olarak kullaniyor)
- 🔒 Premium lock badges (CSS class'a convert etmek icin ayri pass)
- ✕ modal close (standart convention)
- ✓/✗ plan feature checkmarks (inline text)
- ♥ brand follow tag (dingbat, emoji degil)

**Pass 2 tamam.** Kalan: Premium lock cleanup, stat card aha-metric redesign, first-session onboarding hero → sonraki fazlar.

**Dogrulama:** ik.html load OK, console error yok. Kurumsal auth ile full panel gorsel verify Playwright e2e'ye birakildi.

Ref: `docs/design-refactor/faz1-tokens.md`

---

## 2026-04-17 — Design Refactor Faz 2 Pass 2 — Şirket profili emoji → SVG

**Durum:** Şirket profili paneli (ik.html) kart başlıklarından emoji temizlendi, SVG feather icon'larla değiştirildi. .profil-card-title class'ı flex container'a çevrildi (icon + text align).

**Yapilan:**
- 4 kart başlığı: 🏢 Temel Bilgiler / 📞 İletişim & Konum / ✍️ Şirket Hakkında / 📍 Mağaza Lokasyonları → SVG icons
- 🏷️ Şirket Yapısı section header → SVG tag icon
- 🏪 Tek Marka / 🏢 Çoklu Marka type selector (24px emoji) → 28px SVG store/building icons
- 🏢 Kampanya no-company empty state (48px emoji) → 48px SVG with opacity:0.55
- Hardcoded `#FEF7F5` → `var(--verm-light)`

**CSS:**
- `.profil-card-title` flex/align/gap eklendi, svg child'a `color:var(--verm)` default stroke

**Kapsam disi (Pass 3):**
- Pozisyonlar empty states (📋📝🔒🗄️⭐) — JS textContent emoji (5 pozisyon tipi)
- Aday ara panel empty state (🔍)
- Favoriler / Takipçiler empty state (👤💜👥)
- Activity feed toast emojis (✓⚠️ 👋)
- Modal close ✕ (iconographic, dusuk oncelik)

**Dogrulama:** ik.html load + redirect normal. Console error yok.

Ref: `docs/design-refactor/faz1-tokens.md`

---

## 2026-04-17 — Design Refactor Faz 2 Pass 1 — ik.html dashboard cleanup

**Durum:** Dashboard paneli emoji temizlendi, hardcoded renkler token'a gecti, empty state ve quick-access cards yeniden tasarlandi. CSS sadece dashboard panel'e yoneldi.

**Yapilan:**
- `.stat-change` "🟢 Aktif" → `.stat-dot.stat-dot-green` + "Aktif" (CSS dot indicator)
- Activity feed empty state: 📋 emoji → SVG list icon + `.zero-state` component (title + desc + primary CTA)
- Quick-access 3 card: 🔍 ➕ ⚡ emoji → SVG icons + semantic class'lar (.quick-card, .quick-icon-navy/verm/premium)
- Hardcoded bg: `#EEF2FF` → `var(--navy-light)`, `#FEF3C7` → `var(--verm-light)`. Premium gradient mid-stop `#253872` → `var(--navy-mid)`.
- Inline style'lar class'lara tasindi, hover icin onmouseover/out silindi, CSS transition eklendi
- Dark mode: `.quick-card`, `.quick-title`, `.quick-icon-*`, `.zero-state-title` overrides eklendi

**Kapsam disi (Pass 2):**
- Stat cards aha-metric redesign (delta, insight, urgency)
- First-session onboarding checklist hero
- Diger panellerin emoji cleanup (ayarlar, search empty state vb.)

**Dogrulama:** ik.html load + auth redirect → giris (normal). Console error yok. Visual verify employer auth gerekiyor — K032 Faz 3 auth storageState ile paralel oturumda dogrulanabilir.

Ref: `docs/design-refactor/faz1-tokens.md`

---

## 2026-04-17 — K032 Faz 3 Authenticated ik.html + admin.html Smoke (Asama 78 gece)

**Durum:** Faz 3A (ik 40/40) + Faz 3B (admin 48/48) = 88/88 yesil. Codex K034 review aktif, docs hazir, push pending.

**Seed:**
- `scripts/seed-test-employer.mjs` — `tkefeli@peoplein.com.tr` auth.users + hr_profiles upsert (app_metadata.role='employer', hr_profile existed+updated)
- `scripts/seed-test-admin.mjs` — `admin+k032@peoplein.com.tr` auth.users + admin_users INSERT (role='superadmin', new create). **Prod guard: kefelituna@gmail.com hard-refuse**.
- Ortak password `.env.local`'de, git-ignored.

**Auth setup:**
- `tests/auth.setup.employer.js` — /giris.html?tab=ik login, demo|ik redirect tolerans, storageState `playwright/.auth/employer.json`
- `tests/auth.setup.admin.js` — /giris.html candidate tab login (admin role!=employer → candidate branch → profil.html redirect), storageState `playwright/.auth/admin.json`

**Test:**
- `tests/smoke.runtime.ik.e2e.spec.js` — 10 ik panel × 2 tema × 2 viewport
- `tests/smoke.runtime.admin.e2e.spec.js` — 12 admin panel × 2 tema × 2 viewport
- Ek assertion: giris.html/profil.html redirect FAIL

**playwright.config.js:** 3 setup + 6 e2e project (e2e/e2e-ik/e2e-admin × mobile/desktop). testIgnore regex isolation.

**Bes bacakli koruma:** static + unauth runtime + candidate auth + employer auth + admin auth + kontrat.

**K035 yeni karar:** Prod admin panel sertleştirme (MFA zorunlu, IP allowlist, short session, sudo re-auth, audit log, geo anomaly) — Tuna endişesi, ayrı sprint.

**Test sayisi:** 978 → 1066 (+88).

---

## 2026-04-17 — Design Refactor Faz 1c — Local :root Cleanup

**Durum:** 8 sayfadan duplicate :root token'lari silindi, yalnizca page-spesifik override'lar kaldi. tests/p3.regression Asama 35 rewrite edildi (tokens.css link OR local :root kabul eder).

**Silinen/daraltilan :root'lar:**
- `giris.html`, `uye-ol.html`, `gate.html`: tamamen silindi (hepsi dup'tu)
- `sifre-yenile.html`: 3 override kaldi (--bg, --border, --muted — sifre-yenile-spesifik degerler)
- `coach-studio.html`: 5 override (--verm-hover alias, --bg, --green, --yellow, --red, --shadow-card)
- `demo-dashboard-ik.html`: --bg: var(--gray) alias
- `ik.html`: 7 override (--navy-mid, --verm-hover, --bg, --white, --green, --yellow, --red)
- `admin.html`: 7 override (aynilari + K030 yorum satiri silindi/guncellendi)

**Test update:**
- Asama 35 rewrite: ya tokens.css link ya local :root --text-* tanimi; her iki kaynak valid.

**Dogrulama:** giris, uye-ol, gate, sifre-yenile, admin, ik light mode desktop OK. Console error yok.

Ref: `docs/design-refactor/faz1-tokens.md`

---

## 2026-04-17 — Design Refactor Faz 1b — Token Consolidation (devam)

**Durum:** tokens.css tek source of truth oldu, shared.css `@import` ile tuketir, 7 sayfaya daha `<link tokens.css>` eklendi. Light + dark desktop dogrulandi, console error yok.

**Kapsam:**
- `css/tokens.css` genisletildi: Clatu public tokens (--bg-page, --bg-section, --bg-warm, --bg-warm-k, --font-d/b/m, --pad, --max-w, --navy-dark). `--text-muted` semantic artik rgba(0,0,0,0.65) WCAG AA.
- Dark mode `data-theme="dark"` block Clatu surfaces eklendi. Fallback `@media(prefers-color-scheme:dark):root:not([data-theme="light"])` ile script'siz sayfalar OS-prefer ile dark mode alir.
- `shared.css` top :root dup silindi, `@import url('css/tokens.css')` eklendi. Dark block'taki :root override silindi. LP-specific (--heading-xl, --lp-*) kaldi.
- 7 sayfaya `<link rel="stylesheet" href="css/tokens.css?v=20260417a">`: ik, giris, uye-ol, gate, sifre-yenile, coach-studio, demo-dashboard-ik. Lokal :root cascade'de override etmeye devam ediyor (Faz 1c'de temizlenecek).

**Yasal bonus:** yasal.html `--text-primary/--bg-section/--text-muted` undefined bug cozuldu tokens.css sayesinde. `--text-secondary` hala navy (intentional).

**Faz 1c (bekliyor):**
- 7 sayfadan lokal :root temizleme + `tests/p3.regression` Asama 35 guard update (test ik.html'de :root icinde --text-* arior, tek committe).

**Referans:** `docs/design-refactor/faz1-tokens.md`, `docs/plans/` (gitignored).

**Siradaki adim:** Tuna onay → commit+push. Faz 1c planla, Faz 2 (ik dashboard redesign) sonra.

---

## 2026-04-17 — K032 Faz 2 Authenticated Panel Hash Smoke (Asama 78 devam)

**Durum:** `tests/smoke.runtime.e2e.spec.js` + `scripts/seed-test-user.mjs` yazildi. 52/52 yesil (e2e-desktop 2.6dk + e2e-mobile 2.9dk). Codex K034 review PASS. Tuna onay + push bekliyor.

**Kapsam:** profil.html 13 panel hash (genel/merkez/sirketler/kimbakti/mulakat/yetkinlik/firsatlar/inbox/bildirimler/ayarlar/premium/destek/profil) × 2 tema × 2 viewport (e2e-mobile + e2e-desktop) = 52 test.

**Test user seed:**
- `scripts/seed-test-user.mjs` idempotent — Supabase Admin API (SUPABASE_SERVICE_ROLE_KEY `.env.local`'de, git-ignored) ile auth.users create/update + candidates row upsert
- Email: `kefelituna+k032@gmail.com`, candidate id=77, profile_completed=true, is_active=true
- Rerun-safe: existing user'ın password'unu reset eder, candidate row'unu PATCH eder

**Auth flow:**
- `tests/auth.setup.js` → giris.html login → profil.html redirect → storageState `playwright/.auth/candidate.json`
- `playwright.config.js` `e2e-mobile`/`e2e-desktop` projeleri `.e2e.spec.js` matcher auto-inject storageState

**Test shape:**
- Fresh page her test için
- `page.addInitScript(localStorage.setItem('ht_theme_preference', theme))` navigate öncesi
- `page.goto('/profil.html#' + hash)` — hashchange listener → switchPanel (user-flow gerçekçi)
- `networkidle` timeout + catch sadece timeout, 1800ms panel lazy init bekleme
- Collector + IGNORE + REGRESSION Faz 1 ile AYNI (duplication kabul — 3. tüketici gelince `tests/helpers/runtime-signals.js`'e extract)

**Yakalanan yeni sinif hatalar (Faz 1 disi):**
- Panel render fn boot hatası (undefined ref, yanlış destructuring)
- User-aware RPC typo (`get_candidate_*` signatür farkı)
- Dark mode panel-specific DOM operation bug

**K034 Codex review:**
- Spec turu 2 kez "no output" döndü (subagent runtime şüphesi). Claude self-spec yazdı, implement etti, gate'e Codex review yolladı.
- Review verdict: PASS. Blocker yok.
- Opsiyonel iyileştirmeler (ertelenen): existing-user rol heal + pagination limit, 1800ms→lokator, hash→data-panel contract assert, helper modul.

**Test sayisi:** 926 → 978 (+52).

**Siradaki adim:** Tuna onay → commit+push. Faz 3 (ik + admin tab) backlog.

---

## 2026-04-17 — K032 Faz 1 Runtime Playwright Smoke Suite (Asama 78)

**Durum:** Tek yeni dosya `tests/smoke.runtime.spec.js` (106 satir). 16/16 yesil. Codex K034 review PASS. Tuna onay + push bekliyor.

**Kapsam (Faz 1):** 4 authenticated sayfa (profil/ik/admin/coach-studio) × 2 tema × 2 viewport = 16 test. Auth mock yok — boot-time hata giris redirect oncesi firlar, gate bypass gerekmez. `page.on('pageerror')` + `page.on('console', error)` collector. `page.addInitScript(localStorage.setItem('ht_theme_preference', theme))` navigate oncesi.

**Filter disiplini:**
- IGNORE: supabase/posthog/sentry/cloudflare+turnstile/redirect/CSP noise (raw network pattern'leri `Failed to fetch`/`NetworkError`/`net::ERR_` filter'dan cikarildi — over-permissive engellendi; 3rd-party domain regex URL uzerinde zaten yakaliyor)
- REGRESSION: ReferenceError/TypeError/SyntaxError/Unexpected token/Unexpected end of input/is not defined/Cannot read propert/Cannot read properties of (null|undefined)/is not a function
- networkidle catch sadece `/Timeout|timeout/` pattern (diger rejection throw)

**Fingerprint kanit:** `shared.js` sonuna gecici `window.__k032FingerprintMissingFn_zzz()` enjekte edildi → TypeError yakalandi (2 light+dark profil test FAIL) → restore, git diff bos. Sentry dev env SDK hatayi yakalayip alert gonderdi. Ders: gelecekte reprodüksiyon icin `page.evaluate(() => { throw new Error(...) })` ile izole et, prod dosyalarina dokunma.

**K034 gate:**
- Spec: Codex (dosya iskeleti + filter listesi + dark mode addInitScript approach + faz 2 data structure hazirligi)
- Implement: Claude (106 satir, 3 helper fn + 2 describe)
- Review 1: FAIL — (1) SyntaxError pattern eksik, (2) networkidle catch genis, (3) filter over-permissive. 3 fix uygulandi.
- Review 2: PASS.

**Faz 2 — Backlog:** HT_TEST_EMAIL/PASS env var ayarlanminca (`auth.setup.js` hazir), RUNTIME_PAGES array `requiresAuth`/`hashes`/`expectedRedirect` alanlariyla extend. Her panel hash per test.

**Test sayisi:** 910 → 926 (+16).

**Siradaki adim:** Tuna onayi → git commit + push. Onay sonrasi CURRENT-STATE + karar-defteri zaten guncel, session 78 kapanis.

---

## 2026-04-17 — Gundem feed headline wrap fix pass 2

Tuna UAT: uzun baslik ("Peoplein Insan Kaynaklari Yetenek Avini HelloTalent Araciligi ile Yapiyor") gb-card--gundem frame'ini asiyor, alt satira dusmuyordu. Pass 1'de `.gb-item__headline` overflow-wrap:anywhere + `.gb-item` min-width:0 eklenmisti ama yetmedi.

Kok neden: `.gb-spine` intermediate container (grid 1fr cell > .gb-gundem > .gb-spine > .gb-item) min-width:0 yoktu. Grid 1fr cell'in min-content contribution algoritmasi headline tek-satir genisligini min-content kabul ederek cell'i genisletiyordu → wrap yerine parent overflow.

Fix: `.gb-spine` min-width:0 + `.gb-item__headline` max-width:min(640px,100%) explicit cap (media ile align editorial feed gorunumu). Cache-bust 20260417b → 20260417c.

---

## YENI SESSION DEVAM NOKTASI (17 Nisan gunduz kapanis)

**Son iki commit:**
- `5729add` — Markalar vermillion/navy strip inversion (Tuna onayladi: "cok guzel duruyor")
- `eaba102` — Gundem headline wrap pass2 (.gb-spine min-width:0 + headline max-width min(640px,100%))

**Aktif UAT beklenen:** Yok — iki fix de Tuna tarafindan konfirme edildi veya gorsel yerlesti.

**Siradaki onerilen isler (Tuna sececek):**
1. `docs/CURRENT-STATE.md` Acik Backlog → K032 Runtime Playwright smoke suite (vault karar defterinde)
2. Kim Bakti backend PVT-1..6 sprint (K031 vault)
3. Markalar grid kart hover glow effect dark mode visual confirm (kullanici ister)
4. Wizard hiring_boost drop sonrasi admin tooling smoke test

**Yeni memory kayidi (17 Nisan):** `feedback_strip_color_inversion.md` — vermillion+navy adjacent strip invert pattern onaylandi, gelecek panel redesign'da oner.

**Hatirlatma:** K034 two-person zorunlu — hotfix dahil her commit Codex review'dan gecsin. K033 implementation modeli Opus 4.7. Ana model `opus-4-7`, subagent default `sonnet`.

---

## 2026-04-17 — Markalar followed strip vermillion + filter strip navy

Tuna UAT iki goruntulu istek:
1. Takip Ettiklerin strip card bg → vermillion (sicak takip kimligi). "TAKIP ETTIKLERIN N", "HEPSINI GOR", chip name beyaz. Logo chip'leri beyaz bg korundu (marka logolari orijinal renkleri kalsin diye). Hover'da chip border beyaz + translateY(-2px) lift.
2. Marka ara filter card bg → navy (employer-tema soguk kesfet). Search input transparent + beyaz border (focus'ta solid beyaz). Placeholder + icon beyaz-translucent. Segment items rgba(.6) → hover .9 → active solid beyaz, active underline vermillion (followed strip ile renk dialogu).

Codex pass1 fix: HIGH dark mode token regression (--editorial-vermillion + --navy dark'ta lighter shade'e kayiyor) → literal #C94E28 ve #1E2D5E pin (light + dark identical). MEDIUM contrast: count opacity 0.85 kaldirildi (3.72:1 fail), HEPSINI GOR hover opacity:0.75 → text-decoration:underline (3.24:1 fail). LOW: search-wrap border alpha .25 → .4, focus-within box-shadow ring eklendi (input focus-visible kaybolmustu), active underline 2px → 3px (vermillion navy uzerinde 2.9:1 marjinal — ek pen kalinligi).

Cache-bust: sirketler.css 20260417h → 20260417j (i → j Codex pass1 fix). Tek dosya CSS degisikligi, JS/HTML structural change yok. Logo chip beyaz bg + brand SVG/img content okunaklilik korundu.

---

## 2026-04-17 — Markalar hover glow line + follow btn radius fix

Card hover bg-flood (vermillion fill + on-vermillion text) yan yana ayni renk kartlarda kotu efekt yaratiyordu. Yerine donen glow border:
- @property --sk-glow-angle (CSS Houdini animatable angle)
- ::after pseudo conic-gradient masked to 1.5px ring
- Hover'da rotate animation 2.4s linear infinite
- Light: vermillion glow, Dark: rgba(255,255,255,0.92) beyaz
- Subtle translateY(-2px) + box-shadow lift
- Reduced-motion: glow visible, rotation off, no transform

Follow btn radius 999px → 10px (Tuna: hap kenarli olmus, standart kose istedi).

---

## 2026-04-17 — Markalar follow btn minimal pill (sag ust kose)

Tuna UAT: kart icindeki full-width "TAKIP ET / TAKIP EDIYORSUN ✓" butonu cok yer kapliyordu. Minimal pill: kart sag ust kosesinde absolute, person SVG icon + Türkçe label ("Takip Et" / "Takipte"). State 2:
- Default: hairline border + ink (transparent fill)
- Following: solid vermillion + on-vermillion text
- Card hover'da pill auto-invert (mevcut card-hover rule, takip ediyorsun outline preserved).

JS: _buildBrandCard pill structure (innerHTML SVG sabit + label span). _updateAllFollowBtns sadece label span guncelliyor, SVG korunur.

---

## 2026-04-17 — Bildirimler hero refresh fix (Codex pass)

Codex HIGH bulgusu: loadUnreadCount RPC complete sonrasi 'duyuru' tab aktif iken hero stale kaliyordu. Fix: sessionStorage check + _htUpdateBildirimHeroForMode('duyuru') re-render. LOW: dead [data-duyuru-badge] selector temizlendi.

---

## 2026-04-17 — Bildirimler segment sadelesme (Tuna A — hero tek otorite)

Toggle yanindaki sayaclar (`data-bildirim-count`, `data-duyuru-badge`) DOM'dan kaldirildi. Hero meta strip aktif moda gore degisir:
- mode='bildirim' → mevcut updateNotifPanelBadge (notif metrics)
- mode='duyuru'   → ht_announcements unread (window._htDuyuruUnreadCount) + son 7 gun count + last published_at

activateTab() updateHeroForMode(key) cagiriyor. User explicit click + isUserAction durumunda unread reset → hero refresh. Tek sayac otorite, double-counting karisikligi kalkti.

---

## 2026-04-17 — UAT mini fixes (title overflow safety + bold→semibold + mk-card hover + cache regex)

3 paralel UAT note + bir suspect fix:
- gb-item min-width:0 + max-width:100% — title parent grid context'inde shrink etsin (CSS overflow-wrap zaten vardi ama parent shrink olmuyordu).
- pp-exp__role + pp-ident__name 700 → 600 (Tuna: bold okunabilirliği zorluyor, semibold).
- mk-card:hover dark mode vermillion border → editorial-hairline-strong (Tuna 'inner card' algisi).
- 4 stale cache-bust assertion regex'e cevrildi.

Bekleyen büyük iş: bildirimler segment toggle sayacı semantik (1 kim, hangi feed) — Tuna spec istiyor, ekip işi olarak ayrı sprint.

---

## 2026-04-17 — Gundem feed fixes Codex review pass (deep link + edge + grant)

Codex pass review: HIGH (deep link), MEDIUM (pinned_until equality), MEDIUM (test regex dead), LOW (gereksiz grant). Hepsi uygulandi. 480/480 yesil.

---

## 2026-04-17 — Gundem feed fixes (title overflow + 10-post limit + 60d auto-archive)

Tuna UAT 3 madde:
1. Title frame'den tasiyordu — `.gb-item__headline` overflow-wrap/word-break/hyphens eklendi.
2. Feed 5 → 10 post, fazlasi icin "Daha fazla goster" vermillion outline pill → bildirimler panel. PAGE_SIZE + 1 fetch ile hasMore detection (no count query).
3. 60 gun otomatik arsiv — yeni migration 20260417110000 `archive_stale_announcements()` pg_cron daily 01:15 UTC. Pinned duyurular arsivlenmez. is_active=false → feed'den duser, admin liste korunur.

---

## 2026-04-17 — Hotfix: Profil Merkezi hero card dark mode kayboldu

Tuna UAT: mk-card--hero dark mode'da bg/border null olmus (K068 drop karari simdi erozyon). Fix: transparent yerine `--editorial-card` + `--editorial-hairline-strong` ile goruntulenir frame. 2 test assertion regex'e cevrildi (stale cache-bust beklentisi).

---

## 2026-04-17 — FAZ D retry race fix (publish_at sync on closure)

Codex pass 2 FAIL: media-error retry path `existingRow.published_at` closure stale → ikinci Yayinla orijinal publish moment'ini ezer. Fix: UPDATE sonrasi `upd.data.published_at` ile closure sync. Retry artik published_at'i tekrar set etmez.

---

## 2026-04-17 — FAZ D Codex review fixes (idempotent CHECK + candidate SELECT policy + publish_at)

**Durum:** Codex 2 valid FAIL + 1 Medium. Hepsi uygulandi:
- Migration CHECK constraint DO block ile idempotent rerun-safe.
- Candidate storage SELECT policy eklendi (ht_ann_storage_candidate_read) — private cvs bucket'ta announcements/ prefix'i icin signStorageUrls calisir.
- Admin draft → publish update'te published_at set edilir (sadece ilk publish).

Defansif: audience filter (public design), behavioral tests (K032 backlog).

---

## 2026-04-17 — Firsatlar FAZ D (admin publish via duyuru composer + dual-source panel)

**Durum:** Admin artik kendi firsatlarini mevcut duyuru composer'indan yayinlayabiliyor, ayri wizard yok. `ht_announcements` tablosuna `campaign_type` kolonu (nullable, 4 allowed value). Null = sadece duyuru, set = hem duyuru feed'de hem panel-firsatlar'da gorunur.

**Degisenler:**
- Migration 20260417100000: campaign_type column + CHECK + partial index + get_firsat_announcements RPC + get_announcements_feed RPC signature update (campaign_type return).
- admin-announcements.js: CAMPAIGN_TYPES dropdown ("Firsat Tipi" field), composer save payload campaign_type dahil, preview campaign_type ile guncel.
- profil-firsatlar.js: Dual-source Promise.all (campaigns + get_firsat_announcements RPC). normalizeAnnouncement() ht_announcements row'unu card shape'ine cevirir. Media private bucket → HT.signStorageUrls. Admin-authored card source='announcement' → company navigation skip.
- Tests: 480/480 yesil (9 yeni K034 FAZ D assertion).

**Sirada:** Migration 20260417100000 + 20260416120000 Supabase dashboard'dan deploy edilmeli. Sonra admin → duyurular → yeni duyuru → Firsat Tipi seç → Yayinla. Aday tarafinda hem gundem feed'de hem panel-firsatlar'da goruntulenir.

---

## 2026-04-17 — Firsatlar UAT hotfix cleanup (dead CSS + stale comment)

**Durum:** Codex review 2 valid minor: `.frs-card__demo-badge` dead CSS silindi, header yorum guncellendi.

---

## 2026-04-17 — Firsatlar UAT hotfix (demo fallback + error state kaldirildi)

**Durum:** Tuna canli UAT geribildirim uygulandi.
- Firsat yoksa fake kart gosterme: DEMO_CAMPAIGNS + isDemoMode silindi.
- Error state çirkin (dark mode button contrast bozuk) + kullaniciya hata göstermeye gerek yok: buildError silindi, error durumunda sessizce empty state rendering (console.warn log).
- Rail cell "Kampanyalari gor" → "Firsatlari gor" (panel ismiyle tutarli).
- Bonus fix: PG enum cast race (.in partial migration deploy'da crash atiyordu) — client-side filter (filterAllowed) kullaniliyor. Migration deploy durumundan bagimsiz guvenli.

**Sirada:** Migration `20260416120000_firsatlar_campaign_types.sql` Supabase dashboard'a deploy edilmeli. Sonra admin → kampanyalar wizard'da 4 tip secilebilir + aday panelinde real veri gorunur. Migration deploy ayri manual adim.

---

## 2026-04-16 — Firsatlar FAZ B + C (editorial rewrite + enum extension)

**Durum:** FAZ B + C tamamlandi (commit'ler c0a22e6 + 2085bd3 + stale header fix, Codex 4 gate: hepsi PASS).
- FAZ B: profil-firsatlar.js editorial rewrite (.frs-* namespace), premium gate kaldirildi, css/panels/firsatlar.css yeni dosya. campaigns RPC ile gercek veri, demo fallback.
- FAZ C: campaign_type enum genisletmesi (store_opening + brand_story) via migration 20260416120000, ik-kampanya.js wizard 4 kart (hiring_boost kaldirildi, emoji icon temizlendi), admin-campaigns.js typeMap genisledi.
- Tests: 468/468 yesil (13 yeni K034 FAZ B + C assertion).

**Sirada:** Manuel Tuna UAT. hiring_boost canli veri admin listesinde label ile gorunur (backward compat). Migration deploy: `npm run db:push` sonrasinda yeni enum value'lar canli olur — ondan once Supabase dashboard'dan migration'i onayla.

---

## 2026-04-16 — Teklifler → Firsatlar FAZ A (rename + routing)

**Durum:** FAZ A rename tamamlandi (commit afd0b75 + Codex review fix commit). `profil-teklifler.js` → `profil-firsatlar.js`, panel id + data-panel + nav + badge + root + count-badge hepsi firsatlar prefix. UI labels "Teklifler"/"Ozel Teklifler" → "Firsatlar". Backward-compat alias switchPanel + popstate + hash restore (eski #teklifler bookmark'lar calisir). Genel Bakis rail dead link fix (switchPanel('firsatlar')). Notif routing 'kampanya'/'teklif'/'is_teklifi' → firsatlar.

**DB enum dokunulmadi:** 'mesajlar_teklifler' destek kategorisi enum intact; UI_CATEGORIES.teklifler key korunur label 'Firsatlar'. Ayri migration backlog (FAZ A disi scope).

**Codex K034 review:** 3 FAIL (kampanya notif routing, Premium context tutarsizligi, hash bookmark alias) ikinci commit'te kapandi. 455/455 p3.regression yesil.

**Sirada:** FAZ B spec — profil-firsatlar.js tam rewrite (editorial design, premium gate removal, campaigns RPC wiring, store_opening/brand_story kart tipleri). FAZ C icerik zenginlestirme (discount/event types, admin composer polish) — ayri sprint.

---

## Session 76 kapanis ozeti (2026-04-15 gece → 16 Nisan)

**Aktif is:** K067-K071c editorial + dark mode + inbox + audit fixes TAMAM. 30+ commit push edildi. Test 910/0 yesil. HTML tag guard + regression aktif (K068b hotfix sonrasi).

**Sabah devam noktasi:** Kim Bakti backend PVT-1..6 sprint (vault karar defterinde K031) veya K032 runtime Playwright smoke suite (auth gate bypass + pageerror listener). Ikisi de defer'di, sprint acilinca ilk is.

**Acik risk:** Yok — bilinen bug yok, son push 7994862 stable.

**Tuna icin:** https://hellotalent.ai/profil.html hard refresh → Ayarlar Gorunum Koyu ile tum panelleri gez. Inbox LinkedIn tarzi viewport-lock, mesaj bubble'lar navy/vermillion, scrollbar vermillion. Premium paneli editorial 2-col grid. Ayarlar 6 section + tri-state tema. Dashboard link'leri duzgun routing yapiyor.

---

## K071 + K071c — Dashboard link audit + inbox display regression (2026-04-15 gece)

**K071 fix'leri (commit b7422dd):**
1. `header-kimbakti` double-binding temizlendi. profil-events.js + profil-inbox.js her ikisi bind ediyordu. Kaldirildi, sonra K071b'de `__htKbBound` idempotent flag ile belt-and-suspenders ikisine de koyuldu (biri once gelirse flag set, digeri skip).
2. Bildirim drawer `'studio'` dead panel name duzeltildi. Routing table: `{koc:mulakat, is_teklifi:teklifler, teklif:teklifler, mesaj:inbox, message:inbox}`, default `bildirimler`.
3. Mesaj drawer preview `m.id` kaybediyordu. `window._htPendingInboxThreadId` closure + `_htLoadInbox()` tail auto-open.
4. Notif fallback `teklifler` → `bildirimler`.

**K071c CRITICAL (commit 7994862):**
- Bug: K070 `#panel-inbox { display:flex }` unconditional `.panel { display:none }` / `.panel.active { display:block }` toggle sistemini override etmisti. Panel-inbox her zaman visible, `calc(100vh - header)` kapladigindan ust panelleri gizliyordu. Her header icon tiklamasi hedef panele route ediyordu ama ustune panel-inbox cikiyor → kullanici "mesajlara atiyor" algisi.
- Fix: display:flex + height + overflow sadece `#panel-inbox.active` iken. `!important` eklendi.
- Cache-bust `inbox.css?v=20260415k071c`, `profil-inbox.js?v=20260415k071c`.

---

## K070 — Inbox viewport-locked 2-pane (2026-04-15)

**Durum:** LinkedIn tarzi — sayfa scroll etmiyor, her pane icerde scroll ediyor.

- `#panel-inbox` `height:calc(100vh - var(--header-h,64px))`, flex column, overflow hidden.
- Hero kompakt flat editorial strip (bg/border kaldirildi, padding kisaltildi, headline 26-32px).
- `.ib-split` flex:1, overflow hidden, 280-340px fixed list + 1fr thread.
- `.ib-list` overflow-y:auto (ince 6px custom scrollbar hairline renk).
- `.ib-thread-body` overflow-y:auto + inner composer flex-none sticky bottom.
- Row padding 18->14px (daha cok satir sigiyor).
- Signature block gizlendi (viewport-locked'da yer yok).
- Mobile (<=900px): geri duz akis, her pane max-height:50-60vh, sayfa scroll eder.
- Regression: height:calc(100vh, split overflow:hidden, list/thread-body overflow-y:auto, hero transparent bg guard eklendi.

Cache-bust `20260415k070`. 910/0 yesil.

---

## K069 — Premium paneli editorial redesign (2026-04-15)

**Durum:** CSS-only panel file + DOM emitter rewrite. Bento → editorial 2-col symmetric. Token-based, dark mode zero-config.

- `css/panels/premium.css` (yeni, ~360 satir) — .prem-* namespace. Hero (Bricolage vermillion 56px + mono kicker + muted subline + hairline), beta-strip (left-border vermillion accent + mono UPPERCASE label), section head (01 num + Bricolage title + muted desc + hairline), feature grid (2-col symmetric, cream+hairline cards, icon 40px hairline box, mono italic "UCRETSIZ · 3 AY" kicker, Bricolage 20px title, muted desc), plan grid (paid mode, 3-col, vermillion highlight center, DM Mono 44px price, 44px CTA parity, badge top-offset on card edge), active banner (vermillion dot + Bricolage title + mono meta), status card.
- `profil-premium.js` — `injectCSS()` no-op K069 marker. `render()` yeniden yazildi: eski `.pm-bento` + `.g-hero` gradient emit kaldirildi, `.prem-*` editorial DOM yayinliyor. `checkCurrentPremium()` helper .prem-active__* vocab'a cekildi. `showPurchaseStatus()` inline style temizlendi. Hardcoded FEATURES + PLANS + RPC contract + MVP_FREE_TIER sabitleri korundu.
- `profil.html` — premium.css `?v=20260415k069` linklendi (ayarlar.css'den sonra). profil-premium.js cache-bust `20260415k069`.
- Regression suite → K069 describe block (5 test × 2 project = 10 assertion) + 1 eski Premium entitlement guard K069 text'ine adapte edildi.

Test: 908/0 yesil.

---

## K068b — Dark mode 2. tur (2026-04-15)

**Durum:** 4 ek darkmode geribildirimi verildi, hepsi uygulandi.

- `.header-msg` / `.header-notif` / `#header-kimbakti` dark background transparent (onceden rgba-white frame veriyordu).
- `.chip.selected` / `.check-item.checked` dark → `--editorial-vermillion` solid fill + beyaz text (eskiden `--accent-soft` transparent outline idi).
- `.mk-card--hero` dark → border+bg drop (merkezi hero frame-less kaldi, cunku dark `--editorial-bg` vs `--border-subtle` kontrasti cok yuksekti).
- `profil-locations.js` inline renkler `--editorial-ink` / `--editorial-ink-muted` / `--editorial-card-elev` token'larina cekildi (seçilen lokasyon text readable).

Cache-bust `20260415k068b`. 874/0 yesil.

---

## K068 — Dark mode feedback loop (2026-04-15)

**Durum:** Tuna sabah 6 darkmode geribildirimi verdi. Hepsi tek commit ile uygulandi.

### Fixler
- **wizard-editorial.css**: dark mode block — `--wz-*` token remap (hairline/cream/navy/muted → `--editorial-*`). Targeted hex override: wiz-setting-card bg, wz-card bg, step inputs color/border, ms-input-wrap border, ms-search text, ms-selected-title/pill colors, success modal (#modal-success) full dark (bg/border/title/desc/btn/icon stroke), wiz-step-desc border + colors.
- **profil-extras.css**: 
  1. `#exp-cards-container > .ht-card` dark rule flatten — transparent/no-bg/no-border (sadece hairline divider), Kariyer step Diller step gibi frame-less gorunuyor.
  2. pp-drawer (profil onizleme) tam dark block — pp-drawer bg, pp-body bg/color, pp-rule hairline, pp-label muted, pp-identity text, pp-bio__quote color+border, pp-experience/edu/prefs text, pp-cv__row card bg+border, chev/sub muted.
- **layout.css**: header popup dark unified — .header-popup-body, .header-popup-seg, seg buttons, seg active ::after, duyuru-title/body/chip, popup-icon, popup-link, popup-time. Avatar dropdown zaten dark idi.
- Cache-bust `20260415k068` (layout.css + wizard-editorial.css + profil-extras.css).

### Test
- 874/0 yesil. 4 stale cache-bust guard guncellendi.

### Açık riskler
- Live visual verify Tuna'nin hard refresh'ine bagli.
- Wizard exp-cards "frame kalkmasi" fix dark mode'a ozel — light mode zaten dogruydu.

---

## Sabah raporu — 2026-04-15 (K067-NightAudit)

**TL;DR:** Dark mode candidate profil panelleri icin calisti. 8 panel + tokens.css tokenize edildi. Kimbakti'deki asil bug (Layer 1 primitive var'lardan dark mode bypass) bulundu ve kapatildi. Live'da dogrulandi. 874/0 yesil.

### Yapilan is
- `css/tokens.css`: editorial palette tokens eklendi (light + dark). `--editorial-bg/card/card-elev/hairline/hairline-strong/ink/ink-strong/ink-muted/vermillion/vermillion-soft/vermillion-deep/on-vermillion/shadow/shadow-md`. Dark: deep navy #0B0F1C, card #111827, warm vermillion #E8845C (K031 avd-talent-badge precedent).
- 8 panel tokenize edildi: ayarlar, destek, inbox, bildirimler, kimbakti, genel-bakis, sirketler, merkezi. ~500+ raw hex → `var(--editorial-*)`.
- **Root cause catch:** Canli gorsel check sirasinda kimbakti sayilari hala navy cikti. Sorun: panel'ler `var(--color-navy, var(--editorial-ink))` kullaniyordu. `--color-navy` Layer 1 primitive; dark block onu override etmiyor → fallback olu. 67 primitive ref (kimbakti 34 + genel-bakis 33) → `--editorial-*` semantiklere cekildi.
- Cache-bust `20260415nd` → `20260415ne` (ikinci bump primitive fix icin). 9 test assertion lockstep guncellendi.
- NightAudit regression guard eklendi: `tokens.css` hem light hem dark bloklarinda `--editorial-bg` / `--editorial-vermillion` icermeli.
- Light mode regression check: kimbakti light mode = K060 original editorial (sifir drift).

### Commit / push
```
684ff5f  feat(tokens): editorial dark palette for candidate profile
f0a26fe  feat(ayarlar): dark mode parity — tokenize editorial palette
5d260b2  feat(destek): dark mode parity — tokenize editorial palette
cb2b3b5  feat(inbox): dark mode parity — tokenize editorial palette
e5fb624  feat(bildirimler): dark mode parity — tokenize editorial palette
d0469cc  feat(kimbakti): dark mode parity — tokenize editorial palette
90d8b14  feat(genel-bakis): dark mode parity — tokenize editorial palette
c757665  fix(sirketler): dark mode token drift cleanup
a1d50d5  fix(merkezi): dark mode token drift cleanup
1da829b  chore: bump panel cache-busts to 20260415nd
b0151f9  fix(panels): stop routing dark-mode colors through Layer 1 primitives
f8e676d  chore: bump cache-bust to 20260415ne
```
12 commit, hepsi main'e push edildi. Her commit bagimsiz; revert edilebilir.

### Test durumu
**874 / 0 yesil** (baseline + 1 yeni NightAudit guard). Her commit oncesi ve sonrasi full regression. Kimse kirilmadi.

### Gorsel dogrulama (Playwright MCP)
`/Users/peopleintk/darkaudit/` klasorunde 13 screenshot:
- `before-*.png` — live BEFORE state (old hardcoded palette, before my push):
  - `before-01-genel-dark.png`
  - `before-02-ayarlar-dark.png`
  - `before-03-destek-dark.png`
  - `before-04-sirketler-dark.png`
  - `before-05-kimbakti-dark.png`  ← burada sayilar navy olarak **okunamiyordu**
  - `before-06-inbox-dark.png`
  - `before-07-bildirimler-dark.png`
- `after-*.png` — live AFTER state (post-deploy):
  - `after-01-kimbakti-dark.png`  ← sayilar beyaz, titles beyaz, full readability
  - `after-02-ayarlar-dark.png`
  - `after-03-destek-dark.png`
  - `after-04-sirketler-dark.png`
  - `after-05-inbox-dark.png`
  - `after-06-bildirimler-dark.png`
  - `after-07-kimbakti-light.png`  ← light mode regression check (zero drift vs K060)

Playwright live check logged in session kullandi (CF Access + Supabase auth). Hard-refresh (ctrl+shift+R) yapinca Tuna aynisini gorecek.

### Acik riskler / bilincli atlananlar
1. **layout.css shell sweep yapilmadi.** Layout.css zaten 60 dark rule ile header/sidebar/popup/avatar-dropdown kapsiyor. Ek sweep yapmak K039 header test'indeki raw-hex assertion'lari kirma riski tasiyor, ve marjinal gain sagliyor. `docs/AI-COLLAB.md` backlog'a alindi.
2. **sirketler.css `.ms-*` popup dark rules** (multi-select helper) icinde 5 raw hex var. `var(--bg-surface, #1a1a2e)` gibi fallback pozisyonunda — harmless. Ileride layout sweep ile alinacak.
3. **Ayarlar panelindeki en alttaki "Çıkış yap" button** layout.css `.avd-logout` scope'unda — orasi dokunulmadi (scope disi).
4. **profil-ayarlar.js theme segment UI**: tri-state (Sistem / Aydinlik / Koyu) zaten K067 Faz C'de vardi, ayni sekilde calisiyor. Segment yeni tokenlerle daha iyi okunuyor.

### Tuna icin kontrol listesi
1. `https://hellotalent.ai/profil.html` → hard refresh (cmd+shift+R) → ayarlardan **Görünüm → Koyu** sec.
2. Kimbakti (Merkezi altinda), Sirketler, Destek, Ayarlar, Inbox, Bildirimler, Genel Bakis panellerini sirayla gezerek bak. Her sayinin, baslik textin, buttonin okunabilir oldugunu dogrula.
3. `/Users/peopleintk/darkaudit/` klasorundeki after-* goruntulerini browse et.
4. Geri light'a gec — `K060`/`K063`/`K064`/`K066`/`K067` gorsel original'le ayni mi?
5. Mobilde (390x844) ayni pass — yeni token'lar responsive breakpoint'lerde de kristal gorunmeli ama Playwright test mobile project de yesil, buyuk risk yok.
6. Eger darkta vermillion tonu (#E8845C) yumuk geldiyse, `css/tokens.css`'deki dark bloktaki `--editorial-vermillion` degerini #F06A3C'a tasi — tek satir fix.

### Onemli not — gelecek panel eklerken
Primitive var (`var(--color-navy, ...)`) KULLANMA. Dogrudan `var(--editorial-ink)` kullan. Aksi halde dark mode bypass yeniden olusur. Lint/eslint rule olarak ekleyebiliriz (backlog).

---

## K067-NightAudit — 2026-04-15 (Claude night shift)

**Goal:** Unified dark-mode parity across K031–K067 candidate profile editorial panels. Tuna asleep, executing autonomously.

### Audit findings

Token state (`css/tokens.css`):
- Existing dark block at line 133 covers `--bg-app/-surface/-elevated`, text, borders, status, sidebar. Solid foundation.
- Zero editorial-specific tokens. Cream/navy/vermillion/hairline/muted live as raw hex inside each panel CSS.

Hex histogram across `css/panels/*.css` (518 hex literals total):
- 110× `#6B6A66` muted text
- 107× `#C94E28` vermillion
- 103× `#1E2D5E` navy ink
- 102× `#E5E3DF` hairline
-  45× `#F7F6F4` cream surface
-  40× white family (`#FFFFFF`/`#ffffff`/`#fff`)
-   ~20× elev/hover/disabled (`#F0EEE8`, `#EEECE8`, `#F1EFEA`)
-   ~10× vermillion deep (`#A83F1E`, `#b3411f`, `#B44524`, `#b84420`)

Panel-by-panel:
- `ayarlar.css` (1047 lines, 129 hex) — K067, **zero** dark rules. Highest priority.
- `destek.css` (886, 103 hex) — K066, zero dark rules.
- `inbox.css` (539, 62 hex) — K063, zero dark rules.
- `bildirimler.css` (394, 51 hex) — K064, zero dark rules.
- `kimbakti.css` (497, 59 hex) — K060, zero dark rules.
- `genel-bakis.css` (505, 18 hex) — zero dark rules.
- `sirketler.css` (586, 83 hex) — partial: 9 `data-theme="dark"` rules, drift vs new tokens.
- `merkezi.css` (754, 13 hex) — partial: 6 dark rules, mostly tokenized already.
- `layout.css` (1023, 60 dark rules) — shell (header/sidebar/avatar-dropdown/popups). Needs sweep for token alignment.
- `components.css` — 2 dark rules. Negligible.

### Strategy
1. Add `--editorial-*` semantic token set in `tokens.css` (light + dark) — DONE this commit.
2. Per panel: bulk replace_all the 5 unambiguous editorial colors → `var(--editorial-*)`. Manual for whites + vermillion-deep variants.
3. No new `html[data-theme="dark"]` rules in panel files. Tokens cascade.
4. Shell sweep on `layout.css`: align hardcoded `#0B1120`/`#1F2937` with editorial set where it makes sense.
5. Visual verification via Playwright on profil.html (logged-out CSS still renders).
6. Test gate: `npx playwright test tests/p3.regression.spec.js` after each commit.

### Root cause found mid-execution (2026-04-15)
Live visual inspection revealed kimbakti numeric counters + genel-bakis
titles still rendered navy `#1E2D5E` in dark even after tokenization.
Root cause: many rules used `var(--color-navy, var(--editorial-ink))`
where `--color-navy` is a Layer 1 primitive and never overridden in the
dark block, so the editorial fallback never kicked in. Fix: replace all
primitive var refs (`--color-navy`, `--color-vermillion`, `--color-cream`)
in panels with `--editorial-*` semantic tokens. 34 refs fixed in kimbakti,
33 in genel-bakis. Follow-up commit after all panel tokenize commits.

### Progress log
- [x] tokens.css editorial set + NightAudit guard test (commit 684ff5f)
- [x] ayarlar.css tokenize (~140 hex → var(--editorial-*)), 874/0
- [x] destek.css tokenize (~106 hex), 874/0
- [x] inbox.css tokenize (~64 hex), 874/0
- [x] bildirimler.css tokenize (~54 hex), 874/0
- [x] kimbakti.css tokenize (~62 hex), 874/0
- [x] genel-bakis.css tokenize (~18 hex), 874/0
- [x] sirketler.css tokenize (~78 hex), 874/0. Note: K037 hover state uses --editorial-on-vermillion for white-on-flood text (logos + hover labels stay white in dark too — intentional). 5 hex remain inside .ms-* dark rules as var() fallbacks; harmless, will revisit during shell sweep.
- [x] merkezi.css drift fix — editorial palette, toggle slider tokenized, dark block keeps semantic tokens. 874/0
- [x] primitive-var follow-up (kimbakti 34 refs + genel-bakis 33 refs) — unblocks dark mode for elements that used to bypass semantic layer. 874/0
- [x] cache-bust bumps 20260415nd → 20260415ne so browsers pull fresh panel CSS on hard refresh.
- [ ] layout.css shell sweep — SKIPPED. Layout.css already ships 60 dark rules covering header/sidebar/popups/avatar-dropdown. Further sweep risks breaking asserted raw-hex in `.header` rule (K039 test) and yields marginal value. Flagged for a future pass.

### Commit plan
1. `feat(tokens): editorial dark palette for candidate profile` (this)
2. `feat(ayarlar): dark mode parity — tokenize editorial palette`
3. `feat(destek): ...`
4. `feat(inbox): ...`
5. `feat(bildirimler): ...`
6. `feat(kimbakti): ...`
7. `feat(genel-bakis): ...`
8. `fix(sirketler): dark mode token drift cleanup`
9. `fix(merkezi): dark mode token drift cleanup`
10. `fix(layout): dark mode token sweep`

Push after each. WIP commits if anything blocks.



> Bu dosya yalnizca aktif is, son kararlar, acik riskler ve bir sonraki net adimi tasir.
> Kapanmis asamalar: `docs/ai-collab/AI-COLLAB-archive-asama1-61.md`
> Dosya buyudugunde (500+ satir) yeni arsiv dosyasina tasinir.


## Mevcut Durum

**Aktif is:** K038 Faz 1 — Admin brand/company CRUD migration deployed. Faz 2 sıra (image editor).
**Faz 1 durum:** Migration applied, 6 RPC + bucket + policies canlı.
**Faz 2 durum:** Cropper.js vendor + image editor component + demo, 790/0.
**K066 Faz A durum:** Destek paneli CSS-only editorial override (destek.css 886 satır, injectCSS no-op, JS template dokunulmadı). 860/0.
**K067 durum:** Ayarlar paneli editorial rewrite — 6 section stack (Hesap / Güvenlik / Gizlilik / Bildirim / Görünüm / Hesap Yönetimi), .ayr-* namespace, scroll-spy TOC, tri-state tema (Sistem varsayılan, prefers-color-scheme), profil-ayarlar.js yeni IIFE (scroll-spy + theme segment). 50+ kritik id korundu. 872/0.

**Faz 3 durum:** admin Markalar paneli + drawer canlı, 798/0.
**K038 TAMAM** (admin brand CRUD + image editor canlı).
**K039 durum:** Header Variant C inline segment redesign. Editorial flat masthead, mono UPPERCASE nav (GENEL · PROFİL · KEŞFET), text actions (GÖZ MS BL), no SVG icons. Tüm ID'ler ve popup'lar korundu. 814/0 yeşil. DeepSeek APPROVE.
**Sonraki:** Tuna smoke. Onceki:
**Sonraki:** push main + Tuna smoke
**Son commit:** (pending) feat(sirketler): K037 Variant E color flood hover + logo/search hotfix
**DeepSeek:** APPROVE

## 2026-04-14 — K037 Sirketler Variant E color flood hover (exec)

- `.sk-brand` cards: hover/focus-within/focus-visible → background `--sk-brand-accent` flood, text beyaz, logo bg beyaz + img `brightness(0) invert(1)`, initial fallback marka rengine döner, follow btn beyaz outline, is-following btn vermillion fill + 1px inset beyaz outline, top-edge 1px vermillion hairline ::before fade-in, ÖNE ÇIKAN caption beyaza döner. Transition 260ms ease-out. `prefers-reduced-motion` kapatır. `:focus-visible` 2px vermillion outline ring. Card `tabindex=0`.
- `profil-markalar.js`: `BRAND_ACCENT_COLORS` seed ~30 TR retail marka → hex map (Option B ship). `getBrandAccentColor()` case-insensitive match → HSL hash fallback `hsl(hash%360, 35%, 25%)` deterministic muted dark. `window._htGetBrandAccentColor` export eklendi. `_buildBrandCard` kart element'ine `style.setProperty('--sk-brand-accent', ...)` yazıyor.
- **Hotfix 1**: `.sk-followed__chip-logo img` `object-fit: cover` → `contain` + `max-width/height 72%` (logo crop bug fix — Gucci/Cartier/Beymen taşıyordu).
- **Hotfix 2**: `.sk-filter__search` `-webkit-appearance: none` + `::-webkit-search-*` decoration kill (Safari native search pill double-border bug fix).
- `profil.html` cache-bust i→j (sirketler.css, profil-markalar.js).
- `tests/p3.regression.spec.js` K037 describe (5 test × 2 project = 10 assertion).

**Test:** **784 passed / 0 failed** (774 + 10 K037). node --check OK.
**DeepSeek:** APPROVE.

**Riskler:** Multi-color logolar `brightness(0) invert(1)` ile düzleşebilir → per-brand `mix-blend-mode: difference` fallback backlog. Brand color mapping JS map; uzun vadede `brands.accent_color` DB kolonu (Option A) backlog.

## 2026-04-14 — K036 Sirketler editorial redesign (exec)

## 2026-04-14 — K036 Sirketler editorial redesign (exec)

- `css/panels/sirketler.css` full rewrite, `.sk-*` namespace. Legacy `.flip-*`/`.bc2-*`/`.brand-card-v2` tamamen silindi. Cards: hero / followed strip / filter / grid / why / signature. Popup + `.ms-*` location helper'ları korundu (`.brand-logo-wrap` popup için minimal restyle).
- `profil.html` `#panel-sirketler` markup yeni K036 yapisi. Popup overlay korundu. ID kontratlari: brand-search, segment-pills, brand-grid, brand-follows-popup-* preserved. Yeni ID'ler: sk-followed-count/2, sk-total-count, sk-followed-card/all/row.
- `profil-markalar.js` render katmani rewrite (`_buildBrandCard` + `renderFollowedStrip`). **Tum `window._ht*` exports korundu** (loadSirketlerPanel, toggleBrandFollow, open/closeBrandFollowsPopup, updateMarkalaBgDots, _htBrandLogoError, _htBrandFollowReady, _htGetGenelBrandTeaser). companies join eklendi (two-stage query, `company_name` kolonu, fallback warn). `updateMarkalaBgDots` safe no-op (legacy .bg-markalar yok). `_htGetGenelBrandTeaser` shape DEGISMEDI → Genel Bakis rail kirilmadi.
- **Margin bug fix**: `css/panels/genel-bakis.css` 720px override (padding 24/20) silindi → 480px breakpoint pattern (token-driven yukarida), Merkez ile birebir hizali.
- `profil.html` cache-bust h→i: sirketler.css, profil-markalar.js, genel-bakis.css.
- `tests/p3.regression.spec.js` K036 describe + 6 guard. K035 cache-bust assertion bumped.

**Test:** **774 passed / 0 failed** (762 + 12 yeni K036). node --check OK.
**DeepSeek:** APPROVE.

**Riskler:** brands.company_id FK migration yok → two-stage query. Marka sayisi buyurse +1 round-trip kabul edilebilir.

## 2026-04-14 — K035 Genel 3-card restructure + Merkez ring sync (exec)

## 2026-04-14 — K035 Genel 3-card restructure + Merkez ring sync (exec)

- `css/panels/genel-bakis.css`: outer frame `#panel-genel` transparent (border/radius kalktı). `.gb-card` base + `--hero/--gundem/--rail` modifier (cream bg, hairline border, 14px radius). `.gb-root` flex column gap 24. Hero `.gb-hero-date` full-width row + `.gb-hero-grid` 2-col internal (text sol / ring+btn sağ). Rail per-cell border kalktı, hairline divider içeride. sticky `.gb-card--rail`'a taşındı. 720px hero grid single col.
- `css/panels/merkezi.css`: `.mk-pulse__ring` 64→72px. `.mk-pulse__fill` stroke `--text-secondary` → `--color-vermillion`, dasharray 175.93→201.06, 800ms ease-out 200ms sweep, enter 600→800ms. r=32 sw=3 Genel ile birebir.
- `profil.html`: ring SVG viewBox/r/sw güncel, `id=mk-pulse-ring` korundu (profil-summary.js driver sağlam). Cache-bust g→h (genel-bakis, merkezi, profil-genel).
- `profil-genel.js`: `buildHero` 3-card layout, `buildGundem`/`buildRail` `<section/aside class="gb-card …">`. Hardcoded "Merhaba" intact. Tüm `_ht*` exports + RPC + `_HT_STUDIO_FROZEN` korundu.
- `tests/p3.regression.spec.js`: 4 yeni K035 guard (3-card CSS, gb-card JS wrap, mk-pulse r=32/sw=3, mk-pulse__fill vermillion + 201.06). Cache-bust h.
- `docs/superpowers/specs/2026-04-14-genel-bakis-mockup.html` 3-card layout için yeniden yazıldı.

**Test:** **762 passed / 0 failed** (754 + 8 yeni K035). node --check OK.
**DeepSeek:** APPROVE.

## 2026-04-14 — K034 Genel+Merkez genislik & ritim (exec)

- `css/profil-extras.css` `--editorial-max-w: 1120px` + `--editorial-pad-x: clamp(24px,5vw,48px)` token (index.html referansi). shared.css yok, profil-extras cross-cutting bucket.
- `css/panels/genel-bakis.css` (~285 satir delta): hero ritmi sikilastirildi (top 36, headline mb 12, subline mb 22), `.gb-hero-meta-right` (ring + edit btn stacked sag ust), `.gb-grid` 1fr/280px gap 48, `.gb-rail` sticky top 24 flex col, `.gb-rail-cell` (Strip vertical), `.gb-item__body/__toggle` inline expand `.is-expanded` rotate. Vermillion accent boost: bakanlar arrow, rail link arrow, item toggle arrow, premium CTA border + label + arrow. 900px col collapse, 540px stack.
- `css/panels/merkezi.css` (5 satir): `#panel-merkez` max-width + padding-x `var(--editorial-*)`. Ic ritim dokunulmadi.
- `profil-genel.js` (~189 satir delta): `buildHero` 2-row (meta-row stacked sag + text-block sol), greeting **HARDCODED `Merhaba, {firstName}`** (Gunaydin/Iyi aksamlar/Iyi geceler yok). `buildStrip` -> `buildRail`. `buildSpineItem` -> `buildGundemItem` (body_md text+`<br>` XSS-safe, data-gb-toggle), `wireGundemToggles` rAF-wired, body_md bossa toggle hide. `switchPanel('bildirimler')` gundem'den kaldirildi. Coach helpers + `_ht*` exports + `_HT_STUDIO_FROZEN` korundu.
- `profil.html` cache-bust v=20260414f -> g (genel-bakis.css, merkezi.css, profil-extras.css, profil-genel.js).
- `tests/p3.regression.spec.js` K033 -> K033/K034 describe, 13 yeni guard (`.gb-grid`/`.gb-rail`/`.gb-rail-cell`/`.gb-item__toggle`/`.gb-item.is-expanded`, `--editorial-max-w` token, `1120px`, var() referanslar her iki CSS'te, `buildRail`/`buildGundemItem`/`wireGundemToggles`, hardcoded "Merhaba", Gunaydin/Iyi aksamlar/Iyi geceler yok guard, `data-gb-toggle`, no bildirimler nav, cache-bust v=g x4).
- `docs/superpowers/specs/2026-04-14-genel-bakis-mockup.html` K034 reference olarak yeniden yazildi.

**Test:** **754 passed / 0 failed**, 3.2s. node --check OK.

**DeepSeek (working diff):** APPROVE. Editorial width unification temiz, hero ritmi tightened, inline expand wired, greeting hardcoded, K030 contract preserved, _HT_STUDIO_FROZEN intact, no console.log, no emoji, no top-level const/let/arrow, namespace clean, business logic preserved.

**Riskler:** Yok. Firsatlar rail card hala warn-only stub (K034+ backlog).

## 2026-04-14 — K033 Genel Bakis editorial redesign (exec)

- `css/panels/genel-bakis.css` 149 -> ~410 satir, full rewrite. `.gb-*` namespace: identity-row, hero (Bricolage headline + ghost edit btn), hero-ring (SVG sweep 800ms), hero-bakanlar (bottom-left hairline minimal mono row), strip (3 col grid 14px radius), strip-cell, gundem, spine (1px navy + tick circles), spine-item, item-meta/headline/excerpt/link, premium-cta (in-flow vermillion), signature. Stagger fadeUp 600ms 80ms.
- `profil-genel.js` 1451 -> ~595 satir. Legacy 3-rail layout silindi. Coach builder helpers (buildCover, buildCoachAvatar, showCoachCard) studio bridge icin korundu. IIFE, `var` only. Tum `window._ht*` exports preserved.
- `profil.html` cache-bust `?v=20260414e` -> `?v=20260414f` (genel-bakis.css + profil-genel.js).

**Wiring:** Profili Duzenle->merkez | Bakanlar->kimbakti (count: candidate_view_stats.total_views) | Markalar->sirketler (_htGetGenelBrandTeaser) | Studyo->mulakat (K030 frozen) | **Firsatlar**->STUB console.warn + "0 yeni" static (campaigns RPC yok, K034 backlog) | Gundem->`get_announcements_feed` RPC (K030 sozlesmesi) | Devamini oku->bildirimler hub | Premium CTA (item 2-3 arasi)->premium panel.

**Schema verify:** `supabase/migrations/20260413202813_ht_ann_views_focal.sql` get_announcements_feed signature (title/body_md/category/published_at) confirmed. `candidate_view_stats.total_views` reused. Hayali kolon yok.

**Riskler:** Firsatlar campaigns wiring eksik (K034 backlog, console.warn dokumante) | Bakanlar mockup "BUGUN" -> production "N kisi profilini izledi" (data total) | Gundem per-post deep link yok | `.g-hero` / `.bento-*` dead orphan rule'lar profil-extras.css/layout.css'te (silinmedi, cross-panel kullanim yok, out of scope).

**DeepSeek (working diff):** APPROVE. No console.log, no emoji, no top-level const/let/arrow, XSS textContent safe, namespace clean, panel switching preserved.

**Test:** node --check OK. Playwright **744 passed / 0 failed** (post-push hotfix: stale Asama 58 mini edu guards + K031 locked-card + gh-id-readiness/getProfileScoreHints guards K033 vocabulary'siyle degistirildi).

## 2026-04-14 — K032 Profil Onizleme drawer exec tamamlandi

- `css/profil-extras.css` `.pp-*` bloku yeniden yazildi. Legacy bento/tag/hero/contact-card/status-badge/footer tamami silindi, K032 vocabulary eklendi: `.pp-identity`, `.pp-ident__block/__top/__text/__name/__role/__status/__completion`, `.pp-pulse` (ring + pct + cap), `.pp-contact`, `.pp-bio__quote`, `.pp-clamp` + `--2`/`--3` + `.pp-toggle` (show-more pattern), `.pp-exp` spine + `.pp-exp__item` (+ `--muted` + `.is-top-gap`) + `__role`/`__meta`/`__desc`, `.pp-kv` + `__row/__k/__v`, `.pp-split` + `__h/__list`, `.pp-cv__row/__icon/__main/__name/__sub/__chev`, `.pp-sign`, `.pp-label`, `.pp-rule` hairlines. `prefers-reduced-motion` ve `@media (max-width: 480px)` full-bleed blogu eklendi. `.header-popup` responsive rule preserved (non-pp, legacy). Pp blok satir sayisi: ~262 -> ~471 (legacy sisme sinif tree cikti + yeni semantik geldi, ama duplicate classlar ve gereksiz kutu shadow'lari gitti).
- `profil-preview.js` tamamen IIFE olarak yeniden yazildi (3 fonksiyon ihracat + bolunmus builder'lar: `buildIdentity/buildBio/buildExperience/buildEduLang/buildPrefs/buildCV`). Tum kullanici verisi `createElement` + `textContent` ile basiliyor, innerHTML sadece **static SVG** icin owned elementlerde (SVG_MAIL/PHONE/DOC/CHEV/RING) kullaniliyor. Show-more toggle `wireToggles(root)` mount sonrasi `requestAnimationFrame` icinde cagirilir; clamp target `scrollHeight <= clientHeight + 2` ise `.is-hidden` ile gizlenir, tiklandiginda `.pp-clamp.is-expanded` + `.pp-toggle.is-expanded` + buton metni `Devamini oku` <-> `Daha az goster`. Bio 3-line clamp, deneyim aciklamalari 2-line clamp. Ilk 3 deneyim tam kart + tick + description, kalan deneyimler `--muted` dashed-ring. Tercihler/lokasyon emoji pill yerine `pp-kv` typographic key-value satirlari, marka tercihleri inline `Hermes · Cartier`, emoji yok. CV quiet bordered row + doc icon + chevron. `HelloTalent · Beta` DM Mono italic signature.
- `profil.html` drawer shell (#pp-overlay, #pp-drawer, .pp-header, #btn-close-preview, #pp-content, #btn-preview-profile) DOKUNULMADI. Cache-bust: `profil-preview.js?v=20260404b` -> `?v=20260414e`, `css/profil-extras.css?v=20260414d` -> `?v=20260414e`.
- `tests/p3.regression.spec.js`: yeni `K032 — Profil Onizleme drawer editorial redesign` describe block (6 test): K032 clamp/toggle/exp/kv/split/cv/sign vocabulary + rescued drawer shell; legacy bento/tag/hero/contact-card/status-badge silindi guard; preview.js data-pp-toggle + clamp + toggle wiring + scrollHeight auto-hide check; legacy pp-tag/pp-bento/pp-hero-card/pp-status-badge yok guard; drawer contract ID'leri (#pp-overlay/#pp-drawer/#pp-content/#btn-close-preview/#btn-preview-profile); cache-bust `?v=20260414e` match.
- Contract grep dogrulamasi:
  - `#pp-overlay`, `#pp-drawer`, `#pp-content`, `#btn-close-preview` -> profil.html lines 1701-1710
  - `#btn-preview-profile` -> profil.html line 500 + profil-events.js line 74 + profil-bootstrap.js line 161
  - `window.openProfilePreview` / `window.closeProfilePreview` -> profil-events.js lines 75-77 bag
- Full regression: **758 passed / 0 failed** (baseline 746 + 12 yeni K032 test = 758), 4.4s. Sifir failure.

## 2026-04-14 — K031 Profil Merkezi exec tamamlandi

- `css/panels/merkezi.css` rewritten 1659 → 566 satir (editorial: identity strip + topline pulse + 1px spine + CV zarf).
- `profil.html` `#panel-merkez` markup re-ordered (lines 453-633). Legacy bento block silindi.
- Tum korunmasi gereken ID'ler preserved:
  - `data-step="1..4"`, `mk-preview-1..4`, `mk-empty-1..4`
  - `merkez-toggle-visibility`, `merkez-toggle-active`, `merkez-hide-from-current-employer`, `merkez-hide-row`
  - `cv-upload-area`, `cv-file-input`, `cv-drop-zone`, `cv-uploaded-state`, `cv-uploaded-name`, `cv-uploaded-date`, `btn-cv-select`, `btn-cv-reupload`, `btn-cv-delete`
  - `btn-generate-cv-merkez`, `btn-ai-cv-optimize`, `btn-preview-profile`, `mk-premium-card-link`
  - `merkez-identity`, `merkez-avatar`, `merkez-name`, `merkez-role`, `merkez-company`, `merkez-city-text`, `merkez-exp-text`
  - YENI: `merkez-avatar-ring`, `mk-pulse-ring`, `mk-percent-number`, `mk-percent-caption`
- JS rebind:
  - `profil-summary.js` `updateBentoRing` artik spine `is-complete` classini yazar + 4 section ortalamasini topline `--mk-pulse-progress` + `mk-percent-number` + `mk-percent-caption` alanlarina aktarir. Per-card bar DOM kaldirildi.
  - `profil-visibility.js` `updateVisState` artik `.mk-avatar-ring.is-active` classini `merkez-toggle-visibility` state'inden toggle ediyor (Tuna decision 4 — avatar yesil working ring korundu).
  - `profil-events.js` spine click handler `.mk-card[data-step]` → `#panel-merkez [data-step]` olarak rebind edildi. `.mk-edit-btn` handler'i kaldirildi (pencil artik sirf visual).
  - `profil-cv.js` `showCVUploaded`/`showCVEmpty` yeni CV row yapisinda `cv-drop-actions` ve `cv-uploaded-actions` action cluster'larini da toggle ediyor.
- AI Optimize Et: ayri satir `.mk-zarf__row--ai`, "Beta · Ucretsiz" chip-button (Tuna decision 3).
- Stagger fadeUp 280ms + 40/80/140/220/260/320ms delays, ring fill sweep 600ms, `prefers-reduced-motion` fallback.
- Dark mode: semantic tokens carry; `html[data-theme='dark']` block'u zarf card bg + tick box-shadow + avatar bg icin targeted tweak yapiyor.
- Cache-bust: `merkezi.css?v=20260406a` → `?v=20260414b`.
- p3 regression legacy guard'lari guncellendi:
  - `.mk-card[data-step]` semantic-buttons guard → `.mk-spine__item[data-step]` guard.
  - `mk-bento-grid` presence assertion kaldirildi.
  - `mk-footer-premium` copy guard → `mk-premium-card-link` zarf row copy guard ("Beni One Cikar · 3 ay ucretsiz beta").
- NEW `K031 — Profil Merkezi editorial redesign` describe block: 7 test (CSS component classes, legacy class removal, markup structure, preserved IDs, cache-bust, JS rebind, avatar-ring class toggle).
- Full regression: **744 passed / 0 failed** (mobile + desktop, 3.4s). Hic failure yok.
- DeepSeek review: SKIPPED — `DEEPSEEK_API_KEY` env not set in this session. Parent should run if policy requires.
- Sonraki: parent push + Codex post-push gate + GH Pages visual QA.

## 2026-04-13 — K030 FAZ C Extension (views + focal)

- Migration `20260413202813_ht_ann_views_focal.sql` applied directly + history repaired.
- Adds: `ht_announcement_views`, `view_count`, `track_announcement_view()`, `focal_x/focal_y`, updated `get_announcements_feed`.
- Cache-bust bumped to `?v=20260413f` for profil.html + admin.html FAZ C assets.
- Frontend: profil-duyurular (IntersectionObserver threshold 0.5 + objectPosition), admin-announcements (view_count col + click focal dot + save payload).
- Tests: new assertions in tests/faz-c-duyurular.spec.js.
- profil-duyurular.js updated with view tracking observer + focal objectPosition.
- admin-announcements.js view_count col + click-to-focal dot + focal in insert + preview.
- css/duyurular.css: .ht-composer__focal-dot + [data-has-focal] outline styles.
- Tests: 58/58 green on mobile + desktop (FAZ A + B + C extension).
- Cache-bust: ?v=20260413f for FAZ C assets in profil.html + admin.html.

## 2026-04-13 — K030 FAZ C Post-Push CTO Verdict

**Codex subagent** ~50dk stuck kaldı (LLM wait, 14s CPU), kill edildi. CTO direkt 12 spot-check.

### Verdict: APPROVE

### 12/12 ✓
1. Migration shape — is_admin REFERENCED değil REDEFINED, 0 storage.policies block
2. CSP + CDN — cdn.jsdelivr.net allowed, marked+purify+duyurular.css yüklü
3. profil.html wiring — ?v=20260413b cache-bust
4. Bildirimler segment markup present
5. profil-duyurular.js API + DOMPurify.sanitize
6. profil-genel.js _HT_STUDIO_FROZEN branch + data-mount="duyuru-feed"
7. admin-announcements.js storage path + cleanupObjectUrls X close (hotfix 3a8ec7e)
8. admin.html Duyurular tab + dispatcher
9. profil-inbox.js bildirim-duyuru toggle + RPC
10. Tests source-only (9 fetchText, 0 loginAs)
11. css/duyurular.css 104 BEM-lite + 4 dark-mode
12. Object URL cleanup X close guard confirmed

### Outstanding (non-blocking)
- Storage policy SQL (Tuna manuel dashboard) — media upload gate
- Drifted legacy migrations (3, task #21)
- Runtime smoke: Tuna + Gemini UAT pending

### UAT sequence
1. Supabase dashboard → Storage → cvs → Policies → 3 SQL uygula
2. Admin → Duyurular → Yeni post (title+body+2 görsel+link+CTA) → Yayınla
3. Candidate → Genel Bakış feed → like → carousel
4. Bildirimler → Duyurular toggle → unread badge
5. Dark mode + mobile 390px visual

## 2026-04-13 — K030 FAZ C Subagent B (frontend + composer) tamamlandi

**Dosyalar (yeni + degisen):**
- `profil.html` (B1, B4, B7) — CDN deps, duyurular.css, profil-duyurular.js, segment markup in #panel-bildirimler
- `css/duyurular.css` (B2) — 684 satir, BEM-lite `ht-duyuru__*` + `ht-composer__*` + `ht-segment`, dark mode + mobile + reduced-motion
- `profil-duyurular.js` (B3) — 377 satir, _htLoadDuyuruFeed + _htRenderDuyuruPreviewCard, marked+DOMPurify sanitize, carousel, like debounce
- `profil-genel.js` (B4) — _HT_STUDIO_FROZEN branch in buildFeedSection + hydrateDuyuruFeed dispatcher
- `admin-announcements.js` (B5) — 498 satir, composer modal + list + storage upload `announcements/{admin}/{post}/{uuid}.ext`
- `admin.html` (B6) — Duyurular nav-item, panel-announcements main, script/style wiring, switchPanel dispatcher registration
- `profil-inbox.js` (B7) — bildirim<->duyuru segment toggle IIFE, sessionStorage, get_unread_announcement_count RPC + badge
- `tests/faz-c-duyurular.spec.js` (B8) — 7 source-content tests (mobile + desktop = 14 cases)

**Test sonucu:** 50 passed (FAZ A + B + C, mobile + desktop), 3.4s, 0 failed.

**Commit hashes (bu seri):** c376af5 B1, 65ba3ce B2, 7fe214b B3, 7d208bb B4, 9e5d009 B5, e210d8c B6, f992c96 B7, 121ff0b B8. B10 bu commit.

**Acik riskler:**
- Storage policy Supabase dashboard'da henuz uygulanmadi (Tuna TODO, Subagent A notuna gore bekleniyor). Admin composer media upload FAZ C dashboard'a policy yazilana kadar RLS blocked kalabilir — expected.
- `get_unread_announcement_count` RPC bir scalar bigint donduruyor (varsayim); RPC return tipi farkliysa badge count parse dusebilir — runtime UAT gerekli.
- Marked + DOMPurify CDN yukleme basarisizligina karsi profil-duyurular.js plain-text fallback yapar, ancak pratikte CSP script-src cdn.jsdelivr.net'e izin veriyor.
- Admin listesinde `ht_announcement_media` ile join yapmiyor — list ekraninda media thumb yok (istenmedi). Feed tarafi RPC uzerinden media ile birlikte donuyor.

**Tuna UAT / Gemini UAT beklenen adimlari:**
1. Supabase dashboard > Storage > cvs > Policies — Subagent A'nin yazdigi SQL'i uygula
2. /profil.html'de donmus studio -> Genel Bakis'a git, Duyurular feed mount oluyor mu?
3. /profil.html#bildirimler -> segment Duyurular butonuna tikla, full feed geliyor mu + badge temizleniyor mu?
4. /admin.html -> Duyurular tab -> Yeni duyuru -> markdown + image + publish (storage policy gerek)


## 2026-04-13 — K030 FAZ C Subagent A (backend migration) tamamlandi

**Dosyalar:**
- `supabase/migrations/20260413191504_ht_announcements.sql` (sha256: c26f161c92a6fb08278a257302de9bfd5a8c82bc6f65b9cf0ec2a58c60e36d72)
- `supabase/migrations/ROLLBACK_ht_announcements.sql` (emergency, not auto-applied)

**Olusan DB objeleri:**
- Tables: ht_announcements, ht_announcement_media, ht_announcement_likes (3/3 RLS=true)
- RPCs: get_announcements_feed(int,int), toggle_announcement_like(uuid), get_unread_announcement_count(timestamptz)
- Trigger fn: sync_ht_ann_like_count (AFTER INSERT/DELETE on likes)
- Policies: 8 (1 select_active + 3 admin CRUD own + 2 media + 2 likes own)
- Helpers kullanildi: is_admin() (baseline), get_my_candidate_id() (baseline) — REDEFINE YOK

**Apply yolu:** `supabase db push --linked` kuyrukta 3 drifted legacy migration (consent_log policy already exists vs.) yuzunden bloke oldu. Migration dosyasi dogrudan `supabase db query -f` ile basarili uygulandi, ardindan `migration repair --status applied 20260413191504` ile history isaretlendi. **Pre-existing drift Subagent A kapsaminda degil**, parent'a raporlandi.

**Verify (live DB):**
- pg_tables: 3/3 ht_announcement* mevcut
- pg_class.relrowsecurity: 3/3 true
- pg_proc: 4/4 fonksiyon mevcut
- pg_policies: 8/8 policy mevcut

**Storage policy TODO (Tuna — Supabase dashboard > Storage > cvs bucket > Policies):**

```sql
CREATE POLICY "ht_ann_storage_admin_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'cvs'
    AND name LIKE 'announcements/' || auth.uid()::text || '/%'
    AND is_admin()
  );

CREATE POLICY "ht_ann_storage_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'cvs'
    AND name LIKE 'announcements/' || auth.uid()::text || '/%'
    AND is_admin()
  );

CREATE POLICY "ht_ann_storage_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'cvs'
    AND name LIKE 'announcements/' || auth.uid()::text || '/%'
    AND is_admin()
  );
-- cvs bucket private: read icin signStorageUrl yetiyor, ek SELECT policy gerekmez.
```

**Sonraki net adim:** Subagent B (frontend) — profil-duyurular.js feed, admin-announcements.js composer, profil-genel.js mount, profil.html + admin.html head updates (marked + DOMPurify CDN).

**Riskler / blocker:**
- [PARENT ACTION] 3 pre-existing drifted migration (20260409131000, 20260409160000, 20260410165047) `supabase db push` icin bloke; repair veya idempotent fix gerek. Bizim scope disi.

## 2026-04-13 — K030 FAZ C Plan Review (CTO direct — Codex dispatch returned empty 3rd time)

**10 live-repo checks:**
1. db:new + db:push OK
2. get_my_candidate_id() exists in migrations (streak_foundation et al)
3. **is_admin() already exists** — docs/migrations/014:332-338 pattern: EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()). Plan's auth.jwt/hr_profiles assumption wrong — FAZ C must NOT redefine
4. signStorageUrl/signStorageUrls in shared.js:200,215
5. admin_users table exists (used in lb6_security_monitoring, zero_tech_debt, support phase)
6. Bildirimler panel is INLINE in profil.html:1198 (#panel-bildirimler has notif-tabs/notif-list/notif-empty)
7. Admin tab pattern: .nav-item[data-panel="X"] onclick="switchPanel('X',this)"
8. Coach feed mount: buildFeedSection() in profil-genel.js, add frozen else branch
9. CSP already allows cdn.jsdelivr.net — marked+DOMPurify CDN scripts work
10. coach_posts fully isolated, FAZ C creates parallel ht_announcements* tables

**Required plan edits:**
- is_admin not redefined, existing helper used
- Storage policies SQL block dropped (apply via dashboard/ad-hoc)
- marked/DOMPurify added to profil.html head
- Bildirimler toggle inline in profil.html, not separate file
- Feed mount via buildFeedSection frozen branch
- Admin tab data-panel="announcements" + switchPanel dispatcher
- Cache-bust ?v=20260413b
- Source-content tests only

**Verdict:** READY-TO-EXEC after plan edit.

## 2026-04-13 — K030 FAZ B UAT Hotfix
Tuna dashboard UAT'inde 3 bulgu:
1. "St\u00fcdyo'ya Git" butonu edu dash karti icinde hala gorunuyor (profil-genel.js:1105, ayri render site)
2. Rozet strip ("Rozetler 2/15") ve Stats 2x2 grid freeze sirasinda hala render ediliyor
3. "Ko\u00e7lardan \u00d6\u011fren" editor pick karti bos gorunuyor (buttons kaldirildi ama header duruyor)
4. Raylarda "St\u00fcdyo yakinda" info karti yok

Fix:
- `buildEduDashCard()` frozen durumda title'i "St\u00fcdyo" + ht-chip--soon olarak swap
- `hydrateEduDash()` frozen durumda RPC call atlatir, 4 ogelik yakinda teaser (M\u00fclakat demolari/Yetkinlik/Teknikler/Ma\u011faza) + hint metni render
- Ko\u00e7 feed header karti + feed container tamamen freeze guard icine alindi (gh-coach-header + gh-feed-container)
- 3 yeni CSS rule: .gh-edu-soon-list, .gh-edu-soon-row, .gh-edu-soon-title/desc/hint
- tests/faz-b-freeze.spec.js'e 3 yeni test (edu teaser, coach gate, CSS)

Test: 24/24 FAZ B spec PASS, 748/748 p3 regression PASS.
Admin HT bilgi yayinlama bolumu FAZ C kapsaminda (henuz baslamadi) — ayri explained.
**Son commit:** f4a93e6 (sub-10px fix) — 12 commit FAZ B serisi canlida
**FAZ B ozet:** 13 dosya (+591/-56), 1293/1293 regression PASS, 18/18 FAZ B test PASS
**DeepSeek:** 0 blocker (1 false positive icon mapping)
**Runtime smoke:** YOK (subagent browser yok, Gemini UAT'a birakildi)
**Spec:** docs/superpowers/specs/2026-04-13-studio-freeze-duyurular-design.md
**Plan:** docs/superpowers/plans/2026-04-13-studio-freeze-duyurular-plan.md

## 2026-04-13 — K030 FAZ B Post-Push Stage-Gate

### Verdict: APPROVE
- `bbc6f67`→`f4a93e6` sirasi, ROUND 3 onayli 12-adim FAZ B exec dizisini birebir izliyor.
- `59eb008`, push sonrasi AI-COLLAB guncellemesi; son kod degisikligi halen `f4a93e6`.
- `shared.js` freeze flag'i IIFE oncesinde tek otorite olarak tanimli.
- `profil-wizard.js` panel-mulakat icinde Yakinda mount ediyor, iki nav'i aktifliyor, breadcrumb'i degistiriyor.
- `profil-genel.js` ve `profil-studio.js`, Studio'ya donen tum CTA koprulerini ayni flag ile kapatiyor.
- `profil.html`, `admin.html`, `coach-studio.html` ve test spec'i plan override ile uyumlu.

### Spot-check results
- freeze flag in `shared.js`: ✓
- `profil-wizard.js` freeze mount: ✓
- dual nav active: ✓
- breadcrumb ternary: ✓
- `profil-genel.js` CTA gates (3 sites): ✓
- `profil-studio.js` overlay gates (3 sites): ✓
- `profil.html` wiring + chips + cache-bust: ✓
- `admin.html` disable + early return: ✓
- `coach-studio.html` redirect: ✓
- test spec source-content only: ✓

### Outstanding risks
- Runtime smoke not performed (no browser); Gemini UAT pending
- Dark mode visual not verified
- Playwright rerun burada sandbox webServer bind izni nedeniyle yapilamadi

### Go/no-go for FAZ C start
GO for FAZ C after 24h observation

### Recommended 24h observation checks
1. `profil.html#mulakat` ve `profil.html#yetkinlik`, ayni Yakinda panelini aciyor ve iki nav da aktif kaliyor mu?
2. `admin.html` Studio Modulleri inert kaliyor, `coach-studio.html` ise `profil.html#mulakat`a yonleniyor mu?

## 2026-04-13 — K030 FAZ B exec tamamlandi

### Degisen dosyalar
- `shared.js` — freeze flag `window._HT_STUDIO_FROZEN = true` (top, pre-IIFE)
- `panel-soon.js` (yeni) — `_htRenderPanelSoon(rootEl)` + 4 kart + inline SVG
- `css/panel-soon.css` (yeni) — BEM-lite, dark mode, mobile, reduced-motion
- `profil-wizard.js` — freeze mount @ `mulakat`, dual-nav active, breadcrumb `Stüdyo - Yakinda`
- `profil-genel.js` — 3 CTA gated (header practiceBtn+seeAll, card practiceBtn, openArticleInCoach panel switch removed)
- `profil-studio.js` — 3 bridge appendChild sites gated (FAZ 4C bridge, related_role bridge, general bridge); like button intact
- `profil.html` — panel-soon.css/js wire, `ht-chip--soon` on nav-mulakat + nav-yetkinlik, `?v=20260413a` on shared/profil-studio/profil-genel/profil-wizard/components.css/panel-soon
- `css/components.css` — `.ht-chip--soon` variant
- `admin.html` — studio-modules `is-disabled` + `aria-disabled` + chip + switchPanel early-return
- `coach-studio.html` — top-level redirect script to `profil.html#mulakat`
- `tests/faz-b-freeze.spec.js` (yeni) — 9 source-content testi

### Test durumu
- `npx playwright test tests/faz-b-freeze.spec.js --reporter=list` → **18/18 passed** (9 test × desktop+mobile projects), 876ms
- FAZ A source-content guard intact (FROZEN banner + stub).

### Riskler / acik noktalar
- `docs/AI-COLLAB.md` pre-existing uncommitted edit bu commit oncesinde vardi; FAZ B exec'e dokunulmadi (korundu).
- `profil-genel.js` `openArticleInCoach()` icinde `setTimeout` + `switchPanel('mulakat')` cagrisi **kaliciyen kaldirildi** (unfreeze'de de panel switch yapilmayacak). Plan'in direktifi boyleydi — unfreeze'de tekrar degerlendirilmeli.
- Runtime smoke henuz kosulmadi (source-content tests yesil, DOM render Tuna/Claude tarafindan dogrulanmali).
- `panel-soon.js` tabindex=-1 yaptigi icin cards klavye fokuslanamiyor; bu freeze donemi icin kasitli.
- Prod push yapilmadi (parent yapacak).

### Bir sonraki net adim
1. DeepSeek review (`scripts/deepseek-review.sh`).
2. Full `npx playwright test --reporter=list` regression.
3. Push `origin main` (parent yetkisiyle).

## 2026-04-13 — K030 Codex Re-Review ROUND 3 (post-wording-fixes)

### Verdict: APPROVE

### Wording fix status
- A (count 5): ✓ — `5 additional edits` yaziyor.
- B (freeze flag binding): ✓ — Tek flag, `shared.js` tanimi, alias yok.
- C (RE-5 Option A): ✓ — Option A binding acik, Option B reddedilmis.
- D (override authority): ✓ — Override authoritative, task bodies audit trail only.

### Remaining gaps (if any)
- Yok.

### Go/no-go for FAZ B execution
GO

### If GO, recommended exec sequence
1. `shared.js`e `window._HT_STUDIO_FROZEN = true;` ekleyin.
2. `profil-wizard.js:273,277-280,308` freeze mount ve dual-nav active durumunu uygulayin.
3. `profil-genel.js`te B3.6 CTA gizleme ve route duzeltmesini yapin.
4. `profil-studio.js:2235,2264,2277` appendChild cagrilarini freeze flag ile gate edin.
5. `profil.html` asset `?v=` bump ve B6/B7 test duzeltmelerini tamamlayin.

## 2026-04-13 — K030 Codex Re-Review (post-RE-1..RE-5)

### Verdict: NEEDS-CHANGES

### RE-1..RE-5 status
- RE-1 (B4 stop both loaders): ✓ — Override targets both loaders; `Task B3` below still points at `profil.html switchPanel`.
- RE-2 (B3.6 Genel coach CTAs): ✓ — Override covers header CTAs, card CTA, and `openArticleInCoach()` route.
- RE-3 (B3.7 Studio coach detail CTAs): ✓ — Override covers both overlay practice CTAs at `profil-studio.js:2232-2276`.
- RE-4 (B6/B7 fixes): ✓ — Override fixes selector and test direction; lower examples remain stale.
- RE-5 (alias UX + cache-bust): ✗ — Default Option A is not bound; cache-bust steps stay implicit.

### Remaining gaps (if any)
- Change `plan:394` from `4 additional edits` to `5 additional edits`.
- Rewrite `Task B3` to patch `profil-wizard.js:308`, not `profil.html switchPanel`.
- Add concrete `B3.6` and `B3.7` task bodies below the override.
- Rewrite `Task B6` examples to `.nav-item[data-panel="studio-modules"]`.
- Rewrite `Task B7` as source-content tests; remove `loginAs*` and `[data-tab="studio"]`.
- Bind RE-5 to Option A explicitly: activate `#nav-mulakat` and `#nav-yetkinlik`.
- Pick one freeze flag: `window._HT_STUDIO_FROZEN = true` across both files.
- Change `B1` sample `<h1>` to `<h2>` to match binding Q2.
- Add explicit `?v=` bump steps for all touched assets.

### GO / BLOCKED
BLOCKED

### Recommended FAZ B exec order (if GO)
1. N/A — blocked pending plan cleanup.

**Aktif is:** K030 FAZ A APPROVED (canli) + FAZ B plan NEEDS-CHANGES (override landed, exec blocked)
**Sonraki:** Plan cleanup (B1/B3/B6/B7 + flag/RE-5 bind) → Codex re-review → FAZ B exec
**Son commit:** 837f2bf (CODEX STAGE-GATE OVERRIDE)
**Spec:** docs/superpowers/specs/2026-04-13-studio-freeze-duyurular-design.md
**Plan:** docs/superpowers/plans/2026-04-13-studio-freeze-duyurular-plan.md

## 2026-04-13 — K030 Codex Stage-Gate Verdict (FAZ A + FAZ B plan)

### FAZ A verdict: APPROVE
- `b67dfd9`, `91398ea`, `320feb5` only touch claimed files and scopes.
- `profil-studio.js:1-15,1668-1674,4386-4388` are comment/stub-only; no in-repo `_htGenelCoachTeaser` caller found.
- `profil-wizard.js:308` is unchanged; FAZ A leaves end-user DOM/network paths untouched.
- `tests/faz-a-decouple.spec.js` exists; local run blocked by `playwright.config.js:4-9` webServer bind permission.
- `profil-studio.js:1-15,1668-1674` banners are static comments; no re-freeze guard flag or early return exists.

### FAZ B plan refinement verdict: NEEDS-CHANGES
- `REFINEMENT NOTES` refs match live repo: `profil.html`, `profil-wizard.js`, `admin.html`, `coach-studio.html`, CSS refs.
- B9 drop, B3.5 add, B5 reduce are correct against `profil.html:218-225,402-419`.
- `profil-wizard.js:308` still calls `_htLoadYetkinlik`; B4 must stop both loaders, not only Studio.
- `profil-genel.js:770-776,924-930,991-997` keeps live coach-to-Studio routes; FAZ B plan does not neutralize them.
- B6/B7 bodies stay stale: `data-tab="studio"` and missing auth helpers contradict `admin.html:356-359` and notes.

### Answers to 5 open questions
- **Q1 (mount point):** Replace/mount inside `#panel-mulakat`; `profil-wizard.js:269-270` targets that shell, so a new sibling panel is wrong.
- **Q2 (heading level):** `h2`; `profil.html` has no `<h1>`, and panel titles are sectional surfaces (`profil.html:1102,1144,1160,1224,1553`).
- **Q3 (cache-bust):** Yes; `profil.html:56-63,1671-1694` uses `?v=YYYYMMDDx` on CSS and JS tags.
- **Q4 (yetkinlik bridge):** Freeze the route, keep the bridge export; stop `_htLoadYetkinlik` at `profil-wizard.js:308`, keep `profil-yetkinlik.js:740-741`.
- **Q5 (breadcrumb label):** Change; `profil-wizard.js:273` should say `Stüdyo - Yakinda` while the panel is frozen.

### Additional gaps Claude missed (if any)
- `profil-wizard.js:277-280` activates only `data-panel="mulakat"`; `#nav-yetkinlik` never stays active after alias normalization.
- `profil-studio.js:2232-2276` detail overlay still exposes live practice CTA paths after freeze.
- `profil.html:56-63,1671-1694` versioned assets mean touched files/new assets need fresh `?v=` bumps.
- `profil-studio.js:9` says bottom-nav chip exists, but `profil.html:402-419` has no Studio bottom nav.

### Go/no-go for FAZ B execution
BLOCKED — fix B4 loader removal, Genel coach CTA paths, B6/B7 stale task bodies, and cache-bust/alias UX first.

### Required edits before FAZ B
1. Rewrite B4 around `profil-wizard.js:308` to render the soon state and remove both `_htLoadStudio` and `_htLoadYetkinlik`.
2. Add a FAZ B task for `profil-genel.js:770-776,924-930,991-997` and `profil-studio.js:2232-2276` CTA/detail freeze handling.
3. Replace B6/B7 stale examples with `admin.html:356-359` `.nav-item[data-panel="studio-modules"]` and source-content tests, not `data-tab` or missing auth helpers.
4. Define alias UX and shipping hygiene: update `profil-wizard.js:273,277-280` and bump touched/new asset `?v=` values in `profil.html`.

**Aktif is:** K030 FAZ A push edildi (5 commit, GitHub Pages canli) + FAZ B plan refined
**Sonraki:** Codex stage-gate review FAZ A → onay → FAZ B exec subagent dispatch
**Codex rapor:** FAZ A detaylari asagida — onay sonrasi FAZ B basla
**Plan refinement:** docs/superpowers/plans/2026-04-13-studio-freeze-duyurular-plan.md icine FAZ B REFINEMENT NOTES bolumu eklendi (8 kritik bulgu + final-form tokens)

## 2026-04-13 — FAZ B Plan Refinement (subagent x2)
- **Subagent #1 (code-architect, opus):** B1-B10 audit. 8 kritik bulgu:
  - switchPanel profil-wizard.js'te (B4 hedef hatali)
  - bottom nav phantom (B5 no-op)
  - #nav-yetkinlik mulakat'a alias (B3.5 yeni task)
  - B9 zaten yapildi (FAZ A FROZEN banner)
  - B5 noindex/robots zaten present (sadece redirect kaldi)
  - test helpers yok (source-content fallback)
  - admin scoped chip style gerek
  - dispatcher line 847 guard
- **Subagent #2 (code-architect, opus):** panel-soon.js + css final-form kod.
  - Semantic tokens (--bg-surface, --text-primary, --accent vb)
  - BEM-lite double-underscore (.ht-soon__card)
  - DOM createElement (innerHTML yok)
  - tabindex=-1 non-interactive
  - Reduced-motion gated
- Plan dosyasi guncellendi: REFINEMENT NOTES section eklendi (line 311+)
- Original B1-B10 task body'leri korundu (audit trail) ama notes override eder

## 2026-04-13 — K030 FAZ A Codex Brief
**Yapilan is:**
- profil-studio.js: file-top FROZEN banner + cross-link maps dormant banner + _htGenelCoachTeaser noop stub
- tests/faz-a-decouple.spec.js: 5 kaynak-icerik test (10 pass, desktop+mobile)
- DeepSeek review: 0 kritik, 0 yuksek, 2 orta + 3 dusuk → 2 orta fix uygulandi (var pattern + toContain assertions)
- Full regression: 1277 pass, 14 fail (HEPSI pre-existing, studio/coach disi), 0 K030 kaynakli

**Degisen dosyalar:**
- profil-studio.js (+28 -4 satir, logic yok, sadece comment banner + stub literali)
- tests/faz-a-decouple.spec.js (+48 yeni)
- docs/AI-COLLAB.md (bu dosya)

**Test durumu:**
- K030 FAZ A suite: 10/10 PASS
- Full regression: 1277 PASS, 14 pre-existing fail (auth.setup env, dark-mode pre-paint, LP segment toggle, kurumsal brand viewport'lari)
- 0 yeni regresyon

**Riskler / blocker'lar:**
- Yok. Runtime path degismedi. User-visible degisiklik YOK.
- Intermediate state: Studio paneli hala acilir, Koc feed Genel'de hala calisir.

**Sonraki net adim:**
- Codex onayiyla push → GitHub Pages deploy → 24h gozlem
- Gozlem sonrasi FAZ B: panel-soon.js + switchPanel guard + sidebar/bottom nav chip + coach-studio.html noindex
**Spec:** docs/superpowers/specs/2026-04-13-studio-freeze-duyurular-design.md
**Plan:** docs/superpowers/plans/2026-04-13-studio-freeze-duyurular-plan.md

## 2026-04-13 — K030 FAZ A TAMAMLANDI
- profil-studio.js: file-top FROZEN banner + cross-link maps dormant + _htGenelCoachTeaser noop stub
- tests/faz-a-decouple.spec.js — 5 kaynak-icerik test (desktop+mobile = 10 pass)
- User-visible degisiklik: YOK (intermediate state)
- Risk: 0 (runtime path degismedi, dead-code stub, orijinal kod korundu)
- Commit: b67dfd9 (A1-A3), next commit (A4 test + A5 checkpoint)
- Next: push → 24h gozlem → FAZ B (panel-soon.js + switchPanel guard)

**Son tamamlanan:** Asama 74 (10 Nisan 2026) — F1/F2/F3 Critical Fixes + Hotfix
**Son commit:** 4b52925 — brand logos signed URL + cover image relative path fix
**Test durumu:** 28/28 F1/F2/F3 PASS, 325/336 regression (11 pre-existing)
**Beta Launch Paketi:** TAMAMLANDI (Asama 48-61)
**Landing Page Redesign:** TAMAMLANDI (Asama 63)
**Public-Site Redesign:** TAMAMLANDI (Asama 69)
**UX Polish + Footer + Yasal:** TAMAMLANDI (Asama 70)
**Page Cleanup + K029 + Security:** TAMAMLANDI (Asama 71)
**Unified Landing Page:** TAMAMLANDI (Asama 72)

## Tamamlanan Bloklar

| Blok | Asamalar | Durum |
|------|----------|-------|
| Tekrar eden hata guard'lari | 48-49 | ✅ ESLint, truth-sync, RLS, migration template |
| Beta Premium Gate | 50-52 | ✅ AI 1-use, badge, One Cikar aktif |
| CV ATS Optimizasyonu | 53 | ✅ 6 global standart uygulandı |
| Marka Gorselleri + Redesign | 54-56 | ✅ 31 gorsel, informative card v2 |
| Teklifler Beta Vurgusu | 57 | ✅ Premium badge + beta notu |
| Egitim Dashboard | 58-59 | ✅ Rozet tooltip, ilerleme karti |
| HT Info Revizyon | 60-61 | ✅ Center feed + left rail compact |
| Landing Page Redesign | 63 | ✅ Gate + dual LP, dark mode, 397 test PASS |
| Public-Site Redesign | 69 | ✅ 5 sayfa Clatu-first editorial, QA 196 PASS |
| UX Polish + Footer + Yasal | 70 | ✅ Gate fade, footer 3-kolon, yasal.html 4-tab |
| Page Cleanup + K029 + Security | 71 | ✅ Asagida detay |

### Asama 71 Detay (8 Nisan 2026)

**7 commit, 50+ fix, 4500+ satir silindi:**

1. `1d53fc6` — Page cleanup: 9 orphan sayfa silindi, gate logged-in redirect, email template polish, yasal link guncelleme, sitemap genisleme
2. `82cd2cb` — K029 Layer 1 (Security): XSS escape, X-Frame-Options, CORS restrict, telefon/email/sifre validation, innerHTML sanitize, PII logging, noopener, robots.txt
3. `fe13e5a` — K029 Layer 2+3 (Code Quality + A11y): preconnect, dead code, SVG CLS, INP fix, query limits, font cleanup, explicit select, work_prefs dedup, modal dialog roles, aria-labels, Escape handler, sidebar keyboard
4. `645f422` — Admin builder dedup + unused gate assets cleanup (386KB)
5. `b2aff82` — Studio CSS extraction (890 satir → css/studio.css) + modal focus trap (profil/ik/giris)
6. `3a27138` — Security hardening: CV signed URLs, employer PII strip, password policy, CSP, hr_profiles guard
7. Dashboard: cvs bucket private yapildi (manuel)

**Edge Functions deploy:** 4 fonksiyon (content-moderate, cv-optimize, journal-feedback, translate-text) CORS fix ile deploy edildi.
**DB Migrations deploy:** 2 migration (sec_strip_employer_pii + sec_hr_profiles_guard) production'a uygulandi.

## Pipeline Infra (2 Nisan 2026)

- Codex plugin: ✅ kurulu (codex review, codex exec)
- Supabase MCP: ✅ OAuth bagli
- Telegram bot: ✅ aktif (daily ritual, devam/onay flow)
- Autopilot: ❌ kaldirildi (Codex plugin yerini aldi)
- DeepSeek review: ✅ 3x retry, deepseek-chat model
- Cerebras review: ✅ STEP_RESULTS tracking
- 66 BATS infra test: ✅ PASS

## Acik Riskler / Blocker

1. Playwright smoke flaky — Cloudflare Access arkasinda, local server ile test ediliyor
2. iyzico entegrasyonu — DEFER (beta 3 ay boyunca ucretsiz)

## Guvenlik Durumu (9 Nisan 2026)

| Alan | Durum |
|------|-------|
| Sifreler (bcrypt) | ✅ GUVENDE |
| Sifre politikasi (8+ karakter, complexity) | ✅ GUVENDE |
| Aday↔Aday izolasyonu (RLS) | ✅ GUVENDE |
| CV/Avatar dosyalari (signed URL + private bucket) | ✅ GUVENDE |
| Isveren PII erisimi (RPC wrapper strip) | ✅ GUVENDE |
| Admin paneli (admin_users guard) | ✅ GUVENDE |
| CSP header (tum sayfalar) | ✅ GUVENDE |
| X-Frame-Options (clickjacking) | ✅ GUVENDE |
| CORS (origin restrict) | ✅ GUVENDE |
| hr_profiles INSERT guard | ✅ GUVENDE |
| is_employer() onboarding check | ✅ GUVENDE |
| CSRF (JWT mimari) | ✅ GUVENDE |
| SQL injection (parametrize) | ✅ GUVENDE |
| Role tampering (app_metadata + guard trigger) | ✅ GUVENDE |
| KVKK consent audit log (server-side timestamp) | ✅ GUVENDE |
| Registration rate limit (3/5dk) | ✅ GUVENDE |
| Password reset cooldown (60s) | ✅ GUVENDE |
| Remember-me storage isolation | ✅ Checkbox kaldirildi (dead code temizlendi) |
| Bot korumasi (Turnstile + honeypot) | ✅ GUVENDE |
| hr_profiles.onboarding_completed | ✅ DUZELTILDI (eksik kolon eklendi) |

## Bir Sonraki Adim

**Asama 72 — Unified Landing Page: TAMAMLANDI (9 Nisan 2026)**

**Yapilan isler:**
| # | Gorev | Durum |
|---|-------|-------|
| ULP-1 | index.html: Gate → tek LP, Adaylar/Kurumsal segment toggle (bunq referans) | ✅ |
| ULP-2 | shared.js header/footer/mobile nav → index.html#adaylar / #kurumsal, SPA-like hash nav | ✅ |
| ULP-3 | aday.html + isveren.html → 3-katmanli redirect (meta+canonical+JS), sitemap, 4 test dosyasi adapte | ✅ |
| ULP-4 | Sub-page link guncelleme (hakkimizda/iletisim/giris), copy review | ✅ |
| ULP-5 | Test port tutarsizliklari fix (8888/3001→relative), selector scope, 1218/1221 PASS (3 bilinen auth) | ✅ |
| ULP-6 | 7 mockup + backup sil, .gitignore (.firecrawl/, qa-screenshots/), cache-bust birlestir | ✅ |

**Degisen dosyalar:** shared.js, index.html, aday.html (redirect), isveren.html (redirect), hakkimizda.html, iletisim.html, giris.html, sitemap.xml, .gitignore, 4 test dosyasi (smoke/qa-public-pages/gate-qa/responsive-qa)

**Test durumu:** 1218 PASS / 3 fail (bilinen: auth env var eksik)

**Asama 73 — Auth Pages Split: TAMAMLANDI (9 Nisan 2026)**

**Yapilan isler:**
| # | Gorev | Durum |
|---|-------|-------|
| T1-2 | uye-ol.html olusturuldu (aday + kurumsal kayit formlari) | ✅ |
| T3-4 | JS: tab switch, validation, phone format, strength, signUp, OAuth | ✅ |
| T5 | demo-dashboard-ik.html kurumsal demo placeholder | ✅ |
| T6 | giris.html: kayit formlari cikarildi, IK→Kurumsal, logo .ai kaldirildi | ✅ |
| T7 | shared.js login modal + index.html CTA'lari uye-ol.html'e | ✅ |
| T8 | profil-bootstrap: employer→demo routing, wizard pre-fill (full_name+phone) | ✅ |
| T9-10 | sitemap, auth-pages testleri (32 yeni), cache-bust, full test | ✅ |

**Yeni dosyalar:** uye-ol.html, demo-dashboard-ik.html, tests/auth-pages.spec.js
**Test durumu:** 1250/1253 PASS (3 bilinen: auth env + dark-mode)

**Asama 73b — Security Hardening + Bot Protection (9 Nisan 2026)**

| # | Gorev | Durum |
|---|-------|-------|
| SEC-1 | role → app_metadata (2 DB trigger + backfill + 8 dosya) | ✅ |
| SEC-2 | Registration rate limit (3/5dk) | ✅ |
| SEC-3 | KVKK consent_log tablosu + server-side trigger | ✅ |
| SEC-4 | ik.html app_metadata role check | ✅ |
| SEC-5 | Remember-me race condition fix (simdilik devre disi) | ✅ |
| SEC-6 | Password reset 60s cooldown | ✅ |
| BOT | Cloudflare Turnstile (invisible) + honeypot + Edge Function | ✅ |

**Asama 73c — Mobil UX + Landing Page Polish (9 Nisan 2026)**

| # | Gorev | Durum |
|---|-------|-------|
| MX-1 | Mobil header 2 satir → toggle hero icine gomulu | ✅ |
| MX-2 | Desktop toggle header'da, mobil hero'da (responsive split) | ✅ |
| MX-3 | Landscape hero kompakt + gorsel kucultme | ✅ |
| MX-4 | Sticky header fix (overflow-x:clip) | ✅ |
| MX-5 | Adaylar brand social proof section | ✅ |
| MX-6 | Kurumsal CTA gorsel (mulakat illustrasyon) | ✅ |
| MX-7 | Section renk alternani (beyaz/warm) | ✅ |
| MX-8 | "Kimler icin?" label | ✅ |

**Critical Bug Fix (9 Nisan 2026)**
- `hr_profiles.onboarding_completed` eksik kolon → `is_employer()` RLS kiriliyordu → tum candidates SELECT 400 → profil yuklenemiyordu. Kolon eklendi, mevcut employer'lar true set edildi.

**Asama 74 — F1/F2/F3 Critical Fixes (10 Nisan 2026)**

| # | Gorev | Durum |
|---|-------|-------|
| F1-1 | signStorageUrl + signStorageUrls helper (shared.js) | ✅ |
| F1-2 | coach-studio avatar/cover: getPublicUrl → path + signStorageUrl | ✅ |
| F1-3 | Coach avatar rendering signed (profil-genel + admin-coach-content) | ✅ |
| F1-4 | ik.html candidate avatar signed | ✅ |
| F1-5 | profil-preview.js avatar signed | ✅ |
| F1-6 | DB migration: strip broken full URLs to storage paths | ✅ |
| F2 | "Beni Hatirla" checkbox removed (dead code) | ✅ |
| F3-1 | CSP: wss:// added to connect-src (13 pages) | ✅ |
| F3-2 | CSP: Sentry ingest domain fixed (profil.html) | ✅ |
| F3-3 | CSP: Google Maps frame-src added (iletisim.html) | ✅ |
| F3-4 | CSP: Dead Sentry entries removed from 12 non-Sentry pages | ✅ |

**Degisen dosyalar:** shared.js, coach-studio.html, profil-genel.js, admin-coach-content.js, ik.html, profil-preview.js, giris.html, profil-markalar.js, 13 HTML (CSP), 1 migration, 1 test dosyasi
**Test durumu:** 28/28 F1/F2/F3 tests PASS, 325/336 regression (11 pre-existing fail)
**Yeni dosyalar:** tests/f1-f2-f3-fixes.spec.js, supabase/migrations/20260410165047_fix_coach_avatar_urls.sql

**Hotfix (10 Nisan 2026, post-deploy):**
| # | Gorev | Durum |
|---|-------|-------|
| HF-1 | signStorageUrl legacy full URL handling (prefix strip) | ✅ |
| HF-2 | Brand cover image: relative path regex engeli kaldirildi (line 276) | ✅ |
| HF-3 | Brand logos: batch signing eklendi (signStorageUrls) | ✅ |

**Acil fix yok**

**Sonraki asamalar:**
- **Pozisyon gorunum/esleme metrikleri** — DEFER
- **iyzico/Stripe checkout** — DEFER (beta 3 ay ucretsiz)

## 2026-04-13 — K030 FAZ C bildirim bell dot hotfix
- profil-inbox.js: duyuru unread count header bell + sidebar badge'e yansitiliyor
- profil.html cache-bust bump


## 2026-04-13 — K030 FAZ C preview schema hotfix
- profil-duyurular.js buildCard() uses pinned_until (not is_pinned), filters link media rows
- admin-announcements.js updatePreview fakePost matches real schema
- Cache bump ?v=20260413e


## 2026-04-13 — K030 FAZ C p3 test window hotfix
- tests/p3.regression.spec.js Asama 36 _applyNotifBellDot assertions: substring window 500 → 1000 (duyuru unread ~280 char ekledi, badge-bildirimler ref 501. char'a kaydi)


## 2026-04-13 — K030 FAZ C ext Codex gate fix
- profil-duyurular.js IntersectionObserver: require entry.intersectionRatio >= 0.5 alongside isIntersecting to prevent initial-callback fire on <50% visibility
- Cache-bust ?v=20260413g


## 2026-04-13 — K030 FAZ C bildirim hotfix 2
- loadUnreadCount() now runs even without panel-bildirimler DOM (was early-returning)
- 60s poll added so new admin posts surface without page reload
- window._htRefreshDuyuruUnread exposed for manual refresh
- Cache-bust ?v=20260413h


## 2026-04-13 — K030 FAZ C final: object-fit:contain feed rendering
- css/duyurular.css carousel slide: object-fit:contain + neutral bg, full image, no crop
- profil-duyurular.js buildCarousel: removed dynamic objectPosition (focal_x/y no longer read)
- admin-announcements.js: focal click UX removed from appendThumb (kept focal_x/y 0.5 defaults for DB backward compat)
- Cache-bust ?v=20260413i
- Cropper.js editor approach reverted (unpushed commits discarded) in favor of simpler contain
- 58/58 FAZ A+B+C spec PASS


## 2026-04-14 — K030 FAZ C hotfix 4: CSP blob + SEEN_KEY + natural aspect
- CSP img-src + media-src blob: eklendi (admin.html + profil.html) — composer preview 4x tekrar eden root cause
- profil-duyurular.js loadDuyuruFeed SEEN_KEY update kaldirildi — header bell badge artik yeni post'larda tetikleniyor, SEEN_KEY sadece activateTab('duyuru')'da set ediliyor
- css/duyurular.css .ht-duyuru__carousel-slide fixed 16:9 aspect-ratio kaldirildi, natural aspect + max-height 640px, slide gorselin sekline gore bicimleniyor
- Cache-bust ?v=20260413j
- Test: 24 FAZ C + 730 p3 = 754 PASS


## 2026-04-14 — K030 FAZ C hotfix 5: bell dot defensive parse + debug helper
- profil-inbox.js parseUnreadCount: scalar/array/object/string/null tam handle
- loadUnreadCount verbose console.info logging: RPC raw data + parsed count + since value
- window._htDebugBell: manual diagnostic from DevTools console
- Cache-bust ?v=20260413k


## 2026-04-14 — K030 FAZ C hotfix 6: stale SEEN_KEY purge
- profil-inbox.js: one-shot localStorage purge via SEEN_VERSION_KEY ('ht_duyuru_seen_v'='2'). Clients with a stale ht_last_duyuru_seen from earlier buggy loadDuyuruFeed renders get a fresh baseline. Bell dot now surfaces all active posts on next fetch until user explicitly opens Duyurular tab.
- Debug: _htDebugBell showed SEEN_KEY stuck at past timestamp, RPC returning data:0 correctly (all posts were published BEFORE that timestamp).
- Cache-bust ?v=20260413l


## 2026-04-14 — K030 FAZ C hotfix 7: activateTab isUserAction flag
- activateTab(root, key, isUserAction) — SEEN_KEY + badge reset + bell refresh only on explicit click
- Silent restore (sessionStorage) no longer flushes SEEN_KEY
- Bump SEEN_VERSION_KEY v3 to re-purge stale values from hotfix 6 path
- Cache-bust ?v=20260413m


## 2026-04-14 — K030 FAZ C drawer dual tab (Bildirimler + Duyurular)
- profil.html header drawer: segment markup (2 tab + dot badges) + 2 body containers
- css/layout.css .header-popup-seg + .header-popup-item--duyuru compact card
- profil-inbox.js: _htLoadDuyuruPreview (last 5), segment click handler, _htApplyDrawerBadges, Tümünü Gör routing (active tab → sessionStorage), bell dot calls drawer badge refresh
- Cache-bust ?v=20260413n


## 2026-04-14 — p3 regression hotfix: drawer dot 9→10px
- css/layout.css .header-popup-seg-dot font-size 9px → 10px (p3 sub-10 regression guard)
- Box proportional: 16px → 18px


## 2026-04-14 — Task #21: Drifted legacy migrations repaired
- supabase migration repair --status applied for 20260409131000, 20260409160000, 20260410165047 (all marked applied in supabase_migrations.schema_migrations)
- 20260409131000_sec_consent_log.sql: added DROP POLICY IF EXISTS for consent_log_select_own (idempotency guard — original non-idempotent CREATE POLICY blocked future db:push)
- Other two migrations already idempotent (ADD COLUMN IF NOT EXISTS, regex_replace UPDATE)
- Verified: npx supabase db push --dry-run --linked → 'Remote database is up to date'
- db:push now unblocked for future migrations


## 2026-04-14 — K030 FAZ C tech debt cleanup
- Storage policies: 20260413214500_ht_ann_storage_policies.sql — admin INSERT/UPDATE/DELETE on cvs bucket under announcements/ prefix, applied + repaired (admin composer media upload now unblocked)
- Dead focal code removed: css/duyurular.css .ht-composer__focal-dot + [data-has-focal], admin-announcements.js focal_x/y payload/defaults cleanup (DB DEFAULT 0.5 handles backward compat)
- profil-studio.js FAZ A banner: corrected claim about bottom-nav chip (Stüdyo entry yok bottom nav'da)
- profil-inbox.js 60s bell poll: _bellPollId tracked + clearInterval on pagehide
- Cache-bust ?v=20260414a
- 754/754 (24 FAZ C + 730 p3) PASS


## 2026-04-14 — K031 Codex Post-Push Gate (CTO override)

### Codex verdict: NEEDS-CHANGES (BOTH FINDINGS FALSE POSITIVE)

**Finding 1:** Toggle ID mismatch 'merkez-toggle-hide-from-current-employer' vs shipped 'merkez-hide-from-current-employer'.
**Root cause:** CTO brief typo. git show HEAD~1:profil.html confirms the original ID was 'merkez-hide-from-current-employer' (without -toggle-). Subagent correctly preserved actual contract. All JS handlers (profil-ui.js:1533, profil-visibility.js:183/229, profil-settings.js:157) resolve against the real ID.
**Verdict:** Contract preserved, false positive.

**Finding 2:** Class '.mk-identity-strip' not shipped (as '.mk-identity-wrap').
**Root cause:** Design doc naming vs shipped implementation naming drift. Zero JS/HTML/test references to '.mk-identity-strip'. Stylistic rename only.
**Verdict:** No functional impact, false positive.

### CTO override: APPROVE

- All 5 binding decisions applied
- All contract IDs verified preserved
- DeepSeek 0 blocker
- Full regression 744/0 PASS
- p3 K031 describe block 7 new assertions
- Tuna UAT pending (visual verification)

### Memory update
Next brief writing → verify preserved IDs directly via grep before listing them. Brief typos become contract drift illusions.


## 2026-04-14 — K031 hotfix 1: rescue cross-cutting styles
- K031 subagent treated css/panels/merkezi.css as merkezi-only and dropped 955 lines of cross-cutting styles that historically lived there: pp-overlay/pp-drawer (profile preview drawer), lok-modal (location picker), tg-toast (toggle toast), modal-check (success animations), avatar-upload, custom-check, wiz-step internals, ht-btn--save-exit, ht-grid-3.
- Created css/profil-extras.css (970 lines) — rescued the deleted blocks verbatim from git HEAD~2.
- profil.html: added css/profil-extras.css link + cache-bump merkezi.css and profil-extras.css to ?v=20260414c.
- p3.regression.spec.js: cache-bust assertion regex now matches any 20260414[a-z]; added profil-extras.css load assertion.
- 746/746 PASS.
- Resolves: 'Profilim Önizle' raw text dump, location modal sarkan element top-left, avatar upload styling, toggle toast, modal animations, wizard step internals.


## 2026-04-14 — K031 hotfix 2: rounded outer frame
- #panel-merkez border-radius: 20px (14px mobile), border 1px subtle
- Padding bumped 24/20 → 32/28 (24/18 mobile) for breathing room
- Cache-bust ?v=20260414d

