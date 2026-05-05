#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# UI Verify Guard — pre-commit BLOCK
# 5 May 2026 — Tuna direktifi: kanıtlı kural, bir daha olmasın
#
# SORUN: Dashboard/shell CSS/JS commit edildiğinde browser görsel
# verify yapılmadan "tamam" denmesi → cache propagate olmamış,
# çelişkili layout fix'leri (align-items: start vs stretch),
# pill radius cache, kart boyut farkları gözden kaçtı.
#
# KURAL: ik-genel / ik-shell / panels/ik-* CSS+JS değişikliği commit
# edilirken UI_VERIFIED=1 ENV var zorunlu. Bypass auditable.
#
# Bypass: UI_VERIFIED=1 git commit ...
# Bypass commit log'da gözükür (env değil ama "ui-verified" notu).
# ════════════════════════════════════════════════════════════════════

set -e

# Sadece staged dosyalar — git working tree değişiklikleri etkilemez
files=$(git diff --cached --name-only --diff-filter=ACMR)

# UI surface dosyaları (dashboard render + shell + panel CSS)
ui_pattern='^(css/panels/ik-|css/ik-shell\.css|css/tokens\.css|js/ik-genel\.js|js/ik-shell\.js|ik\.html|hr-(pool|pipeline|candidate|messages|company|team|campaigns|settings)\.html)'
ui_files=$(echo "$files" | grep -E "$ui_pattern" || true)

if [ -z "$ui_files" ]; then
  exit 0
fi

# UI değişikliği var — verify zorunlu
if [ "${UI_VERIFIED:-}" != "1" ]; then
  cat <<'EOF'

╔════════════════════════════════════════════════════════════════╗
║  UI VERIFY GUARD — COMMIT BLOK                                 ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Dashboard/shell UI değişikliği tespit edildi.                ║
║                                                                ║
║  ZORUNLU adımlar:                                             ║
║                                                                ║
║  1. Local server: http://localhost:3000 (veya 8765)           ║
║  2. ik.html aç — HARD REFRESH (Cmd+Shift+R)                   ║
║  3. Bento kartları gözle tara:                                ║
║     • Radius tutarlı (pill 999, button 10px)                  ║
║     • Tüm kartlar aynı yükseklikte (stretch)                  ║
║     • Title overflow yok                                      ║
║     • Buton içinde simge YOK (Tuna kuralı)                    ║
║     • Footer pattern tutarlı                                  ║
║  4. Dark mode toggle test (OS preference değiştir)            ║
║                                                                ║
║  VERIFY OK ise commit:                                        ║
║    UI_VERIFIED=1 git commit ...                               ║
║                                                                ║
║  AYRINTI:                                                     ║
║    .claude/rules/ui-commit-discipline.md                      ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

Etkilenen dosyalar:
EOF
  echo "$ui_files" | sed 's/^/  - /'
  echo ""
  exit 1
fi

# Bypass kullanıldı — commit'te görünür kalsın
echo "[ui-verify] OK — UI_VERIFIED=1 (bypass kullanıldı, commit message'da not düş)"
exit 0
