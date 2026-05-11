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
