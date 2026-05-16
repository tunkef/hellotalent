# Spec: destek.css @layer Refactor — 471 !important Eliminasyon

> **Tarih:** 2026-05-11 | **Tier:** T3 | **Status:** draft (Tuna onayı bekliyor)
> **Codex auto-trigger:** apply commit'te otomatik
> **Reform v3.4 FIX-2 BLOCKER**

## Context

`css/panels/destek.css` 886 satır, **471 `!important`** kullanımı. Kök neden (yorumda dokümante):

> "CSS-only override: profil-destek.js classes are preserved; this file fully replaces the legacy injectCSS() output via !important where the load-order would otherwise lose the cascade."

Yani `profil-destek.js` runtime'da `injectCSS()` ile inline `<style>` ekliyor. Bu inline style sayfa yüklendikten sonra geliyor, normal cascade order ile destek.css'i ezerdi. Çözüm: `!important` ile cascade'i tersine zorla.

Bu pattern:
- Specificity wars
- Browser DevTools'ta `!important` everywhere → debug zorluğu
- CSS hierarchy kaybı
- Performance: tarayıcı her selector için cascade tree rebuild

## Solution: `@layer` cascade refactor

### Yaklaşım

CSS `@layer` ile explicit cascade hierarchy kur. Layer order önceliği `!important`'tan üstün — layer'da olmayan inline style en alta gelir.

```css
@layer reset, base, components, panels, utilities;

@layer panels {
  #panel-destek {
    max-width: var(--editorial-max-w, 1200px);  /* !important YOK */
    margin: 0 auto;
    padding: 32px var(--editorial-pad-x, clamp(20px, 3vw, 32px)) 48px;
    background: transparent;
    border: 0;
    border-radius: 0;
  }
  /* ... 880 satır geri kalan ... */
}
```

`profil-destek.js` inline `injectCSS()` çıktısı layer'a sahip değil → cascade'de panels layer'dan sonra gelir → ezilir, ama destek.css'in `@layer panels` rule'u öne çıkar.

### İki adım

**Adım 1 (bu spec — düşük risk):**
- `css/panels/destek.css` tüm rule'ları `@layer panels { ... }` içine sar
- `!important` annotations DEĞIŞTIRME (geri uyumlu)
- Test: destek paneli görsel diff yok

**Adım 2 (sonraki spec — Codex review):**
- `profil-destek.js` `injectCSS()` fonksiyonunu kaldır
- destek.css'ten tüm `!important` annotations sil (find/replace)
- Test: Playwright destek panel snapshot + manuel dark mode

## ASCII layout (no change — sadece CSS refactor)

Destek panel mevcut layout korunur (886 satır, FAQ + ticket + journal). Sadece cascade architecture değişir.

## Token table

| Element | Property | Token | Light | Dark |
|---|---|---|---|---|
| #panel-destek | max-width | `--editorial-max-w` | 1200px | 1200px |
| #panel-destek | padding-x | `--editorial-pad-x` | clamp(20,3vw,32) | aynı |
| (geri kalan tokens.css'te tanımlı) | | | | |

Token değişikliği yok. Sadece `!important` removal.

## Dark mode parity

Mevcut `html[data-theme="dark"]` override'ları destek.css'te mevcut, layer hiyerarşisi etkilenmez.

## Edge cases

- Empty state: layer cascade FAQ list boşken doğru render olmalı
- Loading skeleton: shimmer animation @layer'da değil → çakışma yok
- Error: red-tinted alert layer'da
- Disabled: ticket form disabled state opacity → layer'da

## Implementation steps

1. **Yedek:** `cp css/panels/destek.css css/panels/destek.css.pre-layer-bak`
2. **@layer wrap:**
   - Dosyanın başına `@layer reset, base, components, panels, utilities;` ekle (eğer global tokens.css'te yoksa)
   - Tüm rule'ları `@layer panels { ... }` içine sar
3. **Test:** browser hard refresh, görsel diff
4. **Adım 2 (ayrı commit):** profil-destek.js injectCSS removal + !important strip

## Visual mockup

Yok — sadece refactor, görsel diff hedef YOK (regression yokluğu test).

## Verification

- `grep -c "!important" css/panels/destek.css` — Adım 1 sonrası **471 (aynı)**, Adım 2 sonrası **0**
- Playwright destek paneli snapshot eşit (visual regression)
- Dark mode toggle test
- AccessLint contrast (font color değişmedi, geçer)

## Codex review hedef

T3 zinciri: bu commit'te tier-detect T3 detect → codex-review-real.sh auto-trigger → @layer cascade architecture sağlam mı, browser compat sorun mu (Safari 15.4+ destekler).

## Risk

- `@layer` syntax modern (Chrome/Edge 99+, Safari 15.4+, Firefox 97+). HelloTalent target audience (Türkiye, çoğunluk modern browser): risk düşük.
- profil-destek.js inline `injectCSS()` mevcut → Adım 1'de çakışma yok. Adım 2'de removal sonrası test gerek.

## Approved? (Tuna)

- [ ] Onayla → frontend agent impl mode dispatch (Adım 1)
- [ ] Reddet
- [ ] Değiştir (ek yorum)
