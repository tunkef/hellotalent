# hellotalent.ai — Technical Handoff Document
> Son güncelleme: 15 Mart 2026
> Bu doküman, projenin mevcut durumunu, tamamlanan işleri ve kalan backlog'u kapsar.
> Yeni bir chat/session başlatırken bu dosyayı referans olarak kullanın.

---

## 1. Proje Özeti

**hellotalent.ai** — Türk perakende (retail) sektörüne özel yetenek pazaryeri (talent marketplace).
Adaylar (candidates) ve İK/işverenler (employers) arasında köprü kurar.

### Tech Stack
| Katman | Teknoloji |
|--------|-----------|
| Frontend | Static HTML/CSS/JS (vanilla, no framework) |
| Hosting | GitHub Pages (custom domain: hellotalent.ai) |
| Backend | Supabase (PostgreSQL + Auth + Storage + RLS) |
| Repo | github.com/tunkef/hellotalent (private) |
| Test | Playwright (68 smoke tests) |
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

### Brand & Design System
```css
/* Colors */
--verm: #C94E28;    /* Vermillion — primary action */
--navy: #1E2D5E;    /* Navy — employer/authority */
--bg: #F7F6F4;      /* Page background */
--text: #111111;    /* Primary text */
--muted: #6B7280;   /* Secondary text */
--border: #E5E3DF;  /* Borders */

/* Fonts */
Bricolage Grotesque  → headings
Plus Jakarta Sans    → body text
DM Mono              → data/numbers
```
**Yasaklar:** Inter, Roboto, purple gradients, "röportaj" (her zaman "mülakat" veya "iş görüşmesi")

---

## 2. Dosya Yapısı

### Ana Sayfalar
| Dosya | Açıklama | Satır | Shared Chrome? |
|-------|----------|-------|----------------|
| index.html | Landing page (homepage) | ~2800 | Evet (shared.js/css) |
| giris.html | Login (aday + İK tab) | ~400 | Hayır (kendi layout) |
| gate.html | Beta gate (sessionStorage setter) | ~100 | Hayır |
| profil.html | Aday profil dashboard | ~5900+ | Hayır (kendi layout) |
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

### Config & Test
| Dosya/Klasör | İçerik |
|-------------|--------|
| playwright.config.js | Test config (mobile 390×844 + desktop 1440×900) |
| tests/hellotalent.smoke.spec.js | 68 smoke tests |
| docs/schema-drift-report.md | DB schema audit raporu |
| .claude/skills/hellotalent-dev/ | Custom Claude skill (SKILL.md + references/) |

---

## 3. Auth & Routing Sistemi

### Login Flow
```
giris.html → Aday tab → signInWithPassword → profil.html
           → İK tab   → signInWithPassword → ik.html
```

### Gate System
- `gate.html` → `sessionStorage.setItem('ht_gate', 'ok')`
- Tüm content pages (kariyer, pozisyonlar, blog, yetkinlik, hakkimizda, iletisim, isalim-rotasi) gate check yapar
- Legal pages (gizlilik, kvkk, kullanim-sartlari, cerez-politikasi) → gate YOK

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

