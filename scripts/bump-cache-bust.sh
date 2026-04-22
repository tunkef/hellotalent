#!/usr/bin/env bash
# ═══════════════════════════════════════════════════
# bump-cache-bust.sh — K045 Faz 2D helper
#
# Replace all ?v=<old> strings across HTML/JS/CSS in the repo with a new
# build ID. Poor man's central BUILD_ID — without runtime JS templating.
#
# Usage:
#   ./scripts/bump-cache-bust.sh <new-id>          # replace all versions
#   ./scripts/bump-cache-bust.sh <new-id> <files>  # only listed files
#
# Example:
#   ./scripts/bump-cache-bust.sh 20260423k046a
#   ./scripts/bump-cache-bust.sh 20260423k046a profil.html ik.html
#
# Pattern matched: ?v=<alphanum-dots-dashes>
# ═══════════════════════════════════════════════════
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <new-build-id> [files...]" >&2
  echo "Example: $0 20260423k046a" >&2
  exit 1
fi

NEW_ID="$1"
shift

# Validate ID — reject spaces, quotes, slashes
if [[ ! "$NEW_ID" =~ ^[a-zA-Z0-9._-]+$ ]]; then
  echo "Error: build ID must contain only alphanumerics, dots, underscores, hyphens" >&2
  exit 1
fi

# Default target: HTML files in repo root
if [ $# -eq 0 ]; then
  # shellcheck disable=SC2207
  FILES=( $(find . -maxdepth 2 -type f \( -name "*.html" \) -not -path "./node_modules/*" -not -path "./.git/*") )
else
  FILES=( "$@" )
fi

echo "Bumping cache-bust to ?v=$NEW_ID in ${#FILES[@]} files..."

# Portable sed — works on macOS (BSD sed) and GNU sed
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Match ?v= followed by alphanum/dots/dashes/underscores up to " or ' or whitespace
    if sed -i '' -E "s/\?v=[a-zA-Z0-9._-]+/?v=$NEW_ID/g" "$file" 2>/dev/null; then
      changed=$(grep -c "?v=$NEW_ID" "$file" 2>/dev/null || echo 0)
      echo "  $file — $changed refs bumped"
    else
      # GNU sed fallback
      sed -i -E "s/\?v=[a-zA-Z0-9._-]+/?v=$NEW_ID/g" "$file"
      changed=$(grep -c "?v=$NEW_ID" "$file" 2>/dev/null || echo 0)
      echo "  $file — $changed refs bumped"
    fi
  else
    echo "  $file — NOT FOUND, skipping" >&2
  fi
done

echo "Done. Verify with: git diff --stat"
