# Design Refactor — Faz 1: Token Consolidation

**Tarih:** 2026-04-17
**Kaynak:** /ultraplan çıktısı (cloud session)
**Durum:** Faz 1a tamamlandı (kısmi), Faz 1b devam ediyor

## Context

HelloTalent design system 6-faz refactor'ün foundation'ı. Hedef: tüm projede tek :root source of truth.

### Mevcut durum (Faz öncesi)

- `css/tokens.css` zaten 3-katmanlı (primitive/semantic/component) token sistemi tanımlıyor, `html[data-theme="dark"]` ile dark-mode üretiyor. Ama yalnız **2 sayfa** dogrudan link ediyor: `profil.html` ve `admin.html`.
- `shared.css` top-level `:root{}` blogu (9-48) tokens.css'in yarısını duplicate ediyordu. Ayrıca `@media(prefers-color-scheme:dark){:root{...}}` ikinci bir dark-mode mekanizması vardı.
- **11 HTML dosyası kendi `:root{}`** tanımlıyordu. Drift kaynağı.
- `yasal.html` shared.css yüklüyor ama `--text-primary`, `--bg-section`, `--text-muted` (tokens.css-özel semantic'ler) kullanıyor — sessiz fail.
- `tests/p3.regression.spec.js` Asama 35 ik.html'in `--text-*` tokenleri **kendi :root bloğunda** tutmasını zorluyor.

## Amaç

Tek :root source (tokens.css), tüm sayfalarda tutarlı; shared.css sadece component stilleri taşısın; ik/profil/giris/uye-ol/gate/admin/coach-studio/sifre-yenile/demo-dashboard-ik/index/hakkimizda/iletisim ayni token setinden okusun.

## Faz 1a — Tamamlandı (commit `0c25753`)

Scope: Clatu public-site tokens shared.css'e taşındı, 3 public page lokal `:root` silindi.

**Değişen dosyalar:**
- `shared.css` — Clatu tokens eklendi (`--bg-page`, `--bg-section`, `--bg-warm`, `--bg-warm-k`, `--verm-dark`, `--navy-dark`, `--text-primary`, `--text-muted`, `--font-d/b/m`, `--radius`, `--max-w`, `--pad`) + dark block'a ilgili dark değerler eklendi.
- `index.html` — lokal `:root` + `@media dark` silindi.
- `hakkimizda.html` — aynı.
- `iletisim.html` — aynı.

**Kanonik dark değerler (sayfalar arası drift çözüldü):**
- `--bg-section`: `#12141F`
- `--bg-warm`: `#141625`
- `--bg-warm-k`: `#0C0F1A`
- `--border`: `rgba(247,246,244,0.08)`
- `--text-muted`: `rgba(247,246,244,0.70)` (WCAG AA)

**Not:** `0c25753` commit mesajı başka bir paralel session (K032 Faz 2 runtime smoke) ile karıştı. Faz 1a kod içeriği doğru ama message misleading. Bu doküman gerçek Faz 1a kaydıdır.

## Faz 1b — Devam edecek iş

Ultraplan'a göre tam Faz 1 scope'u. Faz 1a bunun ~30%'u.

### Yapılacaklar

1. **`css/tokens.css` genişlet**
   - Clatu public-site semantic tokens ekle (--bg-page, --bg-section, --bg-warm, --bg-warm-k, --text-primary, --text-muted, --pad, --max-w, --radius, --font-d/b/m alias)
   - Dark mode: `html[data-theme="dark"]` + fallback `@media(prefers-color-scheme:dark):root:not([data-theme="light"])`

2. **`shared.css` temizle**
   - Top-level `:root{}` (9-48) sil, `@import url('css/tokens.css')` ekle
   - `@media(prefers-color-scheme:dark){:root{...}}` (862-878) sil
   - Component stilleri (header, footer, nav) kalır

3. **8 sayfadan `:root` sil + tokens.css link ekle**
   - `ik.html` (19-41 :root)
   - `admin.html` (20-35)
   - `giris.html` (17)
   - `uye-ol.html` (18)
   - `gate.html` (16)
   - `sifre-yenile.html` (17)
   - `coach-studio.html` (27-30)
   - `demo-dashboard-ik.html` (16)

   Her sayfaya `<link rel="stylesheet" href="css/tokens.css?v=20260417">` ekle (shared.css'ten önce).

4. **`tests/p3.regression.spec.js` Asama 35 guard update**
   - ik.html `:root` içinde `--text-*` arama kaldır
   - Yerine: tokens.css link var + var(--text-*) kullanımı ik.html'de.

5. **Bonus: yasal.html fix**
   - `--text-primary`, `--bg-section`, `--text-muted` undefined bug tokens.css ile çözülür.
   - `--text-secondary` yine undefined kalacak (yasal.html kodundan gelir, ayrı fix).

### Risk

- **Dark mode tutarsızlığı**: script'siz sayfaların (admin, index, hakkimizda, iletisim, yasal, coach-studio, sifre-yenile, demo-dashboard-ik) dark toggle'ı OS-prefer seviyesinde kalır. Tokens.css fallback `@media(prefers-color-scheme:dark):root:not([data-theme="light"])` ile davranış korunur.
- **Token drift**: ik.html `--green:#10B981`, tokens.css `--green: var(--color-green) → #16a34a`. Test et, cakışma varsa ik.html'de sabit renk kullanımını koru.
- **Admin.html yorum satırı** (14): "K030 FAZ C hotfix" yorumu artik gecerli değil — güncelle veya sil.

### Doğrulama

1. `npx playwright test tests/dark-mode.spec.js --reporter=list` → 12/12 PASS
2. `npx playwright test tests/p3.regression.spec.js --reporter=list` → Asama 35 güncel, 910+ suite yeşil
3. `npx playwright test --reporter=list` → tam suite
4. Manuel visual: her sayfa (profil, ik, admin, giris, uye-ol, gate, sifre-yenile, coach-studio, demo-dashboard-ik, index, hakkimizda, iletisim, yasal) × **light + dark** × **mobile 390×844 + desktop 1440×900**.
5. Regression spot-check: landing dark mode, profil dark toggle (`localStorage ht_theme_preference`), admin login ekranı.
6. Cache-bust: shared.css + tokens.css query string 20260417.

## Out of Scope

- `markalar-flip-v2.html`, `mk-card-redesign-playground.html` — playground, dokunulmaz.
- `docs/superpowers/specs/*.html` mockup'lar — fixture, dokunulmaz.
- `profil.css` / profil component CSS'leri — Faz 5 kapsamında.
- Faz 2-6 (ik dashboard redesign, typography tier, empty states, profil component extract, a11y).

## Faz Sırası (6-faz genel)

| Faz | Scope | Durum |
|-----|-------|-------|
| 1 | Token consolidation | 1a ✅ / 1b 🟡 |
| 2 | ik.html dashboard aha-moment redesign | bekliyor |
| 3 | Typography tier + illustration style guide | bekliyor |
| 4 | Loading + empty state component library | bekliyor |
| 5 | profil.html component extraction | bekliyor |
| 6 | a11y + cross-role color rules | bekliyor |
| mikro | footer dark mode toggle | bekliyor |

## Referanslar

- Ultraplan cloud session: `claude.ai/code/session_019aHvtpGAPwqfn8tuXTjaqo`
- Faz 1a commit: `0c25753`
- Design critique geçmişi: `c5d7afb` (index design pass), `f99b893` (public-pages muted kontrast)
