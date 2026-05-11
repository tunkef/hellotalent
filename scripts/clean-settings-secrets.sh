#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# clean-settings-secrets.sh — Reform v3.4 / P0 fix
# 11 May 2026
#
# Tuna manuel rotate yaptıktan sonra çağrılır.
# .claude/settings.local.json içindeki çıplak JWT/PAT/Service-role
# token'ları REDACTED placeholder ile değiştirir.
#
# Önce: Tuna Supabase Dashboard service_role rotate
#       + GitHub Tokens → eski PAT revoke + yeni PAT
#       + .env.local güncel token'larla update
# Sonra: bash scripts/clean-settings-secrets.sh
#
# Sonuç: settings.local.json'da plain token kalmaz; allowlist match
# etmeyince Tuna permission prompts görür (yeniden onaylar).
# Bu Anthropic telemetry/log/screenshot risk'ini kapatır.
#
# Bypass: SETTINGS_CLEAN_SKIP=1 bash $0
# Geri al: yedek `.claude/settings.local.json.bak-<ts>` üzerinden
# ════════════════════════════════════════════════════════════════════

set -e

PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$HOME/Downloads/Hellotalent}"
SETTINGS="$PROJECT_ROOT/.claude/settings.local.json"

if [ ! -f "$SETTINGS" ]; then
  echo "[clean-secrets] settings.local.json yok: $SETTINGS"
  exit 0
fi

# Yedek
TS=$(date +%Y%m%d-%H%M%S)
BACKUP="$SETTINGS.bak-$TS"
cp "$SETTINGS" "$BACKUP"
echo "[clean-secrets] Yedek: $BACKUP"

# JWT pattern: eyJhbGciOi... (Supabase apikey + service_role)
JWT_COUNT_BEFORE=$(grep -oE 'eyJhbGci[A-Za-z0-9._-]{20,}' "$SETTINGS" 2>/dev/null | wc -l | tr -d ' ')

# GitHub PAT pattern: ghp_...
PAT_COUNT_BEFORE=$(grep -oE 'ghp_[A-Za-z0-9]{30,}' "$SETTINGS" 2>/dev/null | wc -l | tr -d ' ')

# Cloudflare token pattern: cfut_...
CF_COUNT_BEFORE=$(grep -oE 'cfut_[A-Za-z0-9]{20,}' "$SETTINGS" 2>/dev/null | wc -l | tr -d ' ')

# Resend pattern: re_...
RE_COUNT_BEFORE=$(grep -oE '"re_[A-Za-z0-9_-]{20,}"' "$SETTINGS" 2>/dev/null | wc -l | tr -d ' ')

echo "[clean-secrets] Tespit edilen plain secret:"
echo "  JWT (eyJhbGci...)     : $JWT_COUNT_BEFORE"
echo "  GitHub PAT (ghp_...)  : $PAT_COUNT_BEFORE"
echo "  Cloudflare (cfut_...) : $CF_COUNT_BEFORE"
echo "  Resend (re_...)       : $RE_COUNT_BEFORE"

TOTAL=$((JWT_COUNT_BEFORE + PAT_COUNT_BEFORE + CF_COUNT_BEFORE + RE_COUNT_BEFORE))

if [ "$TOTAL" -eq 0 ]; then
  echo "[clean-secrets] ✅ Hiç plain secret yok, temiz"
  rm "$BACKUP"
  exit 0
fi

# macOS BSD sed
sed -i '' -E \
  -e 's/eyJhbGci[A-Za-z0-9._-]{20,}/<REDACTED_JWT>/g' \
  -e 's/ghp_[A-Za-z0-9]{30,}/<REDACTED_GITHUB_PAT>/g' \
  -e 's/cfut_[A-Za-z0-9]{20,}/<REDACTED_CLOUDFLARE_TOKEN>/g' \
  -e 's/"re_[A-Za-z0-9_-]{20,}"/"<REDACTED_RESEND_KEY>"/g' \
  "$SETTINGS" 2>/dev/null || {
    # GNU sed fallback
    sed -i -E \
      -e 's/eyJhbGci[A-Za-z0-9._-]{20,}/<REDACTED_JWT>/g' \
      -e 's/ghp_[A-Za-z0-9]{30,}/<REDACTED_GITHUB_PAT>/g' \
      -e 's/cfut_[A-Za-z0-9]{20,}/<REDACTED_CLOUDFLARE_TOKEN>/g' \
      -e 's/"re_[A-Za-z0-9_-]{20,}"/"<REDACTED_RESEND_KEY>"/g' \
      "$SETTINGS"
  }

# JSON validity check
if ! jq empty "$SETTINGS" 2>/dev/null; then
  echo "[clean-secrets] ❌ JSON broken after cleanup, restoring backup"
  cp "$BACKUP" "$SETTINGS"
  exit 1
fi

# Post-redact verify
JWT_AFTER=$(grep -oE 'eyJhbGci[A-Za-z0-9._-]{20,}' "$SETTINGS" 2>/dev/null | wc -l | tr -d ' ')
PAT_AFTER=$(grep -oE 'ghp_[A-Za-z0-9]{30,}' "$SETTINGS" 2>/dev/null | wc -l | tr -d ' ')

if [ "$JWT_AFTER" -gt 0 ] || [ "$PAT_AFTER" -gt 0 ]; then
  echo "[clean-secrets] ⚠ Hâlâ token kaldı: JWT=$JWT_AFTER PAT=$PAT_AFTER"
  exit 1
fi

echo ""
echo "✅ Cleanup tamam"
echo "  Backup       : $BACKUP"
echo "  Replaced     : $TOTAL plain secret → <REDACTED_*> placeholder"
echo ""
echo "  Sonraki turda permission prompts gelecek (allowlist match etmez)."
echo "  Tuna her komutu yeniden approve eder; yeni tokens .env.local'den okunsun."

exit 0
