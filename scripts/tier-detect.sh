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

# T3/T4: audit-bypass veya codex-reviewed marker veya bypass
if [ "$TIER" = "T3" ] || [ "$TIER" = "T4" ]; then
  if echo "$msg" | grep -qE '(codex-reviewed:|\[agent-bypass\]|audit-bypass)'; then
    exit 0
  fi

  cat <<EOF >&2

╔════════════════════════════════════════════════════════════════╗
║  TIER-DETECT — $TIER COMMIT BLOK (Reform 11 May)                  ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Security/architecture değişikliği tespit edildi.              ║
║                                                                ║
║  ZORUNLU: reviewer (audit mode) + Codex review.                ║
║                                                                ║
║  Commit message'a şunlardan biri ekle:                         ║
║                                                                ║
║    codex-reviewed: <agreement %>                               ║
║                                                                ║
║  veya bypass (auditable):                                      ║
║                                                                ║
║    [agent-bypass] gerekçe                                      ║
║                                                                ║
║  Detay: .claude/rules/agent-triggers.md                        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
EOF
  exit 1
fi

exit 0
