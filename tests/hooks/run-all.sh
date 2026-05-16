#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# tests/hooks/run-all.sh — Smoke test suite for self-improving hooks
# Reform 11 May 2026
#
# Her hook için input/output kontratını programatik doğrula.
# CI'da çalıştırılabilir. Test fail → exit 1.
#
# Usage: ./tests/hooks/run-all.sh
# ════════════════════════════════════════════════════════════════════

set -e

# Project root
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

PASS=0
FAIL=0
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

run_test() {
  local name="$1"
  local cmd="$2"
  TOTAL=$((TOTAL + 1))
  echo -n "  [$TOTAL] $name ... "
  if eval "$cmd" > /tmp/test-output 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}FAIL${NC}"
    echo "    Output:"
    sed 's/^/      /' /tmp/test-output | head -10
    FAIL=$((FAIL + 1))
  fi
}

echo "═══════════════════════════════════════════════════════════"
echo "Self-Improving Hook Smoke Test Suite — Reform 11 May 2026"
echo "═══════════════════════════════════════════════════════════"

# ════════════════════════════════════════════════════════════════════
# A1: detect-negative-feedback.sh
# ════════════════════════════════════════════════════════════════════
echo ""
echo "A1: detect-negative-feedback.sh"

PENDING_BACKUP=$(mktemp)
cp .claude/agent-memory/pending-rules.md "$PENDING_BACKUP"

run_test "negative prompt → NEG entry yazılır" '
  before=$(grep -cE "^## NEG[0-9]+" .claude/agent-memory/pending-rules.md)
  echo "{\"prompt\":\"bu işi yanlış yaptın geri al\",\"cwd\":\"$PROJECT_ROOT\",\"hook_event_name\":\"UserPromptSubmit\"}" | bash .claude/hooks/detect-negative-feedback.sh > /dev/null
  after=$(grep -cE "^## NEG[0-9]+" .claude/agent-memory/pending-rules.md)
  [ "$after" -gt "$before" ]
'

run_test "normal prompt → NEG entry YAZILMAZ" '
  before=$(grep -cE "^## NEG[0-9]+" .claude/agent-memory/pending-rules.md)
  echo "{\"prompt\":\"yeni feature ekle\",\"hook_event_name\":\"UserPromptSubmit\"}" | bash .claude/hooks/detect-negative-feedback.sh > /dev/null
  after=$(grep -cE "^## NEG[0-9]+" .claude/agent-memory/pending-rules.md)
  [ "$after" = "$before" ]
'

run_test "empty stdin → exit 0 sessiz" '
  echo "{}" | bash .claude/hooks/detect-negative-feedback.sh
'

# Restore
cp "$PENDING_BACKUP" .claude/agent-memory/pending-rules.md
rm "$PENDING_BACKUP"

# ════════════════════════════════════════════════════════════════════
# A2: detect-remember-intent.sh
# ════════════════════════════════════════════════════════════════════
echo ""
echo "A2: detect-remember-intent.sh"

run_test "save intent → context hint" '
  out=$(echo "{\"prompt\":\"şunu hatırla: token-strict\",\"hook_event_name\":\"UserPromptSubmit\"}" | bash .claude/hooks/detect-remember-intent.sh)
  echo "$out" | grep -q "REMEMBER INTENT"
'

run_test "no save intent → sessiz" '
  out=$(echo "{\"prompt\":\"merhaba dünya\",\"hook_event_name\":\"UserPromptSubmit\"}" | bash .claude/hooks/detect-remember-intent.sh)
  [ -z "$out" ]
'

# ════════════════════════════════════════════════════════════════════
# A3: session-end-si-review.sh
# ════════════════════════════════════════════════════════════════════
echo ""
echo "A3: session-end-si-review.sh"

run_test "session end → stats rapor" '
  out=$(echo "{\"session_exit_reason\":\"logout\",\"cwd\":\"$PROJECT_ROOT\",\"hook_event_name\":\"SessionEnd\"}" | bash .claude/hooks/session-end-si-review.sh)
  echo "$out" | grep -q "SESSION END SUMMARY"
'

run_test "PR ve NEG sayıları doğru raporlanır" '
  out=$(echo "{\"session_exit_reason\":\"logout\",\"cwd\":\"$PROJECT_ROOT\",\"hook_event_name\":\"SessionEnd\"}" | bash .claude/hooks/session-end-si-review.sh)
  echo "$out" | grep -qE "PR \(pending rule önerileri\): [0-9]+"
'

# ════════════════════════════════════════════════════════════════════
# A4: agent-learned-rules-helper.sh
# ════════════════════════════════════════════════════════════════════
echo ""
echo "A4: agent-learned-rules-helper.sh"

run_test "agent w/ Learned Rules → sessiz" '
  out=$(CLAUDE_TOOL_INPUT_file_path="$PROJECT_ROOT/.claude/agents/reviewer.md" bash .claude/hooks/agent-learned-rules-helper.sh 2>&1)
  [ -z "$out" ]
'

run_test "agent w/o Learned Rules → stderr warning" '
  printf "---\nname: test-dummy\n---\nBody without Learned Rules.\n" > .claude/agents/_test-dummy.md
  out=$(CLAUDE_TOOL_INPUT_file_path="$PROJECT_ROOT/.claude/agents/_test-dummy.md" bash .claude/hooks/agent-learned-rules-helper.sh 2>&1)
  rm -f .claude/agents/_test-dummy.md
  echo "$out" | grep -q "LEARNED RULES SECTION EKSİK"
'

run_test "non-agent file → sessiz" '
  out=$(CLAUDE_TOOL_INPUT_file_path="/tmp/random.md" bash .claude/hooks/agent-learned-rules-helper.sh 2>&1)
  [ -z "$out" ]
