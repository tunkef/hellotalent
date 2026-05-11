#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# codex-pre-deploy.sh — Production push öncesi son güvenlik gate
# Reform v3.4 D8 — 12 May 2026
#
# Son N commit'in toplu Codex review'i. Deploy step'inden önce
# çağrılır. BLOCKER → deploy reject.
#
# Manuel: bash scripts/codex-pre-deploy.sh
# CI: deploy workflow'unda step olarak
#
# Bypass: CODEX_PREDEPLOY_SKIP=1
# ════════════════════════════════════════════════════════════════════

set -e

if [ "${CODEX_PREDEPLOY_SKIP:-}" = "1" ]; then
  echo "[codex-pre-deploy] SKIPPED"
  exit 0
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "[codex-pre-deploy] codex CLI yok, skip" >&2
  exit 0
fi

if ! codex login status >/dev/null 2>&1; then
  echo "[codex-pre-deploy] codex login yok, skip (CI'da problem değil)"
  exit 0
fi

OUT_DIR=".claude/agent-memory/codex-reviews"
mkdir -p "$OUT_DIR"

TS=$(date +%Y%m%d-%H%M%S)
REVIEW_FILE="$OUT_DIR/pre-deploy-$TS.md"

# Base branch (genelde main)
BASE="${PRE_DEPLOY_BASE:-main}"

echo "[codex-pre-deploy] Base: $BASE → HEAD review"
echo "[codex-pre-deploy] Output: $REVIEW_FILE"

TIMEOUT="${CODEX_TIMEOUT:-300}"

set +e
gtimeout "$TIMEOUT" codex review --base "$BASE" --title "Pre-deploy gate $TS" > "$REVIEW_FILE" 2>&1
codex_exit=$?

if [ "$codex_exit" = "127" ]; then
  codex review --base "$BASE" --title "Pre-deploy gate $TS" > "$REVIEW_FILE" 2>&1
  codex_exit=$?
fi
set -e

if [ "$codex_exit" = "124" ]; then
  echo "[codex-pre-deploy] TIMEOUT ($TIMEOUT s). Manuel inceleme önerilir."
  tail -10 "$REVIEW_FILE"
  exit 1
fi

if [ "$codex_exit" -ne 0 ]; then
  echo "[codex-pre-deploy] Codex CLI fail (exit $codex_exit)"
  tail -10 "$REVIEW_FILE"
  exit 1
fi

# BLOCKER detect
if grep -qE "🛑|BLOCK_MERGE|BLOCKER|CRITICAL|\[P0\]" "$REVIEW_FILE"; then
  cat <<EOF >&2

╔════════════════════════════════════════════════════════════════╗
║  CODEX PRE-DEPLOY GATE — BLOCKER tespit                        ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Base: $BASE                                                    ║
║  Review: $REVIEW_FILE                                          ║
║                                                                ║
║  Deploy REJECT — issue fix sonra retry.                        ║
║                                                                ║
║  Bypass: CODEX_PREDEPLOY_SKIP=1 (Tuna karar)                   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
  exit 1
fi

echo "[codex-pre-deploy] ✓ MERGE_OK — deploy proceeds"
echo "  Review: $REVIEW_FILE"
exit 0
