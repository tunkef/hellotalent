#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# token-rotation-guide.sh — Token rotation step-by-step rehber
# Reform 16 May 2026 — Token rotation altyapısı
#
# Tuna'ya hangi token'ı nereden nasıl rotate edeceğini gösterir.
# Rotation sonrası: scripts/token-verify.sh ile test, sonra
# scripts/token-age-tracker.sh update ile age reset.
#
# Usage: bash scripts/token-rotation-guide.sh [supabase|github|cloudflare|cf-access|resend|all]
# ════════════════════════════════════════════════════════════════════

set -e

TARGET="${1:-all}"

show_supabase() {
  cat <<'EOF'

═══════════════════════════════════════════════════════════
SUPABASE SERVICE_ROLE KEY ROTATION
═══════════════════════════════════════════════════════════

ADIM 1 — Mevcut key'i revoke et:
  1. https://supabase.com/dashboard/project/_/settings/api-keys
  2. "service_role" satırı → "Reset" tıkla
  3. Confirmation modal → "Generate new key"
  4. Yeni key kopyala (sadece bir kez gösterilir!)

ADIM 2 — Yeni key'i lokal güncelle:
  • Claude Code MCP config:
    ~/Library/Application Support/Claude/claude_desktop_config.json
    içinde "supabase" MCP server'ın "env.SUPABASE_ACCESS_TOKEN" alanını update.
  • Veya environment: ~/.zshrc içinde export SUPABASE_ACCESS_TOKEN=<yeni>
  • Claude Code'u restart et (MCP yeni env okur)

ADIM 3 — Verify:
  bash scripts/token-verify.sh supabase

ADIM 4 — Age tracker reset:
  bash scripts/token-age-tracker.sh update supabase

⚠ ETKİLENEN: tüm Supabase MCP işlemleri, migration apply, RLS yönetimi
EOF
}

show_github() {
  cat <<'EOF'

═══════════════════════════════════════════════════════════
GITHUB PERSONAL ACCESS TOKEN (PAT) ROTATION
═══════════════════════════════════════════════════════════

ADIM 1 — Eski token'ı revoke et:
  1. https://github.com/settings/tokens
  2. Compromise olmuş token bul (genelde "claude-migration-push" veya "ForClaude*")
  3. "Delete" tıkla → confirm

ADIM 2 — Yeni token oluştur:
  1. "Generate new token" → "Generate new token (classic)"
  2. Note: "hellotalent-claude-<YYYY-MM>"
  3. Expiration: 90 days (ZORUNLU — süresiz token YASAK)
  4. Scopes: repo (tüm), workflow
  5. Generate → kopyala

ADIM 3 — Yeni token'ı lokal güncelle:
  • ~/Downloads/Hellotalent/.env.local içinde GITHUB_PERSONAL_ACCESS_TOKEN= satırını update
  • ~/.zshrc içinde export GITHUB_PERSONAL_ACCESS_TOKEN=<yeni> varsa update
  • git remote'unu da güncelle:
    git remote set-url origin https://<yeni-token>@github.com/tunkef/hellotalent.git
    (veya HTTPS URL'i token'sız tut, credential helper kullan)

ADIM 4 — Verify:
  bash scripts/token-verify.sh github

ADIM 5 — Age tracker reset:
  bash scripts/token-age-tracker.sh update github

⚠ ETKİLENEN: git push, gh CLI, GitHub Actions secrets
EOF
}

show_cloudflare() {
  cat <<'EOF'

═══════════════════════════════════════════════════════════
CLOUDFLARE API TOKEN ROTATION
═══════════════════════════════════════════════════════════

ADIM 1 — Eski token'ı revoke et:
  1. https://dash.cloudflare.com/profile/api-tokens
  2. "hellotalent-newsletter-dns" veya benzeri compromise token → "Delete"

ADIM 2 — Yeni token oluştur (sadece gerekiyorsa):
  1. "Create Token" → "Custom Token"
  2. Permissions: Zone:DNS:Edit (sadece hellotalent.ai zone)
  3. TTL: Start now + End 1 year sonrası (süresiz YASAK)
  4. Generate → kopyala

ADIM 3 — .env.local update:
  CLOUDFLARE_API_TOKEN=<yeni>

ADIM 4 — Verify:
  bash scripts/token-verify.sh cloudflare

ADIM 5 — Age tracker:
  bash scripts/token-age-tracker.sh update cloudflare
EOF
}

show_cf_access() {
  cat <<'EOF'

═══════════════════════════════════════════════════════════
CLOUDFLARE ACCESS SERVICE TOKEN ROTATION
═══════════════════════════════════════════════════════════

ADIM 1 — Eski token rotate veya recreate:
  1. https://one.dash.cloudflare.com/ → Zero Trust
  2. Access → Service Auth → Service Tokens
  3. Eski token → "Refresh" (secret değişir, ID aynı)
     veya: Delete + Create new (yeni Client ID + Secret)

ADIM 2 — Yeni TTL: 1 year (süresiz YASAK)

ADIM 3 — .env.local update:
  CF_ACCESS_CLIENT_ID=<yeni>
  CF_ACCESS_CLIENT_SECRET=<yeni>

ADIM 4 — Verify:
  bash scripts/token-verify.sh cf-access

ADIM 5 — Age tracker:
  bash scripts/token-age-tracker.sh update cf-access
EOF
}

show_resend() {
  cat <<'EOF'

═══════════════════════════════════════════════════════════
RESEND API KEY ROTATION
═══════════════════════════════════════════════════════════

ADIM 1 — Eski key revoke:
  1. https://resend.com/api-keys
  2. "ForClaude2" veya compromise key → "Delete"

ADIM 2 — Yeni key (gerekiyorsa):
  1. "Create API Key"
  2. Name: "hellotalent-<purpose>-<YYYY-MM>"
  3. Permission: Sending access (full access YASAK normalde)

ADIM 3 — .env.local update:
  RESEND_NEWSLETTER_KEY=<yeni>

ADIM 4 — Verify:
  bash scripts/token-verify.sh resend

ADIM 5 — Age tracker:
  bash scripts/token-age-tracker.sh update resend
EOF
}

case "$TARGET" in
  supabase)   show_supabase ;;
  github)     show_github ;;
  cloudflare) show_cloudflare ;;
  cf-access)  show_cf_access ;;
  resend)     show_resend ;;
  all)
    show_supabase
    show_github
    show_cloudflare
    show_cf_access
    show_resend
    cat <<'EOF'

═══════════════════════════════════════════════════════════
GENEL KURALLAR
═══════════════════════════════════════════════════════════
• Rotation cycle: 90 gün (default)
• Süresiz token YASAK — her zaman TTL ver
• Yeni token tanımla → ESKİSİNİ HEMEN REVOKE
• Rotation sonrası: verify → age tracker update → git status check
• .env.local'i ASLA commit etme (zaten .gitignore'da)
• Token chat'e paylaşıldıysa: hemen revoke + rotate

Detay: scripts/token-verify.sh, scripts/token-age-tracker.sh
EOF
    ;;
  *)
    echo "Usage: $0 [supabase|github|cloudflare|cf-access|resend|all]"
    exit 1
    ;;
esac

exit 0
