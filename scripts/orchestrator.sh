#!/bin/bash
# ═══════════════════════════════════════════════════
# HelloTalent AI Orchestrator
# Tek komutla tüm pipeline'ı çalıştır:
#   Grok brief → Claude implement → DeepSeek review → Gemini UAT → Grok sync
#
# Kullanım:
#   ./scripts/orchestrator.sh run        → Tam pipeline (brief → implement → review → UAT)
#   ./scripts/orchestrator.sh quick      → Sadece implement → review (brief/UAT atla)
#   ./scripts/orchestrator.sh review     → Sadece DeepSeek review + Cerebras deep
#   ./scripts/orchestrator.sh uat        → Sadece Gemini UAT
#   ./scripts/orchestrator.sh status     → Tüm agent'ların durumunu göster
# ═══════════════════════════════════════════════════

set -euo pipefail
cd "$(dirname "$0")/.."

# Load env variables from .env.local if exists
[ -f .env.local ] && set -a && . .env.local && set +a

# ── SOLID: Merkezi model config (DIP — model swap tek yerden) ──
CLAUDE_MODEL="${CLAUDE_HEADLESS_MODEL:-sonnet}"
DEEPSEEK_MODEL="${DEEPSEEK_MODEL:-deepseek-reasoner}"
GROQ_MODEL="${GROQ_MODEL:-meta-llama/llama-4-scout-17b-16e-instruct}"
CEREBRAS_MODEL="${CEREBRAS_MODEL:-qwen-3-235b-a22b-instruct-2507}"
GROK_MODEL="${GROK_MODEL:-grok-4-1-fast-reasoning}"

# Renkler
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

COLLAB="docs/AI-COLLAB.md"
RESULTS_DIR="reviews"
mkdir -p "$RESULTS_DIR"
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
LOG="$RESULTS_DIR/orchestrator-$TIMESTAMP.log"

# ── Step result tracker (honest reporting) ──
STEP_RESULTS=""

log() {
  echo -e "$1" | tee -a "$LOG"
}

divider() {
  log "${CYAN}══════════════════════════════════════════════════${NC}"
}

# ── Telefon bildirimi (ntfy.sh — free, hesap gereksiz) ──
NTFY_TOPIC="${NTFY_TOPIC:-hellotalent-tuna}"
notify_phone() {
  local title="$1"
  local message="$2"
  local priority="${3:-default}"
  local tags="${4:-white_check_mark}"
  curl -s -o /dev/null \
    -H "Title: $title" \
    -H "Priority: $priority" \
    -H "Tags: $tags" \
    -d "$message" \
    "https://ntfy.sh/$NTFY_TOPIC" 2>/dev/null || true
}

# ── macOS masaüstü bildirimi ──
notify_mac() {
  osascript -e "display notification \"$2\" with title \"$1\" sound name \"Glass\"" 2>/dev/null || true
}

# ── Telegram bildirimi ──
notify_telegram() {
  [ -f "scripts/telegram-bot.sh" ] && ./scripts/telegram-bot.sh send "$1" 2>/dev/null || true
}

# ── Son aşamayı AI-COLLAB.md'den oku ──
# Sadece "## N. Claude Icin Gorev" görev başlıklarını okur.
# Özet, review veya eski referanslar aktif aşama sayılmaz.
detect_stage() {
  local last_stage
  last_stage=$(grep -E '^## [0-9]+\. Claude Icin Gorev' "$COLLAB" 2>/dev/null \
    | grep -oE 'A[sş]ama [0-9]+' | grep -oE '[0-9]+' | sort -n | tail -1)
  echo "${last_stage:-?}"
}

# ── Claude görevini AI-COLLAB.md'den çıkar ──
detect_task() {
  # "Claude Icin Gorev" bölümünün ilk satırını bul
  grep -A1 "Claude Icin Gorev" "$COLLAB" | tail -1 | sed 's/^[[:space:]]*//'
}

