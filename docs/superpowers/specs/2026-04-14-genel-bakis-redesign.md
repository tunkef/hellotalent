# K033 — Genel Bakis (Candidate Dashboard Home) Redesign Proposal

**Date:** 2026-04-14 · **Author:** Claude (CTO) · **Owner:** Tuna · **Scope:** `#panel-genel` + `profil-genel.js` layout builders + `css/panels/genel-bakis.css`

---

## 0. Deliverables Summary

Bugun: 3-kolon bento dashboard (sol rail identity+bakanlar+premium gradient+studyo, orta HelloTalent feature+feed, sag rail teklifler+markalar). K031/K032 editorial dile gecti; Genel Bakis hala eski bento. Redesign tek editorial sayfaya doner: **salute hero** + **identity strip** + **spine duyuru feed** + tek **"Tesi" zarfi** (Teklifler/Markalar/Profiline Bakanlar/Premium hairline satirlar) + **Studyo footer**. Cream-on-cream, navy ink, vermillion 3 noktada, DM Mono labels, sifir emoji. Tek CSS rewrite + `profil-genel.js` builder re-template. Veri kontrati, Supabase, handler ID'leri **degismez**. 1 PR, 2 oturum.

---

## 1. Design Principles

1. **Magazine cover, dashboard degil.** Gun baslangici manseti, widget raflari degil. Tek goz hareketi: kim → bugun ne var → sonraki adim.
2. **Restraint.** Vermillion 3 nokta: active dot, premium row, like. Navy gradient OLDU.
3. **Identity calms, content speaks.** Big name, quiet meta, sessiz ring. Yapistirilmis progress bar yok.
4. **Promo surfaces stacked.** Teklifler+Markalar+Profiline Bakanlar+Premium tek "Tesi" zarfi, hairline satirlar.
5. **Duyuru feed = manset.** Sayfa nabzi; hero'nun hemen altinda full width.

---

## 2. Current Panel Audit

**Calisan:** identity quick-read, profile completion sinyali, duyuru feed (K030 FAZ C donmus), teklifler/markalar listesi, aktif is arama chip.

**Zayif:**
- Bento 3-kolon: generic SaaS dashboard hissi.
- Identity: vermillion progress bar yapistirilmis (pre-K031), green ring K031'de kalkti.
- Premium: navy gradient + crown emoji + 3 bullet — K031'de cekilmis pattern hala burada.
- HelloTalent feature card: 5 kirmizi ikon kutucugu + anlatim — "no emoji in design" gorsel ihlali, daily home'a ait degil.
- Studyo yakinda: sol rail'de yalniz, kopuk.
- Profiline Bakanlar: tek widget kart.
- Right rail Teklifler+Markalar: utility widget hissi.

**Korunmasi sart:** ht_announcements feed render + like handler, `btn-edit-profile`, `mk-premium-card-link`, teklifler/markalar loader, aktif is arama status, avatar initials.
**Restruktur:** tum kart sarmalayicilar, 3-kolon, renk kutucugu ikonlar, premium gradient, progress bar.

---

## 3. New Information Architecture

Storyline (mobile-first):
1. **Salutation hero** — "Gunaydin, Tuna" + tarih + mono "Aktif Is Arama" status + navy pulse ring %96.
2. **Identity strip** — avatar + name + rol + sehir + "Profili Duzenle" ghost btn.
3. **Bugun HelloTalent'ta (Feed)** — spine-driven manset feed, like/yorum hairline.
4. **Tesi zarfi** — 4 hairline block: Teklifler → Markalar → Profiline Bakanlar (empty) → Premium accent satir.
5. **Studyo yakinda** — mono eyebrow + 4 item grid + italic caption, footer konumunda.
6. **Imza** — `HelloTalent · Beta` mono italic.

**Drop:** HelloTalent 5-feature anlatim karti (onboarding'e ait, daily home'a degil).
**Move:** Profiline Bakanlar/Premium/Teklifler/Markalar → Tesi zarfi.
**Retain:** duyuru feed, aktif is arama status, Profil Duzenle.

---

## 4. Layout Proposal

**Karar: tek kolon 880, spine-driven.** Sag rail yok. Tesi zarfi duyuru altinda akar — magazine front page hissi, SaaS sidebar degil.

