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
