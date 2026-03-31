#!/bin/bash
# SambaNova — Llama 405B free tier review (Cerebras yedegi)
# Kullanım:
#   ./scripts/sambanova-review.sh deep <dosya>    → Llama 405B ile derin review
#   ./scripts/sambanova-review.sh ask "soru"      → Hızlı soru

set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.local ] && set -a && . .env.local && set +a

API_KEY="${SAMBANOVA_API_KEY:?SAMBANOVA_API_KEY env variable gerekli.}"
MODEL="${SAMBANOVA_MODEL:-DeepSeek-V3.2}"
API_URL="https://api.sambanova.ai/v1/chat/completions"
MAX_TOKENS=4096
RESULTS_DIR="reviews"
mkdir -p "$RESULTS_DIR"

TIMESTAMP=$(date '+%Y%m%d-%H%M%S')

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

call_sambanova() {
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
    {
      echo "# SambaNova Review — $TIMESTAMP"
      echo "Model: $MODEL (405B) | FREE"
      echo ""
      echo "$content"
    } > "$output_file"
    echo -e "${GREEN}Tamamlandi:${NC} $output_file"
  else
    echo "$content"
  fi
}

SYS_REVIEW="Sen hellotalent.ai projesinin code reviewer'isin.
Tech stack: vanilla HTML/CSS/JS, Supabase, GitHub Pages.
Kurallar: var kullan, .maybeSingle(), console.log yasak, Turkce UI, IIFE pattern.
KRITIK/YUKSEK/ORTA/DUSUK kategorilerinde raporla. Turkce yaz."

case "${1:-help}" in
  deep)
    FILE="${2:-}"
    if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
      echo "Kullanim: $0 deep <dosya>"
      exit 1
    fi
    echo -e "${YELLOW}$FILE review ediliyor (Llama 405B)...${NC}"
    CONTENT=$(head -c 80000 "$FILE")
    OUTPUT="$RESULTS_DIR/samba-$(basename "$FILE" | tr '.' '-')-$TIMESTAMP.md"
    call_sambanova "$SYS_REVIEW" "Bu dosyayi review et: $FILE\n\n$CONTENT" "$OUTPUT"
    ;;

  ask)
    QUESTION="${2:-}"
    if [ -z "$QUESTION" ]; then
      echo "Kullanim: $0 ask \"soru\""
      exit 1
    fi
    echo -e "${YELLOW}Llama 405B yanitliyor...${NC}"
    call_sambanova "Kod yardimcisi. Turkce yanit ver." "$QUESTION"
    ;;

  *)
    echo "SambaNova — Llama 405B Review (FREE)"
    echo ""
    echo "  $0 deep <dosya>     Derin review"
    echo "  $0 ask \"soru\"     Hizli soru"
    ;;
esac
