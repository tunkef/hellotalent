#!/usr/bin/env bash
# Weekly Learned Rules review — called manually or via cron every Sunday
# chief-of-staff wrapper to scan all agent .md files for new Learned Rules

set -e

AGENTS_DIR=~/Downloads/Hellotalent/.claude/agents
PENDING=~/Downloads/Hellotalent/.claude/agent-memory/pending-rules.md
REPORT=~/Downloads/Hellotalent/.claude/agent-memory/weekly-rules-review-$(date +%Y%m%d).md

echo "# Weekly Learned Rules Review — $(date +%Y-%m-%d)" > "$REPORT"
echo "" >> "$REPORT"

for agent_file in "$AGENTS_DIR"/*.md; do
  agent_name=$(basename "$agent_file" .md)

  # Skip CHANGELOG
  [ "$agent_name" = "CHANGELOG" ] && continue

  # Extract Learned Rules section
  rules=$(awk '/^## Learned Rules/,0' "$agent_file" | tail -n +2)

  if [ -n "$rules" ]; then
    count=$(echo "$rules" | grep -c "^###" || echo 0)

    echo "## $agent_name" >> "$REPORT"
    echo "Active rules: $count" >> "$REPORT"
    echo "" >> "$REPORT"

    if [ "$count" -gt 20 ]; then
      echo "**WARNING:** exceeds quota (20). Oldest LOW/MEDIUM should be SUPERSEDED." >> "$REPORT"
      echo "" >> "$REPORT"
    fi
  fi
done

echo "" >> "$REPORT"
echo "## Pending Rules Queue" >> "$REPORT"
if [ -f "$PENDING" ]; then
  pending_count=$(grep -c "^## PR" "$PENDING" 2>/dev/null || echo 0)
  echo "Pending approval: $pending_count" >> "$REPORT"
fi

echo ""
echo "[review] Report: $REPORT"
cat "$REPORT"

exit 0
