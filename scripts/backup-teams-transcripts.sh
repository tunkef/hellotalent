#!/usr/bin/env bash
# Backup Agent Teams transcripts — called at session end
# Preserves peer chat history for debug, rollback, and learning

set -e

TS=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=~/Downloads/Hellotalent/.claude/agent-memory/teams-backups
mkdir -p "$BACKUP_DIR"

# Claude Code stores subagent transcripts per session
CLAUDE_PROJECT_DIR=~/.claude/projects

# Find current HelloTalent project session
SESSION_DIR=$(find "$CLAUDE_PROJECT_DIR" -maxdepth 2 -type d -name "*Hellotalent*" 2>/dev/null | head -1)

if [ -z "$SESSION_DIR" ]; then
  echo "[backup] No Hellotalent session dir found in $CLAUDE_PROJECT_DIR"
  exit 0
fi

# Find subagents dir
SUBAGENTS_DIR="$SESSION_DIR/subagents"

if [ ! -d "$SUBAGENTS_DIR" ]; then
  echo "[backup] No subagents dir in session"
  exit 0
fi

# Create tarball
TARBALL="$BACKUP_DIR/teams-backup-$TS.tar.gz"
tar -czf "$TARBALL" -C "$SUBAGENTS_DIR" . 2>/dev/null

echo "[backup] Teams transcripts → $TARBALL"

# 7-day retention
find "$BACKUP_DIR" -name "teams-backup-*.tar.gz" -mtime +7 -delete

echo "[backup] Retention cleanup complete (>7 days removed)"

exit 0