```
  Gunaydin, Tuna                       ◯ %96
  13 NISAN 2026 · PAZARTESI            aktif
───────────────────────────────────────────
  ╭──╮  TUNA KEFELI                      ✎
  │TK│  Magaza Muduru · Chanel · Istanbul
  ╰──╯
───────────────────────────────────────────
  BUGUN HELLOTALENT'TA
  │
  ●  SIRKET · 10 SAAT ONCE
  │  Golden Goose
  │  Golden Goose artik yeteneklerini
  │  bizimle ariyor.
  │  [  image 200  ]
  │  ♡ 0   Yorum
  │
  ●  SIRKET · 2 GUN ONCE
  │  Beymen Academy
  │  ...
  │
  ●  ...
───────────────────────────────────────────
  TESI

  ▸ TEKLIFLER
    Yaz Sezonu Ekip Arkadasi   Beymen      Ise Alim
    %20 Indirim Kuponu         Zara        Teklif
    Bizimle Tanisin            Vakko       Isveren Markasi
    → Tum teklifleri gor

  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

  ▸ MARKALAR
    Lacoste       Premium     [ Takip Et ]
    MAC           Guzellik    [ Takip Et ]
    LC Waikiki    Moda        [ Takip Et ]
    → Tum markalar

  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

  ▸ PROFILINE BAKANLAR
    Henuz goruntulenme yok — profilin gorunur durumda.
    → Detaylari Gor

  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

  ★ BENI ONE CIKAR
    3 ay ucretsiz beta · markalar seni once gorsun     →
───────────────────────────────────────────
  STUDYO · YAKINDA
  Mulakat demolari · Yetkinlik · Teknikler · Magaza bilgileri
  Studyo kariyer gelisimi icin hazirlaniyor.

  HelloTalent · Beta
```

**Mobile 414:** ayni dikey akis, 20px gutter, spine 16px sol, duyuru feed kartlari full bleed cream-on-cream hairline border.

---

## 5. Component Inventory

| # | Name | Size | Data | Actions | Visual |
|---|---|---|---|---|---|
| 1 | `gb-salute` | hero compact | selam + tarih + status + %pct | — | Bricolage 34/26, mono date, navy ring 52px |
| 2 | `gb-identity` | strip | avatar + name + role + city | Profili Duzenle ghost btn | 56px TK avatar, navy-light bg, hairline alt |
| 3 | `gb-feed` + `__item` | feature, manset | announcement card | like, comment | sol 1px navy spine, beyaz subtle surface kart, mono eyebrow |
| 4 | `gb-zarf` | feature | Tesi wrapper | — | cream, mono label baslik |
| 5 | `gb-zarf__block` | list | 3 row + footer link | "tum X gor" | sol mono sub-label, hairline dashed alt |
| 6 | `gb-zarf__row` | standard | offer/brand/view data | chip / follow btn | tek satir flex, hairline dashed |
| 7 | `gb-zarf__premium` | accent | title + sub + chevron | link | vermillion accent, star icon, hover verm-soft bg |
| 8 | `gb-studyo` | footer | YAKINDA + 4 item | — | cream, mono eyebrow, tek satir caption |
| 9 | `gb-sig` | compact | static | — | mono xs italic center |

**Removed:** `ht-feature-card` (5 feature bullet), `premium-gradient-card`, `profil-views-card`, `right-rail` wrapper, `left-rail` wrapper, `.card-icon-square--red`, avatar green ring, identity progress bar.

---

## 6. Visual Direction

**Typography:** salute head 34/26 700 -.02em; date/status mono 11 uppercase muted; name head 22 700; meta body 13 medium muted; eyebrow mono 11 uppercase; feed title head 19 700; body 14; row primary body 14 600 navy; premium title body 15 700 vermillion.

**Color:** cream surface, navy ink, muted gri, hairline border. Vermillion 3 noktada: salute ring fill, premium accent row, like active. Feed card: `#FFFFFF` subtle surface + hairline (tek beyaz istisna — content nefes alsın).

**Iconography:** 1.5px stroke line icons. Takip Et outline chip. Block label ▪ kucuk kare glyph. Sifir kirmizi kutu, sifir emoji.

**Spacing:** 40/32/24/16/8 ritm. Hero→identity 24, identity→feed 40, feed items 28, feed→zarf 48, zarf→studyo 40.

