# Dogfood Rapor Template — Studio v3

Her gerçek task Studio'da çalıştırıldığında bu template doldurulur. Hafta 2 karşılaştırma için.

---

# Dogfood #{N} — {İş Özet}

**Tarih:** {YYYY-MM-DD HH:MM}
**Tier:** {T1|T2|T3|T4}
**Scope:** {dosya/feature/flow}

## Ajan Zinciri (Kullanılan)

- {chief-of-staff → agent1 → agent2 → ...}

Teams chat mi, Task dispatch mi: {Teams / Task}

## Metrikler

| Metrik | Değer |
|--------|-------|
| Toplam wall-clock (dakika) | {X} |
| Toplam token (tüm agent'lar) | {Y} |
| Agent invoke sayısı | {Z} |
| Codex invoke sayısı | 0 veya 1 |
| Native-Codex agreement | N% |
| Tuna intervention sayısı | {M} |

## Bulgular (Severity by Agent)

| Agent | BLOCKER | HIGH | MEDIUM | LOW |
|-------|---------|------|--------|-----|
| auditor | 0 | 0 | 1 | 0 |
| code-reviewer | 0 | 1 | 2 | 3 |
| darkmode-auditor | 0 | 0 | 0 | 0 |
| Codex | 0 | 1 | 2 | 0 |
| **Total** | 0 | 2 | 5 | 3 |

## Shell Script Baseline Karşılaştırma (varsa)

| Metrik | Native Studio | Shell Script (pre-v3) | Fark |
|--------|--------------|----------------------|------|
| Wall-clock | {X} dk | {Y} dk | {+/-%Z} |
| Token | {A} | {B} | {+/-%C} |
| Bulgu hit | {D} | {E} | {+/-F} |
| False positive | {G} | {H} | {+/-I} |

## Peer Chat Kalitesi

- Stall yaşandı mı? {evet/hayır}
- Agent çelişki var mı? {evet/hayır — detay}
- Self-improve rule önerildi mi? {evet/hayır — konu}

## Tuna Deneyimi

- Onay beklemesi gereken nokta: {N adet}
- Batch mi tek tek mi: {batch / tek tek}
- Rahatsız olduğu moment: {varsa, metin}

## Lessons Learned (→ pending-rules.md?)

- {pattern, kural adayı}

## Verdict

- [ ] Başarılı — production-grade
- [ ] Kısmi — iyileştirme gerek (detay altta)
- [ ] Fail — rollback gerek

**İyileştirme notu:** {varsa}

## İlişkili Dosyalar

- `.claude/agent-memory/handoff-{scope}-{ts}.json`
- `.claude/agent-memory/audit-{scope}-{ts}.json`
- `.claude/agent-memory/review-{scope}-{ts}.json`
- `.claude/agent-memory/codex-reviews/codex-{ts}.json`
- `.claude/agent-memory/uat-{ts}.json`
