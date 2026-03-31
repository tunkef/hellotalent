#!/bin/bash
# Groq Helper — Hızlı code Q&A + anlık assistant
# 14,400 req/gün FREE — en hızlı inference (1800 tok/sn)
# Kullanım:
#   ./scripts/groq-helper.sh ask "bu fonksiyon ne yapıyor?"
#   ./scripts/groq-helper.sh ask "bu fonksiyon ne yapıyor?" profil-cv.js
#   ./scripts/groq-helper.sh explain <dosya>
#   ./scripts/groq-helper.sh fix-hint <dosya>
#   ./scripts/groq-helper.sh test-ideas <dosya>
#   ./scripts/groq-helper.sh translate "English text"

set -euo pipefail
cd "$(dirname "$0")/.."

API_KEY="${GROQ_API_KEY:?GROQ_API_KEY env variable gerekli. export GROQ_API_KEY=... ile set et.}"
MODEL="meta-llama/llama-4-scout-17b-16e-instruct"
API_URL="https://api.groq.com/openai/v1/chat/completions"
MAX_TOKENS=2048
RESULTS_DIR="reviews"
mkdir -p "$RESULTS_DIR"

TIMESTAMP=$(date '+%Y%m%d-%H%M%S')

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

call_groq() {
  local system_prompt="$1"
  local user_prompt="$2"
  local output_file="${3:-}"

  local sys_escaped=$(echo "$system_prompt" | jq -Rs .)
  local usr_escaped=$(echo "$user_prompt" | jq -Rs .)

  local response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -d "{
      \"model\": \"$MODEL\",
      \"messages\": [
        {\"role\": \"system\", \"content\": $sys_escaped},
        {\"role\": \"user\", \"content\": $usr_escaped}
      ],
      \"max_tokens\": $MAX_TOKENS,
      \"temperature\": 0.1
    }")

  local content=$(echo "$response" | jq -r '.choices[0].message.content // empty')
  local error=$(echo "$response" | jq -r '.error.message // empty')

  if [ -n "$error" ] && [ "$error" != "null" ]; then
    echo -e "${RED}HATA: $error${NC}"
    return 1
  fi

  if [ -n "$output_file" ]; then
    echo "$content" > "$output_file"
    echo -e "${GREEN}Sonuc:${NC} $output_file"
  else
    echo ""
    echo "$content"
  fi
}

SYS_BASE="Sen hellotalent.ai projesinin hizli yardimci agent'isin.
Tech stack: vanilla HTML/CSS/JS, Supabase, GitHub Pages. Turkce yanit ver. Kisa ve net ol."

case "${1:-help}" in
  ask)
    QUESTION="${2:-}"
    FILE="${3:-}"
    if [ -z "$QUESTION" ]; then
      echo "Kullanim: $0 ask \"soru\" [dosya]"
      exit 1
    fi
    echo -e "${YELLOW}Groq yanitliyor...${NC}"
    PROMPT="$QUESTION"
    if [ -n "$FILE" ] && [ -f "$FILE" ]; then
      PROMPT="$QUESTION\n\nDosya: $FILE\n$(head -c 30000 "$FILE")"
    fi
    call_groq "$SYS_BASE" "$PROMPT"
    ;;

  explain)
    FILE="${2:-}"
    if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
      echo "Kullanim: $0 explain <dosya>"
      exit 1
    fi
    echo -e "${YELLOW}$FILE aciklaniyor...${NC}"
    CONTENT=$(head -c 30000 "$FILE")
    OUTPUT="$RESULTS_DIR/explain-$(basename "$FILE" | tr '.' '-')-$TIMESTAMP.md"
    call_groq "Kod aciklama agent'i. Her fonksiyonu tek satirda acikla. Bagimliliklari listele. Turkce yaz. Max 300 kelime." \
      "Bu dosyayi acikla: $FILE\n\n$CONTENT" "$OUTPUT"
    ;;

  fix-hint)
    FILE="${2:-}"
    if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
      echo "Kullanim: $0 fix-hint <dosya>"
      exit 1
    fi
    echo -e "${YELLOW}$FILE potansiyel fix'ler araniyor...${NC}"
    CONTENT=$(head -c 30000 "$FILE")
    call_groq "Bug ve fix onerisi agent'i. Proje kurali: var kullan (const/let degil), .maybeSingle(), console.log yasak, Turkce UI. Sadece gercek sorunlari raporla, false positive verme. Turkce yaz." \
      "Bu dosyada bug veya fix gerektiren yerler var mi?\n\n$FILE:\n$CONTENT"
    ;;

  test-ideas)
    FILE="${2:-}"
    if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
      echo "Kullanim: $0 test-ideas <dosya>"
      exit 1
    fi
    echo -e "${YELLOW}$FILE icin test fikirleri uretiliyor...${NC}"
    CONTENT=$(head -c 20000 "$FILE")
    call_groq "Test onerisi agent'i. Playwright + node assertion tabanlı testler oner. Turkce yaz." \
      "Bu dosya icin hangi edge case testleri yazilmali?\n\n$FILE:\n$CONTENT"
    ;;

  translate)
    TEXT="${2:-}"
    if [ -z "$TEXT" ]; then
      echo "Kullanim: $0 translate \"text\""
      exit 1
    fi
    call_groq "Profesyonel cevirmen. Ingilizce → Turkce. Teknik terimleri koru." "$TEXT"
    ;;

  *)
    echo "Groq Helper — Hizli Code Q&A (FREE, 14K req/gun)"
    echo ""
    echo "Kullanim:"
    echo "  $0 ask \"soru\" [dosya]     Hizli soru-cevap"
    echo "  $0 explain <dosya>         Dosya aciklamasi"
    echo "  $0 fix-hint <dosya>        Bug/fix onerileri"
    echo "  $0 test-ideas <dosya>      Test fikirleri"
    echo "  $0 translate \"text\"       EN→TR ceviri"
    ;;
esac
