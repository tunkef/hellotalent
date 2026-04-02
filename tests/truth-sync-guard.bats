#!/usr/bin/env bats
# truth-sync-guard.bats — Asama 46: truth-sync pre-commit guard regression tests
#
# 4 senaryo:
#   1. trigger staged + docs yok   → FAIL (exit 1)
#   2. trigger staged + docs var   → PASS (exit 0)
#   3. trigger yok                 → PASS (exit 0)
#   4. SKIP_TRUTH_CHECK=1          → PASS (exit 0, bypass)

load 'test_helper'

SCRIPT="$PROJECT_DIR/scripts/check-truth-sync.sh"

# Helper: mock git command that returns given staged files
_make_mock_git() {
  local staged_files="$1"
  local mock_path="$TEST_TMP/mock_git.sh"
  cat > "$mock_path" <<MOCK
#!/usr/bin/env bash
if [ "\$1" = "diff" ] && [ "\$2" = "--cached" ] && [ "\$3" = "--name-only" ]; then
  printf '%s\n' $staged_files
  exit 0
fi
exec git "\$@"
MOCK
  chmod +x "$mock_path"
  echo "$mock_path"
}

# ── Senaryo 1: trigger staged + docs yok → FAIL ─────────────────────────────

@test "truth-sync: trigger staged profil-core.js, no docs → FAIL" {
  local mock
  mock=$(_make_mock_git "profil-core.js")
  run env GIT_CMD="$mock" bash "$SCRIPT"
  assert_failure
  assert_output --partial "TRUTH-SYNC GUARD"
}

@test "truth-sync: trigger staged ik.html, no docs → FAIL" {
  local mock
  mock=$(_make_mock_git "ik.html")
  run env GIT_CMD="$mock" bash "$SCRIPT"
  assert_failure
}

@test "truth-sync: trigger staged supabase/migrations/123_foo.sql, no docs → FAIL" {
  local mock
  mock=$(_make_mock_git "supabase/migrations/123_foo.sql")
  run env GIT_CMD="$mock" bash "$SCRIPT"
  assert_failure
}

# ── Senaryo 2: trigger staged + docs var → PASS ─────────────────────────────

@test "truth-sync: profil-core.js + docs/AI-COLLAB.md staged → PASS" {
  local mock
  mock=$(_make_mock_git "profil-core.js docs/AI-COLLAB.md")
  run env GIT_CMD="$mock" bash "$SCRIPT"
  assert_success
}

@test "truth-sync: ik.html + docs/CURRENT-STATE.md staged → PASS" {
  local mock
  mock=$(_make_mock_git "ik.html docs/CURRENT-STATE.md")
  run env GIT_CMD="$mock" bash "$SCRIPT"
  assert_success
}

@test "truth-sync: supabase migration + docs/AI-COLLAB.md staged → PASS" {
  local mock
  mock=$(_make_mock_git "supabase/migrations/20260402_test.sql docs/AI-COLLAB.md")
  run env GIT_CMD="$mock" bash "$SCRIPT"
  assert_success
}

# ── Senaryo 3: trigger yok → PASS ───────────────────────────────────────────

@test "truth-sync: only shared.css staged (no trigger) → PASS" {
  local mock
  mock=$(_make_mock_git "shared.css")
  run env GIT_CMD="$mock" bash "$SCRIPT"
  assert_success
}

@test "truth-sync: only docs/SESSION-LOG.md staged (no trigger) → PASS" {
  local mock
  mock=$(_make_mock_git "docs/SESSION-LOG.md")
  run env GIT_CMD="$mock" bash "$SCRIPT"
  assert_success
}

@test "truth-sync: nothing staged → PASS" {
  local mock
  mock=$(_make_mock_git "")
  run env GIT_CMD="$mock" bash "$SCRIPT"
  assert_success
}

# ── Senaryo 4: SKIP_TRUTH_CHECK=1 → bypass PASS ─────────────────────────────

@test "truth-sync: SKIP_TRUTH_CHECK=1 with trigger, no docs → PASS (bypass)" {
  local mock
  mock=$(_make_mock_git "profil-core.js")
  run env GIT_CMD="$mock" SKIP_TRUTH_CHECK=1 bash "$SCRIPT"
  assert_success
  assert_output --partial "bypassed"
}

@test "truth-sync: SKIP_TRUTH_CHECK=1 with ik.html staged → PASS (bypass)" {
  local mock
  mock=$(_make_mock_git "ik.html supabase/migrations/999_big.sql")
  run env GIT_CMD="$mock" SKIP_TRUTH_CHECK=1 bash "$SCRIPT"
  assert_success
}

# ── Senaryo 5: pre-commit zincir semantigi ──────────────────────────────────

# Helper: truth-sync fail/pass senaryosu icin izole pre-commit ortami kur
_setup_chain_env() {
  local truth_exit_code="$1"
  local log_file="$TEST_TMP/lint-staged.log"

  mkdir -p "$TEST_TMP/scripts"

  # Mock check-truth-sync.sh
  printf '#!/usr/bin/env bash\nexit %s\n' "$truth_exit_code" \
    > "$TEST_TMP/scripts/check-truth-sync.sh"
  chmod +x "$TEST_TMP/scripts/check-truth-sync.sh"

  # Fake npx: cagirildiginda log dosyasina yaz
  printf '#!/usr/bin/env bash\nprintf "npx %%s\\n" "$*" >> "%s"\nexit 0\n' \
    "$log_file" > "$TEST_TMP/npx"
  chmod +x "$TEST_TMP/npx"

  # Pre-commit hook'u temp dir'a kopyala
  cp "$PROJECT_DIR/.husky/pre-commit" "$TEST_TMP/pre-commit"
  chmod +x "$TEST_TMP/pre-commit"
}

@test "pre-commit chain: truth-sync fail → pre-commit non-zero exit" {
  _setup_chain_env 1
  run bash -c "cd '$TEST_TMP' && PATH='$TEST_TMP:$PATH' sh ./pre-commit"
  assert_failure
}

@test "pre-commit chain: truth-sync fail → lint-staged NOT called" {
  _setup_chain_env 1
  local log="$TEST_TMP/lint-staged.log"
  bash -c "cd '$TEST_TMP' && PATH='$TEST_TMP:$PATH' sh ./pre-commit" 2>/dev/null || true
  [ ! -f "$log" ] || ! grep -q "lint-staged" "$log"
}

@test "pre-commit chain: truth-sync pass → pre-commit exits zero" {
  _setup_chain_env 0
  run bash -c "cd '$TEST_TMP' && PATH='$TEST_TMP:$PATH' sh ./pre-commit"
  assert_success
}

@test "pre-commit chain: truth-sync pass → lint-staged IS called" {
  _setup_chain_env 0
  local log="$TEST_TMP/lint-staged.log"
  bash -c "cd '$TEST_TMP' && PATH='$TEST_TMP:$PATH' sh ./pre-commit"
  [ -f "$log" ] && grep -q "lint-staged" "$log"
}
