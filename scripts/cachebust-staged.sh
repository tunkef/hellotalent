#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# cachebust-staged.sh — pre-commit hook
# Reform 11 May 2026
#
# Sadece staged HTML dosyalardaki ?v=<old> referanslarını otomatik
# parent SHA + timestamp hibrid versiyonu ile günceller, yeniden stage
# eder. Manuel ?v=tarihfix proliferasyonu önler.
#
# Versiyon format: <parent_short_sha>-<MMDDHHMM>
#   örn: dd7b8b3-05112152
#
# Bypass: CACHEBUST_SKIP=1 git commit ...
# ════════════════════════════════════════════════════════════════════

set -e

if [ "${CACHEBUST_SKIP:-}" = "1" ]; then
  echo "[cachebust-staged] SKIPPED (CACHEBUST_SKIP=1)"
  exit 0
fi

# Mode: --all → tüm HTML (maintenance), default → sadece staged (pre-commit)
MODE="staged"
if [ "${1:-}" = "--all" ]; then
  MODE="all"
fi

if [ "$MODE" = "all" ]; then
  # Tüm HTML (worktree/node_modules/archive exclude)
  staged_html=$(find . -type f -name "*.html" \
    -not -path "*/.claude/worktrees/*" \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -not -path "*/_archive*/*" \
    -not -path "*/archive*/*" 2>/dev/null)
  echo "[cachebust-staged] --all mode: tüm HTML taranıyor"
else
  # Staged HTML files
  staged_html=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null | grep -E '\.html$' || true)
fi

if [ -z "$staged_html" ]; then
  # HTML yok — skip
  exit 0
fi

# Parent SHA (HEAD = pre-commit context) + timestamp
parent_sha=$(git rev-parse --short HEAD 2>/dev/null || echo "init")
ts=$(date +"%m%d%H%M")
NEW_ID="${parent_sha}-${ts}"

# Validate
if [[ ! "$NEW_ID" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  echo "[cachebust-staged] Error: invalid build ID" >&2
  exit 1
fi

# Replace + re-stage
total=0
for file in $staged_html; do
  if [ -f "$file" ]; then
    # Old version count
    old_count=$(grep -cE "\?v=[a-zA-Z0-9._-]+" "$file" 2>/dev/null || echo 0)
    old_count=$(echo "$old_count" | tr -d '[:space:]')

    if [ "$old_count" -gt 0 ]; then
      # macOS BSD sed
      if sed -i '' -E "s/\?v=[a-zA-Z0-9._-]+/?v=$NEW_ID/g" "$file" 2>/dev/null; then
        :
      else
        # GNU sed fallback
        sed -i -E "s/\?v=[a-zA-Z0-9._-]+/?v=$NEW_ID/g" "$file"
      fi

      # Re-stage only in staged mode (pre-commit context)
      if [ "$MODE" = "staged" ]; then
        git add "$file"
      fi
      total=$((total + old_count))
      echo "[cachebust-staged] $file — $old_count refs → ?v=$NEW_ID"
    fi
  fi
done

if [ "$total" -gt 0 ]; then
  echo "[cachebust-staged] Done. $total cache-bust refs unified to ?v=$NEW_ID"
fi

exit 0
