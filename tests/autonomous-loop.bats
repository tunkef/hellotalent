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
