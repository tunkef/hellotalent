#!/usr/bin/env bash
# codex-bridge.sh — Interfaces with Codex desktop app via Computer Use
# Actual Computer Use interaction is delegated to stub functions
# that Claude Code overrides at runtime.

set -euo pipefail

# ── Defaults ────────────────────────────────────────────────────────────────
BRIDGE_LOG="${BRIDGE_LOG:-reviews/codex-bridge.log}"
CODEX_READ_TIMEOUT="${CODEX_READ_TIMEOUT:-600}"
CODEX_READ_INTERVAL="${CODEX_READ_INTERVAL:-10}"
CODEX_MAX_RETRIES=3
COLLAB_FILE="${COLLAB_FILE:-docs/AI-COLLAB.md}"
COLLAB_HASH_FILE="${COLLAB_HASH_FILE:-.collab-hash}"
COLLAB_STAGE_FILE="${COLLAB_STAGE_FILE:-.collab-last-stage}"

# ── Logging ──────────────────────────────────────────────────────────────────
_bridge_log() {
  local msg="$1"
  local log_dir
  log_dir="$(dirname "$BRIDGE_LOG")"
  if [ "$log_dir" != "." ] && [ ! -d "$log_dir" ]; then
    mkdir -p "$log_dir"
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $msg" >> "$BRIDGE_LOG"
}

# ── Validation ───────────────────────────────────────────────────────────────
_validate_report_args() {
  local summary="${1:-}"
  if [ -z "$summary" ]; then
    echo "ERROR: summary argument is required" >&2
    return 1
  fi
  return 0
}

_validate_feedback_args() {
  local original="${1:-}"
  local comment="${2:-}"
  if [ -z "$original" ] || [ -z "$comment" ]; then
    echo "ERROR: both original and comment arguments are required" >&2
    return 1
  fi
  return 0
}

# ── Formatting ────────────────────────────────────────────────────────────────
_format_report_message() {
  local summary="$1"
  printf '%s\n\nSonraki asamayi yaz' "$summary"
}

_format_feedback_message() {
  local original="$1"
  local comment="$2"
  printf 'Kullanici mesaji: %s\n\nClaude notu: %s' "$original" "$comment"
}

# ── Computer Use stubs (overridden at runtime) ────────────────────────────────
_open_codex_app() {
  local attempt=0
  while [ "$attempt" -lt "$CODEX_MAX_RETRIES" ]; do
    attempt=$((attempt + 1))
    _bridge_log "Opening Codex app (attempt $attempt/$CODEX_MAX_RETRIES)"
    if osascript -e 'tell application "Codex" to activate' 2>/dev/null; then
      _bridge_log "Codex app activated"
      return 0
    fi
    sleep 2
  done
  _bridge_log "ERROR: Failed to open Codex app after $CODEX_MAX_RETRIES attempts"
  return 1
}

_send_to_codex() {
  local message="$1"
  _bridge_log "Sending message to Codex (length=${#message})"

  # Snapshot AI-COLLAB.md state before sending so we can detect Codex's response
  _snapshot_collab_state

  # Activate Codex and type the message using AppleScript + cliclick
  if command -v osascript &>/dev/null; then
    osascript -e 'tell application "Codex" to activate' 2>/dev/null || true
    sleep 1
    # Click on Codex input area
    if command -v cliclick &>/dev/null; then
      cliclick c:1200,445 2>/dev/null || true
      sleep 0.3
      cliclick t:"$message" 2>/dev/null || true
      sleep 0.3
      # Press Return to submit
      osascript -e 'tell application "System Events" to key code 36' 2>/dev/null || true
      _bridge_log "Message sent to Codex via AppleScript+cliclick"
    else
      _bridge_log "cliclick not available, falling back to osascript keystroke"
      osascript -e "tell application \"System Events\" to keystroke \"$message\"" 2>/dev/null || true
      osascript -e 'tell application "System Events" to key code 36' 2>/dev/null || true
      _bridge_log "Message sent to Codex via AppleScript keystroke"
    fi
  else
    _bridge_log "osascript not available, cannot send to Codex"
    return 1
  fi
  return 0
}

