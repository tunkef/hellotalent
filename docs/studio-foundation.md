# Stüdyo — Technical Foundation Document

> Aday tarafındaki en derin değer alanı. Kariyer gelişimi, yetkinlik eğitimi, uzman içerikleri ve platform bilgisi.
> Son güncelleme: 31 Mart 2026 (Aşama 8 — practice recovery + STAR cleanup + S01-S06 redesign sync)

## Bilgi Mimarisi (Information Architecture)

```
Stüdyo (panel key: mulakat, loader: _htLoadStudio)
├── Yetenek (Learning Portal — mülakat hazırlık)
│   ├── Inline rol seçici (lobby hero'da) — pendingComp desteği (FAZ 4C)
│   ├── Yetenek Home (lobby) — bento grid öğrenme planı, ilerleme, kanıt
│   │   ├── Kişiselleştirilmiş karşılama: "Hoş geldin, [İsim]" (FAZ 4A)
│   │   ├── Öneri satırı: growing yetkinlik odaklı (FAZ 4A)
│   │   ├── Progress bar (6px, milestone işaretleri, micro-copy) (FAZ 2.3)
│   │   ├── Streak widget + freeze/recovery (FAZ 2B + 2C)
│   │   ├── Bugünkü Pratik kartı (review-needing → growing → incomplete öncelik) (FAZ 2B + 2D)
│   │   ├── Haftalık aktivite kartı (FAZ 2.3)
│   │   ├── Devam Et / Önerilen Başlangıç
│   │   ├── Hazırlık Özeti (tamamlanan/kalan/pratik)
│   │   ├── AI Koçluk teaser (badge: Active)
│   │   ├── Erişilebilir yetkinlik kartları (self-rating + kanıt + review pill) (FAZ 2D)
│   │   └── Kilitli yetkinlikler (tek özet blok + Premium CTA)
│   ├── Kurs Detay (course_detail) — compact hero + 3 sekmeli: Sorular / Seanslar / Notlarım
│   ├── Pratik Odak Modu (practice) — focus mode: top bar + soru kartı + inline "Cevabını Hazırla" + AI değerlendirme + alt aksiyon bar + drawer (İpucu/Sinyaller/Koç Notları)
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

## Mevcut Teknik Durum (Aşama 8 sonrası, 31 Mart 2026)

| Bileşen | Dosya | Durum |
|---------|-------|-------|
| Studio lobby | profil-studio.js:renderLobby | ✅ Bento grid öğrenme planı, inline rol seçimi, badge strip |
| Yetenek Learning Portal | profil-studio.js (5-screen flow: lobby/course_detail/practice/completion/session_complete) | ✅ Focus mode redesign |
| Yetkinlik verisi | profil-yetkinlik.js (DB-backed + hardcoded fallback) | ✅ 29 yetkinlik, DB-first, doğallaştırılmış kopya |
| Koç akışı | profil-studio.js (hydrateCoachFeed) | ✅ coach_posts DB |
| Performans | profil-studio.js (hydrateStudioSection) | ✅ DB-backed — 4 seed modül, sentence-case title |
| HT Bilgiler | profil-studio.js (hydrateStudioSection) | ✅ DB-backed — 4 seed modül, sentence-case title |
| Admin modül yönetimi | admin-studio-modules.js | ✅ CRUD: list/create/edit/publish/archive |
| İlerleme takibi | candidate_studio_progress | ✅ DB-backed — mark_viewed/complete RPCs |
| Rozet sistemi | badge_definitions + candidate_badges | ✅ 6 rozet, DB-driven issuance |
| Journal kalıcılığı | candidate_studio_journals | ✅ DB-backed — "Cevabını Hazırla" inline panel olarak practice ekranında |
| Yetenek pratik kaydı | candidate_yetenek_progress | ✅ DB-backed — competency completion |
| Self-rating | candidate_competencies | ✅ RPCs mevcut — lobby kartlarında toggle |
| Kanıt yüzeyi | get_my_yetenek_overview RPC | ✅ Lobby'de evidence hydration |
| AI feedback altyapısı | candidate_journal_feedback + Edge Function + pg_cron | ✅ Canlı — gpt-4.1-mini, CORS fix, pg_cron reliable trigger (every min), 75s poll timeout. E2E PASS 29 Mart 2026 |
| AI feedback aday yüzeyi (Phase 5B → Aşama 8) | Practice ekranında inline "Cevabını Hazırla" panel + AI buton | ✅ Canlı — inline collapsible panel, AI değerlendirme discoverable. Premium gate çalışıyor. 31 Mart 2026 |
| Premium entitlement | candidate_premium_purchases + activate RPC + webhook | ✅ Demo flow deployed |
| Streak sistemi | candidate_streaks + 2 RPC (enhanced) | ✅ Canlı — foundation + FAZ 2C freeze/recovery deployed (29 Mart 2026) |
| Kişiselleştirme | profil-studio.js (lobby) | ✅ Karşılama + öneri + sıralama (canlı) |
| Review recommendation | profil-studio.js (FAZ 2D) | ✅ needsReview + review-aware daily/recommendation/sort + "Tazelemeyi düşün" pill (canlı, 29 Mart 2026) |
| Completion cross-link | profil-studio.js (FAZ 4B) | ✅ COMP_TO_COACH_CATEGORY + COMP_TO_MODULE_SLUG (canlı) |
| Detail → practice bridge | profil-studio.js (FAZ 4C) | ✅ MODULE_SLUG_TO_COMP + COACH_CAT_TO_COMP + pendingComp (canlı) |
| Progress görselleştirme | profil-studio.js (FAZ 2.3) | ✅ 6px bar, milestones, weekly summary, completion badge (canlı) |
| İçerik doğallaştırma | profil-yetkinlik.js + STAR_CONTENT | ✅ 29 yetkinlik + UI kopya (canlı) |

## Runtime Kontratları (Değiştirme!)

- Panel key: `mulakat` (profil.html, switchPanel, hash routing)
- Loader: `window._htLoadStudio()` (profil-studio.js)
- Data bridge: `window._htYetkinlikData` (profil-yetkinlik.js → profil-studio.js)
- Genel teaser: `window._htGenelCoachTeaser()` (profil-studio.js → profil-genel.js)
- Coach detail: `window.openCoachDetail()` (global, Genel panel çağırır)
- CSS prefixes: `.ig-` (mevcut), `.st-` (Studio), `.yk-` (Yetenek Home/Track/Unit), `.aif-` (AI feedback)
- Screen states: `lobby` (Yetenek Home), `course_detail` (Kurs Detay), `practice` (Odak Modu), `completion`, `session_complete` — eski `star_intro`/`role_select` lobby'ye yönlendirilir
- Session persistence: `sessionStorage` (flow state), `localStorage` (star_seen, journal drafts — fallback)
- DB persistence: `candidate_studio_journals` (STAR+T drafts), `candidate_yetenek_progress` (pratik kaydı), `candidate_streaks` (streak tracking)
- Cross-link mappings: `COMP_TO_COACH_CATEGORY`, `COMP_TO_MODULE_SLUG` (forward, FAZ 4B), `MODULE_SLUG_TO_COMP`, `COACH_CAT_TO_COMP` (reverse, FAZ 4C)
- `S.pendingComp`: content detail → role_select → otomatik competency_intro yönlendirmesi (FAZ 4C)
- `needsReview(code)`: completed comp review detection — growing / mixed / needs_work / 14d stale (FAZ 2D, `REVIEW_STALE_DAYS = 14`)
- AI feedback pipeline: `request_journal_feedback` RPC → pending row → pg_cron (1min) → Edge Function (`journal-feedback`) → OpenAI → `complete_journal_feedback` RPC → polling → `renderAiFeedback()`. Browser invoke fire-and-forget (may 401, not critical)

## Yetenek Akış Değişiklikleri (Learning Portal Yeniden Yapılandırma)

### Kaldırılan
- ~~Gelişim Günlüğü (journal) textarea UI~~ → Aşama 8 ile "Cevabını Hazırla" inline collapsible panel olarak practice'e geri döndü (31 Mart 2026)
- STAR+T çoklu alan yazma deneyimi — inline panel'de korunuyor (Aşama 8)
- ~~AI değerlendirme butonu — pratik ekranından çıkarıldı~~ → Aşama 8 ile inline panel içinde discoverable (31 Mart 2026)
- `renderStarDetail()` — STAR intro ekranı legacy kodu tamamen silindi (Aşama 8)
- `_bindStarIntroEvents_legacy()`, `hydrateLandingStats()`, `renderRoleSelect()`, `bindRoleSelectEvents()` — tümü silindi (Aşama 8)
- STAR quad CSS (`.ig-star-quad-card`, `.ig-star-cell`, `.ig-star-detail` vb.) — silindi (Aşama 8)
- `.ig-landing-title`, `.ig-landing-subtitle` CSS — silindi (Aşama 8)

### Korunan (backend)
- `candidate_studio_journals` tablosu — DB'de duruyor, veri korunuyor
- `upsert_studio_journal` / `get_my_journals` RPCs — çalışıyor
- `candidate_journal_feedback` tablosu — schema deployed
- `journal-feedback` Edge Function — deployed, ACTIVE (CORS headers, pg_cron reliable trigger)
- `request_journal_feedback` / `complete_journal_feedback` RPCs — çalışıyor
- localStorage journal fallback — hâlâ mevcut

### Yeni (Learning Portal)
- Yetenek Home: compact rol header + progress bar + readiness summary + AI teaser + öğrenme planı + collapsed locked summary
- Track Detail: yetkinlik tanıtımı + güçlü/risk/aşırı kullanım sinyalleri + zayıflıklar bloğu + ünite listesi (soru teması + preview)
- Unit Detail: tek soru odak + güçlü yanıt sinyalleri + yaygın zayıflıklar + takip sorusu + AI placeholder
- Lightweight Summary: kompakt istatistik + sonraki yetkinlik CTA
- Self-rating toggle: Güçlü/Gelişiyor — DB-backed `candidate_competencies`
- Evidence hydration: pratik sayısı, günlük sayısı, AI sinyal — `get_my_yetenek_overview` RPC

## Çözülmüş Blocker'lar (28 Mart 2026)

| Blocker | Çözüm |
|---------|-------|
| ~~OPENAI_API_KEY~~ | ✅ Set edildi, E2E PASS |
| ~~journal-feedback redeploy~~ | ✅ Deployed — gpt-4.1-mini, error sanitization |
| ~~2 pending migration~~ | ✅ 010000 + 020000 deployed via `npm run db:push` |
| ~~Frontend push~~ | ✅ 4 commit pushed to origin/main |
| ~~Model `gpt-5-mini` yok~~ | ✅ `gpt-4.1-mini` ile düzeltildi |
| ~~Error toast key leak~~ | ✅ Edge Function + frontend guard sanitization |
| ~~Browser CORS error~~ | ✅ Edge Function CORS headers + OPTIONS handler (29 Mart 2026) |
| ~~Browser invoke 401~~ | ✅ pg_cron reliable trigger eklendi, browser invoke fire-and-forget (29 Mart 2026) |
| ~~Poll timeout < cron cycle~~ | ✅ 45s → 75s (29 Mart 2026) |

## Mevcut Blocker'lar

| Blocker | Durum | Çözüm |
|---------|-------|-------|
| iyzico API credentials | Yapılandırılmadı | Gerçek iyzico merchant credentials gerekli |
| iyzico checkout redirect | Demo flow (webhook direkt çağrılıyor) | `initiatePurchase()` fonksiyonunda iyzico checkout'a yönlendirme |

## Sonraki Adımlar

**~~Öncelik 1 — Deploy + Smoke~~** ✅ Tamamlandı 28 Mart 2026

**Sonraki Feature Geliştirme (sıra kullanıcı tercihine bağlı):**
1. ~~**Streak FAZ 2C**: freeze/geri kazan mekaniği~~ ✅ Deployed 29 Mart 2026 — `1e84edd`
2. ~~**FAZ 2D**: Spaced repetition review recommendation layer~~ ✅ Deployed 29 Mart 2026 — `fa7c87d`
3. ~~**Studio Phase 5B**: AI feedback progressive disclosure redesign~~ ✅ Deployed 29 Mart 2026 — `afcfedb` + CORS/cron fixes
4. **Gerçek iyzico checkout**: iyzico API credentials → checkout form → callback wiring
5. **Studio Phase 6**: Video içerik altyapısı (embed player, admin upload, ilerleme tracking)
5. **Badge genişletme**: Yetenek pratik badge'leri (evaluate_candidate_badges extension)
6. **İşveren kampanya wizard'ı** (ik.html)

## Deployed Schema (tamamlanan)

- `studio_modules` + `candidate_studio_progress` (Session 25)
- `badge_definitions` + `candidate_badges` + `evaluate_candidate_badges` RPC (Session 27)
- `candidate_studio_journals` + `candidate_yetenek_progress` + journal RPCs (Session 28)
- `candidate_journal_feedback` + feedback RPCs + `journal-feedback` Edge Function (Session 29)
- `candidate_premium_purchases` + entitlement RPCs + `premium-webhook` Edge Function (Session 34)
- `get_my_yetenek_overview` aggregation RPC (Session 33)
- `upsert_competency_rating` + `get_my_competency_ratings` RPCs (Session 32)
- DB-backed competency loading in profil-yetkinlik.js (Session 32)

## Recently Deployed Schema (28 Mart 2026)

- `20260327010000_studio_copy_cleanup.sql` — 8 UPDATE, module title/body sentence-case + kopya temizliği ✅
- `20260327020000_streak_foundation.sql` — `candidate_streaks` tablo + `update_candidate_streak` + `get_my_streak_status` RPCs ✅

## Recently Deployed Schema (29 Mart 2026)

- `20260328010000_streak_freeze_recovery.sql` — `last_broken_streak` column + enhanced `update_candidate_streak` (freeze consume + recovery) + enhanced `get_my_streak_status` (can_freeze + can_recover) ✅

## K030 FAZ B — Studio Freeze Unfreeze Adımlari (2026-04-13)

Studio şu anda `window._HT_STUDIO_FROZEN = true` flag'i ile `shared.js` içinde donduruldu.
`profil.html#mulakat` panelinde `panel-soon.js` "Yakında" grid'i render ediliyor.

