#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# test-pre-push.sh — Pre-push test (Reform v3.4 D7)
# 12 May 2026
#
# Tüm smoke + branch diff'inde değişen feature için E2E.
# Hedef: 3-5 dakika.
#
# Bypass: SKIP_PRE_PUSH_TEST=1 git push ...
# ════════════════════════════════════════════════════════════════════

set -e

if [ "${SKIP_PRE_PUSH_TEST:-}" = "1" ]; then
  echo "[test-pre-push] SKIPPED (SKIP_PRE_PUSH_TEST=1)"
  exit 0
fi

if ! command -v npx >/dev/null 2>&1 || [ ! -d node_modules/@playwright ]; then
  echo "[test-pre-push] Playwright yok, skip"
  exit 0
fi

# Tüm smoke spec'leri
SMOKE_TESTS=$(ls tests/*smoke*.spec.js 2>/dev/null | tr '\n' ' ')

if [ -z "$SMOKE_TESTS" ]; then
  echo "[test-pre-push] Smoke test yok, skip"
  exit 0
fi

echo "[test-pre-push] Çalışacak smoke testler:"
echo "$SMOKE_TESTS" | tr ' ' '\n' | sed 's/^/  /'
echo ""
echo "[test-pre-push] Bypass: SKIP_PRE_PUSH_TEST=1"
echo ""

# Branch diff bazlı E2E selection
UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || echo "origin/main")
DIFF_FILES=$(git diff --name-only "$UPSTREAM"...HEAD 2>/dev/null | head -50)

E2E_TESTS=""
if echo "$DIFF_FILES" | grep -qE '(ik-pipeline|hr-pipeline|hr-pool|ik-cand-drawer)'; then
  if [ -f tests/pipeline-accordion-audit.spec.js ]; then
    E2E_TESTS="$E2E_TESTS tests/pipeline-accordion-audit.spec.js"
  fi
fi

if [ -n "$E2E_TESTS" ]; then
  echo "[test-pre-push] + Branch diff E2E:"
  echo "$E2E_TESTS" | tr ' ' '\n' | sed 's/^/  /'
fi

# Run smoke + selected E2E (max 300s)
TIMEOUT="${PRE_PUSH_TEST_TIMEOUT:-300}"

set +e
gtimeout "$TIMEOUT" npx playwright test $SMOKE_TESTS $E2E_TESTS --project=mobile --project=desktop --reporter=list 2>&1 | tail -30
test_exit=$?
set -e

if [ "$test_exit" = "124" ]; then
  echo "[test-pre-push] TIMEOUT ($TIMEOUT s). Bypass: SKIP_PRE_PUSH_TEST=1 git push ..."
  exit 1
fi

if [ "$test_exit" -ne 0 ]; then
  echo "[test-pre-push] FAIL"
  exit 1
fi

echo "[test-pre-push] ✓ Smoke + E2E pass"
exit 0
