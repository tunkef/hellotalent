# docs/retrospectives/ — Otomatik retrospektif entries

> **Reform 11 May 2026 — KPI: v2+ revize commit ≤ 5/ay.**

## Otomatik tetik

`scripts/check-v2-retrospective.sh` post-commit hook commit message'da şu regex match bulursa entry ekler:
- `\bv[2-9]\b` (v2, v3, ..., v9)
- `round-?[2-9]`
- `redesign`
- `revize`
- `tekrar`
- `geri al`

## Dosya pattern

`docs/retrospectives/YYYY-MM-DD.md` — günlük toplu entry.

## Her entry analizi

1. Designer spec dosyası önceden vardı mı?
2. Visual mockup üretildi mi?
3. Tuna onayı vardı mı?
4. Data contract grep yapıldı mı?
5. darkmode-auditor dispatch edildi mi?
6. reviewer dispatch edildi mi?

## Haftalık review

chief-of-staff her Pazar bu klasörü tarar — 3+ kez tekrar eden root cause `.claude/agent-memory/pending-rules.md`'ye eklenir.

## KPI hedefi

| Metrik | Reform öncesi | Hedef |
|---|---|---|
| v2+ commit/ay | 34 | ≤ 5 |
| Aynı surface 5+ versiyon | hr-pipeline kart v5 | YASAK |
