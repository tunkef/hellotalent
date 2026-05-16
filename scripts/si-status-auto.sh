#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# si-status-auto.sh — Cron-runnable /si:status replikası
# Reform v3.4 — 11 May 2026
#
# Plugin /si:status skill'i manuel komut. Bu script aynı dashboard'u
# cron'da çalıştırır, weekly-maintenance.sh'a entegre.
#
# Usage:
#   ./scripts/si-status-auto.sh              # full report
#   ./scripts/si-status-auto.sh --brief      # one-line summary
#
# Output: stdout report, exit 0
# ════════════════════════════════════════════════════════════════════

set -e

PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$HOME/Downloads/Hellotalent}"
MODE="${1:-full}"

# Auto-memory dir
MEM_DIR_ENC=$(echo "$PROJECT_ROOT" | sed 's|/|%2F|g; s|%2F|/|; s|^/||')
MEM_DIR="$HOME/.claude/projects/-$(echo $PROJECT_ROOT | sed 's|/|-|g; s|^-||')/memory"
[ ! -d "$MEM_DIR" ] && MEM_DIR="$HOME/.claude/projects/$MEM_DIR_ENC/memory"

# Fallback: glob match
if [ ! -d "$MEM_DIR" ]; then
  MEM_DIR=$(find "$HOME/.claude/projects" -maxdepth 1 -type d -name "*Hellotalent*" 2>/dev/null | head -1)/memory
fi

# Rules learned
RULES_LEARNED="$PROJECT_ROOT/.claude/rules/learned/consolidated-2026-05.md"
RULES_DIR="$PROJECT_ROOT/.claude/rules"

# Pending
PENDING_FILE="$PROJECT_ROOT/.claude/agent-memory/pending-rules.md"
APPROVALS_FILE="$PROJECT_ROOT/.claude/agent-memory/pending-approvals.md"

# CLAUDE.md
CLAUDE_MD="$PROJECT_ROOT/CLAUDE.md"

