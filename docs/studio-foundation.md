# Stüdyo — Technical Foundation Document

> Aday tarafındaki en derin değer alanı. Kariyer gelişimi, yetkinlik eğitimi, uzman içerikleri ve platform bilgisi.
> Son güncelleme: 27 Mart 2026 (Yetenek Learning Portal Phase 1D.1 — live verified)

## Bilgi Mimarisi (Information Architecture)

```
Stüdyo (panel key: mulakat, loader: _htLoadMulakat)
├── Yetenek (Learning Portal — mülakat hazırlık)
│   ├── Compact rol seçici (role_select)
│   ├── Yetenek Home (lobby) — öğrenme planı, ilerleme, kanıt
│   │   ├── Progress bar
│   │   ├── Devam Et / Önerilen Başlangıç
│   │   ├── Hazırlık Özeti (tamamlanan/kalan/pratik)
│   │   ├── AI Koçluk teaser
│   │   ├── Erişilebilir yetkinlik kartları (self-rating + kanıt)
│   │   └── Kilitli yetkinlikler (tek özet blok + Premium CTA)
│   ├── Track Detail (competency_intro) — yetkinlik tanıtımı + ünite listesi
│   ├── Unit Detail (practice) — soru + güçlü/zayıf sinyaller + takip sorusu + AI placeholder
│   ├── Tamamlama özeti (completion)
│   └── Oturum özeti (session_complete)
├── Koç
│   ├── Uzman makale akışı (coach_posts, mevcut)
│   ├── Kategori filtre + arama
│   └── Makale detay + yazar kartı
├── Performans (DB-backed — studio_modules)
│   ├── Mağaza KPI rehberleri (4 seed modül)
│   └── Admin-managed CRUD
└── HelloTalent'ten Bilgiler (DB-backed — studio_modules)
    ├── Platform kullanım rehberleri (4 seed modül)
    └── Admin-managed CRUD
```

## Mevcut Teknik Durum (Yetenek Learning Portal sonrası)

| Bileşen | Dosya | Durum |
|---------|-------|-------|
| Studio landing | profil-mulakatkocu.js:renderStarIntro | ✅ Canlı — 4 bölüm kartı + badge strip |
| Yetenek Learning Portal | profil-mulakatkocu.js (6-screen flow) | ✅ Canlı — öğrenme portalı yapısı |
| Yetkinlik verisi | profil-yetkinlik.js (DB-backed + hardcoded fallback) | ✅ Canlı — 29 yetkinlik, DB-first |
| Koç akışı | profil-mulakatkocu.js (hydrateCoachFeed) | ✅ Canlı — coach_posts DB |
| Performans | profil-mulakatkocu.js (hydrateStudioSection) | ✅ DB-backed — 4 seed modül |
| HT Bilgiler | profil-mulakatkocu.js (hydrateStudioSection) | ✅ DB-backed — 4 seed modül |
| Admin modül yönetimi | admin-studio-modules.js | ✅ CRUD: list/create/edit/publish/archive |
| İlerleme takibi | candidate_studio_progress | ✅ DB-backed — mark_viewed/complete RPCs |
| Rozet sistemi | badge_definitions + candidate_badges | ✅ 6 rozet, DB-driven issuance |
| Journal kalıcılığı | candidate_studio_journals | ✅ DB-backed — UI aday akışından kaldırıldı |
| Yetenek pratik kaydı | candidate_yetenek_progress | ✅ DB-backed — competency completion |
| Self-rating | candidate_competencies | ✅ RPCs mevcut — lobby kartlarında toggle |
| Kanıt yüzeyi | get_my_yetenek_overview RPC | ✅ Lobby'de evidence hydration |
| AI feedback altyapısı | candidate_journal_feedback + Edge Function | ✅ Schema + RPC + Edge Function deployed |
| AI feedback aday yüzeyi | Aday akışında aktif değil | ⏸ Journal UI kaldırıldı, AI yüzeyi beklemede |
| Premium entitlement | candidate_premium_purchases + activate RPC + webhook | ✅ Demo flow deployed |

## Runtime Kontratları (Değiştirme!)

