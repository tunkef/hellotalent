#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# test-staged-smoke.sh — Pre-commit test (Reform v3.4 D7)
# 12 May 2026
#
# Staged dosyalardan dependency analiz eder, ilgili smoke test'leri
# çalıştırır. Hedef: 30 saniye içinde sonuç.
#
# Bypass: SKIP_PRECOMMIT_TEST=1 git commit ...
# Cron / CI'da skip: TEST_PRECOMMIT_DISABLE=1
# ════════════════════════════════════════════════════════════════════

set -e

if [ "${SKIP_PRECOMMIT_TEST:-}" = "1" ]; then
  echo "[test-staged-smoke] SKIPPED (SKIP_PRECOMMIT_TEST=1)"
  exit 0
fi

if [ "${TEST_PRECOMMIT_DISABLE:-}" = "1" ]; then
  exit 0
fi

# Playwright var mı?
if ! command -v npx >/dev/null 2>&1; then
  echo "[test-staged-smoke] npx yok, test skip"
  exit 0
fi

if [ ! -d node_modules/@playwright ]; then
  echo "[test-staged-smoke] @playwright yüklü değil, test skip"
  exit 0
fi

STAGED=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null)

if [ -z "$STAGED" ]; then
  exit 0
fi

# Test selection
TESTS=()

# UI/CSS değişimi → hellotalent smoke
if echo "$STAGED" | grep -qE '\.(html|css)$|shared\.(js|css)'; then
  TESTS+=("tests/hellotalent.smoke.spec.js")
fi

# Pipeline/HR Hub değişimi → accordion audit
if echo "$STAGED" | grep -qE '(ik-pipeline|ik-pos-list|ik-cand-drawer|hr-pipeline|hr-pool|profil-extras)'; then
  TESTS+=("tests/pipeline-accordion-audit.spec.js")
fi

# Auth/giris değişimi → smoke
if echo "$STAGED" | grep -qE 'giris\.html|auth|uye-ol'; then
  TESTS+=("tests/hellotalent.smoke.spec.js")
fi

# Sadece doc/script değişimi → skip
if [ ${#TESTS[@]} -eq 0 ]; then
  echo "[test-staged-smoke] Test gerekmeyen değişiklik (sadece doc/script)"
  exit 0
fi

# Unique liste
UNIQUE_TESTS=$(printf '%s\n' "${TESTS[@]}" | sort -u | tr '\n' ' ')

echo "[test-staged-smoke] Çalışacak: $UNIQUE_TESTS"
echo "[test-staged-smoke] Bypass: SKIP_PRECOMMIT_TEST=1"
echo ""

# Local server check (dev:start gerekiyor)
if ! curl -s --max-time 2 http://localhost:3000 >/dev/null 2>&1; then
  echo "[test-staged-smoke] WARN: localhost:3000 server yok, Playwright webServer auto-start dener"
fi

# Run with timeout (max 60 saniye pre-commit context)
TIMEOUT="${PRECOMMIT_TEST_TIMEOUT:-60}"

set +e
gtimeout "$TIMEOUT" npx playwright test $UNIQUE_TESTS --project=mobile --reporter=list 2>&1 | tail -20
test_exit=$?
set -e

if [ "$test_exit" = "124" ]; then
  echo "[test-staged-smoke] TIMEOUT ($TIMEOUT s). Bypass için: SKIP_PRECOMMIT_TEST=1 git commit ..."
  exit 1
fi

if [ "$test_exit" -ne 0 ]; then
  echo "[test-staged-smoke] FAIL — testler düştü. Fix veya bypass."
  exit 1
fi

echo "[test-staged-smoke] ✓ Smoke pass"
exit 0
