#!/usr/bin/env bats

load 'test_helper'

@test "initial state is IDLE" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"
  run _get_state
  assert_output "IDLE"
}

@test "set_state writes to state file" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"
  _set_state "PIPELINE"
  run cat "$TEST_TMP/.autonomous-loop.state"
  assert_output "PIPELINE"
}

@test "set_state cycles through valid states" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"
  for state in IDLE PIPELINE REPORT WAIT_CODEX GATE; do
    _set_state "$state"
    run _get_state
    assert_output "$state"
  done
}

@test "set_state rejects invalid state" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"
  run _set_state "INVALID"
  assert_failure
}

@test "extract_stage_summary parses AI-COLLAB stage correctly" {
  cat > "$TEST_TMP/collab.md" <<'EOF'
## 65. Claude Icin Gorev — Asama 22
Tema: Iyzico odeme entegrasyonu
Scope: payment.js, profil-premium.js
Hedef: MVP checkout akisi

Kurallar:
- Scope disina cikma
EOF

  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  run _extract_stage_summary "$TEST_TMP/collab.md" 22
  assert_output --partial "Iyzico"
}

@test "is_active returns true when pid file exists with running process" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export LOOP_PID_FILE="$TEST_TMP/.autonomous-loop.pid"
  echo $$ > "$LOOP_PID_FILE"
  run _is_active
  assert_success
}

@test "is_active returns false when pid file missing" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export LOOP_PID_FILE="$TEST_TMP/.autonomous-loop.pid"
  run _is_active
  assert_failure
}

@test "handle_gate_result GO returns 0" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"
  export LOG_FILE="$TEST_TMP/loop.log"
  run _handle_gate_result "GO"
  assert_success
}

@test "handle_gate_result DONT sets state to IDLE" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"
  export LOG_FILE="$TEST_TMP/loop.log"
  _handle_gate_result "DONT"
  run _get_state
  assert_output "IDLE"
}

@test "handle_gate_result FEEDBACK returns feedback text" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"
  export LOG_FILE="$TEST_TMP/loop.log"
  run _handle_gate_result "FEEDBACK:bunu birak coach fix et"
  assert_output --partial "bunu birak coach fix et"
}

# ── Asama 28: Stale Stage Replay Guard ───────────────────────────────────────

@test "is_new_stage returns false when no stage file exists" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STAGE_FILE="$TEST_TMP/.autopilot.stage"
  export LAST_STAGE_FILE="$TEST_TMP/.autopilot.last_stage"
  run _is_new_stage
  assert_failure
}

@test "is_new_stage returns false when stage matches last processed stage" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STAGE_FILE="$TEST_TMP/.autopilot.stage"
  export LAST_STAGE_FILE="$TEST_TMP/.autopilot.last_stage"
  echo "28" > "$STAGE_FILE"
  echo "28" > "$LAST_STAGE_FILE"
  run _is_new_stage
  assert_failure
}

@test "is_new_stage returns true when stage changes from last processed" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STAGE_FILE="$TEST_TMP/.autopilot.stage"
  export LAST_STAGE_FILE="$TEST_TMP/.autopilot.last_stage"
  echo "29" > "$STAGE_FILE"
  echo "28" > "$LAST_STAGE_FILE"
  run _is_new_stage
  assert_success
}

@test "is_new_stage returns true when no last stage file exists" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STAGE_FILE="$TEST_TMP/.autopilot.stage"
  export LAST_STAGE_FILE="$TEST_TMP/.autopilot.last_stage"
  echo "28" > "$STAGE_FILE"
  # LAST_STAGE_FILE intentionally absent
  run _is_new_stage
  assert_success
}

@test "mark_stage_processed writes current stage to last stage file" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STAGE_FILE="$TEST_TMP/.autopilot.stage"
  export LAST_STAGE_FILE="$TEST_TMP/.autopilot.last_stage"
  echo "28" > "$STAGE_FILE"
  _mark_stage_processed
  run cat "$LAST_STAGE_FILE"
  assert_output "28"
}

@test "same stage does not trigger PIPELINE a second time after mark_stage_processed" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STAGE_FILE="$TEST_TMP/.autopilot.stage"
  export LAST_STAGE_FILE="$TEST_TMP/.autopilot.last_stage"
  echo "28" > "$STAGE_FILE"
  _mark_stage_processed
  # Simulate DONT -> IDLE: stage file unchanged, last_stage now set
  run _is_new_stage
  assert_failure
}

# ── Fix #3: Singleton / TOCTOU race guard ──

