#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# check-hr-real-mode-gate.sh — HR_REAL_MODE_ENABLED toggle gate
# Reform 16 May 2026 — Tuna direktif: deferred KVKK approval enforcement
#
# HR_REAL_MODE_ENABLED flag'i true yapılırken pending-approvals.md'de
# DEFERRED işaretli A8 veya A27 entry'leri varsa commit blok.
#
# Tetik: pre-commit hook chain (eklenecek) veya manuel
# Bypass: HR_REAL_MODE_GATE_SKIP=1
# ════════════════════════════════════════════════════════════════════

set -e

# Self-locate
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

if [ "${HR_REAL_MODE_GATE_SKIP:-}" = "1" ]; then
  exit 0
fi

# Staged diff — scripts/, docs/ ve .claude/ exclude (self-reference + audit doc false positive önleme)
STAGED_DIFF=$(git diff --cached -- ':(exclude)scripts/' ':(exclude)docs/' ':(exclude).claude/' ':(exclude)pending-approvals*' 2>/dev/null || echo "")

# False → True transition var mı? (.env, .yml, .json gibi config dosyalar)
if ! echo "$STAGED_DIFF" | grep -qE "^\+.*HR_REAL_MODE_ENABLED\s*[=:]\s*['\"]?true"; then
  exit 0
fi

# True'ya çekiliyor — pending DEFERRED entry kontrolü
PENDING=".claude/agent-memory/pending-approvals.md"
if [ ! -f "$PENDING" ]; then
  echo "[hr-real-mode-gate] pending-approvals.md yok, kontrol atlandı"
  exit 0
fi

DEFERRED_COUNT=$(grep -cE "^## A[0-9]+:.*\[DEFERRED until HR_REAL_MODE_ENABLED" "$PENDING" 2>/dev/null || echo 0)

if [ "$DEFERRED_COUNT" -gt 0 ]; then
  cat >&2 <<EOF

╔════════════════════════════════════════════════════════════════╗
║  HR_REAL_MODE_ENABLED GATE — KVKK APPROVAL BEKLİYOR            ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  HR_REAL_MODE_ENABLED=true yapıyorsun ama pending-approvals'da ║
║  $DEFERRED_COUNT DEFERRED entry var:                                       ║
║                                                                ║
EOF
  grep -E "^## A[0-9]+:.*\[DEFERRED" "$PENDING" 2>/dev/null | sed 's/^## /║    /' | cut -c1-66 | awk '{printf "%-66s ║\n", $0}' >&2
  cat >&2 <<EOF
║                                                                ║
║  AKSİYON:                                                      ║
║  1. Avukat görüşmesi yapıldı mı? (A8 + A27 GAP'leri)           ║
║  2. yasal.html TASLAK paragraflar onaylandı mı?                ║
║  3. get_my_notes_about_me() RPC eklendi mi (KVKK md.11)?       ║
║                                                                ║
║  Hepsi tamamsa pending-approvals.md'de DEFERRED → RESOLVED yap ║
║                                                                ║
║  Bypass (Tuna explicit risk kabul):                            ║
║    HR_REAL_MODE_GATE_SKIP=1 git commit ...                     ║
║                                                                ║
║  Detay: scripts/check-hr-real-mode-gate.sh + pending A8/A27    ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
  exit 1
fi

echo "[hr-real-mode-gate] ✓ Pending DEFERRED entry yok, HR_REAL_MODE=true geçişi serbest"
exit 0
