#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# kpi-snapshot.sh — Reform v3.4 KPI hesaplama
# 11 May 2026
#
# Weekly-maintenance cron tarafından çağrılır. Reform KPI hedeflerini
# ölçer, snapshot kaydı `.claude/agent-memory/kpi-snapshots/<date>.json`.
#
# KPI hedefleri (4 hafta hedef):
#   • Günlük commit ≤ 8
#   • Fix prefix oranı ≤ %20
#   • v2+ revize ≤ 5/ay
#   • Cache-bust versiyon: 1 (otomatik)
#   • Agent dispatch oranı ≥ %80
#
# Output: stdout JSON, snapshot file
# ════════════════════════════════════════════════════════════════════

set -e

PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$HOME/Downloads/Hellotalent}"
cd "$PROJECT_ROOT" 2>/dev/null || cd /

OUT_DIR="$PROJECT_ROOT/.claude/agent-memory/kpi-snapshots"
mkdir -p "$OUT_DIR"

date_today=$(date +%Y-%m-%d)
SNAPSHOT="$OUT_DIR/$date_today.json"

# 7 gün
commit_7d=$(git log --since="7 days ago" --oneline --no-merges 2>/dev/null | wc -l | tr -d ' ')
fix_7d=$(git log --since="7 days ago" --oneline --no-merges 2>/dev/null | grep -ciE "^[a-f0-9]+ fix" || echo 0)

# 30 gün
commit_30d=$(git log --since="30 days ago" --oneline --no-merges 2>/dev/null | wc -l | tr -d ' ')
fix_30d=$(git log --since="30 days ago" --oneline --no-merges 2>/dev/null | grep -ciE "^[a-f0-9]+ fix" || echo 0)
revize_30d=$(git log --since="30 days ago" --oneline --no-merges 2>/dev/null | grep -ciE "v[2-9]|round-[2-9]|redesign|revize" || echo 0)

# Cache-bust versiyon sayısı (HTML'lerdeki unique ?v=) — worktree exclude
cachebust_count=$(grep -rhoE --exclude-dir=.claude/worktrees --exclude-dir=node_modules "\?v=[a-zA-Z0-9._-]+" --include="*.html" . 2>/dev/null | sort -u | wc -l | tr -d ' ')

# Agent dispatch CSV (toplam)
dispatch_total=0
if [ -f reviews/agent-dispatch.csv ]; then
  dispatch_total=$(grep -c "," reviews/agent-dispatch.csv 2>/dev/null || echo 0)
  dispatch_total=$((dispatch_total - 1))  # header
  [ "$dispatch_total" -lt 0 ] && dispatch_total=0
fi

# 7d agent dispatch
dispatch_7d=0
if [ -f reviews/agent-dispatch.csv ]; then
  cutoff_date=$(date -v -7d +"%Y-%m-%d" 2>/dev/null || date -d "7 days ago" +"%Y-%m-%d" 2>/dev/null || echo "1970-01-01")
  dispatch_7d=$(awk -F, -v c="$cutoff_date" 'NR>1 && $1 >= c' reviews/agent-dispatch.csv 2>/dev/null | wc -l | tr -d ' ')
fi

# Oranlar
fix_pct_30d=$([ "$commit_30d" -gt 0 ] && echo $((fix_30d * 100 / commit_30d)) || echo 0)
fix_pct_7d=$([ "$commit_7d" -gt 0 ] && echo $((fix_7d * 100 / commit_7d)) || echo 0)
daily_avg_7d=$((commit_7d / 7))

# Dispatch oranı: T2+ commit'lere göre (T1 hariç). Yaklaşım: dispatch_7d / commit_7d
dispatch_ratio=0
[ "$commit_7d" -gt 0 ] && dispatch_ratio=$((dispatch_7d * 100 / commit_7d))

# JSON snapshot
cat > "$SNAPSHOT" <<EOF
{
  "date": "$date_today",
  "period": {
    "commit_7d": $commit_7d,
    "commit_30d": $commit_30d,
    "fix_7d": $fix_7d,
    "fix_30d": $fix_30d,
    "revize_30d": $revize_30d
  },
  "kpi": {
    "daily_avg_commit_7d": $daily_avg_7d,
    "fix_prefix_pct_7d": $fix_pct_7d,
    "fix_prefix_pct_30d": $fix_pct_30d,
    "v2_revize_30d": $revize_30d,
    "cachebust_unique_versions": $cachebust_count,
    "agent_dispatch_total": $dispatch_total,
    "agent_dispatch_7d": $dispatch_7d,
    "agent_dispatch_ratio_pct_7d": $dispatch_ratio
  },
  "targets": {
    "daily_avg_commit": 8,
    "fix_prefix_pct_max": 20,
    "v2_revize_max_30d": 5,
    "cachebust_unique_max": 1,
    "agent_dispatch_ratio_min_pct": 80
  },
  "status": {
    "daily_commit": $([ "$daily_avg_7d" -le 8 ] && echo '"OK"' || echo '"OVER"'),
    "fix_prefix": $([ "$fix_pct_7d" -le 20 ] && echo '"OK"' || echo '"OVER"'),
    "v2_revize": $([ "$revize_30d" -le 5 ] && echo '"OK"' || echo '"OVER"'),
    "cachebust": $([ "$cachebust_count" -le 1 ] && echo '"OK"' || echo '"OVER"'),
    "agent_dispatch": $([ "$dispatch_ratio" -ge 80 ] && echo '"OK"' || echo '"UNDER"')
  }
}
EOF

# Stdout report
cat <<EOF
[kpi-snapshot] $date_today
  Günlük commit (7d ort)   : $daily_avg_7d / 8 (target)
  Fix prefix oranı (7d)    : $fix_pct_7d% / ≤20%
  Fix prefix oranı (30d)   : $fix_pct_30d% / ≤20%
  v2+ revize (30d)         : $revize_30d / ≤5
  Cache-bust unique versions: $cachebust_count / 1
  Agent dispatch (7d/total): $dispatch_7d / $dispatch_total
  Dispatch ratio (7d)      : $dispatch_ratio% / ≥80%

  Snapshot: $SNAPSHOT
EOF

exit 0
