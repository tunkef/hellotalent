#!/bin/bash
# ═══════════════════════════════════════════════════
# HelloTalent Telegram Bot — Pipeline Remote Control
# Telefondan komut al, sonuç gönder.
#
#   ./scripts/telegram-bot.sh start    → Botu başlat (arka plan)
#   ./scripts/telegram-bot.sh stop     → Durdur
#   ./scripts/telegram-bot.sh send "mesaj"  → Manuel mesaj gönder
#   ./scripts/telegram-bot.sh status   → Çalışıyor mu
# ═══════════════════════════════════════════════════

set -euo pipefail
cd "$(dirname "$0")/.."

# Load env variables from .env.local if exists
[ -f .env.local ] && set -a && . .env.local && set +a

BOT_TOKEN="${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN env variable gerekli.}"
CHAT_ID="${TELEGRAM_CHAT_ID:-8754557605}"
API="https://api.telegram.org/bot$BOT_TOKEN"
PID_FILE=".telegram-bot.pid"
OFFSET_FILE=".telegram-bot.offset"
LOG_FILE="reviews/telegram-bot.log"
COLLAB_FILE="docs/AI-COLLAB.md"

mkdir -p reviews

# State machine
source "$(dirname "$0")/state.sh" 2>/dev/null || true
INBOX_FILE=".telegram-inbox"

# ── Mesaj gönder ──
send_msg() {
  local text="$1"
  local parse_mode="${2:-Markdown}"
  curl -s -o /dev/null -X POST "$API/sendMessage" \
    -d "chat_id=$CHAT_ID" \
    -d "text=$text" \
    -d "parse_mode=$parse_mode" 2>/dev/null || true
}

# ── Dosya gönder ──
send_file() {
  local file="$1"
  local caption="${2:-}"
  if [ -f "$file" ]; then
    curl -s -o /dev/null -X POST "$API/sendDocument" \
      -F "chat_id=$CHAT_ID" \
      -F "document=@$file" \
      -F "caption=$caption" 2>/dev/null || true
  fi
}

get_latest_stage() {
  # Sadece "## N. Claude Icin Gorev" görev başlıklarını okur.
  grep -E '^## [0-9]+\. Claude Icin Gorev' "$COLLAB_FILE" 2>/dev/null \
    | grep -oE 'A[sş]ama [0-9]+' | grep -oE '[0-9]+' | sort -n | tail -1 || echo "0"
}

append_codex_note() {
  local note="$1"
  local ts
  ts=$(date '+%d %b %Y %H:%M')
  {
    echo ""
    echo "## Remote Mesaj - Codex ($ts)"
    echo "Kaynak: Telegram"
    echo "Durum: Codex review bekliyor"
    echo ""
    echo "Mesaj:"
    echo "$note"
  } >> "$COLLAB_FILE"
}

append_remote_stage() {
  local note="$1"
  local next_stage
  local ts
  next_stage=$(( $(get_latest_stage) + 1 ))
  ts=$(date '+%d %b %Y %H:%M')
  {
    echo ""
    echo "## Claude Icin Gorev - Asama $next_stage"
    echo "Kaynak: Telegram / Kullanici"
    echo "Tarih: $ts"
    echo ""
    echo "Hedef:"
    echo "- $note"
    echo ""
    echo "Kurallar:"
    echo "- Scope disina cikma"
    echo "- Bitince \`docs/AI-COLLAB.md\` guncelle"
    echo "- Gerekli testleri calistir"
    echo "- Sonra bekle"
  } >> "$COLLAB_FILE"
  echo "$next_stage"
}

# ── Komut işle ──
handle_command() {
  local cmd="$1"
  local text="$2"
  local args="${text#"$cmd"}"
  args="${args# }"

  case "$cmd" in
    /start)
      send_msg "🚀 *HelloTalent Pipeline Bot*

Komutlar:
/status — Pipeline ve autopilot durumu
/run — Pipeline'ı başlat
/stop — Autopilot'u durdur
/log — Son review sonuçları
/brief — Grok briefing
/review — DeepSeek code review
/codex <mesaj> — Codex'e not bırak
/stage <gorev> — Yeni Claude asamasi ac
/agents — Tüm agent durumu
/help — Bu mesaj"
      ;;

    /status|/durum)
      local autopilot="Kapali"
      if [ -f ".autopilot.pid" ] && kill -0 "$(cat .autopilot.pid)" 2>/dev/null; then
        autopilot="Aktif"
      fi
      local summary=""
      if type state_summary &>/dev/null; then
        summary=$(state_summary)
      else
        summary="Asama: $(get_latest_stage)
Son commit: $(git log --oneline -1 2>/dev/null || echo '?')"
      fi

      send_msg "Pipeline Durumu

