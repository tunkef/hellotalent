#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# verify-pending-approvals.sh — Audit-driven verification helper
# Reform 16 May 2026 — CTO learning: claim-driven vs verify-driven
#
# pending-approvals.md aktif entry'lerin gerçek state'ini kontrol eder:
#   - Migration LIVE mi? (supabase/migrations dosya + DB'de uygulanmış)
#   - RPC/function DB'de var mı?
#   - Cron job DB'de var mı?
#
# RESOLVED candidate'leri raporlar — manuel RESOLVED işareti için bilgi.
#
# Bu script Supabase MCP'ye doğrudan erişmez — proxy script.
# Asıl DB query Claude Code session'ında supabase MCP üzerinden yapılır.
# Bu script: pending-approvals.md'den aktif entry başlıklarını çıkarır,
# verify checklist üretir.
#
# Usage: bash scripts/verify-pending-approvals.sh
# ════════════════════════════════════════════════════════════════════

set -e

# Self-locate
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

PENDING="$PWD/.claude/agent-memory/pending-approvals.md"

if [ ! -f "$PENDING" ]; then
  echo "[verify-pending-approvals] pending-approvals.md bulunamadı"
  exit 0
fi

echo "═══════════════════════════════════════════════════════════"
echo "Pending Approvals Verify Helper — $(date +%Y-%m-%d)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Aktif entry'ler (RESOLVED işareti olmayan A* başlıklar)
echo "## Aktif Pending Entries"
echo ""
grep -E "^## A[0-9]+:" "$PENDING" 2>/dev/null | grep -v "RESOLVED" | while IFS= read -r line; do
  # Entry ID extract (A8, A27, vs)
  entry_id=$(echo "$line" | grep -oE "^## A[0-9]+" | sed 's/^## //')
  echo "  • $line"
done
echo ""

# Verify checklist — entry içinde geçen migration/function/cron isimlerini çıkar
echo "## Verify Checklist"
echo ""
echo "Aşağıdaki DB objelerini Claude Code'a verify ettir (supabase MCP):"
echo ""

# Migration referansları
echo "### Migrations referenced in active entries:"
awk '/^## A[0-9]+:.*\[RESOLVED/,/^## A[0-9]+:/{next} /^## A[0-9]+:/{flag=!/RESOLVED/} flag && /migration|sql/' "$PENDING" 2>/dev/null \
  | grep -oE "[0-9]{14}[_a-z0-9]+\.sql" 2>/dev/null | sort -u | head -10 | sed 's/^/  - /'

# Function referansları (snake_case)
echo ""
echo "### RPC/Functions referenced in active entries:"
awk '/^## A[0-9]+:.*\[RESOLVED/,/^## A[0-9]+:/{next} /^## A[0-9]+:/{flag=!/RESOLVED/} flag' "$PENDING" 2>/dev/null \
  | grep -oE "\b[a-z][a-z0-9_]{5,}\(" 2>/dev/null | sed 's/($//' | sort -u | head -10 | sed 's/^/  - /'

# Column referansları
echo ""
echo "### Columns referenced in active entries:"
awk '/^## A[0-9]+:.*\[RESOLVED/,/^## A[0-9]+:/{next} /^## A[0-9]+:/{flag=!/RESOLVED/} flag' "$PENDING" 2>/dev/null \
  | grep -oE "notify_[a-z_]+|retention_[a-z_]+" 2>/dev/null | sort -u | head -10 | sed 's/^/  - /'

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Next step: Claude Code'a 'pending verify yap' de — supabase MCP"
echo "ile yukarıdaki obje'leri DB'de check edip stale entry'leri"
echo "RESOLVED işaretler."
echo ""
echo "Bu script Reform 16 May 2026 CTO learning'i:"
echo "  Claim-driven audit (entry açık görünüyor) ≠ Verify-driven audit"
echo "  (DB'de LIVE mı kontrol). 4 entry bu session keşfedildi (A10, A11,"
echo "  A25, A27 GAP-3 — hepsi LIVE ama log'da PENDING idi)."
echo "═══════════════════════════════════════════════════════════"

exit 0
