#!/bin/bash
# Courier — Web Push + Email bildirim altyapisi
# 10K/ay ucretsiz bildirim
# Kullanim:
#   ./scripts/courier-notify.sh send <user_email> "baslik" "mesaj"
#   ./scripts/courier-notify.sh test
#   ./scripts/courier-notify.sh status

set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.local ] && set -a && . .env.local && set +a

API_KEY="${COURIER_API_KEY:?COURIER_API_KEY env variable gerekli.}"
API_URL="https://api.courier.com"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

send_notification() {
  local email="$1"
  local title="$2"
  local body="$3"

  local response=$(curl -s -X POST "$API_URL/send" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "{
      \"message\": {
        \"to\": { \"email\": \"$email\" },
        \"content\": {
          \"title\": \"$title\",
          \"body\": \"$body\"
        },
        \"routing\": {
          \"method\": \"all\",
          \"channels\": [\"email\", \"push\"]
        }
      }
    }")

  local request_id=$(echo "$response" | jq -r '.requestId // empty')
  local error=$(echo "$response" | jq -r '.message // empty')

  if [ -n "$request_id" ] && [ "$request_id" != "null" ]; then
    echo -e "${GREEN}Bildirim gonderildi:${NC} $request_id"
  else
    echo -e "${RED}Hata:${NC} ${error:-Bilinmeyen hata}"
    echo "$response" | jq . 2>/dev/null || echo "$response"
  fi
}

case "${1:-help}" in
  send)
    EMAIL="${2:-}"
    TITLE="${3:-}"
    BODY="${4:-}"
    if [ -z "$EMAIL" ] || [ -z "$TITLE" ]; then
      echo "Kullanim: $0 send <email> \"baslik\" \"mesaj\""
      exit 1
    fi
    echo -e "${YELLOW}Bildirim gonderiliyor...${NC}"
    send_notification "$EMAIL" "$TITLE" "$BODY"
    ;;

  test)
    echo -e "${YELLOW}Test bildirimi gonderiliyor...${NC}"
    send_notification "test@hellotalent.ai" "HelloTalent Test" "Courier bildirim sistemi aktif!"
    ;;

  status)
    local res=$(curl -s "$API_URL/messages" \
      -H "Authorization: Bearer $API_KEY" | jq '.results | length' 2>/dev/null)
    echo "Courier durumu: ${res:-0} mesaj gonderilmis"
    ;;

  *)
    echo "Courier Bildirim — Web Push + Email (10K/ay FREE)"
    echo ""
    echo "  $0 send <email> \"baslik\" \"mesaj\"   Bildirim gonder"
    echo "  $0 test                              Test bildirimi"
    echo "  $0 status                            Durum"
    echo ""
    echo "Kullanim alanlari:"
    echo "  - Yeni mesaj bildirimi (employer → aday)"
    echo "  - Basvuru durumu degisikligi"
    echo "  - Coach post yayinlandi"
    echo "  - Profil goruntulenme"
    ;;
esac
