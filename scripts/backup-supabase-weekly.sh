#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# backup-supabase-weekly.sh — Reform v3.4 P1.6
# 11 May 2026
#
# Weekly Supabase db dump (schema + data) — launchd Pazar 04:00.
# Supabase Pro PITR'e ek defense-in-depth (local backup).
# Retention: son 4 hafta (24 gün).
#
# Manuel:
#   bash scripts/backup-supabase-weekly.sh
#
# Restore:
#   psql "$SUPABASE_DB_URL" -f .claude/agent-memory/backups/db-<date>.sql
# ════════════════════════════════════════════════════════════════════

set -e

PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$HOME/Downloads/Hellotalent}"
cd "$PROJECT_ROOT" 2>/dev/null || cd /

BACKUP_DIR="$PROJECT_ROOT/.claude/agent-memory/backups"
mkdir -p "$BACKUP_DIR"

TS=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db-$TS.sql"

# supabase CLI ile linked project dump
if ! command -v supabase >/dev/null 2>&1; then
  echo "[backup-supabase] Error: supabase CLI yok. brew install supabase/tap/supabase" >&2
  exit 1
fi

# Linked project check
if ! supabase status 2>&1 | grep -q "linked"; then
  echo "[backup-supabase] WARN: supabase link uncoupled. Önce:" >&2
  echo "  supabase link --project-ref <ref>" >&2
  # Continue anyway with project ref env
fi

PROJECT_REF="${SUPABASE_PROJECT_REF:-cpwibefquojehjehtrog}"

# Dump (schema + data) — production
echo "[backup-supabase] Starting dump → $BACKUP_FILE"

if supabase db dump --linked > "$BACKUP_FILE" 2>&1; then
  size=$(du -h "$BACKUP_FILE" | awk '{print $1}')
  echo "[backup-supabase] ✓ Dump complete: $size"
else
  echo "[backup-supabase] ✗ Dump failed. Last 5 lines:" >&2
  tail -5 "$BACKUP_FILE" >&2
  rm "$BACKUP_FILE"
  exit 1
fi

# Compress
gzip "$BACKUP_FILE"
echo "[backup-supabase] Compressed: $BACKUP_FILE.gz"

# Retention: 24 günden eski (.gz) sil
deleted=$(find "$BACKUP_DIR" -name "db-*.sql.gz" -mtime +24 -delete -print 2>/dev/null | wc -l | tr -d ' ')
[ "$deleted" -gt 0 ] && echo "[backup-supabase] Retention: $deleted eski dump silindi"

# Stats
total_backups=$(ls "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null | wc -l | tr -d ' ')
total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | awk '{print $1}')
echo "[backup-supabase] Toplam: $total_backups dump, $total_size disk"

exit 0
