#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# disable-vercel-injection.sh — Reform v3.4
# 11 May 2026
#
# Vercel plugin auto-injection (her promptta gelen "vercel-cli matched"
# vs spam) durdurur. Plugin marketplace.json'dan vercel entry'sini
# kaldırır (yedek alarak). Reversible.
#
# Tuna onayı sonrası: bash scripts/disable-vercel-injection.sh
#
# Geri al: bash scripts/disable-vercel-injection.sh restore
# ════════════════════════════════════════════════════════════════════

set -e

MARKETPLACE_JSON="$HOME/.claude/plugins/marketplaces/claude-plugins-official/.claude-plugin/marketplace.json"
DATA_DIR="$HOME/.claude/plugins/data/vercel-claude-plugins-official"
BACKUP_DIR="$HOME/.claude/plugins/_vercel-backup-$(date +%Y%m%d)"

ACTION="${1:-disable}"

case "$ACTION" in
  disable)
    if [ ! -f "$MARKETPLACE_JSON" ]; then
      echo "[vercel-disable] marketplace.json bulunamadı: $MARKETPLACE_JSON"
      exit 1
    fi

    # Yedek
    mkdir -p "$BACKUP_DIR"
    cp "$MARKETPLACE_JSON" "$BACKUP_DIR/marketplace.json.bak"
    if [ -d "$DATA_DIR" ]; then
      cp -r "$DATA_DIR" "$BACKUP_DIR/data/" 2>/dev/null || true
    fi
    echo "[vercel-disable] Yedek alındı: $BACKUP_DIR"

    # marketplace.json'dan vercel plugin entry'sini kaldır
    if command -v jq >/dev/null 2>&1; then
      jq '.plugins |= map(select(.name != "vercel"))' "$MARKETPLACE_JSON" > "$MARKETPLACE_JSON.tmp" && \
        mv "$MARKETPLACE_JSON.tmp" "$MARKETPLACE_JSON"
      echo "[vercel-disable] marketplace.json'dan vercel plugin entry kaldırıldı"
    else
      echo "[vercel-disable] Error: jq yok, manuel düzenleme gerek" >&2
      exit 1
    fi

    # Data dir sil
    if [ -d "$DATA_DIR" ]; then
      rm -rf "$DATA_DIR"
      echo "[vercel-disable] Data dir silindi: $DATA_DIR"
    fi

    echo ""
    echo "✓ Vercel injection disable edildi. Sonraki session'da hook spam durmalı."
    echo "  Geri al: bash $0 restore $BACKUP_DIR"
    ;;

  restore)
    RESTORE_DIR="${2:-$BACKUP_DIR}"
    if [ ! -d "$RESTORE_DIR" ]; then
      # Last backup glob
      RESTORE_DIR=$(ls -1d $HOME/.claude/plugins/_vercel-backup-* 2>/dev/null | tail -1)
    fi
    if [ ! -d "$RESTORE_DIR" ]; then
      echo "[vercel-restore] Yedek bulunamadı" >&2
      exit 1
    fi

    cp "$RESTORE_DIR/marketplace.json.bak" "$MARKETPLACE_JSON"
    if [ -d "$RESTORE_DIR/data" ]; then
      mkdir -p "$DATA_DIR"
      cp -r "$RESTORE_DIR/data/"* "$DATA_DIR/" 2>/dev/null || true
    fi
    echo "[vercel-restore] Restore edildi: $RESTORE_DIR"
    ;;

  status)
    if [ -f "$MARKETPLACE_JSON" ]; then
      vercel_present=$(jq '.plugins[] | select(.name == "vercel") | .name' "$MARKETPLACE_JSON" 2>/dev/null)
      if [ -n "$vercel_present" ]; then
        echo "[vercel-status] Vercel plugin AKTİF marketplace.json'da"
      else
        echo "[vercel-status] Vercel plugin REMOVED marketplace.json'dan"
      fi
    fi
    if [ -d "$DATA_DIR" ]; then
      echo "[vercel-status] Data dir mevcut: $DATA_DIR"
    else
      echo "[vercel-status] Data dir YOK (disabled)"
    fi
    ;;

  *)
    echo "Usage: $0 [disable|restore [backup-dir]|status]"
    exit 1
    ;;
esac