_compute_hash() {
  local file="$1"
  if command -v md5 &>/dev/null; then
    md5 -q "$file"
  elif command -v md5sum &>/dev/null; then
    md5sum "$file" | cut -d' ' -f1
  else
    wc -c < "$file" | tr -d ' '
  fi
}

# Extract the highest "Claude Icin Gorev — Asama N" stage number from COLLAB_FILE
_get_max_stage() {
  local file="${1:-$COLLAB_FILE}"
  grep -E '^## [0-9]+\. Claude Icin Gorev' "$file" 2>/dev/null \
    | grep -oE 'A[sş]ama [0-9]+' | grep -oE '[0-9]+' | sort -n | tail -1 || echo "0"
}

# Snapshot current hash + max stage so _check_codex_response can detect genuinely new stages.
_snapshot_collab_state() {
  if [ -f "$COLLAB_FILE" ]; then
    _compute_hash "$COLLAB_FILE" > "$COLLAB_HASH_FILE" 2>/dev/null || true
    _get_max_stage "$COLLAB_FILE" > "$COLLAB_STAGE_FILE" 2>/dev/null || true
  fi
}

_check_codex_response() {
  # Detect a genuinely new "Claude Icin Gorev — Asama X" in AI-COLLAB.md.
  # Non-stage edits (reviews, remote messages, same-stage notes) are ignored.
  if [ ! -f "$COLLAB_FILE" ]; then
    echo ""
    return 1
  fi

  # Quick hash check — skip expensive grep if file unchanged
  local current_hash
  current_hash=$(_compute_hash "$COLLAB_FILE")
  local stored_hash=""
  if [ -f "$COLLAB_HASH_FILE" ]; then
    stored_hash=$(cat "$COLLAB_HASH_FILE" 2>/dev/null || echo "")
  fi
  if [ "$current_hash" = "$stored_hash" ]; then
    echo ""
    return 1
  fi

  # File changed — check if max stage number actually increased
  local current_max_stage
  current_max_stage=$(_get_max_stage "$COLLAB_FILE")
  local stored_max_stage="0"
  if [ -f "$COLLAB_STAGE_FILE" ]; then
    stored_max_stage=$(cat "$COLLAB_STAGE_FILE" 2>/dev/null || echo "0")
  fi

  if [ "$current_max_stage" -gt "$stored_max_stage" ] 2>/dev/null; then
    _bridge_log "Codex response detected: new stage $current_max_stage (was $stored_max_stage)"
    echo "$current_max_stage"
    return 0
  fi

  # Hash changed but no new stage — non-stage edit, ignore
  echo ""
  return 1
}

# ── Polling ──────────────────────────────────────────────────────────────────
_read_with_timeout() {
  local elapsed=0
  local response

  while [ "$elapsed" -lt "$CODEX_READ_TIMEOUT" ]; do
    response="$(_check_codex_response)"
    if [ -n "$response" ]; then
      echo "$response"
      return 0
    fi
    sleep "$CODEX_READ_INTERVAL"
    elapsed=$((elapsed + CODEX_READ_INTERVAL))
  done

  echo "TIMEOUT"
  return 1
}

# ── CLI ───────────────────────────────────────────────────────────────────────
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  command="${1:-}"

  case "$command" in
    report)
      summary="${2:-}"
      _validate_report_args "$summary"
      msg="$(_format_report_message "$summary")"
      _bridge_log "report: $summary"
      _open_codex_app
      _send_to_codex "$msg"
      ;;
    read)
      _bridge_log "read: waiting for Codex response"
      _read_with_timeout
      ;;
    send-user-feedback)
      original="${2:-}"
      comment="${3:-}"
      _validate_feedback_args "$original" "$comment"
      msg="$(_format_feedback_message "$original" "$comment")"
      _bridge_log "send-user-feedback: $original"
      _open_codex_app
      _send_to_codex "$msg"
      ;;
    *)
      echo "Usage: $0 {report <summary>|read|send-user-feedback <original> <comment>}" >&2
      exit 1
      ;;
  esac
fi
