#!/bin/bash
# ═══════════════════════════════════════════════════
# HelloTalent Autopilot — launchd Setup
# macOS'ta terminal-bagimsiz servis olarak kurar.
#
#   ./scripts/setup-launchd.sh install   → launchd servisini kur
#   ./scripts/setup-launchd.sh uninstall → Servisi kaldir
#   ./scripts/setup-launchd.sh status    → Servis durumu
# ═══════════════════════════════════════════════════

set -euo pipefail

PROJECT_DIR="/Users/peopleintk/Downloads/Hellotalent"
LABEL="ai.hellotalent.autopilot"
PLIST_PATH="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="$PROJECT_DIR/reviews"

case "${1:-help}" in
  install)
    mkdir -p "$LOG_DIR"
    mkdir -p "$HOME/Library/LaunchAgents"

    cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LABEL}</string>

    <key>ProgramArguments</key>
    <array>
        <string>${PROJECT_DIR}/scripts/autopilot-launcher.sh</string>
    </array>

    <key>WorkingDirectory</key>
    <string>${PROJECT_DIR}</string>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
    </dict>

    <key>ThrottleInterval</key>
    <integer>10</integer>

    <key>StandardOutPath</key>
    <string>${LOG_DIR}/autopilot-launchd.log</string>

    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/autopilot-launchd.err</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>HOME</key>
        <string>${HOME}</string>
    </dict>
</dict>
</plist>
PLIST

    # Env variables'i plist'e ekle (.env.local'dan)
    if [ -f "$PROJECT_DIR/.env.local" ]; then
      echo "  .env.local bulundu — autopilot.sh icinde yukleniyor (plist disinda)"
    fi

    launchctl unload "$PLIST_PATH" 2>/dev/null || true
    launchctl load "$PLIST_PATH"

    echo "✅ launchd servisi kuruldu: $LABEL"
    echo "   Plist: $PLIST_PATH"
    echo "   Log: $LOG_DIR/autopilot-launchd.log"
    echo ""

    # macOS sandbox kontrolu — 3 saniye bekle, exit code kontrol et
    sleep 3
    local exit_status=$(launchctl list | grep "$LABEL" | awk '{print $2}')
    if [ "$exit_status" = "126" ] || [ "$exit_status" = "1" ]; then
      echo "⚠️  macOS Full Disk Access gerekiyor!"
      echo ""
      echo "   Downloads klasoru macOS tarafindan korunuyor."
      echo "   Cozum: System Settings > Privacy & Security > Full Disk Access"
      echo "   → Terminal.app (veya iTerm) ekle → Toggle ON"
      echo "   → Sonra tekrar calistir: ./scripts/setup-launchd.sh install"
      echo ""
      echo "   Veya nohup fallback kullan: ./scripts/autopilot.sh start"
    else
      echo "   Otomatik baslar: login'de + crash sonrasi"
      echo "   Kontrol: ./scripts/autopilot.sh status"
      echo "   Durdur:  ./scripts/autopilot.sh stop"
    fi
    ;;

  uninstall)
    if [ -f "$PLIST_PATH" ]; then
      launchctl unload "$PLIST_PATH" 2>/dev/null || true
      rm -f "$PLIST_PATH"
      echo "✅ launchd servisi kaldirildi."
    else
      echo "Servis zaten kurulu degil."
    fi
    ;;

  status)
    if launchctl list | grep -q "$LABEL"; then
      local pid=$(launchctl list | grep "$LABEL" | awk '{print $1}')
      echo "✅ launchd servisi aktif (PID: $pid)"
    else
      echo "❌ launchd servisi aktif degil."
    fi
    ;;

  *)
    echo "HelloTalent Autopilot — launchd Setup"
    echo ""
    echo "  $0 install     Servisi kur (login'de otomatik baslar)"
    echo "  $0 uninstall   Servisi kaldir"
    echo "  $0 status      Durum"
    ;;
esac
