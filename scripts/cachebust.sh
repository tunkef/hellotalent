#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# cachebust.sh — Reform 11 May 2026
#
# Tüm HTML/CSS/JS referanslarında ?v=... versiyon string'lerini güncel
# git short SHA'ya çevirir. Manuel cache-bust YASAK — bu script
# pre-commit hook'tan otomatik çağrılır.
#
# 26 farklı manuel versiyon → 1 otomatik git-sha versiyon.
#
# Usage:
#   ./scripts/cachebust.sh          # otomatik git short sha
#   ./scripts/cachebust.sh <id>     # manuel id (rare, debug için)
# ════════════════════════════════════════════════════════════════════

set -euo pipefail

# Git short sha (otomatik) veya manuel
if [ $# -ge 1 ]; then
  NEW_ID="$1"
else
  NEW_ID=$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)
fi

# Validate
if [[ ! "$NEW_ID" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  echo "Error: build ID must be alphanum/dot/underscore/hyphen only" >&2
  exit 1
fi

# Target: HTML files in repo root + 1 level deep
FILES=()
while IFS= read -r f; do
  FILES+=("$f")
done < <(find . -maxdepth 2 -type f -name "*.html" \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -not -path "./docs/*" \
  -not -path "./.claude/*")

if [ "${#FILES[@]}" -eq 0 ]; then
  echo "No HTML files found."
  exit 0
fi

echo "Cachebust → ?v=$NEW_ID (${#FILES[@]} HTML files)"

total=0
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # macOS BSD sed
    if sed -i '' -E "s/\?v=[a-zA-Z0-9._-]+/?v=$NEW_ID/g" "$file" 2>/dev/null; then
      count=$(grep -c "?v=$NEW_ID" "$file" 2>/dev/null || echo 0)
    else
      # GNU sed fallback
      sed -i -E "s/\?v=[a-zA-Z0-9._-]+/?v=$NEW_ID/g" "$file"
      count=$(grep -c "?v=$NEW_ID" "$file" 2>/dev/null || echo 0)
    fi
    if [ "$count" -gt 0 ]; then
      echo "  $file — $count refs"
      total=$((total + count))
    fi
  fi
done

echo "Done. $total cache-bust refs updated to ?v=$NEW_ID"
echo "Stage with: git add -A && git diff --stat"
