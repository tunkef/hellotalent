#!/usr/bin/env bash
# autonomous-loop.sh — State machine orchestrating the full autonomous pipeline loop
# States: IDLE → PIPELINE → REPORT → WAIT_CODEX → GATE → (GO→PIPELINE / DONT→IDLE / FEEDBACK→WAIT_CODEX)

set -euo pipefail

# ── Project Root ─────────────────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  cd "$PROJECT_ROOT"
fi

# Load env if available
[ -f .env.local ] && set -a && . .env.local && set +a 2>/dev/null || true

# ── Defaults ────────────────────────────────────────────────────────────────
STATE_FILE="${STATE_FILE:-.autonomous-loop.state}"
LOOP_PID_FILE="${LOOP_PID_FILE:-.autonomous-loop.pid}"
LOG_FILE="${LOG_FILE:-reviews/autonomous-loop.log}"
COLLAB_FILE="${COLLAB_FILE:-docs/AI-COLLAB.md}"
STAGE_FILE="${STAGE_FILE:-.autopilot.stage}"
LAST_STAGE_FILE="${LAST_STAGE_FILE:-.autopilot.last_stage}"
CODEX_MAX_WAIT_RETRIES="${CODEX_MAX_WAIT_RETRIES:-20}"
VALID_STATES="IDLE PIPELINE REPORT WAIT_CODEX GATE"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

# ── Logging ──────────────────────────────────────────────────────────────────
_loop_log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE" 2>/dev/null || true
}

# ── State Management ─────────────────────────────────────────────────────────
_get_state() {
  if [ -f "$STATE_FILE" ]; then
    cat "$STATE_FILE"
  else
    echo "IDLE"
  fi
}

_set_state() {
  local new_state="${1:-}"
  # Validate state
  local valid=0
  local s
  for s in $VALID_STATES; do
    if [ "$s" = "$new_state" ]; then
      valid=1
      break
    fi
  done
  if [ "$valid" -eq 0 ]; then
    echo "ERROR: Invalid state '$new_state'. Valid states: $VALID_STATES" >&2
    return 1
  fi
  echo "$new_state" > "$STATE_FILE"
  _loop_log "State → $new_state"
}

# ── Stage Parsing ─────────────────────────────────────────────────────────────
_extract_stage_summary() {
  local collab_file="${1:-}"
  local stage_no="${2:-}"

  if [ ! -f "$collab_file" ]; then
    echo "ERROR: collab file not found: $collab_file" >&2
    return 1
  fi

  # Extract text from the ## header line matching "Asama <N>" up to the next ## header.
  # Requires the match line to start with "## " to avoid bullet-point false positives.
  awk "/^## .*Asama ${stage_no}([ \t]|$)/{found=1} found && /^## / && !/Asama ${stage_no}/{exit} found{print}" "$collab_file"
}

# ── Stage Change Detection ────────────────────────────────────────────────────
# Returns 0 (true) only when STAGE_FILE contains a stage number that differs
# from the last stage written to LAST_STAGE_FILE.  This prevents the loop from
# re-entering PIPELINE for a stage it already dispatched (stale replay guard).
_is_new_stage() {
  if [ ! -f "$STAGE_FILE" ]; then
    return 1
  fi
  local current_stage
  current_stage=$(cat "$STAGE_FILE" 2>/dev/null || echo "")
  if [ -z "$current_stage" ]; then
    return 1
  fi
  local last_stage=""
  if [ -f "$LAST_STAGE_FILE" ]; then
    last_stage=$(cat "$LAST_STAGE_FILE" 2>/dev/null || echo "")
  fi
  if [ "$current_stage" = "$last_stage" ]; then
    return 1
  fi
  return 0
}

# Record the current stage as processed so _is_new_stage will ignore it.
_mark_stage_processed() {
  local stage_no
  stage_no=$(cat "$STAGE_FILE" 2>/dev/null || echo "")
  echo "$stage_no" > "$LAST_STAGE_FILE"
  _loop_log "Stage $stage_no marked as processed"
}

# ── Process Monitoring ───────────────────────────────────────────────────────
_is_active() {
  if [ ! -f "$LOOP_PID_FILE" ]; then
    return 1
  fi
  local pid
  pid=$(cat "$LOOP_PID_FILE" 2>/dev/null || echo "")
  if [ -z "$pid" ]; then
    return 1
  fi
  if kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  return 1
}

# _acquire_lock — atomically check and write PID file.
# Returns 0 on success, 1 if another instance is running.
_acquire_lock() {
  if [ -f "$LOOP_PID_FILE" ]; then
    local existing_pid
    existing_pid=$(cat "$LOOP_PID_FILE" 2>/dev/null || echo "")
    if [ -n "$existing_pid" ] && kill -0 "$existing_pid" 2>/dev/null; then
      echo "autonomous-loop already running (PID=$existing_pid)" >&2
      return 1
    fi
    # Stale PID file — remove it
    rm -f "$LOOP_PID_FILE"
  fi
  echo $$ > "$LOOP_PID_FILE"
  return 0
}