Autopilot: $autopilot
$summary

Komut olmadan mesaj yazarsan yeni yon/gorev olarak algilarim."
      ;;

    /run)
      send_msg "⚙️ Pipeline başlatılıyor..."
      if [ -f "scripts/orchestrator.sh" ]; then
        nohup ./scripts/orchestrator.sh run >> reviews/orchestrator-telegram.log 2>&1 &
        send_msg "🔨 Pipeline arka planda çalışıyor. Bitince bildirim gelecek."
      else
        send_msg "❌ orchestrator.sh bulunamadı"
      fi
      ;;

    /stop)
      if [ -f "scripts/autopilot.sh" ]; then
        ./scripts/autopilot.sh stop 2>/dev/null
        send_msg "🛑 Autopilot durduruldu."
      else
        send_msg "❌ autopilot.sh bulunamadı"
      fi
      ;;

    /log)
      local latest=$(ls -t reviews/diff-review-*.md reviews/deep-*.md reviews/claude-impl-*.md 2>/dev/null | head -1)
      if [ -n "$latest" ]; then
        # İlk 500 karakteri gönder
        local preview=$(head -c 500 "$latest")
        send_msg "📝 *Son Review:* \`$(basename "$latest")\`

$preview..."
        send_file "$latest" "Tam sonuç"
      else
        send_msg "📝 Henüz review sonucu yok."
      fi
      ;;

    /brief)
      send_msg "📋 Grok briefing hazırlanıyor..."
      if [ -f "scripts/grok-context.sh" ]; then
        ./scripts/grok-context.sh brief 2>/dev/null
        local brief=$(ls -t reviews/brief-*.md 2>/dev/null | head -1)
        if [ -n "$brief" ]; then
          local content=$(head -c 1000 "$brief")
          send_msg "$content"
        fi
      else
        send_msg "❌ grok-context.sh bulunamadı"
      fi
      ;;

    /review)
      send_msg "🔍 DeepSeek review başlatılıyor..."
      if [ -f "scripts/deepseek-review.sh" ]; then
        ./scripts/deepseek-review.sh diff 2>/dev/null
        local rev=$(ls -t reviews/diff-review-*.md 2>/dev/null | head -1)
        if [ -n "$rev" ]; then
          send_file "$rev" "DeepSeek Code Review"
        fi
        send_msg "✅ Review tamamlandı."
      else
        send_msg "❌ deepseek-review.sh bulunamadı"
      fi
      ;;

    /agents)
      local agents=""
      agents+="🤖 *Agent Durumu*\n\n"
      agents+="Codex: $(ls /Applications/Codex.app &>/dev/null && echo '✅' || echo '❌') Masaüstü\n"
      agents+="Claude: $(which claude &>/dev/null && echo '✅' || echo '❌') CLI\n"
      agents+="Gemini: $(which gemini &>/dev/null && echo '✅' || echo '❌') CLI\n"
      agents+="DeepSeek: $([ -f scripts/deepseek-review.sh ] && echo '✅' || echo '❌') Script\n"
      agents+="Grok: $([ -f scripts/grok-context.sh ] && echo '✅' || echo '❌') Script\n"
      agents+="Groq: $([ -f scripts/groq-helper.sh ] && echo '✅' || echo '❌') Script\n"
      agents+="Cerebras: $([ -f scripts/cerebras-review.sh ] && echo '✅' || echo '❌') Script\n"
      agents+="OpenRouter: $([ -f scripts/openrouter-fallback.sh ] && echo '✅' || echo '❌') Script"
      send_msg "$agents"
      ;;

    /codex)
      if [ -z "$args" ]; then
        send_msg "Kullanim: /codex Profil tarafinda su isi incele"
        return
      fi
      append_codex_note "$args"
      send_msg "🧠 Codex notu AI-COLLAB'a eklendi.

Not:
- Bu mesaj pipeline'i tetiklemez
- Codex sonraki review turunda bunu okuyacak"
      ;;

    /stage)
      if [ -z "$args" ]; then
        send_msg "Kullanim: /stage Profil free-tier polish paketini baslat"
        return
      fi
      local stage_num
      stage_num=$(append_remote_stage "$args")
      local autopilot="kapali"
      if [ -f ".autopilot.pid" ] && kill -0 "$(cat .autopilot.pid)" 2>/dev/null; then
        autopilot="aktif"
      fi
      send_msg "⚙️ Yeni gorev AI-COLLAB'a yazildi: *Asama $stage_num*

Durum:
- Autopilot: $autopilot