Unfreeze için:
1. `shared.js` içindeki `window._HT_STUDIO_FROZEN = true;` satırını `false` yap.
2. `profil-wizard.js:273` breadcrumb otomatik olarak `Stüdyo`'ya dönüyor (label ternary).
3. `profil-genel.js` coach→Studio CTAs (header practiceBtn/seeAll, card practiceBtn) geri render olacak.
4. `profil-studio.js` coach detail overlay'deki 3 bridge CTA tekrar görünecek.
5. `admin.html` Studio Modülleri tab'ı tekrar tıklanabilir olacak. `is-disabled` class'ını + `ht-chip--soon` span'ini el ile kaldır.
6. `profil.html` sidebar'daki `.ht-chip--soon` span'lerini `#nav-mulakat` ve `#nav-yetkinlik` üzerinden kaldır.
7. `coach-studio.html` redirect script'ini (head'deki K030 FAZ B block) kaldır.
8. `tests/faz-b-freeze.spec.js` source-content test'lerini sil veya freeze expectation'larını çevir.
9. FAZ A `profil-studio.js` FROZEN banner'ını + `_htGenelCoachTeaser` stub'ını gözden geçir; gerçek implementasyon geri getirilecekse ayrı bir Unfreeze faz'ı aç.

Not: `profil-genel.js` `openArticleInCoach()` içindeki `switchPanel('mulakat')` çağrısı FAZ B'de kalıcı olarak kaldırıldı — unfreeze'de gerekirse manuel geri ekleme gerekir.
