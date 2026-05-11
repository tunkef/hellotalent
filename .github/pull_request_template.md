# Pull Request

## Özet
<!-- Bu PR ne yapıyor? 2-3 cümle -->

## Tier
<!-- T1 typo / T2 UI / T3 security/migration / T4 architecture -->
- [ ] T1 — solo OK
- [ ] T2 — frontend (spec → onay → impl) → darkmode-auditor → reviewer
- [ ] T3 — supabase-agent + reviewer (audit) + Codex auto-review
- [ ] T4 — chief-of-staff (architect) + reviewer + Codex

## Spec referansı
<!-- T2+ için zorunlu -->
- [ ] `design-spec: docs/specs/<feature>.md` mevcut
- [ ] Tuna onayı (chat'te explicit "ok/yap")
- [ ] `[design-bypass]` marker (gerekçe ekle) — auditable

## Değişiklikler
- [ ] Frontend (HTML/CSS/JS)
- [ ] Backend (Supabase migration / Edge Function)
- [ ] Test (Playwright)
- [ ] Doc (CURRENT-STATE / SELF-AUDIT / specs)
- [ ] Hook / script

## Test
- [ ] `npm test` (Playwright) pass
- [ ] `bash tests/hooks/run-all.sh` (hook smoke) pass
- [ ] `bash scripts/preflight-self-audit.sh` (61-check) pass
- [ ] Görsel verify (UI değişikliği varsa): `UI_VERIFIED=1` commit
- [ ] Dark mode toggle test
- [ ] Mobile (390×844) + Desktop (1440×900) test
- [ ] Codex review marker (T3/T4): `codex-reviewed: <agreement %>`

## Güvenlik (T3+)
- [ ] RLS policy ekledim/değiştirdim
- [ ] PII flow değişti (KVKK md.4/7/11)
- [ ] Auth flow değişti
- [ ] service_role kullanımı (sadece edge function)
- [ ] Migration BEGIN/COMMIT atomic
- [ ] Rollback documented

## A11y (UI değişikliği varsa)
- [ ] WCAG 2.1 AA contrast (AccessLint MCP)
- [ ] Keyboard nav (Tab order)
- [ ] aria-label / aria-labelledby
- [ ] Focus management (modal/drawer)

## KVKK / Compliance (PII flow değiştiyse)
- [ ] Aydınlatma metni (`yasal.html`) güncel
- [ ] Retention policy migration
- [ ] Right of access / erasure path

## Deploy / Rollback
- [ ] Production-safe (test seed kullanmadı, ALLOW_SEED_PRODUCTION yok)
- [ ] Cache-bust otomatik (`scripts/cachebust-staged.sh` pre-commit)
- [ ] Rollback plan: `git revert <sha>` + push (Tuna onay)

## Bağlantılar
- Spec: <!-- docs/specs/X.md -->
- Codex review: <!-- .claude/agent-memory/codex-reviews/<sha>.md -->
- Related issue: <!-- #N -->
