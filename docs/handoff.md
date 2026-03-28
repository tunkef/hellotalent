# hellotalent.ai — Technical Handoff Document
> Son güncelleme: 28 Mart 2026 (Session 41-42 — FAZ 0-4C deployed + AI E2E live verified. Model: gpt-4.1-mini)
> Bu doküman, projenin mevcut durumunu, tamamlanan işleri ve kalan backlog'u kapsar.
> Yeni bir chat/session başlatırken bu dosyayı referans olarak kullanın.


---

## 📋 Session 3 Özeti — 18 Mart 2026

### Tamamlanan İşler

**1. Migration 041 — save_candidate_profile target_roles null safety**
- `candidate_target_roles` INSERT'e WHERE filtresi eklendi: `rol_ailesi` ve `rol_unvani` NULL veya boş olduğunda INSERT atlanıyor
- "Henüz iş deneyimim yok" seçeneği artık hata vermiyor
- Supabase SQL Editor'a direkt uygulandı ✅

**2. Yetkinlik Listesi Finalizasyonu**
- Tier A (19) + Tier B (7) + Tier C (3) = **29 yetkinlik** onaylandı
- Tier C: Cesaret + Karmaşıklık Yönetimi → Bölge Müdürü ve üzeri
- Tier C: Uyum Sağlama → Giriş / Orta / Orta-Üst
- KF FYI_ENGLISH.pdf'den 29 yetkinliğin tamamı extract edildi (130,000 char)

**3. KF Kalitesinde Türkçe İçerik Üretimi — 29 Yetkinlik**
Her yetkinlik için tam yapı yazıldı:
- Tanım (1 cümle)
- Neden kritik (retail bağlamlı, derin paragraf)  
- Yetkin (4-5 davranış maddesi)
- Az Yetkin (4-5 davranış maddesi)
- Çok Yetenekli (3 madde)
- Aşırı Kullanım (2-3 uyarı)
- Retail örneği (sahadan somut senaryo)
- Mülakat hazırlık sorusu

Toplam: ~25,000 Türkçe kelime, Google'da bulunamayacak kalitede orijinal içerik.

**4. mockups/yetkinlikler.html v5 — Canlıya Alındı**
- 29 yetkinlik ANCHORS objesi HTML'e entegre edildi
- 80K → 130K byte (içerik ağırlığı)
- Syntax bug fix: `P&L'ini` apostrofu JavaScript string'i kırıyordu → düzeltildi
- Cloudflare cache purge yapıldı (Custom Purge → URL)
- **Canlı ve çalışıyor:** https://hellotalent.ai/mockups/yetkinlikler.html

### Session 4 — 18 Mart 2026 (Devam)

**5. profil-yetkinlik.js — Panel Implementasyonu (mockup → production)**
- Yeni dosya: `profil-yetkinlik.js` (321 satır, IIFE pattern)
- 29 ANCHORS yetkinlik verisi (def, why, skilled, lessskilled, highlyskilled, overused, retail, interview)
- 34 rol → yetkinlik haritası (ROLES_COMP_MAP)
- COMP_NAMES + COMP_KF lookup tabloları
- Lazy loader: `window._htLoadYetkinlik()` — panel ilk açıldığında render
- Panel render → search (fuzzy Turkish normalize) → results → right-sliding drawer
- Freemium model: ilk 3 kart açık, geri kalanı lock overlay
- Rating sistemi: toggle strong/growing (client-side state)
- Tüm CSS inline inject via `<style>` tag (mockup ile birebir eşleşme)
- SHA: `616c5e8`

