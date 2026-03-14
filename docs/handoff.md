# hellotalent.ai — Technical Handoff Document
> Son güncelleme: 14 Mart 2026
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

### Tablolar (14 tablo, tümü live ✅)
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
| rls_auto_enable() | Yeni tablo RLS otomatik etkinleştirme |

### Önemli Teknik Notlar
- `candidates.id`: GENERATED BY DEFAULT (upsert'e izin verir)
- `hr_profiles.id`: FK → auth.users(id) (direkt DB write imkansız)
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

---

## 6. Kalan Backlog

### P2 #9 — Settings MVP Expansion 🔄 (SIRADA)

**Audit sonucu — eksik özellikler:**

#### Kırmızı (MVP öncesi zorunlu)
| # | Özellik | Açıklama | KVKK? |
|---|---------|----------|-------|
| 1 | Hesap dondur / sil | Kullanıcı hesabını dondurma veya tamamen silme | Evet (md.11) |
| 2 | Bildirim tercihleri | Email/push/SMS bildirim opt-in/opt-out | Evet |
| 3 | CV görünürlük seviyeleri | Herkese açık / sadece premium / gizli | Hayır |
| 4 | Engelli şirketler listesi | Belirli şirketlerin profili görmesini engelle | Hayır |

#### Turuncu (MVP'de olması iyi)
| # | Özellik | Açıklama |
|---|---------|----------|
| 5 | Aktif arama modu | "Aktif iş arıyorum" sinyali |
| 6 | İletişim tercihleri | Hangi kanallardan ulaşılabilir |
| 7 | Verilerimi indir | KVKK md.11 — JSON/PDF export |
| 8 | İki faktörlü doğrulama | TOTP veya SMS 2FA |
| 9 | Oturum yönetimi | Aktif cihazlar listesi |

### P2 #10 — Email Auth Sync (İK tarafı)
- ik.html'de employer email sync (hr_profiles.email ↔ auth email)

### P3+ — Büyük Özellikler
| # | Özellik | Durum |
|---|---------|-------|
| P3 | Companies Phase B (detail, locations, career links) | Planned |
| P3 | Employer claim flow | Planned |
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
7. **profil.html 5900+ satır** → section-by-section edit only
8. **Step-by-step with verification** → onay almadan sonraki adıma geçme

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
```

---

## 12. Yeni Session Başlatma Rehberi

Yeni bir chat açtığında şunu söyle:

> "hellotalent.ai projesi üzerinde çalışıyoruz. Lütfen docs/handoff.md dosyasını oku ve kaldığımız yerden devam edelim. Sıradaki task: P2 #9 Settings MVP Expansion."

Ya da Claude Code'da:
```bash
cat docs/handoff.md
```

### Önceki Transkriptler
Tam konuşma geçmişi:
- /mnt/transcripts/2026-03-14-09-52-17-hellotalent-dev-session-p1-complete.txt
- /mnt/transcripts/2026-03-14-13-09-47-hellotalent-dev-session-p2-start.txt
