---
name: Güvenlik raporu (private)
about: Güvenlik açığı, KVKK ihlali, secret leak — KAMU OLMAYAN
title: '[SECURITY] '
labels: security
assignees: tunkef
---

## ⚠ ÖNEMLİ

Eğer bu bir kritik açık ise (token leak, RLS bypass, auth flaw, KVKK ihlal), **lütfen önce GitHub Issue açmak yerine** Tuna'ya doğrudan iletin: **kefelituna@gmail.com**

GitHub Issue açıyorsanız repo private kalmalı veya açık değilse hassas detayları paste etmeyin.

## Açık tipi
- [ ] Token / secret leak (settings.local.json, git history, log)
- [ ] RLS bypass (Supabase)
- [ ] Auth flaw (cross-role, session hijack)
- [ ] SQL injection (SECURITY DEFINER, search_path)
- [ ] XSS / CSRF
- [ ] KVKK ihlali (PII flow)
- [ ] Storage bucket leak (cvs)
- [ ] Cloudflare Access bypass
- [ ] Diğer

## Severity
- [ ] CRITICAL (production compromise mümkün)
- [ ] HIGH (kötü niyetli erişim mümkün)
- [ ] MEDIUM (defense-in-depth gap)
- [ ] LOW (best practice)

## Tekrar üretilebilir mi?
<!-- Repro steps — KAMUOYA AÇIK paylaşma -->

## Önerilen fix
<!-- Migration, hook, policy değişikliği -->

## Bekleyen aksiyon
- [ ] Token rotate
- [ ] Migration (T3)
- [ ] Edge function fix
- [ ] Frontend fix
- [ ] Doc (yasal.html / KVKK aydınlatma metni)

## Auditable trace
- Detect timestamp:
- Audit log entry (varsa): `.claude/agent-memory/pending-approvals.md` → A_AUTO_...
