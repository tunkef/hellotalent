#!/usr/bin/env bats

load 'test_helper'

@test "report requires a summary argument" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  run _validate_report_args ""
  assert_failure
}

@test "report accepts a summary string" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  run _validate_report_args "Asama 21 bitti. 2 dosya degisti."
  assert_success
}

@test "send-user-feedback requires both original and comment args" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  run _validate_feedback_args "only one arg" ""
  assert_failure
}

@test "send-user-feedback accepts both args" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  run _validate_feedback_args "kullanici mesaji" "claude yorumu"
  assert_success
}

@test "format_report_message includes stage summary" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  run _format_report_message "Asama 21 bitti. 2 dosya degisti, testler gecti."
  assert_output --partial "Asama 21 bitti"
  assert_output --partial "Sonraki asamayi yaz"
}

@test "format_feedback_message includes both original and comment" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  run _format_feedback_message "bunu birak coach panel fix et" "Kullanici coach-studio.js bug'ini kastetmis olabilir"
  assert_output --partial "bunu birak coach panel fix et"
  assert_output --partial "coach-studio.js"
}

@test "log writes to codex-bridge.log" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  export BRIDGE_LOG="$TEST_TMP/codex-bridge.log"
  _bridge_log "test message"
  run cat "$TEST_TMP/codex-bridge.log"
  assert_output --partial "test message"
}

@test "read timeout returns error after max wait" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  export CODEX_READ_TIMEOUT=2
  export CODEX_READ_INTERVAL=1
  _check_codex_response() { echo ""; }
  export -f _check_codex_response
  run _read_with_timeout
  assert_failure
  assert_output --partial "TIMEOUT"
}
