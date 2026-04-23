# hellotalent.ai — Current State
> Son guncelleme: 23 Nisan 2026 | Asama 82.7 — Hex Faz 3 (admin/) + 'use strict' Faz 2 (5 modul batch)
> Aktif Odak: Tum CSS dosyalari raw hex'ten arindirildi (toplam 6 faz K048+K049 1+2+3). 11 eski modulden 5'i strict mode'a alindi (shared/profil-bootstrap/profil-cv/profil-events/profil-firsatlar). Kalan 6 modul: profil-studio (3891 satir, en buyuk), profil-destek (1190), profil-settings (872), admin-announcements (867), profil-premium (262), profil-visibility (354). Sonraki: ya kalan 6 modul Faz 3, ya display:none JS toggle audit, ya Tuna Codex gate kararı.
>
> ── K049 Hex Faz 3 (admin sub-folder) — 23 Nisan 2026 ──
>
> **Scope:** css/admin/image-editor.css (20 hex) + css/admin/markalar.css (14 hex) → token. 5 yeni primitive token (--color-emerald-bright, --color-red-warm, --color-cream-warm, --color-cream-soft, --color-pattern-grid).
>
> **Bulgu:** admin/image-editor.css'te navy/vermillion brand renkleri + transparency checkerboard pattern (#f0f0f0). admin/markalar.css'te tab/avatar/danger button cream + emerald. Hepsi token'a baglandi.
>
> **Test:** tests/k049-hex-purge-phase3.spec.js 4 structural guard (8 PASS). K048 + K049 Faz 2+3 toplam 60 PASS.
>
> ── K049 'use strict' Faz 2 (5 modul batch) — 23 Nisan 2026 ──
>
> **Scope:** shared.js (402) + profil-bootstrap.js (470) + profil-cv.js (538) + profil-events.js (584) + profil-firsatlar.js (436) — toplam 2430 satir.
>
> **Audit findings (hepsi temiz):**
> - 0 with statements, 0 dynamic-code-runner, 0 octal literal, 0 delete-variable.
> - Top-level reassign 27 satir — hepsi var-declared (Y/summary/targetRole local; currentUser/currentCVStoragePath/wizardDirty/pendingPanelSwitch profil-core veya profil-wizard'da global, cross-module load-order korunur).
>
> **Test:** tests/k049-use-strict.spec.js Faz 2'yi de kapsayacak sekilde generic'lestirildi (STRICT_MIGRATED array, her modul icin 2 guard = 24 PASS mobile+desktop).
>
> **Smoke regression:** 18/18 PASS — strict mode runtime breakage yok.
>
> **Kalan strict-eligible modul:**
> - profil-studio.js 3891 satir — en buyuk, daha derin audit gerek
> - profil-destek.js 1190 satir
> - profil-settings.js 872 satir
> - admin-announcements.js 867 satir — composer, ozenli audit (R2 fix sonrasi tekrar test)
> - profil-premium.js 262 satir
> - profil-visibility.js 354 satir
>
> **Cache-bust:** 20260423k049b → 20260423k049c.
>
> **Commit ayrimi:** Hex Faz 3 (commit 208fffa) + 'use strict' Faz 2 (bu commit, 5 modul + spec extend).
>
> ── Asama 82.6 (önceki) ──
> 'use strict' Faz 1 — profil-ui.js (1870 satir, en buyuk eski modul).
>
> ── K049 'use strict' Faz 1 (profil-ui.js) — 23 Nisan 2026 ──
>
> **Scope:** profil-ui.js (1870 satir, en buyuk eski modul) /* global */ comments sonrasi 'use strict'; directive eklendi.
>
> **Audit findings (hepsi temiz):**
> - Implicit global writes: yok. 24 top-level reassignment hepsi var-declared ident'lere (hasMatchInList L369, suppressSuggest L427, timer L693, resolvedPozisyon L961, selectedBrandInterests L1248, img L2122, v L2167 vs.).
> - with statements: yok.
> - Dinamik kod runner kullanimi: yok.
> - Octal literal: yok (rgba(0,0,0,0.04) string icinde hit olmaz).
> - delete variable: yok.
>
> **Global binding verification:** Top-level `var _brandIdLookup`, `function _initBrandCompanyLookup` vs. strict script mode'da global object'e attach olmaya devam eder (strict sadece fonksiyon body'sine global binding kisitlar, SCRIPT scope degil).
>
> **Regression:** smoke.runtime + profil.panel-delegation + K048 + K049 (hex purge + inline + state-drift + use-strict) = 86/86 PASS. Auth-required E2E (HT_TEST_EMAIL env var) kapsam disi.
>
> **Test:** tests/k049-use-strict.spec.js 3 guard (6 PASS mobile+desktop). Regression suite olarak kalir, profil-ui.js'den strict directive silinirse guard duser.
>
> **Kalan is:** Diger 25 eski modul (profil-bootstrap, profil-events, profil-settings, profil-inbox, profil-cv, profil-studio, profil-markalar, ik.js, ik-kampanya, shared.js vs.) case-by-case audit + strict migration. Ayri pass.
>
> ── Asama 82.5 (önceki) ──
> Composer state-drift audit (R2 disciplin — ik-kampanya R2-like fix). 4 composer audit edildi, 1 BLOCKER fix (ik-kampanya saveCampaign INSERT branch currentCampaignId capture).
>
> ── K049 Composer State-Drift Audit (23 Nisan 2026) ──
>
> **Scope:** INSERT/UPDATE branch'li composer'lar R2 pattern (admin-announcements.js commit 537294b) referansiyla audit.
>
> **Bulgu (1 BLOCKER):**
> - **ik-kampanya.js saveCampaign fallback INSERT (line 1119):** currentCampaignId yakalanmiyordu. Normal UI flow'da step1→2 auto-draft currentCampaignId'yi set eder (line 361), ancak save button re-click + error-then-retry senaryosunda (saveCampaign.insert error sonrasi retry) currentCampaignId null kalir → tekrar INSERT branch → DUPLICATE ROW. Fix: INSERT success sonrasi `if (!currentCampaignId && res.data && res.data.id) currentCampaignId = res.data.id;` (hideWizard reset'inden önce).
>
> **Audit temiz (3 composer):**
> - admin-announcements.js: R2 fix (537294b) existingRow reassignment mevcut ✓
> - admin-coach-content.js: coach_invites INSERT .select() yok, closure state yok, fire-and-refresh pattern ✓
> - admin-campaigns.js: admin review/update flow, composer degil, closure id yok ✓
>
> **Test:** tests/composer-state-drift.spec.js 5 structural guard (10 PASS mobile+desktop). Regression suite olarak kalir — yeni composer eklendiginde ayni disiplin enforce edilir.
>
> ── Asama 82.4 (önceki) ──
> K049 inline style migration Faz 2 — profil.html 13 cosmetic inline → utility class. 32 display:none inline JS toggle dependency nedeniyle korundu.
>
> ── K049 Inline Style Migration Faz 2 (23 Nisan 2026) ──
>
> **Scope:** profil.html cosmetic inline styles → components.css utility classes. 13 instance migrate.
>
> **Yeni utility classes (13):** .ht-helper-text-xs/-xs-mt-neg/-sm/-md/-md-wrap/-base/-base-mb, .ht-w-fit, .ht-link-inline, .ht-fw-600, .ht-caption-accent, .ht-upload-zone, .ht-file-input-overlay.
>
> **Migrate edilen elements:** status-badge aktif (width-fit), draft-timestamp-hint (helper-xs-mt-neg), avatar yükleme help text (helper-sm), avatar-file-input overlay, bio helper text (helper-base), bio-char-count, education caption accent, wiz-step helper texts (md + md-wrap), wiz-cv-zone (upload-zone), CV helper text (helper-base-mb), wiz-cv-filename (fw-600), wiz-premium-soon (link-inline).
>
> **Korunan inlines (32):** display:none inline (JS toggle via el.style.display) — class-based refactor ayrı koordineli JS sweep gerektirir. Bir sonraki audit pass'e ertelendi.
>
> **Test:** tests/k049-inline-purge-phase2.spec.js 4 guard (8 PASS mobile+desktop). profil.html total inline count 57 → 44.
>
> **Cache-bust:** 20260423k049a → 20260423k049b.
>
> **Sıradaki:** #4 composer state-drift audit (ik-kampanya.js + diğer INSERT/UPDATE composer'lar), #5 'use strict' profil-ui.js (1870 satır).
>
> ── Asama 82.3 (önceki) ──
> K049 hex purge Faz 2 — components + studio + wizard-editorial + duyurular.
> Raw hex purge 4 ek CSS dosyasinda tamamlandi. tokens.css 16 yeni primitive/semantic token. A1+A3 pending-approvals arsivlendi (A1: 90g GitHub PAT rotate kararı doğrulandı, A3: Codex gate Hafta 2'ye ertelendi).
>
> ── K049 Hex Purge Faz 2 (23 Nisan 2026) ──
>
> **Scope:** components.css 7 + studio.css ~55 (+~40 rgba brand variants) + wizard-editorial.css 5 + duyurular.css 2 raw hex → semantic token. Toplam ~80+ usage.
>
> **tokens.css yeni primitives (8):** --color-vermillion-deepest (#a33d1c), --color-vermillion-tint (#FFF5F2), --color-vermillion-glow (#E8663D), --color-success-strong (#059669), --color-success-text-deep (#065F46), --color-success-tile (#2D8A56), --color-warning-strong (#D97706), --color-red-step (#F87171), --color-navy-card-dark (#0b0f1a), --color-gray-500 (#6B7280), --color-gray-600 (#4B5563), --color-cream-pale (#FAFAF9).
>
> **tokens.css yeni semantic (8):** --rating-strong/-tint/-border/-bg-soft/-border-soft, --rating-growing/-tint/-border/-bg-soft/-border-soft, --success-tile-tint/-border/-bg-soft, --danger-strong-tint/-border/-bg-soft/-border-soft/-pressure, --hero-grad-verm-end, --hero-grad-navy-end.
>
> **wizard-editorial refactor:** --wz-* primitives artik global token referansi (--wz-navy: var(--color-navy), --wz-vermillion: var(--color-vermillion), --wz-hairline: var(--color-border), --wz-cream: var(--color-gray), --wz-muted: var(--color-muted-warm)). Dark mode --wz-muted-2 → var(--color-gray-500). Premium toggle slider !important hex → var(--toggle-off) + var(--color-vermillion).
>
> **studio.css bulk migration:** node script ile 24 unique hex mapping (case-insensitive). #2A3F7A/1E2D5E/162247 navy gradient → --sidebar-grad-* veya --color-navy-* direct. #C94E28/b84420/a33d1c vermillion gradient → --color-vermillion/dark + --hero-grad-verm-end. Status paletleri #059669/2D8A56/D97706/DC2626 + rgba tintleri semantic token'lara bağlandı.
>
> **Test:** tests/k049-hex-purge-phase2.spec.js 8 structural guard (16 PASS mobile+desktop). K048 + K049 + p3.regression full = 1010/1010 PASS. Pre-existing 8 dark-mode failure baseline korundu (profil-extras.css cssFiles list dışı).
>
> **Cache-bust:** 20260422k048a → 20260423k049a (scripts/bump-cache-bust.sh, uniform HTML).
>
> **Sıradaki iş sırası (Tuna onayı):** #3 inline style Faz 2 → #4 composer state-drift audit → #5 'use strict' profil-ui.js. A3 Codex gate bu sıra bittikten sonra Hafta 2 dogfood checkpoint.
>
> ── Asama 82.2 (önceki) ──
> Ultrareview pass #1 (R1 silent unpin + R2 retry duplicate) + P3 regression fix + K048 tail-cleanup
> Admin announcements data-corruption riskleri kapandi. MVP launch engeli olabilecek iki BLOCKER sifirlandi. Ultrareview 3 hakkin 1'i kullanildi (holistic scan, review-baseline branch = commit 79cdb58). Sonraki: 2. hak icin dar scope karari (auth/RLS subset vs IYS sonrasi newsletter legal pass), yeni feature veya Tuna UAT.
>
> ── Ultrareview Pass #1 (2 BLOCKER bulgu — admin-announcements.js) ──
>
> **R1 Silent unpin (admin-announcements.js:414)** — Composer edit path `existingRow.is_pinned` okuyordu ama schema sadece `pinned_until timestamptz` (3 migration dogruland: 20260413191504 / 20260413202813 / 20260417100000). Kolon okumasi her zaman `undefined` → checkbox unchecked → save() her edit'te `pinned_until:null` yaziyordu → pinli post'lar sessizce feed sticky slot'tan dusuyordu. Fix: list-renderer pattern'i (~line 133) yansit — `pinInput.checked = !!(existingRow && existingRow.pinned_until && new Date(existingRow.pinned_until) > new Date());`. Regression guard: tests/ultrareview-R1-silent-unpin.spec.js 3 test. Commit 022980a. Cache-bust admin-announcements.js `?v=20260423r1`.
>
> **R2 Retry duplicate row (admin-announcements.js:631-637)** — INSERT branch `postId` atiyor ama closure-scoped `existingRow` reassignment yapmiyordu. Media upload fail sonrasi composer "Tekrar Yayinla'ya basabilirsin" + submit re-enable → retry'de `existingRow` hala null → save() yeniden INSERT branch'ine giriyor → ikinci `ht_announcements` row + orphan media POST_1'de, yeni media POST_2'de. Schema'da DB-level dedupe yok. Fix: `postId` capture sonrasi `existingRow = Object.assign({}, payload, { id: postId, published_at: (ins.data && ins.data.published_at) || payload.published_at || null });` — UPDATE branch'in `published_at` sync disiplinini yansitir (line 625-628). Regression guard: tests/ultrareview-R2-retry-duplicate-row.spec.js 3 test. Commit 537294b. Cache-bust `?v=20260423r2`.
>
> **Ultrareview setup notu**: `/ultrareview` session-root /Users/peopleintk/Downloads/Hellotalent'tan calistirilmali (home /Users/peopleintk'tan "not a branch" hatasi verir). Holistic scan icin `review-baseline` branch ilk commit'e (79cdb58) bagli, remote'ta hazir. Cleanup: `git push origin --delete review-baseline` (2. ve 3. hak icin tekrar kullanilabilir).
>
> ── P3 regression test fix ──
>
> **K039 .header rule K048 token uyumu** — tests/p3.regression.spec.js line 3627 literal `#E5E3DF` / `#F7F6F4` bekliyordu; K048 hex purge bunlari `var(--border)` / `var(--bg-page)`'e cevirdi. Regex update: iki bicimi de kabul et (backwards-compat partial rollback icin). p3.regression full suite 960/960 PASS. Commit 23a980c.
>
> ── K048 tail-cleanup (3 alt madde) ──
>
> **K048 Hex purge — 294 raw hex → token**: layout.css 71 + profil-extras.css 81 + 6 panel CSS (inbox 13 + firsatlar 0 + premium 2 + sirketler 13 + merkezi 1 + genel-bakis 0 + ayarlar/bildirimler/destek/kimbakti 0) → semantic token. tokens.css'e 18 yeni primitive + semantic token eklendi: --color-red-deep/on-dark/bright, --color-green-bright/tile-dark, --color-sun/sun-bright, --color-navy-sidebar-top/dark/deeper/deepest, --color-muted-warm, --color-vermillion-bright/press, --on-navy-text/muted/subtle, --danger-deep, --danger-border-soft, --sidebar-grad-top/mid/bottom (theme-flipping), --toggle-on-strong, --icon-sun/sun-hover, --green-tile. Sidebar + premium-card gradient artik tamamen token-flip (light → dark otomatik, dark override rule redundant ama zararsiz). `var(--X, #hex)` K067 dark mode fallback pattern korundu (proge degil).
>
> **K048 Inline style migration — 11 inline → class**: profil.html deletion banner (.ht-deletion-banner + .ht-deletion-banner__cancel-btn), command palette modal (.cmdk-modal/.cmdk-modal-head/.cmdk-input/.cmdk-results), modal-icon variants (.modal-icon--danger/--verm/--navy), wizard-leave (.ht-btn--danger-bg), success OK (.ht-btn--full-w). components.css'e K048 section eklendi. 56 kucuk inline style (display:none toggles, helper text) kalan sonraki sweep icin.
>
> **K048 'use strict' — yeni modulden baslangic**: profil-studio-coach.js (K044 split yeni dosya) 'use strict' directive eklendi. Top-level var/function/const hala window'a bagli (script strict mode preserves global binding). Diger 26 eski modul riskli, case-by-case ileride.
>
> **Test**: tests/k048-hex-purge.spec.js (34 guard: 12 dosya icin raw hex sifir + 26 yeni token var + sidebar gradient token + HTML class migration + components.css class var + use strict directive). tests/dark-mode.spec.js 2 test K048 pattern'e guncellendi (cmdk + deletion banner class-based assertion). Full regression: k048 + token-scale + contrast + button-polish + error-ux + f1-f2-f3 = 114 PASS. Pre-existing 8 dark-mode failure profil-extras.css cssFiles list'te olmadigi icin (K048 oncesi vardi).
>
> **Cache-bust**: 20260422k047a → 20260422k048a (scripts/bump-cache-bust.sh, profil.html 47 refs uniform).
>
> ── Profil audit (K041-K047, Faz 1+2+3) ──
>
> **K041 Faz 1 HIGH (6 alt madde)**: Modal hijyeni (MODAL_SELECTORS unified observer + _htFocusTrap focus restore + ht-scroll-lock body class + .show class pattern cmdk/brand-follows-popup/pp-overlay/wlc-modal'de), skip link .ht-skip-link "İçeriğe atla" → #panel-genel (WCAG 2.4.1), --color-muted #6B7280 (4.45:1 fail) → #5E6671 (5.5:1 AA), button polish (opacity-hover yasak → var(--navy-deep), --danger-hover token, SVG stroke hex → currentColor/var(--success)/var(--danger)), error state UX (_htBuildErrorBanner role=alert + profil-firsatlar dual-fail banner + profil-inbox delete/restore toast + wizard showStepErrors scrollIntoView + role=alert), studio god-file split (4401 → 3886 satir, profil-studio-coach.js 559 satir yeni dosya — hydrateCoachFeed + render/detail/like + 4 paylasilan SVG constants).
>
> **K042 Markalar hero (Tuna UAT)**: Sag ust duplicate "25 TAKİP" kaldirildi (count CTA icinde), CTA'dan ok → silindi (**yeni brand kural: feedback_no_arrow_icons.md memory**), border-radius pill (999px) → 10px, CTA sk-hero__strip satirina sağa tasindi (chips solda, compact hero). Mobile responsive column.
>
> **K043 Dark mode + wizard data loss (Tuna UAT)**: Inbox `.ib-msg--in .ib-bubble` literal #1E2D5E + #C94E28 brand identity pin + html[data-theme='dark'] override. .ht-error-banner + .step-errors dark mode: rgba(220,38,38,0.12) bg + #FCA5A5 text + #EF4444 border. Wizard "Kaydetmeden cik" → clearDraft + location.reload + hash nav (DB'den fresh load, field'lar orijinal). **Yeni brand kural: feedback_darkmode_test_discipline.md memory — her UI degisikliginde dark+light+mobile zorunlu test, darkmode-auditor sorumlu, ayni sikayet 2. kez = Claude hatasi.**
>
> **K044 Faz 1F studio split**: profil-studio.js 4401 → 3886 satir. profil-studio-coach.js 559 satir yeni dosya (coach feed + hydrate + render). SVG constants (closeSVG studio drawer da kullandigi icin) coach.js'te, coach.js studio.js'ten ONCE yuklenir.
>
> **K045 Faz 2 MEDIUM (5 alt madde)**: Token scale + brand fix (theme-toggle sky-blue/indigo/mustard → navy/cream/vermillion, --text-display-xs/sm/md/lg tokens 22/28/32/40px, --radius-xs/xl/pill), toast tam refactor (4 variant + role=status + aria-live + manual close × + action button + stack bottom-right + slide-in/out animation), dead code purge (updateMarkalaBgDots stub), cache-bust sync (scripts/bump-cache-bust.sh helper + 47 refs uniform), wizard skip (#btn-wiz-skip ghost Step 3+ visible, saveProfileRPC + switchPanel('genel') + toast).
>
> **K046 Wizard silent mode (Tuna UAT hotfix)**: saveProfileRPC(onComplete, opts) artik {silent: true} kabul eder, success modal skip. btn-wiz-skip + btn-wiz-save-exit silent:true + returnToPanel=null (leak temizle). Onceki bug: skip → genel → stale modal → merkez 3-panel jump. Artik: skip → tek jump + toast.
>
> **K047 Faz 3 LOW (3 alt madde + 1 skip)**: Font-family tokenization (~280 raw string → var(--font-body/head/mono), admin + tokens.css + duyurular fallback var zaten literal kalir), attachDeleteConfirm timeout 2500→4500ms (mobile okuma), header tablist a11y pattern tam (id+aria-controls+role=tabpanel+aria-labelledby+aria-label+roving tabindex+ArrowLeft/Right+Home/End keyboard nav). 'use strict' kapsam disi birakildi (26 modul, runtime breakage riski).
>
> **Test**: 14 yeni spec dosyasi, 108+ yeni structural guard. Full regression 976/976+ yesil her faz sonunda.
>
> **Cache-bust final**: 20260422k047a (profil.html 47 refs uniform).
>
> **Yeni memory kurallari (2)**: feedback_no_arrow_icons.md + feedback_darkmode_test_discipline.md — home session MEMORY.md'de indexli.
>
> **Sonraki adim oncelik sirasi**:
> - Ultrareview 2. hak (3'ten) — karar: (a) auth/RLS dar scope PR uzerinden odakli pass, (b) IYS key geldikten sonra newsletter legal compliance pass, (c) full-scan gerekiyorsa yine review-baseline branch'ini yeniden kullan. Tuna tercih edecek. Review triage checklist (10 focus lens) hazir, guvenlik + KVKK + launch-blocker UX ile baslar.
> - Hex purge Faz 2: components.css 9 + studio.css 54 + wizard-editorial.css 12 + duyurular.css 2 raw hex. K048 genisletmesi. ~1h.
> - Inline style migration Faz 2: profil.html 56 kalan kucuk inline (helper text, display:none + bonus stil). `.text-xs-muted` / `.w-fit` gibi utility eklemek gerekebilir. ~1.5h.
> - 'use strict' kademeli: eski 26 modul icin case-by-case (profil-ui.js 1870 satir oncelik, her modul sonrasi full regression).
> - Composer state-drift audit: ik-kampanya.js + diger INSERT/UPDATE branch'li composer'larda R2 benzeri closure sync eksikligi var mi tara — admin-announcements.js disiplini referans.
>
> ── Admin (oncesi) ──
>
> Admin dark mode force-light fix — tokens.css @media (prefers-color-scheme: dark) --text/--muted'i dark'a cekiyordu, meta color-scheme sadece form elementlerini etkiliyor. Fix: admin.html <style> icinde ayni @media bloguna !important ile force-light (--text #111, --muted #6B7280, --bg #F7F6F3, --border #E5E3DF). Stat card explicit #FFFFFF bg + #4B5563 label + #111 value. JS'teki tum color:var(--muted)/var(--text) kullanimlari tokens propagation ile dogru renklere cekilir — her admin-*.js'i tek tek tarayip degistirmeye gerek yok.
> Admin audit Faz 3 (HIGH + MEDIUM + LOW) — inline onclick → delegated event listener (sidebar-nav click+keydown + logout buttons), empty state SVG icons (loading/empty/error inline SVG, @keyframes htSpin), .form-input + .form-select + .form-textarea + .form-group + .form-label + .form-help class component'leri, _htAdminCore.toast(msg,type) success/error/warning/info variant 4sn auto-dismiss, innerHTML → mount migration (admin-newsletter setHtml + admin-leads 3 innerHTML), tokens.css'e --admin-bg/header-mid/verm-hover/green/yellow/red consolidation + admin.html :root alias, h3 design system (16px/700w Bricolage + .admin-h3 utility) + buildSectionLabel h3 element + tests/a11y.admin.spec.js 8 structural guard. Cache-bust admin-core v=3, admin-campaigns/candidates/employers/leads/newsletter v=4.
> Admin a11y + design audit fix (7 BLOCKER) — status pill WCAG AA kontrast (rejected + draft + digerleri), <main> duplicate fix (3 → 1), sidebar nav-item klavye erisim (role=button + tabindex + keydown Enter/Space + aria-current=page), marka drawer aria-modal=true + aria-labelledby, tab ARIA (role=tab + aria-selected), 26 emoji UI purge (stat cards + empty state + status labels), hex → var(--token) (admin-newsletter: #C94E28/#1E2D5E/rgba), loading state aria-live=polite 7 panelde. Cache-bust v=3. CLAUDE.md brand rule 'no emoji in UI' uyumlu.
> Admin refactor Faz 2 — 9 modul (campaigns+candidates+employers+leads+studio-modules+support+ops-health+coach-content+announcements) panel HTML admin.html'den admin-*.js PANEL_HTML template'lerine tasindi. Her modul _htAdminMount* + _htAdminLoad* mount-first pattern. admin.html 981 → 806 satir (-18%). admin-campaigns 2 panel (review + campaigns) icin ayri mount fn. Cache-bust admin-*.js v=2, coach-content v=8, announcements v=20260423faz2.
> Admin refactor Faz 0+1 — admin-core.js (shared utility + panel mount helper). admin-newsletter.js PANEL_HTML template JS'e tasindi, _htAdminMountNewsletter + _htLoadNewsletter mount pattern. profil.html yaklasimi admin'e uygulaniyor, mod by mod. Faz 2: diger 9 modul ayni pattern.
> Hotfix — admin bulten panel 'audience ambiguous' RPC fix: admin_list_newsletter_subscribers CTE'de ns.audience table-qualified. Migration 20260423010000.
> Hotfix — admin.html login screen dark mode auto-inversion fix (k068x): color-scheme:light meta + explicit light renkler (label navy, input bg white, placeholder gray). Browser OS dark mode'da admin girisinde label invisible + input black bg problemi giderildi.
> Asama 81.1 — Newsletter Faz 1 tasarim + agent ownership lockdown (k068w):
>   email-send.ts dark-mode inversion block (color-scheme meta), hero band 6px gradient, eyebrow chip rozet, SVG sosyal ikonlar (LinkedIn/X/Instagram), heading separator, footer re-order + unsub top action.
>   Unsubscribe URL bug fix: newsletter-confirm sub.id degil unsubscribe_token kullaniyor, email-send template buildUnsubUrls() helper icin hem p.unsubscribe_url hem p.unsubscribe_token'dan URL insa eder.
>   Agent ownership K012: marketing-writer.md newsletter-campaign protokolu eklendi (avoid-ai-writing ZORUNLU, content-writer tone peer, legal-reviewer IYS/fabrikasyon check). chief-of-staff.md + docs/AGENTS.md matrix'e 3 yeni satir (aday + kurumsal kampanya + welcome sequence). admin-newsletter.js composer'a uyari kutusu + placeholder: "marketing-writer tarafindan uretilsin, fabrikasyon yasak".
>   v2 preview gonderildi (Tuna dogruladi: "tertemiz").
> Son guncelleme: 23 Nisan 2026 | Asama 81 — Newsletter Faz 1 push edildi
> Aktif Odak: Newsletter Phase 1 MVP altyapi canli. K012 karari. Cift kitle (aday + kurumsal) double opt-in. Capture + confirmation transactional aktif, welcome + campaign IYS key gelene kadar queue'da.
> Newsletter Faz 1 dosyalari: supabase/migrations/20260423000000_newsletter_phase1.sql (4 yeni tablo + 5 RPC + RLS), 5 yeni Edge Function (newsletter-subscribe/confirm/unsubscribe/send-campaign/iys-sync), email-send.ts 4 yeni template, uye-ol.html 3. checkbox (aday + kurumsal), shared.js+css footer form, newsletter-onay.html + newsletter-tercih.html, admin-newsletter.js + admin.html Bulten tab, profil settings Bulten toggle, docs/newsletter-dns-runbook.md, tests/newsletter-e2e.spec.js.
> Legal: KVKK default-unchecked checkbox + ETK 6563 IYS uyumu — iys-sync env yokken idle, key geldiginde drain. Double opt-in zorunlu. RFC 8058 1-click unsubscribe header. Cache-bust shared.js/css 20260409c → 20260423n1.
> Tuna Day 0 bekleyen: IYS basvuru (vergi no + MERSIS, 1-2 hafta), K016 KVKK avukat onayi, Cloudflare DNS erisim (SPF/DKIM/DMARC records).
> Onceki: Pass 10 (80.39) kapandi.
> Sonraki: IYS key gelince ilk warmup campaign (DNS runbook schedule), PostHog event tracking Faz 2.

> ── Eski focus satirlari (referans) ──
> Asama 80.39 — Pass 10 #11b (`fcdf5cc`) — Tuna feedback: Burak/Orkun crop y=0 → y=800/1200. Ustten kirp, alttan govde/kontekst goster. Cache-bust `p10g` → `p10h` (grup bump). TDD 40/40 PASS.
> Pass 10 #11 (`d354d8a`): kurumsal story 3 kart swap. 3 yeni Pexels portresi (Defne/Burak/Orkun). `story-merve.webp` delete → `story-orkun.webp`. Where meta marka-siz (İşe Alım Uzmanı / Talent Lead / CHRO). Cache-bust `?v=20260421p10g`.
> Pass 10 #10: aday story foto top-aligned crop (commit `fc761b3`). ffmpeg `crop=W:H:0:0,scale=1000:800` → top anchor, kafalar korundu. Cache-bust `?v=20260421p10f`. TDD 27/27 PASS.
> Pass 10 #9 (`26f475b`): in-page hash switch — `applyHashState()` extract + hashchange listener + same-hash click interceptor. Footer Aday/Kurumsal 4 senaryoda hero'ya.
> Pass 10 #8 (`0f386e0`): 3 aday story yenilendi (`story-selin.webp`+`kerem`+`zeynep`). 1168×784 → 1000×800 (5:4, .story-portrait aspect parite). Tuna verdigi hikaye metinleri TDK typo-fix ile. Where marka-agnostic (generic rol). Cache-bust `?v=20260421p10e`. TDD 27 PASS.
> Pass 10 #7 (`5ba75b2`): `index.html:585-591` IIFE hash handler'a `window.scrollTo(0, 0)` eklendi (segment name hash landing'de). Scroll-restoration bypass → footer'dan Aday/Kurumsal tiklayinca dogru segment + hero top. TDD 7 PASS.
> Pass 10 #6 (`1916d05`): `hero-iletisim.mp4` 463→195KB, 496×608 → 480×600 (4:5 exact). Poster 26→16KB. iletisim.html cache-bust `?v=20260421p10d`. TDD 10 PASS.
> Pass 10 #1 (`79083ac`): hero video swap. index.html `hero-aday.mp4` + `hero-isveren.mp4` Pexels. Aday 540→231KB, kurumsal 410→154KB. Cache-bust `?v=20260421p10`.
> Pass 10 #2 (`e15c85b`): auth gorseller. `auth-aday.webp` + `auth-kurumsal.webp` 784×1168 → 800×1000 4:5 Pexels. giris/uye-ol cache-bust `?v=20260421p10b`.
> Pass 10 #3 (`5d5a179`): hakkimizda hero video → img. `hero-hakkimizda.webp` 1000×1250 78KB Pexels. mp4+poster silindi (-755KB repo). K-041 reduced-motion script kaldirildi. Cache-bust `?v=20260421p10c`.
> Pass 10 #4 (`5d5a179`): giris + uye-ol `.logo-fixed` font-size 19px → `var(--text-3xl)` (20px). Mobile 18/17px. Index header-logo parite.
> Pass 10 #5 (`5d5a179`): 4 HTML footer (index/hakkimizda/iletisim/yasal) `.foot-nav` Aday/Kurumsal linkleri `giris.html?tab=…` → `index.html#adaylar` / `index.html#kurumsal`. Hash-based segment switch (index.html:580-584).
> Onceki: Pass 7 (80.28) + Pass 8 (80.29) + Pass 9 (80.30) kapandi.
> Sonraki: Tuna canli dogrulama + yeni madde.

## 1. Proje Ozeti

hellotalent.ai, Turkiye perakende sektorune ozel bir yetenek pazaryeri. Adaylar profil olusturup yetkinlik pratigi yapar, isverenler aday arar ve mesaj atar. Tech stack: vanilla HTML/CSS/JS (framework yok), Supabase (PostgreSQL + Auth + Storage + RLS + Edge Functions), GitHub Pages (custom domain). Repo: `github.com/tunkef/hellotalent`. P1-P3 tamamlandi, P4 planlanmis.

## 1b. AI Routing Snapshot

- Varsayilan operasyon modeli `free-cloud-first`.
- Mevcut `8GB MacBook Air` uzerinde local LLM/Ollama operasyonel bulunmadi; bu cihaz icin iptal edildi. Daha guclu donanimda yeniden degerlendirilebilir.
- `Playwright` tek UAT sahibidir; deploy sonrasi smoke, auth regression, candidate/employer kritik path ve bug reproduction burada kosar.
- `Groq` hizli Q&A/explain/translate katmani olarak kullanilir.
- `Cerebras` derin dosya review ve cross-file analiz katmanidir.
- `DeepSeek` diff review, security audit ve stage gate denetcisidir.
- `OpenRouter` ve `SambaNova` fallback havuzudur.
- `Claude Opus 4.7` varsayilan implementation modelidir (16 Nisan 2026 — Tuna Opus 4.7'yi test ediyor). Mimari trade-off, RLS/data contract ve root-cause debugging de ayni modelde.
- `Claude Sonnet` sadece Tuna ile home session iletisim modelidir; kod sahibi degildir.
- `Claude Haiku` mekanik okuma/ozet/modelidir; kod sahibi degildir.
- `Gemini` bugun operasyonel helper olarak bagli degildir; sadece status/health-check seviyesindedir. Ileride screenshot/log yorumlayici rolunde yeniden degerlendirilebilir.
- `scripts/aider-commit.sh` bir commit-message draft araci degil; `AI-assisted edit + auto-commit flow` aracidir.

## 1c. Design & Content Operations Snapshot

- Public-site tasarim akisi icin dis referans stack kuruldu: `Google Stitch MCP` (layout/mockup referansi), `21st.dev` (component/pattern referansi), `Pro UI UX Max` (stil/palette direction), `Recraft API` (illustration/asset generation).
- Bu stack production code yazmaz; son implementasyon her zaman repo kurallarina uygun vanilla HTML/CSS/JS olarak elle uyarlanir.
- Public-site style direction kilitlendi: editorial, premium, sicak, whitespace agirlikli, brand-led. Vermillion baskin, navy authority. Generic SaaS gorunumu, mor gradient, stock-LLM estetik ve siradan marketing page dili istenmiyor.
- Illustration truth su an `docs/design-illustration-brief.md` icinde tutulur. Recraft ile uretilecek asset'ler burada tanimlanan karakter/stil sistemine uymak zorundadir. Aktif stil notlari: karakterlerde `Roundish flat` ana referans, `Vivid shapes` ikincil grafik destek, genis arka plan ve insansiz konseptlerde `Segmented Colors` referansi.
- Ilk execution scope yalnizca public pages: `index.html`, `aday.html`, `isveren.html`, `giris.html` ve gerekirse yeniden aktif edilecek diger marketing/content sayfalari. Bu design/revision track'inde `profil.html`, `ik.html`, `admin.html`, `coach-studio.html` ve dashboard yuzeylerine dokunulmaz; kullanici acikca isterse istisna olur.
- Content revizyon akisi `AI-SEO` + anti-AI-writing copy discipline ile yurur. Hedef sadece SEO degil; insan tarafinda ikna edici, LLM tarafinda extractable/citable, net ve guvenilir metinler uretmektir.
- Public copy kurallari: Turkce, somut, proje-ozel, abartisiz, fabricated proof/stat/testimonial yok, bos hype yok, yapay ve jenerik AI tonu yok. Feature yerine outcome dili, ama her claim gercek veriye veya urun gercegine dayanir.
- Siradaki ana is akisi: once `index.html` ve public-site sayfalarinin tasarim/revizyonu, paralelde site icindeki mevcut metinlerin HelloTalent positioning'ine gore temizlenmesi ve yeniden yazilmasi. Dashboard redesign bu fazin parcasi degildir.

## 2. Canli Ozellikler

- **Gate sayfasi (index.html)** — Clatu-first split gate: 2 zone (Is Ariyorum / Yetenek Ariyorum), smooth fade animasyonlar (opacity-first, minimal hareket), isveren illustration desktop mirror, SVG illustrasyonlar, prefers-color-scheme dark mode, responsive | `index.html`, `assets/gate/`
- **Aday landing (aday.html)** — Clatu editorial: hero (trust pills + Google signup + E-posta), features split + mini bento (6 esit kart), 3 step cards (vermillion numaralar, SVG illustrations), "Kimin icin?" 3 kategori, final CTA split layout (metin sol + gorsel sag), login popup bypass | `aday.html`, `assets/aday/`
- **Isveren landing (isveren.html)** — Navy theme: hero tek CTA (Yetenekleri Kesfet → lead form), features bento (6 esit kart, kompakt mobil), 3 step cards (ferah spacing), "Kimin icin?" split layout (3 minimal chip + gorsel sag), lead form (CRO copy), navy login button | `isveren.html`, `assets/isveren/`
- **Hakkimizda (hakkimizda.html)** — Premium editorial: vizyoner hero, quiet luxury mission split (kusursuz eslesme + diskresyon + tag'ler + kolon-hizali CTA butonlari), value cards (3 SVG), contained rounded scene gorsel | `hakkimizda.html`, `assets/hakkimizda/`
- **Iletisim (iletisim.html)** — Premium contact: hero + illustration, 3 contact cards (Mail Gonder/Demo Talep Et butonlari, yuvarlak ikonlar), HQ section (sadeles metin + adres + randevu CTA + kare sosyal ikonlar + Google Maps), contained rounded scene gorsel | `iletisim.html`, `assets/iletisim/`
- **Yasal (yasal.html)** — Tek sayfada 4 yasal metin: Gizlilik Politikasi, Kullanim Sartlari, KVKK Aydinlatma, Cerez Politikasi. Navy hero + tab butonlari, icerik degisiyor. URL hash destegi (#kvkk). Cerez tercihleri toggle. Dark mode. | `yasal.html`
- **Aday profil wizard** — 4 adimli onboarding, deneyim/egitim/dil/sertifika/tercih | `profil-wizard.js`
- **Glassmorphic float header** — LinkedIn-style, 5 nav, avatar dropdown, dark mode toggle | `profil.html`
- **Markalar paneli** — 96 marka, informative card v2 (cover gorsel, magaza/calisan sayisi, takip butonu), 31 marka gorseli optimize, company/brand hierarchy | `profil-markalar.js`
- **Yetkinlik sistemi** — 29 KF yetkinlik, 34 rol haritasi, bento grid, premium reading view | `profil-yetkinlik.js`
- **Mulakat Kocu (Studio)** — STAR+T metodu, lobby + kurs detay + odak modu + completion, streak, spaced repetition, inline rol secimi, **mini egitim dashboard (rozet tooltip + ilerleme karti + sonraki oneri CTA)**, AI degerlendirme (1 hak/beta) | `profil-studio.js`
- **AI feedback** — Edge Function (gpt-4.1-mini), pg_cron pipeline, hero kart + accordion UI | `supabase/functions/journal-feedback/`
- **AI CV Optimize** — Anthropic (claude-sonnet-4) Edge Function, canonical ATS template, source CV ingestion (PDF text + DOCX unzip + DOC best-effort), **Beta: 1 kullanim hakki/aday (ai_cv_used), hak bittikten sonra "cok yakinda" mesaji** | `supabase/functions/cv-optimize/`, `profil-cv.js`
- **Streak sistemi** — gunluk seri, freeze/geri kazanim, review oneri | migration 20260327-28
- **Employer onboarding (P3)** — tek/coklu marka, company linking, kampanya wizard, team system live; domain verify planli, portfolio management sinirli | `ik.html`
- **Bi-directional messaging** — employer DM, candidate reply, split-pane, realtime | `profil-inbox.js`
- **Email infrastructure** — outbox pattern, Resend API, pg_cron, 3 template | Edge Functions
- **Coach sistemi** — coach_invites, posts, likes, 6 kategori | `coach-studio.html`
- **Premium gating** — subscription schema hazir, iyzico defer; **MVP_FREE_TIER=true: beta 3 ay ucretsiz**. AI ozellikleri 1 hak/kullanici (ai_cv_used + ai_assessment_used). Tum badge'ler "PREMIUM · 3 ay ucretsiz". Beni One Cikar aktif. Firsatlar (eski Teklifler) tab acik (blur kaldirildi) + beta erisim notu — FAZ A rename yapildi, FAZ B rewrite'da premium gate tamamen kalkacak | `profil-premium.js`, `profil-firsatlar.js`
- **Destek merkezi** — support_articles + tickets, 6 seed makale | `profil-destek.js`
- **Ops Health dashboard** — admin panel, failed email tracking | `admin-ops-health.js`
- **Security monitoring** — security_audit_log tablosu, haftalik RLS audit cron (Pazar 4am), get_security_dashboard() admin RPC | `20260406100135_lb6_security_monitoring.sql`
- **Iki adimli dogrulama (2FA/TOTP)** — Supabase MFA API, profil ayarlarinda etkinlestir/kapat, giris sirasinda challenge modal, Google/LinkedIn OAuth dahil tum login akislarinda | `profil-settings.js`, `giris.html`
- **Kim Bakti** — header icon, goruntulenme sayaci | `profil-kimbakti.js`
- **Dark mode** — 7-faz hardening, 24+ test | `css/tokens.css`, `css/layout.css`
- **Design system CSS overhaul** — profil.css (3223 sat) → 7 modular CSS dosyasina bolundu, 3-katmanli token sistemi (primitive/semantic/component), ht- prefix'li component class'lari (ht-btn, ht-card, ht-chip, ht-input, ht-modal, ht-toast, ht-toggle), dual-write migration (eski class'lar korunarak yeni class'lar eklendi), JS factory fonksiyonlari guncellendi | `css/`, `profil-ui.js`, `profil-wizard.js`, `profil-settings.js`, `profil-bootstrap.js`, `profil-draft.js`
- **Beni Oner** — aday gorunurluk toggle, avatar yesil glow | `profil-visibility.js`
- **Profile completion scoring** — >=45% threshold, sync trigger | migration 035-036
- **Gate logged-in redirect** — aday→profil.html, isveren→ik.html, session check | `index.html`
- **Yasal birlestirme** — 4 eski yasal sayfa (gizlilik/kvkk/kullanim/cerez) yasal.html'e birlesti, eski dosyalar silindi | `yasal.html`
- **K029 Security Audit** — 3 katmanli (security/code-quality/a11y-perf), 50+ fix, 10 agent parallel audit | K029
- **Security hardening** — CV signed URLs (private bucket), employer PII strip (RPC wrapper), CSP header, X-Frame-Options, CORS restrict, password policy, hr_profiles INSERT guard, is_employer() onboarding check, input validation (telefon/email/sifre), modal focus trap, noopener | Asama 71
- **Studio CSS extraction** — profil-studio.js injectCSS (890 satir) → css/studio.css ayri dosya | `css/studio.css`
- **Unified Landing Page** — Gate kaldirildi, tek LP: Adaylar/Kurumsal segment toggle (bunq referans), Clatu-aligned CSS, sektor bazli brand social proof (her iki segment), navy kurumsal hero, mobil responsive toggle (desktop header / mobil hero), landscape optimize | `index.html`
- **Auth Pages Split** — Kayit (uye-ol.html) ve giris (giris.html) ayrildi. Aday: ad soyad + email + telefon + sifre + sifre tekrar + 2x KVKK checkbox + OAuth. Kurumsal: + sirket adi + web sitesi. Sifre goz ikonu. KVKK acik riza ayri checkbox | `uye-ol.html`, `giris.html`
- **Kurumsal Demo Dashboard** — Employer giris sonrasi demo placeholder: 4 statik fake aday karti, CTA, auth guard | `demo-dashboard-ik.html`
- **Bot Protection** — 3 katman: Cloudflare Turnstile (invisible) + honeypot field + server-side Edge Function verify. Registration rate limit (3/5dk). Password reset cooldown (60s) | `uye-ol.html`, `supabase/functions/verify-turnstile/`
- **Role Tampering Guard** — user_metadata.role → app_metadata.role (DB trigger: signup sync + update guard). Tum client-side role check'leri app_metadata'dan | 3 DB trigger, 8 dosya
- **KVKK Consent Audit Log** — consent_log tablosu, server-side timestamp, auto-insert trigger on signup, RLS korunmali | `consent_log` tablosu
- **Avatar signed URL sistemi** — Tum avatar/cover gorselleri private bucket signed URL ile yukleniyor, HT.signStorageUrl helper | shared.js, coach-studio, ik, profil-preview, profil-genel, admin-coach-content
- **CSP tightening** — wss:// realtime, Sentry ingest fix, Google Maps frame-src, dead Sentry entry cleanup | Tum 13 HTML

## 3. Dosya Haritasi

| Dosya | Gorev |
|-------|-------|
| `shared.js` | Supabase client init, header/footer inject, page-aware login redirect, hamburger menu (Adaylar/Isverenler/Hakkimizda/Iletisim), footer: 3-kolon (brand+nav sol, sosyal sag), copyright+DEI alt satir |
| `shared.css` | Design system tokenleri, glassmorphism header, mobile menu (opak dark bg), footer 3-kolon grid + kompakt mobil, LP tokenleri |
| `yasal.html` | 4-tab yasal bilgiler sayfasi (gizlilik/kullanim/kvkk/cerez), navy hero, dark mode, ~570 satir |
| `index.html` | Gate sayfasi — Clatu split (flex expansion hover), SVG illustrations, ~280 satir |
| `aday.html` | Aday landing — Clatu editorial, hero+bento+steps+who+CTA, ~520 satir |
| `isveren.html` | Isveren landing — navy theme, hero+bento+steps+who+lead form, ~510 satir |
| `hakkimizda.html` | Hakkimizda — premium editorial, hero+mission+values+CTA, ~230 satir |
| `iletisim.html` | Iletisim — contact cards+HQ split+map+scene, ~260 satir |
| `profil.html` | Ana aday sayfasi (~6300 satir), panel switch, header |
| `css/tokens.css` | 3-katmanli design token sistemi (primitive → semantic → component) + dark mode overrides |
| `css/layout.css` | Reset, header, sidebar, theme toggle, loading, panels, bottom nav |
| `css/components.css` | Forms, buttons (ht-btn 8 varyant), cards (ht-card), chips (ht-chip), inputs (ht-input), modals (ht-modal), toasts |
| `css/wizard.css` | Wizard progress bar, steps, form gruplama |
| `css/panels/genel-bakis.css` | Genel Bakis paneli stilleri |
| `css/panels/merkezi.css` | Merkezi panel (profil formlari) stilleri |
| `css/panels/sirketler.css` | Sirketler paneli stilleri |
| `profil-core.js` | Auth guard, session init, panel routing |
| `profil-data.js` | DB CRUD (save_candidate_profile RPC), veri yukle/kaydet |
| `profil-ui.js` | DOM helpers, avatar, delete confirm, panel render (~1870 satir) |
| `profil-wizard.js` | 4-step onboarding wizard, dirty flag, draft |
| `profil-draft.js` | LocalStorage draft kaydet/yukle/temizle |
| `profil-helpers.js` | trLower, titleCaseTR, PRESERVE_CASE, normalize |
| `profil-events.js` | Global event listeners, Cmd+K palette |
| `profil-bootstrap.js` | Sayfa yuklendiginde calisacak init sequence |
| `profil-genel.js` | Genel Bakis dashboard, HT info karti, brand teaser (cover gorsel), coach feed |
| `profil-summary.js` | Profil ozet karti, completion bar |
| `profil-settings.js` | Ayarlar paneli, bildirim toggle'lari, hesap islemleri |
| `profil-markalar.js` | Marka flip-card grid, _BRAND_COLORS, hover reveal |
| `profil-yetkinlik.js` | 29 yetkinlik + 34 rol haritasi, wizard, bento reading view |
| `profil-studio.js` | Studio: STAR+T, streak, AI feedback, spaced repetition, modules |
| `profil-inbox.js` | Mesaj kutusucandidatethread, reply, realtime subscription |
| `profil-kimbakti.js` | Kim Bakti goruntuleme widget |
| `profil-visibility.js` | Beni Oner toggle, is_active kontrol |
| `profil-premium.js` | Premium gate, demo checkout, entitlement check |
| `profil-firsatlar.js` | Firsatlar paneli editorial rewrite (FAZ B + C): .frs-* namespace DOM emitter, premium gate kaldirildi, campaigns RPC filtered to 4 type ('offer','employer_branding','store_opening','brand_story'). hiring_boost hariç. Demo fallback DB bos ise. textContent-only (no innerHTML user data). |
| `css/panels/firsatlar.css` | Firsatlar FAZ B+C editorial stylesheet — .frs-* vocabulary + 4 type accent modifier (offer/branding/opening/story), K069 premium pattern turevi, dark mode via --editorial-* tokens. |
| `profil-locations.js` | Sehir/lokasyon secimi |
| `profil-cv.js` | CV yukleme/indirme |
| `profil-destek.js` | Destek merkezi, ticket olusturma |
| `profil-preview.js` | Profil onizleme |
| `ik.html` | Isveren paneli: aday arama, mesajlasma, onboarding |
| `ik-kampanya.js` | Isveren kampanya yonetimi |
| `giris.html` | Login only (aday + kurumsal tab), LinkedIn/Google OAuth, Beni Hatirla, MFA |
| `uye-ol.html` | Kayit sayfasi: aday + kurumsal tab, KVKK checkbox, Turnstile, honeypot |
| `demo-dashboard-ik.html` | Kurumsal demo placeholder: fake aday kartlari, auth guard |
| `admin.html` | Admin paneli: aday/isveren/coach/ops/support/campaigns |
| `admin-*.js` | Admin alt modulleri (7 dosya) |
| `coach-studio.html` | Coach icerik olusturma arayuzu |

## 4. DB Durumu

- **Baseline:** `20260322000000_baseline.sql` (migration 001-064 arsivlendi)
- **Son migration:** `20260409160000_fix_hr_profiles_onboarding_completed.sql` (Supabase DEPLOYED)
- **Yeni tablolar (9 Nisan):** `consent_log` (KVKK audit)
- **Yeni trigger'lar (9 Nisan):** `trg_sync_role_on_signup`, `trg_guard_role_on_update`, `trg_log_consent_on_signup`
- **Yeni Edge Function (9 Nisan):** `verify-turnstile` (Cloudflare bot verification)
- **Toplam migration (baseline sonrasi):** 41+ dosya
- **Key tablolar:** `candidates` (bigint id), `companies` (bigint), `brands` (bigint), `hr_profiles` (uuid→auth.users), `experiences`, `education`, `candidate_languages`, `certificates`, `candidate_target_roles`, `candidate_blocked_companies`, `employer_messages`, `candidate_message_replies`, `employer_message_replies`, `email_outbox`, `subscriptions`, `employer_daily_usage`, `competency_definitions`, `role_competency_map`, `candidate_competencies`, `candidate_streaks`, `coach_profiles`, `coach_posts`, `coach_post_likes`, `coach_invites`, `studio_modules`, `candidate_studio_progress`, `badge_definitions`, `candidate_badges`, `candidate_journals`, `support_articles`, `support_tickets`, `company_teams`, `company_invitations`, `campaigns` (bigint GENERATED BY DEFAULT id), `campaign_reviews` (uuid id)

## 5. Aktif Backlog

1. ~~**Landing Page Redesign + Dark Mode**~~ — ✅ TAMAMLANDI (Session 63, 2 Nisan gece). index.html gate sayfasina donusturuldu (~110 satir). aday.html LinkedIn-tarzinda yeniden yazildi (~476 satir). isveren.html LinkedIn-tarzinda yeniden yazildi (~586 satir). shared.js header nav sadeleştirildi: kariyer, pozisyonlar, yetkinlik, blog, hakkimizda, isalim-rotasi **nav'dan kaldirildi**. shared.css 14 LP tokeni eklendi. Dark mode eklendi (3 sayfa, system preference default). Nav active link brand renkleri: aday=vermillion, isveren=navy. **397 test PASS** (365 P3 + 32 smoke). Commits: 679c4e2–ba9e452 (12 commit).
2. ~~**Studio duration migration deploy**~~ — ✅ TAMAMLANDI (30 Mart). `20260329010000_studio_duration_fix.sql` deploy edildi.
2. ~~**T12 — Isveren kampanya wizard DB**~~ — ✅ TAMAMLANDI (Session 52, 30 Mart). Tablolar (`campaigns` 45 kolon + `campaign_reviews`), 5 enum type, RLS (6 policy: select/insert/update/delete employer + admin ALL), `campaign-assets` Storage bucket (public read, authenticated upload), `updated_at` trigger — hepsi canli. Eksik employer DELETE policy `20260330093056_campaign_wizard_backend.sql` ile eklendi. Frontend (`ik-kampanya.js` 1179 sat, `admin-campaigns.js` 231 sat) hazir. Wizard end-to-end calismaya hazir.
3. **Coach media V1 DB deploy** — `20260322142905_coach_media_fields.sql` ✅ TAMAMLANDI (Session 49, 30 Mart). `coach_posts.cover_image_url` + `cover_image_alt` kolonlari canli, nullable text.
4. **Badge genisletme** — ✅ TAMAMLANDI (Session 50, 30 Mart). 9 yeni rozet (pratik 5/10/25/50, seri 7/30 gun, jurnal 1/5/10). 3 yeni rule_type (practice_total, streak_longest, journal_count). evaluate_candidate_badges genisletildi + record_yetenek_practice/update_candidate_streak/upsert_studio_journal hook'landi. 5 yeni ikon (flame, pen, medal, diamond, star). Migration: `20260330010000_badge_extension.sql`.
5. **Design system token migration** — ✅ T05-T08 product tarafinda TAMAMLANDI (Slice A+B+C+D). Session 48 Slice C: 8 HTML dosyasi (giris, gate, sifre-yenile, coach-studio, admin, isveren, aday, index) — font-size + brand hex → token. profil.css T07 regression da duzeltildi (5x color:var(--text) → var(--text-primary)). Session 59 / Asama 33-35 ile Slice D kapandi: `ik.html` local style blok token migration'i yapildi, local `--text-*` token source fix eklendi, p3 regression guard yazildi. Kalan yalnizca **Slice E**: JS `.style.` track'i (defer, product blocker degil).
6. ~~**T13 — Smoke/Auth test hygiene**~~ — ✅ TAMAMLANDI (Session 53, 30 Mart). 25 fail → 1. Root cause: Cloudflare Access tum live sayfalari blokluyor, Playwright DOM'a erisemiyor. Fix: `playwright.config.js`'e `webServer` (npx serve -p 3000) + `baseURL: localhost:3000` eklendi. `hellotalent.smoke.spec.js` hardcoded `https://hellotalent.ai` → relative path. Gate testi form doldurma ile duzeltildi. Font testi `document.fonts.load()` ile duzeltildi. `giris.html` login button'a `id="btn-aday-giris"` eklendi. Auth setup BLOCKED: `HT_TEST_EMAIL` / `HT_TEST_PASSWORD` env var'lari set edilmeli — set edilince 12 e2e testi de calismaya hazir.
7. ~~**T14 — Label accessibility audit**~~ — ✅ TAMAMLANDI (Session 54, 30 Mart). 4 dosya: `giris.html` (10 label for + 1 modal close aria-label + 1 forgot-email label), `gate.html` (2 label for), `index.html` (6 aria-label + 5 label for HR modal), `ik.html` (filter-sehir span→label, 2 range aria-label, 2 select aria-label, 2 modal-close aria-label, 26 form-label for attr, 2 team invite aria-label). 68/68 smoke pass.
8. ~~**Dark mode remaining**~~ — ✅ TAMAMLANDI (Session 55, 30 Mart). `profil-settings.js` 7 alert()/confirm() → `_htAlert()`/`_htConfirm()` dark-mode-aware DOM modal'larına çevrildi. `gate.html` + `giris.html` + `ik.html`: theme-init script + `html[data-theme="dark"]` CSS eklendi. 68/68 smoke pass.
9. **Pozisyon gorunum/esleme metrikleri** — backend counter/trigger gerekli, frontend truth-sync edildi (sahte 0 yerine "yakinda aktif" mesaji)
10. **iyzico/Stripe checkout** — schema hazir, merchant hesap + API key gerekli (**her zaman en son**)
11. ~~**Supabase Advisor Fix'leri (SA1-SA5) + LB6 + 2FA**~~ — ✅ TAMAMLANDI (Session 66, 6 Nisan). SA1-SA5: search_path + FK index + cron + bio RPC. LB6: security_audit_log + haftalik RLS audit + security dashboard. 2FA: TOTP enrollment (ayarlar) + login challenge (giris.html). Code review fix'leri: Sonnet reviewer 6 sorun + DeepSeek 4 ek bulgu — hepsi duzeltildi. **820/833 Playwright test PASS** (12 auth = bilinen blocker, 1 setup = env var eksik).
12. ~~**Design System CSS Overhaul (Kademe 0-3)**~~ — ✅ TAMAMLANDI (Session 67-68, 6 Nisan). profil.css → 7 modular CSS. ht- component class sistemi. Task 14: Eski class alias temizligi tamamlandi (chip/field/exp-card/modal/card/btn dual-write → tek ht- class). Task 15: Inline style temizligi (6 utility class, ~50 inline style → class). Kademe 3: Header nav sadelesti (3 item), bottom nav yeniden siralandi (Genel/Kesfet/Mesajlar/Teklifler/Profil). **820/820 Playwright test PASS.**
13. ~~**Public-site design + content revision**~~ — ✅ TAMAMLANDI (Session 69, 7 Nisan). 5 public sayfa tamamen yeniden tasarlandi (index, aday, isveren, hakkimizda, iletisim). Clatu-first editorial design sistemi: Bricolage Grotesque + Plus Jakarta Sans, Vermillion dominant, Navy authority. prefers-color-scheme dark mode tum sayfalarda. Glassmorphism header (blur, dark mode). Login popup kaldirildi (direkt page-aware redirect). Hamburger menu: Adaylar/Isverenler/Hakkimizda/Iletisim. Gemini UAT geribildirim dongusu ile premium copy iterasyonlari (quiet luxury, CRO, diskresyon). 196/196 Playwright QA test PASS. Footer mobile grid fix. Responsive 4 viewport (390/768/1024/1440). Edge-to-edge scene gorselleri (WebP optimize). Google Maps embed (iletisim). "hellohunter" logo easter egg (isveren). Commits: 57aadcf–b222bd7 (~30 commit).

14. **Agent Skills Upgrade + Hedefli Audit (K029)** — 8 Nisan 2026. 12 yeni engineering/design skill kuruldu (Addy Osmani/Google + Supabase official + secici Impeccable). 38 total skill. 3 katmanli hedefli audit planlanmis: Katman 1 Security Sweep (AU1-AU6, blocker), Katman 2 Code Simplification (AU7-AU11, MVP 2 oncesi), Katman 3 A11y+Performance (AU12-AU18, incremental). Detay: `vault/02-urun/yapilacaklar.md` ve `vault/06-kararlar/karar-defteri.md#K029`.

15. ~~**K032 Runtime Playwright Smoke Suite — Faz 1**~~ — ✅ TAMAMLANDI (17 Nisan 2026, Asama 78). `tests/smoke.runtime.spec.js` (106 satir) — 4 hedef sayfa (profil/ik/admin/coach-studio) × 2 tema (light+dark) × 2 viewport (mobile+desktop) = 16 test. Auth mock yok (boot-time hata redirect oncesi fırlar). Codex K034 review: ilk FAIL (3 fix) → 2. PASS. 16/16 yesil. Commit `a9199b5`.

16. ~~**K032 Runtime Playwright Smoke Suite — Faz 2**~~ — ✅ TAMAMLANDI (17 Nisan 2026, Asama 78 devam). `tests/smoke.runtime.e2e.spec.js` (109 satir) + `scripts/seed-test-user.mjs`. profil.html 13 panel hash × 2 tema × 2 viewport = 52 test. Test user: kefelituna+k032@gmail.com candidate id=77. 52/52 yesil (~5.5dk). Commit `0c25753`+`67db4fb`.

17. ~~**K032 Runtime Playwright Smoke Suite — Faz 3**~~ — ✅ TAMAMLANDI (17 Nisan 2026, Asama 78 gece). 2 yeni test dosyasi + 2 yeni seed + 2 yeni auth setup + playwright.config.js 3 setup/6 e2e project. Test user'lar: `tkefeli@peoplein.com.tr` (employer) + `admin+k032@peoplein.com.tr` (admin). Prod admin guard: `kefelituna@gmail.com` hard-refuse. ik 40/40 + admin 48/48 = 88/88 yesil. **Bes bacakli koruma aktif.** K035 admin sertleştirme karar entry eklendi.

18. ~~**K032 Audit + Husky --no-stash Fix**~~ — ✅ TAMAMLANDI (17 Nisan 2026, Asama 78 gece kapanis). Commit `3668add`. Paralel agent audit (feature-dev:code-reviewer + Explore husky-drift) + targeted regression. 3 KRITIK + 4 ORTA + 3 LOW bulgu. **2 kritik fix:** (a) `.husky/pre-commit` `npx lint-staged --no-stash` — paralel tasarim session drift'i tamamen engellendi (bug root cause: lint-staged v16.4.0 `git stash --keep-index` partial staging durumunda unstaged dosyalari commit'e aliyordu). (b) `scripts/seed-test-user.mjs` `user_metadata.test_account: true` eklendi + `updateUserPassword` → `updateUser` (mevcut user'da da metadata sync). Targeted regression 479/479 yesil. **Faz 4 backlog somutlasti:** K-2 (panel activation assert, 15 dk), K-3 (admin setup navigate verify, 10 dk), O-1 (scripts/_supa-admin.mjs helper), O-2 (tests/helpers/runtime-signals.js helper + admin.e2e IGNORE drift), O-3 (waitForTimeout → waitForFunction), O-4 (docs/SECURITY-RUNBOOK.md service_role rotate). Genel verdict: **Dusuk borc.**

19. ~~**K032 Faz 4 kapanis (test suite hardening + seed/runtime helpers + security runbook)**~~ — ✅ TAMAMLANDI (17 Nisan 2026, Asama 78 bitis). Commit `3c88ad1`. K-2 panel activation assertion (3 spec, profil `yetkinlik → mulakat` alias map), K-3 admin auth setup `#admin-shell.active` guard. O-1 `scripts/_supa-admin.mjs` shared admin API plumbing (3 seed refaktör, +145/-160 satir). O-2 `tests/helpers/runtime-signals.js` IGNORE/REGRESSION/attachCollectors/criticalFrom/contextSnapshot/waitForBootSettle (4 spec refaktör). O-3 `waitForBootSettle` two-phase wait (`_htBootstrapDone` sentinel + microtask flush). O-4 `docs/SECURITY-RUNBOOK.md` service_role rotate + test_account audit + incident response checklist. 161/161 K032 suite yesil (16 Faz 1 + 54 Faz 2 + 40 Faz 3A + 48 Faz 3B + 3 setup). K-036 + K-037 backlog tespit edildi.

20. ~~**K-036 + K-037 + K-038 (admin hash-restore + ik onboarding gate + ik SELECT repair)**~~ — ✅ TAMAMLANDI (18 Nisan 2026). Commit `a8910e4`. K-036: `admin.html` showAdminDashboard artik `window.location.hash` okuyup switchPanel ile target panele iner + hashchange listener (browser back/forward + derin link). K-037: `ik.html:2427` + `ik.html:2508` onboarding gate `!hrProfile.sirket` → `!hrProfile.company_id` (sirket kolonu SELECT'te yoktu); `saveSirket` link_employer_to_company success sonrasi `onboarding_completed=true` set eder (is_employer() RPC gate). K-038: `ik.html:2365` SELECT `avatar_url` kolonu hr_profiles'ta yok — PostgREST 400 sessizce yutuluyordu, prof null kaliyordu, K-037 fix bile etkisizdi. SELECT listesinden `avatar_url` cikarildi, form-prefill kolonlari (sirket, sektor, buyukluk, web_sitesi, segment, merkez_sehir, magaza_sayisi, aciklama, aranan_profil, calisma_saatleri, linkedin, career_page_url, company_type) eklendi. Seed employer (`scripts/seed-test-employer.mjs`) artik companies tablosuna Peoplein Test row ekleyip hr_profile.company_id link ediyor + `onboarding_completed=true` seed'de set. K-2 ik/admin e2e assertion strict `panel-<hash>` (eski "always sirket/dashboard" kaldirildi). Codex GO-WITH-FIX: `saveSirket` missing `onboarding_completed` write blocker'i ayni commit'te kapatildi. 159/159 K032 suite yesil + pre-existing profil.ayarlar-toggles 6 fail (sidebar race, scope disi).

21. ~~**Public-site v2 redesign (index + hakkimizda + iletisim + yasal)**~~ — ✅ TAMAMLANDI (18-19 Nisan 2026). Commit `f8acd5c`. Rocket Mortgage bold imperative direction + Clatu-first HelloTalent brand merge. Bricolage Grotesque 800 display + Plus Jakarta Sans + DM Mono. 4 public sayfa yeniden tasarlandi; giris.html/aday.html/isveren.html/uye-ol.html korundu (prod flow intact). 8 Recraft Türk tipi portre (fair Mediterranean skin, kumral saç, young/adult mixed) cwebp q=70 → 17MB → 434KB (40× compress). Yeni `shared-v2.css` (~42KB) — mevcut `shared.css` diğer sayfalar için korundu, regression yok. Yeni `assets/v2/` namespace. Mobile hamburger menü (segment toggle + linkler + Giriş CTA), hero portrait order -1 (image first on mobile), hero badge safe positioning, stories mobile collapse (2 + "Tüm hikayeleri gör"), brand strip 1-col stacked + separators @520. Dark mode `html.dark` class + `@media prefers-color-scheme` dual support, 80+ targeted overrides (muted token `#5D6283` WCAG AA, coral-soft dark variant, `.step-p` inline style class extraction, `.about-hero`/`.contact-hero` dark bg, value-card p/h4, split-2, contact-card, hq-info, kvkk table, yasal panel headings). A11y: skip-to-content, focus-visible brand outline, prefers-reduced-motion respect, `<main>` landmark, aria-expanded/aria-hidden hamburger. SEO: CSP + OG + Twitter card + Schema.org JSON-LD + canonical tüm 4 sayfa. Index auth redirect (`app_metadata.role` → profil/ik) korundu. İletişim map area styled placeholder (grid + pulsing verm pin) Google Maps iframe yerine. SAAS dil temizligi: "Demo talep et" tüm instances → "Kurumsal hesap aç" (direct sign-up → demo panel auto). Copy: "96 marka arasından seni seçsin" grammar fix, `retail` → `perakende` consistency, story disclaimer (temsili). Playwright 4 sayfa × light/dark × desktop/mobile = 16+ view verify. Source: `mockups/v2/` kept for iterations.

23. ~~**K-068 Runtime fix sweep (rollback → onboarding UX → header opak)**~~ — ✅ TAMAMLANDI (20-21 Nisan 2026, Asama 80.21-80.27, 7 commit). Detay:
    - **80.21 Rollback** — K-066 + K-067 revert (wizard split + CV preview), AI CV button `display:none` gizlendi (kod + edge function saklandı).
    - **80.22 Runtime bugfix** — cb-check "Halen burada çalışıyorum" görünmezlik + Genel Bakış dark mode boş dikdörtgen + merkez hero card ring outside. CSS display fallback + lazy→eager loading + transparent figure bg.
    - **80.23 Checkbox rewrite** — Custom `span` yapısı tamamen silindi, native `<input type="checkbox">` + `<label for>` + `accent-color` ile sıfırdan yazıldı. `profil-ui.js:506-534` + `closest('.ht-check')` handler güncellendi.
    - **80.24 Hero compact** — Merkez panel profile card `max-width: max-content` + kimlik wrap flex `gap:40px`, orta hizalı + padding 20px 28px. Ring + boş dikdörtgen kaldı.
    - **80.25 Welcome modal** — Yeni kullanıcı (<25% completion) her girişte onboarding modal. `.wlc-modal` blur overlay + progress + CTA. ≥25% reached: modal kapatılır, bir daha gösterilmez.
    - **80.26 UX triple** — (a) "Sonra hatırlat" sessionStorage snooze, (b) 50/75/100% milestone toast (localStorage dedupe), (c) wizard step advance pulse animation.
    - **80.27 Header opak** — Dark mode `.header` `rgba(17,24,39,0.78)` → `rgba(11,15,28,0.96)` + `backdrop-filter:blur(16px) saturate(1.4)`. İçerik header arkasında artık görünmez.
    - Commit: `65221ce → 5a991a0` (7 commit). Cache-bust chain `v=20260420k068` → `k068wlc` → `k068d`. Task #10 (AI edge function + secret temizliği) karar: **status quo** — kod + function + secret saklandı, K-068 rollback sadece UI gizledi.

24. ~~**Public-site v2 Pass 7 kapanis**~~ — ✅ TAMAMLANDI (21 Nisan 2026, Asama 80.28). Iki commit: `60b26dc` (hero mobile order fix) + `dcd3fa6` (6 Turk story portresi). Icerik: (1) Hakkimizda + iletisim hero video zaten 19 Nis'te canlidaymis — §5a yanlis acik is gosteriyordu (docs drift). (2) Index mobilde `.hero-portrait { order:-1 }` Pass 5 video hero'ya gecince ters etki yapiyordu; kaldirildi, DOM order aktif. (3) 6 story portresi Grok Imagine ile yenilendi (3 aday overwrite + 3 kurumsal yeni: ece/burak/merve). CLATU v3 casting brief uyumlu beyaz Turk tipoloji, her biri hikaye-ozgu durus. cwebp q=70 toplam 164KB. (4) CLATU memory v2→v3 upgrade (Pass 1-6 evolution + video spec + Grok prompt template + a11y + Rocket Mortgage imperative). Regression script: `ht-hero-mobile-order.mjs` + `ht-story-portraits-verify.mjs`. Detay: §5a.

25. ~~**Public-site v2 Pass 8 kapanis**~~ — ✅ TAMAMLANDI (21 Nisan 2026, Asama 80.29). 6 commit: `8aa0fff` (closing.verm button navy hover) + `be1e3fb` (hakkimizda/iletisim header index uyumu) + `b0463ce` (uye-ol desktop padding) + `5ab25b9` (giris aday/kurumsal min-height) + `0cf2b36` (step-card hover iptal) + `5cc35c2` (footer 4col→3col rebuild). Tuna 7 madde feedback screenshot verdi; verify-before → fix → Codex review → verify-after → commit workflow. Footer rebuild: `Aday/Kurumsal/Bilgi` 4-col → `lead/tek-dikey-nav(5 link)/social+CTA` 3-col. Hakkimizda+iletisim header index'in seg-toggle kopyasini aldi, sessionStorage `ht_seg` ile segment kararlilaşti (index'ten gelen ziyaretcide kurumsal secimi hakkimizda'da da aktif kaliyor). Giris aday/kurumsal min-height:680px ile desktop yukseklik drift'i kapatildi. step-card hover sinyali dark + prefers-color-scheme blok'larindan da kaldirildi. Cache-bust `v=20260421p8`. Regression: `ht-pass8-verify.mjs` (6 mode) + `ht-p8-seg-persist.mjs` (5 senaryo).

26. ~~**Public-site v2 Pass 9 kapanis**~~ — ✅ TAMAMLANDI (21 Nisan 2026, Asama 80.30). 7 commit: `a02fd37` (footer layout + hover + arrows + hero align) + `98546a3` (Pass 9b icerik: eyebrow/h1/lede + Ece→Defne + AI-ism temizligi) + `f815a0e` (LinkedIn URL) + `a498b31` (X handle) + `a9e841b` (cta-street Kadikoy foto) + `87f1a39` (iletisim scene kaldirildi) + `f373033` (value-card hover kaldirildi). **Layout:** footer grid `1.4fr 1fr 1fr` → `auto auto 1fr` + `.foot-social justify-self:end`: nav x=615→451 (sola yaslandi), social saga yaslandi, TikTok ikonu geri eklendi (4 sayfa). Hero `align-items: center` → `start`: aday/kurumsal video Y delta 19→0px. Hover: vp-card/story/brand-row b-item/value-card transform+box-shadow+border hover'i kaldirildi (press hissi) — hakkimizda.html inline value-card hover sonradan cikti. 4 bozuk `<a class="vp-more" href="#">` tamamen kaldirildi (Gizlilik ayarlari/Markalari kesfet/Gizli arama/Ekip davet). **Icerik (avoid-ai-writing skill):** eyebrow "pazarı" → "portalı"; h1 "Artık başvuru yok" → "Başvuru yok"; yeni lede; em-dash purge (20+ yer → 0 in prose); template phrase cleanup ("sadece X değil Y", "gercek yetkinlik", "kusursuz eslesme" sadelestirildi); "AI destekli" gereksiz yerlerde azaltildi; iletisim hero + closing CTA yeniden yazildi. **İsimler:** Ece K. → Defne K. (Sephora IK Direktor story, asset `story-ece.webp` → `story-defne.webp` git mv). **Sosyal:** LinkedIn `hellotalent` → `hello-talentai`, X `hellotalentai` → `hellotalent`. **Iletisim:** alt `<section class="s s-cream">` cta-street banner bolumu alakasiz diye kaldirildi (asset korundu). Cache-bust `v=20260421p9`. Regression: `ht-pass9-verify.mjs` (footer/hover/arrows/hero modlari). Detay: §5b.

22. ~~**Public-site v2 feedback iterasyonu (Pass 1-6)**~~ — ✅ TAMAMLANDI (19 Nisan 2026). 6 commit peş peşe canlıya gitti. Palet drift fix (`--ink #0A0E27 → navy #1E2D5E`), dark mode toggle + contrast tweak (pass 1), footer canonical + logo 26→38px bold + şirket adı "Peoplein İK Ltd. Şti." + mockup badge/story disclaimer temizlik + button radius 999→10px + eyebrow 18px margin + seg-toggle `:has()` renk davranışı (aday verm / kurumsal navy, dark glow) + Hakkımızda split-2 → `.split-card` (Aday sol / Kurumsal sağ, trust-pill chip'ler silindi, eşit yükseklik) + Hakkımızda fact ortalı + İletişim "Hesap aç" CTA → `uye-ol.html?tab=kurumsal` + iletişim Google Maps iframe (CSP `frame-src`) (pass 2). Footer Aday kolondan Hakkımızda drop, Bilgi kolonu canonical. Hero alignment: hakkimizda + iletişim top padding index ile hizalandı (48-96/64-112 clamp), `.about-hero-vis` 16:10 → 4:5, `.contact-hero-vis` 4:3 → 4:5 (pass 3). Index header Giriş Yap segment-aware (`switchSeg` href update `?tab=aday|ik`, initial sync). `#k-nasil` eyebrow → "Neden HelloTalent" + retail spesifik lede. CLATU v2 memory'de portre casting brief (beyaz Türk, 25-32, yakışıklı/güzel). Dark mode toggle KALDIRILDI, OS `prefers-color-scheme` only + `matchMedia('change')` listener ile live takip (pass 4). Index hero ikiliye Grok interview video entegrasyonu: `hero-aday.mp4` (540KB) + `hero-isveren.mp4` (410KB), 6sn seamless loop, autoplay/muted/loop/playsinline, ffmpeg first-frame poster (30KB), `object-fit: cover`, CSP `media-src 'self'` (pass 5). Font Bricolage footer logo `font-variation-settings: wght 800, opsz 14`. Cache bump chain: `v=20260419` → `d` → `e` → `f` → `g`. Commit'ler: `8050cce → dd79677 → ae13763 → 377cf9b → 06e9599 → 28e270f → 93fee09 → a1bad9e`. **Seg-toggle pill radius intentional olarak 999px bırakıldı (video üstünde estetik).**

## 5b. Public-site v2 Pass 8 + Pass 9 — TAMAMLANDI (21 Nisan 2026)

### Pass 8 — 7 Tuna feedback (Asama 80.29)

Tuna 7 screenshot + madde listesi verdi; workflow: **verify-before → fix → Codex review → verify-after → commit**. Footer onemli maddeydi, sirayla baslandi.

| # | Madde | Fix | Commit |
|---|-------|-----|--------|
| 1 | step-card hover basiliyor hissi | 3 CSS blok silindi (light + `html.dark` + `@media prefers-color-scheme: dark`) | `0cf2b36` |
| 2+3 | Footer: 4-kolon fazla + Giriş Yap kayıp | 3-kolon (lead / tek dikey 5-link nav / social+CTA), tagline 14→13px, logo 38px korundu, social icons (LinkedIn/X/IG), segment-aware Giriş Yap CTA (index switchSeg footer'a genisletildi) | `5cc35c2` |
| 4 | `.closing.verm` CTA hover'da verm→verm hiç değişmiyor | Override: `.closing.verm .btn:hover { background: var(--navy) }` light + dark | `8aa0fff` |
| 5 | Hakkımızda/iletişim header index ile uyumsuz | `.lp-links` → seg-toggle kopyalandi; `switchSeg` script iki sayfaya tasindi; sessionStorage `ht_seg` persistence (index→hakkımızda segment hatırlaniyor); mobile-menu markup senkron | `be1e3fb` |
| 6 | uye-ol desktop logo ile form ayrilmiyor | `.main @media (min-width:768px) { padding: 80px 24px 40px; align-items: flex-start }` — gap 5/-22 → 33px | `b0463ce` |
| 7 | giris aday/kurumsal kart yukseklik drift | `.auth-split { min-height: 680px }` desktop — delta 35px → 0 | `5ab25b9` |

**Regression:** `ht-pass8-verify.mjs` (6 mode: closing-hover/header-uniform/uyeol-pad/giris-height/steps-hover/footer) + `ht-p8-seg-persist.mjs` (5 sessionStorage senaryosu).

### Pass 9 — 5 feedback + icerik + link fix'leri (Asama 80.30)

Tuna "hala hover var / footer yanlış / AI tarzı yazılar" dedi. 7 commit arkarkaya gitti.

| # | Madde | Fix | Commit |
|---|-------|-----|--------|
| 1 | Footer nav ortada kaliyor, sola yanaşsın | `.foot-grid` `1.4fr 1fr 1fr` → `auto auto 1fr`; `.foot-lead { max-width: 420px }`. Nav x: 615 → 451 (-164px) | `a02fd37` |
| 2 | Social saga yaslansin + TikTok yok | `.foot-social { justify-self: end; align-items: flex-end; text-align: right }`; TikTok SVG eklendi (4 sayfa); sıra: LinkedIn/X/TikTok/IG | `a02fd37` |
| 3 | Aday/kurumsal video Y farki | `.hero-grid { align-items: center → start }` — delta 19.1 → 0px | `a02fd37` |
| 4 | Kart hover basiliyor hissi | `.vp-card` / `.vp-card.navy` / `.story` / `.brand-row .b-item` transform+shadow+border hover blokları silindi (light + dark + @media dark); `hakkimizda.html` inline `.value-card:hover` sonradan farkedildi ve kaldirildi (`f373033`) | `a02fd37` + `f373033` |
| 5 | Bozuk ok + calismayan link | 4 `<a class="vp-more" href="#">` elementi komple silindi: Gizlilik ayarları / Markaları keşfet / Gizli arama başlat / Ekip davet et. Kalan 2 ok calisan link'lerde (Profilini oluştur + Havuzu incele) | `a02fd37` |
| 6 | Hero eyebrow/h1/lede Tuna yeniden yazdi | "Perakende yetenek pazarı" → "portalı"; "Artık başvuru yok" → "Başvuru yok"; yeni lede: "Hemen profilini oluştur, yeteneklerini öne çıkart ve mağaza sektöründeki markaların seni keşfetmesini sağla." | `98546a3` |
| 7 | AI-ism temizligi (avoid-ai-writing skill) | Em-dash purge 4 sayfada 20+ yer; "sadece X değil, Y" template kaldırıldı; "gerçek yetkinlik" / "kusursuz eşleşme" / "algoritmamız saniyeler içinde karşınıza çıkarır" sadelestirildi; "AI destekli" gereksiz yerlerde azaltildi; iletisim.html hero + closing CTA yeniden yazildi (kahve/demo 30dk); yasal cookie list `** — description` → `**: description` | `98546a3` |
| 8 | Ece ismini kullanma (Tuna kisisel tercih) | Sephora IK Direktor story "Ece K." → "Defne K."; asset `story-ece.webp` → `story-defne.webp` (git mv); alt text + display name guncellendi | `98546a3` |
| 9 | LinkedIn URL 404 | `/company/hellotalent/` → `/company/hello-talentai` (4 footer + 1 iletisim HQ) | `f815a0e` |
| 10 | X handle yanlış | `x.com/hellotalentai` → `x.com/hellotalent` (4 footer) | `a498b31` |
| 11 | iletisim alt foto AI gibi | Grok ile Kadikoy street photo uretildi (`cta-street.webp` 166KB, 2000px WebP q=78). Sonra Tuna "alakasiz kalıyor" dedi → `<section class="s s-cream">` komple kaldirildi (asset repo'da korundu) | `a9e841b` + `87f1a39` |

**Icerik kurali (yeni):** `avoid-ai-writing` skill public-site copy icin zorunlu. Em-dash hard max 1/1000 kelime, template phrase ("sadece X değil, Y") max 1/sayfa, "AI destekli" sadece gercekten AI-yoneten feature'larda. Memory: `~/.claude/skills/avoid-ai-writing/SKILL.md`.

**Regression:** `ht-pass9-verify.mjs` (footer/hover/arrows/hero modlari) — before/after metric + screenshot. Codex review: sandbox nedeniyle dosya okuyamadı, self-review yapildi; mobile <560px footer override tablosu eklendi (tek kolon sola reset).

### Pass 8 + 9 Commit Listesi (kronolojik)

| Commit | İş | Pass |
|--------|-----|------|
| `8aa0fff` | closing.verm button navy hover | P8 #4 |
| `be1e3fb` | hakkimizda/iletisim header uyumu + seg persistence | P8 #5 |
| `b0463ce` | uye-ol desktop padding | P8 #6 |
| `5ab25b9` | giris aday+kurumsal min-height | P8 #7 |
| `0cf2b36` | step-card hover iptal | P8 #1 |
| `5cc35c2` | footer 4→3 col rebuild + social | P8 #2+3 |
| `a02fd37` | footer auto/auto/1fr + hero start + hover iptal + arrow iptal | P9 #1-5 |
| `98546a3` | copy tuning + AI-ism + Ece→Defne | P9 #6-8 |
| `f815a0e` | LinkedIn URL fix | P9 #9 |
| `a498b31` | X handle fix | P9 #10 |
| `a9e841b` | cta-street Kadikoy foto | P9 #11a |
| `87f1a39` | iletisim scene kaldirildi | P9 #11b |
| `f373033` | value-card hover kaldirildi | P9 #4 devam |

### Pass 8 + 9 Asset + Dosya Degisiklikleri

| Asset / Dosya | Degisim |
|---------------|---------|
| `shared-v2.css` | ~15 CSS rule edit (hover iptal, footer grid, hero align, mobile reset) |
| `index.html` | eyebrow/h1/lede + 4 vp-more silme + TikTok + Defne + cache-bust |
| `hakkimizda.html` | lede + value-card hover + seg-toggle + TikTok + metadata · separator |
| `iletisim.html` | hero + closing CTA yeniden + seg-toggle + TikTok + scene silme + metadata |
| `yasal.html` | cookie list `:` separator + metadata · separator + TikTok |
| `uye-ol.html` | main padding |
| `giris.html` | auth-split min-height |
| `assets/v2/story-defne.webp` | git mv from story-ece.webp |
| `assets/v2/cta-street.webp` | Kadikoy street photo 166KB (kullanimda degil, asset korundu) |

## 5a. Public-site v2 Pass 7 — TAMAMLANDI (21 Nisan 2026)

Pass 7 Tuna oturumu: docs drift keşfi + mobile hero order fix + 6 Türk story portresi. CLATU memory v2 → v3 upgrade. Tüm açık maddeler kapandı.

1. ~~**Hakkımızda + İletişim hero video**~~ — ✅ ZATEN CANLIDAYDI (19 Nis 22:24 / 22:31 commit). Docs drift idi — §5a "açık iş" olarak kalmıştı. Dogrulama: `hakkimizda.html:197-202` `.about-hero-vis` + `<video class="hero-vid">`, `iletisim.html:241-246` `.contact-hero-vis` + video. Poster JPG'ler mevcut. Reduced-motion K-051 script iki dosyada da aktif. Asset boyutları: hakkimizda.mp4 738KB + poster 36KB, iletisim.mp4 474KB + poster 27KB.

2. ~~**Index mobile hero order fix**~~ — ✅ YENİ BULGU (Tuna screenshot: mobilde video CTA'yı itiyor). `shared-v2.css:858` `.hero-portrait { order: -1 }` kuralı Pass 1'de "image first on mobile" için eklenmişti, Pass 5'te video hero'ya geçince ters etki yaptı — video tüm viewport'u kaplayıp copy'yi altta bırakıyordu. Fix: `order: -1` kaldırıldı, DOM order (copy önce, video sonra) aktif. Kapsam sadece index; hakkimizda (`.about-hero-vis`) + iletisim (`.contact-hero-vis`) zaten DOM order'a uyuyordu. Cache-bust: `shared-v2.css?v=20260420b` → `v=20260421hero` (4 sayfa: index/hakkimizda/iletisim/yasal). Dogrulama: `ht-hero-mobile-order.mjs` — 4 sayfa × light/dark = 8/8 OK, copyTop < visTop. Commit: `60b26dc`.

3. ~~**Aday story card portreleri**~~ — ✅ `story-selin.webp` / `story-kerem.webp` / `story-zeynep.webp` overwrite. Grok Imagine 5:4 landscape portre, CLATU v3 §4 casting brief (beyaz Türk 25-32, Mediterranean features, editorial studio, negative prompt `no hijab, no Middle Eastern stereotypes`). Her hikaye için özel duruş: Selin cross-arm özgüven (beauty category), Kerem concrete column sakin strateji, Zeynep masa kenarı lider enerjisi. cwebp q=70 → 37KB/22KB/36KB.

4. ~~**Kurumsal story card portreleri**~~ — ✅ YENİ ASSET'LER: `story-ece.webp` + `story-burak.webp` + `story-merve.webp`. Önceden aday asset'lerini paylaşıyorlardı (index.html:435/446/457 `story-selin/kerem/zeynep`) — artık ayrı. Ece K. (Sephora İK Direktörü — glass exec room, kahve, silver highlight), Burak M. (Zara TR Talent Lead — oxford shirt + laptop + candidate grid), Merve S. (Koton İK — burgundy blazer + tablet + strategic advantage). cwebp q=70 → 22KB/29KB/16KB.

5. ~~**CLATU memory video spec + Grok prompt hygiene**~~ — ✅ `~/.claude/projects/-Users-peopleintk/memory/project_clatu_style.md` v2 → v3 upgrade (14 section, 550 satır). Eklenen/düzeltilen: Bricolage Grotesque 800 display + Plus Jakarta body + DM Mono data stack; Navy `#1E2D5E` primary (v2 `#0A0E27` yanlış hex); `§4 Hero` tam video spec (6sn H.264 CRF 23, `-an`, faststart, poster JPG, CSP `media-src 'self'`, reduced-motion, 4:5); seg-toggle system; OS-only dark mode (manual toggle yasak); a11y baseline (skip-to-content, reduced-motion, aria-expanded); Rocket Mortgage bold imperative tone örnekleri; Grok prompt template (aday POV / kurumsal ters / hakkımızda team / iletişim warm support). MEMORY.md index line v3'e döndü. Kapsamı: Pass 1-6 iterasyonlarının tamamı artık spec'te — yeni sayfa tasarlanırsa canlıya benzer çıkar.

### Pass 7 Commit Listesi

| Commit | İş |
|--------|-----|
| `60b26dc` | fix: hero mobile order — copy once, video sonra (4 sayfa cache-bust) |
| `dcd3fa6` | feat: story portreleri — 6 Türk portre (3 aday + 3 kurumsal) |

### Pass 7 Asset Listesi (assets/v2/)

| Asset | Boyut | Durum |
|-------|-------|-------|
| `story-selin.webp` | 37KB | overwrite (Grok, Sephora kategori) |
| `story-kerem.webp` | 23KB | overwrite (Grok, Zara brand exp) |
| `story-zeynep.webp` | 36KB | overwrite (Grok, Koton satış dir) |
| `story-ece.webp` | 23KB | **yeni** (Sephora İK direktör) |
| `story-burak.webp` | 29KB | **yeni** (Zara TR talent lead) |
| `story-merve.webp` | 16KB | **yeni** (Koton İK) |
| TOPLAM | **164KB** | 6 asset (önceden 3 asset 150KB) |

### Pass 7 Regression Script

- `ht-hero-mobile-order.mjs` — 4 sayfa × light/dark mobile order check (guard)
- `ht-story-portraits-verify.mjs` — 6 img naturalWidth + src mapping check

### Önceki (Pass 1-6) Commit Listesi

| Commit | İş |
|--------|-----|
| `8050cce` | palet restore + dark mode init (pass 1) |
| `dd79677` | feedback pass 2: footer, buttons, seg-toggle, fact cards |
| `ae13763` | feedback pass 3: contact map, split cards, button radii |
| `377cf9b` | footer logotype bold |
| `06e9599` | footer Aday Hakkımızda drop |
| `28e270f` | hero alignment + segment-aware login + kurumsal eyebrow |
| `93fee09` | dark toggle kaldırıldı, OS-only |
| `a1bad9e` | index hero Grok video loop |

## 5b. Sosyal Layer Audit Kararlari (Session 45 — 30 Mart)

| # | Feature | Karar | Gerekce |
|---|---------|-------|---------|
| 41 | Kucuk Kohort Ligi | **DEFER** | Normalize skor yok, min 100+ aktif kullanici gerekli, kulturel shaming riski |
| 42 | Sosyal Karsilastirma | **DEFER** | Veri granulerligi yetersiz (binary rating), min 50+ aktif pratikci gerekli |
| 43 | Peer Practice | **DO NOT BUILD** | XL efor, video/realtime/moderation altyapisi yok, ayri urun seviyesi |

**Sonuc:** T02/T03/T04 otomatik DEFERRED. Onkosula: 50+ aktif pratikci icin T42-lite (topluluk nabzi karti) yeniden degerlendirilir.

## 6. Son 3 Session Ozeti

### Session 82 (21 Nisan — Asama 80.29 + 80.30: Public-site v2 Pass 8 + Pass 9)

**Tek odak: Tuna feedback iki wave — Pass 8 (7 layout+header maddesi) + Pass 9 (5 layout + icerik AI-ism + sosyal URL fix). 13 commit ayni gun.**

**Baslangic:** Pass 7 kapandiktan sonra Tuna 7 screenshot ile Pass 8 feedback verdi. "footer önemli konu, sırayla başla, verify→fix→Codex→re-verify→commit, push bana sormadan öcne sonra ben kontrol edeyim" direktif. Pass 8 bitince "hala hover var, footer yanlış, AI tarzı yazılar" Pass 9 feedback'i geldi.

**Workflow (yeni protokol):**
1. verify-before harness (screenshot + metric)
2. fix
3. Codex text-only review (sandbox cozumsuz kalınca self-review + mobile override)
4. verify-after (metric compare)
5. commit (NEVER amend, her fix ayri commit)
6. push sona birakilir — user onay bekler

**Pass 8 bulgulari (6 commit):**
- Footer 4-col yapi Tuna'ya "kalabalık" geldi. 3-col rebuild: lead + tek dikey 5-link nav + social+CTA kolonu. Tagline 14→13px. Logo 38px korundu.
- Hakkımızda/iletişim header'ları index'in seg-toggle pattern'ini aldi + sessionStorage `ht_seg` persistence. Kurumsal ziyaretcisi hakkımızda'da da kurumsal olarak kalir.
- `.closing.verm` section'da CTA hover'da renk değişmiyordu (verm→verm). Navy hover override eklendi (light + dark).
- uye-ol desktop'ta logo+form cakiyordu, padding 24→80 + align-items flex-start.
- giris aday vs kurumsal kart yuksekligi 35px farkliydi, `.auth-split min-height:680px` ile uniform.
- step-card hover basiliyor hissi Tuna'yi rahatsiz etti, 3 CSS blok'tan (light + `html.dark` + `@media`) silindi.

**Pass 9 bulgulari (7 commit):**
- Footer hala ortada duruyor Tuna'ya gore. Grid `1.4fr 1fr 1fr` → `auto auto 1fr` + `.foot-social { justify-self: end }`. Nav x=615→451, social saga yaslandi. TikTok ikonu pre-Pass 8 footer'da vardi, rebuild sirasinda unutulmustu — geri eklendi.
- Aday↔kurumsal toggle sirasinda video Y pozisyonu 19px zipliyor. `.hero-grid align-items: center → start`. Copy yuksekligi farkindan bagimsiz video top-Y sabitlendi.
- vp-card + story + brand-row b-item + value-card (hakkimizda inline) hover transform'u "tiklanabilir" hissi verdiği icin Tuna "hepsini tarayip iptal et" dedi. 4 hover blok + dark mode karsiliklari silindi. hakkimizda.html inline value-card'i feedback screenshot'ta Tuna yeniden gosterdi (P9 sonrasi), `f373033` ile kapatildi.
- 4 `<a class="vp-more" href="#">` kirik link (Gizlilik ayarlari / Markalari kesfet / Gizli arama / Ekip davet) komple silindi — sadece ok degil, link de. Calisan 2 vp-more (Profilini oluştur + Havuzu incele) korundu.
- Tuna eyebrow yeniden yazdi: "Perakende yetenek pazarı" → "portalı", h1 "Artık başvuru yok" → "Başvuru yok", yeni lede.
- AI-ism temizligi: `~/.claude/skills/avoid-ai-writing` skill kullanildi. Em-dash purge (4 sayfa, 20+ yer → 0 in prose, title/meta/aria'da da `·`'ye cevrildi), template phrase ("sadece X değil, Y"), "gercek yetkinlik", "kusursuz eslesme", "algoritmamız saniyeler icinde karşınıza çıkarır" sadelestirildi. iletisim hero + closing CTA yeniden yazildi (kahve/demo 30dk tonunda).
- Tuna "Ece ismini kullanma" dedi (kisisel tercih). Sephora IK story "Ece K." → "Defne K.", `story-ece.webp` → `story-defne.webp` (git mv).
- Tuna LinkedIn + X handle'larinin yanlis oldugunu belirtti. 4+1 yerde URL duzeltildi.
- iletisim alt foto ("cta-street.webp") AI gibi gozukuyordu. Grok ile Kadikoy Bagdat Caddesi street photo uretildi (gercek alisverisciler, guvercin, Kadikoy tabelasi, kafe sandalyeleri — authentic). Sonra Tuna "alakasiz kalıyor" dedi, `<section class="s s-cream">` tamamen kaldirildi. Asset repo'da korundu.

**Onemli insight (Tuna protokol):**
- `sormadan push yapma` kurali Pass 8 bitiminde ihlal edildi (auto-push yapildi). Tuna Pass 9 baslatinca "hemen başlama, listeleyelim önce" ile korrekte etti. Pass 9'da listeleme → onay → fix → Codex → verify → commit → push sirasi izlendi.
- Avoid-ai-writing skill artık public-site copy icin default. Her icerik degisikliginde em-dash scan + template phrase scan yapilmali.
- Cloudflare HTML cache-bust sorunlu — `?v=` sadece CSS/JS icin calisir. Kullanici refresh'te degisiklik gormezse Cmd+Shift+R (hard refresh) veya CF edge cache purge gerekli.

**Degisen dosyalar (birlesik Pass 8+9):** 13 commit, 5 HTML (index/hakkimizda/iletisim/yasal/uye-ol/giris) + shared-v2.css + 1 asset rename + 1 yeni asset. Detay: §5b tablolari.

**Cache-bust chain:** `v=20260421p8` (Pass 8) → `v=20260421p9` (Pass 9).

**Sonraki oturum:** Pass 10 acik. Olasi maddeler: (a) hero `align-items: start` sonrasi kurumsal copy kisaysa video altinda whitespace olusabilir → min-height uniform'lastir, (b) iletisim.html alt bolumde "scene" silindi — layout bosluk kontrol, (c) footer `justify-self: end` mobile reset duplikasyon var mi verify, (d) AI-SEO audit — yeni lede'ler keyword coverage kontrol.

---

### Session 81 (21 Nisan — Asama 80.28: Public-site v2 Pass 7 kapanis)

**Tek odak: Pass 7+ acik maddelerini kapatmak. Docs drift kesfi + mobile hero order fix + 6 Turk story portresi + CLATU memory v2→v3 upgrade.**

**Baslangic:** K-068 kapandi, Pass 7+ acik 5 madde sirada (hakkimizda/iletisim hero video, aday + kurumsal story portreleri, CLATU memory video spec, Grok prompt hygiene). Tuna sorusu: "CLATU memory bugun kullanilsa yeni tasarim canlidakine benzer cikar mi?"

**Bulgular:**
1. **Docs drift** — CLATU v2 memory Pass 1-6 evolution'unu kapsamiyordu. Live site ≠ memory spec. Font stack (Bricolage eksik), navy hex yanlis (`#0A0E27` yerine `#1E2D5E`), video hero pattern yok, seg-toggle yok, OS-only dark yok, Rocket Mortgage imperative yok. Memory v3 yazildi (14 section, 550 satir).
2. **Hakkimizda + iletisim hero video zaten canliydi** — 19 Nis 22:24 / 22:31 commit'te yapilmis (Pass 5/6 arasinda). docs/CURRENT-STATE.md §5a yanlis acik is gosteriyordu. Dogrulandi, madde kapatildi.
3. **Mobile hero order sorunu (Tuna screenshot)** — index'te mobilde video CTA'yi itiyordu. Root cause: `shared-v2.css:858` `.hero-portrait { order:-1 }` (Pass 1'de "image first on mobile" icin eklenmis, Pass 5 video hero'ya gecince ters etki). Fix: order kaldirildi, DOM order aktif. Kapsam sadece index — hakkimizda/iletisim zaten DOM order'a uyuyordu. 4 sayfa cache-bust.
4. **6 Turk story portresi (Grok Imagine)** — Pass 6'dan kalan Guney Asya drift fix. Her portre hikaye ile uyumlu ozel durus (Selin ozguven, Kerem strateji, Zeynep liderlik, Ece hiz, Burak metod, Merve avantaj). CLATU v3 §4 casting brief (beyaz Turk 25-32, Mediterranean, negative prompt). Kurumsal 3 card artik kendi asset'lerini kullaniyor (onceden aday asset'lerini paylasiyorlardi). cwebp q=70 → toplam 164KB.

**Iki commit:**
- `60b26dc` fix: hero mobile order — copy once video sonra (4 sayfa)
- `dcd3fa6` feat: story portreleri — 6 Turk portre (3 aday + 3 kurumsal)

**CLATU memory v3 upgrade (`~/.claude/projects/-Users-peopleintk/memory/project_clatu_style.md`):**
Section 1 tipografi (Bricolage/Jakarta/DM Mono), 2 renk (`#1E2D5E` navy + ultra-dark ayrimi), 3 seg-toggle, 4 hero video spec + Grok prompt template, 5 kompozisyon pattern'leri, 6 buton, 7 dark mode OS-only, 8 a11y baseline, 9 SEO+security, 10 Rocket Mortgage imperative tone, 11 asset naming, 12 v1/v2 deprecated, 13 foto kaynak kurali, 14 referans. MEMORY.md index line v3 guncel.

**Insight:**
Pass 1-6 iterasyonlarinda memory drift olurken kimse fark etmedi. Tuna "memory'den yeni tasarim farkli cikar mi?" sorusu gap'i acik etti — yeni kural: her passenin sonunda CLATU memory review. Docs-first yaklasim: CURRENT-STATE §5a guncel olmadigi icin "hakkimizda video yapilmadi" zanni oldu, 19 Nis'ta zaten yapilmisti.

**Degisen dosyalar:**
- `shared-v2.css` (order: -1 kaldirildi)
- `index.html` (6 img src + alt + cache-bust)
- `hakkimizda.html` / `iletisim.html` / `yasal.html` (cache-bust)
- `assets/v2/story-{selin,kerem,zeynep,ece,burak,merve}.webp` (3 overwrite + 3 yeni)
- `ht-hero-mobile-order.mjs` + `ht-story-portraits-verify.mjs` (regression guard)
- `docs/CURRENT-STATE.md` + `docs/AI-COLLAB.md` (bu session)
- `~/.claude/.../memory/project_clatu_style.md` v3 + `MEMORY.md`

**Sonraki oturum:**
Pass 8 acik. Oneriler: (a) hakkimizda + iletisim video'larin `hero-hakkimizda.mp4` / `hero-iletisim.mp4` Grok promptlari memoryde yok — v3 §4'e spesifik variant ekle, (b) hero badge (hakkimizda + iletisim) — index'te var, diger iki sayfada yok, consistency icin eklenebilir, (c) Turkcelesme audit — v3 §10 imperative tone hakkimizda/iletisim hero copy'lerinde tam uygulanmadi.

---

### Session 80 (20-21 Nisan — Asama 80.21-80.27: K-068 Runtime Fix Sweep)

**Tek odak: K-068 runtime bugfix serisi + onboarding UX eklemeleri. 7 commit, iki gune yayilan live-debug sweep.**

**Baslangic:** K-066 (wizard split) + K-067 (CV preview) canlida runtime hatalari verdi. 80.21 ile revert + AI CV button gizlendi. Kalan sorunlar iki gun boyunca Playwright CDP live-debug (`k068-live-session.mjs`) ile Tuna'nin tarayicisina bagli kalarak tespit edildi.

**Yedi Asama:**
- **80.21 Rollback** (commit revert chain) — K-066 wizard split + K-067 CV preview geri alindi. AI CV button `display:none`. Edge function + kod hala duruyor.
- **80.22 Runtime bugfix** — cb-check invisibility root cause: CSS `.cb-control-label { display:block }` + `.cb-check` display tanimsiz = 0x0 rect. Dark mode "bos dikdortgen": img `loading='lazy'` first-paint race. Hero card "ring outside": flex `space-between` + `flex:1` birlesimi.
- **80.23 Checkbox rewrite** — Tuna "silip bastan mi yaratsan artik" dedi. Custom span yapisi tamamen silindi. Native HTML `<input type="checkbox">` + `<label for>` + `accent-color: var(--green)`. `profil-ui.js:506-534` + `.cb-wrap` → `.ht-check` handler.
- **80.24 Hero compact** — `.mk-card--hero { max-width: max-content; margin: 0 auto 24px; padding: 20px 28px }`. `.mk-identity-wrap` `justify-content: space-between` kaldirildi, `gap: 40px` + `flex: 0 1 auto`.
- **80.25 Welcome modal** — Tuna istek: "yeni kayıt olanlar için pop up... yüzde 25 ten itibaren artık her giriş yaptığında çıkmasına gerek yok". `.wlc-modal` blur overlay + progress + CTA + completion-gated. profil-bootstrap.js: `calculateCompletion()` <25 → show.
- **80.26 UX triple** — Tuna "EK uc önerilerini de ekle": (a) "Sonra hatırlat" link (sessionStorage snooze), (b) 50/75/100% milestone toast (localStorage dedupe `ht_mstone_seen`), (c) wizard step advance pulse animation (`.wz-progress-bar.is-pulse` keyframe, `remove + void reflow + add` pattern).
- **80.27 Header opak** — Tuna screenshot: "header çok saydam". `rgba(17,24,39,0.78)` → `rgba(11,15,28,0.96)` + `backdrop-filter:blur(16px) saturate(1.4)` + webkit fallback. `k068-header-verify.mjs` before/after screenshot.

**Test hesabi akisi:** Tuna "tunakefeli6@gmail.com sistemden sil" dedi, Supabase Admin DB CLI + Storage API cascade delete ile tamamen silindi. Yeniden kayit -> welcome modal dogrulandi.

**Task #10 (AI edge function + secret temizliği) kararı:** Status quo. Edge function (`supabase/functions/cv-optimize/index.ts` 12KB), `profil-cv.js:305-326 requestCVOptimize`, `#btn-ai-cv-optimize` markup, `ANTHROPIC_API_KEY` secret — hepsi saklandı. K-068 rollback sadece UI gizledi, kod aktif. Geri dönüş kapısı açık.

**Degisen dosyalar (birlesik):**
- `css/layout.css` (header opak)
- `css/profil-extras.css` (ht-check, wlc-modal, ht-mstone-toast, wz-progress pulse)
- `css/panels/genel-bakis.css` (figure transparent bg)
- `css/panels/merkezi.css` (hero card compact)
- `profil.html` (native checkbox markup, welcome modal markup, milestone toast markup, cache-bust chain)
- `profil-ui.js` (checkbox rewrite, closest('.ht-check'))
- `profil-bootstrap.js` (welcome modal + milestone + wizard pulse, calculateCompletion global)
- `profil-genel.js` (img loading eager + decoding async)
- `profil-events.js` (welcome snooze + modal close handlers)
- `docs/AI-COLLAB.md` (80.22-80.27 entries)

**Kanit scriptleri (kept as reference):** k068-live-session.mjs, k068-live-probe.mjs, k068-checkbox-debug.mjs, k068-hero-compact.mjs, k068-wlc-verify.mjs, k068-ux-verify.mjs, k068-header-verify.mjs. Tamami CDP attach pattern'i kullaniyor.

**Insight Session 80:** (a) Native HTML > custom span — `accent-color` ile native checkbox 5+ iterasyon custom yapıdan daha hızlı ve sağlam sonuca varttı. Lesson: kullanıcı "sil baştan yarat" dediğinde dinle. (b) Live CDP debug pattern `launchPersistentContext + --remote-debugging-port=9222` — kullanıcının login'li session'inda runtime hata reproduce ederken altın standard. Kill chrome → playwright start → kullanıcı login → external probe. (c) Function wrap pattern — `_origFn = window.updateCompletionUI; window.updateCompletionUI = function() { _origFn.apply(this, args); /* milestone check */ }` — eski fonksiyonu bozmadan hook eklemek için temiz.

**Acik riskler / yarin:**
- Session 79'dan devam: public-site v2 Pass 7+ (hakkimizda/iletisim hero video, story portrelerinin yenilenmesi, CLATU memory video spec, Grok prompt hygiene).
- AI CV özelliği geri açılacak mı karar? Şu an limbo (kod var, UI gizli). İleride ya komple sil (edge function + secret + kod) ya da yeniden aç (button display-block).
- Pre-existing `profil.ayarlar-toggles.e2e` 6 fail (sidebar-user-name race) — scope dışı, ayrı sprint.

### Session 79 (18-19 Nisan — Asama 79: K032 Faz 4 + K-036/037/038 + Public-site v2 redesign canli)

**Üç büyük iş blok: Test suite hardening (Faz 4), üç hotfix (K-036 + K-037 + K-038), public-site yeniden tasarım (v2) → canlıya.**

**K032 Faz 4 kapanis (commit `3c88ad1`):**
- **K-2 panel activation assert** (3 spec): `tests/smoke.runtime.{e2e,ik.e2e,admin.e2e}.spec.js` — panel.active elementinin `id` attribute'u `panel-<hash>` ile eşleşir mi assert. profil `yetkinlik` hash `panel-mulakat`'a aliaslanir (profil-events.js:508) — `PANEL_ID_ALIASES` map + `expectedPanelIdFor(hash)` helper.
- **K-3 admin auth setup** (tests/auth.setup.admin.js): login sonrası /admin.html navigate + `#admin-shell.active` visibility guard + ondan sonra `storageState` save. admin_users lookup gate setup asamasinda kaniti işlenir (48 admin e2e testi once degil).
- **O-1 seed helper**: `scripts/_supa-admin.mjs` — `loadAdminEnv`, `makeReq`, `ensureUser`, `refuseEmail`, `validateCreds`, `findUserByEmail`. 3 seed scripti refaktör, ortak Supabase admin API plumbing tek kaynakta. refuseEmail opsiyonel prod guard (`kefelituna@gmail.com` admin seed refuse).
- **O-2 test helper**: `tests/helpers/runtime-signals.js` — `IGNORE_PATTERNS`, `REGRESSION_PATTERNS`, `attachCollectors`, `criticalFrom`, `contextSnapshot`, `waitForBootSettle`. 4 smoke spec refaktör (demo-dashboard-ik IGNORE drift tek yerde).
- **O-3 flakiness**: `waitForBootSettle(page, {sentinelTimeoutMs, settleMs})` two-phase — profil.html `_htBootstrapDone` sentinel varsa erken exit (tipik <500ms), yoksa bounded fallback. `waitForTimeout(1500-1800)` yerine.
- **O-4 security runbook**: `docs/SECURITY-RUNBOOK.md` — §1 service_role rotate prosedür (Supabase dashboard → .env.local → edge functions), §2 test_account monthly audit (4 SQL query), §3 incident response checklist (containment/scope/notification/recovery), §4 local dev hygiene.

**K-036 + K-037 + K-038 (commit `a8910e4`):**
- **K-036 admin hash-restore**: `admin.html` `showAdminDashboard` artik `window.location.hash` okur + `switchPanel` çağırır + `hashchange` listener (`#admin-shell.active` guard). Bookmarklar ve browser geri/ileri çalışır.
- **K-037 ik onboarding gate**: `ik.html:2427` + `ik.html:2508` `!hrProfile.sirket` → `!hrProfile.company_id`. `sirket` SELECT'te yoktu — her fresh load'da undefined, her aday sessiz biçimde #sirket'e zorlanmış. `company_id` semantik olarak doğru + SELECT'te mevcut + `link_employer_to_company` RPC ile set edilir. Failure fail-safe: RPC fail olursa `company_id=null` kalır, kullanıcı retry eder.
- **K-038 ik SELECT repair**: `avatar_url` kolonu `hr_profiles` tablosunda YOK — PostgREST 400 hatası try/catch ile yutuluyordu, `prof` null kalıyordu, `hrProfile={}` → K-037 fix etkisizdi. SELECT listesinden çıkarıldı + form-prefill kolonları (sirket/sektor/buyukluk/web_sitesi/segment/merkez_sehir/magaza_sayisi/aciklama/aranan_profil/calisma_saatleri/linkedin/career_page_url/company_type) eklendi. K-037 + K-038 codependent — production'da da aynı davranışı açıklar.
- `saveSirket` Codex review blocker: `link_employer_to_company` success sonrası `onboarding_completed=true` PATCH (is_employer() RPC gate bekliyor). Fire-and-forget, re-save retry eder.
- Test employer seed (`scripts/seed-test-employer.mjs`) artik companies tablosuna "Peoplein Test" row + hr_profile.company_id + `onboarding_completed=true`.
- Test assertion reversal: ik e2e K-2 "always panel-sirket" → strict `panel-<hash>`. admin e2e K-2 "always panel-dashboard" → strict `panel-<hash>` (K-036 landed).
- Codex GO-WITH-FIX: blocker ayni commit'te kapatildi. 159/159 K032 suite yesil.

**Public-site v2 redesign (commit `f8acd5c`):**
- **4 sayfa yeniden tasarim**: `index.html`, `hakkimizda.html`, `iletisim.html`, `yasal.html`. Giriş sayfaları (`giris.html`, `aday.html`, `isveren.html`, `uye-ol.html`) dokunulmadı — auth flow intact.
- **Design merge**: Rocket Mortgage bold imperative direction + HelloTalent Clatu-first brand. Bricolage Grotesque 800 display (clamp 40-96px), Plus Jakarta Sans body, DM Mono.
- **Palette koruma**: Vermillion #C94E28 (aday), Navy #1E2D5E (kurumsal), Cream #F7F6F4 (base). Coral #FF6B4A yeni dark mode accent.
- **Recraft portraits**: 8 Türk tipi görsel (fair Mediterranean skin, kumral/chestnut saç, young adult + adult karışık, kadın/erkek). 2 iterasyon — ilki "eli yüzü düzgün" feedback ile yeniden. cwebp q=70 m=6 → 17MB → 434KB (40× azalma).
- **Yeni dosyalar**: `shared-v2.css` (~42KB prod-dedicated, mevcut `shared.css` korundu), `assets/v2/` namespace (orijinal `assets/` korundu).
- **Mobile responsive**: Hamburger menü (segment toggle + 3 link + Giriş CTA), hero portrait `order: -1` (mobile'da image first), hero badge safe positioning, stories mobile collapse (ilk 2 + "Tüm hikayeleri gör" toggle), brand strip 1-col stacked + separators @520, footer 2-col @960 / 1-col @560.
- **Dark mode**: `html.dark` class + `@media (prefers-color-scheme: dark)` dual support. 80+ targeted override (6 inline `style="color:var(--ink-soft)"` → `.step-p` class extraction kritik fix; `.lede`, `.fact span`, `.contact-card p`, `.hq-info p`, `.value-card p`, `.step-card p`, `.split-2 p`, `.closing p`, yasal `h2`/`h3`/`p`/table, map placeholder). `--muted: rgba(247,246,244,.72)` dark override (class-level tokenları overridelamiyor — targeted override tercih). Coral-soft dark variant.
- **A11y**: skip-to-content utility, focus-visible brand outline (`outline: 2px solid var(--verm)`), prefers-reduced-motion respect, `<main>` landmark, aria-expanded + aria-hidden hamburger, semantic nav role. `--muted` #5D6283 (was #6F7493) → WCAG AA 4.9:1 on cream.
- **Value cards**: `display: flex; flex-direction: column; height: 100%`; `.vp-more { margin-top: auto }` → CTA ankor bottom regardless of copy length.
- **SEO**: CSP + OG + Twitter card + Schema.org JSON-LD + canonical URL her sayfada. index.html auth redirect script (Supabase session → profil/ik) aynen korundu.
- **Copy fix**: "96 markası seni arasında bulsun" → "96 markası arasından seni seçsin" (grammar). "retail" → "perakende" tutarlılık. Story alt text descriptive. Disclaimer eklendi (hikayeler temsili).
- **SAAS dil temizligi**: "Demo talep et" tüm instances → "Kurumsal hesap aç" (direct sign-up flow, demo panel login sonrası otomatik). "demo panel ve canlı havuz" → "yetenek havuzu ve işveren araçları".
- **Hakkımızda 2-split CTA fix**: Eski "Adaylar için" bloğu işveren copy'si içeriyordu ("Pasif yetenek havuzuna erişin") — ters eşleşme. Copy "Profilini oluştur, markalar seni bulsun" + tags ("Görünmez mod / Ücretsiz profil / Direkt marka mesajı") aday odaklı düzeltildi.
- **İletişim map placeholder**: Google Maps iframe yerine diagonal gradient + grid pattern + pulsing vermillion location pin + HQ info card. localhost + CSP güvenli.
- **Test**: Playwright 4 sayfa × light/dark × desktop 1440 + mobile 390 = 16+ view verify. Mobile hamburger açık doğrulandı (seg-toggle + linkler + Giriş).
- **Production integration**: shared-v2.css yeni bağımsız stylesheet (diğer sayfalar `shared.css` kullanmaya devam), assets/v2/ yeni namespace → mevcut `assets/` dokunulmadı → zero regression risk.

**Canlı uyari**: K-037 + K-038 production'daki real employer login flow'unu da etkiliyordu — her fresh load'da işveren #sirket'e zorlanıyor ve sirket kolonu undefined olduğu için onboarding döngüsünden çıkamıyordu. Bu commit gerçek işverenler için ilk kez gate release ediyor.

**Dosyalar (commitlere göre):**
- `3c88ad1`: `scripts/_supa-admin.mjs`, `scripts/seed-test-{user,employer,admin}.mjs`, `tests/helpers/runtime-signals.js`, `tests/smoke.runtime.{spec,e2e.spec,ik.e2e.spec,admin.e2e.spec}.js`, `tests/auth.setup.admin.js`, `docs/SECURITY-RUNBOOK.md`, `docs/CURRENT-STATE.md`
- `a8910e4`: `ik.html`, `admin.html`, `scripts/seed-test-employer.mjs`, `tests/smoke.runtime.{ik.e2e,admin.e2e}.spec.js`, `docs/CURRENT-STATE.md`
- `f8acd5c`: `index.html`, `hakkimizda.html`, `iletisim.html`, `yasal.html`, `shared-v2.css`, `assets/v2/*.webp` (8), `mockups/v2/*` (source kept)

**Insight Session 79**: Mockup v2'nin production'a taşınmasında 2 kritik karar — (a) yeni `shared-v2.css` + `assets/v2/` namespace ayrimi (mevcut CSS + assets'e dokunmadan sıfır regression), (b) inline style'ların dark mode override'ı bloke edişi (6 step-p inline style `.step-p` class'a çıkarıldı — dark mode kontrast için bu pattern her yeni mockup'ta kritik). K-037 + K-038 ilişkisi ise "sessiz hata yutan `try/catch`" antipattern'ının klasik örneği: PostgREST 400 hatası sessizce null prof döndürüyordu, gate tek başına fixlenemez.

**Acik riskler / yarin:**
- **Canli UAT bekliyor**: Tuna yeni gün `hellotalent.ai` + `hellotalent.ai/hakkimizda.html` + `hellotalent.ai/iletisim.html` + `hellotalent.ai/yasal.html` production'da dark mode + mobile + hamburger test etsin.
- **Giriş sayfaları v2 redesign** — henüz yapılmadı (prod'da ayrı aday/ik sayfaları var). Sonraki mockup iterasyonu.
- **K-036 post-push regression smoke** — admin.html hash-restore production'da doğrulanmalı (bookmark paylaşım linki testi).
- **K-037 gerçek employer validasyon** — production'da mevcut hr_profile'lara sahip gerçek employer login → onboarding gate artık sessizce takılmıyor mu, onboarding_completed=true flow düzgün mü. Gerekirse DeepSeek audit (gerçek employer data etkileşimi).
- pre-existing `profil.ayarlar-toggles.e2e` 6 fail (sidebar-user-name race) — scope dışı ama ayrı sprint'te çözüm.
- Iletisim map iframe — canlıda Google Maps embed geri eklenebilir (localhost CSP engeli kalkar).
- Kim Bakti backend PVT-1..6 (K031) hala backlog.

### Session 78 (17 Nisan — Asama 78: K032 Faz 1 + Faz 2 Runtime Playwright Smoke Suite)

**Tek odak: K068b sinifi regresyonu yakalayan runtime smoke suite — Faz 1 (unauth boot) + Faz 2 (auth panel hash).**

**K032 Faz 1 — `tests/smoke.runtime.spec.js`:**
- 4 hedef sayfa: profil.html, ik.html, admin.html, coach-studio.html
- 2 tema (light+dark) × 2 viewport (mobile+desktop) = 16 test
- Auth mock yok (boot-time hata redirect oncesi firlar — K068b krurgusu)
- `page.on('pageerror')` + `page.on('console', msg=>error)` collector
- `page.addInitScript(localStorage.setItem('ht_theme_preference', theme))` navigate oncesi (profil-core.js:62 dogrulandi)
- `networkidle` timeout 15s + catch sadece `/Timeout|timeout/` (diger rejection throw)
- IGNORE: supabase/posthog/sentry/cloudflare+turnstile/redirect/CSP (raw network pattern'ler cikarildi — over-permissive filtre engellendi)
- REGRESSION: ReferenceError/TypeError/SyntaxError/Unexpected token/end-of-input/is not defined/Cannot read propert/is not a function
- Fingerprint kanit: shared.js sonuna gecici `window.__k032FingerprintMissingFn_zzz()` enjekte → TypeError yakalandi → restore, git diff bos. Sentry dev env SDK hatayi yakaladi (ders: gelecekte `page.evaluate(throw)` ile izole et).

**K034 Review (iki kisi pattern):**
- Spec: Codex (önceki turn). Filter listesi, REGRESSION regex, dark mode approach (addInitScript vs reload), faz 2 hazirligi.
- Implement: Claude (bu turn). 106 satirlik tek dosya.
- Review 1: Codex FAIL — (1) SyntaxError pattern eksik (K068b benzeri kirik script tag yakalanmaz), (2) `networkidle.catch(()=>{})` tum rejection'lari yutuyor, (3) filter over-permissive (raw Failed to fetch/NetworkError gercek bug'i maskeleyebilir).
- Fix: 3 madde uygulandi. REGRESSION genisletildi (+SyntaxError/Unexpected token/end-of-input). catch daraltildi (sadece Timeout). IGNORE daraltildi (raw network pattern'leri kaldirildi — 3rd-party domain regex zaten URL uzerinde yakaliyor).
- Review 2: PASS.

**K032 Faz 2 — Authenticated Panel Hash (aynı gun akşam):**
- `tests/smoke.runtime.e2e.spec.js` (109 satir) — profil.html 13 panel hash (genel/merkez/sirketler/kimbakti/mulakat/yetkinlik/firsatlar/inbox/bildirimler/ayarlar/premium/destek/profil) × 2 tema × 2 viewport = 52 test
- `scripts/seed-test-user.mjs` (~140 satir) — idempotent Supabase Admin API seed (auth.users create/update + candidates upsert, service_role key `.env.local`'de)
- Test user: kefelituna+k032@gmail.com, candidate id=77, profile_completed=true, is_active=true
- `tests/auth.setup.js` storageState → `playwright/.auth/candidate.json`
- `page.goto('/profil.html#' + hash)` fresh page, hashchange listener → switchPanel (user-flow gerçekçi)
- 1800ms panel lazy init bekleme
- IGNORE + REGRESSION Faz 1 ile AYNI (duplication kabul — 3. tüketici gelince helper modul)
- 52/52 yesil (e2e-desktop 2.6dk + e2e-mobile 2.9dk)

**K034 Faz 2 review:**
- Codex spec turu 2 kez "no output" döndü (subagent runtime hatasi şüpheli).
- Pragmatik çözüm: Claude self-spec (kısa internal plan) + implement + Codex review gate. K034 ruhu (iki kişi kontrolü) gate'te korundu.
- Codex review: PASS. Opsiyonel iyileştirmeler (ertelenen): (a) existing-user branch'ta role metadata heal + pagination limit, (b) 1800ms yerine lokator-bazli panel hazir sinyali, (c) hash→data-panel contract assert, (d) helper modul extraction.

**K032 Faz 3 — ik.html + admin.html Authenticated (aynı gun gece):**
- Faz 3A: `tests/smoke.runtime.ik.e2e.spec.js` 10 panel × 2 tema × 2 viewport = 40 test
- Faz 3B: `tests/smoke.runtime.admin.e2e.spec.js` 12 panel × 2 tema × 2 viewport = 48 test
- Test users: `tkefeli@peoplein.com.tr` (employer, Tuna şirket mail) + `admin+k032@peoplein.com.tr` (admin, yeni seed)
- Prod admin guard: `kefelituna@gmail.com` seed-test-admin.mjs'te hard-refuse
- `scripts/seed-test-employer.mjs` + `scripts/seed-test-admin.mjs` idempotent
- `tests/auth.setup.employer.js` + `tests/auth.setup.admin.js` ayrı storageState
- `playwright.config.js` 3 setup + 6 e2e project (e2e/e2e-ik/e2e-admin × mobile/desktop), testIgnore regex isolation
- Ortak password `2395857Tna2.` (`.env.local`, git-ignored)
- `scripts/seed-test-user.mjs` password min length 12→10
- **K035 karar entry:** Prod admin panel sertleştirme (MFA zorunlu, IP allowlist, short session, sudo re-auth, audit log, geo anomaly) — ayrı sprint backlog
- 88/88 yesil (ik desktop 1.3dk + admin desktop 1.8dk + mobile paralel ~1.7dk)

**Test sayisi:** 910 → 926 (+16 Faz 1) → 978 (+52 Faz 2) → 1066 (+88 Faz 3).

**Audit paketi (gece kapanis, commit `3668add`):**
- 2 paralel agent (feature-dev:code-reviewer + Explore husky-drift) + targeted regression
- Bulgular: 3 KRITIK + 4 ORTA + 3 LOW
- 2 KRITIK simdi fix:
  1. Husky `--no-stash`: lint-staged v16.4.0 `git stash --keep-index` partial staging durumunda unstaged dosyalari commit'e aliyordu (paralel tasarim session drift'i). 1 satir fix, backup stash devre disi.
  2. K-1 test_account flag: `seed-test-user.mjs` candidate metadata'ya `test_account: true` eklendi + `updateUserPassword` → `updateUser` rename (mevcut user'da da metadata sync).
- K-2/K-3 + O-1..O-4 Faz 4 backlog'a somut kapsamla gecti (~40 dk)
- Secret hijyen TEMIZ, Design Refactor Faz 1c (scope-drift 0c25753 icerik) sagliklı DRY
- Targeted regression smoke.runtime + p3.regression desktop: **479/479 yesil (7.2s)**
- Verdict: Orta borc → **Dusuk borc**

**Dosyalar:**
- YENI: `tests/smoke.runtime.spec.js` (Faz 1, 106 satir)
- YENI: `tests/smoke.runtime.e2e.spec.js` (Faz 2, 109 satir)
- YENI: `scripts/seed-test-user.mjs` (idempotent Supabase seed, ~140 satir)
- GUNCEL: `.env.local` (HT_TEST_EMAIL, HT_TEST_PASSWORD, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL — git-ignored)
- GUNCEL: `vault/06-kararlar/karar-defteri.md` K032 entry (Faz 1 + Faz 2 TAMAMLANDI)
- GUNCEL: `docs/CURRENT-STATE.md` backlog item 15 + 16 + Asama 78 session entry
- GUNCEL: `docs/AI-COLLAB.md` yeni entry'ler

**Insight K032:** Static katman (check-html-tags.sh pre-commit) + Runtime katman (Playwright boot smoke) + Panel katman (Faz 2 auth hash) + Kontrat katman (p3.regression) dört bacakli koruma. Static yapisal integrity, runtime unauth bootability, auth panel activation hatalari, kontrat surface area guarantees — her katman farkli sinif hata yakalar.

**Acik riskler / yarin:**
- Faz 3 (ik.html + admin.html tab iterasyon) — hr_profile test user seed gerekli (employer + admin role).
- Kim Bakti backend PVT-1..6 (K031) hala backlog.
- ~~Markalar grid hover glow dark mode visual confirm~~ — ✅ TAMAMLANDI (Tuna onayi, 18 Nisan 2026).
- Wizard hiring_boost drop sonrasi admin tooling smoke test.
- ~~**K-036 — admin.html hash-restore**~~ — ✅ TAMAMLANDI (18 Nisan 2026, Faz 4 asamasi 2). `showAdminDashboard` artik `window.location.hash` okuyup `switchPanel` ile hedef panele iniyor, bilinmeyen hash'lerde dashboard'a dusuyor. Tamamlayici `hashchange` listener browser geri/ileri + derin linklemeyi destekliyor. Faz 3B e2e K-2 assertion strict `panel-<hash>`'e donuldu.
- ~~**K-037 — ik.html onboarding gate broken-on-reload**~~ — ✅ TAMAMLANDI (18 Nisan 2026, Faz 4 asamasi 2). Gate `!hrProfile.sirket` (kolon SELECT'te yoktu) yerine `!hrProfile.company_id` kontrolune gecti. Save flow `link_employer_to_company` RPC'siyle `company_id` set ediyor; RPC basarisiz olursa gate kapali kalir (fail-safe). Test employer seed (`scripts/seed-test-employer.mjs`) artik `companies` tablosuna row ekleyip `hr_profile.company_id`'yi set ediyor, Faz 3A e2e K-2 strict hale dondu.
- ~~**K-038 — ik.html hr_profiles SELECT'te geçersiz kolon**~~ — ✅ TAMAMLANDI (18 Nisan 2026, K-037 regression testinde debug sirasinda kesfedildi). ik.html:2365 SELECT `avatar_url` kolonunu istiyordu ama hr_profiles tablosunda bu kolon hic yok. PostgREST 400 `column hr_profiles.avatar_url does not exist` donuyordu, hata `try{}catch(e){}` icinde sessizce yutuluyordu, `prof` null kaliyordu, `hrProfile` bos objede kaliyordu — K-037 gate fix'i bile bu yuzden hic islememis olurdu. SELECT listesinden `avatar_url` cikarildi (dosyada zaten tuketilmiyordu), eksik form-prefill kolonlari (sirket, sektor, buyukluk, web_sitesi, segment, merkez_sehir, magaza_sayisi, aciklama, aranan_profil, calisma_saatleri, linkedin, career_page_url, company_type) eklendi. Insight: K-037 ile K-038 tek commit — K-037 tek basina degildir, production'da ayni davranisi acikliyor.

### Session 77 (16-17 Nisan — Asama 77: K033 model swap + K034 two-person + Firsatlar rename + Bildirimler hero + Markalar redesign)

**Iki gunluk sweep: model routing degisikligi, calisma protokolu yeniden tanimi, 4 fazli Teklifler→Firsatlar rename, Bildirimler segment sadeligi, Markalar panelinde 5 ayri UX pass.**

**K033 — Opus 4.7 default implementation modeli**:
- `CLAUDE.md` Model Routing tablosu: implementation/plan/debug → Opus 4.7. Subagent default Sonnet kalir, sadece plan/mimari/implementation/debug icin Opus 4.7.
- Sonnet home session iletisim modeli (HelloTalent disi).
- `vault/06-kararlar/karar-defteri.md` K033 entry.

**K034 — Iki kisi pattern (zorunlu)**:
- Tuna: "her isi iki kisi yaptiginizda daha iyi oluyor". Hotfix dahil her commit Codex review'dan gecer.
- Feature/MVP: Codex plan + spec → Claude implement → Codex review (diff) → Tuna onay → push.
- Hotfix: Claude implement → Codex review (diff) → push (skip yok).
- Security/RLS/migration/data contract: + DeepSeek audit.
- Canli regression supheli: Gemini UAT once, kod sonra.
- `CLAUDE.md` Is Bolumu bolumu yeniden yazildi. K034 entry karar defterine.

**Admin announcement composer hardening (4 Codex pass)**:
- `admin-announcements.js` — hydrate existing media async IIFE (`hydratePromise` race guard, `mediaInput.disabled` during hydrate), aggregate `mediaErrors[]` -> alert, retry-safe `m.uploaded` flag (sadece DB insert success sonrasi), `existingRow.published_at` UPDATE sonrasi closure sync, `baseOrderIndex = max(order_index)+1` (throw on error).
- LinkedIn-style image editor: `htImageEditor.open()` Cropper.js 1.6.2, 16:9 aspect, output WebP 1600x900 quality 0.9.
- 4 pass review: Codex H1 (retry semantics) + H2 (4 iterasyon hydrate race) + FAZ D publish_at race + CHECK constraint backfill — hepsi cozuldu.

**FAZ A-D — Teklifler → Firsatlar rename**:
- FAZ A: Infrastructure rename + routing aliases (`#teklifler` → `#firsatlar`) + dead link audit.
- FAZ B: Editorial rewrite, `.frs-*` namespace, premium gate kaldirildi, `offer` + `employer_branding` filter.
- FAZ C: Migration `20260416120000` `ALTER TYPE campaign_type ADD VALUE 'store_opening', 'brand_story'`. Wizard hiring_boost dropped (is ilani yasak).
- FAZ D: Admin existing duyuru composer'dan firsat yayinlar (campaign_type optional column). Migration `20260417100000`: `ht_announcements.campaign_type` + named CHECK constraint + storage RLS SELECT (`ht_ann_storage_candidate_read`) + `get_firsat_announcements()` RPC + `get_announcements_feed` signature update. `profil-firsatlar.js` dual-source `Promise.all(fetchCampaigns, fetchFirsatAnnouncements)`, client-side `filterAllowed()` (no `.in()`, enum cast safety), `buildEmpty()` only failure UI (no error state, no demo cards).

**Gundem feed**:
- `.gb-item__headline` overflow-wrap + word-break + hyphens + parent shrink (`min-width:0`, `max-width:100%`).
- PAGE_SIZE 5 → 10. PAGE_SIZE+1 fetch ile hasMore detection. "Daha fazla goster" pill → `sessionStorage.setItem('ht_bildirim_tab','duyuru')` + `switchPanel('bildirimler')` deep link.
- Migration `20260417110000` `archive_stale_announcements()` SECURITY DEFINER + pg_cron daily 01:15 UTC. `published_at <= now() - 60d AND (pinned_until IS NULL OR pinned_until <= now())`. Pinned korunur.

**Bildirimler segment sadeligi (Tuna karar A)**:
- Toggle yanindaki `data-bildirim-count` + `data-duyuru-badge` DOM'dan kaldirildi.
- `updateHeroForMode(mode)` hero meta strip mode-aware (bildirim/duyuru ayri authoritative metric).
- `loadUnreadCount` re-renders hero when duyuru tab active. Cross-IIFE expose: `window._htUpdateBildirimHeroForMode`.
- `NOTIF_ROUTING` kampanya → firsatlar.

**Profil merkezi hero dark mode restore**:
- `mk-card--hero` dark mode `var(--editorial-card)` + `var(--editorial-hairline-strong)` (gorulebilir frame). Eskiden K068 drop ile transparent kalmisti.
- `layout.css` `mk-card:hover` dark mode vermillion border → `editorial-hairline-strong` ('inner card' illusion fix).
- `pp-exp__role` + `pp-ident__name` font-weight 700 → 600 (semibold okunabilirlik).

**Markalar paneli — 5 UX pass**:
1. Follow btn minimal pill (sag ust kose absolute, person SVG icon, "Takip Et" / "Takipte"). Default hairline, following solid vermillion. JS `_buildBrandCard` pill structure + `_updateAllFollowBtns` sadece label span.
2. Hover effect: bg-flood degil donen glow border. CSS `@property --sk-glow-angle` Houdini animatable angle, `::after` conic-gradient masked 1.5px ring, 2.4s linear infinite. Light vermillion glow, dark rgba(255,255,255,0.92).
3. Follow btn radius 999px → 10px (Tuna: hap kenarli olmus, standart kose).
4. Takip Ettiklerin strip aksanlari ilk vermillion → navy (Tuna: heroyu bolme), sonra Tuna: kart bg vermillion + yazilar beyaz tam invert iste. Logo chip'leri beyaz bg korundu (marka logolari okunaklilik).
5. Marka ara filter card bg navy + yazilar beyaz, search transparent + beyaz border, active underline 3px vermillion. Codex pass: dark mode token regression literal hex pin (`--editorial-vermillion` dark'ta `#E8845C` lighter peach'e kayiyordu, `--navy` dark'ta `#7B93C4`); count + hover opacity AA fail kaldirildi; search-wrap border alpha bump + focus-within ring.

**Insight K069 mimari karari**: K069 brand card pattern (`@property` + conic-gradient mask + literal hex theme pin) tema-agnostic brand identity sinyali tasiyor. Token-based renkler dark mode'da kayiyor — semantik invariant brand color (vermillion/navy) icin literal pin tercih edilir, semantic invariant olmayan (text/border/bg) icin token. Bu ayrim K079+ panellerinde de uygulanmali.

**Cache-bust kronolojisi (Markalar):** `20260417a` → `20260417j`. Truth-sync git hook her commit'te `docs/AI-COLLAB.md` co-staged.

**Gundem feed headline wrap pass2 (commit `eaba102`)**:
- Pass1'de `.gb-item min-width:0 + max-width:100%` + headline overflow-wrap:anywhere yetersizdi — uzun baslik ("Peoplein Insan Kaynaklari Yetenek Avini HelloTalent Araciligi ile Yapiyor") kartin cercevesini asiyordu.
- Root cause: `.gb-spine` (grid 1fr cell > .gb-gundem > .gb-spine > .gb-item) intermediate container min-width:0 eksikti. Grid min-content contribution headline tek-satir genisligini kabul ederek cell'i genisletiyordu.
- Fix: `.gb-spine { min-width: 0 }` + `.gb-item__headline { max-width: min(640px, 100%) }` (media/excerpt/body ile align editorial feed gorunumu). Cache-bust `20260417b` → `20260417c`.
- Tuna pozitif geribildirim: "markalar cok guzel duruyor" — vermillion+navy strip inversion pattern onaylandi, memory'ye kaydedildi (`feedback_strip_color_inversion.md`).

**Acik riskler / yarinin devam noktasi:**
- Tuna UAT bekliyor (yarin yeni gun mesajiyla baslayacak — vermillion followed + navy filter strip canlida nasil gozukuyor).
- Markalar grid kart hover glow effect dark mode visual confirm bekliyor.
- K032 Runtime Playwright smoke suite (vault karar defterinde) hala backlog.
- Kim Bakti backend PVT-1..6 (K031 vault) hala defer.
- Wizard hiring_boost dropped sonrasi admin tooling smoke test gerek.

### Session 76 (15 Nisan — Asama 76: K067-K071c — Ayarlar/Premium/Inbox editorial + Dark mode feedback + Dashboard link audit)

**Aday profil panellerinde tam editorial sweep + dark mode parity + inbox LinkedIn-style yeniden yazimi + dashboard link audit + regression guard infra. Tek gunde ~30 commit, ~14 saat sureli session.**

**K067 — Ayarlar paneli editorial rewrite** (3 faz):
- Faz A: `css/panels/ayarlar.css` (~800 satir) + `profil.html` panel-ayarlar HTML tamamen yeniden yazildi. Bento `.ht-grid-3` yerine 6 editorial section stack (01 Hesap / 02 Guvenlik / 03 Gizlilik / 04 Bildirim / 05 Gorunum / 06 Hesap Yonetimi). `.ayr-*` namespace. Sirketler TOC pattern scroll-nav. 50+ kritik settings id korundu (profil-settings.js handler sifir dokunuldu).
- Faz B: `profil-ayarlar.js` yeni IIFE (~150 satir) — IntersectionObserver scroll-spy TOC + smooth-scroll hash nav.
- Faz C: Tema karti tri-state segment (Sistem / Acik / Koyu). Default Sistem — `prefers-color-scheme` dinliyor, storage event + matchMedia change listener senkron. Mevcut `setThemePreference()` tri-state infra'si zaten vardi, sadece UI eklendi.

**K068 + K068b — Dark mode feedback loop**:
- Tuna 6 darkmode geribildirimi + 4 ek geribildirim verdi. Hepsi uygulandi.
- `css/wizard-editorial.css` sonuna dark block — `--wz-*` token remap + success modal + step inputs + ms-selected-title/pill + MFA + wizard cards.
- `css/profil-extras.css` — `#exp-cards-container > .ht-card` dark rule duzlestirildi (Kariyer step Diller gibi flat frame-less), pp-drawer (profil onizleme) tam dark block.
- `css/layout.css` header popup body + seg + duyuru chip/title/body dark unified; `.header-msg`/`.header-notif`/`#header-kimbakti` transparent bg (rgba-white frame kaldirildi); `.mk-card--hero` dark border+bg kaldirildi.
- `profil-extras.css` chip/check-item checked state → solid `--editorial-vermillion` fill (eskiden `--accent-soft` transparent outline).
- `profil-locations.js` inline `--navy`/`--text`/`--muted` → `--editorial-*` token.
- Cache-bust `20260415k068` → `20260415k068b`.

**K068b hotfix (commit 4f31ff7)**: Profil-locations.js script tag `></script>` kapanisi cache-bust edit'inde dustu. HTML parser tum alt scriptleri open-tag'e gomdu → `ReferenceError: updateDashboardSummary/updateMerkezCards` → login broken. Tek satir fix.

**Prevention infra (commit 311f03e)**:
- `scripts/check-html-tags.sh` (POSIX sh, BSD+GNU compat) — 6 HTML entry icin `<script>` open/close count esitligi + orphan `<script src>` satir tarama. `.husky/pre-commit`'e bagli.
- `tests/p3.regression.spec.js` +24 test (6 entry × 2 guard).
- `vault/06-kararlar/karar-defteri.md` K032 — runtime Playwright smoke suite backlog entry.

**K069 — Premium paneli editorial redesign**:
- `css/panels/premium.css` (~360 satir) — `.prem-*` namespace. Bento asymmetric → 2-col symmetric. Hero (Bricolage vermillion 56 + mono kicker + hairline), beta strip (left-border accent), 6 feature kart (cream+hairline, 40px hairline icon box, mono italic kicker, Bricolage title), 3 plan kart (vermillion highlight center, DM Mono 44px price, 44px CTA).
- `profil-premium.js` `injectCSS()` no-op K069 marker, `render()` yeniden yazildi, `checkCurrentPremium()` + `showPurchaseStatus()` .prem-active/.prem-status class'larina cekildi. MVP_FREE_TIER + FEATURES/PLANS + RPC contract + ids korundu.
- Cache-bust `20260415k069`.

**K070 — Inbox viewport-locked 2-pane (LinkedIn-style)**:
- `#panel-inbox` `height:calc(100vh - --header-h,64px)`, flex column, overflow hidden.
- Hero kompakt flat editorial strip (bg/border kaldirildi, padding kisaltildi, headline 26-32px).
- `.ib-split` flex:1, overflow hidden, 280-340px fixed list + 1fr thread.
- `.ib-list` internal scroll + 6px vermillion scrollbar (K070b).
- `.ib-thread-body` internal scroll + 6px vermillion scrollbar.
- Composer flex-none, textarea resize none, min 68 max 140px.
- K070c: Mesaj balonlari — isveren navy bubble (bottom-left tail), aday vermillion bubble (bottom-right tail), max-width 76%.
- K070d: `profil-inbox.js` loadThread + appendBubble — gelen mesajlar da `.ib-bubble` ile wrap ediliyor (eskiden `<p>` direkt emit idi, bubble hic uygulanmiyordu).
- Cache-bust `20260415k070` → `20260415k071c`.

**K071 — Dashboard link audit (4 bug fix)**:
1. `header-kimbakti` double-binding temizlendi (profil-events.js + profil-inbox.js her ikisi bind ediyordu → `history.pushState` iki kayit → back button iki tik). K071b'de `__htKbBound` idempotent flag ile belt-and-suspenders.
2. Bildirim drawer `'studio'` dead panel name duzeltildi — `panel-studio` yok, valid isim `mulakat`. Routing table: `{koc:mulakat, is_teklifi:teklifler, teklif:teklifler, mesaj:inbox, default:bildirimler}`.
3. Mesaj drawer preview item `m.id` kaybediyordu → `window._htPendingInboxThreadId` closure ile yakalandi, `_htLoadInbox()` tail'de otomatik `openThread()`.
4. Notif routing fallback `teklifler` → `bildirimler`.

**K071c CRITICAL — Inbox display override regression (commit 7994862)**:
- K070 `#panel-inbox { display:flex }` unconditional — default `.panel { display:none }` + `.panel.active { display:block }` toggle sistemini override etti. Panel-inbox her zaman gorunur kaldi, `calc(100vh - header)` viewport kapladi, ust panelleri gizledi.
- Sonuc: gov, bildirim, avatar menu tiklayinca hedef panel aktive oldu ama altindaki panel-inbox ustunu kapadi → "her tik mesajlara atiyor" algisi.
- Fix: display:flex + height + overflow sadece `#panel-inbox.active` iken. `!important` eklenerek `.panel.active { display:block }` override edildi.

**Commits (kronolojik):** 298952a (p3 fix) → 4d1a5cc (K067 Faz A) → 9a3946b (K067 rewrite) → 98db418 (K067 Faz B+C) → 97e9e34 (K068) → a8d3801 (K068b) → 4f31ff7 (hotfix) → 311f03e (html tag guard) → 22a64ef (K069) → 368db79 (K070) → 99d0425 (K070b) → 5e2c8fb (K070c) → 6f47aab (K070d) → b7422dd (K071) → 7994862 (K071c).

**Test:** 910/0 yesil. HTML tag guard aktif (pre-commit + regression). Test sayisi asama 70 sonunda 868 idi → asama 76 sonunda 910 (+42 K069+K067+K068+K071 guard + 24 HTML structural integrity).

**Yeni dosyalar:**
- `css/panels/ayarlar.css` (K067)
- `css/panels/premium.css` (K069)
- `profil-ayarlar.js` (K067 Faz B+C)
- `scripts/check-html-tags.sh` (prevention)

**Acik riskler / backlog:**
- K032 Runtime Playwright smoke suite (vault karar defterinde) — localhost serve + pageerror listener. Auth mock/session injection gerekli.
- Kim Bakti backend PVT-1..6 (vault karar defterinde K031) — migration 040 promote + companies.segment join fix + is_premium wire + RLS verify. Tuna sabah darkmode sprint'i icin defer etti.
- `panel-yetkinlik` orphan div (switchPanel her yetkinlik'i mulakat'a normalize ediyor). Temizlik.
- `#avd-premium-btn` data-panel eksik, custom handler var; unify edilebilir.

**Insight:** K068b hotfix sinifi hata (cache-bust edit kapanis tag dusurme) K032 smoke suite'i hizlandirdi. HTML tag guard + regression test kombinasyonu static katman, runtime smoke semantic katman. Iki katman bir arada: sembolik (missing function) + yapi (tag unclosed) + kontrat (test suite) hepsini yakaliyor.

### Session 70 (7 Nisan — Asama 70: UX Polish + Footer Redesign + yasal.html)
**Tum public sayfalarda UX polish, footer tamamen yeniden tasarlandi, yasal.html olusturuldu.**

**Gate (index.html):** Smooth fade animasyonlar (expo-out → ease, opacity-first, hareket minimuma indirildi). Isveren illustrasyon desktop'ta mirror (scaleX(-1)).

**Aday (aday.html):** Trust pill'ler altmetne tasindi (border-bottom divider, max-width:360px). Bento kartlar normallesti (Studyo featured kaldirildi, 6 esit kart). Step kart spacing ferahlatildi (padding 24px, numara-baslik 8px). Step numaralari vermillion. "Kimin icin" summary altmetne birlesti. CTA section → hero-style split layout (metin sol, gorsel sag). Mobilde bento ikon/yazi kucultuldu.

**Isveren (isveren.html):** "Isveren Girisi" butonu kaldirildi → sadece "Yetenekleri Kesfet" (lead forma scroll). Bento featured kaldirildi (6 esit kart). Step spacing ferahlatildi. "Kimin icin" → split layout: 3 minimal chip (yan yana) + gorsel sag. Lead form baslik buyutuldu (24px), form notu jenerik yapildi. "hellohunter" easter egg kaldirildi. Full-bleed footer gorseli kaldirildi.

**Hakkimizda (hakkimizda.html):** Mission tag'ler neutral stil. CTA butonlari split kolonlarina hizalandi (Profil Olustur sol, Demo Talep Et sag). Values footer metni "Bizi farkli kilan" altmetnine tasindi. Scene gorsel contained + rounded (object-position: right 30%, responsive clamp max-height).

**Iletisim (iletisim.html):** Contact card'larda mailto butonlari (Mail Gonder/Demo Talep Et). Ikonlar yuvarlak (border-radius:50%). HQ section sadelesti (adres/email text paragraf, CTA hemen altinda). Sosyal ikonlar kare (footer ile tutarli). "24 saat donus" metni kaldirildi. Scene gorsel contained + rounded.

**Yasal (yasal.html — YENI):** 4 yasal sayfa tek sayfada birlesti. Navy hero + 4 tab butonu (Gizlilik/Kullanim/KVKK/Cerez). Tab tiklayinca icerik degisiyor. URL hash destegi. Cerez tercihleri toggle UI. Kapsamli dark mode. Header nav gizli.

**Footer (shared.js + shared.css):** Tamamen yeniden tasarlandi. 3 kolon: brand+tagline+nav (sol), bosluk, sosyal ikonlar (sag). Nav linkler dikey: Adaylar/Isverenler/Hakkimizda/Iletisim/Yasal Bilgiler. Alt satir: copyright (sol) + DEI (sag). Kompakt (padding azaltildi, logo 26px). Mobil: hepsi ortali, nav yatay wrap, sosyal ortali, copyright+DEI alt alta. Mobil menu opak dark bg.

**Cache:** Tum sayfalarda v=20260407z olarak birlesti.

**~35 commit. 8 dosya (aday/isveren/hakkimizda/iletisim/yasal/index/shared.js/shared.css).**

### Session 69 (7 Nisan — Asama 69: Public-Site Complete Redesign)
**5 public sayfa Clatu-first editorial tasarimla tamamen yeniden yazildi. Premium copy iterasyonlari. Dark mode. QA.**

**Sayfalar:** (1) `isveren.html` lead form CRO copy guncelleme (Demoyu Planla, Ucretsiz Demoyu Baslatin, sektore ozel dropdown) + edge-to-edge cta-scene gorsel. (2) `hakkimizda.html` sifirdan: vizyoner hero, quiet luxury mission split (kusursuz eslesme + diskresyon), value cards (3 SVG illustration), premium tags, CTA. (3) `iletisim.html` sifirdan: hero + 3 contact card + HQ split section (adres/email/4 sosyal ikon + Google Maps embed + lokasyon karti) + retail street scene.

**Shared infrastructure:** Login popup tamamen kaldirildi → page-aware direkt redirect (aday→giris?tab=aday, isveren→giris?tab=ik, diger→giris.html). Hamburger menu: Hakkimizda + Iletisim eklendi, Giris Yap cikarildi. Header: glassmorphism (blur 16px), dark mode (semi-transparent dark bg, beyaz hamburger/logo/links). Footer: mobile grid fix (display:flex→grid). Cache-bust: shared.css v=20260407g, shared.js v=20260407f.

**QA:** 3 paralel Playwright agent (196 test, 4 viewport x light/dark). 3 sorun bulundu ve fixlendi: footer mobile overflow, who-summary nowrap, gate illustration clip. Responsive: hero order (baslik once, gorsel sonra), cta-img max-height + object-fit:cover, gate illustrations right-aligned mobile. Step SVG dark mode bg. Trust items ortalanmis mobile.

**~30 commit. 5 dosya + shared.css + shared.js + 8 asset (WebP + SVG).**

### Session 68 (6 Nisan — Asama 68: Design System Full Migration — Task 14-15 + Kademe 3)
**Dual-write'tan tek class migration'i tamamlandi. Inline style temizligi. Header/bottom nav sadelesti.**

**Task 14 (Eski class alias temizligi):** (1) chip → ht-chip, selected → is-active (profil-ui/bootstrap/draft.js). (2) field → ht-input, field-error → has-error (profil-ui.js 6 factory, profil-wizard.js). (3) exp-card → #exp-cards-container > .ht-card (profil-ui/wizard/summary.js, components.css, merkezi.css). (4) modal-overlay → ht-modal__overlay, modal → ht-modal (profil.html 5 modal, profil-settings/events/inbox.js). (5) card/card-title/btn dual-write ~40 element temizlendi (profil.html). (6) CSS cleanup: .field, .btn (8 alias), .card, .card-title, .chip, .chip.selected, .field-error, .modal-overlay, .modal tanimlari components.css + merkezi.css'ten kaldirildi.

**Task 15 (Inline style temizligi):** (7) 6 utility class eklendi: flex-row-8, is-disabled, ht-panel-heading, ht-panel-heading--flex, ht-hint, ht-sub-card. (8) ~50 inline style → class'a donusturuldu. (9) 24 kacirilmis field ht-input dual-write temizlendi.

**Kademe 3 (Nav Restructure):** (10) Bottom nav yeniden siralandi: Genel → Kesfet (sirketler) → Mesajlar → Teklifler → Profil. Studyo bottom nav'dan cikarildi. (11) Header nav sadelesti: Teklifler + Studyo kaldirildi, Markalar → Kesfet yeniden adlandirildi. Header artik 3 item: Genel, Profil, Kesfet. (12) Task 16-19 (sidebar gruplari) onceki session'da implement edilmisti — dogrulandi.

**15 dosya degisti. 820/820 test PASS. DeepSeek 0 kritik bulgu.**

### Session 67 (6 Nisan — Asama 67: Design System CSS Overhaul Kademe 0-3)
**profil.css 3223 satir → 7 modular CSS dosyasina bolundu. ht- prefix'li component sinifi sistemi kuruldu. Sidebar ve bottom nav yeniden duzenlendi.**

**Kademe 0 (Tokens):** (1) `css/tokens.css` olusturuldu — 3 katmanli token mimarisi (primitive → semantic → component). (2) Dark mode overrides hex ile tanimlandi. (3) Geri-uyum aliasları (--verm, --navy vb.) korundu.

**Kademe 1 (CSS Split):** (4) `profil.css` (3223 sat) → `css/layout.css` (789), `css/components.css` (428), `css/wizard.css` (132), `css/panels/genel-bakis.css` (149), `css/panels/merkezi.css` (1668), `css/panels/sirketler.css` (193). (5) `profil.css` silindi. (6) `profil.html` CSS link'leri guncellendi. (7) `shared.css` 12 spacing duplicate temizlendi. (8) Dark mode + p3 regression testleri guncellendi (split CSS okuma).

**Kademe 2 (Component Classes + Dual-Write + Utility):** (9) `css/components.css`'e ht-btn (8 varyant + sm/lg + is-loading), ht-card (4 varyant), ht-chip (is-active state), ht-input (has-error), ht-modal, ht-toast, ht-toggle eklendi. (10) Task 13A: profil.html'de 141 dual-write class eklendi (eski class korunarak yeni ht- class eklendi). (11) Task 13B: JS factory fonksiyonlari (profil-ui.js 7x field→ht-input, chip→ht-chip, exp-card→ht-card; profil-settings.js modal-overlay→ht-modal; profil-wizard.js field-error→has-error; profil-bootstrap.js + profil-draft.js selected→is-active sync). (12) Task 15: Utility class'lar eklendi (d-flex, flex-wrap, gap-*, mb-*, pos-rel, pointer vb.), 17 inline margin-bottom:0 → CSS kurali, 5 gereksiz g-hero-inner inline style kaldirildi, mk-premium-toggle-card cursor fix.

**Kademe 3 (Nav Restructure):** (13) Sidebar 4 gruba ayrildi: Profil, Kesfet, Iletisim, Hesap. (14) Kim Bakti + Yetkinlikler sidebar nav item'lari eklendi. (15) Bottom nav'a 5. item (Studyo) eklendi. (16) sidebar-nav-label first-child spacing duzeltildi.

**Task 14-15 + Kademe 3 finali:** Session 68'de tamamlandi. Design system migration %100 bitti.

**820/820 Playwright test PASS.** DeepSeek + Codex gate review'lar gecti. 5 commit: 190b114→3845b40.

### Session 65 (5-6 Nisan — Asama 65: Gate Illustrasyon Redesign + AI Routing Policy)
**Gate sayfasi editorial illustrasyon redesign + free-cloud-first AI routing policy olusturuldu.**

**Gate Sayfasi Redesign:** (1) Aday ve isveren tarafina editorial flat-vector illustrasyonlar eklendi (`assets/gate/`). (2) PNG arka plan Python flood-fill ile seffaflastirildi. (3) SVG arka plan dolgu path'leri kaldirildi (1 background rect + 14 buyuk #F5F5F0 + sol ust beyaz kose). (4) Sirt-sirta layout: aday gorseli sag alt, isveren gorseli sol alt + scaleX(-1) ayna. (5) Gradient arka planlar (vermillion warm / navy cool). (6) Hover efektleri: radial glow + buton scale + illustrasyon lift. (7) Logo sola, Giris Yap sag uste hizalandi. (8) Accent cizgileri ve buton oklari kaldirildi. (9) Yazi hizasi: aday sol, isveren sag. (10) Mobile responsive (768px + 380px breakpoint).

**AI Routing Policy:** (11) Local Ollama denendi (phi4-mini, 8GB Air) — kalite + RAM + guvenilirlik fail → iptal. (12) Free-cloud-first routing policy olusturuldu ve CLAUDE.md'ye eklendi. (13) Claude model routing: Haiku=mekanik okuyucu, Sonnet=default muhendis, Opus=sadece escalation. (14) Gemini bugun operasyonel degil, gelecekte yorumlayici/extractor olarak degerlendirilebilir. (15) Playwright tek UAT sahibi olarak teyit edildi.

**Kararlar:** K026: Local LLM mevcut 8GB Air icin iptal, daha guclu donanimda yeniden degerlendirilebilir. K027: Free-cloud-first varsayilan routing modeli.

**3 commit:** c13e4e7→13b90ea.

### Session 64 (4-5 Nisan — Asama 64: Mega Session — 2 gun, ~35 commit, 8 migration)
**Proje tarihinin en buyuk session'i.** Kategoriler:

**KVKK Revizyonlari:** (1) KV1-KV3: cinsiyet, dogum yili, askerlik, engel durumu opsiyonel — default "Belirtmek istemiyorum". (2) KV4: isveren filtresinde yas/cinsiyet zaten yoktu. (3) LB5: giris.html'e KVKK riza checkbox + 18 yas beyani eklendi, buton disabled olmadan kayit yapilamaz, `privacy_consent_at` + `age_confirmed` user_metadata'ya kaydediliyor. (4) kullanim-sartlari.html'e yas beyani sorumlulugu maddesi eklendi.

**Apple Benchmark Profil Iyilestirmeleri:** (5) AP5 (AKS-1): deneyim kartina "Is Tanimi" textarea — `candidate_experiences.description`. (6) AP6 (AKS-3): seyahat istegi dropdown. (7) AP3+AP4: vardiya esnekligi + ihbar suresi dropdown. (8) LB7 (AKS-6): DEI beyani footer.

**Zorunlu Alanlar Guclendirme:** (9) Ilce zorunlu (Step 1). (10) Sektor + segment zorunlu (Step 2). (11) Calisma tipleri + segment tercihleri zorunlu (Step 4). (12) En az 1 egitim zorunlu (Step 3). (13) Turkce-Anadil default dil.

**UX Iyilestirmeleri:** (14) Apple tarzi search→chip lokasyon secici (Step 5 redesign). (15) Tum dropdown'lar alfabetik siralandi. (16) Opsiyonel alanlara motivasyon hint'leri (KVKK alanlari "(opsiyonel)" kaldi, diger alanlar fayda odakli). (17) "Henuz is deneyimim yok" auto-toggle (kart eklenince kalkar, silinince geri gelir).

**Altyapi:** (18) LB1: analytics_events tablosu + HT.trackEvent() + ht_track bridge. (19) LB2: Cloudflare Web Analytics zaten aktifti. (20) Isveren lead sistemi: employer_leads tablosu + submit_employer_lead RPC + email_outbox bildirimi + admin panelde Leads sekmesi (durum yonetimi + not).

**Audit & Bugfix:** (21) Code review: p_work_prefs'e travel/shift/notice eksikti — fix. (22) Description cache eksikti — fix. (23) Full pipeline audit: draft restore eksik 3 alan — fix. (24) search_employer_candidates RPC'ye yeni alanlar eklendi (description, takim_buyuklugu, travel, shift, notice). (25) target_roles cache, bos egitim validation, profil puani rebalance, profile_completed flag — hepsi fix.

**Kararlar:** K025a-f: pgvector DEFER, conversational koc DEFER, schema.org KISMI, GEO/FAQ YAKIN, AI ozetleme DEFER, Gemma 4 DEFER.

**Wizard Redesign (5 Nisan devam):** (26) Wizard 6→7 step: CV & Hakkimda ayri step. (27) Hakkimda Step 2'ye tasindi (deneyimlerden once). (28) Musaitlik tamamen kaldirildi (ihbar suresi kapsiyor). (29) Seyahat/Vardiya/Ihbar → Step 5 "Lokasyon & Uygunluk". (30) Lokasyon: custom multi-select dropdown (checkbox listesi + arama filtresi + secilen lokasyonlar altta). (31) AI ile Turkceye Cevir: Claude Haiku Edge Function (translate-text), Ingilizce algilaninca buton gorunur. (32) Kariyer Yonelimi coklu secim. (33) Hedef pozisyon max 3 siniri. (34) "Halen burada calisiyorum" tarih ustune tasindi. (35) Profil tamamlama sistemi redesign: granüler 100p, CV 15p + Bio 5p, hint'ler tiklanabilir. (36) Profil onizleme: completion donut + bio + iletisim yatay bar + deneyim full-width. (37) Egitim "(En az 1 egitim gerekli)" label. (38) Bio 1000 karakter, font normalize. (39) Dropdown'lar alfabetik siralama (6 liste).

**Altyapi & Fix (5 Nisan):** (40) employer_lead_notification email template eklendi + deploy. (41) admin_get_leads/admin_update_lead RPC: auth.users → auth.jwt() fix. (42) Supabase Advisor bulgulari yapilacaklara eklendi (SA1-SA5). (43) Var hoisting bug (seyahat/vardiya/ihbar pills), bio draft/cache fix.

**Acik kalanlar (sonraki session):** Admin panel leads "Yukleniyor" — logout+login gerekli (JWT refresh). Google Search Console robots.txt — Cloudflare Access bypass rules. Lokasyon checkbox hizasi son polish.

**8 migration, ~35 commit:** 5beac24→6b4f279.

### Session 63 (2 Nisan gece — Asama 63: Landing Page Redesign + Dark Mode + Nav Polish)
**index.html monolitik ana sayfa → minimal gate sayfasina donusturuldu. aday.html ve isveren.html LinkedIn-tarzinda sifirdan yeniden yazildi. Dark mode + nav brand renkleri eklendi.** (1) `index.html`: 2659 → ~130 satir gate page (tam ekran split, sol aday/sag isveren). (2) `aday.html`: 1029 → ~520 satir LinkedIn-style LP (Google signup, pills, steps, "kimin icin"). (3) `isveren.html`: 620 → ~640 satir LinkedIn-style LP (navy hero, lead form, marka pills). (4) `shared.js` nav: 6 sayfa kaldirildi, footer 2 kolon. (5) `shared.css` 14 LP tokeni. (6) **Dark mode:** 3 sayfaya theme-init script + html[data-theme="dark"] overrides eklendi (system preference default). (7) **Nav brand colors:** active link aday=vermillion, isveren=navy. (8) P3 regression test fix (stale 68/68 → flexible regex). **397 test PASS** (365 P3 + 32 smoke). 12 commit: 679c4e2–ba9e452.

### Session 62 (2 Nisan — Asama 48-61: Beta Launch Paketi)
**Tek gunde 12 asama tamamlandi.** (1) Tekrar eden hata guard'lari: ESLint .single() kuralı, truth-sync pre-commit hook, RLS pre-push guard, migration template. (2) Beta premium gate: AI CV + AI yetkinlik degerlendirme 1 hak/kullanici, non-AI premium full acik, "PREMIUM · 3 ay ucretsiz" badge. (3) Teklifler tab blur/gate kaldirildi, premium kartlarda beta erisim notu. (4) "Beni One Cikar" aktif (disabled kaldi). (5) CV template 6 ATS standardiyla optimize (avatar removed, metadata, skills section, normal font). (6) 31 marka gorseli optimize + brands.cover_image_url + informative card v2 redesign (cover, stats, takip). (7) Mini egitim dashboard: rozet strip → progress bar alti, hover tooltip, ilerleme karti + sonraki yetkinlik onerisi. (8) Hello Talent info karti Genel sayfaya eklendi (center feed + left rail compact). (9) Visual QA: 12 screenshot, kritik sorun yok. Pipeline infra: Codex plugin kuruldu (codex review gate), Supabase MCP OAuth baglandi, autopilot kaldirildi, Telegram bot daily ritual sistemi. **730 Playwright + 66 BATS test geciyor.**


## 7. Kritik Kurallar (Quick Ref)

- **`var` kullan**, `const`/`let` degil (Safari SyntaxError onlemi)
- **`.maybeSingle()`** kullan, `.single()` degil (bos sonuc guvenli)
- **UI dili: Turkce** — asla "roportaj", her zaman "mulakat" veya "is gorusmesi"
- **Fontlar:** Bricolage Grotesque (baslik), Plus Jakarta Sans (body), DM Mono (data) — Inter/Roboto yasak
- **Renkler:** Vermillion `#C94E28`, Navy `#1E2D5E`, BG `#F7F6F4` — mor gradient yasak
- **Public-site first:** bir sonraki design/content fazinda oncelik `index.html`, `aday.html`, `isveren.html`, `giris.html`; dashboardlara kullanici istemeden dokunma
- **Public-site design truth:** Clatu/Recraft protokolu aktif; business logic korunur ama eski layout referans alinmaz
- **Gate truth:** `index.html` sade, premium, tek-ekran aday/isveren karar yuzeyi olmali; ekstra aciklayici baslik/emoji/pill/ok gimmick'leri kullanma
- **No emoji:** public-site UI, badge, CTA, helper copy ve illustrasyon ustu etiketlerde emoji kullanma
- **Content revizyon standardi:** AI-SEO + anti-AI-writing; yapay/jenerik copy, uydurma proof ve bos hype kullanma
- **candidates.id = bigint**, hr_profiles.id = uuid, companies/brands.id = bigint
- **console.log yasak** — sadece console.error/warn
- **IIFE pattern:** yeni feature `(function(){ ... })();` ile sar, `window._htX` ile expose et
- **profil.html 6300+ satir** — asla butun dosyayi yeniden yazma, section-by-section edit
- **Deploy:** `git push origin main` → ~40s → Cmd+Shift+R
- **Migration:** `npm run db:new -- name` → edit → `npm run db:push`
- **Cache-bust:** JS import'lara `?v=YYYYMMDDx` ekle

## 8. Derin Dalis Rehberi

| Konu | Kaynak |
|------|--------|
| Tam proje gecmisi (43 session) | `docs/handoff.md` — 3150+ satir |
| Mimari kararlar | `.claude/rules/architecture-decisions.md` |
| Kod kalite kurallari | `.claude/rules/code-quality.md` |
| Deploy workflow | `.claude/rules/deploy-workflow.md` |
| Supabase patterns | `.claude/rules/supabase-patterns.md` |
| Turkce UI kurallari | `.claude/rules/turkish-ui.md` |
| Public-site design protocol | `docs/superpowers/specs/2026-04-06-design-gap-remediation-design.md` |
| Clatu illustration truth | `docs/design-illustration-brief.md` |
| Dev skill (mimari + component) | `.agents/skills/hellotalent-dev/SKILL.md` |
| AI-SEO content discipline | `.agents/skills/ai-seo/SKILL.md` |
| Copy discipline (anti-generic / no fabrication) | `.agents/skills/copywriting/SKILL.md` |
| Data strategy + matching | `.agents/skills/hellotalent-dev/references/data-strategy.md` |
| DB schema referansi | `docs/db-schema-reference.js` |
| Migration arsivi (001-064) | `docs/migrations/` |
| Aktif migration'lar | `supabase/migrations/` (baseline sonrasi 32 dosya) |
| Onceki session hafizasi | `claude-mem` MCP → `smart_search("hellotalent [konu]")` |
| Studio tasarim dokumani | `docs/studio-foundation.md` |
| Coach/support SOP | `docs/coach-support-sop.md` |
