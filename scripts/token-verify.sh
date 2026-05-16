#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# token-verify.sh — Token rotation sonrası canlı doğrulama
# Reform 16 May 2026 — Token rotation altyapısı
#
# Yeni token .env.local'a girildikten sonra her servisle gerçek API
# çağrısı yapar, geçerli olduğunu doğrular. 401/403 dönerse FAIL.
#
# Usage: bash scripts/token-verify.sh [supabase|github|cloudflare|cf-access|resend|all]
# ════════════════════════════════════════════════════════════════════

set -e

# Self-locate — script nereden çağrılırsa çağrılsın repo root'tan çalış
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

TARGET="${1:-all}"

# .env.local source (silent) — repo root'ta
if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local 2>/dev/null || true
  set +a
fi

# Supabase token MCP config'den de oku (B2 — token-tracker entegrasyon)
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  MCP_CONFIG="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
  if [ -f "$MCP_CONFIG" ] && command -v jq >/dev/null 2>&1; then
    SUPABASE_ACCESS_TOKEN=$(jq -r '.mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN // empty' "$MCP_CONFIG" 2>/dev/null || echo "")
    export SUPABASE_ACCESS_TOKEN
  fi
fi

PASS=0
FAIL=0

# Pretty status
ok() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }
skip() { echo "  ⊘ $1 (env var yok)"; }

verify_supabase() {
  echo ""
  echo "─── Supabase service_role ──"
  if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
    skip "SUPABASE_ACCESS_TOKEN (Claude Code plugin-managed, manuel test: export SUPABASE_ACCESS_TOKEN=<token>)"
    return
  fi
  # Anlamlı API check: list_projects
  resp=$(curl -sS -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    "https://api.supabase.com/v1/projects" 2>/dev/null || echo "000")
  if [ "$resp" = "200" ]; then
    ok "Supabase API token geçerli (HTTP 200)"
  else
    fail "Supabase API token FAIL (HTTP $resp)"
  fi
}

verify_github() {
  echo ""
  echo "─── GitHub PAT ──"
  if [ -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]; then
    skip "GITHUB_PERSONAL_ACCESS_TOKEN"
    return
  fi
  resp=$(curl -sS -o /dev/null -w "%{http_code}" \
    -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
    "https://api.github.com/user" 2>/dev/null || echo "000")
  if [ "$resp" = "200" ]; then
    ok "GitHub PAT geçerli (HTTP 200)"
  else
    fail "GitHub PAT FAIL (HTTP $resp)"
  fi
}

verify_cloudflare() {
  echo ""
  echo "─── Cloudflare API Token ──"
  if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
    skip "CLOUDFLARE_API_TOKEN"
    return
  fi
  resp=$(curl -sS -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
    "https://api.cloudflare.com/client/v4/user/tokens/verify" 2>/dev/null || echo "000")
  if [ "$resp" = "200" ]; then
    ok "Cloudflare API token geçerli (HTTP 200)"
  else
    fail "Cloudflare API token FAIL (HTTP $resp)"
  fi
}

verify_cf_access() {
  echo ""
  echo "─── Cloudflare Access Service Token ──"
  if [ -z "${CF_ACCESS_CLIENT_ID:-}" ] || [ -z "${CF_ACCESS_CLIENT_SECRET:-}" ]; then
    skip "CF_ACCESS_CLIENT_ID/SECRET"
    return
  fi
  # CF Access token verify endpoint yok, ID format'ı kontrol
  if echo "$CF_ACCESS_CLIENT_ID" | grep -qE "^[a-z0-9]+\.access$"; then
    ok "CF Access Client ID format geçerli"
  else
    fail "CF Access Client ID format BOZUK ($CF_ACCESS_CLIENT_ID)"
  fi
  if [ ${#CF_ACCESS_CLIENT_SECRET} -ge 32 ]; then
    ok "CF Access Client Secret length geçerli (${#CF_ACCESS_CLIENT_SECRET} char)"
  else
    fail "CF Access Client Secret çok kısa (${#CF_ACCESS_CLIENT_SECRET} char)"
  fi
}

verify_resend() {
  echo ""
  echo "─── Resend API Key ──"
  if [ -z "${RESEND_NEWSLETTER_KEY:-}" ]; then
    skip "RESEND_NEWSLETTER_KEY"
    return
  fi
  resp=$(curl -sS -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $RESEND_NEWSLETTER_KEY" \
    "https://api.resend.com/api-keys" 2>/dev/null || echo "000")
  if [ "$resp" = "200" ] || [ "$resp" = "401" ]; then
    # 401 = key invalid, 200 = OK. 403 list permission yok ama valid olabilir.
    if [ "$resp" = "200" ]; then
      ok "Resend API key geçerli (HTTP 200)"
    else
      fail "Resend API key FAIL (HTTP $resp)"
    fi
  else
    fail "Resend API key durumu bilinmiyor (HTTP $resp)"
  fi
}

case "$TARGET" in
  supabase)   verify_supabase ;;
  github)     verify_github ;;
  cloudflare) verify_cloudflare ;;
  cf-access)  verify_cf_access ;;
  resend)     verify_resend ;;
  all)
    verify_supabase
    verify_github
    verify_cloudflare
    verify_cf_access
    verify_resend
    ;;
  *)
    echo "Usage: $0 [supabase|github|cloudflare|cf-access|resend|all]"
    exit 1
    ;;
esac

echo ""
echo "═══════════════════════════════════════════════════════════"
if [ "$FAIL" -eq 0 ]; then
  echo "[token-verify] $PASS pass, $FAIL fail — tüm test geçti"
  exit 0
else
  echo "[token-verify] $PASS pass, $FAIL fail — başarısız token var"
  exit 1
fi