- Panel key: `mulakat` (profil.html, switchPanel, hash routing)
- Loader: `window._htLoadMulakat()` (profil-wizard.js lazy-load)
- Data bridge: `window._htYetkinlikData` (profil-yetkinlik.js → profil-mulakatkocu.js)
- Genel teaser: `window._htGenelCoachTeaser()` (profil-mulakatkocu.js → profil-genel.js)
- Coach detail: `window.openCoachDetail()` (global, Genel panel çağırır)
- CSS prefixes: `.ig-` (mevcut), `.st-` (Studio), `.yk-` (Yetenek Home/Track/Unit), `.aif-` (AI feedback)
- Screen states: `star_intro` (Studio landing), `role_select`, `lobby` (Yetenek Home), `competency_intro` (Track Detail), `practice` (Unit Detail), `completion`, `session_complete`
- Session persistence: `sessionStorage` (flow state), `localStorage` (star_seen, journal drafts — fallback)
- DB persistence: `candidate_studio_journals` (STAR+T drafts), `candidate_yetenek_progress` (pratik kaydı)

## Yetenek Akış Değişiklikleri (Learning Portal Yeniden Yapılandırma)

### Kaldırılan
- Gelişim Günlüğü (journal) textarea UI — aday akışından tamamen kaldırıldı
- STAR+T çoklu alan yazma deneyimi — pratik ekranından çıkarıldı
- AI değerlendirme butonu — pratik ekranından çıkarıldı (backend beklemeye alındı)

### Korunan (backend)
- `candidate_studio_journals` tablosu — DB'de duruyor, veri korunuyor
- `upsert_studio_journal` / `get_my_journals` RPCs — çalışıyor
- `candidate_journal_feedback` tablosu — schema deployed
- `journal-feedback` Edge Function — deployed, ACTIVE
- `request_journal_feedback` / `complete_journal_feedback` RPCs — çalışıyor
- localStorage journal fallback — hâlâ mevcut

### Yeni (Learning Portal)
- Yetenek Home: compact rol header + progress bar + readiness summary + AI teaser + öğrenme planı + collapsed locked summary
- Track Detail: yetkinlik tanıtımı + güçlü/risk/aşırı kullanım sinyalleri + zayıflıklar bloğu + ünite listesi (soru teması + preview)
- Unit Detail: tek soru odak + güçlü yanıt sinyalleri + yaygın zayıflıklar + takip sorusu + AI placeholder
- Lightweight Summary: kompakt istatistik + sonraki yetkinlik CTA
- Self-rating toggle: Güçlü/Gelişiyor — DB-backed `candidate_competencies`
- Evidence hydration: pratik sayısı, günlük sayısı, AI sinyal — `get_my_yetenek_overview` RPC

## Mevcut Blocker'lar

| Blocker | Durum | Çözüm |
|---------|-------|-------|
| OPENAI_API_KEY | Supabase secrets'ta yok | `npx supabase secrets set OPENAI_API_KEY=sk-... --project-ref cpwibefquojehjehtrog` |
| iyzico API credentials | Yapılandırılmadı | Gerçek iyzico merchant credentials gerekli |
| iyzico checkout redirect | Demo flow (webhook direkt çağrılıyor) | `initiatePurchase()` fonksiyonunda iyzico checkout'a yönlendirme |
| AI aday yüzeyi | Journal UI kaldırıldı, yeni yüzey yok | Phase 5B'de yeni AI yüzeyi tasarımı gerekli |

## Sonraki Adımlar

1. **Studio geneli polish**: Performans/Bilgiler/Koç bölümleri cross-section tutarlılık
2. **Gerçek iyzico checkout**: iyzico API credentials → checkout form → callback wiring
3. **OPENAI_API_KEY yapılandırma**: Secret set → backend AI E2E doğrulama
4. **Studio Phase 5B**: Yeni AI aday yüzeyi tasarımı (journal yerine unit-integrated yaklaşım)
5. **Studio Phase 6**: Video içerik altyapısı (embed player, admin upload, ilerleme tracking)
6. **Badge genişletme**: Yetenek pratik badge'leri (evaluate_candidate_badges extension)

## Deployed Schema (tamamlanan)

- `studio_modules` + `candidate_studio_progress` (Session 25)
- `badge_definitions` + `candidate_badges` + `evaluate_candidate_badges` RPC (Session 27)
- `candidate_studio_journals` + `candidate_yetenek_progress` + journal RPCs (Session 28)
- `candidate_journal_feedback` + feedback RPCs + `journal-feedback` Edge Function (Session 29)
- `candidate_premium_purchases` + entitlement RPCs + `premium-webhook` Edge Function (Session 34)
- `get_my_yetenek_overview` aggregation RPC (Session 33)
- `upsert_competency_rating` + `get_my_competency_ratings` RPCs (Session 32)
- DB-backed competency loading in profil-yetkinlik.js (Session 32)
