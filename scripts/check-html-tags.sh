#!/usr/bin/env sh
# ─────────────────────────────────────────────────────────────────────────
# check-html-tags.sh — structural guard for static HTML entry files
#
# Catches the class of bugs where an Edit accidentally drops a closing tag
# from a <script src="..."></script> or <link rel="stylesheet" href="...">
# Such drops are silent: ESLint does not parse HTML, and string-based
# regression guards still find the attribute text. But at runtime the HTML
# parser swallows every subsequent sibling into the open tag and nothing
# below loads.
#
# Precedent: K068b hotfix 4f31ff7 — profil-locations.js closing tag dropped,
# breaking profil-summary.js, profil-genel.js, profil-bootstrap.js load
# chain. Sentry caught it post-push (ReferenceError updateDashboardSummary).
#
# Strategy:
# 1. For every file we guard, assert <script ...> open-tag count equals
#    </script> close-tag count.
# 2. For every <script src="..."> line, assert it also contains </script>
#    or is followed by one on the next line.
# 3. Treat any violation as a pre-commit failure.
# ─────────────────────────────────────────────────────────────────────────

set -e

FILES="profil.html ik.html admin.html index.html giris.html uye-ol.html"

err=0

for f in $FILES; do
  if [ ! -f "$f" ]; then
    continue
  fi

  # Count open + close <script> tags using grep (POSIX, works on BSD+GNU).
  # Open: <script followed by whitespace or > (catches <script> and <script src=...>)
  # Close: </script>
  open_count=$(grep -oE '<script[[:space:]>]' "$f" | wc -l | tr -d ' ')
  close_count=$(grep -oE '</script>' "$f" | wc -l | tr -d ' ')

  if [ "$open_count" != "$close_count" ]; then
    echo ""
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║  HTML TAG GUARD — HATA                                      ║"
    echo "╠══════════════════════════════════════════════════════════════╣"
    echo "║  $f: <script> open/close mismatch"
    echo "║  open=$open_count close=$close_count"
    echo "║"
    echo "║  Silent tag drop regression (K068b precedent).              ║"
    echo "║  Browser will swallow siblings into the unclosed tag.       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    err=1
  fi

  # Second pass: flag any <script src="..."> line that lacks </script>
  # on the same line AND is not followed by </script> on the next line.
  # Uses grep -n + awk for peeking; BSD-compatible.
  awk -v file="$f" '
    /<script[[:space:]][^>]*src=/ {
      saved = $0
      saved_nr = NR
      if ((getline peek) > 0) {
        combined = saved " " peek
      } else {
        combined = saved
      }
      if (combined !~ /<\/script>/) {
        printf "%s:%d: UNCLOSED <script src> tag\n  %s\n", file, saved_nr, saved
        unclosed = 1
      }
      # process peek line as normal
      $0 = peek
    }
    END { exit unclosed ? 3 : 0 }
  ' "$f" || err=1
done

if [ $err -ne 0 ]; then
  echo ""
  echo "HTML tag guard failed. Fix the offending tags and re-commit."
  exit 1
fi

exit 0
