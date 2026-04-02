#!/usr/bin/env bats

load 'test_helper'

# ── Migration template exists and has mandatory sections ──

@test "migration template file exists" {
  [ -f "$PROJECT_DIR/supabase/migrations/TEMPLATE.sql" ]
}

@test "migration template has CREATE TABLE placeholder" {
  run grep 'CREATE TABLE' "$PROJECT_DIR/supabase/migrations/TEMPLATE.sql"
  assert_success
}

@test "migration template has ENABLE ROW LEVEL SECURITY" {
  run grep 'ENABLE ROW LEVEL SECURITY' "$PROJECT_DIR/supabase/migrations/TEMPLATE.sql"
  assert_success
}

@test "migration template has CREATE POLICY placeholder" {
  run grep 'CREATE POLICY' "$PROJECT_DIR/supabase/migrations/TEMPLATE.sql"
  assert_success
}

@test "migration template has GRANT statement" {
  run grep 'GRANT' "$PROJECT_DIR/supabase/migrations/TEMPLATE.sql"
  assert_success
}

@test "migration template warns against auth.users direct query" {
  run grep -i 'auth\.users\|auth\.jwt' "$PROJECT_DIR/supabase/migrations/TEMPLATE.sql"
  assert_success
}

# ── email_outbox RLS exception documented ──

@test "architecture-decisions documents email_outbox as RLS exception" {
  run grep -i 'email_outbox' "$PROJECT_DIR/.claude/rules/architecture-decisions.md"
  assert_success
}

@test "email_outbox documented as service-role-only" {
  run grep -A3 'email_outbox' "$PROJECT_DIR/.claude/rules/architecture-decisions.md"
  assert_output --partial "service"
}

# ── auth.users direct query ban documented ──

@test "supabase-patterns documents auth.users query ban" {
  run grep -i 'auth\.users' "$PROJECT_DIR/.claude/rules/supabase-patterns.md"
  assert_success
}

@test "supabase-patterns recommends auth.jwt() alternative" {
  run grep 'auth\.jwt' "$PROJECT_DIR/.claude/rules/supabase-patterns.md"
  assert_success
}

# ── Migration mandatory RLS rule documented ──

@test "supabase-patterns has mandatory RLS rule for CREATE TABLE" {
  run grep -i 'ENABLE ROW LEVEL SECURITY' "$PROJECT_DIR/.claude/rules/supabase-patterns.md"
  assert_success
}
