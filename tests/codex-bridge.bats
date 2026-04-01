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

# ── Fix #2: Codex Bridge real implementation ──

@test "send_to_codex uses osascript when available" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  export BRIDGE_LOG="$TEST_TMP/codex-bridge.log"
  # Mock osascript
  osascript() { echo "OSASCRIPT_CALLED"; return 0; }
  export -f osascript
  cliclick() { echo "CLICLICK_CALLED"; return 0; }
  export -f cliclick
  run _send_to_codex "test message"
  assert_success
  # Should NOT contain STUB anymore
  run cat "$TEST_TMP/codex-bridge.log"
  refute_output --partial "STUB"
}

@test "check_codex_response detects genuinely new stage" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  export BRIDGE_LOG="$TEST_TMP/codex-bridge.log"
  export COLLAB_FILE="$TEST_TMP/collab.md"
  export COLLAB_HASH_FILE="$TEST_TMP/.collab-hash"
  export COLLAB_STAGE_FILE="$TEST_TMP/.collab-last-stage"

  # Create initial file with stage 28
  echo "## 86. Claude Icin Gorev — Asama 28" > "$COLLAB_FILE"
  _snapshot_collab_state

  # Codex adds a genuinely new stage 29
  echo "## 88. Claude Icin Gorev — Asama 29" >> "$COLLAB_FILE"

  run _check_codex_response
  assert_success
  assert_output --partial "29"
}

# ── Asama 29 Blocker 2: non-stage edits must NOT trigger success ──

@test "check_codex_response ignores non-stage AI-COLLAB edits" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  export BRIDGE_LOG="$TEST_TMP/codex-bridge.log"
  export COLLAB_FILE="$TEST_TMP/collab.md"
  export COLLAB_HASH_FILE="$TEST_TMP/.collab-hash"
  export COLLAB_STAGE_FILE="$TEST_TMP/.collab-last-stage"

  # Initial state: stage 28 exists
  echo "## 86. Claude Icin Gorev — Asama 28" > "$COLLAB_FILE"
  _snapshot_collab_state

  # Non-stage edit: review note added (hash changes, but no new stage)
  echo "" >> "$COLLAB_FILE"
  echo "## 87. Codex Review — Asama 28 Review" >> "$COLLAB_FILE"
  echo "Durum: kabul edildi" >> "$COLLAB_FILE"

  run _check_codex_response
  assert_failure
}

@test "check_codex_response ignores remote mesaj blocks" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  export BRIDGE_LOG="$TEST_TMP/codex-bridge.log"
  export COLLAB_FILE="$TEST_TMP/collab.md"
  export COLLAB_HASH_FILE="$TEST_TMP/.collab-hash"
  export COLLAB_STAGE_FILE="$TEST_TMP/.collab-last-stage"

  echo "## 86. Claude Icin Gorev — Asama 28" > "$COLLAB_FILE"
  _snapshot_collab_state

  # Remote message added (not a new stage)
  echo "" >> "$COLLAB_FILE"
  echo "## Remote Mesaj - Codex (01 Apr 2026 02:15)" >> "$COLLAB_FILE"
  echo "Mesaj: Coach panelde bug var" >> "$COLLAB_FILE"

  run _check_codex_response
  assert_failure
}

@test "check_codex_response ignores edits that keep same max stage number" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  export BRIDGE_LOG="$TEST_TMP/codex-bridge.log"
  export COLLAB_FILE="$TEST_TMP/collab.md"
  export COLLAB_HASH_FILE="$TEST_TMP/.collab-hash"
  export COLLAB_STAGE_FILE="$TEST_TMP/.collab-last-stage"

  echo "## 86. Claude Icin Gorev — Asama 28" > "$COLLAB_FILE"
  _snapshot_collab_state

  # Edit adds text but max stage stays 28
  echo "Ek not: scope daraltildi" >> "$COLLAB_FILE"

  run _check_codex_response
  assert_failure
}