Not:
- Autopilot aktifse pipeline otomatik baslayacak
- Degilse /run ile manuel baslatabilirsin"
      ;;

    /help)
      handle_command "/start" ""
      ;;

    go|dont|"don't"|stop)
      # Gate commands — telegram-gate.sh handles these via its own polling.
      # Do NOT reply "bilinmeyen komut"; silently acknowledge.
      send_msg "🚦 Gate komutu alındı: $cmd"
      ;;

    *)
      # Free-text: komut olmayan mesajlar = yeni yön/görev/feedback
      if [[ "$text" =~ ^/ ]]; then
        send_msg "Bilinmeyen komut. /help yaz."
      else
        # Kullanıcı serbest metin yazdı — inbox'a yaz, state güncelle
        local ts
        ts=$(date '+%Y-%m-%d %H:%M')
        echo "[$ts] $text" >> "$INBOX_FILE"
        if type state_set &>/dev/null; then
          state_set "pending_input" "$text"
        fi

        local current_phase=""
        if type state_read &>/dev/null; then
          current_phase=$(state_read "phase")
        fi

        case "$current_phase" in
          waiting_approval)
            # Onay bekleniyorsa mesajı "onayla" veya "değiştir" olarak yorumla
            if echo "$text" | grep -qiE '^(tamam|ok|onayla|devam|evet|go|basla)'; then
              state_set_phase "implementing"
              send_msg "Onay alindi! Uygulama basliyor."
            else
              send_msg "Mesajin alindi. Plan guncellenecek:
$text

Onaylamak icin: tamam / devam / ok
Degistirmek icin: mesajini yaz"
            fi
            ;;
          implementing)
            send_msg "Mesajin alindi. Su an uygulama devam ediyor.
Bitince bu notu dikkate alacagim:
$text"
            ;;
          *)
            # idle veya diger — yeni görev olarak kaydet
            send_msg "Mesajin alindi ve kaydedildi:
$text

Bunu yeni gorev olarak islememi istersen: /stage $text
Sadece not olarak birakmak istersen bir sey yapmana gerek yok."
            ;;
        esac
      fi
      ;;
  esac
}

# ── Polling döngüsü ──
poll_loop() {
  echo "$(date '+%H:%M:%S') Telegram bot başlatıldı" >> "$LOG_FILE"
  send_msg "🟢 Bot aktif! /help yaz."

  local offset=$(cat "$OFFSET_FILE" 2>/dev/null || echo "0")

  while true; do
    local response=$(curl -s "$API/getUpdates?offset=$offset&timeout=30" 2>/dev/null)
    local updates=$(echo "$response" | jq -r '.result | length' 2>/dev/null || echo "0")

    if [ "$updates" -gt 0 ]; then
      for i in $(seq 0 $((updates - 1))); do
        local update_id=$(echo "$response" | jq -r ".result[$i].update_id")
        local msg_text=$(echo "$response" | jq -r ".result[$i].message.text // empty")
        local sender_id=$(echo "$response" | jq -r ".result[$i].message.chat.id // empty")

        # Sadece bizim chat'ten gelen mesajları işle
        if [ "$sender_id" = "$CHAT_ID" ] && [ -n "$msg_text" ]; then
          local cmd=$(echo "$msg_text" | awk '{print $1}')
          echo "$(date '+%H:%M:%S') Komut: $cmd" >> "$LOG_FILE"
          handle_command "$cmd" "$msg_text"
        fi

        offset=$((update_id + 1))
        echo "$offset" > "$OFFSET_FILE"
      done
    fi
  done
}

case "${1:-help}" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "Telegram bot zaten çalışıyor (PID: $(cat "$PID_FILE"))"
      exit 0
    fi
    echo "Telegram bot başlatılıyor..."
    nohup bash -c "cd $(pwd) && ./scripts/telegram-bot.sh _poll" >> "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    echo "Bot aktif (PID: $!)"
    echo "Telegram'da @Hellotalent_pipeline_bot'a /help yaz"
    ;;

  stop)
    if [ -f "$PID_FILE" ]; then
      kill "$(cat "$PID_FILE")" 2>/dev/null || true
      rm -f "$PID_FILE"
      echo "Telegram bot durduruldu."
      send_msg "🔴 Bot kapatıldı."
    else
      echo "Bot çalışmıyor."
    fi
    ;;

  send)
    send_msg "${2:-Test mesajı}"
    ;;

  status)
    if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
      echo "✅ Telegram bot çalışıyor (PID: $(cat "$PID_FILE"))"
    else
      echo "❌ Telegram bot çalışmıyor."
    fi
    ;;

  _poll)
    poll_loop
    ;;

  *)
    echo "Telegram Bot — Pipeline Remote Control"
    echo ""
    echo "  $0 start          Botu başlat"
    echo "  $0 stop           Durdur"
    echo "  $0 send \"mesaj\"  Manuel mesaj gönder"
    echo "  $0 status         Durum"
    ;;
esac
