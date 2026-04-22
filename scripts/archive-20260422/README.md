# Archived Scripts — 22 Nisan 2026

Studio v3 migration sırasında arşive alınan dış API orchestration scriptleri.

## Neden Arşivlendi

Bu scriptler Studio v3'te **native Claude subagent'larıyla değiştirildi**:

| Arşivlenen | Yerine Geçen |
|-----------|--------------|
| `deepseek-review.sh` | `auditor` + `code-reviewer` agent'ları (+ T3/T4'te Codex) |
| `grok-context.sh` | `briefer` agent |
| `orchestrator.sh` | `chief-of-staff` agent (Teams lead) |
| `sambanova-review.sh` | `auditor` (deep mode) |
| `cerebras-review.sh` | `architect` agent |
| `openrouter-fallback.sh` | — |
| `groq-helper.sh` | — |
| `test-ai-apis.mjs` | — |
| `courier-notify.sh` | (ntfy.sh Tuna istemedi) |

## Rollback

Eğer Studio v3 başarısız olur ve bu scriptlere geri dönmek gerekirse:

```bash
mv ~/Downloads/Hellotalent/scripts/archive-20260422/*.sh ~/Downloads/Hellotalent/scripts/
```

**Not:** Rollback önce `docs/EMERGENCY.md` Agent Teams Stall section'ını oku.

## Silinme Zamanı

Arşiv 2 hafta tutulacak (baseline karşılaştırma için). **2026-05-06** sonrası silinebilir (Hafta 3 dogfood karşılaştırması yeşilse).
