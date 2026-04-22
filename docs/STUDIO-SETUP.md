# HelloTalent Studio v3 — Setup Guide

> Studio v3 implementation 22 Nisan 2026'da yapıldı. Bu dosya **runtime aktivasyon** adımlarını içerir. 16 agent + hooks + scripts kodda, bu dosyadaki komutlar Claude Code runtime'da plugin + env'leri aktive eder.

## 1. Agent Teams Experimental Enable

Agent Teams `settings.json`'da env olarak tanımlı. Runtime'da shell'de de set olmalı:

```bash
# ~/.zshrc veya ~/.bashrc'ye ekle
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Yeni session aç, check:
```bash
env | grep AGENT_TEAMS
```

## 2. Plugin Installation (Tuna Runtime'da Çalıştır)

### self-improving-agent (Alireza Rezvani)

```
/plugin marketplace add alirezarezvani/claude-skills
/plugin install self-improving-agent@claude-code-skills
```

Test:
```
/si:status
```

Beklenti: MEMORY.md health dashboard görünür.

### AccessLint (darkmode-auditor için)

```
/plugin marketplace add accesslint/claude-marketplace
/plugin install accesslint@claude-marketplace
```

Test: darkmode-auditor agent invoke et, AccessLint MCP tool'larını görmeli.

### Matthew Stephens Contrast Checker

Blog post: https://matthewlarn.medium.com/i-built-33-claude-skills-to-fix-the-vibe-design-accessibility-gap-a0f7f3ff1d1c

Repo URL henüz net değil — Tuna blog post'tan GitHub linkini bulup install eder. Arama ipucu:
```bash
gh search repos "matthewlarn claude skills contrast"
```

Bulunca:
```
/plugin marketplace add matthewlarn/<repo>
/plugin install contrast-checker@<marketplace>
```

### Playwright Skills (uat-tester için — ÖNEMLİ)

**lackeyjb/playwright-skill — önerilen ana skill:**
```
/plugin marketplace add lackeyjb/playwright-skill
/plugin install playwright-skill@playwright-skill
```

Test:
```bash
# HelloTalent dizininde
claude
# Session içinde:
# Task(uat-tester, "giris.html aday login flow mobile test")
# Skill otomatik yüklenir, kod yazar + çalıştırır + screenshot döner
```

**qaskills — Page Object Model zorunlu hale getirir:**
```bash
# HelloTalent dizininde
cd ~/Downloads/Hellotalent
npx @qaskills/cli add playwright-e2e

