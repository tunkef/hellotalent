#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# tier-detect.sh — Reform 11 May 2026
#
# Staged dosyalardan iş tier'ı belirler (T1/T2/T3/T4) ve commit
# message'da gerekli marker'ları kontrol eder. Bypass auditable.
#
# Tier matrix:
#   T1 — typo, single-line copy, README/docs ufak edit  → solo OK
#   T2 — UI/CSS/JS, HTML page, component               → design-spec ZORUNLU
#   T3 — RLS, migration, edge function, auth, payment  → audit + Codex zorunlu
#   T4 — architecture (new table, API contract)        → architect + Codex
#
# Bypass: commit message'a `[agent-bypass]` veya `[design-bypass]`
# Output: stdout = tier (T1/T2/T3/T4), exit 0 OK, exit 1 BLOK
# ════════════════════════════════════════════════════════════════════

set -e

files=$(git diff --cached --name-only --diff-filter=ACMR)

if [ -z "$files" ]; then
  echo "T1"
  exit 0
fi

# T3/T4 — security/architecture
t3_pattern='^(supabase/migrations/|supabase/functions/|\.env|scripts/codex-bridge\.sh|scripts/codex-review\.sh)'
t4_pattern='^(docs/ARCHITECTURE\.md|docs/RPC-CONTRACT\.md)'

# T2 — UI/component
t2_pattern='^(css/|js/|.*\.html$|.*\.jsx?$|.*\.tsx?$|.*\.vue$|.*\.svelte$|.claude/agents/)'

# T1 — docs/copy/typo (kalan her şey)

if echo "$files" | grep -qE "$t4_pattern"; then
  TIER="T4"
elif echo "$files" | grep -qE "$t3_pattern"; then
  TIER="T3"
elif echo "$files" | grep -qE "$t2_pattern"; then
  TIER="T2"
else
  TIER="T1"
fi

echo "$TIER"

# Commit message kontrol (varsa)
COMMIT_MSG_FILE="${1:-.git/COMMIT_EDITMSG}"
if [ ! -f "$COMMIT_MSG_FILE" ]; then
  exit 0
fi

msg=$(cat "$COMMIT_MSG_FILE" 2>/dev/null || echo "")

# T1 her zaman geçer
if [ "$TIER" = "T1" ]; then
  exit 0
fi

# T2: design-spec marker veya design-bypass zorunlu
if [ "$TIER" = "T2" ]; then
  if echo "$msg" | grep -qE '(design-spec: docs/specs/|\[design-bypass\]|\[agent-bypass\])'; then
    exit 0
  fi

  cat <<'EOF' >&2

╔════════════════════════════════════════════════════════════════╗
║  TIER-DETECT — T2 COMMIT BLOK (Reform 11 May)                  ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  UI/component değişikliği tespit edildi.                       ║
║                                                                ║
║  ZORUNLU: design-spec dosyası + visual mockup + Tuna onayı.    ║
║                                                                ║
║  Commit message'a şunlardan biri ekle:                         ║
║                                                                ║
║    design-spec: docs/specs/<feature>.md                        ║
║                                                                ║
║  veya bypass (auditable, retrospective tetikler):              ║
║                                                                ║
║    [design-bypass] gerekçe                                     ║
║                                                                ║
║  Detay: docs/UI-DOD-template.md + CLAUDE.md Hot Rules          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
  exit 1
fi

# T3/T4: bypass marker var mı kontrol, yoksa otomatik Codex review tetikle
if [ "$TIER" = "T3" ] || [ "$TIER" = "T4" ]; then
  if echo "$msg" | grep -qE '\[agent-bypass\]|\[codex-bypass\]|audit-bypass'; then
    echo "[tier-detect] $TIER bypass marker tespit edildi, Codex review atlanıyor (auditable)"
    exit 0
  fi

  # Marker yoksa otomatik Codex review tetikle
  if [ -x "./scripts/codex-review-real.sh" ]; then
    echo "[tier-detect] $TIER tespit edildi — Codex review otomatik tetikleniyor..."
    if ./scripts/codex-review-real.sh --tier="$TIER" --msg="$COMMIT_MSG_FILE"; then
      echo "[tier-detect] Codex review pass, commit proceeds"
      exit 0
    else
      echo "[tier-detect] Codex review FAIL/BLOCKER — commit blocked. Bypass için commit msg'a [codex-bypass] ekle." >&2
      exit 1
    fi
  fi

  # Codex script yoksa fallback: marker zorunlu
  cat <<EOF >&2

╔════════════════════════════════════════════════════════════════╗
║  TIER-DETECT — $TIER COMMIT BLOK (Codex script yok)            ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Security/architecture değişikliği tespit edildi.              ║
║                                                                ║
║  scripts/codex-review-real.sh executable değil.                ║
║                                                                ║
║  Bypass için commit msg'a:                                     ║
║    [codex-bypass] <gerekçe>                                    ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
  exit 1
fi

exit 0
