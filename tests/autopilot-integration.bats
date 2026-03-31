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
