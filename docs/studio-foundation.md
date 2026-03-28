# Stüdyo — Technical Foundation Document

> Aday tarafındaki en derin değer alanı. Kariyer gelişimi, yetkinlik eğitimi, uzman içerikleri ve platform bilgisi.
> Son güncelleme: 28 Mart 2026 (Session 42 — FAZ 0-4C tamamlandı, deploy bekliyor)

## Bilgi Mimarisi (Information Architecture)

```
Stüdyo (panel key: mulakat, loader: _htLoadMulakat)
├── Yetenek (Learning Portal — mülakat hazırlık)
│   ├── Compact rol seçici (role_select) — pendingComp desteği (FAZ 4C)
│   ├── Yetenek Home (lobby) — öğrenme planı, ilerleme, kanıt
│   │   ├── Kişiselleştirilmiş karşılama: "Hoş geldin, [İsim]" (FAZ 4A)
│   │   ├── Öneri satırı: growing yetkinlik odaklı (FAZ 4A)
│   │   ├── Progress bar (6px, milestone işaretleri, micro-copy) (FAZ 2.3)
│   │   ├── Streak widget (alev ikonu, X gün seri / kırıldı / başla) (FAZ 2B)
│   │   ├── Bugünkü Pratik kartı (growing yetkinlik öncelikli) (FAZ 2B)
│   │   ├── Haftalık aktivite kartı (FAZ 2.3)
│   │   ├── Devam Et / Önerilen Başlangıç
│   │   ├── Hazırlık Özeti (tamamlanan/kalan/pratik)
│   │   ├── AI Koçluk teaser (badge: Active)
│   │   ├── Erişilebilir yetkinlik kartları (self-rating + kanıt, growing→incomplete→completed sıralama)
│   │   └── Kilitli yetkinlikler (tek özet blok + Premium CTA)
│   ├── Track Detail (competency_intro) — yetkinlik tanıtımı + ünite listesi
│   ├── Unit Detail (practice) — soru + güçlü/zayıf sinyaller + takip sorusu + AI placeholder
│   ├── Tamamlama özeti (completion)
│   │   ├── Completion badge (async son kazanılan rozet) (FAZ 2.3)
│   │   └── Cross-link kartları: Uzman Görüşü + İlgili Eğitim (FAZ 4B)
│   └── Oturum özeti (session_complete)
├── Koç
│   ├── Uzman makale akışı (coach_posts, mevcut)
│   ├── Kategori filtre + arama
│   └── Makale detay + yazar kartı + practice bridge CTA (FAZ 4C)
├── Performans (DB-backed — studio_modules)
│   ├── Mağaza KPI rehberleri (4 seed modül, sentence-case title'lar)
│   ├── Admin-managed CRUD
│   └── Modül detail + practice bridge CTA (FAZ 4C)
└── HelloTalent'ten Bilgiler (DB-backed — studio_modules)
    ├── Platform kullanım rehberleri (4 seed modül, sentence-case title'lar)
    ├── Admin-managed CRUD
    └── Modül detail + practice bridge CTA (FAZ 4C)
```

## Mevcut Teknik Durum (FAZ 0-4C sonrası, 28 Mart 2026)

| Bileşen | Dosya | Durum |
|---------|-------|-------|
| Studio landing | profil-mulakatkocu.js:renderStarIntro | ✅ 4 bölüm kartı + badge strip + task-first kopya |
| Yetenek Learning Portal | profil-mulakatkocu.js (6-screen flow) | ✅ Öğrenme portalı yapısı |
| Yetkinlik verisi | profil-yetkinlik.js (DB-backed + hardcoded fallback) | ✅ 29 yetkinlik, DB-first, doğallaştırılmış kopya |
| Koç akışı | profil-mulakatkocu.js (hydrateCoachFeed) | ✅ coach_posts DB |
| Performans | profil-mulakatkocu.js (hydrateStudioSection) | ✅ DB-backed — 4 seed modül, sentence-case title |
| HT Bilgiler | profil-mulakatkocu.js (hydrateStudioSection) | ✅ DB-backed — 4 seed modül, sentence-case title |
| Admin modül yönetimi | admin-studio-modules.js | ✅ CRUD: list/create/edit/publish/archive |
| İlerleme takibi | candidate_studio_progress | ✅ DB-backed — mark_viewed/complete RPCs |
| Rozet sistemi | badge_definitions + candidate_badges | ✅ 6 rozet, DB-driven issuance |
| Journal kalıcılığı | candidate_studio_journals | ✅ DB-backed — UI aday akışından kaldırıldı |
| Yetenek pratik kaydı | candidate_yetenek_progress | ✅ DB-backed — competency completion |
| Self-rating | candidate_competencies | ✅ RPCs mevcut — lobby kartlarında toggle |
| Kanıt yüzeyi | get_my_yetenek_overview RPC | ✅ Lobby'de evidence hydration |
| AI feedback altyapısı | candidate_journal_feedback + Edge Function | ✅ Schema + RPC deployed. Edge Function: gpt-5-mini + self-reflection (redeploy bekliyor) |
| AI feedback aday yüzeyi | Aday akışında aktif değil | ⏸ Journal UI kaldırıldı, AI yüzeyi beklemede |
| Premium entitlement | candidate_premium_purchases + activate RPC + webhook | ✅ Demo flow deployed |
| Streak sistemi | candidate_streaks + 2 RPC | ⏳ Migration hazır, deploy bekliyor. Frontend graceful fallback |
| Kişiselleştirme | profil-mulakatkocu.js (lobby) | ✅ Karşılama + öneri + sıralama (push bekliyor) |
| Completion cross-link | profil-mulakatkocu.js (FAZ 4B) | ✅ COMP_TO_COACH_CATEGORY + COMP_TO_MODULE_SLUG (push bekliyor) |
| Detail → practice bridge | profil-mulakatkocu.js (FAZ 4C) | ✅ MODULE_SLUG_TO_COMP + COACH_CAT_TO_COMP + pendingComp (push bekliyor) |
| Progress görselleştirme | profil-mulakatkocu.js (FAZ 2.3) | ✅ 6px bar, milestones, weekly summary, completion badge (push bekliyor) |
| İçerik doğallaştırma | profil-yetkinlik.js + STAR_CONTENT | ✅ 29 yetkinlik + UI kopya (push bekliyor) |