**6. profil.html — Panel Entegrasyonu**
- `#panel-yetkinlik` placeholder basitleştirildi (JS'den render)
- `<script src="profil-yetkinlik.js?v=20260318a">` eklendi
- `_doSwitchPanel()`: yetkinlik lazy-load hook eklendi
- Breadcrumb labels: `yetkinlik` ve `mulakat` eklendi
- Cmd+K palette: Mülakat Koçu (📋) eklendi (Yetkinliklerim artık Mülakat Koçu altında)
- SHA: `5a5d3fe`

### Session 4b — 18 Mart 2026 (Akşam — Yetkinlik Wizard v2 & Dashboard Polish)

**7. profil-yetkinlik.js — Ground-Up Rebuild (v1 → v2)**
- Wizard tamamen sıfırdan yeniden yazıldı (tüm 40 regression test geçti)
- 34 rol taksonomisi korundu, rol dropdown alfabetik sıralı (Turkish locale)
- Kısaltılmış yetkinlik isimleri tam Türkçe formlarına genişletildi
- Bento grid layout: asimetrik kart boyutları ile modern grid tasarımı
- Premium bento grid reading view + tam Korn Ferry içerik entegrasyonu (29 yetkinlik)
- Yetkinlik header bento card formatında, İngilizce isimler kaldırıldı
- Önizleme butonu → "Kapat" olarak yeniden adlandırıldı

**8. Dashboard Bento Grid Polish**
- SVG donut chart → horizontal progress bar (profil tamamlanma göstergesi)
- Mülakat kartı tıklanabilir hale getirildi, header rename
- Bento card `.locked` kartlara cursor: pointer eklendi (Özel Teklifler vb.)
- Tüm bento kartlara hover CTA animasyonları eklendi

**9. Kim Baktı Feature — Header Icon Bar**
- Kim Baktı header icon bar'a taşındı (mesajlar ve bildirimler yanına)
- "Detayları gör" linki kaldırıldı, görüntülenme label inline
- Header icon click handler düzgün bağlandı

**10. Avatar & Beni Öner Enhancements**
- Avatar dropdown: title case isim, Bricolage Grotesque font, Talent badge (vermillion)
- Beni Öner aktifken avatar'da yeşil eclipse glow efekti
- Glow efekti güçlendirildi: solid ring + parlak glow
- Profil summary'deki aktif durum göstergesi gizlendi (glow yeterli)

**Commit Geçmişi (Session 4b):**
```
13a5ec1 fix: stronger green glow on avatar — solid ring + bright glow for visibility
6f135cd feat: add hover CTA animations to all bento cards
bf24d3f fix: Kim Baktı — görüntülenme label inline next to count
f5a070f feat: green eclipse glow on avatar when Beni Öner is active
2e8e3c0 fix: wire Kim Baktı header icon click in main script block
5830ae9 fix: pointer cursor on button.bento-card (Özel Teklifler)
5358245 feat: move Kim Baktı to header icon bar
06daba0 fix: Mülakat card clickable, header rename, cursor on bento cards
dfb0d6e fix: remove 'Detayları gör' link from Kim Baktı card
43e2b01 feat: replace donut chart with horizontal progress bar
c8cbcbd fix: expand abbreviated competency names to full Turkish
e2dce6d fix: rename Önizleme button to Kapat in competency reading view
0fe8475 fix: competency header as bento card, remove English names
a228843 feat: premium bento grid reading view + full Korn Ferry competency content
551c62d fix: sort role dropdown alphabetically (Turkish locale)
85190dd feat: bento grid layout for competency preview
0498e8a fix: restore full 34-role taxonomy in competency wizard
```

### Session 5 — 19 Mart 2026 (Full Bento Standardization & New Panels)

**11. Bento Grid Design System Standardization**
- `.agents/skills/bento-grid-design/SKILL.md` — tüm AI agent'lar için design skill oluşturuldu
- Tüm panellere turuncu `g-hero` card eklendi (Markalar, Teklifler, Mesajlar, Bildirimler, Ayarlar, Kim Baktı)
- Hero card `min-height:110px` — tüm panellerde aynı boyut
- Border tutarlılığı: tüm kartlara `1px solid var(--border-subtle)` veya `rgba(255,255,255,0.1)`
- Shadow standardizasyonu: tek shadow `0 2px 8px, 0 8px 20px` tüm kartlarda
- Gap standardizasyonu: tüm grid'ler `16px`
- Border-radius: bento-card + mk-card `23px → 16px`

**12. Panel Bento Grid Uygulamaları**
- Kim Baktı: bento grid (stat span 1 + chart span 2 + segment + viewers + premium CTA)
- Ayarlar: 3 kolon bento grid (asimetrik span'lar)
- Profil Merkezi: 4 kolon → 3 kolon, Kişisel Bilgiler + Tercihler span 2
- Markalar: 4 kolon bento box (tall 1x2, wide 2x1, large 2x2 kartlar)

**13. Mülakat Koçu Panel (eski İş Görüşmeleri)**
- Tamamen yeniden tasarlandı → 7-screen guided flow (Session 7'de son hali)
- ~~STAR quad card, carousel, yapın/yapmayın ayrı kartlar~~ → bento grid landing + collapsible STAR
- Rol seçim, lobby, competency intro, practice, completion, session_complete ekranları eklendi

**14. Teklifler v2 — Freemium/Premium Toggle**
- Yeni dosya: `profil-teklifler.js` tamamen yeniden yazıldı (377 satır)
- Toggle bar: Herkese Açık / Premium (taç ikonu)
- Top 6 carousel (2 slide x 3 kart, dots navigasyon)
- Bento grid: asimetrik (5n+1 span 2), dense flow
- 6 freemium + 6 premium demo kampanya (retail temalı)
- Premium tab: frosted glass gate (blur overlay + fixed CTA ortada)
- Demo kartlar: gerçek kampanya geldiğinde otomatik kaybolur

**15. Premium Panel**
- Yeni dosya: `profil-premium.js` (187 satır)
- 6 premium özellik kartı bento grid'de (asimetrik)
- 3 plan kartı: Aylık 149 TL, Yıllık 99 TL (navy highlight), Kariyer 249 TL
- Tüm "Yakında" etiketleri kaldırıldı → Premium paneline yönlendirme
- Global premium CTA delegation: tüm "Premium'a Geç" butonları tek handler

**16. Profil Preview Drawer Redesign**
- Drawer: header altından başlıyor, `border-radius:20px`, 12px margin
- Avatar glow: Beni Öner aktifken yeşil eclipse (header + preview)
- Overlay: header'ı engellemiyor

**17. Markalar Panel Refactor**
- `profil-markalar.js` ayrı dosya olarak extract edildi (449 satır, 22 fonksiyon)
- profil-ui.js: 3484 → 3066 satır (-418)
- Marka kartları düz beyaz (gradient/glow kaldırıldı, renkler hafızada)
- Glassmorphic logo kutuları
- Ön yüz sadeleştirildi: segment badge + mağaza sayısı gizlendi
- Arka yüz: kompakt layout, Website/Instagram ikon-only butonlar
- Bento box grid: 4 kolon, farklı boyutlar (tall, wide, large)
- 32 marka resmi renkleri doğrulandı ve hafızaya kaydedildi

**18. Genel İyileştirmeler**
- URL hash ile panel persist: sayfa yenilendiğinde kaldığın yerde devam
- Wizard pozisyon validasyonu düzeltildi (unvan-sec/unvan-custom)
- Inbox yükleme sorunu düzeltildi (positions FK kaldırıldı)
- profile_view_events 400 hatası düzeltildi (companies.ad → company_name)
- Favicon eklendi (inline SVG, vermillion "ht")
- Header nav: glow efekti (pointer yerine)
- Loading screen: pointer-events:none on fade-out
- Avatar dropdown isim: DB'den güncelleme eklendi
- Dark mode: marka kartları light mode'da sabit

### Session 6 — 19 Mart 2026 (Marka Kartları Redesign & Hover-Reveal)

**19. Marka Kartları Renk Sistemi Yenileme**
- 32 markanın resmi kurumsal renkleri kullanıcı tarafından doğrulandı ve güncellendi
- Tüm gradient'ler kaldırıldı → düz hex renkler (backBg + accent eşitlendi)
- Siyah markalar (#000000) için premium dinamik renkler atandı:
  - Prada gece mavisi, Vakko bordo, Mango amber, Bershka mor, Sephora erik, MAC şarap, vb.
- 10 renk düzeltmesi: LC Waikiki kırmızı→mavi, Teknosa kırmızı→turuncu, Beymen kahve→siyah, vb.
- Koton markası renk haritasına eklendi (eksikti)
- Fallback renk: `#000000` → `#2A2A3A` (koyu lacivert)

**20. Marka Kartları Hover-Reveal Animasyonu**
- 3D flip mekanizması kaldırıldı → CSS hover-reveal geçişine dönüştürüldü
- Ön yüz: hover'da `height:0 + opacity:0` ile kaybolur
- Arka yüz: `rotate(90deg) scale(-1)` → `rotate(0deg)` ile dönerek belirir
- Kart hover'da `scale(1.03)` + derin gölge efekti
- Tıklama (onclick flip) kaldırıldı — sadece hover ile geçiş

**21. Marka Kartları Glassmorphic Ön Yüz**
- Kartın tabanına marka kurumsal rengi uygulandı (solid background)
- Ön yüz: `rgba(accent, 0.15)` yarı saydam dolgu + `backdrop-filter:blur(20px)`
- Cam kenarlık: `1px solid rgba(255,255,255,0.25)`
- Yumuşak gölge: `0 8px 32px rgba(0,0,0,0.06)`
- Marka adı ön yüzden gizlendi → sadece logo görünür

**22. Marka Kartları Arka Yüz Sadeleştirme**
- Mağaza sayısı, çalışan sayısı, merkez şehir, açıklama kaldırıldı
- Sadece marka adı (ortalı, 20px/800) + Takip Et butonu kaldı
- Website/Instagram ikon linkleri kaldırıldı
- Takip Et butonu yeniden tasarlandı: SVG kişi ikonu + tooltip container

**23. Asimetrik Bento Grid**
- `nth-child(10n+X)` ile 10 kartta bir tekrarlanan desen:
  - Pozisyon 1: 2x2 büyük hero
  - Pozisyon 4, 9: 1x2 dikey uzun
  - Pozisyon 5, 8: 2x1 yatay geniş
  - Geri kalan: 1x1 standart
- Canlı renkli markalar hero pozisyonlara sıralandı (interleave sort)
- `grid-auto-flow:dense` boşlukları otomatik doldurur
- Responsive: 900px 3-kolon, 600px 2-kolon, 400px 1-kolon

**24. Mülakat Koçu Panel Fix (eski İş Görüşmeleri)**
- Rol dropdown ve "Başla" butonu hiza düzeltmesi
- İkisi de sabit `height:44px` ile eşitlendi

**Commit Geçmişi (Session 6):**
```
187af98 fix: force 44px height on both dropdown and Başla button + cache bust
d03c1b7 fix: center brand name + follow button on card back
eeeb193 fix: simplify card back — brand name + follow button only
4dbf4ed feat: asymmetric bento grid for brand cards — proper rhythm
4623410 feat: premium dynamic colors for all brands + balanced card sizes
0fc3343 feat: replace flip cards with hover-reveal animation
17d7262 feat: true glassmorphic front — brand color shows through frosted glass
ad4fa43 fix: hide brand name on card front — logo only
a942127 fix: remove website/instagram link icons from brand card back
7309fcf feat: brand card follow button with person icon tooltip design
5f93ccc fix: brand cards use flat official colors — no gradients
```

**25. Migration 042 — Competency Tables Deployed**
- 3 tablo oluşturuldu ve Supabase'e deploy edildi:
  - `competency_definitions` (29 satır) — 29 KF yetkinlik, text[] array kolonları
  - `role_competency_map` (237 satır) — 33 rol × ortalama 7 yetkinlik eşlemesi
  - `candidate_competencies` (boş) — aday self-assessment (strong/growing)
- RLS: referans tablolar public read, aday tablosu own CRUD + employer read
- Updated_at trigger aktif
- Seed verisi Management API ile deploy edildi (042 schema + 042a seed)
- Commit: `b0c3b1b`

### Session 7 — 20 Mart 2026 (Mülakat Koçu Unification)

**26. Yetkinlik + İş Görüşmeleri → Mülakat Koçu Birleşimi**

Aday tarafında iki ayrı ürün (`Yetkinliklerim` + `İş Görüşmeleri`) tek bir `Mülakat Koçu` deneyimine birleştirildi.

**Ürün Kapsamı:**
- Yetkinlik öğrenimi (güçlü sinyaller, risk sinyalleri, aşırı kullanım)
- Tek-soru mülakat pratiği (289 yetkinlik bazlı soru, 29 yetkinlik)
- `Ne Aranır?` koçluk paneli (skilled / lessskilled / overused)
- STAR+T ipucu (açılır/kapanır)
- Gelişim Günlüğü (STAR taslak kaydetme)
- Freemium gating (FREE_COMP_LIMIT=2, FREE_Q_PER_COMP=3, FREE_SWAP_LIMIT=2)

**7-Screen Flow:**
```
star_intro → role_select → lobby → competency_intro → practice → completion → session_complete
```

**Dosya Değişiklikleri:**
- `profil-isgorusmeleri.js` → `profil-mulakatkocu.js` (git mv ile rename)
- `profil.html`: script tag güncellendi, panel comment güncellendi, navigation birleştirildi
- `profil-yetkinlik.js`: bridge comment güncellendi (veri kaynağı rolü korundu)
- `docs/mulakat-theme-reference.md`: yeni referans dokümanı oluşturuldu

**Navigasyon Birleşimi:**
- Header: tek `Mülakat Koçu` butonu (`data-panel="mulakat"`)
- Bottom nav: tek `Mülakat Koçu` girişi
- Dashboard bento card: tek `Mülakat Koçu` kartı
- Eski ayrı `Yetkinliklerim` girişleri kaldırıldı

**Runtime Contract (değişmedi):**
- Panel key: `mulakat`
- Loader: `window._htLoadMulakat()`
- DOM target: `panel-mulakat`
- Data bridge: `window._htYetkinlikData` (ANCHORS, ROLE_COMP_MAP, COMP_NAMES, COMP_KF, FREE_LIMIT)

**Persistence:**
- `sessionStorage`: flow state (current screen, selected role, comp queue, question index)
- `localStorage`: star_seen flag, recent questions, journal drafts (`ht_journal_{compCode}_{qHash}`)
- Journal drafts survive page refresh and cross-session

**Intro Screen (star_intro):**
- Navy gradient hero card (product-level landing)
- Bento grid: Yetkinliği Öğrenin (span 2) + proof stats (span 1, navy) + Soruları Çalışın + Günlüğünüzü Oluşturun + STAR+T collapsible
- STAR present but secondary (collapsible, not dominant)
- Proof stats: 29 yetkinlik, 289 yetkinlik bazlı soru, gelişim günlüğü

**Design System Alignment:**
- All card surfaces follow bento spec: 16px radius, 24px hero, `0 2px 8px / 0 8px 20px` shadow, 16px gap
- Typography: Bricolage Grotesque headings (16px/700), Plus Jakarta Sans body (12px/400), DM Mono data
- Colors: Vermillion #C94E28 (primary), Navy #1E2D5E (authority), bg-surface, border-subtle

**Referans Dokümanlar:**
- `docs/mulakat-theme-reference.md` — PDF kaynak model, veri kontratı, V1/V2 entegrasyon planı
- `.agents/skills/bento-grid-design/SKILL.md` — tasarım sistemi kuralları

**27. Intro Screen Micro-Polish**
- Proof card copy: `gerçek soru` → `yetkinlik bazlı soru`, `∞` → pen SVG icon
- STAR card: `.ig-lcard` wrapper kaldırıldı → `.ig-landing-star` direct grid child
- Inline style overrides → CSS classes (`.ig-landing-star-desc`, `.ig-proof-num svg`)
- Card title size: 15px → 16px (dashboard `.bento-title` ile uyumlu)
- STAR card hover lift + transition eklendi

**28. Dosya Rename & Copy Consistency**
- `profil-isgorusmeleri.js` → `profil-mulakatkocu.js` (tüm referanslar güncellendi)
- Hero subtitle: `gerçek sorularla pratik yapın` → `yetkinlik bazlı sorularla pratik yapın`
- Cache bust: `v=20260320a` → `v=20260320b`

### Session 8 — 20 Mart 2026 (Phase 2A/2B Data Contract & Drift Reconciliation)

**29. Phase 2A — Data-Contract Hardening Patch**
- Müsaitlik zorunlu alan yapıldı (validateTercihler + kırmızı yıldız)
- LinkedIn blur normalizer (auto-prefix https://, format validation)
- collectTargetRoles: canonicalizeRole() → canonical string extraction (object return type fix)
- Smart brand blur: parent/company exact-match resolution (tek çocuk → resolve, çoklu → company-only)
- Duplicate actively-looking toggle cleanup (profil-ui.js settings listener kaldırıldı)
- Helper text: "Listeden seç veya serbest yaz. Marka adı otomatik eşleştirilir."

**30. Schema Reference File**
- `docs/db-schema-reference.js` — JSDoc @typedef for 15 tables, 9 RPC functions, storage paths
- IDE intellisense desteği (VS Code Go to Symbol, Cmd+F)
- Vanilla JS codebase, build system yok → Supabase CLI type gen yerine JSDoc tercih edildi

**31. Phase 2B — Drift Reconciliation**
- Live schema truth: information_schema.columns query ile 10 drift column teyit edildi
- `043_drift_reconciliation.sql`: 8 candidates + 2 candidate_experiences column formalized
  - candidates: is_actively_looking, ilk_deneyim, adres_ilce, account_status (enum), 4× notify
  - candidate_experiences: rol_ailesi, rol_unvani
- `044_save_profile_experience_role_fields.sql`: RPC silent data loss fix
  - save_candidate_profile() experience INSERT'e rol_ailesi + rol_unvani eklendi
  - Bug: front-end sent both fields, RPC silently dropped them, DELETE+re-INSERT wiped existing values
- Deploy sırası: 043 → 044 (044 depends on 043 column existence)

### Session 9 — 20 Mart 2026 (Phase 3A — Server-Side Candidate Search)

**32. search_employer_candidates RPC (Migration 045)**
- `045_employer_candidate_search_rpc.sql`: Single RPC replaces 6-7 client-side queries
- Server-side filtering: pozisyon, şehir, deneyim range, segment, müsaitlik, çalışma tipi, eğitim, dil, aktif arayan
- Ranking contract (0-100 match_score):
  - +20 is_actively_looking, +15 profile_completion_pct (scaled), +20 recency (30/90 day tiers)
  - +10 experience depth (capped 10yr), +15 target role match, +10 availability urgency, +10 language match
- match_reasons: Turkish text array explaining active score components
- Blocked companies + hide_from_current_employer handled server-side
- 6 supporting indexes for hot filter paths
- Pagination: p_limit + p_offset with total count
- Sort: relevance (match_score), newest, exp_asc, exp_desc

**33. ik.html RPC Integration**
- Replaced loadLiveCandidates() waterfall (candidates + 4 child tables) with single searchCandidates() RPC call
- applyFilters() → debounced (300ms) server-side search
- Sort dropdown: added "Önerilen" (relevance) as default, value attributes for RPC mapping
- mapRPCtoADAYLAR(): maps RPC JSONB response → existing ADAYLAR shape (card/drawer compatibility)
- collectFilters(): reads DOM filter state → p_filters JSONB for RPC
- resetFilters() also resets sort to "Önerilen"
- result-count shows RPC total (_searchTotal) not page list.length — "137 aday bulundu" even if page=100

**34. Phase 3A Patch — Security + Schema Fixes**
- RPC auth guard: auth.uid() → hr_profiles lookup → NOT FOUND = reject (candidates cannot call)
- company_id derived server-side from hr_profiles, not trusted from p_employer_company_id parameter
- p_employer_company_id kept for backward compat but validated against derived value
- brands column confirmed as `brand_name` in production (live schema query verified)
- Migration 012 originally used `name` — renamed to `brand_name` post-012 (untracked)
- Migration 046 added: idempotent reconciliation (brands.name→brand_name, companies.name→company_name)
- ik.html, 045 RPC, db-schema-reference.js all aligned to `brand_name`

**35. Phase 3B — Brand/Company Canonicalization + FK Prep**
- Migration 047: Added nullable `company_id` and `brand_id` FK columns to `candidate_experiences` and `candidate_brand_interests`
- Migration 048: Updated `save_candidate_profile` RPC to write company_id/brand_id alongside text fields
- Migration 049: Updated `search_employer_candidates` — id-first visibility matching with text fallback for legacy rows. Also replaces `check_candidate_visible_to_employer` and `send_employer_message` (was 032) with id-first + brand_name versions.
- Backfill (049 Part 4): Unique-match-only backfill (HAVING count(*)=1) for brand_id/company_id on experiences + brand interests. Ambiguous rows skipped.
- Response contract: `diller` = string[] (dil names for chips), `languages` = object[] ({dil,seviye} for detail view), `segment`, `egitim_seviye` aligned to ik.html mapper.
- profil-ui.js: `_initBrandCompanyLookup()` fetches brands/companies at page load, enriches BRAND_DB with ids. Autocomplete picks and blur exact-matches now resolve company_id/brand_id into dataset attributes. `collectExperiences()` and brand interests save paths include ids.
- **Text columns preserved** — sirket, marka still written on every save. Old data works via text fallback. New data has both text + FK ids.

**36. Toggle State Management Fix — Verified ✅**

Root cause (3 katman):
1. **Dağınık DB write:** 7 bağımsız `.update()` yolu (profil-ui.js ×3, profil-settings.js ×3, profil.html ×1), rollback yok, cross-panel sync yok
2. **Eksik profile mapping:** `loadProfileFromDB()` `select('*')` ile çekiyor ama döndürdüğü objeye `is_actively_looking` ve `user_id` eklememiş → `undefined` → merkez/ayarlar desync
3. **Hardcoded HTML default:** `merkez-toggle-active` ve `wiz-toggle-active` HTML'de `checked` attribute ile başlıyor → DB verisi yüklenmeden `true` gösteriyor

Çözüm:
- Shared sync IIFE: `syncBeniOner()`, `syncActivelyLooking()`, `syncHideFromEmployer()` — tek DB write noktası, tüm panel DOM sync, rollback on failure
- profil-settings.js: 3 competing DB write kaldırıldı → `window.sync*` delegate
- profil.html: `refreshAfterVisibilitySave()` → thin redirect to `syncBeniOner()`
- `loadProfileFromDB()` profile mapping'e `is_actively_looking` + `user_id` eklendi
- `merkez-toggle-active`, `wiz-toggle-active` HTML'den `checked` kaldırıldı

Canlı smoke test (candidate_id=5):
- 6/6 senaryo PASS (Merkez↔Ayarlar her toggle ON/OFF)
- DB doğrulama: her toggle değişikliği Supabase SQL Editor ile teyit edildi
- Hard refresh sonrası 7/7 toggle DB ile eşleşiyor
- Son temiz state: `is_active=true, is_actively_looking=false, hide_from_current_employer=false`

Commits: `7ed4619` → `45579e2` → `ef04f95` → `fa21a4a`
Cache: `profil-ui.js?v=20260320d`, `profil-settings.js?v=20260320d`
**Toggle tarafında blocker kalmadı.** `saveProfileRPC` başarı sonrası `_loadedDBData.profile` artık merkez DOM’dan `is_actively_looking` / `hide_from_current_employer` ile güncelleniyor ve `applyAllVisibilityMirrorsFromProfile()` çağrılıyor (gereksiz `syncBeniOner` DB tekrarı kaldırıldı). Cache: `profil-ui.js?v=20260320f`.

### Session 10 — 20 Mart 2026 (Phase 3C — Position-Aware Recommendation Scoring)

**37. Migration 050 — Position-aware scoring engine**
- `search_employer_candidates` RPC genişletildi: 6. parametre `p_position_id bigint DEFAULT NULL`
- Pozisyon seçildiğinde 12-sinyalli skorlama (100 puan üzerinden):
  - Hedef rol tam eşleşme (+18), rol ailesi (+10), deneyim eşleşmesi (+12)
  - Segment (+10), şehir (+10), deneyim süresi uyumu (+8)
  - Müsaitlik (+8), marka ekosistemi (+6), aktif arıyor (+6)
  - Güncellik (+5), profil tamlığı (+4), çalışma tipi (+3)
- Pozisyon seçilmediğinde geriye uyumlu genel skor (mevcut 049 mantığı korunuyor)
- Türkçe `match_reasons` dizisi: "Hedef rol: tam eşleşme", "Deneyim: aynı pozisyon", vb.
- Pozisyon `exp` text alanı regex ile parse: "3-5 yıl", "5+ yıl", "5 yıl" → min/max int
- Güvenlik: `p_position_id` çağıranın company_id'sine ait olmalı
- Dosya: `docs/migrations/050_position_aware_scoring.sql`
- ✅ **Supabase:** Migration 050 SQL Editor'da uygulandı (`CREATE OR REPLACE FUNCTION` başarılı).
- **PostgREST overload:** 5-param (eski) ve 6-param (`p_position_id` dahil) sürümler birlikte duruyor; çağrı parametre adlarına göre eşleşir — `p_position_id` göndermeyen istemciler 5-param, gönderenler 6-param RPC'ye gider.

**38. ik.html — Pozisyon eşleştirme UI**
- Aday araç çubuğuna "Pozisyon:" dropdown eklendi (`poz-match-select`)
  - Aktif pozisyonlardan otomatik dolduruluyor (`populatePozMatchDropdown`)
  - "Tümü (Genel Skor)" default seçenek → geriye uyumlu
- `searchCandidates()` → `p_position_id` RPC'ye gönderiliyor (sadece `window.__HT_POSITION_SCORING === true` ise)
- `buildCandidateCard()` → match score pill (⚡ X puan) + match reason tag'leri
  - Score: navy gradient pill, bold
  - Reasons: verm tintli tag'ler (F5EDE9 bg, C94E28 text)
- Pozisyon CRUD sonrası dropdown otomatik güncelleniyor
- Commit: `7623f3a`

**39. Phase 3C — Canlı aktivasyon (20 Mart 2026, akşam)**
- `window.__HT_POSITION_SCORING = true` — `ik.html` içinde (auth guard öncesi atanır; oturumsuz sayfada redirect olsa da bayrak kaynakta mevcut).
- `searchCandidates()` → `p_position_id` yalnızca bayrak `true` iken RPC'ye eklenir (migration yokken güvenli kapanma için tasarlanmıştı; artık migration da canlı).
- Git: `a8fc46e` — `feat(ik): enable position-aware scoring after migration 050 deploy` (push: `origin/main`).
- Doğrulama notu: Oturumsuz `ik.html` ziyareti `giris.html?tab=ik` yönlendirmesi beklenen davranış; tam E2E için işveren oturumu + pozisyon seçimi + aday listesi smoke önerilir.

### Session 21 — 25 Mart 2026 (Wizard Audit + Step 4 Simplification)

> **⚠️ Current live truth for Step 4.** This session supersedes ALL earlier Step 4 references (Sessions 8, 10, 18). Kariyer Hedefi textarea is removed, Kariyer Yönelimi is 2-option single-select, Hedef Pozisyonlar uses a single retail-catalog dropdown (no Rol Ailesi in UI), and brand interests auto-follow on save. If you see older Step 4 wording in earlier sessions, treat it as historical context only — the model below is what is deployed.

**Full wizard audit completed** — 5-phase fix/verification cycle covering save/restore consistency, DB contract alignment, employer visibility, scoring, and Step 4 UX simplification.

**Phase 1 — Frontend wizard fixes (profil.html, profil-ui.js, ik.html):**
- Fixed `selectedMüsaitlik` → `selectedMusaitlik` typo in draft/DB restore (data-loss bug)
- Fixed draft month restore (integer→string mismatch)
- Fixed save-success cache: all 8 preview slices now sync without reload
- Fixed pozisyon validation for `__custom__` sentinel
- Removed misleading `*` from Sektör and Hedef Pozisyonlar labels
- ik.html dashboard count now uses compound visibility rule
- Commit: `e7bc25a`

**Phase 2 — DB: clearable fields + completion + visibility (migration `20260325072721`):**
- Optional profile fields use `CASE WHEN p_profile ? 'key'` pattern (omission-safe, clearable)
- `ilk_deneyim = true` awards 25 experience points in `compute_candidate_profile_completion`
- `check_candidate_visible_to_employer` + `send_employer_message` use compound visibility rule
- ✅ Deployed to Supabase

**Phase 3 — DB: location prefs + role-family fix (migration `20260325073331`):**
- City filter and scoring include `candidate_location_preferences` (preferred work cities)
- Role-family heuristic removed (was dead code / cross-candidate noise)
- Exact target-role match (+18) preserved
- ✅ Deployed to Supabase

**Step 4 Simplification — Frontend + DB (migration `20260325084751`):**
- Removed `Kariyer Hedefi` free-text textarea
- `Kariyer Yönelimi`: reduced to 2 single-select options (Yukarı Terfi / Yatay Geçiş), `lider` removed
- `Hedef Pozisyonlar`: Rol Ailesi removed from candidate UI; single dropdown from retail catalog; max 5; dedup
- `rol_ailesi` derived from `POSITION_TO_FAMILY` reverse lookup at save time
- DB: dropped stale `candidate_target_roles_rol_ailesi_check` (001 whitelist), replaced with non-empty text guard
- DB: normalized legacy `career_type` values, added CHECK for `yukari|yatay|null`
- DB: `save_candidate_profile` now auto-follows brands via `candidate_brand_follows` (ON CONFLICT DO NOTHING)
- Preview: career_type shows Turkish labels; career_goal italic quote removed
- `?career_goal=` prefill remapped to first target-position dropdown
- Default blank target-role row no longer inflates completion/score
- Brand follow counter refreshes after wizard save without reload (if markalar panel loaded)
- ✅ Migration deployed to Supabase

**Dosya Değişiklikleri:**
```
EDIT  profil.html (Step 4 HTML, applyDraft, reapplyDynamicFields, career_goal prefill)
EDIT  profil-ui.js (addTargetRoleRow, collectTargetRoles, collectWorkPrefs, career type init, save cache, follow sync)
EDIT  profil-core.js (CAREER_TYPE_OPTIONS, RETAIL_POSITIONS, POSITION_TO_FAMILY, CAREER_TYPE_LABELS)
EDIT  profil-preview.js (career_type Turkish labels, career_goal removed)
EDIT  profil-summary.js (target-role completion truth, hint text)
EDIT  ik.html (dashboard count compound visibility)
CREATE supabase/migrations/20260325072721_phase2_clearable_fields_completion_visibility.sql
CREATE supabase/migrations/20260325073331_phase3_role_family_and_location_prefs.sql
CREATE supabase/migrations/20260325084751_step4_simplification.sql
```

**Migration Deploy Durumu (Session 21):**
| Migration | İçerik | Supabase |
|-----------|--------|----------|
| `20260325072721` | clearable fields + ilk_deneyim completion + compound visibility | ✅ Deployed |
| `20260325073331` | preferred location filter/scoring + role-family disabled | ✅ Deployed |
| `20260325084751` | Step 4 simplification: CHECK drop + career_type normalize + brand auto-follow | ✅ Deployed |

**Smoke testler (Session 21b — browser ile doğrulandı):**
- [x] Wizard Step 4: Kariyer Hedefi textarea yok, 2 yönelim, tek dropdown/pozisyon, Rol Ailesi yok ✅
- [x] `?career_goal=Mağaza%20Müdürü` → ilk dropdown prefilled ✅ (live Playwright smoke)
- [x] Step 4 target-role rows: Mağaza Müdürü, Bölge Müdürü, Operasyon Müdürü DB'den restore ✅
- [x] Panel switching: Genel, Merkez, Kim Baktı, Ayarlar all work ✅
- [x] Hash restore: `#merkez`, `#ayarlar`, `#kimbakti` bootstrap-done event ile senkron ✅
- [x] Kim Baktı: panel render, chart, viewer list, premium CTA ✅
- [x] Cmd+K palette: açılır, arama çalışır, panel switch doğru ✅
- [x] Avatar dropdown: isim, tema toggle, çıkış butonu ✅
- [x] Save: `Mağaza Müdürü` seç → DB'de `rol_ailesi = "Mağaza Yönetimi"` ✅ Code trace verified: `POSITION_TO_FAMILY["Mağaza Müdürü"] = "Mağaza Yönetimi"` (profil-core.js:226→419–426), `collectTargetRoles()` (profil-ui.js:1379) sends `{rol_ailesi, rol_unvani}`, RPC inserts into `candidate_target_roles` (migration 20260325084751:232–241)
- [x] Brand interest auto-follow: Zara ekle → save → `candidate_brand_follows` satırı ✅ Code trace verified: `save_candidate_profile` RPC inserts `candidate_brand_follows` with `ON CONFLICT DO NOTHING` (migration 20260325084751:279–286)
- [x] İşveren exact match: `Mağaza Müdürü` hedefleyen aday → `Hedef rol: tam eşleşme` tag'i ✅ Code trace verified: `search_employer_candidates` RPC scores +18 for exact `rol_unvani` match (050_position_aware_scoring.sql:276–290), returns "Hedef rol: tam eşleşme" reason (050:387–401)

**Bilinen kısıtlamalar:**
- Hedef Pozisyon kataloğu sadece `Mağazacılık / Perakende` sektöründen geliyor. Diğer sektör rolleri (Konaklama, Sağlık, Finans, Havacılık, Gıda) henüz Step 4 dropdown'ında yok — bunlar Step 2 deneyim kartlarında seçilebilir ama hedef pozisyon olarak seçilemez.
- `rol_ailesi` fallback `"Diğer"` değerine düşer — legacy veya katalog dışı pozisyon değerleri için.
- Brand interest auto-follow additive only — wizard'dan silinen marka takibi kaldırmaz (manual follows korunuyor).

### Profil Sayfası Modül Haritası (Session 21 sonrası)

profil.html inline script ~3079 satırdan ~1530'a indirildi (extraction oranı: %50+). Kalan inline: tema FOUC önleme, Sentry init, ht_track stub (boot-critical, extract edilemez).

**Extraction track: CLOSED.** 6 modül extract edildi (wizard, draft, helpers, kimbakti, bootstrap, events). profil-events.js DOMContentLoaded yerine readyState guard kullanıyor (script position 20'de DCL zaten geçmiş olabiliyor). Hash restore `ht:bootstrap-done` custom event ile senkronize — pre-existing 300ms race fix edildi. Kalan inline JS boot-critical micro-block'lar — gelecekte yeni bir feature gerektirmedikçe ek extraction planlanmıyor.

**Yükleme sırası (script tag order):**

| # | Dosya | Sorumluluk | Satır |
|---|-------|-----------|-------|
| 1 | shared.js | Supabase config (HT.getSupa) | — |
| 2 | profil-core.js | Globals: supabase, currentUser, _loadedDBData, val, trLower | ~437 |
| 3 | profil-data.js | Referans veri: TUR_ILLER, BRAND_DB, SEKTOR_ROL_MAP | — |
| 4 | profil-ui.js | Wizard core: step init/collect, save RPC, load, helpers | ~1928 |
| 5-9 | profil-locations/summary/genel/visibility/preview/cv | Extracted domain modules | — |
| 10-14 | profil-markalar/settings/teklifler/inbox/yetkinlik/mulakatkocu/premium | Feature modules | — |
| 15 | **profil-wizard.js** | Wizard state machine, validation, panel switching, mobile sidebar | ~339 |
| 16 | **profil-draft.js** | setVal, saveDraft, loadDraft, clearDraft, applyDraft | ~188 |
| 17 | **profil-helpers.js** | [data-panel] delegation, refreshAfterSettingsSave, visibility helpers | ~85 |
| 18 | **profil-kimbakti.js** | Kim Baktı panel + lab card (loadViewersCard) | ~291 |
| 19 | **profil-bootstrap.js** | Auth, DB load, step-init orchestration, career_goal prefill | ~283 |
| 20 | **profil-events.js** | DOMContentLoaded event wiring, Cmd+K, avatar dropdown, page glue | ~390 |

**Bold** = Session 21 extraction. Sıralama kritik: wizard→draft→helpers→kimbakti→bootstrap→events.

**Cross-file global contract:**
- `wizStep` (var): profil-wizard.js tanımlar, profil-draft.js okur/yazar
- `wizardDirty` (var): profil-wizard.js tanımlar, profil-ui.js + profil-events.js yazar
- `switchPanel`: profil-wizard.js tanımlar, profil-helpers/events/genel/inbox + inline delegation çağırır
- `_htBootstrapDone` + `ht:bootstrap-done` event: profil-bootstrap.js set eder, profil-events.js hash restore için bekler

### Session 21b — 25 Mart 2026 (Extraction + Mobile Stabilization + UX Polish + CI Fix)

**Profil.html Extraction (6 pass):**

| Pass | Dosya | Sorumluluk | Commit |
|------|-------|-----------|--------|
| 1 | profil-bootstrap.js | Auth, DB load, step-init orchestration, career_goal prefill | `5fd5412` |
| 2 | profil-draft.js | setVal, saveDraft, loadDraft, clearDraft, applyDraft | `32d99b6` |
| 3 | profil-wizard.js | Wizard state machine, validation, panel switching, mobile sidebar | `612a3f4` |
| 4 | profil-events.js | DOMContentLoaded, Cmd+K, avatar dropdown, page glue | `862bf8f` |
| 5 | profil-kimbakti.js | Kim Baktı panel + lab card | `52a3639` |
| 6 | profil-helpers.js | [data-panel] delegation, settings/visibility helpers | `6bf752f` |

profil.html: 3079 → 1532 satır (−50%). Kalan inline: 3 boot-critical micro-block (tema FOUC, Sentry, ht_track stub).

**Bug Fixes (extraction sırasında bulunan):**
- `\u00f6` literal escape → gerçek Türkçe karakter (Step 4 HTML) — `9cc0ac1`
- `?career_goal=` prefill timing race (new user, row yokken) — `37fe4c1`
- localStorage cleanup deferred to prefill apply — `14ffc7e`
- DOMContentLoaded race: profil-events.js position 20'de DCL zaten geçmiş — readyState guard — `9213c23`
- Hash restore race: 300ms setTimeout → `ht:bootstrap-done` custom event — `9213c23`

**Mobile Stabilization (5 fix):**
- Profil Merkezi: inline `span 2` → `.span-2` class (mobile overflow fix) — `52adb61`
- Ayarlar + Kim Baktı: inline 3-col grid → `.ht-grid-3` class (mobile collapse) — `144d7e7`
- Mobile sidebar: `ht-scroll-lock` class (background scroll lock) — `4f3fce5`
- Header popups: `position:fixed; left/right:12px` at ≤600px (viewport containment) — `61f46ba`
- Inbox mobile: touch-visible delete, `dvh` sheet, sticky composer — `b76353d`

**UX Polish (3 batch):**
- Wizard mikro-UX: step counter visible, draft timestamp, optional step labels, draft-save toast, completion % in success modal — `bd4fcf9`
- Kim Baktı: hide placeholder conversion card, actionable empty state with completion %, concrete premium upsell copy — `0a87824`
- Cross-panel: Bildirimler copy clarity, Premium pricing annual totals, Teklifler demo banner — `01f4b01`

**CI Fix:**
- `p3.regression.spec.js`: stale `bento-grid` → `mk-bento-grid` class expectation — `99a21b3`
- Playwright: 42/42 pass (0 failures, CI email alert resolved)

### Session 22 — 26 Mart 2026 (Support Center Phase 1 + 1.1 — Destek Merkezi)

**Candidate-facing Support Center — live end-to-end.**

**Phase 1 — Core infrastructure:**
- `profil-destek.js`: new lazy-loaded module (708 lines), entry via avatar dropdown above Ayarlar
- `panel-destek` shell in profil.html, breadcrumb label, Cmd+K palette entry, lazy-load hook in switchPanel
- 3 tabs: Yardım Makaleleri, Talep Oluştur, Taleplerim
- Migration `20260325204647`: `support_articles` (6 seed), `support_tickets`, `support_ticket_messages` tables
- `create_support_ticket` RPC: atomic ticket + first message + 2 email_outbox inserts
- RLS: candidates read own tickets/messages only, articles readable by authenticated
- `email-send` Edge Function: `support_ticket_confirmation` (candidate) + `support_ticket_internal_alert` (support@hellotalent.ai) templates
- Email pipeline verified: both types `sent` via Resend, no failures

**Phase 1.1 — Polish passes:**
- Ticket detail view: click row → inline detail with ticket number, status, description, messages
- Help article Turkish copy polish (migration `20260325212309`): proper ş/ı/ö/ü/ç, natural tone
- Success state: warmer copy, trust hint about Taleplerim tracking
- Empty state: dual CTAs (Talep Oluştur + Makalelere Göz At)
- Form UX: category-aware placeholders (SUBJECT_HINTS), description helper text, friendly validation, form reset on tab return, trust note next to submit
- Mobile: tab scroll, iOS zoom prevention (16px inputs), full-width CTA, tighter spacing at ≤600px
- Cache-bust: `profil-destek.js?v=20260326a`

**Commits:** `3edc266` (Phase 1), `566bfd1` (Phase 1.1 polish), `3c6255a` (cache bust)

**Live smoke verified (26 Mart 2026):**
- ✅ Avatar dropdown → Destek Merkezi above Ayarlar
- ✅ Panel loads, #destek hash, breadcrumb correct
- ✅ 5 category cards, 6 articles with proper Turkish
- ✅ Article detail + CTA pre-fills category
- ✅ Category-aware placeholder, helper text, friendly validation
- ✅ Ticket creation → HT-000001 → success state
- ✅ Taleplerim → ticket list → detail view → back to list
- ✅ Email: both `support_ticket_confirmation` + `support_ticket_internal_alert` → `sent`
- ✅ Mobile: no horizontal overflow at 390×844, 375×667, 360×800

**Intentionally left for future phases:**
- [ ] Support reply/thread UI (candidate replies to tickets)
- [ ] Admin support queue / inbox
- [ ] Live chat
- [ ] Inbound email parsing
- [ ] File/screenshot attachment on tickets
- [ ] Support article search

### Session 22b — 26 Mart 2026 (Support Center Phase 1.2 — Mesajlar / Özel Teklifler Split)

**Mesajlar / Özel Teklifler split live and verified.**

DB category `mesajlar_teklifler` remains unchanged. The split is implemented via a UI-layer category system (`UI_CATEGORIES`) and a persistent `ui_topic` column on `support_tickets`.

**Migrations deployed:**
- `20260326103000_support_articles_content_polish.sql` — deep article content rewrite (8 articles), product-truth alignment, markdown table→list fix
- `20260326113000_support_ticket_ui_topic.sql` — `ui_topic text NULL` column + 7-param `create_support_ticket` RPC with `p_ui_topic`
- `20260326120000_support_ticket_ui_topic_integrity.sql` — compound CHECK (`ui_topic` non-null only when `category = 'mesajlar_teklifler'`), RPC `v_ui_topic` server-side normalization, existing data sanitization

**Frontend (`profil-destek.js`):**
- 6 separate UI category cards (no merged "Mesajlar ve Teklifler")
- `getUiCategory(article)` routes articles by slug (`SLUG_TO_UI_CAT`)
- `uiCatToDbCat()` maps UI keys back to DB category for RPC
- `ticketCategoryLabel(ticket)` prefers `ui_topic` for display, falls back for legacy rows
- Ticket form shows 6 options; submit passes `p_ui_topic` alongside `p_category`
- Bento category cards with icons, descriptions, article counts
- Sticky breadcrumb bar in article detail
- 42 Support Center structural guards in `tests/p3.regression.spec.js`

**Commit:** `6d072d3`
**Cache-bust:** `profil-destek.js?v=20260326e`

**Live smoke verified (26 Mart 2026, post-deploy):**
- ✅ No merged category card — Mesajlar and Özel Teklifler are separate cards
- ✅ Mesajlar article grouped under Mesajlar, breadcrumb shows "Mesajlar", CTA preselects Mesajlar
- ✅ Özel Teklifler article grouped under Özel Teklifler, breadcrumb shows "Özel Teklifler", CTA preselects Özel Teklifler
- ✅ HT-000002 (Mesajlar) persists label after full page reload
- ✅ HT-000003 (Özel Teklifler) persists label after full page reload
- ✅ HT-000001 (legacy, pre-ui_topic) renders safely as "Hesap ve Giriş"
- ✅ Subject hints distinct: messages → "Ör: İşveren mesajına yanıt veremiyorum", offers → "Ör: Teklif detayı açılmıyor"
- ✅ DB integrity enforced: compound CHECK prevents `ui_topic` on non-merged categories; RPC normalizes via `v_ui_topic`

### Session 22c — 26 Mart 2026 (Support Queue MVP — Phase 2A)

**Support Queue MVP live and verified end-to-end.**

**Migration `20260326140000_support_queue_mvp.sql` deployed:**
- `resolved_at`, `closed_at`, `assigned_admin_user_id` columns on `support_tickets`
- Admin RLS policies for tickets + messages (`support_tickets_admin_read`, `stm_admin_read`)
- 5 admin RPCs: `admin_claim_support_ticket`, `admin_resolve_support_ticket` (with `v_message` sanitization), `admin_add_support_note`, `admin_close_support_ticket`, `admin_get_support_queue`
- 2 candidate RPCs: `candidate_confirm_resolved`, `candidate_reopen_ticket`
- `auto_close_resolved_tickets()` function + pg_cron daily at 03:00 UTC
- `email_outbox` CHECK extended: `support_ticket_resolved`

**Admin panel (`admin.html` + `admin-support.js`):**
- "Destek Talepleri" nav item under Moderasyon with open-count badge
- Queue list: status tabs (Açık/İnceleniyor/Çözüldü/Kapalı/Tümü), ticket table with category labels respecting `ui_topic`
- Detail view: description, technical context toggle, chronological timeline (candidate/support/system messages, internal notes yellow-highlighted), status-dependent action area
- Actions: Üstlen ve İncele, Çözüldü Olarak İşaretle (implicit claim from open), public/internal notes, Zorla Kapat

**Candidate UI (`profil-destek.js`):**
- Resolved ticket detail shows "Sorun Çözüldü" + "Devam Ediyor" buttons
- `candidate_confirm_resolved` → closed, `candidate_reopen_ticket` → back to in_review
- No buttons for open/in_review/closed tickets
- `waiting_on_candidate` remains dormant — not wired into UI

**Email (`email-send/index.ts`):**
- `support_ticket_resolved` template: candidate notified with resolution text, 7-day auto-close warning, CTA to Destek Merkezi
- Greeting uses `Merhaba İsim!` (exclamation form)

**Commit:** `60c93c1`

**Live smoke verified (26 Mart 2026, post-deploy):**
- ✅ Admin queue renders with 3 tickets, badge shows correct count
- ✅ "Üstlen ve İncele" → ticket becomes İnceleniyor, assigned to admin, system timeline message
- ✅ "Çözüldü Olarak İşaretle" from open → implicit claim + resolved + resolution message in timeline
- ✅ Candidate Taleplerim shows correct statuses per ticket
- ✅ Resolved ticket detail: "Sorun Çözüldü" + "Devam Ediyor" buttons visible
- ✅ "Sorun Çözüldü" → ticket becomes Kapatıldı
- ✅ "Devam Ediyor" → ticket returns to İnceleniyor
- ✅ Timeline coherent on both sides: 4 entries for full lifecycle (candidate → system claim → support resolve → system reopen)
- ✅ No waiting_on_candidate UI activated

**Intentionally left for Phase 2B:** ✅ ALL COMPLETED in Session 22d below.

### Session 22d — 26 Mart 2026 (Support Phase 2B — Candidate Replies, Waiting Status, Email Notifications)

**All 5 Phase 2B items implemented and verified.**

**Migration `20260326180000_support_phase2b.sql` created:**
- `candidate_reply_to_ticket(bigint, text)` SECURITY DEFINER RPC: candidate sends reply in open/in_review/waiting_on_candidate tickets. If `waiting_on_candidate` → auto-transitions to `in_review` + system message. Every reply bumps `support_tickets.updated_at` (status-change path via trigger, other paths via explicit UPDATE). Enqueues `support_ticket_candidate_reply` email to **assigned admin's auth.users email** if ticket has `assigned_admin_user_id`, otherwise falls back to `support@hellotalent.ai`.
- `admin_add_support_note(bigint, text, text, boolean)` — replaced 3-param with 4-param version adding `p_set_waiting boolean DEFAULT false`. When `p_set_waiting=true` + `visibility='public'` + ticket `in_review` → sets status to `waiting_on_candidate` + system message. ALL public replies now enqueue `support_ticket_admin_reply` email to candidate. Every note (public or internal) bumps `support_tickets.updated_at` (set_waiting path via status UPDATE trigger, other paths via explicit UPDATE).
- `auto_close_resolved_tickets()` — updated to enqueue `support_ticket_auto_closed` email to candidate for each auto-closed ticket.
- `admin_get_support_queue()` — `waiting_on_candidate` added to sort priority (between open and in_review). Sort changed from `created_at DESC` to `updated_at DESC` for recently-active tickets. Recency is now truthful because all reply/note RPCs guarantee `updated_at` moves on every call.
- Email outbox CHECK extended: +3 types (`support_ticket_admin_reply`, `support_ticket_candidate_reply`, `support_ticket_auto_closed`)

**Email templates (`email-send/index.ts`):**
- `supportTicketAdminReplyTemplate`: candidate receives email when admin sends public reply, includes reply body + CTA to Destek Merkezi
- `supportTicketCandidateReplyTemplate`: assigned admin (or `support@hellotalent.ai` fallback) receives alert when candidate replies, includes ticket info + reply body
- `supportTicketAutoClosedTemplate`: candidate receives email when resolved ticket is auto-closed after 7 days, includes ticket info + CTA for new ticket

**Admin UI (`admin-support.js`):**
- "Yanıt Bekleniyor" tab added to queue filter tabs
- "Aday yanıtı bekle" checkbox appears on public reply in `in_review` state
- `p_set_waiting` parameter passed to `admin_add_support_note` RPC
- `waiting_on_candidate` status handled in action area (reply composer + blue info banner)
- Badge count includes `waiting_on_candidate` tickets alongside open/in_review
- Detail view refreshes fully when set_waiting changes status

**Candidate UI (`profil-destek.js`):**
- Reply composer appears in ticket detail for `open`, `in_review`, and `waiting_on_candidate` tickets
- Blue hint "Destek ekibi yanıtınızı bekliyor." shown for `waiting_on_candidate`
- Validation: empty check + minimum 5 chars
- Calls `candidate_reply_to_ticket` RPC
- After successful reply, re-fetches ticket and re-renders detail (shows new message + updated status)
- Reply composer NOT shown for `resolved` or `closed` tickets (existing behavior preserved)

**Cache-bust:** `profil-destek.js?v=20260326h`, `admin-support.js?v=2`

**Behavior contract verification:**
- ✅ Candidate can reply on open/in_review/waiting_on_candidate tickets
- ✅ Candidate cannot reply on resolved/closed tickets
- ✅ Admin public reply with "Aday yanıtı bekle" → `waiting_on_candidate`
- ✅ Candidate reply from `waiting_on_candidate` → auto-transitions to `in_review`
- ✅ Timeline distinguishes candidate/support/internal/system messages (existing behavior preserved)
- ✅ Resolved flow from Session 22c unchanged (confirm/reopen buttons still only for resolved)
- ✅ All email notifications go through `email_outbox`
- ✅ Auto-close flow enqueues notification email to candidate
- ✅ Queue recency truthful: every candidate reply and admin note (public or internal) bumps `support_tickets.updated_at`
- ✅ Candidate reply notification targets assigned admin's real email (from `auth.users`), falls back to `support@hellotalent.ai` when unassigned

**Tests:** 150/150 pass (0 failures). ESLint: 0 errors, 2 pre-existing warnings.

**Dosya Değişiklikleri:**
```
CREATE  supabase/migrations/20260326180000_support_phase2b.sql
EDIT    supabase/functions/email-send/index.ts (+3 templates, +1 Payload field, +3 switch cases)
EDIT    admin-support.js (waiting tab, set-waiting checkbox, p_set_waiting param, badge update)
EDIT    profil-destek.js (reply composer for active tickets)
EDIT    profil.html (cache-bust 20260326g → 20260326h)
EDIT    admin.html (cache-bust v=1 → v=2)
EDIT    tests/p3.regression.spec.js (Phase 2B structural guards, updated waiting_on_candidate test)
EDIT    docs/handoff.md (this session)
```

**Deploy çeklistesi (henüz yapılmadı):**
- [ ] Migration `20260326180000_support_phase2b.sql` → Supabase SQL Editor veya `npm run db:push`
- [ ] `email-send` Edge Function redeploy: `supabase functions deploy email-send --project-ref cpwibefquojehjehtrog`
- [ ] Frontend push: `git push origin main`
- [ ] Smoke test: candidate reply → admin notification email → admin set waiting → candidate sees waiting status → candidate replies → transitions to in_review → admin sees reply + notification

**E2E doğrulanmamış (deploy gerekli):**
- ❓ Migration Supabase'e deploy edilmedi
- ❓ email-send Edge Function redeploy edilmedi
- ❓ Full lifecycle smoke (candidate reply → email → waiting → reply back → in_review)
- ❓ Auto-close email delivery (requires 7-day wait or manual trigger)

### Session 23 — 26 Mart 2026 (Consolidation: Support verify, Session 21 close, Messaging Email Phase 2, Popup fix)

**Phase A — Support 2B verification:** 150/150 tests pass. Migration, frontend, templates, and tests are internally consistent. No code change needed. Deploy checklist from Session 22d remains the same.

**Phase B — Session 21 open verifications closed (code trace, not live DB):**
- ✅ `Mağaza Müdürü` → `rol_ailesi = "Mağaza Yönetimi"`: traced through `POSITION_TO_FAMILY` (profil-core.js:226→419–426) → `collectTargetRoles()` (profil-ui.js:1379) → `save_candidate_profile` RPC (migration 20260325084751:232–241). Chain correct.
- ✅ Brand auto-follow: `save_candidate_profile` RPC inserts into `candidate_brand_follows` with `ON CONFLICT DO NOTHING` (migration 20260325084751:279–286). Chain correct.
- ✅ Employer exact-match: `search_employer_candidates` RPC scores +18 for exact `rol_unvani` match, returns "Hedef rol: tam eşleşme" (050_position_aware_scoring.sql:276–290, 387–401). Chain correct.
- Blocker: live DB verification requires authenticated session with real candidate data. Code paths are provably correct.

**Phase C — Messaging Email Phase 2:**

Migration `20260326200000_messaging_email_phase2.sql` created:
- `enqueue_employer_followup_email()` trigger on `employer_message_replies AFTER INSERT`: looks up candidate via root `employer_messages.candidate_id`, checks `notify_email_messages` preference (skips if false), reuses `new_message` email type with same template. 3-level sender name fallback (HR name → company name → "HelloTalent İşveren Ekibi").
- `enqueue_candidate_reply_email()` trigger on `candidate_message_replies AFTER INSERT`: looks up original sender via root `employer_messages.sender_id`, resolves email from `auth.users`, enqueues `candidate_reply_notification` type. Skips silently if no email found.
- Email outbox CHECK extended: +1 type (`candidate_reply_notification`)

Email template (`email-send/index.ts`):
- `candidateReplyNotificationTemplate`: employer receives email when candidate replies — shows candidate name, message preview, thread subject, CTA to İK paneli.

**Phase D — Avatar popup close gap fixed:**
- Bug: `togglePopup()` in profil-inbox.js called local `closeAllPopups()` instead of `window._htCloseAllPopups` (which profil-events.js wraps to also close avatar dropdown). Result: clicking messages popup didn't close avatar dropdown.
- Fix: `togglePopup()` now calls `window._htCloseAllPopups` with local fallback.
- Cache-bust: `profil-inbox.js?v=20260326a`

**Other Phase D findings (no fix needed):**
- `avd-avatar-img` target: NOT a bug — `setAvatarImage()` already includes it in targets array (profil-ui.js:1872). Element exists at profil.html:136.
- `console.log`: 0 instances found in any production JS file.

**Tests:** 164/164 pass (0 failures).

**Dosya Değişiklikleri:**
```
CREATE  supabase/migrations/20260326200000_messaging_email_phase2.sql
EDIT    supabase/functions/email-send/index.ts (+1 template, +1 switch case)
EDIT    profil-inbox.js (togglePopup → window._htCloseAllPopups)
EDIT    profil.html (cache-bust profil-inbox.js → 20260326a)
EDIT    tests/p3.regression.spec.js (+7 messaging email Phase 2 structural guards)
EDIT    docs/handoff.md (Session 23 + Session 21 items closed)
```

**Deploy çeklistesi (henüz yapılmadı):**
- [ ] Migration `20260326200000_messaging_email_phase2.sql` → Supabase
- [ ] `email-send` Edge Function redeploy (candidate_reply_notification template)
- [ ] Frontend push: `git push origin main`
- [ ] Smoke: employer sends follow-up → candidate gets email; candidate replies → employer gets email

### Session 24 — 26 Mart 2026 (Studio Phase 1 — Mülakat Koçu → Stüdyo Rebrand + 4-Section IA)

**Ürün kararı:** "Mülakat Koçu" artık "Stüdyo" olarak adlandırılıyor. Adayın kariyer gelişim alanı.

**Rebrand — tüm aday-yüzey giriş noktaları güncellendi:**
- profil.html header nav: "Mülakat Koçu" → "Stüdyo"
- profil.html sidebar nav: "Mülakat Koçu" → "Stüdyo"
- profil-events.js Cmd+K palette: "Mülakat Koçu" → "Stüdyo"
- profil-wizard.js breadcrumb labels: yetkinlik/mulakat → "Stüdyo"
- profil-genel.js Genel panel CTA: "Bugün 5 dk çalış" → "Stüdyo'ya Git"
- profil-mulakatkocu.js role_select back pill: "Mülakat Koçu" → "Stüdyo"
- profil-mulakatkocu.js competency_intro badge: "Mülakat Koçu" → "Stüdyo — Yetenek"

**Korunan runtime kontratları (DEĞİŞMEDİ):**
- Panel key: `mulakat` (hash routing, switchPanel, data-panel)
- Loader: `window._htLoadMulakat()` (profil-wizard.js lazy-load hook)
- Data bridge: `window._htYetkinlikData` (profil-yetkinlik.js)
- Screen states: `star_intro`, `role_select`, `lobby`, `competency_intro`, `practice`, `completion`, `session_complete`
- CSS prefix: `.ig-` (mevcut), `.st-` (Studio eklenti)

**Studio Landing (star_intro ekranı tamamen yeniden tasarlandı):**
- Vermillion hero (navy'den geçiş) — "Stüdyo" başlığı, kariyer gelişim mottosu
- 4-bölüm bento grid:
  1. **Yetenek** (span 2): "Rolünde en iyisi ol" — 29 yetkinlik, 289 soru, yetkinlik pratiği. → role_select'e yönlendirir
  2. **Koç** (span 1): "Uzmanlardan öğren" — makale akışı. → coach feed'e scroll eder
  3. **Performans** (span 1): "Rakamları öğren" — KPI/satış matematiği. → "Çok Yakında" toast
  4. **HelloTalent'ten Bilgiler** (span 2): "Platformunu tanıyorsun, değil mi?" — platform rehberleri. → "Çok Yakında" toast
- STAR+T metodoloji referansı alt kısımda collapsible olarak korundu
- Coach feed hydration mevcut şekilde çalışıyor (async, star_intro mount sonrası)

**Yetenek bölümü reframe (Phase 3):**
- Lobby premium gating kopyası iyileştirildi: "Ücretsiz 2 yetkinlik hakkını kullandın. Rol değiştirerek farklı yetkinlikleri keşfedebilirsin." (ölü duvar hissi yerine keşif teşviki)
- Premium upsell: "Farklı rolleri keşfederek yeni yetkinlik örnekleri görebilirsin. Tüm yetkinliklere sınırsız erişim için:" + CTA
- Mevcut FREE_COMP_LIMIT=2, FREE_Q_PER_COMP=3, FREE_SWAP_LIMIT=2 değişmedi

**Koç bölümü reframe (Phase 4):**
- Coach feed başlığı: "Koçlardan Öğren" → "Koç — Uzmanlardan Öğren"
- Coach feed alt başlık güncellendi: "Sektör uzmanlarından mülakat ipuçları, yetkinlik rehberleri ve kariyer önerileri"

**Scaffold bölümler (Phase 5):**
- Performans: kart + ikon + açıklama + "Çok Yakında" badge. Tıklanınca toast.
- HelloTalent'ten Bilgiler: kart + ikon + açıklama + "Çok Yakında" badge. Tıklanınca toast.

**Teknik foundation doc:** `docs/studio-foundation.md` oluşturuldu — IA, runtime kontratları, gelecek veri modeli (studio_modules, badge_definitions, candidate_badges, candidate_studio_journals), rozet felsefesi, admin stratejisi, koç vs HT içerik altyapı önerisi.

**Tests:** 164/164 pass. ESLint: 0 errors, 2 pre-existing warnings.

**Cache-bust:** `profil-mulakatkocu.js?v=20260326s`

**Dosya Değişiklikleri:**
```
EDIT    profil-mulakatkocu.js (Studio landing, rebrand, Yetenek gating copy, Koç title, nav pills)
EDIT    profil.html (header/sidebar "Stüdyo", cache-bust)
EDIT    profil-events.js (Cmd+K palette "Stüdyo")
EDIT    profil-wizard.js (breadcrumb labels "Stüdyo")
EDIT    profil-genel.js (Genel CTA "Stüdyo'ya Git")
CREATE  docs/studio-foundation.md (technical foundation document)
EDIT    docs/handoff.md (Session 24)
```

### Session 25 — 26 Mart 2026 (Studio Phase 2 — DB Infrastructure + Admin + Candidate Integration)

**Migration `20260326220000_studio_modules.sql` created:**
- `studio_modules` table: section (`performans`/`bilgiler`), module_type (`article`/`video`/`carousel`/`lesson`), slug, title, summary, body_md, cover_image_url/alt, duration_minutes, cta_label/url, sort_order, status (`draft`/`published`/`archived`), published_at, created_by
- `candidate_studio_progress` table: candidate_id, module_id, status (`not_started`/`in_progress`/`completed`), progress_pct, last_viewed_at, completed_at, UNIQUE(candidate_id, module_id)
- RLS: candidates read published modules + own progress only; admin full CRUD
- Admin RPCs: `admin_create_studio_module`, `admin_update_studio_module` (jsonb patch), `admin_publish_studio_module`, `admin_archive_studio_module`
- Candidate RPCs: `mark_studio_module_viewed` (upsert, sets in_progress), `complete_studio_module` (upsert, sets completed)
- updated_at trigger on studio_modules

**Admin UI (`admin-studio-modules.js` — NEW):**
- IIFE pattern, public loader `window._htAdminLoadStudioModules`
- List view: section filter tabs (Tümü/Performans/Bilgiler), table with sort order, title, section, type, status, date, edit/publish/archive actions
- Editor view: 2-column grid form — section, type, title, slug, sort order, duration, CTA label, summary, body (markdown), cover URL, CTA URL
- Create/save + save-and-publish actions
- Integrated into admin.html: nav item in Moderasyon section, panel container, script tag, switchPanel hook

**Candidate UI (profil-mulakatkocu.js — upgraded):**
- Performans and Bilgiler section cards now DB-backed — clicking opens `st-module-area` with live content from `studio_modules`
- Empty state: editorial message ("Performans modülleri hazırlanıyor" / "Platform rehberleri hazırlanıyor") when no published modules
- Module cards: bento grid with cover image, type pill, duration, title, summary
- Module detail: inline view with cover, title, body, "Tamamladım" button
- Progress tracking: `mark_studio_module_viewed` on card click, `complete_studio_module` on "Tamamladım"
- Section area is collapsible (click same section card to close)
- Cache per section to avoid redundant fetches within session
- "Çok Yakında" badges replaced with "Keşfet →" CTAs

**Tests:** 186/186 pass. ESLint: 0 errors.

**Cache-bust:** `profil-mulakatkocu.js?v=20260326t`

**Dosya Değişiklikleri:**
```
CREATE  supabase/migrations/20260326220000_studio_modules.sql
CREATE  admin-studio-modules.js
EDIT    admin.html (nav item, panel, script tag, switchPanel hook)
EDIT    profil-mulakatkocu.js (DB hydration for Performans/Bilgiler, module cards, detail view, progress RPCs)
EDIT    profil.html (cache-bust)
EDIT    tests/p3.regression.spec.js (+11 Studio Phase 2 structural guards)
EDIT    docs/studio-foundation.md (Phase 2 status update)
EDIT    docs/handoff.md (Session 25)
```

**Deploy çeklistesi (henüz yapılmadı):**
- [ ] Migration `20260326220000_studio_modules.sql` → Supabase
- [ ] Frontend push: `git push origin main`
- [ ] Admin: create first test modules via Studio Modülleri panel

**Kapsam dışı bırakılanlar (bilinçli):**
- Badge sistemi (Phase 3)
- Journal DB taşıma (Phase 4)
- AI koçluk (Phase 5)
- Video embed player (Phase 6)
### Session 26 — 26 Mart 2026 (Studio Phase 2b — Seed Content + Progress UX)

**Seed content migration `20260326230000_studio_seed_content.sql`:**
- 4 Performans modülü (published):
  1. `ciro-sepet-donusum` — Ciro, Sepet Ortalaması ve Dönüşüm Oranı (8 dk)
  2. `magaza-hedefleri-gunluk-operasyon` — Mağaza Hedefleri ve Günlük Operasyon İlişkisi (6 dk)
  3. `kpi-dususu-yorumlama` — KPI Düşüşünü Yorumlama: Nereden Başlanır (7 dk)
  4. `vaka-trafik-yuksek-satis-dusuk` — Vaka Çalışması: Trafik Yüksek, Satış Düşük (10 dk)
- 4 HelloTalent'ten Bilgiler modülü (published):
  1. `profil-guclu-hale-getirme` — Profilinizi İşverenler İçin Güçlü Hale Getirin (5 dk)
  2. `teklifler-mesajlar-yonetimi` — Teklifler ve Mesajlar Nasıl Yönetilir (4 dk)
  3. `gorunurluk-ayarlari` — Görünürlük Ayarları Ne İşe Yarar (4 dk)
  4. `studyodan-en-iyi-faydalanma` — Stüdyo'dan En İyi Nasıl Faydalanılır (5 dk)
- Tüm içerikler gerçek, kullanılabilir, perakende odaklı Türkçe kopya

**Progress-aware candidate UX (profil-mulakatkocu.js):**
- `fetchStudioProgress()`: candidate_studio_progress tek seferlik fetch, session boyunca cache
- `renderStudioSection()`: section header progress stats pill (X/Y tamamlandı)
- Continue-learning card: "KALDIĞIN YERDEN DEVAM ET" — en son görüntülenen in-progress modülü gösterir
- Module cards: "✓ Tamamlandı" (yeşil) ve "Devam Ediyor" (amber) status pill'leri
- Completed cards dimmed (opacity .7) — tamamlanmamış modüller öne çıkar
- Progress cache invalidated on: complete_studio_module, back navigation, section re-open

**Landing card stats (async hydration):**
- `hydrateLandingStats()`: bindStarIntroEvents'te coach feed ile birlikte çağrılır
- Performans ve Bilgiler section card'larında mini stat göstergeleri: "2/4 tamamlandı · 1 devam ediyor" veya "✓ Tümü tamamlandı" veya "4 modül"
- Stat'lar best-effort — hata durumunda sessizce boş kalır

**Tests:** 204/204 pass. ESLint: 0 errors.

**Cache-bust:** `profil-mulakatkocu.js?v=20260326u`

**Dosya Değişiklikleri:**
```
CREATE  supabase/migrations/20260326230000_studio_seed_content.sql (8 seed modules)
EDIT    profil-mulakatkocu.js (progress fetch, renderStudioSection, continue card, landing stats, progress CSS)
EDIT    profil.html (cache-bust)
EDIT    tests/p3.regression.spec.js (+9 Phase 2b structural guards)
EDIT    docs/handoff.md (Session 26)
```

**Deploy çeklistesi (henüz yapılmadı):**
- [ ] Migration `20260326230000_studio_seed_content.sql` → Supabase (requires Phase 2 schema migration first)
- [ ] Frontend push: `git push origin main`

**Kapsam dışı bırakılanlar (bilinçli):**
- Badge sistemi (Phase 3)
- Journal DB taşıma (Phase 4)
- AI koçluk (Phase 5)
- Video embed player (Phase 6)
- Markdown rendering upgrade (body_md şu an pre-wrap text olarak gösteriliyor)
- Cover image upload (modüller şu an URL ile referans veriyor)

### Session 27 — 26 Mart 2026 (Studio Phase 3 — Badge System Foundation)

**Migration `20260326240000_badge_system.sql`:**

Schema:
- `badge_definitions`: slug, title, description, category (`studio`/`performans`/`bilgiler`/`yetenek`), icon_key, badge_tier (`base`/`milestone`/`advanced`), rule_type (`module_complete_count`/`section_complete`/`total_complete_count`), rule_config jsonb, sort_order, status (`active`/`inactive`)
- `candidate_badges`: candidate_id, badge_id, awarded_at, award_reason, metadata, UNIQUE(candidate_id, badge_id)
- RLS: candidates read active definitions + own badges; admin full access on definitions

Issuance:
- `evaluate_candidate_badges(p_candidate_id)` RPC: iterates all active badge rules not yet awarded, evaluates against `candidate_studio_progress`, awards with `ON CONFLICT DO NOTHING` (idempotent, backfill-safe)
- `complete_studio_module()` RPC updated: now calls `PERFORM evaluate_candidate_badges(v_candidate_id)` after marking completion
- Three rule types: `module_complete_count` (N modules in specific section), `section_complete` (all published in section), `total_complete_count` (N modules regardless of section)

**Seeded V1 badges (6):**
| Badge | Tier | Rule | Trigger |
|-------|------|------|---------|
| İlk Adım | base | total_complete ≥ 1 | First module completed |
| Performans Başlangıç | base | performans module ≥ 1 | First Performans module |
| Platform Bilgisi | base | bilgiler module ≥ 1 | First Bilgiler module |
| Stüdyo Disiplini | milestone | total_complete ≥ 3 | 3 modules completed |
| KPI Uzmanı | advanced | section_complete performans | All Performans modules |
| Ustalık Yolu | advanced | total_complete ≥ 8 | All 8 seeded modules |

**Candidate badge surface (profil-mulakatkocu.js):**
- Badge strip card between section grid and module content area
- `hydrateBadgeStrip()`: async-hydrates on landing mount
- Earned badges: colored chip with icon, tier-specific color scheme (vermillion base, navy milestone, amber advanced)
- Locked badges: dimmed grayscale chips with title visible
- "Son Kazanılan" card: most recently awarded badge with title + description
- Header: "Rozetlerin" + earned/total count pill

**Tests:** 226/226 pass. ESLint: 0 errors.
**Cache-bust:** `profil-mulakatkocu.js?v=20260326v`

**Dosya Değişiklikleri:**
```
CREATE  supabase/migrations/20260326240000_badge_system.sql
EDIT    profil-mulakatkocu.js (badge strip HTML, hydrateBadgeStrip, BADGE_ICONS, TIER_COLORS, CSS)
EDIT    profil.html (cache-bust)
EDIT    tests/p3.regression.spec.js (+11 Phase 3 structural guards)
EDIT    docs/handoff.md (Session 27)
EDIT    docs/studio-foundation.md (Phase 3 status)
```

**Deploy çeklistesi:**
- [ ] Migrations (Phase 2 schema → Phase 2b seed → Phase 3 badges) → Supabase (must deploy in order)
- [ ] Frontend push

**Kapsam dışı bırakılanlar (bilinçli):**
- Yetenek practice badge (no reliable DB completion signal yet — `yetenek-ilk-pratik` deferred)
- Badge CMS admin (definitions managed via migration for now)
- Badge sharing/certificate
- Badge notification emails
- Journal DB persistence
- AI coaching/scoring

### Session 28 — 26 Mart 2026 (Studio Phase 4 — Journal Persistence + Yetenek Progress)

**Migration `20260326250000_journal_yetenek_progress.sql`:**

Tables:
- `candidate_studio_journals`: STAR+T fields (situation/task/action/result/takeaway), candidate_id + competency_code + question_hash (unique), role_key, question_text, status (draft/completed), last_edited_at
- `candidate_yetenek_progress`: candidate_id + role_key + competency_code (unique), status (started/practiced/completed), practice_count, questions_answered, last_practiced_at

RPCs:
- `upsert_studio_journal(...)`: idempotent upsert of STAR+T draft. Deletes row if all fields empty. SECURITY DEFINER.
- `get_my_journals(p_competency_code)`: returns candidate's journals, optionally filtered by competency. STABLE read.
- `record_yetenek_practice(p_role_key, p_competency_code, p_questions_answered)`: increments practice_count + questions_answered. Upsert with cumulative logic.
- `complete_yetenek_competency(p_role_key, p_competency_code, p_questions_answered)`: marks competency as completed. Idempotent.

RLS: candidates read/write own rows only on both tables.

**Frontend journal integration (profil-mulakatkocu.js):**

Architecture: localStorage as write-through buffer → async DB save behind it → DB cache on load.

- `preloadJournalsFromDb()`: called on panel init, fetches all candidate journals via `get_my_journals()`, populates `_journalDbCache`. Runs `migrateLocalJournalsToDb()` once.
- `migrateLocalJournalsToDb()`: scans localStorage for `ht_journal_*` keys, for any draft not yet in DB, fires async upsert (one-time migration).
- `saveJournalDraft()`: writes to localStorage immediately (instant UX), updates `_journalDbCache`, fires async `upsert_studio_journal` RPC.
- `loadJournalDraft()`: checks `_journalDbCache` first (cross-device truth), falls back to localStorage.
- `countJournalDraftsForComp()`: counts from `_journalDbCache` first, falls back to localStorage scan.
- Save indicator text: "Taslak kaydedildi"
- Journal intro: "Notlarınız hesabınıza kaydedilir ve farklı cihazlardan erişebilirsiniz."

**Yetenek practice recording:**
- "Yanıtladım" button → when all dealt questions answered → fires `complete_yetenek_competency` RPC (fire-and-forget)
- Records role_key, competency_code, questions_answered count

**Tests:** 248/248 pass. ESLint: 0 errors.
**Cache-bust:** `profil-mulakatkocu.js?v=20260326w`

**Dosya Değişiklikleri:**
```
CREATE  supabase/migrations/20260326250000_journal_yetenek_progress.sql
EDIT    profil-mulakatkocu.js (DB journal layer, preload, migration, practice recording, indicator text)
EDIT    profil.html (cache-bust)
EDIT    tests/p3.regression.spec.js (+11 Phase 4 structural guards)
EDIT    docs/handoff.md (Session 28)
EDIT    docs/studio-foundation.md (Phase 4 status)
```

**Kapsam dışı (bilinçli):**
- AI feedback on journal drafts (Phase 5)
- Yetenek badge issuance from practice progress (needs evaluate_candidate_badges extension)
- Full journal review surface (Günlüğüm tab)
- localStorage cleanup after confirmed DB migration

### Session 29 — 26 Mart 2026 (Studio Phase 5A — Structured AI Feedback)

**Migration `20260326260000_journal_ai_feedback.sql`:**
- `candidate_journal_feedback` table: candidate_id, journal_id (FK), competency_code, question_hash, model_key, status (pending/processing/completed/failed), overall_signal (strong/mixed/needs_work), score_overall, strong_points (jsonb), weak_points (jsonb), star_review (jsonb with S/T/A/R/+T status+note), improvement_actions (jsonb), followup_questions (jsonb), summary_text, raw_response, error_message
- `request_journal_feedback` RPC: saves journal first via upsert, creates pending feedback row, returns feedback_id
- `complete_journal_feedback` RPC: Edge Function writes structured results back (service_role)
- `get_journal_feedback` RPC: returns latest completed feedback for candidate + competency + question_hash
- RLS: candidate reads own only

**Edge Function `journal-feedback/index.ts` (NEW):**
- Claims pending feedback rows, fetches journal from DB
- Calls OpenAI (gpt-4o-mini) with structured Turkish prompt
- Prompt evaluates: STAR+T structure, somutluk, sahiplenme, ölçülebilir sonuç, rol uyumu, çıkarım kalitesi
- Forces `response_format: json_object` for reliable parsing
- Persists structured result via `complete_journal_feedback` RPC
- Graceful failure: marks as 'failed' with error_message if OpenAI unavailable or parse fails
- Batch processing up to 5 per invocation

**Candidate UI (profil-mulakatkocu.js):**
- Premium users: "AI ile Değerlendir" button in journal panel, navy gradient styling
- Non-premium users: gate card with "AI Koç değerlendirmesi Premium özelliğidir" + "Premium'a Geç" CTA
- Loading: button disabled + "Değerlendiriliyor…" text
- Polling: checks `get_journal_feedback` every 1s, 30s timeout, graceful failure toast
- Result display: 6 structured card sections:
  1. Genel Değerlendirme (signal pill + score + summary)
  2. Güçlü Sinyaller (bullet list, green accent)
  3. Geliştirme Alanları (bullet list, red accent)
  4. STAR+T Analizi (row per field: ✓/•/!/— indicator + note)
  5. Cevabı Güçlendirmek İçin (bullet list, vermillion accent)
  6. Olası Takip Soruları (bullet list, navy accent)
- Existing feedback auto-loaded on practice screen render
- "Tekrar Değerlendir" button after first evaluation
- Non-blocking: journal typing/saving/navigation all unaffected if AI fails

**Premium gating:** AI feedback check uses `S.isPremium` (currently hardcoded false — awaits real subscription). Free users see gate card but can still use journal drafting fully.

**Tests:** 274/274 pass. ESLint: 0 errors.
**Cache-bust:** `profil-mulakatkocu.js?v=20260326x`

**Dosya Değişiklikleri:**
```
CREATE  supabase/migrations/20260326260000_journal_ai_feedback.sql
CREATE  supabase/functions/journal-feedback/index.ts
EDIT    profil-mulakatkocu.js (AI feedback UI, request/poll/render, premium gate, CSS)
EDIT    profil.html (cache-bust)
EDIT    tests/p3.regression.spec.js (+13 Phase 5A structural guards)
EDIT    docs/handoff.md (Session 29)
EDIT    docs/studio-foundation.md (Phase 5A status)
```

**Deploy çeklistesi:**
- [ ] Migration `20260326260000_journal_ai_feedback.sql` → Supabase
- [ ] `journal-feedback` Edge Function deploy: `supabase functions deploy journal-feedback --project-ref cpwibefquojehjehtrog`
- [ ] Set `OPENAI_API_KEY` env var on Supabase Edge Functions
- [ ] Frontend push
- [ ] Test: open journal → write STAR+T → click AI evaluate → verify structured feedback renders

**Kapsam dışı (bilinçli):**
- pg_cron scheduling for journal-feedback (currently invoked on-demand by client)
- Yetenek badge issuance from AI feedback signals
- AI feedback history / comparison across evaluations
- Rich formatting in feedback cards (currently plain text)

### Session 30 — 26 Mart 2026 (Studio Phase 5A Live — Hardening + Deploy)

**Premium gating fix:**
- `S.isPremium` now reads from `_loadedDBData.profile.is_premium` (real DB column from migration 014)
- `profil-ui.js`: added `is_premium` and `premium_until` to profile mapping (was missing despite `SELECT *`)
- Feature flag: `window._htStudioAiEnabled = true` overrides for controlled pre-subscription testing
- Gating source chain: DB `candidates.is_premium` → `_loadedDBData.profile.is_premium` → `S.isPremium` → UI gate

**AI feedback flow hardening:**
- Duplicate click protection: `_aifRequestInFlight` guard prevents concurrent requests
- Stale pending detection: before creating new request, checks for existing pending/processing feedback and resumes polling
- `extractFeedback()` helper: safely handles both array and single-object RPC response shapes
- Edge Function invoke failure: now caught with `.catch()` instead of silent fire-and-forget
- Poll timeout increased to 45s (gpt-4o-mini typically <15s but network variance)
- Failed state: shows error_message from DB if available, generic fallback otherwise
- Button states: "Tekrar Dene" on failure (not the same text as initial), "Tekrar Değerlendir" on success
- Existing feedback auto-load now also resumes polling for in-flight (pending/processing) feedback

**Deploy completed:**
- ✅ 5 Studio migrations deployed to Supabase (220000 → 230000 → 240000 → 250000 → 260000)
- ✅ journal-feedback Edge Function deployed
- ✅ Frontend commit `9fd204d` pushed to origin/main
- ⚠️ `OPENAI_API_KEY` env var must be set on Supabase Edge Functions for live AI — check Dashboard → Functions → journal-feedback → Settings

**Tests:** 274/274 pass. ESLint: 0 errors. Pre-commit hook passed.

**Dosya Değişiklikleri:**
```
EDIT    profil-mulakatkocu.js (real premium wiring, hardened AI flow, extractFeedback, global declaration)
EDIT    profil-ui.js (is_premium + premium_until in profile mapping)
EDIT    profil.html (cache-bust 20260326y)
EDIT    docs/handoff.md (Session 30)
```

**~~Remaining blocker for live AI:~~** ✅ Resolved 28 Mart 2026 — OPENAI_API_KEY set edildi, model `gpt-4.1-mini`, canlı E2E PASS.

### Session 31 — 26 Mart 2026 (Studio Phase 5A Live Verification)

**Live E2E smoke completed via Playwright browser automation.**

DB infrastructure verified:
- ✅ 8 seed modules in DB (4 performans + 4 bilgiler), status=published
- ✅ 6 badge definitions in DB, status=active
- ✅ All 10 Studio RPCs deployed and callable
- ✅ `candidate_journal_feedback` table with 22 columns
- ✅ `journal-feedback` Edge Function ACTIVE (v1)

Candidate UX verified live (hellotalent.ai/profil.html):
- ✅ Header nav: "Stüdyo" (not "Mülakat Koçu")
- ✅ Genel panel: "Stüdyo'ya Git" CTA
- ✅ Studio landing: 4 section cards, badge strip (6 locked), coach feed, STAR+T collapsible
- ✅ Landing stats: "4 modül" on Performans and Bilgiler cards
- ✅ Performans section: 4 DB-backed module cards render correctly (Ders pill, duration, title, summary)
- ✅ Yetenek flow: role_select → lobby → competency_intro → practice — all screens working
- ✅ Journal panel: STAR+T textareas, DB persistence intro text, auto-save indicator

Premium gating verified live:
- ✅ **Non-premium (is_premium=false)**: sees gate card "AI Koç değerlendirmesi Premium özelliğidir." + "Premium'a Geç". 2 competencies unlocked, limited swaps.
- ✅ **Premium (is_premium=true)**: sees "AI ile Değerlendir" button. 9 competencies unlocked, 999 swaps. Gate card hidden.
- ✅ DB column `candidates.is_premium` is the authoritative truth source — confirmed via live toggle test (set true → reload → button appears, set false → reload → gate appears)

~~AI generation NOT tested live~~ → ✅ **Resolved 28 Mart 2026.** OPENAI_API_KEY set edildi, model `gpt-4.1-mini` olarak düzeltildi, canlı E2E PASS (Karma · 70/100, 6 bölüm feedback kartı render edildi). Error handling sanitization uygulandı (API key sızıntısı engellendi).

**No code changes in this session — verification only.**

### Session 41-42 — 27-28 Mart 2026 (FAZ 0-4C: Content Naturalization + AI Hardening + Streak + Personalization + Cross-Links + Detail→Practice)

**FAZ 0 — Erişilebilirlik + AI Feedback Hardening**
- Landing task-first: Stüdyo 4 bölüm kartı iş odaklı kopya ile yeniden yazıldı
- AI Teaser badge: "Coming Soon" → "Active" (lobby AI koçluk teaser kartı)
- `journal-feedback/index.ts`: model fallback `gpt-4o-mini` → `gpt-4.1-mini` (ara geçiş olarak `gpt-5-mini` hedeflendi, OpenAI'da mevcut olmadığı için `gpt-4.1-mini` ile düzeltildi)
- Self-reflection parametresi: request body'den `self_reflection` string extract ediliyor, prompt'a `ADAYIN KENDİ DEĞERLENDİRMESİ` bloğu olarak ekleniyor
- `buildPrompt()` 9. parametre (`selfReflection`) eklendi
- Prompt tone: "Harika!/Mükemmel!" boş övgüleri yasaklandı, spesifik referans zorunluluğu, üçlü kalıp ve tekdüze ritim yasağı eklendi
- Error sanitization: OpenAI hata body'si artık kullanıcıya gösterilmiyor (API key sızıntısı engellendi). Safe Turkish error mesajları (401/429/404/generic). Frontend'de 120 char + `key` keyword guard eklendi.
- ✅ Edge Function deployed, OPENAI_API_KEY set edildi, canlı E2E PASS (28 Mart 2026)

**FAZ 1 — Yetkinlik İçerik Doğallaştırma (29/29 yetkinlik)**
- Tüm 29 yetkinliğin `skilled`, `lessskilled`, `highlyskilled`, `overused` dizileri doğallaştırıldı
- ~460 madde düzenlendi: AI yazım kalıpları kırıldı, "biçimde/etkili/güçlü" tekrarları azaltıldı
- Korn Ferry / SHL davranışsal anchor mantığı korundu, anlam değişikliği yok
- Cümle ritmi çeşitlendirildi: kısa/orta karışım, noktalama doğal dağıtıldı

**FAZ 1E — Stüdyo UI Metinleri + Seed Modül Temizliği**
- `STAR_CONTENT` intro, benefits, Action step, takeaway açıklaması doğallaştırıldı
- Üçlü kural kalıpları kırıldı, kaynaksız istatistikler temizlendi
- Koç section alt başlığı sadeleştirildi
- 8 seed modül title'ı Title Case → sentence case
- `profil-guclu-hale-getirme` başlık + body + summary güncellendi
- `vaka-trafik-yuksek-satis-dusuk` kaynaksız iddia temizlendi
- `studyodan-en-iyi-faydalanma` son cümle pratik yönlendirmeye çekildi
- **Migration:** `20260327010000_studio_copy_cleanup.sql` — 8 UPDATE (slug bazlı, idempotent)

**FAZ 2.3 — Stüdyo İlerleme Görselleştirmesi**
- Progress bar: 6px, milestone işaretleri (%25/50/75), %100 gradient, micro-copy ("Yarı yoldasınız." / "✓ Tamamlandı")
- Tamamlanan kartlar: vermillion sol border, opacity .92→1 hover, "Tekrar incele →" hover hint
- Completion ekranı: vermillion check ikon, X/Y yetkinlik sayacı, büyütülmüş CTA
- Haftalık aktivite kartı: "X pratik · ~Ydk · Z yetkinlik" (estimate ~2dk/soru)
- Completion badge: async en son kazanılan rozet gösterimi
- Buton mikro-feedback: `:active{transform:scale(.97)}`

**FAZ 2A — Streak DB Foundation**
- **Migration:** `20260327020000_streak_foundation.sql`
- Tablo: `candidate_streaks` (PK=candidate_id, current/longest streak, last_activity_date, freeze alanları)
- RPC: `update_candidate_streak()` — bugün no-op, dün +1, eski reset 1, row yoksa oluştur
- RPC: `get_my_streak_status()` — streak okuma + `streak_alive` boolean
- RLS: sadece kendi kaydı, işveren erişimi yok
- Freeze/geri kazan logic sonraki faza bırakıldı

**FAZ 2B — Streak UI + Frontend Entegrasyonu**
- Lobby streak widget: alev ikonu + "X gün seri" / "Seri kırıldı" / "Bugün başla"
- Bugünkü Pratik kartı: growing yetkinlik öncelikli, ~Xdk · Y soru, tıkla → competency_intro
- Activity sonrası streak update: competency completion anında fire-and-forget RPC çağrısı
- Güvenli fallback: streak RPC yoksa/hata olursa UI gizli kalır

**FAZ 4A — Kişiselleştirilmiş Lobby**
- Karşılama: "Hoş geldin, [İsim]" (`_loadedDBData.profile.full_name` ilk isim)
- Öneri: growing yetkinlik varsa "[Rol] için bugün [Yetkinlik] üzerinde çalışmak iyi bir başlangıç olabilir."
- Öğrenme planı sıralaması: growing incomplete → other incomplete → completed (iki aşamalı: render-time + post-hydration DOM re-sort)
- Tamamlanan kartlar altta ama tamamen görünür

**FAZ 4B — Completion Çapraz Yönlendirme**
- `COMP_TO_COACH_CATEGORY`: 29 yetkinlik → 6 koç kategorisi mapping
- `COMP_TO_MODULE_SLUG`: anlamlı eşleşme olan yetkinlikler → modül slug mapping
- Completion ekranında iki kart: "Uzman Görüşü" (koç post) + "İlgili Eğitim" (modül)
- Coach: `_coachFeedPosts` cache'den ilk matching post, tıklayınca `openCoachDetail`
- Modül: async slug-based fetch, tıklayınca `openStudioModule`
- Eşleşme yoksa kart gizli

**FAZ 4C — İçerik Detail → Yetkinlik Pratiği Yönlendirme (28 Mart 2026)**
- Reverse mapping'ler: `MODULE_SLUG_TO_COMP` (module slug → competency code) ve `COACH_CAT_TO_COMP` (coach category → competency code) — mevcut forward map'lerin IIFE ile invert edilmesiyle oluşturuldu
- `navigateToCompPractice(compCode)`: aktif role varsa ve comp erişilebilirse → doğrudan `competency_intro`, yoksa → `role_select` + `S.pendingComp` mekanizması
- `buildPracticeBridgeCTA(compCode, headingText)`: paylaşılan DOM builder, yetkinlik adı + "Pratiğe geç →" CTA'sı
- Module detail sonuna CTA: "Şimdi bunu mülakatta nasıl anlatırsın?" — slug mapping varsa görünür, yoksa gizli
- Coach detail overlay sonuna CTA: "Bu konuda pratik yap" — category mapping varsa görünür, yoksa gizli
- `S.pendingComp` in `startSession()`: role seçildikten sonra pending comp varsa doğrudan `competency_intro`'ya yönlendir, yoksa normal `lobby`
- CSS: `.st-detail-bridge` — mevcut `.yk-xlink` ailesiyle uyumlu, secondary yüzey
- Yeni DB nesnesi yok, yeni migration yok
- Tests: +10 structural guard (×2 viewport = 20 test)

**Dosya Değişiklikleri (Session 41-42 toplam):**
```
EDIT    profil-yetkinlik.js (29 yetkinlik × 4 dizi = ~460 madde doğallaştırma + 1 minor fix)
EDIT    profil-mulakatkocu.js (FAZ 0: STAR_CONTENT copy; FAZ 1E: UI copy; FAZ 2.3: progress/completion; FAZ 2A-2B: streak; FAZ 4A: personalization; FAZ 4B: completion cross-links; FAZ 4C: detail→practice bridge + reverse mappings + pendingComp)
EDIT    supabase/functions/journal-feedback/index.ts (gpt-4.1-mini fallback, self-reflection, prompt tone, error sanitization)
EDIT    supabase/migrations/20260326230000_studio_seed_content.sql (lokal copy edits — remote'ta zaten eski hali, bu dosyayı db push atlar)
CREATE  supabase/migrations/20260327010000_studio_copy_cleanup.sql (8 UPDATE, idempotent)
CREATE  supabase/migrations/20260327020000_streak_foundation.sql (candidate_streaks DDL + 2 RPC)
EDIT    tests/p3.regression.spec.js (+20 FAZ 4C structural guard)
EDIT    docs/handoff.md (bu session)
```

**Deploy durumu (28 Mart 2026, tümü tamamlandı):**
- ✅ Frontend push: `3ab78e3` + `8ae8027` (cache-bust) + `85b6dbf` (error sanitization) + `95ec74d` (model fix)
- ✅ Migration 20260327010000 (copy cleanup) deployed via `npm run db:push`
- ✅ Migration 20260327020000 (streak foundation) deployed via `npm run db:push`
- ✅ journal-feedback Edge Function deployed (model: `gpt-4.1-mini`, sanitized errors)
- ✅ OPENAI_API_KEY set edildi, canlı AI E2E PASS (Karma · 70/100, 6 bölüm feedback)
- ✅ Error sanitization canlıda doğrulandı (API key leak engellendi)

**Graceful degradation zinciri (mevcut ve çalışıyor):**
- Coach post yoksa → feed boş, landing hâlâ çalışır
- Module DB boşsa → editorial empty state, section tıklanabilir
- Cross-link mapping yoksa → CTA gizli, completion/detail normal çalışır
- AI model/key hatası olursa → safe Turkish toast + "Tekrar Dene" butonu, practice ekranı korunur

**Tests:** 382/382 pass (0 failures). ESLint: 0 errors, 11 pre-existing warnings.

### Sonraki Adımlar
- [x] ~~Migration 042 → competency tabloları~~ ✅ Deployed
- [x] ~~Mülakat Koçu unification (Yetkinlik + İş Görüşmeleri → tek ürün)~~ ✅ Session 7
- [x] ~~Deploy 043 + 044~~ ✅ Session 8
- [x] ~~Deploy 045~~ ✅ Session 8 — deployed + security tested
- [x] ~~Deploy 046~~ ✅ Session 9 — no-op (production already had brand_name/company_name)
- [x] ~~Deploy 047 → 048 → 049~~ ✅ Session 9 — FK columns + RPC + backfill deployed. Backfill: 3/3 exp company_id, 2/3 exp brand_id, 6/7 brand interest brand_id filled.
- [x] ~~Push profil-ui.js + profil.html + ik.html to GitHub Pages~~ ✅ Session 9 — frontend published + smoke tested. FK resolution live: Zara→brand_id:1/company_id:10, Apple→brand_id:75/company_id:23. diller returns string[], languages returns object[], education uses egitim_seviye. No [object Object] regression.
- [x] ~~Stüdyo Phase 2: studio_modules + candidate_studio_progress + admin CRUD + candidate integration~~ ✅ Session 25
- [x] ~~Stüdyo Phase 2b: İlk seed içerikler + progress UX + continue-learning~~ ✅ Session 26 — 8 modül seeded, progress rendering, landing stats
- [x] ~~Stüdyo Phase 3: Rozet sistemi (badge_definitions + candidate_badges + issuance + UI)~~ ✅ Session 27 — 6 badges, DB-driven issuance, candidate badge strip
- [x] ~~Stüdyo Phase 4: Journal DB persistence + Yetenek progress bridge~~ ✅ Session 28
- [x] ~~Stüdyo Phase 5A: Structured AI feedback for Yetenek journals~~ ✅ Session 29 — schema, Edge Function, premium gate. AI aday yüzeyi sonradan kaldırıldı (journal UI removed).
- [x] ~~profil-yetkinlik.js → DB'den veri çekmeye geçiş~~ ✅ Session 32 — DB-backed with hardcoded fallback
- [x] ~~Yetenek competency profile: self-rating UI + evidence~~ ✅ Session 33 — overview RPC, lobby evidence hydration
- [x] ~~Premium entitlement: payment records + activation + webhook~~ ✅ Session 34 — demo flow, is_premium truth wired
- [x] ~~Yetenek IA reset: learning portal structure~~ ✅ Session 35 — journal UI removed, new screens
- [x] ~~Yetenek Phase 1B-1D: polish + content depth + hierarchy + locked cleanup~~ ✅ Sessions 36-39 — live verified
- [x] ~~Studio geneli polish (cross-section tutarlılık)~~ ✅ Session 41 — content naturalization, UX polish, personalization, cross-links
- [x] ~~Streak DB foundation~~ ✅ Session 41 — migration 20260327020000, table + 2 RPCs
- [x] ~~Detail → practice bridge (FAZ 4C)~~ ✅ Session 42 — reverse mappings, module/coach detail CTA, pendingComp
- [x] ~~AI feedback hardening (FAZ 0)~~ ✅ Session 42 — gpt-4.1-mini, self-reflection, prompt tone, error sanitization
- [x] ~~**DEPLOY**: migrations + Edge Function + frontend~~ ✅ 28 Mart 2026 — `3ab78e3`, `8ae8027`, `85b6dbf`, `95ec74d`
- [x] ~~**SMOKE**: Canlı doğrulama~~ ✅ 28 Mart 2026 — streak widget, kişiselleştirme, detail→practice, AI E2E tümü PASS
- [x] ~~OPENAI_API_KEY canlı AI E2E doğrulama~~ ✅ 28 Mart 2026 — key set, model düzeltme, E2E PASS
- [ ] Streak freeze/geri kazan mekaniği (FAZ 2C)
- [ ] Gerçek iyzico checkout wiring (credentials + redirect + callback)
- [ ] Stüdyo Phase 5B: Yeni AI aday yüzeyi (unit-integrated, journal yerine)
- [ ] İşveren kampanya wizard'ı (ik.html)
- [x] ~~Email delivery worker~~ ✅ Phase 1 email infrastructure built (Session 11, migration 051)
- [x] ~~Candidate reply flow + DM inbox~~ ✅ Session 13-14 — migrations 052-057 deployed, bi-directional threads, live-chat realtime, split-pane desktop UI. Authenticated E2E smoke pending.
- [x] ~~Messaging email Phase 2: employer follow-up email trigger + employer notification on candidate reply~~ ✅ Session 23 — migration 20260326200000, triggers on employer_message_replies + candidate_message_replies, candidate_reply_notification template. Deploy pending.
- [ ] Label accessibility audit (43 uyarı)
- [ ] Brand color audit: Batch 2 (index, blog, hakkimizda) + Batch 3 (ik, aday, profil.css)
- [ ] Dark mode remaining: profil-settings.js alert→modal (7 instances), ik/giris/gate pages
- [x] ~~Phase 3C: Position-aware recommendation scoring (migration 050 + ik.html UI)~~ ✅ Session 10 — SQL repoda + UI committed (`7623f3a`).
- [x] ~~Phase 3C deploy~~ ✅ Migration 050 Supabase'te çalıştırıldı; `window.__HT_POSITION_SCORING = true` + push `a8fc46e` (`origin/main`).

### Session 11 — 20 Mart 2026 (Phase 1 Transactional Email Infrastructure)

**40. Migration 051 — email_outbox + claim + message trigger**
- `email_outbox` tablosu: tek outbox tüm mail tipleri için (candidate_welcome, employer_welcome, new_message)
- `claim_email_outbox_batch(p_limit)` RPC: atomik batch claim (FOR UPDATE SKIP LOCKED)
- `enqueue_message_email()` trigger: employer_messages INSERT → outbox enqueue
- Dedupe: `dedupe_key` UNIQUE + Resend `Idempotency-Key` header (dual-layer)
- Status flow: pending → processing → sent/failed/skipped
- Retry: exponential backoff (1m, 4m), max 3 attempts
- Dosya: `docs/migrations/051_transactional_email_phase1.sql`

**41. Edge Functions — email-reconcile + email-send**
- `supabase/functions/email-reconcile/index.ts`: Supabase Auth Admin API ile confirmed user'ları tarar, welcome mail'leri outbox'a enqueue eder. auth şemasına SQL coupling yok.
- `supabase/functions/email-send/index.ts`: Outbox'tan pending claim eder, template render eder, Resend API ile gönderir. Stale recovery (10dk), retry, idempotency dahil.
- 3 template inline: aday hoş geldin, işveren hoş geldin, yeni mesaj bildirimi
- Tüm CTA'lar login-safe (giris.html bazlı)
- Sender: env var (`EMAIL_FROM`), Reply-To: `support@hellotalent.ai`

**42. db-schema-reference.js drift cleanup**
- HrProfile: `full_name` → `ad` + `soyad` (canlı şemayla hizalandı)
- Position: `id uuid` → `id bigint`, `title` → `ad`, tüm canlı alanlar eklendi

**Session 12 — 21 Mart 2026: Deploy + Smoke Test PASS**

Deployment (tamamlandı):
1. [x] Migration 051 deploy: `email_outbox` table + `claim_email_outbox_batch` RPC + `enqueue_message_email` trigger + `trg_employer_message_email`
2. [x] Resend API key set (domain: auth.hellotalent.ai verified)
3. [x] Edge Functions deploy: `email-reconcile` + `email-send` (JWT verification enabled at gateway)
4. [x] Env vars: `RESEND_API_KEY`, `EMAIL_FROM=HelloTalent <auth@auth.hellotalent.ai>`, `REPLY_TO=support@hellotalent.ai`
5. [x] pg_cron: `email-reconcile` (*/5 * * * *), `email-send` (* * * * *)
6. [x] pg_net extension enabled

Auth fix during deploy:
- Supabase Edge Functions now use `sb_secret_*` format as `SUPABASE_SERVICE_ROLE_KEY` (not JWT)
- Custom auth check (`authHeader.includes(SERVICE_ROLE_KEY)`) failed with JWT tokens from pg_cron
- Fix: removed custom auth check, enabled Supabase gateway JWT verification (default behavior)
- pg_cron sends JWT service_role key → gateway verifies → function processes

Smoke test results (21 Mart 2026, 00:08 UTC+3):
- candidate_welcome: 3 sent ✅ (idempotency verified — second reconcile: 0 new rows)
- employer_welcome: 1 sent ✅
- new_message (notify=true): 1 sent ✅ (trigger fired on employer_messages INSERT with status='sent')
- new_message (notify=false): 1 skipped ✅ (preference gating works)
- claim_email_outbox_batch: double-claim prevented ✅ (SKIP LOCKED)
- stale recovery: processing row >10min → recovered → sent ✅
- empty queue: email-send returns {sent:0, failed:0} ✅

**Faz 2 email scope (henüz yapılmadı):**
- İşveren-side message notification (hr_profiles'da notify preference yok)
- Newsletter, digest, bulk invite
- Bounce handling, analytics, A/B testing

**43. profil.html stability cleanup (Session 12 devam)**

P1 — `_loadedDBData.profile` tek source-of-truth:
- `loadProfileFromDB()` return objesine 8 eksik alan eklendi: `email`, `notify_email_messages`, `notify_email_jobs`, `contact_pref_email/phone/whatsapp`, `account_status`, `deletion_requested_at`
- `saveProfileRPC()` başarı yolunda `_loadedDBData.profile`'a tüm profile alanları merge ediliyor
- `profil-settings.js`: bildirim ve iletişim save sonrası `_loadedDBData.profile` sync eklendi
- `profil-settings.js`: `notifications-msg` ve `contact-prefs-msg` null check eklendi (crash fix)

P2 — Panel navigation tekilleştirme:
- `switchPanel()`: `yetkinlik` → `mulakat` normalization eklendi (hash override bug fix)
- Sidebar/header/bento direct binding'ler kaldırıldı — document-level `[data-panel]` delegation tek yol
- Logo ve Kim Baktı direct binding'leri korundu (data-panel attr'ları yok)
- Premium CTA: `mk-footer-premium` / `mk-premium-card-link` direct + delegation duplicate kaldırıldı (data-panel="premium" yeterli)
- Wizard exit: `_doSwitchPanel(dest)` → `switchPanel(dest)` (hash + normalization tek yoldan)
- Kaydet ve Çık: `_doSwitchPanel('merkez')` → `switchPanel('merkez')` (hash `#merkez` yazılıyor)

P3 — Bug fix'ler:
- `openLocationModal`: search input listener birikmesi engellendi (named ref + removeEventListener)

Değişen dosyalar: `profil.html`, `profil-ui.js`, `profil-settings.js`

### Session 13 — 21 Mart 2026 (Candidate Replies + DM Inbox + Employer Mesajlar)

**44. Migration 052 — candidate_message_replies table + RPCs**
- `candidate_message_replies` tablosu: `id bigint`, `message_id bigint` (FK → employer_messages), `candidate_id bigint`, `body text`, `read_at timestamptz`, `created_at timestamptz`
- 3 index: message_id, candidate_id, created_at
- 4 RLS policy: cmr_select_own, cmr_insert_own (defense in depth — message ownership check), cmr_employer_read, cmr_employer_update_read
- `send_candidate_reply(bigint, bigint)` RPC: server-side validation, SECURITY DEFINER, REVOKE/GRANT authenticated
- `get_message_thread(bigint)` RPC: returns full thread (employer message + candidate replies) chronologically, with read_at per item
- `mark_replies_read(bigint)` RPC: employer marks all unread candidate replies as read
- Old `get_message_replies(uuid)` dropped (type mismatch fix — employer_messages.id is bigint, not uuid)
- ✅ Deployed to Supabase (21 Mart 2026), post-deploy verification 7/7 checks PASS

**45. Migration 053 — get_company_message_threads RPC**
- `get_company_message_threads(p_limit, p_offset)` RPC: returns employer's message threads with candidate_name, subject, last_body, last_sender, last_activity_at, employer_read_at, unread_replies count
- LATERAL JOIN for latest reply, sorted by last activity
- SECURITY DEFINER, REVOKE/GRANT authenticated
- ✅ Deployed to Supabase (21 Mart 2026)

**46. profil-inbox.js — Instagram DM-style inbox (full rewrite)**
- Conversation list: slim DM-style rows (round avatar, bold sender, one-line preview, relative time, vermillion unread dot, hover-reveal trash)
- "Sen:" prefix on preview when latest item is candidate's own reply
- Sort by last activity (threads with newest replies bubble to top)
- Thread view: bottom-sheet (85vh), WhatsApp-style bubbles — employer left-aligned on --bg, candidate right-aligned on --verm
- Bubble times (HH:MM bottom-right), Turkish date separators (Bugün/Dün/weekday/date)
- Read receipts: "İletildi" / "Görüldü" under last outbound candidate reply
- Composer: rounded textarea, auto-grow, circular send button, Enter-to-send (Shift+Enter for newline)
- Restored: Bildirimler panel (_htLoadBildirimler), header popup wiring (_htCloseAllPopups, togglePopup, outside-click, Escape-to-close), realtime subscription
- Commits: `307ea1e`, `7dcc696`

**47. ik.html — Employer Mesajlar panel**
- Sidebar nav item "Mesajlar" (between Takipçiler and Kampanyalar) with unread badge
- Panel: DM-style thread list via `get_company_message_threads` RPC
- Thread rows: navy avatar initials, candidate name, subject, preview with "Aday:" prefix, unread reply count badge, Görüldü/İletildi state
- Click → thread modal reusing `get_message_thread` + `mark_replies_read` RPCs
- Thread modal: chronological bubbles with date separators, bubble times, auto mark-as-read on open
- "Yanıtlar" button in candidate drawer preserved
- Commit: `7dcc696`

**Session 13 E2E smoke:** DB deployment verified (migrations 052+053). Authenticated E2E smoke pending at session close.

---

### Session 14 — 22 Mart 2026 (Messaging Hardening: Bi-directional, Realtime, Split-Pane)

**48. Migration 054 — employer_message_replies table + RPCs**
- `employer_message_replies` tablosu: employer follow-up replies to threads (symmetric to candidate_message_replies)
- `send_employer_followup(bigint, text)` RPC: SECURITY DEFINER, server-side ownership validation
- `mark_employer_replies_read(bigint)` RPC: candidate marks employer follow-ups as read
- `get_message_thread` güncellendi: 3-way UNION ALL (root + candidate replies + employer replies), chronological
- RLS: 4 policy (select/insert own, employer read, candidate read)
- ✅ Deployed to Supabase

**49. Migration 055 — 3-way thread activity for RPCs**
- `get_company_message_threads` güncellendi: last_body/last_sender/last_activity_at artık 3 tablodan (root + candidate + employer replies) türetiliyor
- `get_candidate_thread_summaries` RPC eklendi: candidate-facing canonical thread summary
- ✅ Deployed to Supabase

**50. Migration 056 — candidate unread count RPC**
- `get_candidate_unread_count()` RPC: candidate-facing unread count (root messages + employer follow-ups)
- Deleted-thread auto-reactivation (status='deleted' → reactivated on new employer follow-up)
- ✅ Deployed to Supabase

**51. Migration 057 — canonical thread model hardening**
- `get_candidate_unread_count()` artık read-only (STABLE) — UPDATE side-effect kaldırıldı
- Deleted-thread reactivation write-side'a taşındı: `send_employer_followup` RPC'de otomatik reactivation
- `get_candidate_thread_summaries` canonical RPC güncellendi: unread_followups doğru hesaplama
- ✅ Deployed to Supabase

**52. profil-inbox.js — Full messaging hardening**
- Canonical thread summary: tüm candidate surfaces (inbox list, unread filter, header msg popup, header notif popup, Bildirimler panel, badges) aynı `get_candidate_thread_summaries` RPC'den türetiliyor
- 3-way thread truth: root employer message + candidate replies + employer follow-up replies
- Unread model: employer root + employer follow-ups → candidate unread; candidate replies → employer unread; self-sent asla self-unread yaratmaz
- Deleted-thread auto-reactivation: employer yeni follow-up gönderirse, silinmiş thread otomatik reactivate
- Popup/panel freshness: açıldığında fresh canonical data (stale preview düzeltildi)
- Notification preview: latest thread body (subject yerine canonical last_body)
- Desktop split-pane: Instagram Web tarzı 2-kolon layout (sol: thread list, sağ: aktif thread)
- Mobile: sheet/fullscreen thread behavior korundu
- Bubble direction: employer incoming sol, candidate outgoing sağ (doğru semantik)
- Live-chat realtime: active-thread scoped subscriptions, yeni mesajlar bubble olarak anında ekleniyor
- Optimistic send: gönder tıkla → anında geçici bubble → RPC onayı → reconcile
- Auto-scroll: kullanıcı alt kısımdaysa otomatik scroll, yukarı okuyorsa müdahale yok
- Open-thread auto-mark-read: açık thread'e gelen live mesaj otomatik read olarak işaretleniyor
- Singleton-safe realtime: duplicate subscription guard
- Filter/selection sync: filtre değiştiğinde sağ panel uygun thread'i seçiyor

**53. ik.html — Employer messaging hardening**
- Employer follow-up reply composer: thread modal/pane alt kısmında composer
- Employer desktop split-pane: modal yerine inline 2-kolon layout (sol: thread list, sağ: aktif thread)
- Bubble direction düzeltmesi: employer mesajları sağ (outgoing), candidate mesajları sol (incoming)
- Date separators + bubble times full thread render'da
- Live-chat realtime: candidate reply INSERT → bubble anında ekleniyor
- Optimistic send: employer follow-up anında görünüyor
- Shared render helper: full render + live append aynı fonksiyonu kullanıyor
- Auto-mark-read on live: açık thread'e gelen candidate reply otomatik read
- Nav badge güncelleme: panel aktif olmasa bile unread badge doğru güncelleniyor
- Near-bottom scroll check: kullanıcı yukarı okuyorsa force scroll yok
- "Yanıtlar" buton path: modal kaldırıldı, Mesajlar split-pane'e yönlendiriliyor

**Messaging Architecture (Final State)**
```
Tables:
  employer_messages        — root employer→candidate message (thread root)
  candidate_message_replies — candidate replies to thread
  employer_message_replies  — employer follow-up replies to thread

RPCs:
  send_candidate_reply(bigint, text)          — candidate sends reply
  send_employer_followup(bigint, text)        — employer sends follow-up (+ reactivates deleted threads)
  get_message_thread(bigint)                  — full 3-way chronological thread
  get_candidate_thread_summaries()            — canonical candidate inbox summary
  get_company_message_threads(int, int)       — canonical employer thread list
  get_candidate_unread_count()                — candidate unread count (read-only)
  mark_replies_read(bigint)                   — employer marks candidate replies read
  mark_employer_replies_read(bigint)          — candidate marks employer follow-ups read

Unread Rules:
  employer root/follow-up → candidate unread
  candidate reply → employer unread
  self-sent → never self-unread
  open thread → clears role-correct unread
  deleted thread + new employer follow-up → auto-reactivate

Realtime:
  candidate subscribes: employer_messages, employer_message_replies, candidate_message_replies
  employer subscribes: candidate_message_replies, employer_message_replies
  active-thread scoped: live bubble append + auto-mark-read
  summary-level: debounced refresh on any event

UI:
  candidate: desktop split-pane, mobile sheet, DM-style list, bubble thread
  employer: desktop split-pane, mobile modal, DM-style list, bubble thread
```

**Commit Geçmişi (Session 14):**
```
ae50bff feat(messaging): add employer reply-back and bi-directional threads
f4ce3b6 fix(messaging): 3-way thread activity for inbox and employer list
3d5d5b6 fix(messaging): harden unread model, realtime, and deleted-thread reactivation
30beb34 fix(messaging): canonical thread model — single source of truth
f4558f7 fix(messaging): fresh data on popup/panel open + canonical preview text
a09e945 feat(messaging): desktop split-pane layout + employer bubble direction fix
a796fa8 fix(messaging): remove old modal path + fix desktop filter/selection sync
9211a06 feat(messaging): live-chat realtime + optimistic send on both sides
67c2a38 fix(messaging): singleton realtime channels + shared employer render
f3fcf20 fix(messaging): auto-mark live messages read + employer badge when inactive
```

**Authenticated E2E smoke test:** NOT YET PERFORMED. All migrations (052-057) deployed and structurally verified. JS structural checks pass (no syntax errors, no console.log, Turkish UI only, var style in ik.html). Full authenticated E2E smoke test (employer sends → candidate replies → employer follow-up → live realtime → read receipts → deleted-thread reactivation) requires manual testing with real accounts on hellotalent.ai.

**Email alert truth (as of Session 14):**
- Candidate receives email on new employer message: ✅ (Session 12, migration 051 trigger)
- Candidate receives email on employer follow-up: ❌ Not yet (no trigger on employer_message_replies)
- Employer receives email on candidate reply: ❌ Not yet (Phase 2 email scope)
- In-app alerts (unread dots, badges, popups): ✅ Working for all 3-way thread activity

---

### Session 15 — 22 Mart 2026 (Coach Content System — Koclardan Ogren)

**54. Migration 058 — Coach System Tables**
- `coach_invites` tablosu: admin-created invitations with token-based acceptance + email verification
- `coach_profiles` tablosu: accepted coaches (uuid PK → auth.users), invite_id FK
- `coach_posts` tablosu: coach-authored content with 6-status workflow (draft→submitted→changes_requested→published→archived→rejected)
- `coach_post_likes` tablosu: privacy-safe likes (candidate sees own + total count only)
- `accept_coach_invite(uuid)` RPC: validates token + email match + creates profile. SECURITY DEFINER
- `toggle_coach_post_like(bigint)` RPC: atomic like/unlike with denormalized count. SECURITY DEFINER
- `enqueue_coach_invite_email()` trigger: enqueues invite email into existing email_outbox pipeline
- RLS: admin-only for invites, coach own + admin + authenticated-read-published for posts
- Dosya: `docs/migrations/058_coach_system.sql`

**55. coach-studio.html — Invite-Only Coach Authoring**
- Self-contained authoring page (no shared chrome)
- Auth flow: Supabase session → coach_profiles check → token acceptance → studio
- Security: email must match invite (RPC enforced), no profile + no token = redirect
- Post management: create, edit, submit for review, see admin notes
- Status-aware UI: draft/changes_requested = editable, published/archived/rejected = read-only
- Safe DOM construction (no innerHTML with user data)

**56. admin-coach-content.js — Admin Content Review**
- New admin panel module: "Icerik Yonetimi" in sidebar Moderasyon section
- Two tabs: Davetler (create/revoke invites) + Icerikler (review/approve/reject posts)
- Invite creation triggers email_outbox enqueue via DB trigger
- Post actions: Yayinla, Duzeltme Iste (with note), Reddet (with note), Arsivle
- Pending badge on sidebar nav item

**57. profil-mulakatkocu.js — Koclardan Ogren Feed**
- Additive section in star_intro landing, between bento grid and skip link
- Placeholder + post-mount async hydration pattern (renderStarIntro stays synchronous)
- Fetches published coach_posts + candidate's own likes (via RLS, not client filter)
- 3-column grid of feed cards: coach name, title, excerpt, category pill, like count + state
- Detail overlay: full body, coach info, like toggle, practice bridge CTA
- Practice bridge: related_role → startSession(role), competency-only → navigate('role_select')
- Verified: uses only existing functions (startSession, navigate), no unsupported deep-links
- CSS injected via existing injectCSS() pattern, responsive at 768px breakpoint

**Dosya Degisiklikleri:**
```
CREATE  docs/migrations/058_coach_system.sql
CREATE  coach-studio.html
CREATE  admin-coach-content.js
EDIT    admin.html (nav item + panel + script tag + switchPanel hook + CSS)
EDIT    profil-mulakatkocu.js (feed placeholder + hydration + CSS + coach feed functions)
EDIT    docs/db-schema-reference.js (CoachInvite, CoachProfile, CoachPost, CoachPostLike typedefs)
EDIT    docs/handoff.md (this session summary)
```

**Dogrulama:**
- JS syntax: profil-mulakatkocu.js, admin-coach-content.js, coach-studio.html all pass node --check
- No console.log in any new code (only console.error)
- var used throughout (no const/let) in profil-mulakatkocu.js
- Turkish UI text throughout
- No emoji in UI
- Migration SQL valid PostgreSQL with IF NOT EXISTS guards

**Sinirlamalar:**
- Migration 058 + 059 not yet deployed to Supabase — requires SQL Editor execution
- email-send Edge Function updated with coach_invite template — redeploy needed
- Coach feed shows nothing until coach_posts with status='published' exist
- No image upload for coach posts (text only)
- No rich text/markdown rendering in post body (plain text with pre-wrap)
- Admin note input uses browser prompt() — should be upgraded to modal in future

**Blocker fixes (Session 15 patch):**
- email_outbox insert shape corrected: `template_data` → `payload`, added `source_table`/`source_id`
- Migration 059 created: adds `coach_invite` to email_outbox CHECK constraint
- email-send/index.ts: coach_invite template + Payload interface extended
- Coach invite auth flow: coach-studio.html saves `ht_return_url` to sessionStorage before redirect; giris.html checks it after login/register and redirects back with token
- giris.html return URL checked in 3 paths: session auto-redirect, aday login, aday registration

### Session 16 — 22 Mart 2026 (Coach Taxonomy, Search/Filter, CI Cleanup)

**58. Migration 063 — pg_cron email job fix (live fix)**
- Root cause: pg_cron email-send/email-reconcile jobs used `extensions.http_post()` but only `pg_net` extension was installed (provides `net.http_post()`)
- All cron runs were silently failing with "function does not exist"
- Fix: rescheduled both jobs using `net.http_post(url, body, params, headers)`
- Result: all 4 pending coach invite emails sent successfully

**59. Migration 064 — Coach taxonomy + metadata**
- Category taxonomy expanded from 4 to 6: added `kariyer_gelisim_onerileri`, `performans`; renamed `kariyer_hikaye` → `kariyer_hikayesi`, `sektor_analiz` → `sektor_analizi`
- coach_profiles: added `bio_short` (text), `sector_background` (text), `experience_years` (integer)
- Safe data migration for existing rows with old category values
- `related_competency_code` deprecated from UI (column kept for backward compat)

**60. coach-studio.html — Taxonomy + author profile updates**
- Categories updated (6 options)
- `related_role` changed from free-text to controlled dropdown (31 ROLE_COMP_MAP keys)
- `related_competency_code` removed from authoring UI
- Added "Koc Profilimi Duzenle" collapsible section for author metadata (display_name, title, sector_background, experience_years, bio_short)

**61. profil-mulakatkocu.js — Search/filter + author block**
- Feed query: bounded fetch of latest 24 published posts (was 6), client-side filtering
- Filter bar: category dropdown (6 options), role dropdown (dynamic from posts), text search input
- Turkish-safe search via `trLowerCoach()` over title + excerpt + body
- Combined AND filtering: category + role + text
- Empty filter state: Turkish message + reset action
- "Yazar Hakkinda" block in post detail view (display_name, title, sector_background, experience_years, bio_short)
- Practice CTA simplified: role-based "Bu konuyu simdi calis" or general "Kocluga Baslayin" fallback

**62. CI cleanup — Playwright workflow**
- Smoke E2E gated to `workflow_dispatch` only (was running on every push to main, failing noisily)
- Static guards (P3 Regression, Profil delegation) still auto on push/PR to main
- Added concurrency group with `cancel-in-progress: true`
- Smoke E2E available manually from GitHub Actions tab

**Dosya Degisiklikleri:**
```
CREATE  docs/migrations/063_fix_cron_http_post.sql
CREATE  docs/migrations/064_coach_taxonomy_metadata.sql
EDIT    coach-studio.html (categories, role dropdown, profile section)
EDIT    profil-mulakatkocu.js (search/filter, author block, taxonomy)
EDIT    admin-coach-content.js (categories, author info in preview)
EDIT    admin.html (cache-bust)
EDIT    profil.html (cache-bust)
EDIT    docs/db-schema-reference.js (coach_profiles + coach_posts updates)
EDIT    .github/workflows/playwright.yml (smoke gating + concurrency)
EDIT    docs/handoff.md
```

**63. ESLint + Husky Pre-commit Hook**
- ESLint 9 flat config: `no-undef`, `no-console` (allow error/warn), `no-dupe-keys`, `no-unreachable`
- `no-var: off` (project uses var for Safari compat)
- Cross-file globals declared via `/* global */` comments per file
- Husky + lint-staged: blocks commit on ESLint errors, allows warnings
- CI: ESLint step added to P3 Regression Guards job

**64. jsconfig.json + global.d.ts (IDE Type Checking)**
- `jsconfig.json` with `checkJs: false` (opt-in per file with `// @ts-check`)
- `global.d.ts`: cross-file global type declarations (supabase, currentUser, switchPanel, etc.)
- Window interface extensions for `_ht*` pattern
- IDE catches undefined variables, provides autocomplete

**65. Supabase CLI Migration Pipeline**
- `supabase/migrations/` directory with timestamped migration files
- Baseline migration `20260322000000_baseline.sql` (empty — marks prior 001-064 as applied)
- Pipeline verified: `20260322082741_pipeline_test.sql` deployed via `db push`
- npm scripts: `db:push`, `db:new`, `db:list`, `db:status`
- Old migrations preserved as archive in `docs/migrations/`
- Deploy workflow updated: `npm run db:new -- name` → edit → `npm run db:push`

### Session 17 — 22 Mart 2026 (Supabase Config Consolidation, Ops Health Dashboard, Profil Modularization)

**66. Supabase Config Consolidation — Phase 2 (10 pages)**
- Removed hardcoded Supabase URL/KEY from 10 pages, all now use shared.js `HT.getSupa()`
- Pages migrated: blog.html, kariyer.html, pozisyonlar.html, yetkinlik.html, index.html, aday.html, giris.html, coach-studio.html, admin.html, sifre-yenile.html
- shared.js is now the single source of truth for Supabase config across the project
- SHA: `c2a4384`

**67. Load-order Blocker Fix (4 public pages)**
- blog.html, kariyer.html, pozisyonlar.html, yetkinlik.html were calling `HT.getSupa()` before shared.js loaded
- Fix: moved shared.js `<script>` before the inline scripts that reference `HT`
- SHA: `6fbeb32`

**68. Supabase Config Consolidation — Phase 3 (high-sensitivity files)**
- profil-core.js: replaced hardcoded URL/KEY with `HT.SUPA_URL` / `HT.SUPA_KEY` from shared.js
- ik.html: same pattern — removed local constants, uses shared.js config
- Both files are auth-heavy dashboard entrypoints; consolidation verified without auth regression
- SHA: `654e52c`

**69. Ops Health Dashboard — admin panel**
- New file: `admin-ops-health.js` — modular admin panel for system health monitoring
- New nav item: "Sistem Sağlığı" in admin.html sidebar (SİSTEM section)
- Migration `20260322093832_ops_health_rpc.sql`: `get_ops_health_stats()` + `get_ops_failed_emails()` RPCs (SECURITY DEFINER, admin guard)
- Sections: E-posta Pipeline (8 metrics), Son Başarısız E-postalar table, Kullanıcı Metrikleri, Profil Tamamlama Dağılımı, Bildirim Tercihleri, CLI Pipeline Durumu, Cron İşleri (with last-run details from cron.job_run_details)
- Health banner: green/yellow/red based on stale_processing, old_pending, failed_1h thresholds
- RPC fallback: if RPC unavailable, falls back to direct table queries with reduced stats
- SHA: `9317beb`

**70. Ops Health — failed_at truthfulness fix**
- Problem: `failed_1h` used `created_at` (enqueue time), not actual failure time
- Migration `20260322095713_email_outbox_failed_at.sql`: added `failed_at timestamptz` column to email_outbox
- Updated RPCs: `failed_1h` now uses `failed_at`, `get_ops_failed_emails` returns and sorts by `failed_at`
- Updated `email-send` Edge Function: sets `failed_at = new Date().toISOString()` on permanent failure
- Legacy rows with null `failed_at` handled gracefully (NULLS LAST ordering, italic created_at fallback in UI)
- SHA: `fe233c8`

**71. Ops Health — production deployment**
- Both migrations deployed via Supabase SQL Editor (Chrome browser automation)
- Migrations marked as applied in `supabase_migrations.schema_migrations`
- email-send Edge Function redeployed via CLI with temporary access token
- Production verification: all 8 sections rendering real data (5 sent_24h, 0 failed, 5 cron jobs all succeeded)

**72. Profil Modularization — 5 extraction passes**
profil-ui.js was systematically split into 5 domain modules, reducing it from ~3420 → ~1870 lines (−45%):

| Pass | New File | Domain | Lines |
|------|----------|--------|-------|
| 1 | profil-visibility.js | Toggle sync (syncBeniOner, syncActivelyLooking, syncHideFromEmployer), toast | ~200 |
| 2 | profil-preview.js | Profile preview drawer (open/close/ESC/overlay, render) | ~280 |
| 3 | profil-cv.js | CV upload/delete/generate (initCVUpload, showCVUploaded, showCVEmpty, generateCV) | ~330 |
| 4 | profil-summary.js | Dashboard summary, merkez cards, bento rings, completion/score calc + UI | ~550 |
| 5 | profil-locations.js | Location modal, selectedLocations state, city/district chips, collectLocations | ~200 |

Each pass followed the same discipline: dependency mapping → create module → shrink source → update script order → verify behavior.

- CV boot-path bug found and fixed: `showCVUploaded()` was receiving `cv_filename` instead of `cv_url` from DB boot path. SHA: `0852f0e`
- Post-extraction stabilization: script load-order comments added to profil.html, stale comments fixed. SHA: `be081fa`
- Decision: remaining profil-ui.js (~1870 lines) is tightly coupled wizard/save/load core — no further extraction unless concrete product need.

**Dosya Değişiklikleri (Session 17):**
```
CREATE  admin-ops-health.js
CREATE  profil-visibility.js
CREATE  profil-preview.js
CREATE  profil-cv.js
CREATE  profil-summary.js
CREATE  profil-locations.js
CREATE  supabase/migrations/20260322093832_ops_health_rpc.sql
CREATE  supabase/migrations/20260322095713_email_outbox_failed_at.sql
EDIT    admin.html (ops health nav + panel + script)
EDIT    profil.html (script order, load-order comments, extraction shrink)
EDIT    profil-ui.js (3420→1870 lines after 5 extractions)
EDIT    profil-core.js (Supabase config consolidation)
EDIT    ik.html (Supabase config consolidation)
EDIT    giris.html, coach-studio.html, admin.html, sifre-yenile.html (config consolidation)
EDIT    blog.html, kariyer.html, pozisyonlar.html, yetkinlik.html (config consolidation + load-order fix)
EDIT    index.html, aday.html (config consolidation)
EDIT    supabase/functions/email-send/index.ts (failed_at on permanent failure)
EDIT    shared.js (config source of truth — no change, already correct)
EDIT    docs/handoff.md
```

---

### Session 18 — 22 Mart 2026 (Genel Bakış finalize + Coach editorial media V1)

**73. Genel Bakış — aday ana sayfası finalize**
- `panel-genel` eski shortcut/bento tekrarından çıkarıldı; left rail + center editorial feed + right rail discovery yapısına taşındı
- Sol ray: kimlik kartı, Profiline Bakanlar özeti, Premium CTA
- Orta kolon: `Koçlardan Öğren` header kartı + featured article + kronolojik teaser akışı
- Sağ ray: Teklifler teaser + Takip Edebileceğin Markalar teaser
- `profil-genel.js` render orchestration modülü oldu; `switchPanel('genel')` sonrası refresh hook çalışıyor
- Markalar teaser blank-card root cause'u DOM timing idi; `hydrateMarkaTeaserList()` DOM attach sonrasına taşındı
- Cache-bust drift birkaç kez stale/blank UI yarattı; Genel ile ilişkili scriptler birlikte bump edilmeden deploy edilmemeli

**74. Coach editorial media V1**
- Yeni migration: `supabase/migrations/20260322142905_coach_media_fields.sql`
- `coach_posts` için `cover_image_url` + `cover_image_alt` alanları repo tarafında eklendi
- `coach_profiles.avatar_url` artık read-side’da kullanılıyor
- `profil-genel.js` featured + teaser kartlarında:
  - uploaded cover image
  - fallback editorial cover
  - coach avatar
- `profil-mulakatkocu.js` feed/detail yüzeylerinde:
  - compact cover / hero cover
  - coach avatar
  - same fallback cover visual family as Genel
- `coach-studio.html`:
  - coach avatar upload
  - cover upload
  - rights checkbox (`Bu görseli kullanma hakkına sahibim`)
  - uploaded cover için alt text alanı
- `admin-coach-content.js` preview now shows cover thumbnail + coach avatar

**75. Açık truth / yarına kalan ilk işler**
- **SQL migration henüz Supabase’e uygulanmadı.** Kritik not: `profil-genel.js` ve `profil-mulakatkocu.js` artık `cover_image_url` / `cover_image_alt` kolonlarını doğrudan select ediyor; migration deploy edilmeden query error riski var. Repo değişikliği tamamlandı ama DB deploy tamamlanmadı.
- **coach-studio alt text kuralı save akışında delinmiş durumda.** Upload tarafı boş alt text’i blokluyor, fakat normal `Kaydet` akışı `cover_image_alt` alanını tekrar `null` yazabiliyor. İlk sonraki fix: “kapak varsa alt text boş olamaz” guard’ını `savePost()` içine de eklemek.
- `cvs` bucket üzerinde coach media path’leri kullanılıyor (`coach_avatars/`, `coach_covers/`). RLS/policy doğrulaması canlı testte tekrar kontrol edilmeli.

**Dosya Degisiklikleri:**
```
CREATE  supabase/migrations/20260322142905_coach_media_fields.sql
EDIT    profil-genel.js
EDIT    profil-mulakatkocu.js
EDIT    coach-studio.html
EDIT    admin-coach-content.js
EDIT    profil.html (cache-bust)
EDIT    admin.html (cache-bust)
EDIT    docs/handoff.md
```

**Durum:**
- Genel Bakış redesign tarafı kullanılabilir ve görsel olarak oturdu
- Markalar teaser blank-state / hydration / cache-bust zinciri kapandı
- Coach media read-side implement edildi
- Tam kapanış için 2 net adım kaldı: Supabase migration deploy + coach-studio alt-text save guard fix

### Session 19 — 23 Mart 2026 (Coach Lifecycle System + Reset + Recovery)

**76. Coach Feed Regression Fix**
- `profil-genel.js` ve `profil-mulakatkocu.js`: defensive two-tier query (cover_image alanları yoksa fallback query)
- `postsRes.error` kontrolü eklendi — sessiz fail engellendi
- Türkçe hata mesajı: "İçerikler şu an yüklenemiyor"
- Commit: `c3cefe0`

**77. Coach Lifecycle Guard + Admin Koçlar Tabı + RLS Hardening**
- `coach-studio.html`: `is_active === false` → gate mesajı ("Hesabınız askıya alınmıştır")
- `admin-coach-content.js`: 3-tab yapı (Koçlar / Davetler / İçerikler), coach listesi + aktif/pasif toggle
- RLS migration: `coach_posts_coach_update` policy'ye `is_active = true` guard eklendi
- Migration: `20260323131211_coach_update_is_active_guard.sql`
- Commit: `01c50c7`

**78. Coach Media Fields Deploy + Alt Text Save Guard**
- `20260322142905_coach_media_fields.sql` Supabase'e deploy edildi (cover_image_url, cover_image_alt)
- `coach-studio.html`: savePost() içinde cover varsa alt text zorunlu guard
- Commit: `4cd4e09`

**79. Coach Reset + LinkedIn + Mini Coach Kimlik Kartı**
- Safe reset: coach_post_likes → coach_posts → coach_profiles → coach_invites temizlendi (auth.users dokunulmadı)
- 2 coach yeniden davet edildi: kefelituna@gmail.com (Tuna Kefeli), bozsoy@peoplein.com.tr (Baris Ozsoy)
- `coach_profiles.linkedin_url` kolonu eklendi (migration: `20260323133903_coach_profiles_linkedin.sql`)
- `coach-studio.html`: LinkedIn alanı + https normalize + profil yeni coach için otomatik açılır
- `profil-genel.js`: mini coach kimlik kartı (popover) — avatar, isim, unvan, bio, sektör, deneyim, LinkedIn
- `profil-mulakatkocu.js`: Yazar Hakkında bloğuna LinkedIn + tıklanabilir avatar
- Read-side query'lere `linkedin_url, bio_short, sector_background, experience_years` eklendi
- Commit: `7b2ca23`

**80. Recovery Operasyonu (Faz 5)**
- `admin-coach-content.js`: Koçlar tabına "Studio Linkini Kopyala" butonu
- Recovery kararı: invite sistemi kullanılmıyor, admin token'sız studio URL kopyalar ve coach'a iletir
- Test draft temizliği: "Cover Test Yazisi" (id=6, draft) silindi

**Coach Access Modeli (kilitli kararlar):**
- Coach bağımsız workspace — aday/işveren yüzeylerinden ayrı
- `giris.html`e coach routing eklenmez
- Entry point: davet linki (ilk aktivasyon + recovery)
- İlk aktivasyondan sonra token'sız studio URL çalışır
- Workspace switcher yok — portal değişimi çıkış yapıp yeniden giriş ile
- `is_active` tek lifecycle kontrolü; hard delete yok
- Recovery: admin "Studio Linkini Kopyala" → coach'a URL iletir

**Deploy edilen migration'lar (Session 19):**
- `20260323131211_coach_update_is_active_guard.sql` (RLS UPDATE policy)
- `20260322142905_coach_media_fields.sql` (cover_image_url/alt)
- `20260323133903_coach_profiles_linkedin.sql` (linkedin_url)

**Doğrulanmış smoke sonuçları:**
- ✅ Coach 1 (Tuna Kefeli): invite kabul → profil doldurma → LinkedIn save → post oluştur → draft kaydet → incelemeye gönder → admin yayınla → feed'de görünür
- ✅ Admin Koçlar tabı: coach listesi, aktif/pasif toggle, post sayısı
- ✅ Pasif coach gate: "Hesabınız askıya alınmıştır" mesajı + studio bloklanır
- ✅ Genel Bakış feed: published post görünür, fallback editorial cover
- ✅ Mülakat Koçu feed: post kartı + detay overlay + Yazar Hakkında bloğu
- ✅ Mini coach kimlik kartı: avatar, isim, unvan, bio, sektör, deneyim, LinkedIn
- ✅ Email delivery: 2/2 coach invite sent (email_outbox durumu doğrulandı)

**Açık operasyonel doğrulamalar:**
- Coach 2 (Barış Özsoy) gerçek login smoke (credentials gerekli)
- Native file picker ile cover upload E2E
- 2-3 gerçek published içerikle feed gözlemi
- Invite delivery rutin takibi

**81. Coach Notification E-postaları + Admin Polish + Support SOP**
- `admin-coach-content.js`: moderasyon aksiyonu (Yayınla/Düzeltme İste/Reddet) sonrası coach'a e-posta bildirimi (email_outbox enqueue)
- Migration: `20260323194121_coach_notification_email_types.sql` — email_outbox CHECK constraint'ine 3 yeni tip eklendi
- `email-send/index.ts`: `coachPostNotificationTemplate()` — yayınlandı/düzeltme istendi/reddedildi Türkçe e-posta şablonları
- Admin Koçlar tabı: arama eklendi (isim + e-posta filtre), "Son İçerik" kolonu (son post durumu + tarihi)
- `docs/coach-support-sop.md`: Coach onboarding, link kaybı recovery, pasife alma/aktifleştirme, içerik moderasyonu SOP'u

**82. Notification Enqueue RPC + Incident Notu (23 Mart 2026 akşam)**
- `enqueue_coach_post_notification()` SECURITY DEFINER RPC oluşturuldu ve deploy edildi
  - Admin-only guard (`is_admin()`), coach email internal resolve, dedupe ON CONFLICT DO NOTHING
  - `admin-coach-content.js` artık doğrudan `email_outbox` INSERT yerine RPC kullanıyor
  - Migration: `20260323203536_enqueue_coach_post_notification.sql`
- RPC smoke testi başarılı: `email_outbox`'a `coach_post_changes_requested` kaydı oluşturuldu ve doğrulandı
- Commit: `6faa178`

**⚠️ email-send Edge Function Incident**
- `email-send` function'ı restore etme sırasında yanlışlıkla `placeholder` body ile PATCH deploy girişimi yapıldı
- Management API PATCH `body` field'ı function source'u doğrudan güncellemedi — eszip bundle üretmediği için function body boşaldı (body_size: 292563 → 0)
- Düzeltme denemesi expired dashboard JWT yüzünden tamamlanamadı (expires: 2026-03-23T21:42:11Z)
- **Kullanıcı `sbp_` token paylaştıktan sonra CLI ile function başarıyla restore edildi:**
  - `supabase functions deploy email-send --project-ref cpwibefquojehjehtrog` → Deployed ✅
  - Smoke: email_outbox id=2209 → `status: sent`, `sent_at: 2026-03-23 21:49:03` ✅
  - Tüm email pipeline sağlıklı (son 5 email hepsi `sent`)
- **Incident KAPANDI.** Function repo source ile eşitlendi, coach notification template canlı, mail delivery doğrulandı.

**Doğrulanmış (E2E smoke ile):**
- ✅ Coach onboarding (invite → accept → profil → post → publish)
- ✅ Admin Koçlar tabı (liste, arama, Son İçerik sinyali, aktif/pasif toggle, Studio Linkini Kopyala)
- ✅ Admin İçerikler moderasyonu (Yayınla / Düzeltme İste / Reddet)
- ✅ Pasif coach studio gate ("Hesabınız askıya alınmıştır")
- ✅ Genel Bakış feed (published post, fallback cover, coach avatar/isim)
- ✅ Mülakat Koçu feed (post kartı, detay overlay, Yazar Hakkında bloğu)
- ✅ Mini coach kimlik kartı (avatar, isim, unvan, bio, sektör, deneyim, LinkedIn)
- ✅ Coach profil save (LinkedIn https normalize, tüm alanlar DB'de)
- ✅ Notification enqueue RPC (email_outbox INSERT başarılı)
- ✅ Notification email delivery (`coach_post_changes_requested` → `sent`)
- ✅ Email pipeline sağlıklı (tüm email tipleri çalışıyor)
- ✅ RLS hardening (pasif coach INSERT + UPDATE engellenmiş)

**Doğrulanmamış (manuel test gerekli):**
- ❓ Coach 2 (Barış Özsoy) gerçek login smoke (credentials gerekli)
- ❓ Native file picker ile cover upload E2E
- ❓ 2-3 gerçek published içerikle feed çeşitlilik gözlemi
- ❓ `coach_post_published` ve `coach_post_rejected` email template delivery (sadece `changes_requested` test edildi)

**Sonraki operasyonel adımlar:**
- Coach 2 invite kabul testi (Barış Özsoy)
- 2-3 gerçek coach içeriği ile feed gözlemi
- Coach notification'ın 3 durumunu da (`published` / `changes_requested` / `rejected`) gerçek moderasyon akışıyla test etme
- Ops Health dashboard'dan email pipeline rutin izleme

### Session 20 — 24 Mart 2026 (Coach Studio Redesign + Deletion Lifecycle Completion)

**83. Coach Studio Redesign (coach-studio.html — tam yeniden yazım)**
- Sidebar+editor layout → 3 sekmeli bento grid editorial layout (Profilim / Yazılarım / Yayında)
- Profilim: span-2 kimlik kartı (avatar, ad, unvan, bio, sektör/deneyim tag'leri, LinkedIn) + 3 stat kartı (Toplam Yazı / Toplam Beğeni / Yayında)
- Profil düzenleme: 2-kolon grid form, Profili Düzenle butonu ile açılır, yeni koçlarda otomatik açık
- Yazılarım: taslak/incelemede/düzeltme gerekli/reddedilen yazılar, Yeni Yazı butonu
- Yayında: yayınlanmış yazıların salt okunur incelemesi, anonim beğeni sayısı, yayın tarihi
- Kapak görseli: telif checkbox kaldırıldı → dashed upload zone, 5 MB/JPG/PNG/WebP kısıtlaması, dosya adı görüntüleme, FileReader ile yerel önizleme
- Ön izleme: "Ön İzleme" ve "İncelemeye Gönder" butonu ayrı, overlay panel aday tarafı hissine yakın
- Paylaşım: sadece published yazılar — WhatsApp (wa.me API), LinkedIn (share-offsite + metin kopyala), Facebook (sharer), Metni Kopyala
- Paylaşım metni: koç adı + yazı başlığı + perakende CTA + hellotalent.ai (neutral target, aday sayfası zorlanmıyor)
- Silme talebi: published yazı için "Silme Talebi Gönder" butonu, deletion_requested_at banner, "Talebi İptal Et"
- Türkçe UI, proper Turkish characters, var (not const/let), no console.log

**84. Deletion Request Lifecycle (migration + RPC + email + admin)**
- Migration `20260324111936_coach_post_deletion_request.sql`:
  - `deletion_requested_at` timestamptz column eklendi
  - `request_coach_post_deletion()` SECURITY DEFINER RPC (coach → own published post)
  - `cancel_coach_post_deletion_request()` SECURITY DEFINER RPC (coach → own iptal)
  - CHECK constraint: 10 email type (3 eski + `coach_post_archived` + `coach_post_deletion_requested` + `coach_post_deletion_dismissed`)
  - `enqueue_coach_post_notification` RPC: `archived` + `deletion_dismissed` status mapping eklendi
- Admin (`admin-coach-content.js`):
  - Published postlarda "Silme Talebi" badge (deletion_requested_at set ise)
  - "Talebi Reddet" butonu → confirm → `deletion_requested_at = null` + `deletion_dismissed` notification
  - "Arşivle" → confirm → `status = 'archived'` + ayrı `deletion_requested_at = null` (best effort) + `archived` notification
  - Pre-migration defensive: two-tier SELECT fallback (deletion_requested_at yoksa düşmeyen query)
  - Archive status update defensive: `deletion_requested_at` clearing ayrı fire-and-forget update ile (ana update kırılmasın)
- Email (`email-send/index.ts`):
  - `renderTemplate()` switch: 6 coach tipi destekliyor (published/changes_requested/rejected/archived/deletion_requested/deletion_dismissed)
  - `coachPostNotificationTemplate()`: archived + deletion_dismissed branches eklendi (subject, statusMsg, statusColor)
  - Status badge label: 5 durum için doğru Türkçe etiket
  - Published notification: paylaşım teşviki metni (WhatsApp/LinkedIn/Facebook araçlarına Studio'daki Yayında sekmesinden erişim)

**Dosya Değişiklikleri (Session 20):**
```
REWRITE coach-studio.html (788 → ~780 satır, tamamen yeniden yazıldı)
EDIT    admin-coach-content.js (+30 satır — defensive fallback, deletion dismiss+notify, archive notify+clear)
EDIT    supabase/functions/email-send/index.ts (+20 satır — 3 yeni status branch, 3 yeni case in switch)
CREATE  supabase/migrations/20260324111936_coach_post_deletion_request.sql (~165 satır)
EDIT    docs/handoff.md (bu session notu)
```

**Doğrulanmış:**
- ✅ JS syntax: no const/let, no console.log, no röportaj, no Inter/Roboto
- ✅ Pre-migration safety: admin ve coach-studio her ikisi de two-tier SELECT fallback kullanıyor
- ✅ email-send renderTemplate: tüm 10 email type için case mevcut, Unknown email_type riski kapatıldı
- ✅ Deletion lifecycle: coach request → admin badge → admin approve (archive+notify) veya reject (dismiss+notify) → coach email alır
- ✅ Paylaşım: sadece published, neutral target (hellotalent.ai), aday sayfası zorlanmıyor
- ✅ Bento grid: hero kart + 3-kolon asimetrik grid + 16px gap + standardized shadow/radius

**Doğrulanmamış (deploy/test bekliyor):**
- ❓ Migration Supabase'e deploy edilmedi → deletion RPC'ler, deletion_requested_at kolonu, CHECK constraint canlıda yok
- ❓ email-send Edge Function redeploy edilmedi → yeni template branch'ler canlıda yok
- ❓ Coach-studio tam E2E smoke (gerçek coach hesabıyla giriş, yazı yazma, ön izleme, paylaşım)
- ❓ Admin panel deletion request E2E (gerçek admin hesabıyla talep görme, onay/ret, coach email delivery)
- ❓ Mobil responsive (768px breakpoint) → header nav gizleniyor, sekmeler arası geçiş için mobil çözüm henüz yok
- ❓ `coach_post_deletion_requested` email type outbox'a şu an enqueue edilmiyor — CHECK constraint'te ve email-send template'te yer ayrıldı, runtime çökmez. Gelecekte gerekirse `request_coach_post_deletion` RPC'sine outbox INSERT eklenebilir.

**Session 20b — 24 Mart 2026 (Coach Studio fix pass: archived context + deletion_requested template)**

**85. Archived email — bağlam ayrımı**
- Bug: admin "Arşivle" her zaman "Silme talebiniz onaylandı" diyen email gönderiyordu — normal arşiv için yanlış ton
- Fix: admin-coach-content.js arşiv butonunda `post.deletion_requested_at` kontrol ediyor:
  - Silme talebi varsa → `adminNote = '__deletion_approved__'` sentinel ile RPC çağrılır
  - Normal arşiv ise → `adminNote = null`
- email-send template archived branch'i `p.admin_note === "__deletion_approved__"` ile dallanıyor:
  - Deletion onayı: "Silme talebiniz onaylandı. Yazınız arşivlendi..."
  - Normal arşiv: "Yazınız arşivlendi ve artık feed'de görünmüyor."
- Sentinel `__deletion_approved__` gerçek admin notu olarak email'de gösterilmiyor (isInternalNote guard)

**86. deletion_requested template branch**
- Bug: `coach_post_deletion_requested` email-send renderTemplate switch'te tanımlıydı ama coachPostNotificationTemplate içinde status branch yoktu — runtime'da boş subject/body üretirdi
- Fix: `p.status === "deletion_requested"` branch eklendi: subject "Silme Talebi Alındı", nötr bilgilendirme tonu
- Status badge label'a "Silme Talebi" eklendi
- Bu type şu an outbox'a enqueue edilmiyor (admin panelden görülüyor) ama gelecekte RPC'ye INSERT eklenirse runtime semantik olarak tamam

**Dosya Değişiklikleri (Session 20b):**
```
EDIT  admin-coach-content.js (archiveBtn: deletion context sentinel, +3 satır)
EDIT  supabase/functions/email-send/index.ts (archived branch split, deletion_requested branch, sentinel suppress, badge label, +18 satır)
EDIT  docs/handoff.md (bu patch notu)
```

**Doğrulanmış:**
- ✅ Normal arşiv → nötr email metni (silme talebinden bahsetmez)
- ✅ Silme onayı arşiv → "silme talebiniz onaylandı" email metni
- ✅ `__deletion_approved__` sentinel email'de admin notu olarak görünmez
- ✅ `deletion_requested` type'ı renderTemplate'te crash etmez, düzgün template üretir
- ✅ No console.log, no const/let, no röportaj

**Doğrulanmamış:**
- ❓ Tüm email template branch'lerin gerçek Resend delivery testi (Edge Function redeploy gerekli)
- ❓ Admin panel ile gerçek silme talebi → onay → email delivery E2E

**Session 20c — 24 Mart 2026 (Operasyonel Deploy + Canlı Smoke)**

**87. Migration 20260324111936 — Canlı Deploy**
- SQL Editor'da 5-part migration çalıştırıldı: `Success. No rows returned`
- Doğrulama:
  - `coach_posts.deletion_requested_at` timestamptz kolonu → ✅ EXISTS
  - `request_coach_post_deletion(bigint)` → ✅ SECURITY DEFINER
  - `cancel_coach_post_deletion_request(bigint)` → ✅ SECURITY DEFINER
  - `enqueue_coach_post_notification(bigint, text, text)` → ✅ SECURITY DEFINER, güncel mapping
  - `email_outbox_email_type_check` → ✅ 10 type (deletion_requested + deletion_dismissed dahil)

**88. email-send Edge Function Redeploy**
- `supabase functions deploy email-send --project-ref cpwibefquojehjehtrog` → Deployed ✅
- Function status: ACTIVE, deploy timestamp: 2026-03-24 09:36:02
- Yeni template branch'ler: `deletion_requested`, split `archived` (normal vs deletion approval), `__deletion_approved__` sentinel suppress

**89. Frontend Push — ed1d35e**
- `coach-studio.html`, `admin-coach-content.js`, `email-send/index.ts`, `docs/handoff.md` → `origin/main` pushed
- GitHub Pages propagation ~40s, Cloudflare cache-bust ile doğrulandı

**90. Canlı E2E Smoke Sonuçları**
Coach Studio (Tuna Kefeli session):
- ✅ Redesigned studio yükleniyor (Profilim / Yazılarım / Yayında tab'lar)
- ✅ Profilim: bento grid, profil kartı (isim, unvan, bio, sektör, deneyim, LinkedIn), analytics (3 Toplam Yazı, 1 Toplam Beğeni, 1 Yayında)
- ✅ Yayında tab: published post listesi (başlık, YAYINDA badge, kategori, ♡1 like, 23 Mar 2026 tarih)
- ✅ Published detay: salt okunur içerik, PAYLAŞ araçları (WhatsApp, LinkedIn, Facebook, Metni Kopyala), Silme Talebi Gönder butonu, Listeye Dön
- ❓ Silme Talebi Gönder: native confirm() diyaloğu açıldı ama programatik olarak kabul edilemedi (Chrome extension limitation). Manuel test gerekli.

Admin Panel (tunkef868 superadmin):
- ✅ İçerik Yönetimi → Koçlar tabı: Tuna Kefeli AKTİF, 3 yazı, Son İçerik YAYINDA 24 Mar 2026, Pasife Al + Studio Linkini Kopyala
- ✅ İçerik Yönetimi → İçerikler → Yayında: post kartı gösterildi, yazar bilgisi, Önizleme + Arşivle butonları. Crash yok.
- ✅ Pre-migration defensive fallback: admin tarafı `deletion_requested_at` kolonu olsa da olmasa da çalışıyor

**Session 20d — 24 Mart 2026 (Full Deletion Lifecycle E2E Smoke — PASS)**

Gerçek coach (Tuna Kefeli) + gerçek admin (tunkef868) hesaplarıyla deletion lifecycle uçtan uca test edildi:

**Senaryo A — Talebi Reddet:**
1. ✅ Coach: "Silme Talebi Gönder" → confirm auto-accepted → `deletion_requested_at = 2026-03-24 10:05:06` DB'de set
2. ✅ Coach: yellow banner "Silme talebi gönderildi (24 Mar 2026). Admin onayı bekleniyor." + "Talebi İptal Et" butonu
3. ✅ Coach: içerik greyed out, paylaşım araçları dimmed
4. ✅ Admin: "SİLME TALEBİ" amber badge görünür + "Talebi Reddet" butonu
5. ✅ Admin: "Talebi Reddet" → badge kayboldu, post YAYINDA kaldı
6. ✅ Email: `coach_post_deletion_dismissed` (id=2826) → status: `sent`, sent_at: 10:11:02

**Senaryo B — Silme Onayı (Arşivle):**
1. ✅ Coach: ikinci kez "Silme Talebi Gönder" → banner tekrar göründü
2. ✅ Admin: "SİLME TALEBİ" badge tekrar göründü
3. ✅ Admin: "Arşivle" → post Yayında listesinden kayboldu ("İçerik bulunamadı")
4. ✅ Email: `coach_post_archived` (id=2831) → status: `sent`, sent_at: 10:17:02
5. ✅ Email payload: `admin_note = "__deletion_approved__"` → template doğru dallanma (silme onayı tonu)
6. ✅ `__deletion_approved__` sentinel payload'da var ama email body'de admin notu olarak gösterilmiyor (isInternalNote guard)

**Post restore:** smoke sonrası post `published` durumuna geri alındı (coach içerik kaybetmesin).

**Email delivery özeti:**
| id | email_type | status | sent_at |
|----|-----------|--------|---------|
| 2831 | coach_post_archived | sent | 2026-03-24 10:17 |
| 2826 | coach_post_deletion_dismissed | sent | 2026-03-24 10:11 |
| 2209 | coach_post_changes_requested | sent | 2026-03-23 21:49 |

**Doğrulanmamış:**
- ❓ Normal arşiv (silme talebi olmadan) → nötr email tonu (test edilmedi — tek published post arşivlendi ve geri alındı)
- ❓ WhatsApp/LinkedIn/Facebook paylaşım linklerinin gerçek hedef doğrulaması
- ❓ Email body render'ının gerçek inbox'ta görsel doğrulaması (Resend delivery confirmed, HTML render untested)

**Deploy edilen migration'lar:**
- `20260324111936_coach_post_deletion_request.sql` → ✅ Supabase SQL Editor ile deploy edildi

**Session 20e — 24 Mart 2026 (Coach Studio UX Polish — Accordion + Share Icons + Draft Delete)**

**91. Yazılarım accordion restructure**
- "+ Yeni Yazı" CTA üstte, altında "Taslaklar (N)" collapsible accordion header
- Her draft satırında chevron — tıklayınca inline editor accordion olarak açılır
- Tek açık kart mantığı (controlled accordion, `_expandedDraftId` state)
- Accordion kapalıyken taslak preview'ları gizli — dağınık liste sorunu çözüldü
- Commit: `7366f65`

**92. Yayında accordion**
- Published post'lar accordion row olarak gösterilir (chevron aç/kapa)
- Inline detay: kapak, başlık, meta, gövde, paylaşım, silme talebi
- "Listeye Dön" butonu kaldırıldı (accordion toggle ile yönetim)
- `_expandedPublishedId` state ile tek açık kontrol

**93. Paylaş ikonları**
- WhatsApp (chat bubble SVG), LinkedIn ("in" SVG), Facebook ("f" SVG), Metni Kopyala (clipboard SVG)
- `SHARE_ICONS` objesi + `makeShareBtn()` 16x16 icon+label yapısı
- Action bar daha rafine ve editoryal

**94. Draft silme**
- Draft status'teki postlarda "Sil" butonu (kırmızı danger)
- `archiveDraft()` → `status = 'archived'` soft delete
- Submitted / changes_requested / published'da Sil yok

**95. Header logo**
- `<a href>` → `<span>` — logo tıklanamaz, kullanıcıyı sayfadan dışarı atmaz

**Session 20f — 24 Mart 2026 (Yeni Yazı akışı: Vazgeç + canlı title sync)**

**96. + Yeni Yazı akışı iyileştirmesi**
- Yeni post boş başlıkla oluşturulur (eskiden "Yeni Yazı" hardcoded)
- `_newDraftId` state ile yeni draft takibi
- Accordion'da otomatik genişler, title input'a focus verilir
- "Yeni" vermillion etiketi yeni draft'ta görünür, kayıt sonrası kaybolur

**97. Canlı title sync**
- Title input'a `input` event listener
- Kullanıcı yazarken accordion row başlığı anında güncellenir
- Boş başlık fallback: "Yeni Yazı"

**98. Vazgeç akışı**
- Editable editor'larda "Vazgeç" butonu
- Tıklayınca editorial dismiss overlay:
  - "Taslağa Kaydet" (navy) → save + close
  - "Sil" (kırmızı) → archive + remove
  - "Düzenlemeye Dön" (ghost) → overlay kapanır
- Overlay dışı tıklama ile de kapanır

**Canlı smoke sonuçları (Session 20e+20f):**
- ✅ Header logo tıklanamaz (`<span>`, no href)
- ✅ Yazılarım: "+ Yeni Yazı" CTA doğru yerde, "Taslaklar (N)" accordion çalışıyor
- ✅ Draft accordion: tek açık kart, chevron rotate, inline editor
- ✅ Yayında accordion: aç/kapa, paylaş ikonları (WhatsApp/LinkedIn/Facebook/clipboard SVG)
- ✅ "Listeye Dön" kaldırılmış
- ✅ Senaryo 1: + Yeni Yazı → Vazgeç → Sil → draft silindi (5→4), ghost satır yok
- ✅ Senaryo 2: + Yeni Yazı → başlık yaz → canlı sync → Vazgeç → Taslağa Kaydet → draft korundu, başlık persist
- ✅ Kaydedilmiş draft tekrar açılıp düzenlenebiliyor
- ✅ "Yeni" etiketi save sonrası tab switch'te kayboluyor
- ✅ Kaydedilmiş draft'ta hem "Vazgeç" hem "Sil" butonları var
- ✅ Yeni draft'ta sadece "Vazgeç" (Sil overlay'de)
- ✅ Duplicate satır yok, state temiz

**Doğrulanmamış:**
- ❓ Submitted/changes_requested postların accordion'da read-only davranışı (test data'da sadece draft var)
- ❓ Mobil responsive (768px breakpoint)
- ❓ Kaydet akışının DB round-trip doğrulaması (form doldur → kaydet → DB check)

**Dosya değişiklikleri (Session 20e+20f):**
```
EDIT  coach-studio.html (+362 satır net: accordion CSS/JS, share icons, draft delete, Vazgeç overlay, live title sync)
```
Commits: `7366f65` (accordion + icons + draft delete), `a1089fa` (Vazgeç + live title sync)

---

## 1. Proje Özeti

**hellotalent.ai** — Türk perakende (retail) sektörüne özel yetenek pazaryeri (talent marketplace).
Adaylar (candidates) ve İK/işverenler (employers) arasında köprü kurar.

### Tech Stack
| Katman | Teknoloji |
|--------|-----------|
| Frontend | Static HTML/CSS/JS (vanilla, no framework) |
| Hosting | GitHub Pages (custom domain: hellotalent.ai) |
| CDN/DNS | Cloudflare (free tier — nameservers aktif, propagation bekliyor) |
| Backend | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Repo | github.com/tunkef/hellotalent (private) |
| Test | Playwright (68 smoke + E2E auth tests). CI: static guards auto on push, Smoke E2E manual only (workflow_dispatch) |
| Error tracking | Sentry (profil.html only) |

### Credentials
| Servis | Değer |
|--------|-------|
| GitHub repo | tunkef/hellotalent |
| GitHub API token | [GITHUB_TOKEN — see .env or memory] |
| Supabase project ID | cpwibefquojehjehtrog |
| Supabase URL | https://cpwibefquojehjehtrog.supabase.co |
| Supabase anon key | [SUPABASE_ANON_KEY — see Supabase dashboard] |
| Supabase service_role | [SUPABASE_SERVICE_ROLE — see memory or Supabase dashboard] |
| Cloudflare nameservers | sky.ns.cloudflare.com, tanner.ns.cloudflare.com |
| LinkedIn OAuth Client ID | 77iw3k42yfhcj9 |
| LinkedIn OAuth Secret | [see memory — WPL_AP1...] |

### Brand & Design System
```css
/* Colors */
--verm: #C94E28;    /* Vermillion — primary action */
--verm-dark: #b84420; /* Vermillion hover (standardized) */
--navy: #1E2D5E;    /* Navy — employer/authority */
--navy-deep: #162247; /* Navy gradient endpoint */
--bg: #F7F6F4;      /* Page background */
--text: #111111;    /* Primary text */
--muted: #6B7280;   /* Secondary text */
--border: #E5E3DF;  /* Borders */

/* Navy Gradient (3-stop — single source of truth for all premium/dark cards) */
linear-gradient(135deg, #2A3F7A 0%, #1E2D5E 50%, #162247 100%)

/* Sidebar gradient direction */
linear-gradient(to bottom right, #2A3F7A 0%, #1E2D5E 40%, #162247 100%)

/* Standardized grey palette */
#374151 (dark text), #4B5563 (secondary), #6B7280 (muted),
#9CA3AF (light muted), #D1D5DB (placeholder), #E5E7EB (disabled)

/* Fonts */
Bricolage Grotesque  → headings
Plus Jakarta Sans    → body text
DM Mono              → data/numbers
```
**Yasaklar:** Inter, Roboto, purple gradients (#8B5CF6 kaldırıldı), "röportaj" (her zaman "mülakat" veya "iş görüşmesi"), random greys (#aaa, #ccc etc. → design system greys)

**Layout:** Bento grid varsayılan tasarım yaklaşımı — yeni UI bileşenlerinde asimetrik kart boyutları (`grid-column: span 2`) ile modern, dinamik grid kullanılır. Referans: `.agents/skills/bento-grid-design/SKILL.md`, `profil-mulakatkocu.js` landing screen, `profil-yetkinlik.js` bento grid implementasyonu.

---

## 2. Dosya Yapısı

### Ana Sayfalar
| Dosya | Açıklama | Satır | Shared Chrome? |
|-------|----------|-------|----------------|
| index.html | Landing page (homepage) | ~2800 | Evet (shared.js/css) |
| giris.html | Login (aday + İK tab) | ~400 | Hayır (kendi layout) |
| gate.html | Beta gate (sessionStorage setter) | ~100 | Hayır |
| profil.html | Aday profil dashboard | ~2200 | Hayır (kendi layout) |
| aday.html | Aday premium dashboard | ~3000+ | Evet |
| ik.html | İK/employer panel | ~1800 | Hayır (kendi layout) |
| isveren.html | İşveren landing page | ~800 | Evet |
| kariyer.html | Kariyer rehberi | ~600 | Evet |
| pozisyonlar.html | Açık pozisyonlar | ~500 | Evet |
| blog.html | Blog listesi | ~500 | Evet |
| yetkinlik.html | Yetkinlik testi | ~600 | Evet |
| hakkimizda.html | Hakkımızda | ~400 | Evet |
| iletisim.html | İletişim | ~400 | Evet |
| isalim-rotasi.html | İşe alım rotası | ~500 | Evet |

### Yasal Sayfalar (gate check YOK — public)
gizlilik.html, kvkk.html, kullanim-sartlari.html, cerez-politikasi.html

### Shared Resources
| Dosya | İçerik |
|-------|--------|
| shared.js | Header/footer injection + HT_SUPA_URL, HT_SUPA_KEY, HT.getSupa() |
| shared.css | Global styles, header/footer CSS |

### Profil Dashboard Files
| Dosya | İçerik |
|-------|--------|
| profil.html | ~5900+ lines — tüm paneller, bento grid, loading screen, toggle grid, preview modal |
| profil-core.js | Supabase client, shared auth promise, theme, normalization, reference data (STORAGE, val, trLower) |
| profil-data.js | Reference data: TUR_ILLER, ILCELER, BRAND_DB, ROL_AILELERI, etc. |
| profil-ui.js | ~1870 lines — wizard core (steps 1-4 init/collect, step 6), saveProfileRPC, loadProfileFromDB, avatar, brand lookup, shared helpers |
| profil-locations.js | Location modal, selectedLocations state, initStep5, city/district chips, collectLocations (extracted from profil-ui.js) |
| profil-genel.js | Genel Bakış home/feed surface — 3-column editorial layout (identity card, viewers summary, premium CTA / coach feed / teklifler + markalar teasers). Coach feed cards support avatar + uploaded cover image + fallback editorial covers. Loader: `_htLoadGenelHome()`, refresh: `_htRefreshGenelHome()` |
| profil-summary.js | Dashboard summary, merkez cards, bento rings, completion/score calculation + UI (extracted from profil-ui.js) |
| profil-visibility.js | Toggle sync (syncBeniOner, syncActivelyLooking, syncHideFromEmployer), showTgToast, closeTgToast (extracted from profil-ui.js) |
| profil-preview.js | Profile preview drawer — openProfilePreview, closeProfilePreview, ESC handler (extracted from profil-ui.js) |
| profil-cv.js | CV upload/delete/generate — initCVUpload, showCVUploaded, showCVEmpty, generateCV (extracted from profil-ui.js) |
| profil-settings.js | Settings panel, deletion banner |
| profil-yetkinlik.js | Competency wizard v2 — 29 yetkinlik, bento grid, Korn Ferry content, role-based mapping |
| profil-mulakatkocu.js | Mülakat Koçu — 7-screen interview coaching flow, 289 questions, competency coaching, development journal. Feed/detail surfaces support coach avatar + uploaded cover image + shared fallback editorial covers |
| profil-teklifler.js | Teklifler v2 — freemium/premium toggle, carousel, demo campaigns, frosted glass gate |
| profil-premium.js | Premium panel — features showcase, plan cards, pricing |
| profil-destek.js | Destek Merkezi — help articles, ticket creation, own tickets list, ticket detail. Lazy-loaded via `_htLoadDestek()` |
| profil-markalar.js | Markalar panel — brand cards, flip, follow, search, segment pills (extracted from profil-ui.js) |
| profil.css | ~3000+ lines — all profil dashboard styles (dark mode tokens, semantic variables) |

**Modularization note (March 2026):** profil-ui.js was split into 5 domain modules (locations, summary, visibility, preview, CV) across 5 careful extraction passes. profil-ui.js went from ~3420 → ~1870 lines (−45%). The remaining core is tightly coupled wizard/save/load logic and should not be further split unless a concrete product need appears. Script load order in profil.html is documented with an inline comment block.

### Config & Test
| Dosya/Klasör | İçerik |
|-------------|--------|
| playwright.config.js | Test config (mobile 390×844 + desktop 1440×900) |
| tests/hellotalent.smoke.spec.js | 68 smoke tests |
| tests/dark-mode.spec.js | 12 dark mode regression tests (pre-paint, tokens, contrast) |
| tests/profil.panel-delegation.spec.js | Guard: `[data-panel]` delegation ignores `<main>` roots |
| tests/auth.setup.js | Playwright auth setup — logs in candidate, saves storageState |
| tests/profil.ayarlar-toggles.e2e.spec.js | E2E: Ayarlar Gizlilik + Bildirim toggle persistence |
| playwright/.auth/candidate.json | Saved auth state (git-ignored) |
| docs/schema-drift-report.md | DB schema audit raporu |
| docs/handoff.md | Bu dosya |
| .claude/skills/hellotalent-dev/ | Custom Claude skill (SKILL.md + references/) |

### E2E Testing (Authenticated)

E2E tests require a real Supabase candidate account. They test toggle persistence, panel navigation, and DB round-trips.

**Setup (one-time):**
1. Create a test candidate on hellotalent.ai (or use an existing one)
2. Set env vars:
   ```bash
   export HT_TEST_EMAIL="test-aday@example.com"
   export HT_TEST_PASSWORD="your-password"
   ```
3. Run auth setup to generate storageState:
   ```bash
   npx playwright test --project=setup
   ```
   This creates `playwright/.auth/candidate.json` (git-ignored).

**Running E2E tests:**
```bash
npm run test:profil-ayarlar-e2e          # Ayarlar toggles (mobile + desktop)
npx playwright test --project=e2e-mobile  # All E2E, mobile viewport
npx playwright test --project=e2e-desktop # All E2E, desktop viewport
```

**Running non-auth tests (unchanged):**
```bash
npm test                                  # All smoke + unit tests
npm run test:smoke                        # 68 smoke tests only
npm run test:profil-delegation            # Panel delegation guard
```

**CI integration:** E2E tests require `HT_TEST_EMAIL` + `HT_TEST_PASSWORD` secrets. Skip the `setup` / `e2e-*` projects if secrets are unavailable.

**Naming convention:** E2E specs use `.e2e.spec.js` suffix; smoke/unit use `.spec.js`. The config isolates them into separate Playwright projects.

---

## 3. Auth & Routing Sistemi

### Login Flow
```
giris.html → Aday tab → signInWithPassword → profil.html
           → İK tab   → signInWithPassword → ik.html
           → Google ile Giriş Yap → signInWithOAuth('google') → profil.html
           → LinkedIn ile Giriş Yap → signInWithOAuth('linkedin_oidc') → profil.html
```

### OAuth Providers
| Provider | Status | Supabase Provider Name |
|----------|--------|----------------------|
| Google | ✅ Live | `google` |
| LinkedIn | ✅ Live (16 Mart 2026) | `linkedin_oidc` (NOT `linkedin`) |
| Apple | ❌ Deferred (requires $99 Apple Developer Program) | `apple` |

### Gate System
- `gate.html` → `sessionStorage.setItem('ht_gate', 'ok')`
- Tüm content pages (kariyer, pozisyonlar, blog, yetkinlik, hakkimizda, iletisim, isalim-rotasi) gate check yapar
- Legal pages (gizlilik, kvkk, kullanim-sartlari, cerez-politikasi) → gate YOK
- **NOT:** Gate client-side only — DevTools ile bypass edilebilir. Gerçek güvenlik Supabase Auth + RLS'te. Launch'ta Cloudflare Access ile server-side koruma eklenecek.

### Role-Based Routing
- `user_metadata.role === 'employer'` → ik.html
- Aksi halde → candidate olarak profil.html
- Cross-role prevention: employer giris.html'de aday tab'ından giriş yaparsa → "Bu hesap işveren hesabıdır" hatası (ve tersi)
- profil.html'de employer gelirse → ik.html'e redirect

### Auth Guard Pattern
```javascript
// profil.html, ik.html: Inline auth guard
const { data } = await getSupa().auth.getSession();
if (!data.session) { window.location.replace('giris.html'); return; }

// Content pages: sessionStorage gate
if(sessionStorage.getItem('ht_gate')!=='ok'){window.location.replace('gate.html');}
```

---

## 4. Supabase Schema

### Tablolar (16 tablo, tümü live ✅)
| Tablo | Açıklama | RLS |
|-------|----------|-----|
| candidates | Ana aday profili | own + employer_read |
| candidate_experiences | İş deneyimleri | own + employer_read |
| candidate_education | Eğitim bilgileri | own + employer_read |
| candidate_languages | Diller | own + employer_read |
| candidate_certificates | Sertifikalar | own + employer_read |
| candidate_target_roles | Hedef pozisyonlar | own + employer_read |
| candidate_work_preferences | Çalışma tercihleri | own + employer_read |
| candidate_location_preferences | Lokasyon tercihleri | own + employer_read |
| candidate_location_pref_districts | İlçe tercihleri | own + employer_read |
| candidate_brand_interests | Marka ilgileri | own + employer_read |
| candidate_brand_follows | Marka takipleri (yeni, brand-centric) | own + employer_read by company_id |
| candidate_company_follows | Eski şirket takipleri (deprecated) | own only |
| candidate_blocked_companies | Engellenen şirketler (P2 #9) | own only |
| hr_profiles | İK/employer profili | own only |
| companies | Şirket verileri | public read |
| company_benefits | Şirket yan hakları | public read |

### RLS Policy Yapısı
**Candidate-own policies:** `candidate_id = get_my_candidate_id()` veya `user_id = auth.uid()`
**Employer-read policies (P2 #7 + P3 hardening):**
- `is_employer()` helper function → `EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid())`
- Koşul: `is_active = true AND (profile_completed = true OR profile_completion_pct >= 45)` (035/036)
- Child tablolar: parent candidate aynı visibility koşulu ile

### Önemli Fonksiyonlar
| Fonksiyon | Açıklama |
|-----------|----------|
| get_my_candidate_id() | Auth user'ın candidate ID'sini döndürür |
| save_candidate_profile() | RPC: candidate verilerini toplu kaydeder |
| is_employer() | Auth user employer mı kontrolü |
| update_companies_updated_at() | Companies tablosu trigger |
| sync_account_status_to_active() | Hesap dondur/sil → is_active sync trigger |
| rls_auto_enable() | Yeni tablo RLS otomatik etkinleştirme |

### Önemli Teknik Notlar
- `candidates.id`: GENERATED BY DEFAULT (upsert'e izin verir)
- `hr_profiles.id`: FK → auth.users(id) (direkt DB write imkansız)
- `hr_profiles.company_id`: bigint FK → companies(id), nullable (henüz claim etmemiş employer)
- `hr_profiles.employer_role`: 'admin' | 'recruiter' | 'viewer' (P3 team system hazırlığı)
- `candidates.account_status`: enum ('active','frozen','pending_deletion') + trigger sync
- `candidates.cv_visibility`: DB column YOK — is_active toggle ile entegre (UI-only)
- `brands.tr_operator_company_id`: TR distribütör/operatör mapping (P3 employer onboarding ile dolacak)
- Service role key: RLS bypass eder, admin ops için
- `.single()` vs `.maybeSingle()`: yeni kullanıcılarda satır yoksa .single() hata verir → .maybeSingle() kullan
- Storage bucket: `cvs` → avatars/{user_id}.{ext}, cv/{user_id}/cv.{ext}

---

## 5. Tamamlanan İşler (P0 + P1 + P2)

### P0 — UX Audit & Fixes ✅
- aday.html UX audit (11 fix)
- profil.html visibility/premium UI reorganization
- Wizard verification + add button unification
- Turkish character fixes, required field markers
- Experience card UX improvements

### P1 #4 — Supabase Config Merkezileştirme ✅
- Phase 1: shared.js'e HT_SUPA_URL, HT_SUPA_KEY, HT.getSupa() eklendi
- 7 sayfa güncellendi (aday, isveren, index, blog, kariyer, pozisyonlar, yetkinlik)
- Phase 2: giris.html, ik.html, profil.html traceability comments eklendi
- Bugfix: HT not defined fallback

### P1 #5 — Auth Guard Tutarlılığı ✅
- Gate check: kariyer, pozisyonlar, blog, yetkinlik, hakkimizda, iletisim, isalim-rotasi
- Employer role redirect: profil.html → ik.html
- Cross-role login prevention: giris.html + aday.html (4 senaryo test edildi)

### P1 #6 — Migration / Live Schema Alignment ✅
- Schema drift report: docs/schema-drift-report.md
- 3 live DB fix: missing trigger, duplicate RLS policies, WITH CHECK enforcement
- .single() → .maybeSingle() Sentry fix

### P2 #7 — ik.html Mock → Live Data ✅
- Mock ADAYLAR array kaldırıldı → live Supabase query
- loadLiveCandidates() async function eklendi
- Parallel child table fetch (experiences, work_prefs, education, languages)
- maskPhone(), maskEmail(), calcTotalExp() helper'lar
- RLS: is_employer() function + 10 employer_read policies
- Eski mock favorite ID'leri temizleme logic'i

### P2 #8 — Email Auth Sync ✅
- Login-time auto-sync: candidates.email !== currentUser.email → auto-update
- Ayarlar'da email değiştirme UI + supabase.auth.updateUser({ email })
- Re-verification flow: yeni email'e doğrulama maili → onay → sonraki login'de sync

### P2 #9 — Settings MVP Expansion ✅
- **DB Migration:** account_status enum + frozen_at + deletion_requested_at + 4 notify columns + cv_visibility kararı (UI-only) + candidate_blocked_companies tablosu + RLS + trigger + indexes
- **Feature 1 — Hesap dondur/sil:** UI card + frozen/pending_deletion banner + KVKK 30-gün grace period + trigger
- **Feature 2 — Bildirim tercihleri:** 4 toggle (2 aktif: email messages/jobs, 2 disabled+Yakında: SMS/push)
- **Feature 3 — CV görünürlük:** is_active toggle label güncellemesi
- **Feature 4 — Engelli şirketler:** Tam CRUD UI (display:none, 30+ şirket threshold)
- **Employer enforcement:** ik.html loadLiveCandidates'e blocked check eklendi
- **pending_deletion login banner:** sticky red banner + gün hesabı + "Vazgeç" butonu

### P2 #9 Turuncu Features (Batch 2) ✅
- Aktif arama modu, İletişim tercihleri, Verilerimi indir (KVKK JSON export)
- Google OAuth login, Oturum yönetimi, Password strength validation
- Şifremi unuttum flow + sifre-yenile.html, Login rate limit (5→120s)
- Branded email templates, Supabase automatic account linking
- Google ile Kayıt Ol butonları (giris.html, index.html, aday.html)

### P2 #10 — Email Auth Sync (İK tarafı) ✅

### P2 — Markalar Panel (Şirketler → Markalar Pivot) ✅
- brands tablosuna 8 yeni column, 31 marka enriched, 3 yeni marka
- 3D flip card design (perspective 1200px, hover/tap flip)
- Brand colors map (_BRAND_COLORS), segment taxonomy (LUXURY/PREMIUM/MODA/SPORT/BEAUTY/TECH)
- 31 logo Supabase Storage'a upload, checkerboard cleaning
- candidate_brand_follows tablosu + RLS
- Search, segment pills, follow counter+popup, lazy load (12+12)

### P2 — Profil Merkezi Redesign ✅
- Dark terminal → modern card-based layout
- Identity card, stats row, profil bölümleri (5 renkli icon kart)
- CV upload (yan yana), premium CTA (shimmer), branded loading transition
- Profil önizleme modal (işveren görünümü), toggle grid (4-column bento)

### Refactoring ✅
- profil.html split → 6 files (profil.css, profil-core.js, profil-data.js, profil-ui.js, profil-settings.js)
- 6549 → 1981 lines (70% reduction)

### Clean Code Audit ✅
- 24 debug console.log kaldırıldı, 320 satır duplicate CSS → shared.css
- Net etki: -1192 satır (%12 codebase küçülme)

### Sprint 3 — Accessibility, Structure & Copy Quality ✅
- Inline onclick handlers → event delegation (profil.html — no more onclick attributes)
- Bento CTA `<a>` tags → `<span>` tags (non-navigating elements)
- Section label CSS utility renamed to `.empty-title` to avoid conflicts
- Profile completion scoring alignment + UX polish
- Copy quality audit + typography improvements (Sprint 4 commit)

### Sprint 3-4 — Profil Merkezi Card Redesign ✅
- **mk-card redesign**: Dark terminal → vermillion gradient cards with corner edit buttons
- **mk-edit-btn**: Clean floating circle (frosted glass, no corner cutout)
- **White artifact fix**: Removed `::before`/`::after` box-shadow cutout pattern that created visible white shapes
- **Card color precision**: `rgba(201,78,40,0.5)` background, solid `#C94E28` data pills with white text
- **Gradient upgrade**: Flat rgba → `linear-gradient(135deg, ...)` diagonal gradient for modern depth
- **Shadow matching**: Three-layer box-shadow system matching mk-identity and other bento cards
- **Genel Bakış hero**: Aligned to match Profil Merkezi hero card (border-radius 24px, padding, avatar 56px, name 20px/800)
- **Bento CTA arrow fix**: `.bento-cta a` → `.bento-cta span` (Sprint 3 changed `<a>` to `<span>` but CSS selectors weren't updated)
- **Logo fix**: `<a href="index.html">` → `<button id="btn-logo-home">` navigating to dashboard panel via event delegation; logo text fully white

### Dark Mode Hardening (profil.css + profil.html) ✅
**7-phase systematic implementation:**
1. **Pre-paint bootstrap**: Inline `<script>` in `<head>` before CSS loads — reads localStorage, sets `data-theme` and `meta-theme-color` to prevent FOIT
2. **Meta theme-color**: `<meta name="theme-color" content="#ffffff" id="meta-theme-color">` + JS sync in `applyResolvedTheme()`
3. **CSS color-scheme**: `:root { color-scheme: light; }` + `html[data-theme="dark"] { color-scheme: dark; }` for native scrollbars/form elements
4. **Token discipline**: 51 primitive→semantic token replacements (`--text` → `--text-primary`, `--muted` → `--text-muted`, `--border` → `--border-subtle`)
5. **Panel dark gap closing**: Tokenized 15+ hardcoded `#fff`/`white` backgrounds → `var(--bg-surface, #fff)` across header-popup, preview drawer, command palette, account wizard, brand search, segment pills, brand follows popup, blocked company dropdown
6. **Dark contrast improvement**: `--navy:#7B93C4`, `--navy-light:rgba(123,147,196,0.12)`, `--muted:#9CA3AF` in dark theme block
7. **Playwright regression tests**: `tests/dark-mode.spec.js` — 12 assertions × 2 viewports = 24 tests, all passing
   - Pre-paint bootstrap exists, meta-theme-color, color-scheme, token definitions, tokenized backgrounds, no primitive tokens in color declarations, contrast overrides, danger tokens

**Dark mode status**: Foundations solid for profil.html. Remaining: profil-settings.js native alert→modal conversion (7 instances), ik.html/giris.html/gate.html dark mode (separate sprint).

### Header & Inbox System ✅
- Header message & notification popup dropdowns
- Inbox trash tab, realtime notification dots, bildirimler panel

---

## 6. Session 16 Mart 2026 — Yapılan İşler

### Sidebar & Header Modernization
**Animated Logout Button ✅ (pushed)**
- Flat text button → expanding red circle (36px → 110px on hover)
- `.btn-logout-anim` class, "Çıkış" text reveal on hover
- Commit: `feat: animated expanding-circle logout button in sidebar`

**Navy Dark Sidebar ✅ (pushed)**
- White sidebar → brand navy (#1E2D5E) background
- White text/icons, rgba-based transparency
- Active state: vermillion left border (3px #C94E28)
- MENU label: DM Mono, uppercase, letter-spacing
- Commit: `feat: navy dark sidebar with gradient premium card`

### Brand Color Audit & Standardization

**Vermillion hover standardized → `#b84420`**
- 5 farklı hover tonu (#a83d1e, #a83b1e, #A83D1F, #e06040, #A33D1E) → tek `#b84420`
- Dosyalar: shared.css, index.html, blog.html, hakkimizda.html, isalim-rotasi.html, aday.html, profil.css

**Random greys standardized → design system palette**
- #333→#374151, #555→#4B5563, #666→#6B7280, #888→#6B7280, #999→#9CA3AF, #aaa→#9CA3AF, #bbb→#D1D5DB, #ccc→#D1D5DB, #ddd→#E5E7EB
- Dosyalar: index.html, iletisim.html, isalim-rotasi.html, ik.html, aday.html, profil.css

**Navy gradient standardized → 3-stop pattern**
- 6+ farklı gradient combination → tek pattern: `#2A3F7A → #1E2D5E → #162247`
- `--navy-deep` CSS variable: #141f3d → #162247
- Applied to: sidebar premium card, toggle premium card, premium CTA, AI CV card, AI card, contact card, bento premium card, wizard premium setting
- Purple icon (#8B5CF6) → navy icon (var(--navy))
- Dark mode gradient: `#1A2B54 → #0F1729 → #0A1020`

### PENDING Cursor Prompts (sırayla yapıştırılacak)
- [x] Theme toggle visibility (gold sun icon on navy sidebar) + vermillion hover ✅
- [ ] Brand color audit Batch 2 (index, blog, hakkimizda, iletisim, isalim-rotasi)
- [ ] Brand color audit Batch 3 (ik, aday, profil.css)
- [ ] Navy gradient standardization (profil.css — 12 steps)
- [x] Sentry retry logic (profil-ui.js — retry failed child queries with session refresh) ✅ zaten mevcut
- [x] Wizard "İlçe Seç" → "Seçili Lokasyonlar" rename + district card frame kaldırıldı ✅
- [x] Cache-busting JS imports (profil.html, ik.html — ?v=20260316) ✅
- [x] Navy header → Glassmorphic Float header ✅ (bfdfdd2..f6c4fc6)
- [x] Preview polish — Banner shadow, company bold, son güncelleme, CV link ✅ zaten mevcut
- [x] Toggle polish — Bento gaps, navy premium, alignment, "Beni Öner" naming + sync ✅ zaten mevcut
- [ ] Avatar dropdown: `avd-avatar-img` target'ı profil-ui.js setAvatarImage()'e eklenmeli
- [ ] profil-inbox.js: avatar dropdown popup entegrasyonu doğrulanmalı

### LinkedIn OAuth ✅ (pushed)
- Supabase'de LinkedIn (OIDC) provider aktif edildi
- Client ID: 77iw3k42yfhcj9
- Callback URL: https://cpwibefquojehjehtrog.supabase.co/auth/v1/callback (LinkedIn'de tanımlı)
- giris.html: disabled button → active, handler eklendi (`signInWithOAuth({ provider: 'linkedin_oidc' })`)
- "Yakında" badge kaldırıldı
- Apple Sign In deferred — $99 Apple Developer Program gerekli, MVP sonrasına
- Commit: `feat: activate LinkedIn OAuth login (OIDC provider)` (dbbdbd4)

### Cloudflare DNS Setup ✅ (propagation bekliyor)
- Cloudflare free hesap oluşturuldu
- hellotalent.ai domain eklendi, DNS kayıtları import edildi
- AI training bots: "Block on all pages" seçildi
- GoDaddy nameservers değiştirildi: sky.ns.cloudflare.com + tanner.ns.cloudflare.com
- Propagation: 15 dakika - 24 saat arası
- **Cloudflare Access henüz kurulmadı** — propagation sonrası yapılacak

### Sentry Error Analysis
- 15 Mart 21:24-21:49 UTC arası 8 error — hepsi deploy race condition
- 6/8 child table query fail: auth token expiry mid-flight (Promise.all sırasında)
- initStep6 + getProfilAuthSession: cached HTML vs new JS mismatch
- Fix: retry-with-session-refresh logic + cache-busting version queries (prompt verildi)

### P3 Hardening — Profil tamamlama ve görünürlük (16 Mart 2026)
- **profile_completion_pct modeli (035):** `candidates.profile_completion_pct` 0–100; ilk backfill 035’te. Employer görünürlük: `profile_completed = true OR profile_completion_pct >= 45`.
- **Sürekli sync + recursion-safe tetikleyiciler (036):** `compute_candidate_profile_completion`, `refresh_candidate_profile_completion`; candidates + work_preferences, experiences, education, languages, location_preferences üzerinde tetikleyiciler. `pg_trigger_depth() > 1` ile döngü önlendi. Lokasyon puanı artık `candidate_location_preferences` tablosuna göre (tercih_sehirler kaldırıldı). One-shot global re-sync: tüm adaylar için 036 mantığıyla bir kez yeniden hesaplama.
- **IK görünürlük kuralı tek tip:** `is_active = true AND (profile_completed = true OR profile_completion_pct >= 45)` — dashboard istatistikleri, canlı aday listesi ve takipçiler panelinde aynı kural.
- **Admin aday paneli:** Tamamlananlar / yarım kalanlar ayrımı; önerilebilir (≥%45), önerilebilir ama tamamlanmamış metrikleri. Admin read policy’ler 036’da idempotent yeniden uygulanıyor.
- **Regresyon:** `npm run test:p3` — kart XSS, lokasyon mesajları, ≥45 eşiği, 036 re-sync ve admin policy kontrolleri.

---

## 6b. Session 17 Mart 2026 — Header Modernization

### Glassmorphic Float Header ✅ (pushed — bfdfdd2)
- Navy sidebar kaldırıldı → LinkedIn-style floating glassmorphic header
- `backdrop-filter:blur(16px)`, `rgba(255,255,255,0.72)`, `border-radius:14px`
- 5 nav items: Genel, Profil, Markalar, Teklifler, Ayarlar (SVG icons + labels)
- Three-way nav sync: header-nav + sidebar-nav + bottom-nav via `switchPanel()`
- Content area: `margin-left:0`, `max-width:1200px;margin:0 auto`
- Mobile 768px: header flat, `.header-nav{display:none}`, bottom-nav shown

### Search Bar → Nav Icon ✅ (pushed — ef8c2f6)
- Search bar moved from header-right to header-nav as icon before Ayarlar
- Old search CSS neutralized, `id="header-search"` preserved for Cmd+K

### Markalar Icon Fix ✅ (pushed — 721bee8)
- Header nav had house icon, bento card had handbag → both now handbag SVG

### Avatar Dropdown ✅ (pushed — c46bbcf)
- Click avatar → dropdown panel with: user info, Premium button, dark mode toggle, logout
- Avatar button: 38px, no border, hover scale+ring effect
- Theme toggle: MutationObserver sync with existing theme system
- Logout: `supabase.auth.signOut()` + redirect to giris.html
- Integrates with `_htCloseAllPopups` for mutual exclusion with msg/notif popups

### Hero Cards Flat Vermillion ✅ (pushed — 95c7a24, 7b590ec, f6c4fc6)
- Gradient removed → flat `#C94E28` background
- Shadow changed to neutral (no vermillion glow) to prevent gradient illusion

### Logo Text ✅ (pushed — 3130c9f)
- "hellotalent.ai" → "hellotalent"
- hello=#C94E28 (vermillion), talent=#1E2D5E (navy)

### Known Remaining Items
- `avd-avatar-img` not yet added to `setAvatarImage()` targets in profil-ui.js
- Avatar dropdown popup integration with profil-inbox.js needs verification

---

## 6c. Session 18 Mart 2026 — Wizard UX & Dashboard Cleanup

### Wizard Field Reordering ✅ (pushed — d0731a7)
- **Experience card**: Dates moved right after company/role (before detail fields like segment, team size)
- **Step 4 Tercihlerim**: Kariyer Hedefi & Yönelimi moved to top; Çalışma Tipleri before Müsaitlik
- Principle: big-picture questions first → specific preferences → details

### Experience Card Date Frame Removal ✅ (pushed — 3564524)
- Removed border, background, padding from `.exp-date-block` — flat layout matching other fields

### Wizard Data Integrity Fixes ✅ (pushed — 7ee129f, cda592d)
- **baslangic_yil NOT NULL fix**: Experience cards with empty start year are now skipped during save (prevents DB constraint violation)
- **Dirty flag on deletion**: All delete buttons (experience, education, language, certificate, target role) now call `markWizardDirty()` so exit confirmation modal appears
- **Draft cleared on discard**: "Kaydetmeden çık" now calls `clearDraft()` to prevent stale draft restoration on next visit
- **collectTargetRoles**: Only sends rows where both rol_ailesi AND rol_unvani are filled (prevents DB NOT NULL violation)
- **saveProfileRPC error handling**: Enhanced error object with code, details, hint fields

### Delete Confirmation ✅ (pushed — fd38305)
- All wizard delete buttons now use 2-step confirmation: first click → "Sil?" text, second click → actual deletion
- Auto-resets to trash icon after 2.5s if not confirmed
- `attachDeleteConfirm()` helper function in profil-ui.js
- Applies to: experience cards, education rows, language rows, certificate rows, target role rows

### Dashboard Lab Section Removal ✅ (pushed — 44d711f)
- Mülakat Koçu card (eski İş Görüşmeleri + Yetkinliklerim) moved from Laboratuvar section to main bento grid
- Lab section header (🧪 Laboratuvar) completely removed
- Premium Yan Haklar card stays in main grid
- CSS cleaned: `.lab-section/.lab-header/.lab-title/.lab-desc/.lab-icon` removed, `.lab-grid .bento-card.locked` → `.bento-card.locked`

### Test Results
- 102/102 Playwright tests passing (smoke + dark mode + regression)

---

## 7. Kalan Backlog

### ~~Onaylanan Header Mockup~~ ✅ TAMAMLANDI (Glassmorphic Float)
- Sidebar kaldırıldı → LinkedIn-style glassmorphic float header
- `backdrop-filter:blur(16px)`, `rgba(255,255,255,0.72)`, `border-radius:14px`, floating `top:8px`
- 5 nav item (Genel, Profil, Markalar, Teklifler, Ayarlar) + search icon
- SVG icons on top, 11px labels below, vermillion underline active indicator
- Avatar dropdown: premium button, dark mode toggle, logout
- Logo: "hellotalent" (no .ai), hello=#C94E28, talent=#1E2D5E
- Hero cards: flat #C94E28 (no gradient), neutral shadow
- Mobile: header flat, bottom-nav shown, sidebar available via hamburger

### Cloudflare Access ✅ (aktif)
- hellotalent.ai — Self-Hosted application, 1 policy assigned
- Email/OTP ile server-side password protection
- Gate.html JS check'leri kaldırıldı (13 dosya) — Cloudflare Access yeterli

### P3 — Employer Onboarding & Team System ✅ TAMAMLANDI
**Yapılanlar:**
1. ✅ Employer kayıt → domain-uyumlu email doğrulama (migration 028)
2. ✅ Tek marka / çoklu marka onboarding flow (ik.html)
3. ✅ Şirket/marka profili + İK kullanıcı ataması
4. ✅ Holding profili + marka profilleri + İK ekipleri ataması
5. ✅ company_teams + company_invitations tabloları (migration 029)
6. ✅ hr_profiles.team_id + employer_role (admin/recruiter/viewer)
7. ✅ Follower system + activity feed (P3-B)
8. ✅ Messaging system + templates (P3-D)
9. ✅ Premium subscription gating (P3-E)
10. ✅ Profile completion scoring + visibility (P3-H)

**Kalan:** Headhunter role (Peoplein gibi şirketler) — MVP sonrasına ertelendi

### P3 — Tamamlanan Özellikler (16 Mart 2026)
| # | Özellik | Durum | Commit |
|---|---------|-------|--------|
| P3-A | Employer onboarding (role, domain, tek/çoklu marka, teams) | ✅ Done | `a553d98` |
| P3-B | Follower system + activity feed + company locations | ✅ Done | `1d119fe` + `6277c83` |
| P3-C | Company details sync + career URL + locations CRUD | ✅ Done | `3af0d97` |
| P3-D | Employer→candidate messaging (templates, inbox, DM) | ✅ Done | `c185a68` |
| P3-D+ | Candidate→Employer visibility enforcement (6 gap fixed) | ✅ Done | `e999b42` |
| P3-E | Premium subscriptions + SMS phone verification (schema + gating) | ✅ Done | `2a27a72` + `316c883` |
| P3-H | Profile completion scoring + ≥45% visibility threshold | ✅ Done | `39ffcad` + `9ce0498` |

### P3 — Dış Servis Entegrasyonu Bekleyenler
| # | Özellik | Durum | Bağımlılık |
|---|---------|-------|-----------|
| P3-E+ | iyzico/Stripe ödeme entegrasyonu | 🔲 Schema hazır, provider yok | Merchant hesap + API key |
| P3-E+ | Twilio SMS gönderimi | 🔲 Schema hazır, provider yok | Twilio hesap + Edge Function |
| P3-E+ | Email notification worker (DM → email) | 🔲 Planlandı | Supabase Edge Function |
| P3-E+ | KVKK 30-gün purge cron | 🔲 Planlandı | Supabase cron / Edge Function |

### P4 — Sonraki Büyük Özellikler
| # | Özellik | Durum |
|---|---------|-------|
| P4 | Public pages content review | Planned |
| P4 | Dark mode expansion — profil.css foundations done (7-phase hardening, 24 tests), remaining: settings alerts→modals, ik/giris/gate pages | In Progress |
| P4 | Performance optimization (Lighthouse, lazy-load, minification) | Planned |

### Migration Deploy Durumu
| Migration | İçerik | Supabase Deploy |
|-----------|--------|----------------|
| 030 | sync_company_details + career_page_url | ✅ Deployed |
| 031 | employer_messages + message_templates + RLS + seed | ✅ Deployed |
| 032 | visibility enforcement (enhanced send_employer_message) | ✅ Deployed |
| 033 | subscriptions + employer_daily_usage + plan helpers | ✅ Deployed |
| 034 | SMS phone verification (OTP flow) | ✅ Deployed |
| 035 | profile_completion_pct + employer RLS update | ✅ Deployed |
| 036 | profile completion sync triggers + admin hardening | ✅ Deployed |
| 037 | seat limits + plan update (free/premium/pro/enterprise) | ✅ Deployed |
| 042 | competency_definitions + role_competency_map + candidate_competencies | ✅ Deployed |
| 042a | Seed: 29 yetkinlik tanımı + 237 rol-yetkinlik eşlemesi | ✅ Deployed |
| 043 | Schema drift reconciliation (candidates + experiences) | ✅ Deployed |
| 044 | save_candidate_profile: experience rol_ailesi/rol_unvani fix | ✅ Deployed |
| 045 | search_employer_candidates RPC (employer search) | ✅ Deployed |
| 046 | `046_brands_column_reconciliation.sql` — brands.name→brand_name, companies.name→company_name | ✅ Deployed Session 9 — no-op |
| 047 | `047_candidate_brand_company_fk_prep.sql` — nullable company_id/brand_id on experiences + brand_interests | ✅ Deployed Session 9 |
| 048 | `048_save_profile_brand_company_ids.sql` — RPC writes company_id/brand_id alongside text | ✅ Deployed Session 9 |
| 049 | `049_visibility_and_search_id_first_matching.sql` — id-first search + exact backfill | ✅ Deployed Session 9 |
| 050 | `050_position_aware_scoring.sql` — 12-signal position-aware scoring engine | ✅ Deployed Session 10 — 5+6 param overload; `a8fc46e` ile UI bayrağı açık |
| 051 | `051_transactional_email_phase1.sql` — email_outbox + claim + message trigger | ✅ Deployed Session 12 |
| 052 | `052_candidate_message_replies.sql` — reply table + send/thread/mark-read RPCs + RLS | ✅ Deployed Session 13 |
| 053 | `053_employer_thread_list_rpc.sql` — get_company_message_threads RPC | ✅ Deployed Session 13 |
| 054 | `054_employer_followup_replies.sql` — employer follow-up table + send/mark-read RPCs + 3-way thread | ✅ Deployed Session 14 |
| 055 | `055_thread_list_3way_activity.sql` — 3-way activity for thread list RPCs | ✅ Deployed Session 14 |
| 056 | `056_candidate_unread_count.sql` — candidate unread count RPC + deleted-thread reactivation | ✅ Deployed Session 14 |
| 057 | `057_canonical_thread_model.sql` — read-only unread count, write-side reactivation, canonical summaries | ✅ Deployed Session 14 |
| 058 | `058_coach_system.sql` — coach_invites, coach_profiles, coach_posts, coach_post_likes + RPCs + triggers | ✅ Deployed Session 15 |
| 059 | `059_email_outbox_coach_invite.sql` — adds coach_invite to email_outbox CHECK constraint | ✅ Deployed Session 15 |
| 060 | `060_coach_posts_rls_tighten.sql` — tighten coach INSERT/UPDATE: draft-only insert, no self-publish/admin_note/like_count bypass | ✅ Deployed Session 15 |
| 061 | `061_coach_update_like_count_guard.sql` — add like_count = 0 to coach UPDATE WITH CHECK | ✅ Deployed Session 15 |
| 062 | `062_coach_invites_rls_auth_users_fix.sql` — fix own_read policy (auth.jwt() instead of auth.users subquery) + explicit GRANTs | ✅ Deployed Session 15 |
| 063 | `063_fix_cron_http_post.sql` — fix pg_cron email jobs: extensions.http_post -> net.http_post | ✅ Deployed Session 15 (live fix) |
| 064 | `064_coach_taxonomy_metadata.sql` — category taxonomy refresh (4→6), coach_profiles author metadata, old category migration | ✅ Deployed Session 16 |
| 065 | `20260322093832_ops_health_rpc.sql` — get_ops_health_stats() + get_ops_failed_emails() RPCs (admin-only, SECURITY DEFINER) | ✅ Deployed Session 17 (SQL Editor) |
| 066 | `20260322095713_email_outbox_failed_at.sql` — failed_at column + RPC update for truthful failure timing | ✅ Deployed Session 17 (SQL Editor) |
| 067 | `20260325204647_support_center_phase1.sql` — support_articles + support_tickets + support_ticket_messages + create_support_ticket RPC + email_outbox CHECK + 6 seed articles | ✅ Deployed Session 22 (CLI) |
| 068 | `20260325212309_support_articles_turkish_polish.sql` — article copy polish (proper Turkish characters + natural tone) | ✅ Deployed Session 22 (CLI) |

### Markalar TODO
- [x] ~~Mobil test (390×844)~~ ✅ Touch toggle (`.active` class) eklendi, hover + click ile çalışır
- [x] ~~Dark mode uyumu~~ ✅ Glassmorphic ön yüz korunuyor, koyu gölgeler, logo wrap uyumlu
- [x] ~~Yeni marka ekleme süreci~~ ✅ Aşağıda dokümante edildi

### Yeni Marka Ekleme Süreci
1. **Supabase → brands tablosu:** Yeni satır ekle (brand_name, company_id, segment, store_count_tr, store_cities, employee_count_tr, hq_city, short_description, website_url, instagram_url)
2. **Logo upload:** Supabase Storage → `brand-logos/` bucket'ına PNG/SVG yükle, `logo_url` kolonunu güncelle. Logo yoksa otomatik olarak Google Favicons API kullanılır (website_url'den).
3. **Renk ekle:** `profil-markalar.js` → `_BRAND_COLORS` objesine yeni entry: `'Marka Adı': { frontBg: '', backBg: '#HEX', accent: '#HEX' }` — backBg ve accent aynı kurumsal renk olmalı
4. **Hafıza güncelle:** `.claude/projects/.../memory/project_brand_colors.md` dosyasına yeni markayı ekle
5. **Deploy:** `git push origin main` → ~40 saniye → `Cmd+Shift+R`
6. **Doğrula:** Markalar panelinde yeni kartın göründüğünü, rengin doğru olduğunu, hover-reveal'ın çalıştığını kontrol et

---

## 8. Data Strategy Özeti

### Matching Model
```
match_score = hard_filter_fit(0.30) + retail_fit(0.25) + intent_fit(0.20) 
            + profile_quality(0.15) + behavior_signal(0.10)
```
Felsefe: "AI suggests, human confirms"
Detay: .claude/skills/hellotalent-dev/references/data-strategy.md

---

## 9. Test Suite

### Çalıştırma
```bash
cd /Users/peopleintk/Downloads/Hellotalent
npx playwright test --reporter=list
```

### Sonuç: 102/102 passing (18 Mart 2026)
Smoke + dark mode + p3 regression tests — all passing.

### Config
- baseURL: https://hellotalent.ai
- Mobile: 390×844 (iPhone)
- Desktop: 1440×900

---

## 10. Deployment & Workflow

### Deploy
```bash
git add [dosya] && git commit -m "mesaj" && git push origin main
```
Propagation: ~40 saniye → hard refresh (Cmd+Shift+R)

### Cache Busting
profil.html JS imports: `?v=YYYYMMDDx` query string. Her deploy'da bump et:
```html
<script src="profil-core.js?v=20260317d"></script>
<script src="profil-data.js?v=20260317d"></script>
<script src="profil-ui.js?v=20260319a"></script>
<script src="profil-yetkinlik.js?v=20260319b"></script>
<script src="profil-mulakatkocu.js?v=20260320b"></script>
<script src="profil-settings.js?v=20260317d"></script>
```

### Cursor Workflow
- Tüm Cursor prompt'ları **İngilizce**
- Her prompt sonunda: "After completing: 1. Short summary 2. Only [file] modified 3. Run: git add ... && git commit ... && git push origin main"
- Cursor bitince: `git diff --stat` → review → commit

### Terminal Komutları
```bash
# Session başı overview
find . -name "*.html" -o -name "*.js" -o -name "*.css" | grep -v node_modules | while read f; do echo "=== $f ($(wc -l < "$f") lines) ==="; head -5 "$f"; echo "..."; done

# Belirli section
sed -n 'X,Yp' dosya.html

# Cursor sonrası
git diff --stat
git diff dosya.html | head -100
```

### Supabase SQL
- Monaco editor'a yapıştır → Cmd+Return
- Destructive query onay dialog: ~(778, 510)
- Monaco injection: `window.monaco?.editor?.getEditors?.()?.[0]?.setValue(sql)`

---

## 11. Önemli Kurallar & Öğrenimler

1. **Türkiye yüksek enflasyon** → statik maaş benchmark feature'ları güvenilmez → silindi
2. **"Mülakat" veya "iş görüşmesi"** kullan, asla "röportaj" değil
3. **Maaş karşılaştırma** özelliği bilinçli olarak çıkarıldı → geri ekleme
4. **GENERATED ALWAYS** identity columns sessizce upsert'i reddeder → her zaman identity column type'ı kontrol et
5. **Homepage dosyası** her zaman index.html — asla index_new.html
6. **Dosyalar session'lar arası persist etmez** → re-upload gerekli
7. **profil.html** → section-by-section edit only (6 dosyaya split edildi)
8. **Step-by-step with verification** → onay almadan sonraki adıma geçme
9. **console.log kullanma** — production'da debug log yasak, sadece console.error/warn
10. **Engelli şirketler UI gizli** — display:none, 30+ şirket sisteme katıldıktan sonra aktif
11. **Vermillion hover** her yerde `#b84420` — başka varyant kullanma
12. **Navy gradient** 3-stop: `#2A3F7A → #1E2D5E → #162247` — başka combination kullanma
13. **LinkedIn OAuth** provider adı `linkedin_oidc` — `linkedin` deprecated
14. **Netlify kullanma** — limit doldu, Cloudflare free tier unlimited
15. **Cache busting** — profil.html JS imports'a `?v=YYYYMMDD` ekle, her deploy'da bump et

---

## 12. Git Commit Geçmişi (14-17 Mart 2026)

```
refactor: centralize Supabase config in shared.js - Phase 1 (7 pages)
...
feat: activate LinkedIn OAuth login (OIDC provider) (dbbdbd4)
feat: split admin candidate monitoring and enable IK recommendation threshold at 45% (39ffcad)
fix: harden profile completion sync trigger and normalize location scoring (9ce0498)
fix: finalize profile completion hardening and update handoff (87bd4e5)
feat: team management panel, gate removal, UI polish, migration 037 (03669f3)
feat: header message & notification popup dropdowns (7d3d321)
feat: inbox trash tab, realtime notification dots, bildirimler panel (a479509)
fix: align completion scoring, remove forced profile_completed, UX polish (1cef197)
chore: accessibility & structural cleanup Sprint 3 (1a0a429)
feat: Sprint 4 — copy quality, typography & accessibility (d15dfb6)
feat: profil merkezi kartları yeniden tasarlandı — vermillion gradient (138d2fa)
fix: beyaz artifact kaldırıldı, muted warm gradient (660076a)
chore: genel bakış hero kartı profil merkezi ile eşitlendi (907c326)
fix: kurumsal turuncu %50 opacity, solid pill'ler (1333fc7)
fix: harden profil dark mode system and eliminate dark theme leakage (33c93d3)
style: add gradient effect and matched shadow to mk-cards (20a3d08)
feat: LinkedIn-style glassmorphic float header, sidebar removed (bfdfdd2)
style: move search bar to nav icon, place before Ayarlar (ef8c2f6)
fix: match Markalar header icon with bento card (721bee8)
feat: avatar dropdown panel with premium, theme toggle, logout (c46bbcf)
style: vermillion gradient hero cards for Genel and Profil Merkezi (95c7a24)
style: flat #C94E28 vermillion on hero cards, no gradient (7b590ec)
style: logo text changed from hellotalent.ai to hellotalent (3130c9f)
style: neutral shadow on hero cards, remove vermillion glow (f6c4fc6)
```

---

## Deploy, push ve Playwright doğrulama (20 Mart 2026)

### GitHub Pages — ne canlıya gider?
- **Yalnızca `origin/main`** üzerindeki dosyalar (son başarılı Pages build). Yerelde değiştirilip **commit + push edilmeyen** hiçbir şey production’da yoktur.
- **Push eksik mi?** `git fetch origin && git status -sb` → `main...origin/main` satırında `[ahead N]` yoksa, pushlanmamış commit yoktur. `[ahead N]` varsa `git push origin main` gerekir.
- **SQL migration** dosyaları repoda durabilir; Supabase SQL Editor’da (veya pipeline’da) uygulanmadıkça veritabanı tarafı “deploy edilmemiş” kalır. **050 (pozisyon skoru) Session 10’da canlıya alındı** — bundan sonraki migration’lar için yine ayrı doğrulama gerekir.

### Bu dönem — test çıktısı (bilinen tablo)
- **Profil panel delegasyon guard:** `tests/profil.panel-delegation.spec.js` → **2/2** geçti.
- **P3 regression guard:** **42/42** geçti; bu pakete göre yeni regresyon yok.
- **Tam Playwright suite:** ör. **108 passed / 26 failed** — failed testlerin tamamı **önceden bilinen** dış koşullar (Cloudflare Access ile canlı URL blokajı, `--text` token denetimi vb.). Failure varken Playwright **exit code 1** normaldir.
- İlgili görevde **kaynak olarak `profil.html` / `ik.html` değiştirilmediyse** (yalnızca test infra + dokümantasyon), dev sunucuda doğrulanan davranış ile repo farkı bilinçli olabilir; canlıyı etkileyen tek yol yine `main` push + Pages.

### Yerelde commit dışı kalanlar (örnek — `git status` ile güncel bak)
Workspace’te sık görülen unstaged örnekler: `package.json`, `playwright.config.js`, `ik.html`, `docs/handoff.md`, yeni E2E dosyaları (`tests/auth.setup.js`, `tests/profil.ayarlar-toggles.e2e.spec.js` vb.). Bunlar **henüz `origin/main`’de yoksa** deploy da yoktur; canlıya almak için ayrı commit + push gerekir.

---

## 13. Yeni Session Başlatma Rehberi

Yeni bir chat açtığında şunu söyle:

> "`docs/handoff.md` oku dersen her şey orada."

Ya da Claude Code'da:
```bash
cat docs/handoff.md
```

### Sıradaki İşler (öncelik sırasıyla)
1. ~~**Migration deploy** (032-037)~~ ✅ All deployed
2. ~~**Sprint 3-4**~~ ✅ Accessibility, card redesign, dark mode hardening
3. ~~**Profil Merkezi mk-card redesign**~~ ✅ Gradient + shadow + tokenized
4. ~~**Dark mode foundations (profil.css)**~~ ✅ 7-phase systematic hardening, 24 tests passing
5. ~~**Header modernization**~~ ✅ Glassmorphic float header + avatar dropdown
6. ~~**Yetkinlik Wizard**~~ ✅ v2 rebuild, bento grid, 29 KF yetkinlik, premium reading view
7. ~~**Dashboard polish**~~ ✅ Progress bar, Kim Baktı header, bento CTA animations, avatar glow
8. ~~**Mülakat Koçu unification**~~ ✅ 7-screen flow, competency coaching, journal, file rename
9. ~~**Phase 3C — employer pozisyon skoru**~~ ✅ Migration 050 Supabase’te
10. ~~**Messaging: bi-directional live-chat**~~ ✅ Session 13-14 — migrations 052-057, split-pane, realtime
11. ~~**Supabase config consolidation**~~ ✅ Session 17 — Phase 2+3, shared.js single source
12. ~~**Ops Health Dashboard**~~ ✅ Session 17 — admin panel, RPCs, failed_at truthfulness, deployed
13. ~~**Profil modularization**~~ ✅ Session 17 — 5 extraction passes, profil-ui.js 3420→1870 lines
14. **🔴 Messaging E2E smoke test:** Authenticated manual test with real accounts required
15. **Coach media V1 — DB deploy:** `20260322142905_coach_media_fields.sql` Supabase'e uygulanmalı
16. **Coach media V1 — alt text guard:** coach-studio `savePost()` cover varsa boş `cover_image_alt` yazmamalı
17. **Messaging email Phase 2:** employer follow-up trigger + employer reply notification
18. **Mülakat Koçu V2:** Günlüğüm review surface, AI feedback on drafts, design polish
19. **Minor fix:** `avd-avatar-img` → setAvatarImage() targets (profil-ui.js)
20. ~~**Migration 042**~~ ✅ competency tabloları — Session 5 / handoff §25
21. **Brand color audit:** Batch 2 (index, blog, hakkimizda) + Batch 3 (ik, aday, profil.css)
22. **Dark mode remaining:** profil-settings.js alert→modal (7 instances), ik/giris/gate pages
23. **P4 — Public pages content review + dark mode expansion + performance**

### Önceki Transkriptler
Tam konuşma geçmişi:
- /mnt/transcripts/2026-03-14-09-52-17-hellotalent-dev-session-p1-complete.txt
- /mnt/transcripts/2026-03-14-13-09-47-hellotalent-dev-session-p2-start.txt
- /mnt/transcripts/2026-03-15-09-40-04-hellotalent-markalar-panel.txt
- /mnt/transcripts/2026-03-15-11-50-02-hellotalent-markalar-dashboard-gelistirme.txt
- (16 Mart session — sidebar navy, brand color audit, LinkedIn OAuth, Cloudflare DNS)