# Brief mode — tek satır
if [ "$MODE" = "--brief" ]; then
  memory_lines=$(wc -l "$MEM_DIR/MEMORY.md" 2>/dev/null | awk '{print $1}' || echo 0)
  topics=$(ls "$MEM_DIR"/*.md 2>/dev/null | grep -v MEMORY.md | wc -l | tr -d ' ')
  rules_learned=$(grep -c "^## L" "$RULES_LEARNED" 2>/dev/null || echo 0)
  pending_pr=$(grep -cE "^## PR[0-9]+" "$PENDING_FILE" 2>/dev/null | tr -d '[:space:]')
  pending_neg=$(grep -cE "^## NEG[0-9]+" "$PENDING_FILE" 2>/dev/null | tr -d '[:space:]')
  [ -z "$pending_pr" ] && pending_pr=0
  [ -z "$pending_neg" ] && pending_neg=0
  echo "[si:status] MEMORY.md=$memory_lines lines | topics=$topics | learned-rules=$rules_learned | pending=PR:$pending_pr NEG:$pending_neg"
  exit 0
fi

# Full report
cat <<EOF

═══════════════════════════════════════════════════════════════════
[SI:STATUS — Memory Health Dashboard] $(date +"%Y-%m-%d %H:%M")
═══════════════════════════════════════════════════════════════════

## Auto-memory ($MEM_DIR)

EOF

if [ -d "$MEM_DIR" ]; then
  memory_lines=$(wc -l "$MEM_DIR/MEMORY.md" 2>/dev/null | awk '{print $1}' || echo 0)
  echo "  MEMORY.md         : $memory_lines lines"

  topic_count=$(ls "$MEM_DIR"/*.md 2>/dev/null | grep -v MEMORY.md | wc -l | tr -d ' ')
  echo "  Topic files       : $topic_count"

  archive_count=$(ls "$MEM_DIR/archive/"*.md 2>/dev/null | wc -l | tr -d ' ')
  echo "  Archive files     : $archive_count (graduate'd memories)"
else
  echo "  ⚠ Memory dir bulunamadı: $MEM_DIR"
fi

cat <<EOF

## Rules learned ($RULES_LEARNED)

EOF

if [ -f "$RULES_LEARNED" ]; then
  rule_count=$(grep -c "^## L" "$RULES_LEARNED" 2>/dev/null || echo 0)
  echo "  Learned rules     : $rule_count (L1-L$rule_count)"
  echo "  Last 5:"
  grep "^## L" "$RULES_LEARNED" | tail -5 | sed 's/^/    /'
else
  echo "  ⚠ rules/learned/consolidated-2026-05.md yok"
fi

cat <<EOF

## Pending review

EOF

if [ -f "$PENDING_FILE" ]; then
  pr_count=$(grep -cE "^## PR[0-9]+" "$PENDING_FILE" 2>/dev/null | tr -d '[:space:]')
  neg_count=$(grep -cE "^## NEG[0-9]+" "$PENDING_FILE" 2>/dev/null | tr -d '[:space:]')
  [ -z "$pr_count" ] && pr_count=0
  [ -z "$neg_count" ] && neg_count=0
  echo "  PR (pending rule önerileri)        : $pr_count"
  echo "  NEG (auto-captured negative feedback): $neg_count"

  if [ "$neg_count" -gt 5 ]; then
    echo "  ⚠ 5+ NEG entry — chief-of-staff Pazar review'da graduate aday var"
  fi
else
  echo "  ⚠ pending-rules.md yok"
fi

if [ -f "$APPROVALS_FILE" ]; then
  approval_count=$(grep -cE "^## A[0-9]+" "$APPROVALS_FILE" 2>/dev/null | tr -d '[:space:]')
  [ -z "$approval_count" ] && approval_count=0
  auto_approvals=$(grep -cE "^## A_AUTO_" "$APPROVALS_FILE" 2>/dev/null | tr -d '[:space:]')
  [ -z "$auto_approvals" ] && auto_approvals=0
  echo "  pending-approvals  : $approval_count manual + $auto_approvals auto (Codex BLOCKER)"
fi

cat <<EOF

## Agent stack

EOF

agents_active=$(ls "$PROJECT_ROOT/.claude/agents/"*.md 2>/dev/null | grep -v CHANGELOG | grep -v _archive | wc -l | tr -d ' ')
agents_archived=$(ls "$PROJECT_ROOT/.claude/agents/_archive/" 2>/dev/null | wc -l | tr -d ' ')
echo "  Active agents     : $agents_active"
echo "  Archived agents   : $agents_archived"

# Learned Rules section coverage
missing_lr=0
for f in "$PROJECT_ROOT/.claude/agents/"*.md; do
  if [ -f "$f" ] && ! basename "$f" | grep -qE '^CHANGELOG'; then
    if ! grep -q '^## Learned Rules' "$f" 2>/dev/null; then
      missing_lr=$((missing_lr + 1))
    fi
  fi
done
echo "  Learned Rules section coverage: $((agents_active - missing_lr))/$agents_active"

cat <<EOF

## CLAUDE.md

EOF
if [ -f "$CLAUDE_MD" ]; then
  claude_lines=$(wc -l "$CLAUDE_MD" | awk '{print $1}')
  echo "  Lines             : $claude_lines (Reform target: ≤120)"
  if [ "$claude_lines" -gt 120 ]; then
    echo "  ⚠ CLAUDE.md şişti, sadeleştirme aday"
  fi
fi

cat <<EOF

## KPI snapshot (son 7 gün)

EOF

cd "$PROJECT_ROOT" 2>/dev/null || cd /
commit_7d=$(git log --since="7 days ago" --oneline --no-merges 2>/dev/null | wc -l | tr -d ' ')
fix_7d=$(git log --since="7 days ago" --oneline --no-merges 2>/dev/null | grep -ciE "^[a-f0-9]+ fix" || echo 0)
revize_7d=$(git log --since="7 days ago" --oneline --no-merges 2>/dev/null | grep -ciE "v[2-9]|round-[2-9]|redesign|revize" || echo 0)
[ "$commit_7d" -gt 0 ] && fix_pct=$((fix_7d * 100 / commit_7d)) || fix_pct=0

echo "  Commit (7d)       : $commit_7d (hedef: ≤56 yani günlük 8)"
echo "  Fix prefix (7d)   : $fix_7d ($fix_pct% — hedef: ≤20%)"
echo "  v2+ revize (7d)   : $revize_7d (hedef: ≤2/hafta, 5/ay)"

# Agent dispatch ratio
if [ -f "$PROJECT_ROOT/reviews/agent-dispatch.csv" ]; then
  dispatches=$(grep -c "," "$PROJECT_ROOT/reviews/agent-dispatch.csv" 2>/dev/null || echo 0)
  dispatches=$((dispatches - 1))  # header
  [ "$dispatches" -lt 0 ] && dispatches=0
  echo "  Agent dispatches  : $dispatches total (since CSV created)"
fi

cat <<EOF

## Recommendations

EOF

if [ "$missing_lr" -gt 0 ]; then
  echo "  • $missing_lr agent'a 'Learned Rules' section eksik — agent-learned-rules-helper.sh tetik"
fi
if [ "$fix_pct" -gt 30 ]; then
  echo "  • Fix oranı yüksek (%$fix_pct), retrospective tetik gerekebilir"
fi
if [ "$revize_7d" -gt 2 ]; then
  echo "  • v2+ revize haftalık limit aşıldı, docs/retrospectives/ incele"
fi
echo "  • Haftalık review (Pazar): pending-rules.md graduate, KPI ölç"

cat <<EOF

═══════════════════════════════════════════════════════════════════
EOF

exit 0
