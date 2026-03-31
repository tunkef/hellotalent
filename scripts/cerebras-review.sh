#!/bin/bash
# Cerebras Heavy Review — Büyük dosya analizi + derin review
# 1M token/gün FREE — Qwen3 235B, 1800 tok/sn
# Kullanım:
#   ./scripts/cerebras-review.sh deep <dosya>       → derin tek dosya review
#   ./scripts/cerebras-review.sh multi <d1> <d2>..   → çoklu dosya review
#   ./scripts/cerebras-review.sh arch                → mimari tutarlılık analizi

set -euo pipefail
cd "$(dirname "$0")/.."

API_KEY="${CEREBRAS_API_KEY:?CEREBRAS_API_KEY env variable gerekli.}"
MODEL="qwen-3-235b-a22b-instruct-2507"
API_URL="https://api.cerebras.ai/v1/chat/completions"
MAX_TOKENS=4096
RESULTS_DIR="reviews"
mkdir -p "$RESULTS_DIR"

TIMESTAMP=$(date '+%Y%m%d-%H%M%S')

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

call_cerebras() {
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
    echo "# Cerebras Review — $TIMESTAMP"
    echo "Model: $MODEL (235B) | Input: ${usage_in} token | Output: ${usage_out} token"
    echo "Maliyet: FREE (1M/gun)"
    echo ""
    echo "$content"
  } > "$output_file"

  echo -e "${GREEN}Tamamlandi:${NC} $output_file"
  echo -e "Token: ${usage_in} in + ${usage_out} out | ${GREEN}FREE${NC}"
}

SYS_DEEP="Sen bir senior code reviewer'sin. hellotalent.ai projesi: vanilla HTML/CSS/JS + Supabase + GitHub Pages.
Proje kurallari: var kullan (const/let degil), .maybeSingle(), console.log yasak, IIFE pattern, Turkce UI.

Dosyayi derinlemesine incele:
1. KRITIK: Gercek bug, data kaybi, security acigi, race condition
2. YUKSEK: Logic hatasi, eksik error handling, state yonetim sorunu
3. ORTA: Dead code, tutarsizlik, performans
4. DUSUK: Stil, naming

Her bulgu icin: satir numarasi, sorun, onerilen fix.
Ayrica dosyanin genel mimarisi hakkinda 2-3 cumle yaz.
Turkce yaz."

SYS_MULTI="Sen bir cross-file analiz uzmansin. Birden fazla dosya arasindaki bagimliliklari, tutarsizliklari ve potansiyel sorunlari bul.
Ozellikle kontrol et:
1. Dosyalar arasi API kontrati uyumu (fonksiyon imzalari, parametre siralamasi)
2. Global state paylasimi riskleri
3. Event listener temizlenmemis mi
4. CSS class ismi catismasi
5. Turkce karakter tutarsizligi
Turkce yaz."

SYS_ARCH="Sen bir mimari analiz uzmansin. hellotalent.ai projesinin mevcut durumunu degerlendir.
Kontrol et:
1. Dosya boyutlari ve sorumluluk dagilimi — tek dosya cok mu is yapiyor?
2. Bagimllik zinciri — dongusel bagimlilik var mi?
3. State yonetimi — localStorage/sessionStorage/global kullanimi tutarli mi?
4. Supabase RPC/RLS pattern tutarliligi
5. CSS mimari — inline vs class vs token kullanimi
docs/CURRENT-STATE.md ve CLAUDE.md'yi de oku, kod ile dokuman arasinda drift var mi?
Turkce yaz."

case "${1:-help}" in
  deep)
    FILE="${2:-}"
    if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
      echo "Kullanim: $0 deep <dosya>"
      exit 1
    fi
    echo -e "${YELLOW}$FILE derin review ediliyor (Qwen3 235B)...${NC}"
    CONTENT=$(head -c 120000 "$FILE")
    OUTPUT="$RESULTS_DIR/deep-$(basename "$FILE" | tr '.' '-')-$TIMESTAMP.md"
    call_cerebras "$SYS_DEEP" "Bu dosyayi derinlemesine review et: $FILE ($(wc -l < "$FILE") satir)\n\n$CONTENT" "$OUTPUT"
    ;;

  multi)
    shift
    if [ $# -lt 2 ]; then
      echo "Kullanim: $0 multi <dosya1> <dosya2> [dosya3...]"
      exit 1
    fi
    echo -e "${YELLOW}Coklu dosya analizi (Qwen3 235B)...${NC}"
    COMBINED=""
    for f in "$@"; do
      if [ -f "$f" ]; then
        COMBINED+="=== $f ($(wc -l < "$f") satir) ===\n$(head -c 40000 "$f")\n\n"
      fi
    done
    COMBINED=$(echo "$COMBINED" | head -c 120000)
    OUTPUT="$RESULTS_DIR/multi-review-$TIMESTAMP.md"
    call_cerebras "$SYS_MULTI" "Bu dosyalar arasindaki bagimliliklari ve tutarsizliklari analiz et:\n\n$COMBINED" "$OUTPUT"
    ;;

  arch)
    echo -e "${YELLOW}Mimari analiz calisiyor (Qwen3 235B)...${NC}"
    CONTEXT=""
    [ -f "docs/CURRENT-STATE.md" ] && CONTEXT+="=== CURRENT-STATE ===\n$(head -c 10000 docs/CURRENT-STATE.md)\n\n"
    [ -f "CLAUDE.md" ] && CONTEXT+="=== CLAUDE.md ===\n$(head -c 3000 CLAUDE.md)\n\n"
    CONTEXT+="=== Dosya listesi ===\n$(find . -maxdepth 1 -name '*.js' -o -name '*.html' -o -name '*.css' | sort | while read f; do echo "$f ($(wc -l < "$f") satir)"; done)\n\n"
    CONTEXT+="=== profil-studio.js ilk 100 satir ===\n$(head -100 profil-studio.js 2>/dev/null)\n"
    CONTEXT+="=== ik.html ilk 50 satir ===\n$(head -50 ik.html 2>/dev/null)\n"
    OUTPUT="$RESULTS_DIR/arch-review-$TIMESTAMP.md"
    call_cerebras "$SYS_ARCH" "Projenin mimari tutarliligi hakkinda rapor ver:\n\n$CONTEXT" "$OUTPUT"
    ;;

  *)
    echo "Cerebras Heavy Review — Derin Analiz (FREE, 1M tok/gun, Qwen3 235B)"
    echo ""
    echo "Kullanim:"
    echo "  $0 deep <dosya>            Derin tek dosya review"
    echo "  $0 multi <d1> <d2> ...     Coklu dosya cross-review"
    echo "  $0 arch                    Mimari tutarlilik analizi"
    ;;
esac