**Motion:** stagger fadeUp 70ms (toplam ~350ms). Ring fill 600ms on mount. `prefers-reduced-motion: reduce` kapatir.

**Dark mode:** token semantic otomatik; feed surface dark'ta `#111315`.

---

## 7. Retained Functionality Checklist

| Action | Status | Note |
|---|---|---|
| Duyuru feed render | retained | `gb-feed__item` template |
| Like button | retained | handler ID korunur |
| Teklifler listesi | restructured | Tesi zarfi block 1 |
| Markalar listesi + Takip Et | restructured | Tesi zarfi block 2 |
| Profiline Bakanlar | restructured | Tesi zarfi block 3 tek satir |
| Premium CTA | restructured | Tesi zarfi accent row, `mk-premium-card-link` ID korunur |
| Studyo yakinda | retained | footer konumuna tasinir |
| Aktif Is Arama status | retained | salute hero mono caption |
| Profili Duzenle btn | retained | identity strip ghost btn, `btn-edit-profile` ID korunur |
| HelloTalent feature 5-bullet card | dropped | onboarding'e ait, daily home'a degil |
| Avatar green ring | dropped | K031 ile cekildi |
| Identity vermillion progress bar | dropped | salute ring tek progress |

---

## 8. Promo Surfaces Unification

Bugun 4 disconnected promo: Profiline Bakanlar, Premium gradient, Teklifler, Markalar. **Karar: tek "Tesi" zarfi, 4 block hairline.** Sira: Teklifler (somut) → Markalar (kesif) → Profiline Bakanlar (analytics empty) → Premium (accent kapanis). Narrative: "sana gelen → kesfet → kim bakti → daha fazlasi premium". Vermillion sadece son satirda.

HelloTalent 5-feature karti **dropped** — onboarding islevi, daily home'a ait degil. Gerekirse "hakkinda" panel veya ilk-ziyaret modal (backlog).

---

## 9. Risks / Open Questions

1. Salute copy: zaman-bazli "Gunaydin/Iyi gunler/Iyi aksamlar" + tarih kabul mu?
2. HelloTalent 5-feature karti tam drop mu yoksa "Hakkinda" linkine mi donsun?
3. Feed surface: cream vs beyaz subtle? Onerim: beyaz subtle.
4. Tesi tek zarf vs 2 zarf (Sana Gelen / Kesfet)? Onerim: tek zarf.
5. Studyo footer vs Tesi ici? Onerim: ayri footer, info ton Tesi CTA ile karismasin.
6. Salute ring %96 vs Profil Merkezi ring %73 — iki pulse cakisir mi? Onerim: Genel Bakis'ta daha kucuk ring, bilgi sinyali olarak kalsin.

---

## 10. Build Sequence

Tek PR, CSS rewrite + `profil-genel.js` builder re-template. Backend sifir. ~2 oturum.

1. Branch + baseline screenshot 414/1440.
2. `css/panels/genel-bakis.css` rewrite (~149 → ~520). Eski `card-icon-square`, `premium-gradient`, `profil-views`, `left-rail`, `right-rail`, `ht-feature-card` silinir; yeni `gb-salute/gb-identity/gb-feed/gb-zarf/gb-row/gb-studyo/gb-sig` gelir. Token-only.
3. `profil-genel.js` `buildLeftRail`/`buildRightRail`/`buildCenterColumn` → tek `buildGenelLayout`. Tum ID'ler + handler korunur.
4. Duyuru feed render path gb-feed template'ine baglanir.
5. Teklifler+Markalar loader row template gb-row.
6. Animation pass + dark mode QA.
7. Playwright smoke 414/1440 (feed like, Premium CTA, Profili Duzenle, studyo).
8. DeepSeek review → Tuna preview → merge `feat: K033 Genel Bakis editorial redesign`.

Diff: `genel-bakis.css` +~370, `profil-genel.js` -~40. Yeni dosya yok.

---

**Tek satirlik karar:** "3-kolon bento rail + HelloTalent feature kart + navy gradient premium + dagilmis widget'lar" yerine "salute hero + identity strip + spine duyuru feed + tek 'Tesi' zarfi + studyo footer". Backend zero touch, 1 PR, fit-and-finish editorial.
