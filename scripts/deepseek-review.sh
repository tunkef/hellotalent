#!/bin/bash
# DeepSeek Code Review — Denetçi Agent
# Kullanım:
#   ./scripts/deepseek-review.sh diff          → son commit diff'ini review et
#   ./scripts/deepseek-review.sh file <dosya>  → tek dosyayı review et
#   ./scripts/deepseek-review.sh security      → tüm değişen dosyalarda security audit
#   ./scripts/deepseek-review.sh stage         → AI-COLLAB.md + diff stage gate review

set -euo pipefail
cd "$(dirname "$0")/.."

API_KEY="${DEEPSEEK_API_KEY:?DEEPSEEK_API_KEY env variable gerekli.}"
MODEL="deepseek-reasoner"
API_URL="https://api.deepseek.com/v1/chat/completions"
MAX_TOKENS=4096
RESULTS_DIR="reviews"
mkdir -p "$RESULTS_DIR"

TIMESTAMP=$(date '+%Y%m%d-%H%M%S')

# Renk kodlari
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

call_deepseek() {
  local system_prompt="$1"
  local user_prompt="$2"
  local output_file="$3"

  # JSON-safe escape
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

  # Extract content
  local content=$(echo "$response" | jq -r '.choices[0].message.content // empty')
  local reasoning=$(echo "$response" | jq -r '.choices[0].message.reasoning_content // empty')
  local usage_in=$(echo "$response" | jq -r '.usage.prompt_tokens // 0')
  local usage_out=$(echo "$response" | jq -r '.usage.completion_tokens // 0')
  local error=$(echo "$response" | jq -r '.error.message // empty')

  if [ -n "$error" ]; then
    echo -e "${RED}HATA: $error${NC}"
    return 1
  fi

  # Write to file
  {
    echo "# DeepSeek Review — $TIMESTAMP"
    echo "Model: $MODEL | Input: ${usage_in} token | Output: ${usage_out} token"
    echo "Maliyet: ~\$$(echo "scale=4; ($usage_in * 0.00000028) + ($usage_out * 0.00000042)" | bc)"
    echo ""
    if [ -n "$reasoning" ] && [ "$reasoning" != "null" ]; then
      echo "## Reasoning"
      echo "$reasoning"
      echo ""
    fi
    echo "## Review"
    echo "$content"
  } > "$output_file"

  echo -e "${GREEN}Review tamamlandi:${NC} $output_file"
  local cost=$(echo "scale=4; ($usage_in * 0.00000028) + ($usage_out * 0.00000042)" | bc)
  echo -e "Token: ${usage_in} input + ${usage_out} output | Maliyet: ~\$$cost"

  # Observability: metrik logla
  [ -f "scripts/agent-metrics.sh" ] && ./scripts/agent-metrics.sh log deepseek "$usage_in" "$usage_out" "$cost" "$MODEL" 2>/dev/null || true
}

SYSTEM_REVIEW="Sen hellotalent.ai projesinin teknik denetcisisin. Turkiye perakende sektoru icin bir yetenek pazaryeri.
Tech stack: vanilla HTML/CSS/JS, Supabase (PostgreSQL + Auth + RLS + Edge Functions), GitHub Pages.
Kurallar: var kullan (const/let degil), .maybeSingle() kullan, console.log yasak, Turkce UI, IIFE pattern.
Gorev: Kodu incele ve su kategorilerde rapor ver:
1. KRITIK: Gercek bug, data kaybi riski, security acigi
2. YUKSEK: Logic hatasi, race condition, eksik error handling
3. ORTA: Code quality, tutarsizlik, dead code
4. DUSUK: Stil, naming, minor cleanup
Her bulgu icin: dosya:satir, sorun, onerilen fix. Turkce yaz."

