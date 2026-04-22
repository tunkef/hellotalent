#!/usr/bin/env bash
# Codex Auto-Review — Studio v3 T3/T4 tier gate
# Called automatically by pre-commit hook when tier detected as T3 or T4.
# Exit 0 = agreement OK, exit 1 = conflict (commit block).

set -e

# Parse args
TIER="T2"
FILES=""
while [[ $# -gt 0 ]]; do
  case $1 in
    --tier=*) TIER="${1#*=}"; shift ;;
    --file=*) FILES="$FILES ${1#*=}"; shift ;;
    *) shift ;;
  esac
done

if [[ "$TIER" != "T3" && "$TIER" != "T4" ]]; then
  echo "[codex-review] Tier $TIER — Codex not required. Exit."
  exit 0
fi

TS=$(date +%Y%m%d-%H%M%S)
OUTPUT=~/Downloads/Hellotalent/.claude/agent-memory/codex-reviews/codex-$TS.json
mkdir -p "$(dirname "$OUTPUT")"

echo "[codex-review] Tier $TIER — triggering Codex (via codex-rescue plugin or CLI)..."

# PLACEHOLDER: Actual Codex invocation
# Option 1: Codex CLI directly (if installed)
# codex review --files "$FILES" --output "$OUTPUT"
#
# Option 2: Codex via codex-rescue plugin
# claude agent codex-rescue --task "review for security + tech debt: $FILES"
#
# Option 3: External GPT-5 via API (requires OPENAI_API_KEY)
# curl -s https://api.openai.com/v1/... (deprecated path, not using)

# For now, write a skeleton JSON
cat > "$OUTPUT" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "tier": "$TIER",
  "files": "$FILES",
  "status": "placeholder",
  "note": "Codex integration pending. Actual invocation requires OPENAI_API_KEY or Codex CLI. See docs/EMERGENCY.md section 4 for bypass protocol.",
  "agreement_with_native": null,
  "findings": []
}
EOF

echo "[codex-review] Output: $OUTPUT"
echo "[codex-review] NOTE: Codex integration is placeholder. Configure OPENAI_API_KEY + actual API call before Hafta 2 dogfood."

# Default exit 0 until real integration — do NOT block commits during placeholder phase
exit 0
