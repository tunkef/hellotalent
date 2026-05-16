#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# worktree-cleanup.sh — Worktree maintenance
# Reform 16 May 2026 — Öneri 8
#
# Merge edilmiş veya remote'tan silinmiş claude worktree'leri tespit
# eder, raporlar. --apply ile siler (default: dry-run).
#
# KORUNAN:
#   • Main repo working tree
#   • Aktif worktree (içinden çağrılan)
#   • --except=<path> ile explicit korunan
#   • .claude-session-active marker dosyası olan worktree'ler
#   • Cursor IDE worktree'leri (.cursor/worktrees/)
#   • Uncommitted değişikliği olan worktree'ler
#   • Remote'ta hâlâ aktif branch'lerin worktree'leri
#
# Bypass: WORKTREE_CLEANUP_SKIP=1
# Usage:
#   bash scripts/worktree-cleanup.sh                          # dry-run
#   bash scripts/worktree-cleanup.sh --apply                  # sil
#   bash scripts/worktree-cleanup.sh --apply --except=/path   # path koru
# ════════════════════════════════════════════════════════════════════

set -e

# Self-locate — script nereden çağrılırsa çağrılsın repo root'tan başla
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

if [ "${WORKTREE_CLEANUP_SKIP:-}" = "1" ]; then
  exit 0
fi

# Mode: dry-run veya apply
# Args: --apply, --except=<path>
APPLY=0
EXCEPT_PATH=""
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    --except=*) EXCEPT_PATH="${arg#--except=}" ;;
  esac
done

# Main repo root (worktree-aware)
GIT_COMMON=$(git rev-parse --git-common-dir 2>/dev/null)
if [ -n "$GIT_COMMON" ] && [ -d "$GIT_COMMON" ]; then
  MAIN_ROOT=$(cd "$GIT_COMMON/.." && pwd)
else
  echo "[worktree-cleanup] Error: not in a git repo"
  exit 1
fi

# Aktif worktree (script bu worktree'den çağrılırsa silmemeli)
# PWD'den önce resolve et — cd öncesi! Yoksa MAIN_ROOT olur.
CURRENT_WT=$(git rev-parse --show-toplevel 2>/dev/null)

# Ek güvenlik: aktif Claude Code session worktree marker
# .claude/worktrees/*/SESSION_ACTIVE veya .lock dosyası varsa korunur
SESSION_LOCK_PATTERN=".claude-session-active"

cd "$MAIN_ROOT"

echo "[worktree-cleanup] $(date +%Y-%m-%d) — mode: $([ $APPLY -eq 1 ] && echo APPLY || echo DRY-RUN)"
echo "[worktree-cleanup] main: $MAIN_ROOT"
echo "[worktree-cleanup] active: $CURRENT_WT"
echo ""

# Tüm worktree'ler — porcelain format
removed=0
kept=0
skipped=0

git worktree list --porcelain | awk '/^worktree / {print $2}' | while read wt_path; do
  # Main repo'yu skip
  if [ "$wt_path" = "$MAIN_ROOT" ]; then
    continue
  fi

  # Cursor IDE worktree'lerini skip
  if echo "$wt_path" | grep -q "/.cursor/worktrees/"; then
    continue
  fi

  # Aktif worktree'yi skip
  if [ "$wt_path" = "$CURRENT_WT" ]; then
    echo "  [skip] $wt_path (aktif worktree)"
    continue
  fi

  # --except=<path> ile explicit korunan
  if [ -n "$EXCEPT_PATH" ] && [ "$wt_path" = "$EXCEPT_PATH" ]; then
    echo "  [skip] $wt_path (--except ile korundu)"
    continue
  fi

  # Session lock marker varsa skip (aktif Claude Code session)
  if [ -f "$wt_path/$SESSION_LOCK_PATTERN" ]; then
    echo "  [skip] $wt_path (.claude-session-active marker mevcut)"
    continue
  fi

  # Dizin var mı?
  if [ ! -d "$wt_path" ]; then
    echo "  [orphan] $wt_path (dizin yok — prune yapılacak)"
    if [ $APPLY -eq 1 ]; then
      git worktree prune
    fi
    continue
  fi

  # Worktree branch'i tespit
  wt_branch=$(git -C "$wt_path" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

  # Uncommitted değişiklik var mı?
  uncommitted=$(git -C "$wt_path" status --porcelain 2>/dev/null | wc -l | tr -d ' ')
  if [ "$uncommitted" -gt 0 ]; then
    echo "  [keep] $wt_path (branch=$wt_branch, $uncommitted uncommitted change)"
    continue
  fi

  # Branch remote'ta var mı?
  if [ -n "$wt_branch" ] && [ "$wt_branch" != "HEAD" ]; then
    if git show-ref --verify --quiet "refs/remotes/origin/$wt_branch" 2>/dev/null; then
      # Remote'ta var — temiz worktree ama branch hâlâ aktif, dokunma
      echo "  [keep] $wt_path (branch=$wt_branch, remote'ta aktif)"
      continue
    fi
  fi

  # Buraya gelen: detached HEAD veya remote'tan silinmiş + uncommitted yok
  echo "  [REMOVE] $wt_path (branch=$wt_branch — silinebilir)"
  if [ $APPLY -eq 1 ]; then
    git worktree remove "$wt_path" --force 2>/dev/null || {
      echo "    Error: remove failed, manuel müdahale gerekli"
      continue
    }
    echo "    ✓ removed"
  fi
done

echo ""
if [ $APPLY -eq 0 ]; then
  echo "[worktree-cleanup] DRY-RUN tamamlandı. Uygulamak için: bash scripts/worktree-cleanup.sh --apply"
else
  echo "[worktree-cleanup] APPLY tamamlandı. Prune ediliyor..."
  git worktree prune
fi

exit 0