## Runtime Kontratları (Değiştirme!)

- Panel key: `mulakat` (profil.html, switchPanel, hash routing)
- Loader: `window._htLoadMulakat()` (profil-wizard.js lazy-load)
- Data bridge: `window._htYetkinlikData` (profil-yetkinlik.js → profil-mulakatkocu.js)
- Genel teaser: `window._htGenelCoachTeaser()` (profil-mulakatkocu.js → profil-genel.js)
- Coach detail: `window.openCoachDetail()` (global, Genel panel çağırır)
- CSS prefixes: `.ig-` (mevcut), `.st-` (Studio), `.yk-` (Yetenek Home/Track/Unit), `.aif-` (AI feedback)
- Screen states: `star_intro` (Studio landing), `role_select`, `lobby` (Yetenek Home), `competency_intro` (Track Detail), `practice` (Unit Detail), `completion`, `session_complete`
- Session persistence: `sessionStorage` (flow state), `localStorage` (star_seen, journal drafts — fallback)
- DB persistence: `candidate_studio_journals` (STAR+T drafts), `candidate_yetenek_progress` (pratik kaydı), `candidate_streaks` (streak tracking)
- Cross-link mappings: `COMP_TO_COACH_CATEGORY`, `COMP_TO_MODULE_SLUG` (forward, FAZ 4B), `MODULE_SLUG_TO_COMP`, `COACH_CAT_TO_COMP` (reverse, FAZ 4C)
- `S.pendingComp`: content detail → role_select → otomatik competency_intro yönlendirmesi (FAZ 4C)

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
| OPENAI_API_KEY | Secret set edildi, canlı smoke bekliyor | AI feedback E2E doğrulama gerekli |
| journal-feedback redeploy | Repo'da gpt-5-mini + self-reflection, canlıda eski versiyon | `supabase functions deploy journal-feedback --project-ref cpwibefquojehjehtrog` |
| 2 pending migration | 20260327010000 + 20260327020000 | `npm run db:push` |
| Frontend push | 6 dosya uncommitted | `git commit` + `git push origin main` |
| iyzico API credentials | Yapılandırılmadı | Gerçek iyzico merchant credentials gerekli |
| iyzico checkout redirect | Demo flow (webhook direkt çağrılıyor) | `initiatePurchase()` fonksiyonunda iyzico checkout'a yönlendirme |
| AI aday yüzeyi | Journal UI kaldırıldı, yeni yüzey yok | Phase 5B'de yeni AI yüzeyi tasarımı gerekli |

## Sonraki Adımlar

**Öncelik 1 — Deploy + Smoke (yeni feature önce bu tamamlanmalı):**
1. `npm run db:push` — 2 pending migration (copy cleanup + streak foundation)
2. `supabase functions deploy journal-feedback` — gpt-5-mini + self-reflection
3. `git commit` + `git push origin main` — frontend (FAZ 0-4C tümü)
4. Live smoke: streak widget, kişiselleştirme, detail→practice, AI feedback E2E, cross-links

**Öncelik 2 — Feature geliştirme (deploy + smoke sonrası):**
5. **Streak FAZ 2C**: freeze/geri kazan mekaniği
6. **Gerçek iyzico checkout**: iyzico API credentials → checkout form → callback wiring
7. **OPENAI_API_KEY canlı AI doğrulama**: secret set edildi, E2E smoke bekliyor
8. **Studio Phase 5B**: Yeni AI aday yüzeyi tasarımı (journal yerine unit-integrated yaklaşım)
9. **Studio Phase 6**: Video içerik altyapısı (embed player, admin upload, ilerleme tracking)
10. **Badge genişletme**: Yetenek pratik badge'leri (evaluate_candidate_badges extension)

## Deployed Schema (tamamlanan)

- `studio_modules` + `candidate_studio_progress` (Session 25)
- `badge_definitions` + `candidate_badges` + `evaluate_candidate_badges` RPC (Session 27)
- `candidate_studio_journals` + `candidate_yetenek_progress` + journal RPCs (Session 28)
- `candidate_journal_feedback` + feedback RPCs + `journal-feedback` Edge Function (Session 29)
- `candidate_premium_purchases` + entitlement RPCs + `premium-webhook` Edge Function (Session 34)
- `get_my_yetenek_overview` aggregation RPC (Session 33)
- `upsert_competency_rating` + `get_my_competency_ratings` RPCs (Session 32)
- DB-backed competency loading in profil-yetkinlik.js (Session 32)

## Pending Schema (deploy bekliyor)

- `20260327010000_studio_copy_cleanup.sql` — 8 UPDATE, module title/body sentence-case + kopya temizliği
- `20260327020000_streak_foundation.sql` — `candidate_streaks` tablo + `update_candidate_streak` + `get_my_streak_status` RPCs