# Opsiyonel: E2E + API + Visual + A11y hepsi
npx @qaskills/cli add complete-playwright-suite
```

**yusuftayman/playwright-cli-agents (Türk geliştirici):**
```
/plugin marketplace add yusuftayman/playwright-cli-agents
/plugin install playwright-cli-agents@<marketplace>
```

**agentmantis/test-skills (multi-tool compatible):**
```
/plugin marketplace add agentmantis/test-skills
/plugin install test-skills@<marketplace>
```

### Kurulum Sırası (Önerilen)

1. **Önce** lackeyjb/playwright-skill (base layer, model-invoked)
2. **Sonra** qaskills playwright-e2e (POM zorunluluğu)
3. **İsteğe bağlı** complete-playwright-suite (visual + api + a11y eklerse)
4. **Deneyerek** yusuftayman veya agentmantis

### GitHub MCP (Code-reviewer + infra-ops için)

HelloTalent GitHub'da, GitLab değil. GitHub MCP kurulum:

```
/plugin install github-mcp@claude-plugins-official
```

veya:
```
claude mcp add github stdio npx @modelcontextprotocol/server-github
```

## 3. Archive Old External API Scripts (DONE)

Scripts `scripts/archive-20260422/`'a taşındı. 2 hafta sonra silinir. Rollback:
```bash
mv ~/Downloads/Hellotalent/scripts/archive-20260422/*.sh ~/Downloads/Hellotalent/scripts/
```

## 4. Hooks Installed (DONE)

- `.claude/hooks/detect-image.sh` — image upload → compactor-agent hint
- `.claude/hooks/tier-detect.sh` — git commit tier detect
- `.claude/hooks/track-file-change.sh` — file change log
- `.claude/hooks/context-budget-check.sh` — every 25 tool uses snapshot hint
- `.git/hooks/pre-commit` — T3/T4 Codex gate

Test:
```bash
# Tier detect test
cd ~/Downloads/Hellotalent
echo "" >> supabase/migrations/test.sql
git add supabase/migrations/test.sql
git commit -m "test: tier detect"
# Should block if T3 detected
git reset HEAD --quiet; rm supabase/migrations/test.sql
```

## 5. Codex Integration (PLACEHOLDER)

`scripts/codex-review.sh` şu an placeholder — actual Codex çağrısı için setup:

**Option A — Codex CLI (önerilen):**
```bash
npm install -g @openai/codex-cli
export OPENAI_API_KEY=sk-...
# codex-review.sh içinde: codex review --files "$FILES" --output "$OUTPUT"
```

**Option B — codex-rescue plugin:**
```
/plugin install codex-rescue@claude-plugins-official
```
Sonra `codex-review.sh` içinde subagent invoke.

**Option C — direct API:**
OpenAI API key ile curl çağrısı (`scripts/codex-review.sh` düzenle).

## 6. First Test Run

```bash
cd ~/Downloads/Hellotalent
claude
```

Session açılınca:
```
/cook hellotalent
```

Beklenti:
1. briefer agent dispatch olur
2. Current state özet çıkar
3. Pending approvals check
4. Team health (16 agent aktif)
5. "Hazır. Ne yapıyoruz?" sorusu

## 7. Dogfood Sırası (Hafta 2 Başlar)

Her gerçek task için `docs/dogfood-template.md` doldur → `.claude/agent-memory/dogfood-reports/`'a kaydet.

Minimum 8 task:
1. T2 UI değişikliği
2. T2 UX flow
3. T2 Dark mode fix
4. T3 Security fix (auditor + Codex)
5. T3 Migration (supabase-agent + auditor + Codex)
6. T3 Deploy (infra-ops + uat-tester + maintenance-agent)
7. T4 Architecture refactor (architect + code-reviewer + Codex)
8. Content copy (content-writer + ui-agent)

## 8. Weekly Health Check

Her Pazar:
```bash
bash ~/Downloads/Hellotalent/scripts/review-learned-rules.sh
```

Çıktı: `.claude/agent-memory/weekly-rules-review-YYYYMMDD.md`

## 9. Session End Routine

Her session sonu:
```bash
bash ~/Downloads/Hellotalent/scripts/backup-teams-transcripts.sh
```

Teams peer chat transcripts backup → `.claude/agent-memory/teams-backups/`

## 10. Rollback Emergency

Agent Teams stall veya Studio başarısız olursa:
```bash
# 1. Agent Teams kapat
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=0

# 2. Eski scripts'leri geri getir
mv ~/Downloads/Hellotalent/scripts/archive-20260422/*.sh ~/Downloads/Hellotalent/scripts/

# 3. Eski CLAUDE.md restore
cp ~/Downloads/Hellotalent/docs/archive/CLAUDE-pre-studio-20260422.md ~/Downloads/Hellotalent/CLAUDE.md

# 4. Detay
cat ~/Downloads/Hellotalent/docs/EMERGENCY.md
```

## Durum Özeti (22 Nisan 2026)

- [x] 16 agent .md yazıldı (`.claude/agents/`)
- [x] `/cook hellotalent` slash command
- [x] `.claude/settings.json` env + hooks
- [x] `.claude/.mcp.json` temizlendi (atıl 3 MCP backup)
- [x] 4 runtime hook script
- [x] `.git/hooks/pre-commit` tier + Codex gate
- [x] Archive old external API scripts
- [x] `docs/AGENTS.md` + `docs/EMERGENCY.md` + `docs/dogfood-template.md`
- [x] `.claude/agent-memory/` skeleton (pending-approvals, pending-rules, CHANGELOG)
- [x] `CLAUDE.md` rewrite (tier matrix + 16 agent)
- [x] `scripts/codex-review.sh` skeleton
- [x] `scripts/cf-purge.sh` (Cloudflare cache)
- [x] `scripts/backup-teams-transcripts.sh`
- [x] `scripts/review-learned-rules.sh`
- [ ] **Plugin install runtime** — Tuna manuel (yukarı bak)
- [ ] **Codex actual integration** — placeholder, API key setup lazım
- [ ] **Home session CLAUDE.md rewrite** (socials arşive, HelloTalent default)
- [ ] **First dogfood run** — Hafta 1 sonu
- [ ] **Weekly scan cron** — launchd kurulum (`setup-launchd.sh` veya manuel)

## Kalan Adımlar

1. **Tuna**: Runtime plugin install (yukarıdaki Section 2)
2. **Tuna**: Codex API key setup (Section 5)
3. **Claude (next session)**: Home session CLAUDE.md rewrite
4. **Claude + Tuna**: First dogfood (Hafta 1 sonu)
