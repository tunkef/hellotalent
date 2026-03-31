#!/usr/bin/env bash
set -euo pipefail

# Load .env.local if exists
if [ -f ".env.local" ]; then
  # shellcheck disable=SC1091
  source ".env.local"
fi

# Environment variables with defaults
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
CHAT_ID="${TELEGRAM_CHAT_ID:-8754557605}"
GATE_OFFSET_FILE="${GATE_OFFSET_FILE:-.telegram-gate.offset}"
LOG_FILE="reviews/telegram-gate.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

_log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE" 2>/dev/null || true
}

# _send <text> — sends Telegram message with 3 retries, falls back to macOS notification
_send() {
  local text="$1"
  local api_url="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage"
  local attempt=0
  local max_attempts=3

  while [ $attempt -lt $max_attempts ]; do
    attempt=$((attempt + 1))
    local response
    response=$(curl -s -X POST "$api_url" \
      -d "chat_id=${CHAT_ID}" \
      --data-urlencode "text=${text}" \
      2>/dev/null) || true

    if echo "$response" | grep -q '"ok":true'; then
      _log "Message sent successfully on attempt $attempt"
      return 0
    fi
    _log "Send attempt $attempt failed"
    sleep 1 2>/dev/null || true
  done

  # Fallback to macOS notification
  _log "Telegram failed after $max_attempts attempts, falling back to macOS notification"
  if command -v osascript &>/dev/null; then
    osascript -e "display notification \"${text}\" with title \"HelloTalent Gate\"" 2>/dev/null || true
  fi
  return 1
}

# _notify <stage_no> <summary_file> — reads summary file and sends formatted Telegram message
_notify() {
  local stage_no="$1"
  local summary_file="$2"

  if [ ! -f "$summary_file" ]; then
    _log "Summary file not found: $summary_file"
    return 1
  fi

  local content
  content=$(cat "$summary_file")

  local message
  message="$(printf "🚦 *Stage %s — Onay Gerekiyor*\n\n%s\n\n✅ Devam etmek için: go\n🛑 Durdurmak için: dont" \
    "$stage_no" "$content")"

  _send "$message"
}

# _wait_for_approval — polls Telegram getUpdates API, returns GO / DONT / FEEDBACK:<text>
_wait_for_approval() {
  local api_base="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"
  local offset=0
  local _curl_tmp
  _curl_tmp=$(mktemp)

  if [ -f "$GATE_OFFSET_FILE" ]; then
    offset=$(cat "$GATE_OFFSET_FILE" 2>/dev/null || echo "0")
  fi

  while true; do
    # Use a temp file instead of $() so mock curl's call_count persists in the parent shell
    curl -s "${api_base}/getUpdates?offset=${offset}&timeout=30" > "$_curl_tmp" 2>/dev/null || true
    local response
    response=$(cat "$_curl_tmp")

    # Count updates
    local result_count
    result_count=$(echo "$response" | grep -o '"update_id"' | wc -l | tr -d ' ') || result_count=0

    if [ "$result_count" -eq 0 ]; then
      # No updates, continue polling
      continue
    fi

    # Parse updates: uid|cid|txt per line
    local parsed
    if command -v python3 &>/dev/null; then
      parsed=$(python3 - "$response" "$CHAT_ID" <<'PYEOF'
import sys, json
data = json.loads(sys.argv[1])
for update in data.get("result", []):
    uid = update.get("update_id")
    msg = update.get("message", {})
    cid = msg.get("chat", {}).get("id")
    text = msg.get("text", "")
    print(f"{uid}|{cid}|{text}")
PYEOF
) || parsed=""
    else
      # Fallback: regex-based parsing
      parsed=$(echo "$response" | grep -oE '"update_id":[0-9]+.*?"text":"[^"]*"' | \
        while IFS= read -r line; do
          uid=$(echo "$line" | grep -oE '"update_id":[0-9]+' | grep -oE '[0-9]+')
          cid=$(echo "$line" | grep -oE '"id":[0-9]+' | head -1 | grep -oE '[0-9]+')
          txt=$(echo "$line" | grep -oE '"text":"[^"]*"' | sed 's/"text":"//;s/"$//')
          echo "${uid}|${cid}|${txt}"
        done) || parsed=""
    fi

    while IFS='|' read -r uid cid txt; do
      [ -z "$uid" ] && continue

      local next_offset=$((uid + 1))

      # Update offset file regardless (including skipped chat IDs)
      echo "$next_offset" > "$GATE_OFFSET_FILE"
      offset=$next_offset

      # Only process messages from our CHAT_ID
      if [ "$cid" != "$CHAT_ID" ]; then
        _log "Ignoring message from chat $cid (expected $CHAT_ID)"
        continue
      fi

      _log "Received message from $cid: $txt"

      local lower_txt
      lower_txt=$(echo "$txt" | tr '[:upper:]' '[:lower:]')

      if [ "$lower_txt" = "go" ]; then
        rm -f "$_curl_tmp"
        echo "GO"
        return 0
      elif [ "$lower_txt" = "dont" ] || [ "$lower_txt" = "don't" ] || [ "$lower_txt" = "stop" ]; then
        rm -f "$_curl_tmp"
        echo "DONT"
        return 0
      else
        rm -f "$_curl_tmp"
        echo "FEEDBACK:${txt}"
        return 0
      fi

    done <<< "$parsed"

  done
  rm -f "$_curl_tmp"
}

# CLI entry point — only runs when executed directly (not sourced)
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  case "${1:-}" in
    notify)
      _notify "${2:-}" "${3:-}"
      ;;
    wait)
      _wait_for_approval
      ;;
    *)
      echo "Usage: $0 notify <stage_no> <summary_file>"
      echo "       $0 wait"
      exit 1
      ;;
  esac
fi
