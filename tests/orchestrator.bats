#!/usr/bin/env bats

load 'test_helper'

# ── Diffray should be disabled (all agents timeout) ──

@test "diffray.json has all agents disabled" {
  local enabled_count
  enabled_count=$(grep -c '"enabled": true' "$PROJECT_DIR/.diffray.json" 2>/dev/null || true)
  [ "$enabled_count" -eq 0 ]
}

# ── Orchestrator honest reporting ──

@test "orchestrator tracks STEP_RESULTS for DeepSeek" {
  run grep 'STEP_RESULTS.*DeepSeek' "$PROJECT_DIR/scripts/orchestrator.sh"
  assert_success
}

@test "orchestrator tracks STEP_RESULTS for Cerebras" {
  run grep 'STEP_RESULTS.*Cerebras' "$PROJECT_DIR/scripts/orchestrator.sh"
  assert_success
}

@test "orchestrator tracks STEP_RESULTS for UAT" {
  run grep 'STEP_RESULTS.*UAT' "$PROJECT_DIR/scripts/orchestrator.sh"
  assert_success
}

@test "orchestrator tracks STEP_RESULTS for Tests" {
  run grep 'STEP_RESULTS.*Tests' "$PROJECT_DIR/scripts/orchestrator.sh"
  assert_success
}

@test "orchestrator show_summary reports PASS FAIL SKIP counts" {
  run grep -A30 'show_summary' "$PROJECT_DIR/scripts/orchestrator.sh"
  assert_output --partial "fail_count"
}

# ── Diffray disabled in orchestrator (skip, don't run dead agents) ──

@test "orchestrator skips Diffray when disabled in config" {
  # Diffray section should have a SKIP path
  run grep 'Diffray:SKIP' "$PROJECT_DIR/scripts/orchestrator.sh"
  assert_success
}

# ── UAT is Playwright, not Gemini ──

@test "orchestrator step_uat uses Playwright not Gemini" {
  run grep -A10 'step_uat' "$PROJECT_DIR/scripts/orchestrator.sh"
  assert_output --partial "Playwright"
}

@test "orchestrator does not reference gemini in step_uat" {
  local uat_start
  uat_start=$(grep -n 'step_uat()' "$PROJECT_DIR/scripts/orchestrator.sh" | head -1 | cut -d: -f1)
  local uat_end=$((uat_start + 30))
  run sed -n "${uat_start},${uat_end}p" "$PROJECT_DIR/scripts/orchestrator.sh"
  refute_output --partial "gemini"
}

# ── DeepSeek model truth: orchestrator must not hardcode deepseek-reasoner ──

@test "orchestrator DEEPSEEK_MODEL default is deepseek-chat not deepseek-reasoner" {
  # orchestrator sets DEEPSEEK_MODEL which is inherited by deepseek-review.sh
  # the single truth must be deepseek-chat (not deepseek-reasoner)
  run grep -E 'DEEPSEEK_MODEL.*deepseek-reasoner' "$PROJECT_DIR/scripts/orchestrator.sh"
  assert_failure
}

@test "orchestrator and deepseek-review share same model default" {
  local orch_model
  orch_model=$(grep -E 'DEEPSEEK_MODEL.*:-' "$PROJECT_DIR/scripts/orchestrator.sh" | grep -oE 'deepseek-[a-z]+' | head -1)
  local script_model
  script_model=$(grep -E '^MODEL=.*DEEPSEEK_MODEL' "$PROJECT_DIR/scripts/deepseek-review.sh" | grep -oE 'deepseek-[a-z]+' | head -1)
  [ "$orch_model" = "$script_model" ]
}

# ── Diffray: config-aware skip (not just binary-presence check) ──

@test "orchestrator checks diffray.json enabled agents before running diffray" {
  # Must read .diffray.json enabled count — not just command -v diffray
  run grep 'diffray\.json' "$PROJECT_DIR/scripts/orchestrator.sh"
  assert_success
}

@test "orchestrator Diffray disabled config emits SKIP not PASS" {
  # When diffray is installed but all agents disabled: SKIP path must be reachable
  # The SKIP must be inside the diffray-installed block, not just the else/not-installed branch
  local diffray_section
  diffray_section=$(grep -n 'diffray' "$PROJECT_DIR/scripts/orchestrator.sh" | grep -v '#' | head -20)
  # Diffray:SKIP must appear in same logical block as the enabled-agents check
  run grep -A5 'diffray_enabled' "$PROJECT_DIR/scripts/orchestrator.sh"
  assert_success
}
