#!/bin/bash
# ═══════════════════════════════════════════════════
# HelloTalent Autopilot
# AI-COLLAB.md'yi izler. Codex yeni aşama yazdığında
# otomatik pipeline başlatır, bitince bildirim gönderir.
#
# Kullanım:
#   ./scripts/autopilot.sh start     → Arka planda izlemeye başla
#   ./scripts/autopilot.sh stop      → Durdur
#   ./scripts/autopilot.sh status    → Çalışıyor mu kontrol et
#   ./scripts/autopilot.sh log       → Son logları göster
# ═══════════════════════════════════════════════════

set -euo pipefail
cd "$(dirname "$0")/.."

# Load env variables from .env.local if exists
[ -f .env.local ] && set -a && . .env.local && set +a

COLLAB="docs/AI-COLLAB.md"
PID_FILE=".autopilot.pid"
LOG_FILE="reviews/autopilot.log"
STAGE_FILE=".autopilot.stage"
LOCK_FILE=".autopilot.lock"
NTFY_TOPIC="${NTFY_TOPIC:-hellotalent-tuna}"

mkdir -p reviews

notify() {
  curl -s -o /dev/null \
    -H "Title: $1" \
    -H "Priority: ${3:-default}" \
    -H "Tags: ${4:-robot}" \
    -d "$2" \
    "https://ntfy.sh/$NTFY_TOPIC" 2>/dev/null || true
  osascript -e "display notification \"$2\" with title \"$1\" sound name \"Glass\"" 2>/dev/null || true
}

cleanup_watch_loop() {
  rm -f "$LOCK_FILE"

  current=$(cat "$PID_FILE" 2>/dev/null || true)
  if [ "$current" = "$$" ]; then
    rm -f "$PID_FILE"
  fi
}

# ── Mevcut en yüksek "Claude Icin Gorev" aşama numarasını bul ──
# Sadece "## N. Claude Icin Gorev" görev başlıklarını okur.
# Özet ("### Claude Cikti Ozeti"), review veya diğer referansları aktif aşama saymaz.
get_latest_stage() {
  grep -E '^## [0-9]+\. Claude Icin Gorev' "$COLLAB" 2>/dev/null \
    | grep -oE 'A[sş]ama [0-9]+' | grep -oE '[0-9]+' | sort -n | tail -1 || echo "0"
}

# ── Pipeline çalışıyor mu kontrol ──
is_running() {
  [ -f "$LOCK_FILE" ] && kill -0 "$(cat "$LOCK_FILE" 2>/dev/null)" 2>/dev/null
}

# ── Autonomous loop aktif mi kontrol ──
_should_skip_pipeline() {
  local loop_pid_file="${LOOP_PID_FILE:-.autonomous-loop.pid}"
  if [ -f "$loop_pid_file" ] && kill -0 "$(cat "$loop_pid_file" 2>/dev/null)" 2>/dev/null; then
    echo "autonomous-loop aktif, pipeline atlaniyor"
    return 0
  fi
  return 1
}