SYSTEM_SECURITY="Sen bir guvenlik denetcisisin. Kodu su acidan tara:
1. XSS (innerHTML ile user data render)
2. SQL/RPC injection riski
3. Auth bypass / RLS gap
4. Secret leak (API key, token frontend'te)
5. CSRF / session fixation
6. Unsafe eval / Function constructor
Her bulgu icin: KRITIK/YUKSEK/ORTA seviye, dosya:satir, aciklama, fix onerisi. Turkce yaz."

SYSTEM_STAGE="Sen bir mimari denetcisin. AI-COLLAB.md'deki son asama ciktisini ve kod degisikligini karsilastir.
Kontrol et:
1. Asama scope'una sadik kalinmis mi?
2. Belirtilen dosyalar disinda degisiklik var mi?
3. Regression guard eklenmis mi?
4. Truth-sync yapilmis mi (CURRENT-STATE, docs)?
5. Test sonuclari raporlanmis mi?
Turkce yaz, kisa ve net ol."

case "${1:-help}" in
  diff)
    echo -e "${YELLOW}Son commit diff review ediliyor...${NC}"
    DIFF=$(git diff HEAD~1 --no-color 2>/dev/null || git diff --cached --no-color)
    if [ -z "$DIFF" ]; then
      echo "Diff bulunamadi."
      exit 1
    fi
    # Truncate if too long (100K char ~ 25K token)
    DIFF=$(echo "$DIFF" | head -c 100000)
    OUTPUT="$RESULTS_DIR/diff-review-$TIMESTAMP.md"
    call_deepseek "$SYSTEM_REVIEW" "Son commit diff'ini review et:\n\n$DIFF" "$OUTPUT"
    ;;

  file)
    FILE="${2:-}"
    if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
      echo "Kullanim: $0 file <dosya>"
      exit 1
    fi
    echo -e "${YELLOW}$FILE review ediliyor...${NC}"
    CONTENT=$(head -c 80000 "$FILE")
    OUTPUT="$RESULTS_DIR/file-review-$(basename "$FILE" | tr '.' '-')-$TIMESTAMP.md"
    call_deepseek "$SYSTEM_REVIEW" "Bu dosyayi review et: $FILE\n\n$CONTENT" "$OUTPUT"
    ;;

  security)
    echo -e "${YELLOW}Security audit calisiyor...${NC}"
    FILES=$(git diff HEAD~1 --name-only 2>/dev/null | grep -E '\.(js|ts|html)$' || git diff --cached --name-only | grep -E '\.(js|ts|html)$')
    if [ -z "$FILES" ]; then
      echo "Degisen dosya bulunamadi."
      exit 1
    fi
    COMBINED=""
    while IFS= read -r f; do
      if [ -f "$f" ]; then
        COMBINED+="=== $f ===\n$(head -c 20000 "$f")\n\n"
      fi
    done <<< "$FILES"
    COMBINED=$(echo "$COMBINED" | head -c 100000)
    OUTPUT="$RESULTS_DIR/security-audit-$TIMESTAMP.md"
    call_deepseek "$SYSTEM_SECURITY" "Bu dosyalarda security audit yap:\n\n$COMBINED" "$OUTPUT"
    ;;

  stage)
    echo -e "${YELLOW}Stage gate review calisiyor...${NC}"
    COLLAB=$(head -c 30000 docs/AI-COLLAB.md)
    DIFF=$(git diff HEAD~1 --stat --no-color 2>/dev/null || git diff --cached --stat --no-color)
    OUTPUT="$RESULTS_DIR/stage-review-$TIMESTAMP.md"
    call_deepseek "$SYSTEM_STAGE" "AI-COLLAB.md son durumu:\n\n$COLLAB\n\nDegisiklik ozeti:\n$DIFF" "$OUTPUT"
    ;;

  *)
    echo "DeepSeek Code Review — Denetci Agent"
    echo ""
    echo "Kullanim:"
    echo "  $0 diff          Son commit diff review"
    echo "  $0 file <dosya>  Tek dosya review"
    echo "  $0 security      Security audit"
    echo "  $0 stage         Stage gate review"
    ;;
esac