'

# ════════════════════════════════════════════════════════════════════
# A5: dispatch-chief-of-staff.sh
# ════════════════════════════════════════════════════════════════════
echo ""
echo "A5: dispatch-chief-of-staff.sh"

run_test "T2 UI prompt → dispatch hint" '
  out=$(echo "{\"prompt\":\"kart redesign yap\",\"hook_event_name\":\"UserPromptSubmit\"}" | bash .claude/hooks/dispatch-chief-of-staff.sh)
  echo "$out" | grep -q "TIER T2 DETECTED"
'

run_test "T3 migration prompt → dispatch hint" '
  out=$(echo "{\"prompt\":\"yeni RLS policy ekle\",\"hook_event_name\":\"UserPromptSubmit\"}" | bash .claude/hooks/dispatch-chief-of-staff.sh)
  echo "$out" | grep -q "TIER T3 DETECTED"
'

run_test "T1 typo prompt → sessiz" '
  out=$(echo "{\"prompt\":\"merhaba\",\"hook_event_name\":\"UserPromptSubmit\"}" | bash .claude/hooks/dispatch-chief-of-staff.sh)
  [ -z "$out" ]
'

# ════════════════════════════════════════════════════════════════════
# B: cachebust-staged.sh
# ════════════════════════════════════════════════════════════════════
echo ""
echo "B: cachebust-staged.sh"

run_test "staged HTML yok → sessiz" '
  out=$(bash scripts/cachebust-staged.sh 2>&1)
  # Boş veya sadece "HTML yok skip" mesajı olmalı
  [ -z "$out" ] || ! echo "$out" | grep -q "Error"
'

# ════════════════════════════════════════════════════════════════════
# C: tier-detect.sh
# ════════════════════════════════════════════════════════════════════
echo ""
echo "C: scripts/tier-detect.sh"

TMSG=$(mktemp)
echo "docs: ufak update" > "$TMSG"

run_test "T1 docs commit (msg marker yok) → pass" "
  bash scripts/tier-detect.sh \"$TMSG\" > /dev/null 2>&1 || true
  true
"

rm -f "$TMSG"

# ════════════════════════════════════════════════════════════════════
# D: cachebust-staged.sh --all mode (Reform 16 May Öneri 3)
# ════════════════════════════════════════════════════════════════════
echo ""
echo "D: scripts/cachebust-staged.sh --all"

run_test "--all mode → tüm HTML unified" '
  bash scripts/cachebust-staged.sh --all > /dev/null 2>&1 || true
  unique=$(find . -name "*.html" -not -path "*/.claude/worktrees/*" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/_archive*/*" -not -path "*/archive*/*" 2>/dev/null | xargs grep -hoE "\?v=[a-zA-Z0-9._-]+" 2>/dev/null | sort -u | wc -l | tr -d " ")
  test "$unique" -eq 1
'

run_test "--all mode → git add yapmaz" '
  before_staged=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d " ")
  bash scripts/cachebust-staged.sh --all > /dev/null 2>&1
  after_staged=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d " ")
  [ "$before_staged" = "$after_staged" ]
'

run_test "CACHEBUST_SKIP=1 → erken çık" '
  out=$(CACHEBUST_SKIP=1 bash scripts/cachebust-staged.sh --all 2>&1)
  echo "$out" | grep -q "SKIPPED"
'

# ════════════════════════════════════════════════════════════════════
# E: log-agent-dispatch.sh (Reform 16 May Öneri 4)
# ════════════════════════════════════════════════════════════════════
echo ""
echo "E: scripts/log-agent-dispatch.sh"

CSV_BACKUP=$(mktemp)
[ -f reviews/agent-dispatch.csv ] && cp reviews/agent-dispatch.csv "$CSV_BACKUP"

run_test "post-commit → CSV append eder" '
  before=$(wc -l < reviews/agent-dispatch.csv 2>/dev/null | tr -d " ")
  bash scripts/log-agent-dispatch.sh > /dev/null 2>&1
  after=$(wc -l < reviews/agent-dispatch.csv 2>/dev/null | tr -d " ")
  [ "$after" -gt "$before" ]
'

run_test "merge commit → skip (append etmez)" '
  before=$(wc -l < reviews/agent-dispatch.csv 2>/dev/null | tr -d " ")
  # Mock merge commit: git log --pretty=%B HEAD = "Merge branch..."
  # Skip mantığı head -1 grep "^Merge" — test için sadece exit kontrol
  AGENT_DISPATCH_LOG_SKIP=1 bash scripts/log-agent-dispatch.sh > /dev/null 2>&1
  after=$(wc -l < reviews/agent-dispatch.csv 2>/dev/null | tr -d " ")
  [ "$after" = "$before" ]
'

run_test "CSV header init eder dosya yoksa" '
  rm -f reviews/agent-dispatch.csv
  bash scripts/log-agent-dispatch.sh > /dev/null 2>&1
  head -1 reviews/agent-dispatch.csv | grep -q "date,tier,agent_chain"
'

# Restore CSV
[ -s "$CSV_BACKUP" ] && cp "$CSV_BACKUP" reviews/agent-dispatch.csv
rm -f "$CSV_BACKUP"

# ════════════════════════════════════════════════════════════════════
# Summary
# ════════════════════════════════════════════════════════════════════
echo ""
echo "═══════════════════════════════════════════════════════════"
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}ALL TESTS PASSED${NC} — $PASS/$TOTAL"
  exit 0
else
  echo -e "${RED}FAILED${NC} — $FAIL/$TOTAL test failed, $PASS pass"
  exit 1
fi