# ── Ana izleme döngüsü ──
watch_loop() {
  trap '' HUP
  trap cleanup_watch_loop EXIT INT TERM

  echo "$(date '+%H:%M:%S') Autopilot başlatıldı" >> "$LOG_FILE"
  notify "Autopilot Aktif" "AI-COLLAB.md izleniyor. Codex yeni asama yazdiginda pipeline otomatik calisacak." "default" "eyes"

  # Mevcut aşamayı kaydet
  local current_stage=$(get_latest_stage)
  echo "$current_stage" > "$STAGE_FILE"
  echo "$(date '+%H:%M:%S') Baslangic asamasi: $current_stage" >> "$LOG_FILE"

  # Basit polling modeli — fswatch yerine güvenilir checksum kontrolü.
  # 5 saniyede bir AI-COLLAB değişti mi bakar; stage açılışları için yeterince hızlıdır.
  local last_snapshot
  local current_snapshot
  last_snapshot=$(cksum "$COLLAB" 2>/dev/null | awk '{print $1 ":" $2}')

  while true; do
    sleep 5
    current_snapshot=$(cksum "$COLLAB" 2>/dev/null | awk '{print $1 ":" $2}')
    if [ "${current_snapshot:-missing}" = "${last_snapshot:-missing}" ]; then
      continue
    fi
    last_snapshot="$current_snapshot"

    # Yeni aşama var mı kontrol et
    local new_stage=$(get_latest_stage)
    local old_stage=$(cat "$STAGE_FILE" 2>/dev/null || echo "0")

    if [ "$new_stage" != "$old_stage" ] && [ "$new_stage" -gt "$old_stage" ] 2>/dev/null; then
      # Pipeline zaten çalışıyor mu?
      if is_running; then
        echo "$(date '+%H:%M:%S') Asama $new_stage algilandi ama pipeline zaten calisiyor, bekleniyor." >> "$LOG_FILE"
        continue
      fi

      echo "$new_stage" > "$STAGE_FILE"
      echo "$(date '+%H:%M:%S') === YENI ASAMA: $new_stage ===" >> "$LOG_FILE"

      notify "Yeni Asama Algilandi: $new_stage" "Pipeline basliyor..." "default" "gear"
      # Telegram bildirimi
      if [ -f "scripts/telegram-bot.sh" ]; then
        ./scripts/telegram-bot.sh send "⚙️ *Codex yeni gorev verdi: Asama $new_stage*
Pipeline basliyor..." 2>/dev/null || true
      fi

      # Lock al
      echo $$ > "$LOCK_FILE"

      # Pipeline çalıştır (autonomous-loop aktifse atla)
      if _should_skip_pipeline; then
        echo "$(date '+%H:%M:%S') autonomous-loop aktif — pipeline delegated" >> "$LOG_FILE"
      else
        echo "$(date '+%H:%M:%S') Pipeline baslatiliyor..." >> "$LOG_FILE"
        if ./scripts/orchestrator.sh run >> "$LOG_FILE" 2>&1; then
          echo "$(date '+%H:%M:%S') Pipeline BASARILI" >> "$LOG_FILE"
          notify "Asama $new_stage Tamamlandi" "Pipeline basariyla bitti. reviews/ klasorunu incele." "default" "white_check_mark"
          [ -f "scripts/telegram-bot.sh" ] && ./scripts/telegram-bot.sh send "✅ *Asama $new_stage tamamlandi!*
Pipeline basariyla bitti. Sonuclari /log ile gorebilirsin." 2>/dev/null || true
        else
          echo "$(date '+%H:%M:%S') Pipeline HATA" >> "$LOG_FILE"
          notify "HATA: Asama $new_stage" "Pipeline hataya dustu! Terminali kontrol et." "urgent" "x"
          [ -f "scripts/telegram-bot.sh" ] && ./scripts/telegram-bot.sh send "❌ *HATA: Asama $new_stage*
Pipeline hataya dustu! Terminali kontrol et." 2>/dev/null || true
        fi
      fi

      # Lock bırak
      rm -f "$LOCK_FILE"

    else
      echo "$(date '+%H:%M:%S') Dosya degisti ama yeni asama yok (hala: $old_stage)" >> "$LOG_FILE"
    fi
  done
}

LAUNCHD_LABEL="ai.hellotalent.autopilot"
PLIST_PATH="$HOME/Library/LaunchAgents/${LAUNCHD_LABEL}.plist"

# ── launchd üzerinden mi çalışıyor kontrol ──
is_launchd_active() {
  launchctl list 2>/dev/null | grep -q "$LAUNCHD_LABEL"
}

get_launchd_pid() {
  launchctl list 2>/dev/null | grep "$LAUNCHD_LABEL" | awk '{print $1}' | grep -v '^-$' || echo ""
}

