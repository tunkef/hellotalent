# K031 — Profil Merkezi Redesign Proposal

**Date:** 2026-04-14 · **Author:** Claude (CTO) · **Owner:** Tuna · **Scope:** `#panel-merkez`

---

## 0. Deliverables Summary

Bugun: vermillion tugla hero + 6 bento kart + dipte 3 dagilmis widget. Hierarchy duz, hero agir, progress yapistirilmis. Redesign tek editorial sayfaya doner: navy-on-cream identity strip, topline pulse, "Profilin" omurgali 4 bolum, tek "CV ve gorunurlugun" zarfi (CV + premium + gizlilik). Sadece CSS rewrite + markup re-order (`css/panels/merkezi.css` + `#panel-merkez`). Veri kontrati, JS handler, Supabase fields **degismez**. 1 PR, 2 oturum, sifir backend riski, dusuk regression.

---

## 1. Design Principles

1. **Editorial, dashboard degil.** Tek hikaye: kim → profilin → simdi ne yap. Bento yok.
2. **Restraint.** Vermillion sadece accent, navy hakim, cream nefes. Renkli ikon kutucuklari (mavi/yesil/mor) kalkar.
3. **Progress omurga, susleme degil.** Topline ring + spine tick. Kart altinda yesil bar yok.
4. **Tek tikla edit.** Kart tiklanabilir, hover'da pencil. Modal/inline karmasi yok.
5. **Premium cesaretli, suclu degil.** "Eksik" hissi vermeden tek satir CTA.

---

## 2. Current Panel Audit

**Calisan:** 4 grup segmentasyonu dogru, edit affordance net, toggle anlasilir, identity quick-read.

**Zayif:** hero koca solid vermillion screaming; Beta ribbon banner-ad gibi; bento (span-2/1/2) ritmik degil, her kart farkli renk + ikon kutusu = noise; per-card yesil bar icerigi bastirip eksigi vurguluyor; bottom zone (Controls + dark navy Premium + beyaz CV + beyaz AI) konusmuyor; renk dili 6'ya bolunmus.

**Korunmasi sart:** `data-step="1..4"`, toggle ID'leri (`merkez-toggle-visibility/active/hide-from-current-employer`), `cv-upload-area`, `cv-file-input`, `btn-generate-cv-merkez`, `btn-preview-profile`, `mk-premium-card-link`, `mk-preview-1..4`. **Restruktur:** hero, ribbon, kart renkleri/sirasi, progress, alt zone, ikon sistemi.

---

## 3. New Information Architecture

Storyline (mobile-first):
1. **Identity strip** — avatar + isim + sehir/yil. Tek satir nefes.
2. **Topline pulse** — tek progress ring (%XX) + "X/4 tamam" + Profilimi Onizle ghost button. Eski ribbon'a gerek yok.
3. **Profilin omurga** — 4 bolum dikey akar, sol kenar navy spine + binary tick (filled/dashed). Her bolum: solda LABEL, sagda preview ozeti, hover'da pencil.
4. **CV ve gorunurlugun zarfi** — tek baslik altinda 3 satir: CV / Premium / Gizlilik (3 toggle). Hairline ile ayri.
5. **Imza** — kucuk italic "HelloTalent · Beta".

**Edit:** kart tiklanir, wizard step'e atlar (mevcut davranis). **Progress strategy:** topline ring (single source) + per-section binary tick. Per-card bar **kalkar**.

---

## 4. Layout Proposal

**Desktop 1440+** (880px center, 56px sol gutter omurga icin)

```
╭──╮  TUNA KEFELI                          ◯ Profilin
│TK│  Su an calismiyor · Istanbul · 5 yil  [ 73% ]
╰──╯
─────────────────────────────────────────────────────
Profilin                          [ Profilimi Onizle ]
│
●  KISISEL                                          ✎
│  Tuna Kefeli · Istanbul · 1992 · Erkek
│  Telefon · LinkedIn
●  DENEYIM                                          ✎
│  Chanel — 2023 · Devam     +4 deneyim
●  EGITIM & DIL                                     ✎
│  Istanbul Universitesi · Isletme
│  TR Anadil · EN C2 · RU C2 · 1 sertifika
◌  TERCIHLER & LOKASYON                             ✎
╵  Tam zamanli · Istanbul · Hedef pozisyon eksik
─────────────────────────────────────────────────────
CV ve gorunurlugun

▢  CV — tuna_kefeli.pdf · 04.04.2026
   [ Indir ] [ Degistir ] [ Sil ]
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
★  Beni One Cikar · 3 ay ucretsiz beta             →
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
◉ Beni Oner             (●) ON
◉ Aktif Is Arama        (●) ON
◉ Isverenim Gormesin    ( ) OFF

HelloTalent · Beta
```

