#!/usr/bin/env bats

load 'test_helper'

# ── DeepSeek model should be deepseek-chat (not deepseek-reasoner) ──

@test "deepseek-review uses deepseek-chat model by default" {
  run grep -E '^MODEL=' "$PROJECT_DIR/scripts/deepseek-review.sh"
  assert_output --partial "deepseek-chat"
}

@test "deepseek-review MODEL is overridable via DEEPSEEK_MODEL env" {
  run grep 'DEEPSEEK_MODEL' "$PROJECT_DIR/scripts/deepseek-review.sh"
  assert_success
}

# ── Retry logic ──

@test "deepseek-review has retry loop with MAX_RETRIES" {
  run grep -c 'MAX_RETRIES\|attempt.*lt.*MAX' "$PROJECT_DIR/scripts/deepseek-review.sh"
  # At least 2 references (definition + usage)
  [ "$output" -ge 2 ]
}

@test "deepseek-review has exponential backoff between retries" {
  run grep 'backoff' "$PROJECT_DIR/scripts/deepseek-review.sh"
  assert_success
}

# ── _safe_cost handles bad input ──

@test "safe_cost returns 0 for non-numeric input" {
  export DEEPSEEK_API_KEY="test-key"
  source "$PROJECT_DIR/scripts/deepseek-review.sh"
  run _safe_cost "abc" "def"
  assert_output "0"
}

@test "safe_cost returns valid number for numeric input" {
  export DEEPSEEK_API_KEY="test-key"
  source "$PROJECT_DIR/scripts/deepseek-review.sh"
  run _safe_cost "1000" "500"
  assert_success
  # Output should contain a decimal number
  [[ "$output" =~ ^[0-9.]+$ ]]
}

# ── No-file graceful exit ──

@test "security audit exits 0 when no JS/TS/HTML files changed" {
  run grep -A6 'security)' "$PROJECT_DIR/scripts/deepseek-review.sh"
  assert_output --partial "exit 0"
}

@test "diff review exits 0 when no diff found" {
  run grep -A6 'diff)' "$PROJECT_DIR/scripts/deepseek-review.sh"
  assert_output --partial "exit 0"
}