# ═══════════════════════════════════════
# STEP 1: GROK BRIEF
# ═══════════════════════════════════════
step_brief() {
  divider
  log "${BOLD}📋 STEP 1: Grok Context Brief${NC}"
  log ""

  if [ -f "scripts/grok-context.sh" ]; then
    if ./scripts/grok-context.sh brief 2>&1 | tee -a "$LOG"; then
      local brief_file=$(ls -t "$RESULTS_DIR"/brief-*.md 2>/dev/null | head -1)
      if [ -n "$brief_file" ]; then
        log ""
        log "${GREEN}Brief hazır:${NC} $brief_file"
      fi
    else
      notify_telegram "⚠️ *Grok brief basarisiz* — API hatasi olabilir, devam ediliyor"
    fi
  else
    log "${YELLOW}Grok script bulunamadı, brief atlanıyor.${NC}"
  fi
  log ""
}

# ═══════════════════════════════════════
# STEP 2: CLAUDE IMPLEMENT
# ═══════════════════════════════════════
step_implement() {
  divider
  log "${BOLD}🔨 STEP 2: Claude Implementation${NC}"
  log ""

  local stage=$(detect_stage)
  log "Aktif aşama: ${CYAN}$stage${NC}"

  # Brief dosyasını bul
  local brief_file=$(ls -t "$RESULTS_DIR"/brief-*.md 2>/dev/null | head -1)
  local brief_content=""
  if [ -n "$brief_file" ]; then
    brief_content="CONTEXT BRIEFING (Grok tarafindan hazırlandi):\n$(cat "$brief_file")\n\n"
  fi

  # AI-COLLAB.md'den Claude görevini çıkar
  local collab_tail=$(tail -200 "$COLLAB")

  local prompt="${brief_content}docs/AI-COLLAB.md dosyasini oku. Aktif gorev ne ise onu uygula. Isini bitirince ayni dosyayi guncelle ve bekle. Kod yazarken proje kurallarına sadık kal (var kullan, .maybeSingle(), console.log yasak, Turkce UI). Test etmeden bitti deme."

  log "Claude headless başlatılıyor..."
  log "Prompt uzunluğu: ~$(echo "$prompt" | wc -c | tr -d ' ') karakter"
  log ""

  # Claude headless
  local result_file="$RESULTS_DIR/claude-impl-$TIMESTAMP.md"
  claude -p "$prompt" \
    --model sonnet \
    --output-format text \
    > "$result_file" 2>&1

  local exit_code=$?
  log "Claude çıkış kodu: $exit_code"
  log "${GREEN}Sonuç:${NC} $result_file"
  log ""

  # Syntax check
  log "Syntax kontrol..."
  local has_error=false
  for f in profil-cv.js profil-events.js profil-studio.js profil-genel.js profil-settings.js; do
    if [ -f "$f" ]; then
      if node --check "$f" 2>/dev/null; then
        log "  ${GREEN}✓${NC} $f"
      else
        log "  ${RED}✗${NC} $f"
        has_error=true
      fi
    fi
  done

  if [ "$has_error" = true ]; then
    log "${RED}Syntax hatası var — pipeline durduruluyor.${NC}"
    notify_phone "HATA: Syntax Hatasi" "Pipeline durdu! Syntax hatasi var, terminali kontrol et." "urgent" "x"
    notify_mac "HelloTalent HATA" "Syntax hatasi — pipeline durdu!"
    notify_telegram "❌ *Claude: Syntax hatasi!* Pipeline durdu."
    return 1
  fi
  log ""
}

