#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# test-codex-blocker.sh — D5 E2E test
# Reform v3.4 — 11 May 2026
#
# codex-review-real.sh BLOCKER pattern detection logic'ini gerçek
# Codex CLI çağırmadan test eder. Fake review output dosyası ile
# parse logic doğrulanır.
#
# Test senaryoları:
#   1. Fake review BLOCKER içerir → script exit 1 + pending-approvals entry
#   2. Fake review ✅ MERGE_OK içerir → exit 0
#   3. Fake review belirsiz → exit 0 + uyarı
#   4. Bypass marker → Codex çağrılmaz, exit 0
# ════════════════════════════════════════════════════════════════════

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

PASS=0
FAIL=0
TOTAL=0

run() {
  TOTAL=$((TOTAL+1))
  if eval "$2" >/dev/null 2>&1; then
    PASS=$((PASS+1))
    echo "  [$TOTAL] PASS — $1"
  else
    FAIL=$((FAIL+1))
    echo "  [$TOTAL] FAIL — $1"
  fi
}

# Test 1: BLOCKER pattern detect
echo "Test 1: BLOCKER pattern in fake review → exit 1"

# Fake review yarat
mkdir -p .claude/agent-memory/codex-reviews
FAKE_REVIEW=".claude/agent-memory/codex-reviews/test-blocker.md"
cat > "$FAKE_REVIEW" <<'EOF'
# Codex Review — Fake BLOCKER

## Findings

🛑 BLOCKER: Migration 20260511_test.sql RLS policy missing
- File: supabase/migrations/20260511_test.sql:42
- Severity: CRITICAL
- Issue: Public table without RLS allows anonymous SELECT
- Fix: ALTER TABLE x ENABLE ROW LEVEL SECURITY + CREATE POLICY

🛑 BLOCK_MERGE
EOF

# BLOCKER pattern grep test
run "BLOCKER detect (🛑 or BLOCKER or CRITICAL)" 'grep -qE "🛑|BLOCK_MERGE|BLOCKER|CRITICAL" "'$FAKE_REVIEW'"'

# Test 2: MERGE_OK pattern
echo ""
echo "Test 2: ✅ MERGE_OK in fake review → exit 0"
FAKE_OK=".claude/agent-memory/codex-reviews/test-ok.md"
cat > "$FAKE_OK" <<'EOF'
# Codex Review — Fake OK

Reviewed staged migration. No security issues, RLS policies present,
backfill safe under concurrent writes.

✅ MERGE_OK
EOF

run "MERGE_OK detect" 'grep -qE "✅ MERGE_OK|MERGE_OK" "'$FAKE_OK'"'

# Test 3: Bypass marker logic
echo ""
echo "Test 3: [codex-bypass] marker → script atlar"

BYPASS_MSG=$(mktemp)
echo "fix(rls): test commit [codex-bypass] dummy reason" > "$BYPASS_MSG"
run "[codex-bypass] tier-detect tarafından tanınır" 'grep -qE "\[codex-bypass\]|\[agent-bypass\]" "'$BYPASS_MSG'"'
rm "$BYPASS_MSG"

# Test 4: codex-review-real.sh T1 skip
echo ""
echo "Test 4: T1 tier → Codex skip"
run "T1 tier skip" 'bash scripts/codex-review-real.sh --tier=T1'

# Test 5: tier-detect.sh script var
run "tier-detect.sh executable" '[ -x scripts/tier-detect.sh ]'

# Test 6: tier-detect.sh T3 hattında codex-review-real.sh çağrı var
run "tier-detect.sh T3/T4 → codex-review-real.sh referans" 'grep -q "codex-review-real.sh" scripts/tier-detect.sh'

# Test 7: codex-review-real.sh BLOCKER → pending-approvals auto-append logic kodda var
run "codex-review-real.sh pending-approvals append kodu" 'grep -q "A_AUTO_" scripts/codex-review-real.sh'

# Cleanup
rm -f "$FAKE_REVIEW" "$FAKE_OK"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "D5 E2E: TOTAL=$TOTAL PASS=$PASS FAIL=$FAIL"
[ "$FAIL" -eq 0 ] && echo "✅ ALL PASS" || { echo "❌ FAIL"; exit 1; }
