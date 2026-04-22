#!/bin/bash
# OpenRouter Fallback — 28 free model, yedek havuz
# 200 req/gün FREE — herhangi bir agent düşerse fallback
# Kullanım:
#   ./scripts/openrouter-fallback.sh review <dosya>     → DeepSeek R1 free ile review
#   ./scripts/openrouter-fallback.sh ask "soru"         → Llama 3.3 70B 480B ile soru
#   ./scripts/openrouter-fallback.sh reason "sorun"     → DeepSeek R1 ile reasoning
#   ./scripts/openrouter-fallback.sh models              → Free modelleri listele

set -euo pipefail
cd "$(dirname "$0")/.."

API_KEY="${OPENROUTER_API_KEY:?OPENROUTER_API_KEY env variable gerekli.}"
API_URL="https://openrouter.ai/api/v1/chat/completions"
MAX_TOKENS=3072
RESULTS_DIR="reviews"
mkdir -p "$RESULTS_DIR"

TIMESTAMP=$(date '+%Y%m%d-%H%M%S')

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

call_openrouter() {
  local model="$1"
  local system_prompt="$2"
  local user_prompt="$3"
  local output_file="${4:-}"

  local sys_escaped=$(echo "$system_prompt" | jq -Rs .)
  local usr_escaped=$(echo "$user_prompt" | jq -Rs .)

  local response=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -H "HTTP-Referer: https://hellotalent.ai" \
    -H "X-Title: HelloTalent Dev" \
    -d "{
      \"model\": \"$model\",
      \"messages\": [
        {\"role\": \"system\", \"content\": $sys_escaped},
        {\"role\": \"user\", \"content\": $usr_escaped}
      ],
      \"max_tokens\": $MAX_TOKENS,
      \"temperature\": 0.1
    }")

  local content=$(echo "$response" | jq -r '.choices[0].message.content // empty')
  local usage_in=$(echo "$response" | jq -r '.usage.prompt_tokens // 0')
  local usage_out=$(echo "$response" | jq -r '.usage.completion_tokens // 0')
  local error=$(echo "$response" | jq -r '.error.message // empty')

  if [ -n "$error" ] && [ "$error" != "null" ]; then
    echo -e "${RED}HATA: $error${NC}"
    return 1
  fi

  if [ -n "$output_file" ]; then
    {
      echo "# OpenRouter Review — $TIMESTAMP"
      echo "Model: $model | Input: ${usage_in} | Output: ${usage_out} | FREE"
      echo ""
      echo "$content"
    } > "$output_file"
    echo -e "${GREEN}Tamamlandi:${NC} $output_file"
  else
    echo ""
    echo "$content"
  fi
  echo -e "Model: ${CYAN}$model${NC} | Token: ${usage_in} in + ${usage_out} out | ${GREEN}FREE${NC}"
}

SYS_REVIEW="Sen hellotalent.ai projesinin yedek code reviewer'isin.
Tech stack: vanilla HTML/CSS/JS, Supabase, GitHub Pages.
Kurallar: var kullan (const/let degil), .maybeSingle(), console.log yasak, Turkce UI.
Kodu incele: KRITIK/YUKSEK/ORTA/DUSUK kategorilerinde raporla. Turkce yaz."

SYS_REASON="Sen bir problem cozen reasoning agent'sin. Verilen sorunu adim adim analiz et.
Her adimda ne dusundugunuozu acikla. Turkce yaz."

case "${1:-help}" in
  review)
    FILE="${2:-}"
    if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
      echo "Kullanim: $0 review <dosya>"
      exit 1
    fi
    echo -e "${YELLOW}$FILE review ediliyor (DeepSeek R1 free)...${NC}"
    CONTENT=$(head -c 60000 "$FILE")
    OUTPUT="$RESULTS_DIR/or-review-$(basename "$FILE" | tr '.' '-')-$TIMESTAMP.md"
    call_openrouter "nousresearch/hermes-3-llama-3.1-405b:free" "$SYS_REVIEW" "Bu dosyayi review et: $FILE\n\n$CONTENT" "$OUTPUT"
    ;;

  ask)
    QUESTION="${2:-}"
    FILE="${3:-}"
    if [ -z "$QUESTION" ]; then
      echo "Kullanim: $0 ask \"soru\" [dosya]"
      exit 1
    fi
    echo -e "${YELLOW}Llama 3.3 70B yanitliyor...${NC}"
    PROMPT="$QUESTION"
    if [ -n "$FILE" ] && [ -f "$FILE" ]; then
      PROMPT="$QUESTION\n\nDosya: $FILE\n$(head -c 30000 "$FILE")"
    fi
    # Model fallback zinciri: Llama 3.3 → Gemma 3 → GPT-OSS
    call_openrouter "google/gemma-3-27b-it:free" "Kod yardimcisi. Turkce yanit ver. Kisa ve net ol." "$PROMPT"
    ;;

  reason)
    PROBLEM="${2:-}"
    if [ -z "$PROBLEM" ]; then
      echo "Kullanim: $0 reason \"sorun aciklamasi\""
      exit 1
    fi
    echo -e "${YELLOW}DeepSeek R1 reasoning...${NC}"
    OUTPUT="$RESULTS_DIR/or-reason-$TIMESTAMP.md"
    call_openrouter "openai/gpt-oss-120b:free" "$SYS_REASON" "$PROBLEM" "$OUTPUT"
    ;;

  models)
    echo -e "${CYAN}OpenRouter Free Modeller:${NC}"
    echo "  deepseek/deepseek-r1:free        → Reasoning (en guclu free)"
    echo "  qwen/qwen3-coder:free            → Kod uzmanı (480B)"
    echo "  meta-llama/llama-3.3-70b:free     → Genel amacli"
    echo "  google/gemma-3-27b-it:free        → Hafif ve hizli"
    echo "  mistralai/mistral-small-3.1:free  → Avrupa modeli"
    echo "  nvidia/llama-3.1-nemotron:free    → NVIDIA optimize"
    echo "  qwen/qwen3-235b-a22b:free        → Buyuk Qwen"
    echo ""
    echo "Kullanim: 200 req/gun, kredi karti gereksiz"
    ;;

  *)
    echo "OpenRouter Fallback — 28 Free Model Havuzu (200 req/gun)"
    echo ""
    echo "Kullanim:"
    echo "  $0 review <dosya>        DeepSeek R1 ile code review"
    echo "  $0 ask \"soru\" [dosya]  Llama 3.3 70B ile soru"
    echo "  $0 reason \"sorun\"      DeepSeek R1 ile reasoning"
    echo "  $0 models               Free model listesi"
    ;;
esac