# ═══════════════════════════════════════
# STEP 3: DEEPSEEK REVIEW
# ═══════════════════════════════════════
step_review() {
  divider
  log "${BOLD}🔍 STEP 3: DeepSeek Code Review${NC}"
  log ""

  local deepseek_ok=true
  if [ -f "scripts/deepseek-review.sh" ]; then
    # Diff review (now has 3x retry with exponential backoff)
    log "Diff review (max ${DEEPSEEK_MAX_RETRIES:-3} attempts)..."
    if ! ./scripts/deepseek-review.sh diff 2>&1 | tee -a "$LOG"; then
      log "${YELLOW}[INFRA WARNING] DeepSeek diff review başarısız — tüm retry'lar tükendi.${NC}"
      notify_telegram "⚠️ *[INFRA] DeepSeek diff review basarisiz* — 3 deneme sonrasi fail"
      deepseek_ok=false
    fi
    log ""

    # Security audit (also has retry now)
    log "Security audit (max ${DEEPSEEK_MAX_RETRIES:-3} attempts)..."
    if ! ./scripts/deepseek-review.sh security 2>&1 | tee -a "$LOG"; then
      log "${YELLOW}[INFRA WARNING] DeepSeek security audit başarısız — tüm retry'lar tükendi.${NC}"
      notify_telegram "⚠️ *[INFRA] DeepSeek security audit basarisiz* — 3 deneme sonrasi fail"
      deepseek_ok=false
    fi
    log ""
  else
    log "${YELLOW}[INFRA WARNING] DeepSeek script bulunamadı, review atlanıyor.${NC}"
    deepseek_ok=false
  fi
  STEP_RESULTS="${STEP_RESULTS}DeepSeek:$([ "$deepseek_ok" = true ] && echo PASS || echo FAIL) "

  # Cerebras deep review (en çok değişen dosya)
  local cerebras_ok=true
  if [ -f "scripts/cerebras-review.sh" ]; then
    local changed=$(git diff --name-only 2>/dev/null | grep '\.js$' | head -1)
    if [ -n "$changed" ] && [ -f "$changed" ]; then
      log "Cerebras derin review: $changed"
      if ! ./scripts/cerebras-review.sh deep "$changed" 2>&1 | tee -a "$LOG"; then
        cerebras_ok=false
      fi
    fi
  else
    cerebras_ok=false
  fi
  STEP_RESULTS="${STEP_RESULTS}Cerebras:$([ "$cerebras_ok" = true ] && echo PASS || echo FAIL) "

  # Diffray multi-agent review (5 paralel uzman ajan)
  if command -v diffray &>/dev/null; then
    log "Diffray multi-agent review (timeout: 120s per agent)..."
    if DIFFRAY_AGENT_TIMEOUT=120 diffray review 2>&1 | tee -a "$LOG"; then
      log "${GREEN}Diffray review tamamlandi${NC}"
      STEP_RESULTS="${STEP_RESULTS}Diffray:PASS "
    else
      log "${YELLOW}[INFRA WARNING] Diffray review basarisiz (timeout veya agent hatasi)${NC}"
      STEP_RESULTS="${STEP_RESULTS}Diffray:FAIL "
    fi
  else
    STEP_RESULTS="${STEP_RESULTS}Diffray:SKIP "
  fi

  # Qodo test generation (TDD strict mode destegi)
  if command -v qodo &>/dev/null; then
    log "Qodo test analizi..."
    local changed_js=$(git diff --name-only 2>/dev/null | grep '\.js$' | head -3 | tr '\n' ' ')
    if [ -n "$changed_js" ]; then
      qodo test $changed_js >> "$RESULTS_DIR/qodo-$TIMESTAMP.md" 2>&1 || true
      log "${GREEN}Qodo analiz tamamlandi${NC}"
    fi
  fi
  log ""
}

# ═══════════════════════════════════════
# STEP 4: TEST
# ═══════════════════════════════════════
step_test() {
  divider
  log "${BOLD}🧪 STEP 4: Test Suite${NC}"
  log ""

  local tests_ok=true

  log "P3 regression testleri..."
  local p3_result=$(npm run test:p3 2>&1 | tail -1)
  log "  $p3_result"
  if echo "$p3_result" | grep -q "failed"; then
    notify_phone "HATA: P3 Test FAIL" "$p3_result" "urgent" "x"
    notify_telegram "❌ *Test FAIL:* $p3_result"
    tests_ok=false
  fi

  log "BATS infra testleri..."
  local bats_result=$(npm run test:bats 2>&1 | tail -1)
  log "  $bats_result"
  if echo "$bats_result" | grep -q "not ok"; then
    notify_telegram "❌ *BATS FAIL:* $bats_result"
    tests_ok=false
  fi

  STEP_RESULTS="${STEP_RESULTS}Tests:$([ "$tests_ok" = true ] && echo PASS || echo FAIL) "
  log ""
}