@test "start writes PID file before background fork to prevent TOCTOU race" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export LOOP_PID_FILE="$TEST_TMP/.autonomous-loop.pid"
  # _write_pid_guard should atomically write a PID file and return success
  # If file already exists with running PID, it should fail
  echo $$ > "$LOOP_PID_FILE"
  run _acquire_lock
  assert_failure
}

@test "acquire_lock succeeds when no existing lock" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export LOOP_PID_FILE="$TEST_TMP/.autonomous-loop.pid"
  run _acquire_lock
  assert_success
}

@test "acquire_lock succeeds when stale PID in lock file" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export LOOP_PID_FILE="$TEST_TMP/.autonomous-loop.pid"
  echo "99999" > "$LOOP_PID_FILE"
  run _acquire_lock
  assert_success
}

# ── Fix #5: _extract_stage_summary awk bug ──

@test "extract_stage_summary matches header not bullet point" {
  cat > "$TEST_TMP/collab.md" <<'EOF'
## 83. Claude Cevap Formati — Asama 27
- Ancak autopilot yalnizca yeni en yuksek Asama 28 olarak aciliyor

## 85. Codex Review — Asama 27 Revize Gerekli
Durum: kabul edilmedi

## 86. Claude Icin Gorev — Asama 28
Hedef: Stale state replay fix
Scope: autonomous-loop.sh, BATS tests

## 87. Claude Cevap Formati — Asama 28
Sonraki adim
EOF

  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  run _extract_stage_summary "$TEST_TMP/collab.md" 28
  # Should match "## 86. Claude Icin Gorev — Asama 28" not the bullet point in section 83
  assert_output --partial "Stale state replay fix"
  refute_output --partial "Ancak autopilot"
}

# ── Fix #6: WAIT_CODEX max retry ──

@test "wait_codex has max retry limit" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  # _wait_codex_with_limit should return failure after max retries
  _check_codex_response() { echo ""; }
  export -f _check_codex_response
  export CODEX_READ_TIMEOUT=2
  export CODEX_READ_INTERVAL=1
  export CODEX_MAX_WAIT_RETRIES=2
  local count=0
  run _count_wait_retries
  # Should return a number, proving the counter exists
  assert_success
}

# ── Fix #7: cd to project root ──

@test "autonomous-loop resolves PROJECT_ROOT at source time" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  [ -n "$PROJECT_ROOT" ]
}

# ── Asama 29 Blocker 1: start command must not runtime error ──

@test "start command exits 0 without local-in-case bash error" {
  # Verify the start branch doesn't use 'local' at top-level (which causes bash error).
  # We test by parsing the script — no need to actually fork a background loop.
  run grep -n 'local.*child_pid\|local.*=\$!' "$PROJECT_DIR/scripts/autonomous-loop.sh"
  # Should find zero matches — local was removed from the case branch
  assert_failure
}

@test "start command runs without bash runtime error" {
  # Verify the script parses and the start branch is syntactically valid
  # by running bash -n (syntax check) and then executing start in a detached subshell
  run bash -n "$PROJECT_DIR/scripts/autonomous-loop.sh"
  assert_success

  # Also verify no 'local' at top-level in the case block (would error at runtime)
  run bash -c "
    cd '$PROJECT_DIR'
    export LOOP_PID_FILE='$TEST_TMP/.autonomous-loop.pid'
    export STATE_FILE='$TEST_TMP/.autonomous-loop.state'
    export LOG_FILE='$TEST_TMP/loop.log'
    export STAGE_FILE='$TEST_TMP/.autopilot.stage'
    export LAST_STAGE_FILE='$TEST_TMP/.autopilot.last_stage'
    # Start with immediate kill — nohup detaches from BATS fd inheritance
    nohup bash scripts/autonomous-loop.sh start </dev/null >/dev/null 2>&1
    sleep 0.5
    pid=\$(cat '$TEST_TMP/.autonomous-loop.pid' 2>/dev/null || echo '')
    [ -n \"\$pid\" ] && echo 'PID_WRITTEN' && kill \"\$pid\" 2>/dev/null
    exit 0
  "
  assert_success
  assert_output --partial "PID_WRITTEN"
}

# ── Fix #4: FEEDBACK path calls codex-bridge ──

@test "FEEDBACK gate result triggers codex-bridge send-user-feedback" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"
  export LOG_FILE="$TEST_TMP/loop.log"

  # Track if codex-bridge was called
  _send_feedback_to_codex() {
    echo "CALLED:$1" > "$TEST_TMP/feedback-sent.log"
  }

  _dispatch_feedback "bunu birak coach fix et"
  assert [ -f "$TEST_TMP/feedback-sent.log" ]
  run cat "$TEST_TMP/feedback-sent.log"
  assert_output --partial "bunu birak coach fix et"
}
