#!/bin/bash
# Grok Context Processor — Session prep + docs sync agent
# Kullanım:
#   ./scripts/grok-context.sh brief              → Session başı compact briefing
#   ./scripts/grok-context.sh sync               → Session sonu docs güncelle
#   ./scripts/grok-context.sh explore <dosya>    → Dosya özeti çıkar
#   ./scripts/grok-context.sh diff-summary       → Son commit değişiklik özeti

set -euo pipefail
cd "$(dirname "$0")/.."

API_KEY="${GROK_API_KEY:?GROK_API_KEY env variable gerekli.}"
MODEL="grok-4-1-fast-reasoning"
API_URL="https://api.x.ai/v1/chat/completions"
MAX_TOKENS=2048
RESULTS_DIR="reviews"
mkdir -p "$RESULTS_DIR"

TIMESTAMP=$(date '+%Y%m%d-%H%M%S')

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

call_grok() {
  local system_prompt="$1"
  local user_prompt="$2"
  local output_file="$3"

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
  local usage_in=$(echo "$response" | jq -r '.usage.prompt_tokens // 0')
  local usage_out=$(echo "$response" | jq -r '.usage.completion_tokens // 0')
  local error=$(echo "$response" | jq -r '.error.message // empty')

  if [ -n "$error" ] && [ "$error" != "null" ]; then
    echo -e "${RED}HATA: $error${NC}"
    return 1
  fi

  {
    echo "# Grok Context — $TIMESTAMP"
    echo "Model: $MODEL | Input: ${usage_in} token | Output: ${usage_out} token"
    echo "Maliyet: ~\$$(echo "scale=4; ($usage_in * 0.0000002) + ($usage_out * 0.0000005)" | bc)"
    echo ""
    echo "$content"
  } > "$output_file"

  echo -e "${GREEN}Tamamlandi:${NC} $output_file"
  echo -e "Token: ${usage_in} in + ${usage_out} out | ~\$$(echo "scale=4; ($usage_in * 0.0000002) + ($usage_out * 0.0000005)" | bc)"
}

SYS_BRIEF="Sen hellotalent.ai projesinin context processor'isun.
Gorev: Claude (implementation agent) icin compact session briefing hazirla.
Cikti kurallari:
- Max 500 kelime
- Turkce yaz
- Son durum, aktif is, blocker, sonraki adim net olsun
- Dosya listesi ve son degisiklik ozeti
- Claude'un hemen koda baslayabilecegi kadar net ol"

SYS_SYNC="Sen hellotalent.ai projesinin docs sync agent'isin.
Gorev: Calismadan sonra docs/CURRENT-STATE.md ve docs/AI-COLLAB.md icin guncel ozet yaz.
Kurallari:
- Turkce yaz
- Degisen dosyalar, test sonuclari, kalan isler net olsun
- Session numarasini koruyarak guncelleyen formatta yaz
- Sadece gercekleri yaz, yorum/oneri ekleme"

SYS_EXPLORE="Sen bir kod analiz agent'isin.
Gorev: Verilen dosyanin yapisini, fonksiyonlarini, bagimliliklarini ve potansiyel sorunlarini ozetle.
Kurallari:
- Max 300 kelime
- Fonksiyon listesi + ne yapiyor (tek satir)
- Bagimliliklari (import/global)
- Bilinen sorunlar veya riskler
- Claude'un dosyayi okumadan anlayabilecegi kadar net ol"

SYS_DIFF="Sen bir degisiklik analiz agent'isin.
Gorev: Git diff'i ozetle — ne degisti, neden, risk var mi.
Kurallari:
- Max 200 kelime
- Degisen dosya + degisiklik turu (yeni feature, fix, refactor, docs)
- Potansiyel yan etki veya risk
- Turkce yaz"

case "${1:-help}" in
  brief)
    echo -e "${YELLOW}Session briefing hazirlaniyor...${NC}"
    CONTEXT=""
    [ -f "docs/CURRENT-STATE.md" ] && CONTEXT+="=== CURRENT-STATE ===\n$(head -c 15000 docs/CURRENT-STATE.md)\n\n"
    [ -f "docs/AI-COLLAB.md" ] && CONTEXT+="=== AI-COLLAB (son 200 satir) ===\n$(tail -200 docs/AI-COLLAB.md)\n\n"
    [ -f "CLAUDE.md" ] && CONTEXT+="=== CLAUDE.md ===\n$(head -c 3000 CLAUDE.md)\n\n"
    CONTEXT+="=== Git log (son 5) ===\n$(git log --oneline -5 2>/dev/null)\n"
    CONTEXT+="=== Git status ===\n$(git status --short 2>/dev/null | head -20)\n"
    OUTPUT="$RESULTS_DIR/brief-$TIMESTAMP.md"
    call_grok "$SYS_BRIEF" "$CONTEXT" "$OUTPUT"
    ;;

  sync)
    echo -e "${YELLOW}Docs sync hazirlaniyor...${NC}"
    CONTEXT=""
    [ -f "docs/AI-COLLAB.md" ] && CONTEXT+="=== AI-COLLAB.md ===\n$(tail -100 docs/AI-COLLAB.md)\n\n"
    [ -f "docs/CURRENT-STATE.md" ] && CONTEXT+="=== CURRENT-STATE.md ===\n$(head -c 5000 docs/CURRENT-STATE.md)\n\n"
    CONTEXT+="=== Son commit ===\n$(git log -1 --stat 2>/dev/null)\n"
    CONTEXT+="=== Degisiklik ozeti ===\n$(git diff HEAD~1 --stat 2>/dev/null)\n"
    OUTPUT="$RESULTS_DIR/sync-$TIMESTAMP.md"
    call_grok "$SYS_SYNC" "Bu session sonunda docs sync icin guncel ozet yaz:\n\n$CONTEXT" "$OUTPUT"
    ;;

  explore)
    FILE="${2:-}"
    if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
      echo "Kullanim: $0 explore <dosya>"
      exit 1
    fi
    echo -e "${YELLOW}$FILE analiz ediliyor...${NC}"
    CONTENT=$(head -c 60000 "$FILE")
    OUTPUT="$RESULTS_DIR/explore-$(basename "$FILE" | tr '.' '-')-$TIMESTAMP.md"
    call_grok "$SYS_EXPLORE" "Bu dosyayi analiz et: $FILE\n\n$CONTENT" "$OUTPUT"
    ;;

  diff-summary)
    echo -e "${YELLOW}Diff ozeti cikariliyor...${NC}"
    DIFF=$(git diff HEAD~1 --no-color 2>/dev/null | head -c 50000)
    if [ -z "$DIFF" ]; then
      echo "Diff bulunamadi."
      exit 1
    fi
    OUTPUT="$RESULTS_DIR/diff-summary-$TIMESTAMP.md"
    call_grok "$SYS_DIFF" "Bu diff'i ozetle:\n\n$DIFF" "$OUTPUT"
    ;;

  *)
    echo "Grok Context Processor"
    echo ""
    echo "Kullanim:"
    echo "  $0 brief              Session basi compact briefing"
    echo "  $0 sync               Session sonu docs sync ozeti"
    echo "  $0 explore <dosya>    Dosya yapisi ozeti"
    echo "  $0 diff-summary       Son commit degisiklik ozeti"
    ;;
esac