# ═══════════════════════════════════════
# STEP 5: PLAYWRIGHT UAT (replaces Gemini free-tier which is permanently quota-exhausted)
# ═══════════════════════════════════════
step_uat() {
  divider
  log "${BOLD}🌐 STEP 5: Playwright UAT${NC}"
  log ""

  local uat_output="$RESULTS_DIR/uat-$TIMESTAMP.md"

  # Run smoke tests as UAT — these hit the actual pages
  log "Smoke testleri UAT olarak çalıştırılıyor..."
  local smoke_result
  smoke_result=$(npm run test:smoke 2>&1) || true
  local smoke_summary=$(echo "$smoke_result" | tail -1)

  {
    echo "# UAT Report — $TIMESTAMP"
    echo "Runner: Playwright smoke tests (replaced Gemini free-tier — permanent quota exhaustion)"
    echo ""
    echo "## Result"
    echo "$smoke_summary"
    echo ""
    echo "## Detail"
    echo "$smoke_result"
  } > "$uat_output"

  if echo "$smoke_summary" | grep -q "passed"; then
    log "${GREEN}UAT (Playwright smoke) geçti:${NC} $smoke_summary"
    STEP_RESULTS="${STEP_RESULTS:-}UAT:PASS "
  else
    log "${RED}UAT (Playwright smoke) FAIL:${NC} $smoke_summary"
    notify_telegram "❌ *UAT FAIL:* $smoke_summary"
    STEP_RESULTS="${STEP_RESULTS:-}UAT:FAIL "
  fi
  log ""
}

# ═══════════════════════════════════════
# STEP 6: GROK SYNC
# ═══════════════════════════════════════
step_sync() {
  divider
  log "${BOLD}📝 STEP 6: Grok Docs Sync${NC}"
  log ""

  if [ -f "scripts/grok-context.sh" ]; then
    ./scripts/grok-context.sh sync 2>&1 | tee -a "$LOG" || true
  else
    log "${YELLOW}Grok script bulunamadı, sync atlanıyor.${NC}"
  fi
  log ""
}

# ═══════════════════════════════════════
# STATUS
# ═══════════════════════════════════════
show_status() {
  divider
  log "${BOLD}📊 Agent Durumu${NC}"
  log ""

  # Claude
  log "  ${CYAN}Claude${NC} (Implementation)"
  log "    CLI: $(which claude 2>/dev/null && echo '✓ kurulu' || echo '✗ bulunamadı')"

  # Codex
  log "  ${CYAN}Codex${NC} (Strateji)"
  log "    App: $(ls /Applications/Codex.app &>/dev/null && echo '✓ kurulu' || echo '✗ bulunamadı')"

  # Gemini
  log "  ${CYAN}Gemini CLI${NC} (UAT)"
  log "    CLI: $(which gemini 2>/dev/null && echo '✓ kurulu' || echo '✗ bulunamadı')"

  # DeepSeek
  log "  ${CYAN}DeepSeek${NC} (Code Review — \$0.01/rev)"
  log "    Script: $([ -f scripts/deepseek-review.sh ] && echo '✓ hazır' || echo '✗ yok')"

  # Grok
  log "  ${CYAN}Grok${NC} (Context Prep — \$0.002/call)"
  log "    Script: $([ -f scripts/grok-context.sh ] && echo '✓ hazır' || echo '✗ yok')"

  # Groq
  log "  ${CYAN}Groq${NC} (Hızlı Q&A — FREE)"
  log "    Script: $([ -f scripts/groq-helper.sh ] && echo '✓ hazır' || echo '✗ yok')"

  # Cerebras
  log "  ${CYAN}Cerebras${NC} (Ağır Review — FREE)"
  log "    Script: $([ -f scripts/cerebras-review.sh ] && echo '✓ hazır' || echo '✗ yok')"

  # OpenRouter
  log "  ${CYAN}OpenRouter${NC} (Fallback — FREE)"
  log "    Script: $([ -f scripts/openrouter-fallback.sh ] && echo '✓ hazır' || echo '✗ yok')"

  # Yeni agent'lar
  log "  ${CYAN}SambaNova${NC} (Llama 405B — FREE)"
  log "    Script: $([ -f scripts/sambanova-review.sh ] && echo '✓ hazır' || echo '✗ yok')"

  log "  ${CYAN}Diffray${NC} (Multi-agent review — 5 ajan)"
  log "    CLI: $(command -v diffray &>/dev/null && echo '✓ kurulu' || echo '✗ yok')"

  log "  ${CYAN}Aider${NC} (Git-native AI commit)"
  log "    CLI: $(command -v aider &>/dev/null && echo '✓ kurulu' || echo '✗ yok')"

  log ""

  # Son aşama
  local stage=$(detect_stage)
  log "  Aktif aşama: ${BOLD}$stage${NC}"
  log "  Son commit: $(git log --oneline -1 2>/dev/null)"
  log "  Değişiklik: $(git diff --stat --no-color 2>/dev/null | tail -1)"
  log ""

  # Maliyet
  log "  ${BOLD}Günlük maliyet tahmini:${NC} ~\$0.15"
  log "  Ücretli: DeepSeek (\$20) + Grok (\$25) = \$45 toplam"
  log "  Ücretsiz: Groq + Cerebras + OpenRouter + Gemini"
  divider
}