# ── Codex Feedback Dispatch ────────────────────────────────────────────────────
_send_feedback_to_codex() {
  local feedback_text="$1"
  local codex_bridge
  codex_bridge="$(dirname "${BASH_SOURCE[0]}")/codex-bridge.sh"
  if [ -x "$codex_bridge" ]; then
    "$codex_bridge" send-user-feedback "$feedback_text" "Kullanici Telegram uzerinden feedback gonderdi" 2>>"$LOG_FILE" || true
  else
    _loop_log "codex-bridge.sh not found, feedback not sent: $feedback_text"
  fi
}

_dispatch_feedback() {
  local feedback_text="$1"
  _send_feedback_to_codex "$feedback_text"
}

# ── Telegram Notify ───────────────────────────────────────────────────────────
_notify_telegram() {
  local msg="${1:-}"
  local telegram_script
  telegram_script="$(dirname "${BASH_SOURCE[0]}")/telegram-bot.sh"
  if [ -x "$telegram_script" ]; then
    "$telegram_script" send "$msg" 2>/dev/null || true
  else
    _loop_log "telegram-bot.sh not available, skipping notify"
  fi
}

# ── Wait Retry Counter ────────────────────────────────────────────────────────
WAIT_RETRY_COUNT=0

_count_wait_retries() {
  WAIT_RETRY_COUNT=$((WAIT_RETRY_COUNT + 1))
  echo "$WAIT_RETRY_COUNT"
}

_reset_wait_retries() {
  WAIT_RETRY_COUNT=0
}

# ── Gate Result Handler ───────────────────────────────────────────────────────
_handle_gate_result() {
  local result="${1:-}"

  if [ "$result" = "GO" ]; then
    _loop_log "Gate result: GO — proceeding to PIPELINE"
    return 0
  elif [ "$result" = "DONT" ]; then
    _loop_log "Gate result: DONT — stopping loop, setting IDLE"
    _set_state "IDLE"
    return 0
  else
    # FEEDBACK:<text>
    local feedback_text
    feedback_text="${result#FEEDBACK:}"
    _loop_log "Gate result: FEEDBACK — $feedback_text"
    echo "$feedback_text"
    return 0
  fi
}

