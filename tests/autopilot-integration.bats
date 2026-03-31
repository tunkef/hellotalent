#!/usr/bin/env bats

load 'test_helper'

@test "autopilot skips pipeline when autonomous-loop is active" {
  echo $$ > "$TEST_TMP/.autonomous-loop.pid"

  source "$PROJECT_DIR/scripts/autopilot.sh"
  export LOOP_PID_FILE="$TEST_TMP/.autonomous-loop.pid"
  run _should_skip_pipeline
  assert_success
  assert_output --partial "autonomous-loop aktif"
}

@test "autopilot runs pipeline when autonomous-loop is NOT active" {
  source "$PROJECT_DIR/scripts/autopilot.sh"
  export LOOP_PID_FILE="$TEST_TMP/.autonomous-loop.pid"
  run _should_skip_pipeline
  assert_failure
}

# ── Asama 28: Replay risk integration guard ───────────────────────────────────

@test "loop does not replay same stage after DONT: is_new_stage false when stage unchanged" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STAGE_FILE="$TEST_TMP/.autopilot.stage"
  export LAST_STAGE_FILE="$TEST_TMP/.autopilot.last_stage"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"
  export LOG_FILE="$TEST_TMP/loop.log"

  # Stage 28 was processed before DONT
  echo "28" > "$STAGE_FILE"
  _mark_stage_processed

  # Simulate DONT -> IDLE (state is back to IDLE, stage file unchanged)
  _handle_gate_result "DONT"

  # Loop should NOT see this as a new stage
  run _is_new_stage
  assert_failure
}

@test "loop triggers PIPELINE when stage advances after DONT" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STAGE_FILE="$TEST_TMP/.autopilot.stage"
  export LAST_STAGE_FILE="$TEST_TMP/.autopilot.last_stage"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"
  export LOG_FILE="$TEST_TMP/loop.log"

  # Stage 28 was processed
  echo "28" > "$STAGE_FILE"
  _mark_stage_processed

  # Codex opens stage 29
  echo "29" > "$STAGE_FILE"

  # Now loop should see this as a new stage
  run _is_new_stage
  assert_success
}
