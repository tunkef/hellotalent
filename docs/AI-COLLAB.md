# HelloTalent AI-COLLAB — Aktif Calisma Defteri

> Bu dosya yalnizca aktif is, son kararlar, acik riskler ve bir sonraki net adimi tasir.
> Kapanmis asamalar: `docs/ai-collab/AI-COLLAB-archive-asama1-61.md`
> Dosya buyudugunde (500+ satir) yeni arsiv dosyasina tasinir.


## Mevcut Durum

**Aktif is:** K037 hotfix round 3 — followed chip inline bg override removed (white bg + contain logolar)
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

