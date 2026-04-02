#!/usr/bin/env bash
# check-rls-guard.sh — Asama 48: RLS pre-push guard
#
# Purpose: Migration dosyalarinda CREATE TABLE varsa ENABLE ROW LEVEL SECURITY
#          zorunludur. Eksikse push bloklanir.
#
# Usage:
#   ./scripts/check-rls-guard.sh [file1.sql file2.sql ...]  # belirli dosyalar
#   ./scripts/check-rls-guard.sh                            # git diff ile auto-discover
#   SKIP_RLS_CHECK=1 ./scripts/check-rls-guard.sh           # bypass
#
# Env:
#   GIT_CMD      — injectable mock (testing icin)
#   GIT_RANGE    — diff range (default: origin/main..HEAD)
#   SKIP_RLS_CHECK=1 — bypass
#
# Exit codes:
#   0 = pass (CREATE TABLE yok, ya da RLS var, ya da bypass)
#   1 = fail (CREATE TABLE var ama ENABLE ROW LEVEL SECURITY yok)

set -euo pipefail

GIT_CMD="${GIT_CMD:-git}"
GIT_RANGE="${GIT_RANGE:-origin/main..HEAD}"

# ── Bypass ───────────────────────────────────────────────────────────────────

if [ "${SKIP_RLS_CHECK:-0}" = "1" ]; then
  echo "[rls-guard] SKIP_RLS_CHECK=1 — bypassed"
  exit 0
fi

# ── Dosya listesi ─────────────────────────────────────────────────────────────

if [ "$#" -gt 0 ]; then
  # Arguman verilmisse dogrudan kullan
  FILES=("$@")
else
  # Git diff ile yeni eklenen migration dosyalarini bul
  FILES=()
  while IFS= read -r line; do
    [ -n "$line" ] && FILES+=("$line")
  done < <(
    $GIT_CMD diff --name-only --diff-filter=A "$GIT_RANGE" \
      -- 'supabase/migrations/*.sql' 2>/dev/null || true
  )
fi

if [ "${#FILES[@]}" -eq 0 ]; then
  exit 0
fi

# ── RLS kontrol ───────────────────────────────────────────────────────────────

FAILED=()
for f in "${FILES[@]}"; do
  [ -z "$f" ] && continue
  [ -f "$f" ] || continue
  # Skip template file — it has placeholder names, not real tables
  [[ "$(basename "$f")" == "TEMPLATE.sql" ]] && continue

  content=$(cat "$f")

  # CREATE TABLE sayisi (case-insensitive)
  ct_count=$(echo "$content" | grep -ci "CREATE TABLE" || true)

  if [ "$ct_count" -eq 0 ]; then
    continue
  fi

  # ENABLE ROW LEVEL SECURITY sayisi — her tablo icin bir tane olmali
  rls_count=$(echo "$content" | grep -ci "ENABLE ROW LEVEL SECURITY" || true)

  if [ "$rls_count" -lt "$ct_count" ]; then
    FAILED+=("$f")
  fi
done

# ── Sonuc ─────────────────────────────────────────────────────────────────────

if [ "${#FAILED[@]}" -eq 0 ]; then
  echo "[rls-guard] OK — RLS kontrol gecti"
  exit 0
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  RLS GUARD — HATA                                           ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  CREATE TABLE iceren migration'da RLS eksik!                ║"
echo "║                                                              ║"
echo "║  Eksik dosyalar:                                            ║"
for f in "${FAILED[@]}"; do
  printf "║    - %-56s║\n" "$f"
done
echo "║                                                              ║"
echo "║  Her yeni tablo icin migration'a su satiri ekle:            ║"
echo "║    ALTER TABLE tablo_adi ENABLE ROW LEVEL SECURITY;         ║"
echo "║                                                              ║"
echo "║  Bypass: SKIP_RLS_CHECK=1 git push ...                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
exit 1
