#!/usr/bin/env bash
# check-truth-sync.sh — Asama 46: Truth-sync pre-commit guard
#
# Purpose: Product/data dosyalari staged oldugunda docs truth-sync zorunlulugu
# Usage:   ./scripts/check-truth-sync.sh
#          SKIP_TRUTH_CHECK=1 ./scripts/check-truth-sync.sh  (bypass)
#
# Exit codes:
#   0 = pass (no trigger, or trigger+docs staged, or SKIP_TRUTH_CHECK=1)
#   1 = fail (trigger staged but no docs staged)

set -euo pipefail

# Allow tests to inject a mock git command
GIT_CMD="${GIT_CMD:-git}"

# Bypass flag
if [ "${SKIP_TRUTH_CHECK:-0}" = "1" ]; then
  echo "[truth-sync] SKIP_TRUTH_CHECK=1 — bypassed"
  exit 0
fi

# Get staged file list
STAGED_FILES=$($GIT_CMD diff --cached --name-only 2>/dev/null || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Check for trigger files: profil*.js, ik.html, supabase/migrations/*
TRIGGER_FOUND=0
while IFS= read -r f; do
  case "$f" in
    profil*.js|ik.html|supabase/migrations/*)
      TRIGGER_FOUND=1
      break
      ;;
  esac
done <<< "$STAGED_FILES"

if [ "$TRIGGER_FOUND" -eq 0 ]; then
  # No trigger files — pass through
  exit 0
fi

# Trigger found — require at least one docs file staged
DOCS_FOUND=0
while IFS= read -r f; do
  case "$f" in
    docs/CURRENT-STATE.md|docs/AI-COLLAB.md)
      DOCS_FOUND=1
      break
      ;;
  esac
done <<< "$STAGED_FILES"

if [ "$DOCS_FOUND" -eq 0 ]; then
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  TRUTH-SYNC GUARD — HATA                                    ║"
  echo "╠══════════════════════════════════════════════════════════════╣"
  echo "║  Product/data dosyasi staged ama docs guncellenmemis.       ║"
  echo "║                                                              ║"
  echo "║  Staged trigger dosyalar:                                   ║"
  while IFS= read -r f; do
    case "$f" in
      profil*.js|ik.html|supabase/migrations/*)
        echo "║    - $f"
        ;;
    esac
  done <<< "$STAGED_FILES"
  echo "║                                                              ║"
  echo "║  Su dosyalardan en az birini stage et:                      ║"
  echo "║    docs/CURRENT-STATE.md                                    ║"
  echo "║    docs/AI-COLLAB.md                                        ║"
  echo "║                                                              ║"
  echo "║  Bypass: SKIP_TRUTH_CHECK=1 git commit ...                  ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  exit 1
fi

echo "[truth-sync] OK — docs staged birlikte"
exit 0
