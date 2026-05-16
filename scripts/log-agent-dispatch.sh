#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# log-agent-dispatch.sh — post-commit hook
# Reform 16 May 2026 — Öneri 4
#
# Her commit sonrası tier-detect çalıştırır, agent zincirini commit
# message marker'larından infer eder, reviews/agent-dispatch.csv'ye
# append eder. KPI tracker bu CSV'yi okur.
#
# CSV format: date,tier,agent_chain,commit_hash,description
#
# Bypass: AGENT_DISPATCH_LOG_SKIP=1
# ════════════════════════════════════════════════════════════════════

set -e

if [ "${AGENT_DISPATCH_LOG_SKIP:-}" = "1" ]; then
  exit 0
fi

# Repo root (worktree-aware)
GIT_COMMON=$(git rev-parse --git-common-dir 2>/dev/null)
if [ -n "$GIT_COMMON" ] && [ -d "$GIT_COMMON" ]; then
  REPO_ROOT=$(cd "$GIT_COMMON/.." && pwd)
else
  REPO_ROOT=$(pwd)
fi

CSV="$REPO_ROOT/reviews/agent-dispatch.csv"
mkdir -p "$(dirname "$CSV")"

# Header init
if [ ! -f "$CSV" ]; then
  echo "date,tier,agent_chain,commit_hash,description" > "$CSV"
fi

# HEAD commit info
commit_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
commit_msg=$(git log -1 --pretty=%B HEAD 2>/dev/null || echo "")
commit_date=$(date +"%Y-%m-%d")

# Merge commit skip (otomatik birleştirme)
if echo "$commit_msg" | head -1 | grep -qE "^Merge "; then
  exit 0
fi

# Tier detect — HEAD~1..HEAD değişikliği üzerinden
# Pre-commit context değil, post-commit — diff farklı çağrılır
files=$(git diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null || echo "")

if [ -z "$files" ]; then
  exit 0
fi

# Pattern'ler tier-detect.sh ile aynı
t3_pattern='^(supabase/migrations/|supabase/functions/|\.env|scripts/codex-bridge\.sh|scripts/codex-review\.sh)'
t4_pattern='^(docs/ARCHITECTURE\.md|docs/RPC-CONTRACT\.md)'
t2_pattern='^(css/|js/|.*\.html$|.*\.jsx?$|.*\.tsx?$|.*\.vue$|.*\.svelte$|\.claude/agents/)'

if echo "$files" | grep -qE "$t4_pattern"; then
  TIER="T4"
elif echo "$files" | grep -qE "$t3_pattern"; then
  TIER="T3"
elif echo "$files" | grep -qE "$t2_pattern"; then
  TIER="T2"
else
  TIER="T1"
fi

# Agent chain infer (commit message marker'lardan)
chain="solo"
case "$TIER" in
  T1)
    chain="solo"
    ;;
  T2)
    if echo "$commit_msg" | grep -qE 'design-spec: docs/specs/'; then
      chain="frontend+reviewer"
    elif echo "$commit_msg" | grep -qE '\[design-bypass\]'; then
      chain="manual-bypass"
    elif echo "$commit_msg" | grep -qE '\[agent-bypass\]'; then
      chain="manual-bypass"
    else
      chain="unknown"
    fi
    ;;
  T3)
    if echo "$commit_msg" | grep -qE '\[codex-bypass\]'; then
      chain="auditor+reviewer-bypass"
    elif echo "$commit_msg" | grep -qE '\[agent-bypass\]'; then
      chain="manual-bypass"
    else
      chain="auditor+reviewer+codex"
    fi
    ;;
  T4)
    if echo "$commit_msg" | grep -qE '\[codex-bypass\]'; then
      chain="architect+reviewer-bypass"
    elif echo "$commit_msg" | grep -qE '\[agent-bypass\]'; then
      chain="manual-bypass"
    else
      chain="architect+reviewer+codex"
    fi
    ;;
esac

# Description — commit msg ilk satırı, virgül/quote escape
description=$(echo "$commit_msg" | head -1 | sed 's/"/'"'"'/g' | sed 's/,/;/g' | cut -c1-100)

# CSV append
echo "$commit_date,$TIER,$chain,$commit_hash,\"$description\"" >> "$CSV"

# Sessiz çık (post-commit noise minimal)
exit 0