# ═══════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════
show_summary() {
  divider
  log "${BOLD}📊 Pipeline Özeti${NC}"
  log ""
  log "  Log: $LOG"
  log "  Sonuçlar: $RESULTS_DIR/"
  log ""

  # Honest step-by-step report
  log "  ${BOLD}Step Sonuçları:${NC}"
  local pass_count=0
  local fail_count=0
  local skip_count=0
  for entry in $STEP_RESULTS; do
    local name="${entry%%:*}"
    local result="${entry##*:}"
    case "$result" in
      PASS) log "    ${GREEN}✓${NC} $name"; pass_count=$((pass_count + 1)) ;;
      FAIL) log "    ${RED}✗${NC} $name"; fail_count=$((fail_count + 1)) ;;
      SKIP) log "    ${YELLOW}—${NC} $name (atlandı)"; skip_count=$((skip_count + 1)) ;;
    esac
  done
  log ""
  log "  Toplam: ${GREEN}$pass_count geçti${NC} / ${RED}$fail_count fail${NC} / ${YELLOW}$skip_count atlandı${NC}"

  if [ "$fail_count" -gt 0 ]; then
    notify_telegram "⚠️ *Pipeline tamamlandi:* $pass_count geçti, $fail_count FAIL, $skip_count atlandı — reviews/ incele"
  else
    notify_telegram "✅ *Pipeline tamamlandi:* $pass_count/$((pass_count + skip_count)) geçti ($skip_count atlandı)"
  fi
  log ""
  divider
}

# ═══════════════════════════════════════
# MAIN
# ═══════════════════════════════════════
case "${1:-help}" in
  run)
    divider
    log "${BOLD}🚀 HelloTalent AI Pipeline — Tam Çalıştırma${NC}"
    log "Başlangıç: $(date '+%Y-%m-%d %H:%M')"
    divider
    step_brief
    step_implement
    step_review
    step_test
    step_uat
    step_sync
    show_summary
    notify_phone "Pipeline Tamamlandi" "Tum adimlar bitti. reviews/ klasorunu incele." "default" "white_check_mark"
    notify_mac "HelloTalent Pipeline" "Tum adimlar tamamlandi!"
    ;;

  quick)
    divider
    log "${BOLD}⚡ Hızlı Pipeline — Implement + Review${NC}"
    divider
    step_implement
    step_review
    step_test
    show_summary
    notify_phone "Quick Pipeline Bitti" "Implement + review + test tamamlandi." "default" "zap"
    notify_mac "HelloTalent Quick" "Implement + review tamamlandi!"
    ;;

  review)
    divider
    log "${BOLD}🔍 Sadece Review${NC}"
    divider
    step_review
    ;;

  uat)
    step_uat
    ;;

  status)
    show_status
    ;;

  *)
    echo ""
    echo -e "${BOLD}HelloTalent AI Orchestrator${NC}"
    echo ""
    echo "Kullanım:"
    echo "  $0 run        Tam pipeline (brief → implement → review → test → UAT → sync)"
    echo "  $0 quick      Hızlı (implement → review → test)"
    echo "  $0 review     Sadece code review (DeepSeek + Cerebras)"
    echo "  $0 uat        Sadece UAT (Gemini)"
    echo "  $0 status     Tüm agent durumu"
    echo ""
    echo "Workflow:"
    echo "  1. Codex masaüstünde AI-COLLAB.md'ye yeni aşama yaz"
    echo "  2. Terminalde: ./scripts/orchestrator.sh run"
    echo "  3. Pipeline otomatik çalışır"
    echo "  4. Sonuçları reviews/ klasöründe incele"
    echo "  5. Codex'e dön, sonucu göster"
    echo ""
    ;;
esac
