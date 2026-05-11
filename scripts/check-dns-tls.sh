#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# check-dns-tls.sh — DNS + TLS Sertifika Sağlık Kontrolü
# Reform v3.4 D2 — 12 May 2026
#
# Production domain (hellotalent.ai) için:
#   - DNS A/AAAA/CNAME kayıtları (GitHub Pages IP'leri)
#   - TLS sertifika bitiş tarihi (<30 gün uyarı)
#   - SPF/DKIM/DMARC kayıtları
#
# Manuel: bash scripts/check-dns-tls.sh
# Çıktı: .claude/agent-memory/dns-tls-reports/<date>.md
# ════════════════════════════════════════════════════════════════════

set -e

PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$HOME/Downloads/Hellotalent}"
DOMAIN="${HT_DOMAIN:-hellotalent.ai}"

OUT_DIR="$PROJECT_ROOT/.claude/agent-memory/dns-tls-reports"
mkdir -p "$OUT_DIR"

REPORT="$OUT_DIR/$(date +%Y-%m-%d).md"

echo "# DNS + TLS Health Check — $DOMAIN" > "$REPORT"
echo "Tarih: $(date -u +"%Y-%m-%d %H:%M UTC")" >> "$REPORT"
echo "" >> "$REPORT"

# 1. DNS A records
echo "## DNS A Records" >> "$REPORT"
echo '```' >> "$REPORT"
A_RECORDS=$(dig +short A "$DOMAIN" 2>&1)
echo "$A_RECORDS" >> "$REPORT"
echo '```' >> "$REPORT"

# GitHub Pages IP'leri (origin)
GH_PAGES_IPS=("185.199.108.153" "185.199.109.153" "185.199.110.153" "185.199.111.153")
# Cloudflare proxy IP range (orange cloud aktifse)
CF_OK=0
GH_OK=0
for ip in $A_RECORDS; do
  for gh_ip in "${GH_PAGES_IPS[@]}"; do
    [ "$ip" = "$gh_ip" ] && GH_OK=$((GH_OK + 1))
  done
  # Cloudflare IP range: 188.114.x, 104.16-31.x, 172.64-71.x, 162.158.x
  if echo "$ip" | grep -qE "^(188\.114\.|104\.(1[6-9]|2[0-9]|3[01])\.|172\.6[4-9]\.|172\.7[0-1]\.|162\.158\.)"; then
    CF_OK=$((CF_OK + 1))
  fi
done

echo "" >> "$REPORT"
if [ "$CF_OK" -gt 0 ]; then
  echo "✅ Cloudflare proxy aktif (orange cloud): $CF_OK IP" >> "$REPORT"
  echo "Note: GH Pages origin DNS Cloudflare arkasında — bu güvenli + CDN avantajlı setup." >> "$REPORT"
elif [ "$GH_OK" -eq 4 ]; then
  echo "✅ Direkt GitHub Pages DNS (4/4 IP doğru)" >> "$REPORT"
else
  echo "⚠ DNS belirsiz — ne CF proxy ne 4 GH Pages IP. Cloudflare panel kontrol." >> "$REPORT"
fi
echo "" >> "$REPORT"

# 2. CNAME www
echo "## CNAME — www" >> "$REPORT"
echo '```' >> "$REPORT"
dig +short CNAME "www.$DOMAIN" 2>&1 >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

# 3. TLS cert expiry
echo "## TLS Sertifika" >> "$REPORT"
echo '```' >> "$REPORT"
CERT_INFO=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates -subject -issuer 2>&1)
echo "$CERT_INFO" >> "$REPORT"
echo '```' >> "$REPORT"

EXPIRE_DATE=$(echo "$CERT_INFO" | grep "notAfter" | sed 's/notAfter=//')
if [ -n "$EXPIRE_DATE" ]; then
  EXPIRE_EPOCH=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRE_DATE" +%s 2>/dev/null || date -d "$EXPIRE_DATE" +%s 2>/dev/null)
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRE_EPOCH - NOW_EPOCH) / 86400 ))

  echo "" >> "$REPORT"
  echo "**Bitiş:** $EXPIRE_DATE" >> "$REPORT"
  echo "**Kalan gün:** $DAYS_LEFT" >> "$REPORT"

  if [ "$DAYS_LEFT" -lt 30 ]; then
    echo "" >> "$REPORT"
    echo "🔴 UYARI: <30 gün! Renewal kontrol." >> "$REPORT"
  elif [ "$DAYS_LEFT" -lt 60 ]; then
    echo "" >> "$REPORT"
    echo "🟡 <60 gün." >> "$REPORT"
  else
    echo "" >> "$REPORT"
    echo "✅ Sağlam." >> "$REPORT"
  fi
fi
echo "" >> "$REPORT"

# 4. Email auth (SPF/DKIM/DMARC)
echo "## Email Auth Records" >> "$REPORT"

echo "### SPF" >> "$REPORT"
echo '```' >> "$REPORT"
SPF=$(dig +short TXT "$DOMAIN" 2>&1 | grep "v=spf1")
[ -n "$SPF" ] && echo "$SPF" >> "$REPORT" || echo "❌ SPF kaydı YOK" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo "### DKIM (resend)" >> "$REPORT"
echo '```' >> "$REPORT"
DKIM=$(dig +short TXT "resend._domainkey.$DOMAIN" 2>&1)
[ -n "$DKIM" ] && echo "$DKIM" >> "$REPORT" || echo "❌ DKIM resend YOK" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo "### DMARC" >> "$REPORT"
echo '```' >> "$REPORT"
DMARC=$(dig +short TXT "_dmarc.$DOMAIN" 2>&1)
[ -n "$DMARC" ] && echo "$DMARC" >> "$REPORT" || echo "❌ DMARC kaydı YOK" >> "$REPORT"
echo '```' >> "$REPORT"
echo "" >> "$REPORT"

echo "---" >> "$REPORT"
echo "" >> "$REPORT"
echo "## Aksiyonlar" >> "$REPORT"
echo "" >> "$REPORT"
echo "- DNS A < 4 IP → Cloudflare DNS panel 4 GH Pages IP ekle" >> "$REPORT"
echo "- TLS < 30 gün → Cloudflare renewal trigger" >> "$REPORT"
echo "- SPF eksik → Resend dashboard SPF macro" >> "$REPORT"
echo "- DKIM eksik → Resend domain verify (resend._domainkey)" >> "$REPORT"
echo "- DMARC eksik → policy=quarantine başlangıç" >> "$REPORT"

echo ""
echo "Rapor: $REPORT"
cat "$REPORT"
