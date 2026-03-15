# hellotalent.ai — Technical Handoff Document
> Son güncelleme: 16 Mart 2026
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
| CDN/DNS | Cloudflare (free tier — nameservers aktif, propagation bekliyor) |
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
| profil.html | ~2200 lines — tüm paneller, bento grid, loading screen, toggle grid, preview modal |
| profil-core.js | Supabase client, shared auth promise, theme, normalization, reference data |
| profil-data.js | Data loading/saving utilities |
| profil-ui.js | ~3100+ lines — flip cards, brand colors, merkez cards, preview modal, toggle logic, retry logic |
| profil-settings.js | Settings panel, deletion banner |
| profil.css | ~2700 lines — all profil dashboard styles |

### Config & Test
| Dosya/Klasör | İçerik |
|-------------|--------|
| playwright.config.js | Test config (mobile 390×844 + desktop 1440×900) |
| tests/hellotalent.smoke.spec.js | 68 smoke tests |
| docs/schema-drift-report.md | DB schema audit raporu |
| docs/handoff.md | Bu dosya |
| .claude/skills/hellotalent-dev/ | Custom Claude skill (SKILL.md + references/) |

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
- [ ] Theme toggle visibility (gold sun icon on navy sidebar) + shared.css vermillion hover
- [ ] Brand color audit Batch 2 (index, blog, hakkimizda, iletisim, isalim-rotasi)
- [ ] Brand color audit Batch 3 (ik, aday, profil.css)
- [ ] Navy gradient standardization (profil.css — 12 steps)
- [ ] Sentry retry logic (profil-ui.js — retry failed child queries with session refresh)
- [ ] Wizard "İlçe Seç" rename + district card frame kaldır
- [ ] Cache-busting JS imports (profil.html — ?v=20260316)
- [ ] Navy header with search/notif/breadcrumb + sidebar fold effect (BIG — approved mockup)
- [ ] cursor-preview-polish.md — Banner shadow, company bold, son güncelleme, CV link
- [ ] cursor-toggle-polish.md — Bento gaps, navy premium, alignment, "Beni Öner" naming + sync

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

---

## 7. Kalan Backlog

### Onaylanan Header Mockup (implement edilecek — prompt hazır)
- Navy header: gradient #2A3F7A→#1E2D5E→#162247
- Search bar (⌘K), notification bell (vermillion dot), breadcrumb, avatar
- Sidebar gradient: to bottom right (açık sol üst → koyu sağ alt)
- Paper fold effect: sidebar sağ kenarında 8px shadow + 1px highlight
- Logo: beyaz, `.ai` kısmı rgba(255,255,255,0.5)
- L-shaped navy frame, content area beyaz #F7F6F4

### Cloudflare Access (propagation sonrası)
- Email/OTP ile server-side password protection
- Gate.html'deki JS check'leri kaldırılabilir (artık gereksiz)

### P3 — Employer Onboarding & Team System
**Tek marka / Çoklu marka flow:**
1. Employer kayıt → domain-uyumlu email doğrulama
2. "Tek marka mı, çoklu marka mı yönetiyorsunuz?" sorusu
3. Tek marka → şirket/marka profili + İK kullanıcı ataması
4. Çoklu marka → holding profili + marka profilleri + İK ekipleri ataması
5. Marka claim conflict resolution (admin approval)
6. Headhunter role (Peoplein gibi şirketler)

**Schema P3'te eklenecek:**
- company_teams (team_name, brand_id FK)
- company_invitations (email, role, team_id, status)
- hr_profiles.team_id

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
4. İşveren DM ile pozisyon teklifi gönderir (hazır template'ler)
5. Aday tarafında DM inbox
6. DM aldığında email bildirimi

DB gereksinimleri: messages, message_templates, notifications tabloları + real-time subscription + email notification worker

### Markalar TODO
- [ ] Mobil test (390×844) — flip kartlar touch'da test edilmeli
- [ ] Dark mode uyumu
- [ ] Yeni marka eklendiğinde logo upload + color map güncelleme süreci dokümante et

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

### Sonuç: 64/68 passing
**Bilinen false negatives (4):**
- Brand fonts (2): Google Fonts CDN timing sorunu
- Gate sessionStorage (2): Redirect timing sorunu

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
profil.html JS imports: `?v=YYYYMMDD` query string. Her deploy'da bump et:
```html
<script src="profil-core.js?v=20260316"></script>
<script src="profil-data.js?v=20260316"></script>
<script src="profil-ui.js?v=20260316"></script>
<script src="profil-settings.js?v=20260316"></script>
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

## 12. Git Commit Geçmişi (14-16 Mart 2026)

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
feat: P2 #9 Settings MVP — bildirim tercihleri, engelli şirketler, hesap dondur/sil, CV görünürlük copy
fix: P2 #9 closure — hide blocking UI, add employer enforcement, add deletion banner
chore: clean code audit — remove 24 debug logs, fix Sentry TODO, remove fallback save, deduplicate 320 lines CSS
chore: add CLAUDE.md + project rules
feat: P2 #10 — İK email sync
feat: profil merkezi modern card redesign
fix: premium CTA top + CV section compact redesign
feat: profile preview modal + 1deneyim spacing fix
feat: horizontal toggle grid — 4 columns, cookie-consent style
feat: animated expanding-circle logout button in sidebar
feat: navy dark sidebar with gradient premium card
feat: activate LinkedIn OAuth login (OIDC provider) (dbbdbd4)
```

---

## 13. Yeni Session Başlatma Rehberi

Yeni bir chat açtığında şunu söyle:

> "`docs/handoff.md` oku dersen her şey orada."

Ya da Claude Code'da:
```bash
cat docs/handoff.md
```

### Sıradaki İşler (öncelik sırasıyla)
1. **Cloudflare Access setup** (propagation tamamlandığında)
2. **Pending Cursor prompts** (10 adet — sırayla yapıştırılacak)
3. **P3 — Employer Onboarding & Team System**

### Önceki Transkriptler
Tam konuşma geçmişi:
- /mnt/transcripts/2026-03-14-09-52-17-hellotalent-dev-session-p1-complete.txt
- /mnt/transcripts/2026-03-14-13-09-47-hellotalent-dev-session-p2-start.txt
- /mnt/transcripts/2026-03-15-09-40-04-hellotalent-markalar-panel.txt
- /mnt/transcripts/2026-03-15-11-50-02-hellotalent-markalar-dashboard-gelistirme.txt
- (16 Mart session — sidebar navy, brand color audit, LinkedIn OAuth, Cloudflare DNS)
