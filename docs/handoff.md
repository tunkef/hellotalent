# hellotalent.ai — Technical Handoff Document
> Son güncelleme: 20 Mart 2026 (Session 10 — Phase 3C Position-Aware Scoring)
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
- ⚠️ SQL henüz Supabase'e deploy EDİLMEDİ — aşağıdaki deploy notlarına bak
- ⚠️ **PostgREST riski:** 050 deploy edilmeden `p_position_id` göndermek `42883 — function does not exist` hatası verir. PostgREST bilinmeyen parametreleri sessizce yok saymaz, tam imza eşleşmesi arar. Frontend'de `window.__HT_POSITION_SCORING` feature flag'i eklendi; 050 deploy sonrası `true` yapılmalı.

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

### Sonraki Adımlar
- [x] ~~Migration 042 → competency tabloları~~ ✅ Deployed
- [x] ~~Mülakat Koçu unification (Yetkinlik + İş Görüşmeleri → tek ürün)~~ ✅ Session 7
- [x] ~~Deploy 043 + 044~~ ✅ Session 8
- [x] ~~Deploy 045~~ ✅ Session 8 — deployed + security tested
- [x] ~~Deploy 046~~ ✅ Session 9 — no-op (production already had brand_name/company_name)
- [x] ~~Deploy 047 → 048 → 049~~ ✅ Session 9 — FK columns + RPC + backfill deployed. Backfill: 3/3 exp company_id, 2/3 exp brand_id, 6/7 brand interest brand_id filled.
- [x] ~~Push profil-ui.js + profil.html + ik.html to GitHub Pages~~ ✅ Session 9 — frontend published + smoke tested. FK resolution live: Zara→brand_id:1/company_id:10, Apple→brand_id:75/company_id:23. diller returns string[], languages returns object[], education uses egitim_seviye. No [object Object] regression.
- [ ] Mülakat Koçu: Günlüğüm / journal review surface (taslakları gözden geçirme ekranı)
- [ ] Mülakat Koçu: AI scoring / feedback on journal drafts
- [ ] profil-yetkinlik.js → DB'den veri çekmeye geçiş (hardcoded ANCHORS → Supabase query)
- [ ] candidate_competencies save/load entegrasyonu (aday yetkinlik rating'leri kalıcı)
- [ ] İşveren kampanya wizard'ı (ik.html)
- [ ] iyzico ödeme entegrasyonu
- [ ] Email delivery worker
- [ ] Label accessibility audit (43 uyarı)
- [ ] Brand color audit: Batch 2 (index, blog, hakkimizda) + Batch 3 (ik, aday, profil.css)
- [ ] Dark mode remaining: profil-settings.js alert→modal (7 instances), ik/giris/gate pages
- [x] ~~Phase 3C: Position-aware recommendation scoring (migration 050 + ik.html UI)~~ ✅ Session 10 — SQL + frontend committed. **SQL deploy bekliyor.**
- [ ] Phase 3C deploy: Migration 050'yi Supabase SQL Editor'a uygula, ardından ik.html'de `window.__HT_POSITION_SCORING = true;` ekle ve push et

---


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
| Test | Playwright (68 smoke + E2E auth tests) |
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
| profil-core.js | Supabase client, shared auth promise, theme (pre-paint bootstrap + meta-theme-color sync), normalization, reference data |
| profil-data.js | Data loading/saving utilities |
| profil-ui.js | ~3100+ lines — flip cards, brand colors, merkez cards, preview modal, toggle logic, retry logic |
| profil-settings.js | Settings panel, deletion banner |
| profil-yetkinlik.js | Competency wizard v2 — 29 yetkinlik, bento grid, Korn Ferry content, role-based mapping |
| profil-mulakatkocu.js | Mülakat Koçu — 7-screen interview coaching flow, 289 questions, competency coaching, development journal |
| profil-teklifler.js | Teklifler v2 — freemium/premium toggle, carousel, demo campaigns, frosted glass gate |
| profil-premium.js | Premium panel — features showcase, plan cards, pricing |
| profil-markalar.js | Markalar panel — brand cards, flip, follow, search, segment pills (extracted from profil-ui.js) |
| profil.css | ~3000+ lines — all profil dashboard styles (dark mode tokens, semantic variables) |

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
| 050 | `050_position_aware_scoring.sql` — 12-signal position-aware scoring engine | ⏳ Committed Session 10, deploy bekliyor |

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
- **SQL migration** dosyaları repoda durabilir; Supabase SQL Editor’da (veya pipeline’da) uygulanmadıkça veritabanı tarafı “deploy edilmemiş” kalır (ör. `050_*` vb. ayrı kontrol).

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
9. **Mülakat Koçu V2:** Günlüğüm review surface, AI feedback on drafts, design polish
10. **Minor fix:** `avd-avatar-img` → setAvatarImage() targets (profil-ui.js)
11. **Migration 042:** competency_definitions + role_competency_map + candidate_competencies
12. **Brand color audit:** Batch 2 (index, blog, hakkimizda) + Batch 3 (ik, aday, profil.css)
11. **Dark mode remaining:** profil-settings.js alert→modal (7 instances), ik/giris/gate pages
12. **P4 — Public pages content review + dark mode expansion + performance**

### Önceki Transkriptler
Tam konuşma geçmişi:
- /mnt/transcripts/2026-03-14-09-52-17-hellotalent-dev-session-p1-complete.txt
- /mnt/transcripts/2026-03-14-13-09-47-hellotalent-dev-session-p2-start.txt
- /mnt/transcripts/2026-03-15-09-40-04-hellotalent-markalar-panel.txt
- /mnt/transcripts/2026-03-15-11-50-02-hellotalent-markalar-dashboard-gelistirme.txt
- (16 Mart session — sidebar navy, brand color audit, LinkedIn OAuth, Cloudflare DNS)