### Tablolar (15 tablo, tümü live ✅)
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
| candidate_company_follows | Takip edilen şirketler | own only |
| candidate_blocked_companies | Engellenen şirketler (P2 #9) | own only |
| hr_profiles | İK/employer profili | own only |
| companies | Şirket verileri | public read |
| company_benefits | Şirket yan hakları | public read |

### RLS Policy Yapısı
**Candidate-own policies:** `candidate_id = get_my_candidate_id()` veya `user_id = auth.uid()`
**Employer-read policies (P2 #7'de eklendi):**
- `is_employer()` helper function → `EXISTS (SELECT 1 FROM hr_profiles WHERE id = auth.uid())`
- Koşul: `is_active = true AND profile_completed = true`
- Child tablolar: parent candidate active check

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

## 5. Tamamlanan İşler (P0 + P1 + P2 kısmi)

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
- **Feature 1 — Hesap dondur/sil:** UI card + frozen/pending_deletion banner + KVKK 30-gün grace period + trigger (frozen→is_active=false, active dönüşünde dokunma)
- **Feature 2 — Bildirim tercihleri:** 4 toggle (2 aktif: email messages/jobs, 2 disabled+Yakında: SMS/push) + save/load logic
- **Feature 3 — CV görünürlük:** is_active toggle label güncellemesi ("Profilimi ve CV'mi işverenlere göster") + açıklama paragrafı, ayrı DB column yok
- **Feature 4 — Engelli şirketler:** Tam CRUD UI (search + dropdown + chip + kaldır) + JS IIFE AMA display:none (şirketler sisteme katıldıkça aktifleşecek, 30+ şirket threshold)
- **Employer enforcement:** ik.html loadLiveCandidates'e blocked check eklendi (hrProfile.company_id varsa filtrele)
- **Schema prep:** hr_profiles.company_id + employer_role, brands.tr_operator_company_id
- **pending_deletion login banner:** sticky red banner + gün hesabı + "Vazgeç" butonu

### Clean Code Audit ✅
- 24 debug console.log kaldırıldı (profil.html), console.error/warn korundu
- Sentry DSN TODO comment kaldırıldı
- ik.html fallback save pattern kaldırıldı (tüm column'lar artık live)
- 320 satır duplicate CSS → shared.css'e taşındı (blog, kariyer, pozisyonlar, yetkinlik)
- Supabase config traceability: 3 dosyada "single source: shared.js" comment eklendi
- Net etki: -1192 satır (%12 codebase küçülme)

---

## 6. Kalan Backlog

### P2 #10 — Email Auth Sync (İK tarafı) ✅
- Login-time auto-sync: hr_profiles.email !== currentUser.email → auto-update
- Ayarlar'da "Değiştir" butonu + email change flow (supabase.auth.updateUser)
- Re-verification flow: profil.html ile aynı pattern, ID'ler -ik suffix ile ayrılmış

### P2 #9 Turuncu Features (Batch 2) ✅
- Aktif arama modu (toggle + employer badge + filtre)
- İletişim tercihleri (email/phone/whatsapp toggles)
- Verilerimi indir (KVKK md.11 JSON export)
- Google OAuth login (aday only, LinkedIn pending approval)
- Oturum yönetimi (session info + global signout)
- Password strength validation (8 zayıf / 10 orta / 12+ güçlü)
- Şifremi unuttum flow + sifre-yenile.html sayfası
- Login rate limit (5 deneme → 120s cooldown)
- Branded email templates (confirm, change email, reset password)
- Supabase automatic account linking enabled
- Google ile Kayıt Ol butonları (giris.html, index.html, aday.html)

### Refactoring ✅
- profil.html split → 6 files (profil.css, profil-core.js, profil-data.js, profil-ui.js, profil-settings.js)
- 6549 → 1981 lines (70% reduction)
- Gizlilik card reorder + hesap yönetimi wizard modal

### Infrastructure
- Google Cloud "hellotalent", OAuth client configured
- Supabase: Google provider enabled, automatic account linking on
- LinkedIn OAuth: approval pending
- Claude Code: 58 plugins active, Bun installed, CLAUDE.md + 5 rules files committed
- New page: sifre-yenile.html (password reset landing)

### P2 — Markalar Panel (Şirketler → Markalar Pivot) ✅ (15-16 Mart 2026)

**Karar:** Aday-facing UI tamamen brand-centric. Company data arka planda kalır, adaya yansımaz.

**DB Değişiklikleri:**
- `brands` tablosuna 8 yeni column: instagram_url, store_count_tr, store_cities (text[]), hq_city, segment, benefits_platform_url, employee_count_tr, is_featured (boolean)
- `brands.company_id` → nullable yapıldı (standalone marka desteği)
- `brands.logo_url` → 31 marka için Supabase Storage URL'leri eklendi
- 3 yeni marka INSERT: Hugo Boss (id=99), Alo Yoga (id=100), lululemon (id=101)
- 31 marka enriched: website, instagram, segment, store count, cities, employee count, description
- Hermès → orijinal isimle rename edildi
- LC Waikiki segment: mass → mid (MASS kategorisi kaldırıldı)
- `candidate_brand_follows` tablosu + RLS (aday own + employer read by company_id)
- Eski `candidate_company_follows` → deprecated (5 test kaydı, migrate edilmedi)

**Segment taxonomy (mix dil):** LUXURY, PREMIUM, MODA (mid), SPORT (sportswear), BEAUTY, TECH
- MASS kaldırıldı (LC Waikiki → MODA'ya taşındı)

**Logo Infrastructure:**
- 31 marka logosu PNG olarak Supabase Storage'a upload: `cvs/brand-logos/{slug}.png`
- 11 logoda baked-in checkerboard pattern temizlendi (PIL ile pixel-level cleaning)
- `brands.logo_url` güncellendi, `_brandLogoUrl()` DB logo_url'i öncelikli kullanır
- Google Favicon fallback hâlâ mevcut, initial letter son fallback

**UI — 3D Flip Card Design (profil.html + profil-ui.js + profil.css):**

*Ön yüz (default):*
- Logo (64px, rounded-square 14px, white bg, shadow)
- Marka adı (Bricolage Grotesque, 17px, bold)
- Segment pill (DM Mono, marka accent renginde)
- Mağaza sayısı (DM Mono, muted)
- "detaylar →" hint (hover'da görünür)
- Background: `radial-gradient(ellipse at 50% -20%, brand_color → white)` — marka kimliğini yansıtır
- Takip Et butonu YOK (flip ile erişilir)

*Arka yüz (hover/tap ile 3D flip):*
- Header: logo (40px) + marka adı + segment pill + mini "Takip Et" butonu (sağ üst)
- Info rows: mağaza sayısı + şehirler, çalışan sayısı, merkez şehir
- Description: marka açıklaması (12px, opacity 0.85)
- Link bar: Website + Instagram (kartın altında, border-top ile ayrılmış)
- Background: `linear-gradient(160deg, brand_accent → darker → darkest)` — markanın kendi renginde

*Teknik:*
- `perspective: 1200px` + `transform: rotateY(180deg)` + `backface-visibility: hidden`
- Desktop: `@media (hover: hover)` → hover ile flip
- Mobile: `onclick` → `.flipped` class toggle
- Z-index fix: `.flip-card { z-index: 1 }` → `:hover { z-index: 10 }` (hover leak prevention)
- Grid: 3 sütun desktop (>750px), 2 tablet, 1 mobil
- Kart yüksekliği: 260px fixed
- fadeUp stagger animation (0.03s delay per card)

**Brand Colors — 31 marka için `_BRAND_COLORS` map:**
Her marka: `frontBg` (radial gradient), `backBg` (linear gradient), `accent` (hex)
Louis Vuitton (#6B4C2A), Gucci (#00613C), Prada (#1A1A1A), Hermès (#E35205), Dior (#1A1A1A), Chanel (#1A1A1A), Cartier (#A8182D), Beymen (#8B7355), Vakko (#2C2C2C), Massimo Dutti (#4A3728), Hugo Boss (#1A1A1A), Ralph Lauren (#1B3D6D), Lacoste (#004D2C), Alo Yoga (#C4A265), lululemon (#D31334), Nike (#111111), Adidas (#1A1A1A), Zara (#1A1A1A), H&M (#E50010), Mango (#C8A96E), Boyner (#005B96), Pull & Bear (#4A6741), Bershka (#1A1A1A), Stradivarius (#8B6F47), Zara Home (#6B5B4E), LC Waikiki (#E74C3C), Sephora (#1A1A1A), MAC (#1A1A1A), Apple (#333333), Samsung (#1428A0), Teknosa (#E30613)

**Segment pill renkleri:** luxury=#1E2D5E, premium=#C94E28, mid=#3B82F6, sportswear=#F59E0B, beauty=#EC4899, tech=#6366F1

**Kaldırılanlar (bu session'da):**
- Modal popup sistemi (openBrandModal, closeBrandModal, tüm modal CSS/HTML)
- Featured editorial grid (öne çıkanlar section)
- Flat kart tasarımı + İncele butonu
- MASS segment pill'i
- linkedin_url, glassdoor_url, kariyer URL
- Liste görünümü, inline follow chips

**Korunanlar:** Search, segment pills, follow counter+popup, lazy load (12+12), follow state sync

**Sentry Fix:** `AbortError: Lock broken by another request with the 'steal' option` — tek shared auth promise pattern. profil-core.js'de `_htAuthSessionPromise` oluşturulur, tüm dosyalar bu promise'ı paylaşır.

**Gizli tutulacaklar:** is_featured (aday görmez, ileride monetization), company ilişkisi (aday görmez)

**Kalan TODO:**
- [ ] Mobil test (390×844) — flip kartlar touch'da test edilmeli
- [ ] Dark mode uyumu
- [ ] Yeni marka eklendiğinde logo upload + color map güncelleme süreci dokümante et

### P2 — Profil Merkezi Redesign (15 Mart 2026) ✅

**Profil Merkezi: Dark Terminal → Modern Card-Based Layout**

Identity Card:
- Dark `.m-hero` → temiz beyaz kart (avatar + isim + role/company + şehir/deneyim)
- Toggle'lar identity card'dan kaldırıldı → ayrı toggle grid'e taşındı
- "Profilimi Önizle" butonu eklendi (identity card sağında)
- Tüm JS ID'leri korundu (merkez-identity, merkez-avatar, merkez-name, vb.)

Stats Row:
- İki yan yana kart: Tamamlanma (%) + Profil Skoru (/100)
- Sol accent bar (green/vermillion), DM Mono büyük rakamlar
- Hint sistemi (score hints active)

Profil Bölümleri:
- Border-left satırlar → 5 renkli icon kartı (navy/verm/green/purple/amber)
- Status dot (yeşil=tamam, gri=eksik) + hover arrow animasyonu
- `updateSectionStatuses()` fonksiyonu eklendi

CV Upload (Yan Yana):
- Sol: drag-drop upload kartı (compact, horizontal layout)
- Sağ: "AI ile CV Optimize" dark kart (btn-generate-cv-merkez, disabled)
- Eşit yükseklik, min-height: 80px

Premium CTA:
- En alta → en üste taşındı (identity card'ın hemen altı)
- Subtle shimmer animasyonu (4s loop)
- "Premium Aday Avantajları — Öne çıkar, AI CV, kariyer koçluğu"

Branded Loading Transition:
- profil.html: hellotalent.ai logo + 5-dot wave animation + tagline
- Minimum 4 saniye, app body arka planda yüklenir

Gate/Login Akışı Fix:
- index.html session auto-redirect kaldırıldı
- Gate → index → "Giriş Yap" → profil.html → 4sn loading → dashboard

**Profil Önizleme Modal (Profilimi Önizle):**
- Full-screen modal: "İşverenlerin gördüğü profil görünümü" navy banner
- Hero: avatar + isim + role + şehir + deneyim yılı + "Aktif aday" badge
- Deneyim timeline (yeşil dot=devam, gri=geçmiş)
- Eğitim & Dil + Sertifikalar
- Tercihler & Lokasyon (tag pill'ler)
- CV: tıklanabilir dosya adı (target=_blank)
- İletişim: maskelenmiş email (k****@gmail.com) + telefon (536 *** ** 57) + 🔒 Gizli badge
- Son güncelleme tarihi (candidates.updated_at)
- ESC ile kapatma, overlay click, body scroll lock
- Maaş beklentisi GÖSTERİLMEZ (privacy)
- Veri kaynağı: `_loadedDBData` (ek API call yok)

**Toggle Grid (Cookie-Consent Style):**
- Identity card'daki 3 vertical toggle → 4-column horizontal bento grid
- Her toggle ayrı kart (gap: 10px, bento style)
- Cell 1: "Beni Öne Çıkar" — navy dark bg, PREMIUM badge sol üst, disabled
- Cell 2: "Aktif İş Arıyorum" — bağımsız badge toggle, DB yazmaz (ileride candidates.actively_looking)
- Cell 3: "Beni Öner" — candidates.is_active'e yazılır, sidebar + ayarlar ile sync
- Cell 4: "İşverenim Görmesin" — Cell 3 kapalıyken fade out (opacity 0.35)
- "Beni Öner" kapalıyken kırmızı hint: "Profilin ve CV'n işverenlerle paylaşılmaz"
- Responsive: 2×2 grid mobilde

**UX Kararları:**
- "Aktif İş Arıyorum" sadece rozet — kapatmak profili gizlemez
- Sisteme giren herkes önerilir, sadece "Beni Öner" kapalıysa önerilmez
- "Beni Öner" = sidebar toggle = ayarlar toggle = aynı DB field (is_active)
- Toggle isimleri tüm yerlerde tutarlı: "Beni Öner"

**Dosya Yapısı (güncel):**
- profil.html (~2100+ lines) — tüm paneller, bento grid, loading screen, toggle grid, preview modal
- profil-core.js — Supabase client, shared auth promise
- profil-ui.js (~2400+ lines) — flip cards, brand colors, merkez cards, preview modal, toggle logic
- profil.css — flip card, bento grid, loading screen, toggle grid, preview modal styles
- profil-settings.js — settings, deletion banner

**Git Commits (15 Mart 2026):**
```
feat: profil merkezi modern card redesign — identity, stats, sections, CV side-by-side (65b4c9c)
fix: premium CTA top + CV section compact redesign (22b5928)
feat: profile preview modal + 1deneyim spacing fix
feat: horizontal toggle grid — cookie-consent style, 4 columns
fix: toggle grid polish — bento gaps, navy premium, alignment, independent toggle logic
```

**PENDING Cursor Prompts (sırayla yapıştırılacak):**
- [ ] cursor-preview-polish.md — Banner shadow, company bold, son güncelleme, CV link
- [ ] cursor-toggle-polish.md — Bento gaps, navy premium, alignment, "Beni Öner" naming + sync


### P3 — Employer Onboarding & Team System (Yeni — Bu session'da tasarlandı)
**Tek marka / Çoklu marka flow:**
1. Employer kayıt → domain-uyumlu email doğrulama
2. "Tek marka mı, çoklu marka mı yönetiyorsunuz?" sorusu
3. Tek marka → şirket/marka profili + İK kullanıcı ataması
4. Çoklu marka → holding profili + marka profilleri + İK ekipleri ataması
5. Marka claim conflict resolution (admin approval)
6. Headhunter role (Peoplein gibi şirketler — kendi müşterisine satmak için aday arar)

**Schema hazır (P2 #9'da eklendi):**
- hr_profiles.company_id (nullable — claim sonrası dolar)
- hr_profiles.employer_role ('admin' | 'recruiter' | 'viewer')
- brands.tr_operator_company_id (TR distribütör mapping)

**Schema P3'te eklenecek:**
- company_teams (team_name, brand_id FK)
- company_invitations (email, role, team_id, status)
- hr_profiles.team_id

**Önemli kararlar:**
- Blocking company bazlı (brand bazlı değil — MVP'de yeterli)
- Blocking UI gizli kalacak — 30+ şirket sisteme katıldıktan sonra aktif
- tr_operator_company_id: employer onboarding'de şirket kendisi dolduracak (crowdsourced)
- Scraper ile şirket data enrichment (website → marka/mağaza bilgisi)
- Boyner Group vs Beymen: DB'de ayrı company (doğru), İK ekipleri ayrı

### P3+ — Diğer Büyük Özellikler
| # | Özellik | Durum |
|---|---------|-------|
| P3 | Companies Phase B (detail, locations, career links) | Planned |
| P3 | Candidate→Employer visibility enforcement | Planned |
| P3 | Premium/paid logic (payment integration) | Planned |
| P3 | İşveren-Aday iletişim sistemi (DM + follow + templates) | Planned |
| P3 | SMS telefon doğrulama (Twilio / Supabase Phone Auth) | Planned |
| P4 | Public pages content review | Planned |
| P4 | Dark mode expansion | Planned |
| P4 | Performance optimization | Planned |

### İşveren-Aday İletişim Sistemi (Detay)
MVP öncesi roadmap'e alındı:
1. Aday şirketi follow eder
2. İşveren follow'u görür (ama profili tam açamaz)
3. Eşleşen pozisyon olduğunda "seni takip ediyor" gösterimi
4. İşveren DM ile pozisyon teklifi gönderir (hazır template'ler: "İlgilenir misiniz?", "İlk görüşmeye davetlisiniz" vs.)
5. Aday tarafında DM inbox
6. DM aldığında email bildirimi

DB gereksinimleri: messages, message_templates, notifications tabloları + real-time subscription + email notification worker

---

## 7. Data Strategy Özeti

### Matching Model
```
match_score = hard_filter_fit(0.30) + retail_fit(0.25) + intent_fit(0.20) 
            + profile_quality(0.15) + behavior_signal(0.10)
```
Felsefe: "AI suggests, human confirms"
Detay: .claude/skills/hellotalent-dev/references/data-strategy.md

---

## 8. Test Suite

### Çalıştırma
```bash
cd /Users/peopleintk/Downloads/Hellotalent
npx playwright test --reporter=list
```

### Sonuç: 64/68 passing
**Bilinen false negatives (4):**
- Brand fonts (2): Google Fonts CDN timing sorunu
- Gate sessionStorage (2): Redirect timing sorunu

### Config
- baseURL: https://hellotalent.ai
- Mobile: 390×844 (iPhone)
- Desktop: 1440×900

---

## 9. Deployment & Workflow

### Deploy
```bash
git add [dosya] && git commit -m "mesaj" && git push origin main
```
Propagation: ~40 saniye → hard refresh (Cmd+Shift+R)

### Cursor Workflow
- Tüm Cursor prompt'ları **İngilizce**
- Her prompt sonunda: "After completing: 1. Short summary 2. Only [file] modified"
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

## 10. Önemli Kurallar & Öğrenimler

1. **Türkiye yüksek enflasyon** → statik maaş benchmark feature'ları güvenilmez → silindi
2. **"Mülakat" veya "iş görüşmesi"** kullan, asla "röportaj" değil
3. **Maaş karşılaştırma** özelliği bilinçli olarak çıkarıldı → geri ekleme
4. **GENERATED ALWAYS** identity columns sessizce upsert'i reddeder → her zaman identity column type'ı kontrol et
5. **Homepage dosyası** her zaman index.html — asla index_new.html
6. **Dosyalar session'lar arası persist etmez** → re-upload gerekli
7. **profil.html 6300+ satır** → section-by-section edit only
8. **Step-by-step with verification** → onay almadan sonraki adıma geçme
9. **console.log kullanma** — production'da debug log yasak, sadece console.error/warn
10. **Engelli şirketler UI gizli** — display:none, 30+ şirket sisteme katıldıktan sonra aktif

---

## 11. Git Commit Geçmişi (14 Mart 2026)

```
refactor: centralize Supabase config in shared.js - Phase 1 (7 pages)
fix: HT not defined fallback for pages where inline script runs before shared.js
refactor: Supabase config traceability - Phase 2 (giris, ik, profil)
fix: standardize auth guards - employer role redirect + gate check on content pages
fix: cross-role login prevention - employer/candidate tab validation
fix: work_prefs query .single() → .maybeSingle() for new users (Sentry fix)
docs: schema drift report + 3 live DB fixes applied
feat: replace mock ADAYLAR with live Supabase data (P2 #7)
feat: email auth sync + email change flow in Ayarlar (P2 #8)
feat: P2 #9 Settings MVP — bildirim tercihleri, engelli şirketler, hesap dondur/sil, CV görünürlük copy (4 features)
fix: P2 #9 closure — hide blocking UI, add employer enforcement, add deletion banner
chore: clean code audit — remove 24 debug logs, fix Sentry TODO, remove fallback save, deduplicate 320 lines CSS, improve config traceability
chore: add CLAUDE.md + project rules (supabase, code-quality, deploy, turkish-ui, architecture)
feat: P2 #10 — İK email sync (auto-sync + email change UI)
feat: profil merkezi modern card redesign (65b4c9c)
fix: premium CTA top + CV section compact redesign (22b5928)
feat: profile preview modal + 1deneyim spacing fix
feat: horizontal toggle grid — 4 columns, cookie-consent style
```

---

## 12. Yeni Session Başlatma Rehberi

Yeni bir chat açtığında şunu söyle:

> "hellotalent.ai projesi üzerinde çalışıyoruz. Lütfen docs/handoff.md dosyasını oku ve kaldığımız yerden devam edelim. Sıradaki: Profil Merkezi polish (pending Cursor prompts) veya P3 — Employer Onboarding."

Ya da Claude Code'da:
```bash
cat docs/handoff.md
```

### Önceki Transkriptler
Tam konuşma geçmişi:
- /mnt/transcripts/2026-03-14-09-52-17-hellotalent-dev-session-p1-complete.txt
- /mnt/transcripts/2026-03-14-13-09-47-hellotalent-dev-session-p2-start.txt
- /mnt/transcripts/2026-03-15-09-40-04-hellotalent-markalar-panel.txt
- /mnt/transcripts/2026-03-15-11-50-02-hellotalent-markalar-dashboard-gelistirme.txt
