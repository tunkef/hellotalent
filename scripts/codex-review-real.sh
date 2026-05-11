#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# codex-review-real.sh — Modern Codex CLI integration
# Reform v3.3 — 11 May 2026
#
# T3/T4 commit'lerinde Codex review tetikler. Çıktıyı kaydeder,
# BLOCKER/CRITICAL pattern tespit ederse exit 1 (commit blok).
#
# Çağrı: pre-commit hook'tan tier T3/T4 ise:
#   ./scripts/codex-review-real.sh --tier=T3
#
# Bypass: commit msg `[codex-bypass]` veya `[agent-bypass]`
# Timeout: 120s (codex review default ~30-60s)
#
# Output: .claude/agent-memory/codex-reviews/<sha>-<timestamp>.md
# ════════════════════════════════════════════════════════════════════

set -e

TIER="${1:-T2}"
COMMIT_MSG_FILE="${2:-.git/COMMIT_EDITMSG}"

# Args parse
for arg in "$@"; do
  case $arg in
    --tier=*) TIER="${arg#*=}" ;;
    --msg=*) COMMIT_MSG_FILE="${arg#*=}" ;;
  esac
done

# T2 ve T1 için Codex zorunlu değil
if [ "$TIER" = "T1" ] || [ "$TIER" = "T2" ]; then
  exit 0
fi

# Bypass marker check
msg=$(cat "$COMMIT_MSG_FILE" 2>/dev/null || echo "")
if echo "$msg" | grep -qE '\[codex-bypass\]|\[agent-bypass\]'; then
  echo "[codex-review] Bypassed: marker found in commit msg"
  exit 0
fi

# Codex CLI var mı?
if ! command -v codex >/dev/null 2>&1; then
  echo "[codex-review] Error: codex CLI not installed. Run: npm install -g @openai/codex" >&2
  exit 1
fi

# Codex auth check
if ! codex login status >/dev/null 2>&1; then
  echo "[codex-review] Error: codex not authenticated. Run: codex login" >&2
  exit 1
fi

# Output directory
REVIEW_DIR=".claude/agent-memory/codex-reviews"
mkdir -p "$REVIEW_DIR"

# Title
title=$(echo "$msg" | head -1 | cut -c1-80)
[ -z "$title" ] && title="$TIER tier commit"

# Timestamp + filename
ts=$(date +"%Y%m%d-%H%M%S")
sha_short=$(git rev-parse --short HEAD 2>/dev/null || echo "preinit")
REVIEW_FILE="$REVIEW_DIR/$ts-$sha_short.md"

echo "[codex-review] Tier $TIER detected — running Codex review..."
echo "[codex-review] Output: $REVIEW_FILE"

# Codex review prompt (Codex CLI v0.130+ syntax: --uncommitted ile [PROMPT] mutually exclusive)
# Custom focus prompt'u stdin yerine pre-review note olarak yaz, --uncommitted ile default review
PRE_NOTE_FILE=$(mktemp)
cat > "$PRE_NOTE_FILE" <<EOF
# HelloTalent Studio v3.3 Reform — Tier $TIER review

Focus areas (Codex default review'a ek):
- Security (RLS, auth, KVKK, PII, OWASP)
- Correctness (edge cases, race conditions, silent fails)
- Architecture (SOLID, coupling)
- Data contract (RPC shape, schema invariants)

Final verdict bekleniyor:
- BLOCKER/CRITICAL varsa "🛑 BLOCK_MERGE" mesajı
- Temiz ise "✅ MERGE_OK"
EOF

# Run codex review with timeout — modern syntax
# Fix (12 May): --uncommitted yerine --base main kullanılır.
# Sebep: --uncommitted ana repo working tree'sindeki uncommitted state'i de
# tarıyor (worktree path'inde dahi), yanlış-pozitif [P0] BLOCKER üretiyor.
# --base main branch diff'i sadece commit'leri review eder, daha temiz.
TIMEOUT="${CODEX_TIMEOUT:-180}"
BASE_BRANCH="${CODEX_BASE:-main}"

set +e
gtimeout "$TIMEOUT" codex review --base "$BASE_BRANCH" --title "$title" > "$REVIEW_FILE" 2>&1
codex_exit=$?

# Fallback: gtimeout yoksa (macOS BSD)
if [ "$codex_exit" = "127" ]; then
  codex review --base "$BASE_BRANCH" --title "$title" > "$REVIEW_FILE" 2>&1
  codex_exit=$?
fi
set -e

rm -f "$PRE_NOTE_FILE"

if [ "$codex_exit" -ne 0 ] && [ "$codex_exit" -ne 124 ]; then
  echo "[codex-review] Codex CLI failed (exit $codex_exit). Output:"
  tail -10 "$REVIEW_FILE"
  echo "[codex-review] BYPASS önerilir: commit msg'a [codex-bypass] ekle"
  exit 1
fi

# Timeout
if [ "$codex_exit" = "124" ]; then
  echo "[codex-review] Timeout ($TIMEOUT s). Review yarım kaldı." >&2
  echo "[codex-review] Tail output:"
  tail -5 "$REVIEW_FILE"
  echo "[codex-review] Daha uzun timeout için: CODEX_TIMEOUT=300 git commit ..."
  exit 1
fi

# Parse output — BLOCKER tespit (Codex priority tag P0 dahil — D8 enhancement)
if grep -qE "🛑|BLOCK_MERGE|BLOCKER|CRITICAL|\[P0\]" "$REVIEW_FILE"; then
  cat <<EOF >&2

╔════════════════════════════════════════════════════════════════╗
║  CODEX REVIEW — BLOCKER/CRITICAL TESPİT EDİLDİ                 ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Tier: $TIER                                                       ║
║  Review: $REVIEW_FILE                                          ║
║                                                                ║
║  Issue'ları gör:                                               ║
║    cat $REVIEW_FILE                                            ║
║                                                                ║
║  Bypass (auditable):                                           ║
║    Commit msg'a [codex-bypass] ekle + neden                    ║
║                                                                ║
║  pending-approvals.md'ye düşür ve Tuna karar versin.           ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF

  # pending-approvals'a append
  PENDING="${CLAUDE_PROJECT_DIR:-$HOME/Downloads/Hellotalent}/.claude/agent-memory/pending-approvals.md"
  if [ -f "$PENDING" ]; then
    cat >> "$PENDING" <<EOF

## A_AUTO_$(date +%s): [Codex BLOCKER] $TIER commit blocked
- **Tarih:** $(date +"%Y-%m-%d %H:%M")
- **Tier:** $TIER
- **Review:** \`$REVIEW_FILE\`
- **Title:** $title
- **Karar:** [ ] Onayla (bypass) [ ] Reddet (fix) [ ] Değiştir
- **Bekliyor:** Tuna
EOF
  fi

  exit 1
fi

# Agreement check (✅ MERGE_OK var mı?)
if grep -q "✅ MERGE_OK\|MERGE_OK\|No critical issues" "$REVIEW_FILE"; then
  echo "[codex-review] ✅ MERGE_OK — Codex agreement, commit proceeds"
  # Marker önerisi
  echo "[codex-review] Önerilen commit msg ek: 'codex-reviewed: $REVIEW_FILE'"
  exit 0
fi

# Belirsiz — log uyarı, ama geç
echo "[codex-review] ⚠ Belirsiz Codex output (MERGE_OK ve BLOCKER yok). Manuel inceleme: $REVIEW_FILE"
exit 0