# ── Main Loop ─────────────────────────────────────────────────────────────────
_main_loop() {
  _loop_log "Main loop started (PID=$$)"
  echo $$ > "$LOOP_PID_FILE"
  _set_state "IDLE"

  local orchestrator
  orchestrator="$(dirname "${BASH_SOURCE[0]}")/orchestrator.sh"
  local codex_bridge
  codex_bridge="$(dirname "${BASH_SOURCE[0]}")/codex-bridge.sh"
  local telegram_gate
  telegram_gate="$(dirname "${BASH_SOURCE[0]}")/telegram-gate.sh"

  # Pre-populate LAST_STAGE_FILE with any existing stage so a cold-start with
  # a stale .autopilot.stage does not immediately fire PIPELINE.
  if [ -f "$STAGE_FILE" ]; then
    local init_stage
    init_stage=$(cat "$STAGE_FILE" 2>/dev/null || echo "")
    if [ -n "$init_stage" ]; then
      echo "$init_stage" > "$LAST_STAGE_FILE"
      _loop_log "Cold-start: existing stage $init_stage pre-marked as processed (no replay)"
    fi
  fi

  while true; do
    local current_state
    current_state=$(_get_state)

    case "$current_state" in
      IDLE)
        # Only enter PIPELINE when a genuinely new stage appears
        if _is_new_stage; then
          local stage_no
          stage_no=$(cat "$STAGE_FILE" 2>/dev/null || echo "")
          _loop_log "New stage detected: $stage_no"
          _mark_stage_processed
          _set_state "PIPELINE"
        else
          sleep 5
        fi
        ;;

      PIPELINE)
        _loop_log "PIPELINE: Running orchestrator ($orchestrator)"
        if [ -x "$orchestrator" ]; then
          _loop_log "PIPELINE: Orchestrator started at $(date '+%H:%M:%S')"
          if "$orchestrator" run 2>>"$LOG_FILE"; then
            _loop_log "PIPELINE: Orchestrator completed successfully"
            _set_state "REPORT"
          else
            local exit_code=$?
            _loop_log "PIPELINE: Orchestrator failed with exit code $exit_code, returning to IDLE"
            _set_state "IDLE"
          fi
        else
          _loop_log "PIPELINE: orchestrator.sh not found or not executable at $orchestrator"
          _set_state "IDLE"
        fi
        ;;

      REPORT)
        _loop_log "Sending report to Codex"
        local stage_no=""
        if [ -f "$STAGE_FILE" ]; then
          stage_no=$(cat "$STAGE_FILE" 2>/dev/null || echo "")
        fi
        local summary
        summary=$(_extract_stage_summary "$COLLAB_FILE" "$stage_no" 2>/dev/null || echo "Stage $stage_no tamamlandi")
        if [ -x "$codex_bridge" ]; then
          if "$codex_bridge" report "$summary" 2>>"$LOG_FILE"; then
            _set_state "WAIT_CODEX"
          else
            _loop_log "codex-bridge report failed, returning to IDLE"
            _set_state "IDLE"
          fi
        else
          _loop_log "codex-bridge.sh not found, skipping to WAIT_CODEX"
          _set_state "WAIT_CODEX"
        fi
        ;;

      WAIT_CODEX)
        _loop_log "Waiting for Codex response (retry $WAIT_RETRY_COUNT/$CODEX_MAX_WAIT_RETRIES)"
        if [ -x "$codex_bridge" ]; then
          if "$codex_bridge" read 2>>"$LOG_FILE"; then
            _reset_wait_retries
            _set_state "GATE"
          else
            _count_wait_retries > /dev/null
            if [ "$WAIT_RETRY_COUNT" -ge "$CODEX_MAX_WAIT_RETRIES" ]; then
              _loop_log "WAIT_CODEX exceeded max retries ($CODEX_MAX_WAIT_RETRIES), falling back to GATE"
              _reset_wait_retries
              _set_state "GATE"
            else
              _loop_log "Codex read timed out or failed, retry $WAIT_RETRY_COUNT/$CODEX_MAX_WAIT_RETRIES"
              sleep 30
            fi
          fi
        else
          _loop_log "codex-bridge.sh not found, advancing to GATE"
          _reset_wait_retries
          _set_state "GATE"
        fi
        ;;

      GATE)
        _loop_log "Running Telegram gate"
        local stage_no=""
        if [ -f "$STAGE_FILE" ]; then
          stage_no=$(cat "$STAGE_FILE" 2>/dev/null || echo "")
        fi
        local summary_file
        summary_file="$(mktemp)"
        _extract_stage_summary "$COLLAB_FILE" "$stage_no" > "$summary_file" 2>/dev/null || echo "Stage $stage_no" > "$summary_file"

        if [ -x "$telegram_gate" ]; then
          "$telegram_gate" notify "$stage_no" "$summary_file" 2>>"$LOG_FILE" || true
          local gate_result
          gate_result=$("$telegram_gate" wait 2>>"$LOG_FILE" || echo "DONT")
          rm -f "$summary_file"

          case "$gate_result" in
            GO)
              _handle_gate_result "GO"
              _set_state "PIPELINE"
              ;;
            DONT)
              _handle_gate_result "DONT"
              # DONT already sets state to IDLE via _handle_gate_result
              ;;
            FEEDBACK:*)
              local feedback
              feedback=$(_handle_gate_result "$gate_result")
              _loop_log "Sending feedback to Codex: $feedback"
              _dispatch_feedback "$feedback"
              _set_state "WAIT_CODEX"
              ;;
            *)
              _loop_log "Unknown gate result: $gate_result, stopping"
              _set_state "IDLE"
              ;;
          esac
        else
          _loop_log "telegram-gate.sh not found, defaulting to DONT"
          rm -f "$summary_file"
          _set_state "IDLE"
        fi
        ;;

      *)
        _loop_log "Unknown state: $current_state, resetting to IDLE"
        _set_state "IDLE"
        ;;
    esac
  done
}

# ── CLI Entry Point ───────────────────────────────────────────────────────────
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  cmd="${1:-}"

  case "$cmd" in
    start)
      if ! _acquire_lock; then
        exit 1
      fi
      # PID file already written by _acquire_lock with parent PID.
      # Fork and update PID file with child PID.
      _main_loop &
      _child_pid=$!
      echo "$_child_pid" > "$LOOP_PID_FILE"
      disown
      echo "autonomous-loop started (PID=$_child_pid)"
      ;;

    stop)
      if _is_active; then
        stop_pid=$(cat "$LOOP_PID_FILE" 2>/dev/null || echo "")
        kill "$stop_pid" 2>/dev/null || true
        rm -f "$LOOP_PID_FILE" "$STATE_FILE"
        _notify_telegram "autonomous-loop stopped"
        echo "autonomous-loop stopped (PID=$stop_pid)"
      else
        echo "autonomous-loop is not running"
        exit 1
      fi
      ;;

    status)
      status_state=$(_get_state)
      status_stage=""
      if [ -f "$STAGE_FILE" ]; then
        status_stage=$(cat "$STAGE_FILE" 2>/dev/null || echo "unknown")
      fi
      if _is_active; then
        status_pid=$(cat "$LOOP_PID_FILE" 2>/dev/null || echo "unknown")
        echo "running (PID=$status_pid) | state=$status_state | stage=$status_stage"
      else
        echo "not running | state=$status_state | stage=$status_stage"
      fi
      ;;

    _run)
      # Internal: run main loop in foreground (for testing/debugging)
      _main_loop
      ;;

    *)
      echo "Usage: $0 {start|stop|status|_run}"
      exit 1
      ;;
  esac
fi
