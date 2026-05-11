#!/usr/bin/env bash
# Install launchd plists for Studio v3 weekly scans
# Usage: bash scripts/install-launchd.sh [install|uninstall|status]

set -e

LAUNCH_DIR=~/Library/LaunchAgents
PLIST_DIR=~/Downloads/Hellotalent/scripts/launchd
ACTION="${1:-install}"

PLISTS=(
  "com.hellotalent.studio.weekly-review.plist"
  "com.hellotalent.studio.weekly-maintenance.plist"
  "com.hellotalent.studio.weekly-backup.plist"
)

case $ACTION in
  install)
    mkdir -p "$LAUNCH_DIR"
    for plist in "${PLISTS[@]}"; do
      cp "$PLIST_DIR/$plist" "$LAUNCH_DIR/"
      launchctl load -w "$LAUNCH_DIR/$plist"
      echo "[install] Loaded: $plist"
    done
    echo "[install] Done. Weekly scans active every Sunday (09:00 maintenance, 10:00 rules review)."
    ;;

  uninstall)
    for plist in "${PLISTS[@]}"; do
      if [ -f "$LAUNCH_DIR/$plist" ]; then
        launchctl unload "$LAUNCH_DIR/$plist" 2>/dev/null || true
        rm "$LAUNCH_DIR/$plist"
        echo "[uninstall] Removed: $plist"
      fi
    done
    echo "[uninstall] Done."
    ;;

  status)
    for plist in "${PLISTS[@]}"; do
      label=$(basename "$plist" .plist)
      if launchctl list | grep -q "$label"; then
        echo "[status] LOADED: $label"
      else
        echo "[status] NOT LOADED: $label"
      fi
    done
    ;;

  *)
    echo "Usage: $0 [install|uninstall|status]"
    exit 1
    ;;
esac