**Mobile 390:** ayni dikey akis, full-bleed cream, 16px gutter, omurga 24px sol.

**Grid:** tek kolon, hairline separators (`--border-subtle`), bento yok, span yok.

---

## 5. Component Inventory

| # | Name | Size | Data | Actions | Visual |
|---|---|---|---|---|---|
| 1 | mk-identity-strip | hero compact | avatar + ad + sehir/yil | tikla→step1 | cream bg, navy, mat 56px avatar |
| 2 | mk-pulse | hero rh | %total, X/4 | Profilimi Onizle | navy ring 64px, head font number, ghost btn |
| 3 | mk-spine + 4×__item | feature | LABEL + preview | hover→pencil, click→wizard | sol 1px navy spine, hairline alt, mono LABEL |
| 4 | mk-spine__tick | compact | filled/dashed | — | dot 8px / dashed circle |
| 5 | mk-zarf | feature | — | — | cream, mono baslik, hairline ic |
| 6 | mk-zarf__cv | standard | dosya, tarih | Indir/Degistir/Sil/Yukle | tek satir, ghost btn |
| 7 | mk-zarf__premium | standard | baslik | →premium | star sol, chevron sag, accent text |
| 8 | mk-zarf__privacy | standard | 3 toggle | toggle | ht-toggle reuse |
| 9 | mk-signature | compact | static | — | mono xs italic |

**Removed:** mk-footer (ribbon), mk-card-status (yesil bar), .mk-card-icon renkli varyasyonlari, mk-bento-grid, mk-premium-toggle-card dark gradient, mk-cv-grid-card / mk-ai-grid-card.

---

## 6. Visual Direction

**Typography:** display name `--font-head` 28/22px weight 700; section LABEL `--font-mono` `--text-sm` uppercase ls 0.08em `--text-muted`; preview data `--font-body` `--text-md` `--text-secondary`; topline % `--font-head` 32px; signature `--font-mono` `--text-xs` italic muted.

**Color:** background `--bg-app` cream (tek surface, beyaz kart yok). Dominant navy `--text-secondary` + black `--text-primary`. Accent vermillion 3 noktada: topline ring fill, premium row star/chevron/rozet, hover pencil. Hairline `--border-subtle`. Status renkleri sadece toggle-on ve CV sil danger.

**Iconography:** tek stil 1.5px stroke line-icons currentColor. Filled colored squares yok. 16/20/14px boyutlar. Spine tick pure CSS (dot / dashed border).

**Spacing:** dikey 32/24/16/8 ritm. Identity→pulse 32, pulse→omurga 40, item arasi 24, zarf satir arasi 20, label→preview 4. Yatay 56px omurga gutter, 16px content padding.

**Motion:** stagger fade-up identity→pulse→spine→zarf 60ms aralik (toplam ~280ms). Pencil hover 160ms opacity+translate. Topline ring fill 600ms ease-out (`stroke-dashoffset`). `prefers-reduced-motion` fallback. Sifir shimmer/particle.

**Dark mode:** `--bg-app` ve `--border-subtle` semantic — otomatik calisir. Kart yok, surface karmasi yok. Vermillion accent dark'ta da dogru contrast veriyor.

---

## 7. Progress & Completion UX

**Karar:** topline navy ring (64px, %toplam) + spine binary tick (filled=tamam, dashed=eksik) + section preview text'in zaten "—" gosterdigi eksik alanlar.

**Neden:** Per-card yesil bar kartin icerigini bastirip eksigi vurguluyor (negatif framing). Topline ring tek motivasyon noktasi; spine tick'leri "hangi bolum eksik" sorusunu tek bakista cevaplar; granular yuzde aslinda kullaniciya yarar etmiyor. Editorial restraint ile uyumlu, kartin icerigi nefes alir.

---

## 8. Retained Functionality Checklist

