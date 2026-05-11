#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# preflight-self-audit.sh — SessionStart hook
# Reform 11 May 2026
#
# Her session başında otomatik:
#   • Hook scriptleri ve settings entries doğru mu?
#   • Plugin marketplace'te gerçekten var mı?
#   • Worktree ↔ ana repo agent stack sync mi?
#   • pending-rules.md erişilebilir mi?
#   • Agent .md'lerde Learned Rules section var mı?
#
# Output: pass/fail rapor stdout (Claude görür, additionalContext)
# Hata varsa Claude session başında uyarılır.
# ════════════════════════════════════════════════════════════════════

set -e

INPUT=$(cat 2>/dev/null || echo '{}')
cwd=$(echo "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
PROJECT_ROOT="${cwd:-$HOME/Downloads/Hellotalent}"

# Worktree fallback — eğer cwd worktree'yse ana repo bul
ROOT_REPO="$HOME/Downloads/Hellotalent"

CHECKS_PASS=0
CHECKS_FAIL=0
ISSUES=()

check() {
  local desc="$1"
  local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    CHECKS_PASS=$((CHECKS_PASS + 1))
  else
    CHECKS_FAIL=$((CHECKS_FAIL + 1))
    ISSUES+=("$desc")
  fi
}

# 1. Hook scriptleri executable mi?
for h in detect-negative-feedback detect-remember-intent session-end-si-review agent-learned-rules-helper dispatch-chief-of-staff; do
  check "hook $h.sh executable" "[ -x '$ROOT_REPO/.claude/hooks/$h.sh' ]"
done

# 2. Settings.json hook entries var mı?
SETTINGS="$ROOT_REPO/.claude/settings.json"
check "settings.json mevcut" "[ -f '$SETTINGS' ]"
check "SessionEnd hook entry" "grep -q 'session-end-si-review' '$SETTINGS'"
check "detect-negative-feedback entry" "grep -q 'detect-negative-feedback' '$SETTINGS'"
check "detect-remember-intent entry" "grep -q 'detect-remember-intent' '$SETTINGS'"
check "dispatch-chief-of-staff entry" "grep -q 'dispatch-chief-of-staff' '$SETTINGS'"
check "agent-learned-rules-helper entry" "grep -q 'agent-learned-rules-helper' '$SETTINGS'"

# 3. Self-improving-agent plugin marketplace'te var mı?
check "self-improving-agent plugin yüklü" "[ -d '$HOME/.claude/plugins/marketplaces/claude-code-skills/engineering-team/self-improving-agent' ]"

# 4. AccessLint plugin settings'te referans varsa marketplace'te de olmalı
if grep -q "accesslint" "$SETTINGS" 2>/dev/null; then
  check "AccessLint plugin marketplace'te" "ls $HOME/.claude/plugins/marketplaces/*/accesslint* 2>/dev/null | grep -q ."
fi

# 5. Agent stack 11 mi?
agent_count=$(ls $ROOT_REPO/.claude/agents/*.md 2>/dev/null | grep -v CHANGELOG | grep -v _archive | wc -l | tr -d ' ')
check "11 agent aktif (mevcut: $agent_count)" "[ '$agent_count' = '11' ]"

# 6. Reform 3 yeni agent var mı?
for a in reviewer frontend writer; do
  check "agent $a.md mevcut" "[ -f '$ROOT_REPO/.claude/agents/$a.md' ]"
done

# 7. Tüm agent'larda Learned Rules section var mı?
missing_lr=0
for f in $ROOT_REPO/.claude/agents/*.md; do
  if [ -f "$f" ] && ! basename "$f" | grep -qE '^CHANGELOG'; then
    if ! grep -q '^## Learned Rules' "$f" 2>/dev/null; then
      missing_lr=$((missing_lr + 1))
    fi
  fi
done
check "agent.md Learned Rules section ($missing_lr eksik)" "[ '$missing_lr' = '0' ]"

# 8. pending-rules.md erişilebilir
check "pending-rules.md erişilebilir" "[ -f '$ROOT_REPO/.claude/agent-memory/pending-rules.md' ]"

# 9. Pre-commit chain hooks
check "scripts/tier-detect.sh executable" "[ -x '$ROOT_REPO/scripts/tier-detect.sh' ]"
check "scripts/cachebust-staged.sh executable" "[ -x '$ROOT_REPO/scripts/cachebust-staged.sh' ]"
check ".husky/pre-commit tier-detect referans" "grep -q tier-detect $ROOT_REPO/.husky/pre-commit 2>/dev/null"
check ".husky/pre-commit cachebust referans" "grep -q cachebust-staged $ROOT_REPO/.husky/pre-commit 2>/dev/null"
check ".husky/post-commit v2-retrospective" "grep -q check-v2-retrospective $ROOT_REPO/.husky/post-commit 2>/dev/null"

# 10. Rules learned consolidated
check "rules/learned/consolidated-2026-05.md" "[ -f '$ROOT_REPO/.claude/rules/learned/consolidated-2026-05.md' ]"

# 11. Docs reform setup
check "docs/UI-DOD-template.md" "[ -f '$ROOT_REPO/docs/UI-DOD-template.md' ]"
check "docs/RPC-CONTRACT.md" "[ -f '$ROOT_REPO/docs/RPC-CONTRACT.md' ]"
check "docs/specs/ klasör" "[ -d '$ROOT_REPO/docs/specs' ]"
check "docs/retrospectives/ klasör" "[ -d '$ROOT_REPO/docs/retrospectives' ]"

# 12. Worktree → ana repo sync
WORKTREE_DIR=$(find $ROOT_REPO/.claude/worktrees -maxdepth 1 -type d 2>/dev/null | grep -v '^.claude/worktrees$' | head -1)
if [ -n "$WORKTREE_DIR" ]; then
  if [ -d "$WORKTREE_DIR/.claude/agents" ]; then
    diff_count=$(diff <(ls $ROOT_REPO/.claude/agents/*.md 2>/dev/null | xargs -n1 basename | sort) <(ls $WORKTREE_DIR/.claude/agents/*.md 2>/dev/null | xargs -n1 basename | sort) | grep -c '^[<>]' || echo 0)
    check "worktree ↔ ana repo agent sync ($diff_count diff)" "[ '$diff_count' = '0' ]"
  fi
fi

# ════════════════════════════════════════════════════════════════════
# Reform v3.4 — extended checks (28 → 50+)
# ════════════════════════════════════════════════════════════════════

# 13. Codex CLI integration
check "Codex CLI yüklü" "command -v codex"
check "Codex CLI 0.130+ versiyonu" "codex --version 2>&1 | grep -qE 'codex-cli 0\.(13[0-9]|1[4-9][0-9])'"
check "Codex auth (Logged in)" "codex login status 2>&1 | grep -q 'Logged in'"
check "scripts/codex-review-real.sh executable" "[ -x '$ROOT_REPO/scripts/codex-review-real.sh' ]"
check "tier-detect.sh T3/T4'te codex-review-real referans" "grep -q 'codex-review-real.sh' '$ROOT_REPO/scripts/tier-detect.sh'"

# 14. launchd cron
check "launchd weekly-maintenance LOADED" "launchctl list 2>/dev/null | grep -q hellotalent.studio.weekly-maintenance"
check "launchd weekly-review LOADED" "launchctl list 2>/dev/null | grep -q hellotalent.studio.weekly-review"

# 15. Custom slash commands
check "/cook slash command" "[ -f '$ROOT_REPO/.claude/commands/cook.md' ]"
check "/plan-ui slash command" "[ -f '$ROOT_REPO/.claude/commands/plan-ui.md' ]"
check "/verify-design slash command" "[ -f '$ROOT_REPO/.claude/commands/verify-design.md' ]"
check "/codex-gate slash command" "[ -f '$ROOT_REPO/.claude/commands/codex-gate.md' ]"

# 16. Lint-staged config
check "package.json lint-staged js eslint" "grep -q '\"\\*.js\": \"eslint\"' '$ROOT_REPO/package.json'"
check "package.json lint-staged css token-strict" "grep -q 'check-token-strict' '$ROOT_REPO/package.json'"
check "package.json lint-staged html tags" "grep -q 'check-html-tags' '$ROOT_REPO/package.json'"
check "scripts/check-token-strict.sh executable" "[ -x '$ROOT_REPO/scripts/check-token-strict.sh' ]"

# 17. Agent dispatch tracking
check "track-agent-dispatch.sh executable" "[ -x '$ROOT_REPO/.claude/hooks/track-agent-dispatch.sh' ]"
check "PostToolUse Task hook bağlı" "grep -q 'track-agent-dispatch' '$SETTINGS'"

# 18. New automation scripts (Reform v3.4)
check "scripts/si-status-auto.sh executable" "[ -x '$ROOT_REPO/scripts/si-status-auto.sh' ]"
check "scripts/kpi-snapshot.sh executable" "[ -x '$ROOT_REPO/scripts/kpi-snapshot.sh' ]"
check "scripts/disable-vercel-injection.sh executable" "[ -x '$ROOT_REPO/scripts/disable-vercel-injection.sh' ]"
check "scripts/archive-dead-scripts.sh executable" "[ -x '$ROOT_REPO/scripts/archive-dead-scripts.sh' ]"
check "weekly-maintenance KPI block" "grep -q 'kpi-snapshot.sh' '$ROOT_REPO/scripts/weekly-maintenance.sh'"
check "weekly-maintenance si-status block" "grep -q 'si-status-auto.sh' '$ROOT_REPO/scripts/weekly-maintenance.sh'"
check "weekly-maintenance SELF-AUDIT drift block" "grep -q 'SELF-AUDIT' '$ROOT_REPO/scripts/weekly-maintenance.sh'"

# 19. Audit ledger sağlık
check "docs/SELF-AUDIT.md mevcut" "[ -f '$ROOT_REPO/docs/SELF-AUDIT.md' ]"
check "SELF-AUDIT A-K katmanları" "grep -cE '^## [A-K]\\.' '$ROOT_REPO/docs/SELF-AUDIT.md' | grep -qE '^[1-9][0-9]?$|^1[0-1]$'"
check "docs/SCRIPTS-INVENTORY.md" "[ -f '$ROOT_REPO/docs/SCRIPTS-INVENTORY.md' ]"
check "docs/SKILLS-INVENTORY.md" "[ -f '$ROOT_REPO/docs/SKILLS-INVENTORY.md' ]"
check "docs/UI-DOD-template.md" "[ -f '$ROOT_REPO/docs/UI-DOD-template.md' ]"
check "docs/RPC-CONTRACT.md" "[ -f '$ROOT_REPO/docs/RPC-CONTRACT.md' ]"

# 20. Test infrastructure
check "tests/hooks/run-all.sh" "[ -x '$ROOT_REPO/tests/hooks/run-all.sh' ]"
check "tests/hooks/test-codex-blocker.sh" "[ -x '$ROOT_REPO/tests/hooks/test-codex-blocker.sh' ]"

# 21. Memory archive
MEMORY_ARCHIVE=$(find "$HOME/.claude/projects" -path "*Hellotalent*" -name "archive" -type d 2>/dev/null | head -1)
if [ -n "$MEMORY_ARCHIVE" ]; then
  archive_count=$(ls "$MEMORY_ARCHIVE/"feedback_*.md 2>/dev/null | wc -l | tr -d ' ')
  check "12 feedback memory archive'da" "[ '$archive_count' = '12' ]"
fi

# ════════════════════════════════════════════════════════════════════
# Rapor
# ════════════════════════════════════════════════════════════════════

total=$((CHECKS_PASS + CHECKS_FAIL))

if [ "$CHECKS_FAIL" -eq 0 ]; then
  echo "[PREFLIGHT SELF-AUDIT] ✅ Tüm checklist pass ($CHECKS_PASS/$total)"
  echo "Self-improving altyapı sağlam — session başlayabilir."
else
  cat <<EOF
[PREFLIGHT SELF-AUDIT] ⚠ $CHECKS_FAIL/$total CHECK FAILED

Sorunlar:
EOF
  for i in "${ISSUES[@]}"; do
    echo "  ✗ $i"
  done
  cat <<EOF

Bu issue'ları session başında çöz veya:
  bash $ROOT_REPO/scripts/preflight-self-audit.sh
ile manuel inceleme yap.

Detay: docs/SELF-AUDIT.md
EOF
fi

exit 0