case "${1:-help}" in
  start)
    # Launchd plist varsa onu kullan (terminal-bagimsiz)
    if [ -f "$PLIST_PATH" ]; then
      if is_launchd_active; then
        lpid=$(get_launchd_pid)
        echo "Autopilot zaten çalışıyor (launchd, PID: ${lpid:-?})"
        exit 0
      fi
      launchctl load "$PLIST_PATH" 2>/dev/null
      sleep 1
      if is_launchd_active; then
        lpid=$(get_launchd_pid)
        echo "✅ Autopilot başlatıldı (launchd, PID: ${lpid:-?})"
      else
        echo "⚠️ launchd load edildi ama servis henüz aktif değil. Log: $LOG_FILE"
      fi
    else
      # Fallback: nohup + setsid (launchd kurulmamışsa veya FDA yoksa)
      if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
        echo "Autopilot zaten çalışıyor (PID: $(cat "$PID_FILE"))"
        exit 0
      fi
      echo "Autopilot başlatılıyor..."
      # setsid: yeni session oluştur, terminal kapansa bile devam etsin
      if command -v setsid &>/dev/null; then
        setsid "$0" _watch >> "$LOG_FILE" 2>&1 &
      else
        nohup "$0" _watch >> "$LOG_FILE" 2>&1 &
      fi
      echo $! > "$PID_FILE"
      disown $! 2>/dev/null || true
      echo "Autopilot aktif (PID: $!)"
    fi
    echo ""
    echo "  Codex AI-COLLAB.md'ye yeni aşama yazdığında pipeline otomatik çalışacak."
    echo "  Bitince telefonuna bildirim gelecek."
    echo ""
    echo "  Durdurmak için: ./scripts/autopilot.sh stop"
    echo "  Log görmek için: ./scripts/autopilot.sh log"
    ;;

  stop)
    # Launchd varsa onu durdur
    if [ -f "$PLIST_PATH" ] && is_launchd_active; then
      launchctl unload "$PLIST_PATH" 2>/dev/null || true
      echo "Autopilot durduruldu (launchd)."
      notify "Autopilot Durdu" "Izleme kapandi." "low" "stop_sign"
    elif [ -f "$PID_FILE" ]; then
      pid=$(cat "$PID_FILE")
      kill "$pid" 2>/dev/null || true
      pkill -P "$pid" 2>/dev/null || true
      rm -f "$PID_FILE" "$LOCK_FILE"
      echo "Autopilot durduruldu (nohup)."
      notify "Autopilot Durdu" "Izleme kapandi." "low" "stop_sign"
    else
      echo "Autopilot çalışmıyor."
    fi
    # Orphan cleanup
    pkill -f "fswatch -o docs/AI-COLLAB.md" 2>/dev/null || true
    pkill -f "scripts/autopilot.sh _watch" 2>/dev/null || true
    rm -f "$PID_FILE" "$LOCK_FILE"
    ;;

  status)
    # Launchd check (öncelikli)
    if [ -f "$PLIST_PATH" ] && is_launchd_active; then
      lpid=$(get_launchd_pid)
      echo "✅ Autopilot çalışıyor (launchd, PID: ${lpid:-service})"
      echo "   Aktif aşama: $(cat "$STAGE_FILE" 2>/dev/null || echo "?")"
      echo "   Pipeline: $(is_running && echo "ÇALIŞIYOR" || echo "bekliyor")"
      echo "   Mod: launchd (terminal-bağımsız, crash-recovery aktif)"
    # Nohup fallback check
    elif [ -f "$PID_FILE" ]; then
      pid=$(cat "$PID_FILE")
      if kill -0 "$pid" 2>/dev/null; then
        echo "✅ Autopilot çalışıyor (nohup, PID: $pid)"
        echo "   Aktif aşama: $(cat "$STAGE_FILE" 2>/dev/null || echo "?")"
        echo "   Pipeline: $(is_running && echo "ÇALIŞIYOR" || echo "bekliyor")"
        echo "   Mod: nohup (terminal bağımlı — kalıcılık için: ./scripts/setup-launchd.sh install)"
      else
        rm -f "$PID_FILE"
        echo "❌ Autopilot çalışmıyor (stale PID temizlendi)."
      fi
    else
      echo "❌ Autopilot çalışmıyor."
    fi
    ;;

  log)
    tail -30 "$LOG_FILE" 2>/dev/null || echo "Log bulunamadı."
    ;;

  _watch)
    # İç komut — doğrudan çağırma
    # Singleton guard: başka bir _watch (farklı PID) zaten çalışıyorsa başlatma
    if [ -f "$PID_FILE" ]; then
      existing_pid=$(cat "$PID_FILE" 2>/dev/null || echo "")
      if [ -n "$existing_pid" ] && [ "$existing_pid" != "$$" ] && kill -0 "$existing_pid" 2>/dev/null; then
        echo "$(date '+%H:%M:%S') _watch: zaten calisiyor (PID: $existing_pid), ikinci instance baslatilmiyor." >> "$LOG_FILE"
        exit 0
      fi
    fi
    # Kendi PID'imizi yaz — start/status/stop bizi doğru takip etsin
    echo $$ > "$PID_FILE"
    watch_loop
    ;;

  *)
    echo ""
    echo "HelloTalent Autopilot — Tam Otonom Pipeline"
    echo ""
    echo "Kullanım:"
    echo "  $0 start     Arka planda izlemeye başla"
    echo "  $0 stop      Durdur"
    echo "  $0 status    Durum kontrol"
    echo "  $0 log       Son loglar"
    echo ""
    echo "Nasıl çalışır:"
    echo "  1. Autopilot AI-COLLAB.md'yi izler"
    echo "  2. Codex yeni 'Claude Icin Gorev' aşaması yazınca algılar"
    echo "  3. Pipeline otomatik başlar (Grok → Claude → DeepSeek → Test → Gemini → Grok)"
    echo "  4. Bitince telefonuna bildirim gelir"
    echo "  5. Codex sonucu görür, yeni aşama yazar → döngü devam eder"
    echo ""
    ;;
esac
