#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# check-token-strict.sh — lint-staged hook (CSS only)
# Reform v3.3 — 11 May 2026
#
# CLAUDE.md Hot Rule: "hardcoded hex/px YASAK, sadece var(--editorial-*)"
# Bu script staged CSS dosyalardaki hardcoded hex/spacing px violations
# tespit eder. Warning verir (block etmez ilk versiyon — Tuna kararı).
#
# Hard block aktivasyon: TOKEN_STRICT_BLOCK=1 git commit ...
#
# Beyaz liste (sınırlı OK):
#   - 1px solid <token>  (hairline)
#   - 0px / 100% / auto / inherit / unset
#   - var(--*) referansları
#   - /* ... */ comment içi
# ════════════════════════════════════════════════════════════════════

set -e

# Lint-staged file argümanları ile çağrılır
files="$@"

if [ -z "$files" ]; then
  exit 0
fi

violations=0
report=""

for file in $files; do
  [ ! -f "$file" ] && continue

  # Hardcoded hex (3, 4, 6, 8 hane) — var(--*) ve comment dışında
  hex_count=$(grep -nE '#[0-9a-fA-F]{3,8}\b' "$file" 2>/dev/null | grep -v "^\s*//" | grep -v "^\s*/\*" | wc -l | tr -d ' ')

  # Hardcoded font-size px (1-3 hane, sadece font-size/line-height/letter-spacing)
  font_px_count=$(grep -nE '(font-size|line-height|letter-spacing):\s*[0-9]+(px|em|rem)' "$file" 2>/dev/null | grep -v "var(--" | wc -l | tr -d ' ')

  # Hardcoded radius (var(--radius*) dışında)
  radius_count=$(grep -nE 'border-radius:\s*[0-9]+px' "$file" 2>/dev/null | grep -v "var(--" | wc -l | tr -d ' ')

  total=$((hex_count + font_px_count + radius_count))
  if [ "$total" -gt 0 ]; then
    violations=$((violations + total))
    report="$report\n  $file: hex=$hex_count font-px=$font_px_count radius-px=$radius_count"
  fi
done

if [ "$violations" -gt 0 ]; then
  cat <<EOF >&2

[TOKEN-STRICT WARNING] $violations token violation tespit edildi:
$(echo -e "$report")

CLAUDE.md Hot Rule: hardcoded hex/px YASAK, sadece var(--editorial-*) / var(--space-*) / var(--radius*).

Beyaz liste: hairline (1px solid <token>), 0/auto/inherit.

Şimdi sadece warning. Hard block için: TOKEN_STRICT_BLOCK=1 git commit ...
EOF

  if [ "${TOKEN_STRICT_BLOCK:-}" = "1" ]; then
    exit 1
  fi
fi

exit 0
