# Stüdyo — Technical Foundation Document

> Aday tarafındaki en derin değer alanı. Kariyer gelişimi, yetkinlik eğitimi, uzman içerikleri ve platform bilgisi.
> Son güncelleme: 28 Mart 2026 (Session 42 — FAZ 0-4C deployed + AI E2E live + FAZ 2C freeze/recovery hazır)

## Bilgi Mimarisi (Information Architecture)

```
Stüdyo (panel key: mulakat, loader: _htLoadMulakat)
├── Yetenek (Learning Portal — mülakat hazırlık)
│   ├── Compact rol seçici (role_select) — pendingComp desteği (FAZ 4C)
│   ├── Yetenek Home (lobby) — öğrenme planı, ilerleme, kanıt
│   │   ├── Kişiselleştirilmiş karşılama: "Hoş geldin, [İsim]" (FAZ 4A)
│   │   ├── Öneri satırı: growing yetkinlik odaklı (FAZ 4A)
│   │   ├── Progress bar (6px, milestone işaretleri, micro-copy) (FAZ 2.3)
│   │   ├── Streak widget + freeze/recovery (FAZ 2B + 2C)
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
| AI feedback altyapısı | candidate_journal_feedback + Edge Function | ✅ Canlı — gpt-4.1-mini, self-reflection, error sanitization. E2E PASS 28 Mart 2026 |
| AI feedback aday yüzeyi | Practice ekranında journal panel + AI buton | ✅ Canlı — "AI ile Değerlendir" → 6 bölüm feedback kartı. Premium gate çalışıyor |
| Premium entitlement | candidate_premium_purchases + activate RPC + webhook | ✅ Demo flow deployed |
| Streak sistemi | candidate_streaks + 2 RPC (enhanced) | ✅ Canlı — foundation deployed. FAZ 2C: freeze/recovery migration + UI hazır, deploy bekliyor |
| Kişiselleştirme | profil-mulakatkocu.js (lobby) | ✅ Karşılama + öneri + sıralama (canlı) |
| Completion cross-link | profil-mulakatkocu.js (FAZ 4B) | ✅ COMP_TO_COACH_CATEGORY + COMP_TO_MODULE_SLUG (canlı) |
| Detail → practice bridge | profil-mulakatkocu.js (FAZ 4C) | ✅ MODULE_SLUG_TO_COMP + COACH_CAT_TO_COMP + pendingComp (canlı) |
| Progress görselleştirme | profil-mulakatkocu.js (FAZ 2.3) | ✅ 6px bar, milestones, weekly summary, completion badge (canlı) |
| İçerik doğallaştırma | profil-yetkinlik.js + STAR_CONTENT | ✅ 29 yetkinlik + UI kopya (canlı) |

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

## Çözülmüş Blocker'lar (28 Mart 2026)

| Blocker | Çözüm |
|---------|-------|
| ~~OPENAI_API_KEY~~ | ✅ Set edildi, E2E PASS |
| ~~journal-feedback redeploy~~ | ✅ Deployed — gpt-4.1-mini, error sanitization |
| ~~2 pending migration~~ | ✅ 010000 + 020000 deployed via `npm run db:push` |
| ~~Frontend push~~ | ✅ 4 commit pushed to origin/main |
| ~~Model `gpt-5-mini` yok~~ | ✅ `gpt-4.1-mini` ile düzeltildi |
| ~~Error toast key leak~~ | ✅ Edge Function + frontend guard sanitization |

## Mevcut Blocker'lar

| Blocker | Durum | Çözüm |
|---------|-------|-------|
| iyzico API credentials | Yapılandırılmadı | Gerçek iyzico merchant credentials gerekli |
| iyzico checkout redirect | Demo flow (webhook direkt çağrılıyor) | `initiatePurchase()` fonksiyonunda iyzico checkout'a yönlendirme |

## Sonraki Adımlar

**~~Öncelik 1 — Deploy + Smoke~~** ✅ Tamamlandı 28 Mart 2026

**Sonraki Feature Geliştirme (sıra kullanıcı tercihine bağlı):**
1. ~~**Streak FAZ 2C**: freeze/geri kazan mekaniği~~ ✅ Tamamlandı — deploy bekliyor
2. **Gerçek iyzico checkout**: iyzico API credentials → checkout form → callback wiring
3. **Studio Phase 5B**: Yeni AI aday yüzeyi tasarımı (journal yerine unit-integrated yaklaşım)
4. **Studio Phase 6**: Video içerik altyapısı (embed player, admin upload, ilerleme tracking)
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

## Pending Schema (deploy bekliyor)

- `20260328010000_streak_freeze_recovery.sql` — `last_broken_streak` column + enhanced `update_candidate_streak` (freeze consume + recovery) + enhanced `get_my_streak_status` (can_freeze + can_recover)