| Action | Status | Note |
|---|---|---|
| Profilimi Onizle | retained | Topline pulse'a tasinir, ID korunur |
| 4 bolum edit (wizard) | retained | `data-step="1..4"` spine item'da |
| Beni Oner / Aktif Arama / Isveren Gormesin toggle | retained | Zarf privacy row, ID korunur |
| CV upload / degistir / sil | retained | Zarf CV row, tum ID korunur |
| CV indir (ATS PDF) | retained | `btn-generate-cv-merkez` zarf CV row icine |
| AI Optimize Et | restructured | Premium row icine consolidated, premium panele yonlenir |
| Beni One Cikar (premium link) | retained | Zarf premium row, `mk-premium-card-link` korunur |
| Profil aktif status | restructured | Topline pulse altinda mono caption |
| Beta Avantajlari ribbon | dropped | Ad-banner hissi; topline + premium row tasiyor |
| Per-card yesil progress bar | dropped | Topline ring + spine tick replace |

---

## 9. Premium + CV + Status Zone

Bugun 3 disconnected widget. Premium navy gradient screams, CV beyaz, status soft. Ayni mental kategori (profilin disa donuk yuzu) ama 3 ayri tonu var.

**Karar: tek "CV ve gorunurlugun" zarfi.** 3 satir, hairline ile ayri:
1. **CV** — pratik dosya yonetimi (free).
2. **Premium** — aspirational, accent vermillion, "3 ay ucretsiz beta" rozeti, chevron.
3. **Gizlilik** — defensive, 3 toggle.

**Narrative:** "calisiyor → iyilestir → korun". Premium ortada — discoverable ama agresif degil. Cream uzerinde tek star + accent text; eski dark gradient'in baski hissi gider.

---

## 10. Risks / Open Questions

1. Copy onayi: "Profilin", "CV ve gorunurlugun", "Beni One Cikar · 3 ay ucretsiz beta".
2. Topline altinda "son guncelleme" tarihi cekilebilir mi yoksa "Profilin aktif" yeter mi?
3. AI Optimize Et premium row'a gomulmesi kabul edilebilir mi yoksa ayri "Beta · Ucretsiz" satir mi?
4. Avatar yesil "calisma durumu" ring'i kaldirilsin mi (clatu sadelik) yoksa kucuk dot'a inerek korunsun mu?
5. Animation intensity yetiyor mu? (Onerim: yetiyor.)
6. Illustration butcesi: K031 zero illustration; Clatu illustrasyon ileride empty state'lere.

---

## 11. Build Sequence

Tek PR, sirf CSS + HTML markup + minimal JS rebind. Backend dokunulmaz. ~2 oturum.

1. Branch + baseline screenshot (mobile + desktop).
2. **`css/panels/merkezi.css` rewrite** (~1659 → ~600 satir). Eski mk-bento/mk-card/mk-card-icon/mk-card-status/mk-footer/mk-cv-grid-card/mk-ai-grid-card/mk-premium-toggle-card silinir; yeni mk-identity-strip/mk-pulse/mk-spine/mk-spine__item/mk-spine__tick/mk-zarf/mk-zarf__cv/mk-zarf__premium/mk-zarf__privacy/mk-signature gelir. Token-only.
3. **`profil.html` `#panel-merkez` markup re-order** (453-670). Tum ID/handler identik korunur, sadece sarmalayicilar degisir.
4. **JS rebind:** mevcut yuzde hesabi topline ring'e, per-card bar fill yerine spine tick `is-complete` class.
5. Animation pass (stagger fade-up + ring fill keyframes + reduced-motion).
6. Dark mode QA.
7. Playwright smoke: mobile 390 + desktop 1440 screenshot + 4 spine click → wizard step + CV upload mock + toggle persistence.
8. DeepSeek code review ($0.01).
9. Tuna preview (GitHub Pages hard refresh).
10. Merge: `feat: K031 Profil Merkezi editorial redesign` + CURRENT-STATE.md + AI-COLLAB.md update.

Diff: `merkezi.css` ~1100 satir azalir, `profil.html` ~30 satir azalir. Yeni dosya yok.

---

**Tek satirlik karar:** "vermillion tugla + 6 bento + 3 dagilmis widget" yerine "navy-on-cream identity + topline pulse + spine'li 4 bolum + tek 'CV ve gorunurlugun' zarfi". Backend zero touch, 1 PR, fit-and-finish editorial.
