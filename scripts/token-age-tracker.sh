#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# token-age-tracker.sh — Token rotation cycle takip
# Reform 16 May 2026 — Token rotation altyapısı
#
# Token rotation tarihlerini JSON'da takip eder. 90 gün geçince
# uyarı verir. weekly-maintenance.sh entegrasyonu için report
# komutu var.
#
# Tracker: .claude/agent-memory/token-ages.json
# {
#   "supabase":   "2026-05-16",
#   "github":     "2026-04-22",
#   ...
# }
#
# Usage:
#   bash scripts/token-age-tracker.sh update <service>     # bugün ile reset
#   bash scripts/token-age-tracker.sh report               # her token'ın yaşı
#   bash scripts/token-age-tracker.sh alert                # 80+ gün olanları listele (exit 1 if any)
# ════════════════════════════════════════════════════════════════════

set -e

# Self-locate — script nereden çağrılırsa çağrılsın repo root'tan çalış
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SELF_REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$SELF_REPO_ROOT"

ACTION="${1:-report}"
SERVICE="${2:-}"

# Repo root resolve (worktree-aware) — git komutları için
GIT_COMMON=$(git rev-parse --git-common-dir 2>/dev/null || echo "")
if [ -n "$GIT_COMMON" ] && [ -d "$GIT_COMMON" ]; then
  REPO_ROOT=$(cd "$GIT_COMMON/.." && pwd)
else
  REPO_ROOT="$SELF_REPO_ROOT"
fi

TRACKER="$REPO_ROOT/.claude/agent-memory/token-ages.json"
mkdir -p "$(dirname "$TRACKER")"

# Init dosyası yoksa
if [ ! -f "$TRACKER" ]; then
  cat > "$TRACKER" <<'EOF'
{
  "supabase": "1970-01-01",
  "github": "1970-01-01",
  "cloudflare": "1970-01-01",
  "cf-access": "1970-01-01",
  "resend": "1970-01-01"
}
EOF
fi

# Date diff helper (macOS BSD + GNU compat)
days_since() {
  local from="$1"
  local now
  now=$(date +%Y-%m-%d)
  local from_epoch now_epoch
  # macOS BSD date veya GNU date
  if from_epoch=$(date -j -f "%Y-%m-%d" "$from" "+%s" 2>/dev/null); then
    now_epoch=$(date -j -f "%Y-%m-%d" "$now" "+%s")
  else
    from_epoch=$(date -d "$from" "+%s")
    now_epoch=$(date -d "$now" "+%s")
  fi
  echo $(( (now_epoch - from_epoch) / 86400 ))
}

case "$ACTION" in
  update)
    if [ -z "$SERVICE" ]; then
      echo "Usage: $0 update <supabase|github|cloudflare|cf-access|resend>"
      exit 1
    fi
    today=$(date +%Y-%m-%d)
    # JSON update — jq varsa kullan, yoksa sed fallback
    if command -v jq >/dev/null 2>&1; then
      tmp=$(mktemp)
      jq --arg s "$SERVICE" --arg d "$today" '.[$s] = $d' "$TRACKER" > "$tmp"
      mv "$tmp" "$TRACKER"
    else
      # Naive sed (key value değiştir)
      sed -i.bak -E "s|(\"$SERVICE\":[[:space:]]*\")[^\"]+(\")|\1$today\2|" "$TRACKER"
      rm -f "${TRACKER}.bak"
    fi
    echo "[token-age-tracker] $SERVICE → $today (90 gün döngüsü reset)"
    ;;

  report)
    echo "[token-age-tracker] Token yaşları ($(date +%Y-%m-%d))"
    echo ""
    printf "  %-12s %-12s %-8s %s\n" "Service" "Last Rotate" "Days" "Status"
    printf "  %-12s %-12s %-8s %s\n" "-------" "-----------" "----" "------"
    # jq tercih, yoksa basit parse
    if command -v jq >/dev/null 2>&1; then
      jq -r 'to_entries[] | "\(.key)|\(.value)"' "$TRACKER" | while IFS='|' read service date; do
        days=$(days_since "$date")
        if [ "$days" -ge 90 ]; then
          status="⚠ ROTATE OVERDUE"
        elif [ "$days" -ge 80 ]; then
          status="◑ rotate yakın (10 gün)"
        elif [ "$days" -ge 60 ]; then
          status="○ rotation cycle 2/3"
        else
          status="✓ ok"
        fi
        printf "  %-12s %-12s %-8s %s\n" "$service" "$date" "$days" "$status"
      done
    else
      echo "  (jq yok — JSON raw göster)"
      cat "$TRACKER"
    fi
    ;;

  alert)
    # 80+ gün olanları listele, varsa exit 1
    overdue=0
    if command -v jq >/dev/null 2>&1; then
      while IFS='|' read service date; do
        days=$(days_since "$date")
        if [ "$days" -ge 80 ]; then
          echo "⚠ [$service] $days gün → rotation gerekli (last: $date)"
          overdue=$((overdue + 1))
        fi
      done < <(jq -r 'to_entries[] | "\(.key)|\(.value)"' "$TRACKER")
    fi
    if [ "$overdue" -gt 0 ]; then
      echo ""
      echo "Toplam $overdue token rotation bekliyor."
      echo "Rehber: bash scripts/token-rotation-guide.sh all"
      exit 1
    fi
    echo "[token-age-tracker] Tüm token'lar 80 gün altında — aksiyon yok."
    ;;

  *)
    echo "Usage: $0 [update <service>|report|alert]"
    exit 1
    ;;
esac

exit 0
