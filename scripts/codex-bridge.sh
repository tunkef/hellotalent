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
  # Placeholder — override with Computer Use implementation at runtime
  _bridge_log "STUB: _send_to_codex called with message length ${#message}"
  return 0
}

_check_codex_response() {
  # Placeholder — returns empty string by default
  # Override with Computer Use implementation at runtime
  echo ""
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
