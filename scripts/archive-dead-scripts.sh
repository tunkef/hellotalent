#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# archive-dead-scripts.sh — Reform v3.4
# 11 May 2026
#
# docs/SCRIPTS-INVENTORY.md'de 💀 DEAD işaretli scriptleri
# scripts/_archive_dead/'a taşır. 30 gün sonra cleanup gerek.
#
# Reversible: scripts/_archive_dead/'dan geri taşı.
# ════════════════════════════════════════════════════════════════════

set -e

DEAD_SCRIPTS=(
  "aider-commit.sh"
  "bump-cache-bust.sh"
  "codex-bridge.sh"
  "codex-review.sh"
  "sprint8-screenshot.js"
)

ACTION="${1:-archive}"
ARCHIVE_DIR="scripts/_archive_dead"

case "$ACTION" in
  archive)
    mkdir -p "$ARCHIVE_DIR"
    moved=0
    for s in "${DEAD_SCRIPTS[@]}"; do
      if [ -f "scripts/$s" ]; then
        mv "scripts/$s" "$ARCHIVE_DIR/"
        echo "[archived] $s → _archive_dead/"
        moved=$((moved+1))
      fi
    done
    echo ""
    echo "✓ $moved dead script archived"
    echo "  Geri al: bash $0 restore"
    echo "  30 gün sonra cleanup: rm -rf $ARCHIVE_DIR"
    ;;

  restore)
    if [ ! -d "$ARCHIVE_DIR" ]; then
      echo "Archive dir yok: $ARCHIVE_DIR" >&2
      exit 1
    fi
    for f in "$ARCHIVE_DIR"/*; do
      [ -f "$f" ] || continue
      basename=$(basename "$f")
      mv "$f" "scripts/$basename"
      echo "[restored] $basename"
    done
    rmdir "$ARCHIVE_DIR" 2>/dev/null || true
    ;;

  status)
    if [ -d "$ARCHIVE_DIR" ]; then
      count=$(ls "$ARCHIVE_DIR"/ 2>/dev/null | wc -l | tr -d ' ')
      echo "[archive-status] $count dead script archived in $ARCHIVE_DIR"
      ls "$ARCHIVE_DIR"/
    else
      echo "[archive-status] Henüz archive yok"
    fi
    ;;

  *)
    echo "Usage: $0 [archive|restore|status]"
    exit 1
    ;;
esac
