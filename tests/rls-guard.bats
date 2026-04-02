#!/usr/bin/env bats
# rls-guard.bats — Asama 48: RLS pre-push guard regression tests
#
# 4 senaryo:
#   1. CREATE TABLE + no ENABLE ROW LEVEL SECURITY → FAIL (exit 1)
#   2. CREATE TABLE + ENABLE ROW LEVEL SECURITY    → PASS (exit 0)
#   3. CREATE TABLE yok                            → PASS (exit 0)
#   4. SKIP_RLS_CHECK=1                            → PASS bypass (exit 0)

load 'test_helper'

SCRIPT="$PROJECT_DIR/scripts/check-rls-guard.sh"

# ── Senaryo 1: CREATE TABLE var, RLS yok → FAIL ──────────────────────────────

@test "rls-guard: CREATE TABLE without RLS → FAIL" {
  local f="$TEST_TMP/no_rls.sql"
  cat > "$f" <<'SQL'
CREATE TABLE test_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);
SQL
  run bash "$SCRIPT" "$f"
  assert_failure
  assert_output --partial "RLS GUARD"
}

@test "rls-guard: CREATE TABLE (lowercase) without RLS → FAIL" {
  local f="$TEST_TMP/no_rls_lower.sql"
  cat > "$f" <<'SQL'
create table lower_table (id uuid primary key);
SQL
  run bash "$SCRIPT" "$f"
  assert_failure
  assert_output --partial "RLS GUARD"
}

@test "rls-guard: multiple tables, one missing RLS → FAIL" {
  local f="$TEST_TMP/partial_rls.sql"
  cat > "$f" <<'SQL'
CREATE TABLE good_table (id uuid PRIMARY KEY);
ALTER TABLE good_table ENABLE ROW LEVEL SECURITY;

CREATE TABLE bad_table (id uuid PRIMARY KEY);
SQL
  run bash "$SCRIPT" "$f"
  assert_failure
}

# ── Senaryo 2: CREATE TABLE + ENABLE ROW LEVEL SECURITY → PASS ───────────────

@test "rls-guard: CREATE TABLE + ENABLE ROW LEVEL SECURITY → PASS" {
  local f="$TEST_TMP/with_rls.sql"
  cat > "$f" <<'SQL'
CREATE TABLE secure_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id bigint NOT NULL
);
ALTER TABLE secure_table ENABLE ROW LEVEL SECURITY;
SQL
  run bash "$SCRIPT" "$f"
  assert_success
  assert_output --partial "OK"
}

@test "rls-guard: CREATE TABLE (mixed case) + ENABLE ROW LEVEL SECURITY → PASS" {
  local f="$TEST_TMP/mixed_case_rls.sql"
  cat > "$f" <<'SQL'
Create Table mixed_case_table (id uuid primary key);
alter table mixed_case_table Enable Row Level Security;
SQL
  run bash "$SCRIPT" "$f"
  assert_success
}

# ── Senaryo 3: CREATE TABLE yok → PASS ───────────────────────────────────────

@test "rls-guard: no CREATE TABLE → PASS" {
  local f="$TEST_TMP/no_table.sql"
  cat > "$f" <<'SQL'
ALTER TABLE existing_table ADD COLUMN new_col text;
CREATE INDEX idx_col ON existing_table (new_col);
SQL
  run bash "$SCRIPT" "$f"
  assert_success
}

@test "rls-guard: empty migration file → PASS" {
  local f="$TEST_TMP/empty.sql"
  cat > "$f" <<'SQL'
-- migration placeholder
SQL
  run bash "$SCRIPT" "$f"
  assert_success
}

@test "rls-guard: no files passed, no git diff output → PASS" {
  # GIT_CMD mock that returns nothing
  local mock="$TEST_TMP/git_mock.sh"
  printf '#!/usr/bin/env bash\nexit 0\n' > "$mock"
  chmod +x "$mock"
  run env GIT_CMD="$mock" bash "$SCRIPT"
  assert_success
}

# ── Senaryo 4: SKIP_RLS_CHECK=1 → bypass PASS ────────────────────────────────

@test "rls-guard: SKIP_RLS_CHECK=1 with CREATE TABLE no RLS → PASS (bypass)" {
  local f="$TEST_TMP/bypass_no_rls.sql"
  cat > "$f" <<'SQL'
CREATE TABLE bypass_table (id uuid PRIMARY KEY);
SQL
  run env SKIP_RLS_CHECK=1 bash "$SCRIPT" "$f"
  assert_success
  assert_output --partial "bypassed"
}

@test "rls-guard: SKIP_RLS_CHECK=1 with no files → PASS (bypass)" {
  run env SKIP_RLS_CHECK=1 bash "$SCRIPT"
  assert_success
  assert_output --partial "bypassed"
}

# ── Senaryo 5: TEMPLATE.sql guard tarafindan atlanmali ───────────────────────

@test "rls-guard: TEMPLATE.sql is skipped by guard (not treated as real migration)" {
  run bash "$SCRIPT" "$PROJECT_DIR/supabase/migrations/TEMPLATE.sql"
  assert_success
}

# ── Senaryo 6: TEMPLATE.sql yapi dogrulamasi ─────────────────────────────────

@test "template: TEMPLATE.sql dosyasi mevcut olmali" {
  run test -f "$PROJECT_DIR/supabase/migrations/TEMPLATE.sql"
  assert_success
}

@test "template: TEMPLATE.sql ENABLE ROW LEVEL SECURITY icermeli" {
  run grep -qi "ENABLE ROW LEVEL SECURITY" "$PROJECT_DIR/supabase/migrations/TEMPLATE.sql"
  assert_success
}

@test "template: TEMPLATE.sql CREATE POLICY icermeli" {
  run grep -qi "CREATE POLICY" "$PROJECT_DIR/supabase/migrations/TEMPLATE.sql"
  assert_success
}

@test "template: TEMPLATE.sql GRANT icermeli" {
  run grep -qi "GRANT" "$PROJECT_DIR/supabase/migrations/TEMPLATE.sql"
  assert_success
}

@test "template: TEMPLATE.sql CREATE TABLE IF NOT EXISTS icermeli" {
  run grep -qi "CREATE TABLE IF NOT EXISTS" "$PROJECT_DIR/supabase/migrations/TEMPLATE.sql"
  assert_success
}

# ── Senaryo 6: docs/ARCHITECTURE.md kural dogrulamasi ────────────────────────

@test "architecture-doc: email_outbox kurali dokumante edilmeli" {
  run grep -q "email_outbox" "$PROJECT_DIR/docs/ARCHITECTURE.md"
  assert_success
}

@test "architecture-doc: auth.users direkt query yasagi dokumante edilmeli" {
  run grep -q "auth\.users" "$PROJECT_DIR/docs/ARCHITECTURE.md"
  assert_success
}

@test "architecture-doc: auth.uid() alternati dokumante edilmeli" {
  run grep -q "auth\.uid" "$PROJECT_DIR/docs/ARCHITECTURE.md"
  assert_success
}
