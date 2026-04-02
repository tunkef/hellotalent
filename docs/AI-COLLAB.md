# HelloTalent AI-COLLAB — Aktif Calisma Defteri

> Bu dosya yalnizca aktif is, son kararlar, acik riskler ve bir sonraki net adimi tasir.
> Kapanmis asamalar: `docs/ai-collab/AI-COLLAB-archive-asama1-61.md`
> Dosya buyudugunde (500+ satir) yeni arsiv dosyasina tasinir.

## Mevcut Durum

**Son tamamlanan:** Asama 63 (2 Nisan 2026 gece) — Landing Page Redesign + Dark Mode + Nav Polish
**Son commit:** ba9e452 — P3 regression test fix (stale AI-COLLAB assertion)
**Test durumu:** 365/365 P3 regression + 32/32 smoke = 397 test PASS
**Beta Launch Paketi:** TAMAMLANDI (Asama 48-61)
**Landing Page Redesign:** TAMAMLANDI (Asama 63)

## Tamamlanan Bloklar (2 Nisan 2026)

| Blok | Asamalar | Durum |
|------|----------|-------|
| Tekrar eden hata guard'lari | 48-49 | ✅ ESLint, truth-sync, RLS, migration template |
| Beta Premium Gate | 50-52 | ✅ AI 1-use, badge, One Cikar aktif |
| CV ATS Optimizasyonu | 53 | ✅ 6 global standart uygulandı |
| Marka Gorselleri + Redesign | 54-56 | ✅ 31 gorsel, informative card v2 |
| Teklifler Beta Vurgusu | 57 | ✅ Premium badge + beta notu |
| Egitim Dashboard | 58-59 | ✅ Rozet tooltip, ilerleme karti |
| HT Info Revizyon | 60-61 | ✅ Center feed + left rail compact |
| Landing Page Redesign | 63 | ✅ Gate + dual LP (aday/isveren), LinkedIn-style, dark mode, nav brand colors, 397 test PASS |

## Pipeline Infra (2 Nisan 2026)

- Codex plugin: ✅ kurulu (codex review, codex exec)
- Supabase MCP: ✅ OAuth bagli
- Telegram bot: ✅ aktif (daily ritual, devam/onay flow)
- Autopilot: ❌ kaldirildi (Codex plugin yerini aldi)
- DeepSeek review: ✅ 3x retry, deepseek-chat model
- Cerebras review: ✅ STEP_RESULTS tracking
- 66 BATS infra test: ✅ PASS

## Acik Riskler / Blocker

1. Telegram bot race condition — duplicate "devam" mesajlari plan_mark_done'i 2-3x cagiriyor (debounce eklendi ama tam cozmedi)
2. Playwright smoke flaky — Cloudflare Access arkasinda, local server ile test ediliyor
3. iyzico entegrasyonu — DEFER (beta 3 ay boyunca ucretsiz)

## Bir Sonraki Adim

Landing page redesign + dark mode + nav polish tamamlandi, production'da canli. Sonraki adimlar:
- **profil.html landing entegrasyonu** — logged-in kullanici gate'i bypass etmeli; direct profil.html routing dogrulama
- **Delinked sayfalar karari** — kariyer/pozisyonlar/yetkinlik/blog/hakkimizda/isalim-rotasi nav'dan kaldirildi; kalici silme vs yenileme karari bekleniyor
- **Lead form backend** — isveren.html lead formu simdilik client-side; Supabase'e kayit akisi eklenebilir
- **Pozisyon gorunum/esleme metrikleri** — backend counter/trigger gerekli
- **iyzico/Stripe checkout** — DEFER (beta 3 ay ucretsiz)
- Profil senaryo testleri (product readiness)
- Pozisyon gorunum/esleme metrikleri
- iyzico entegrasyonu (her zaman en son)
