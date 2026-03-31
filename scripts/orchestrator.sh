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

  if [ -f "scripts/deepseek-review.sh" ]; then
    # Diff review
    log "Diff review..."
    if ! ./scripts/deepseek-review.sh diff 2>&1 | tee -a "$LOG"; then
      log "${YELLOW}[INFRA WARNING] DeepSeek diff review başarısız — API/ağ hatası olabilir. Ürün FAIL değil.${NC}"
      notify_telegram "⚠️ *[INFRA] DeepSeek diff review basarisiz* — API hatasi, urun FAIL degil"
    fi
    log ""

    # Security audit
    log "Security audit..."
    if ! ./scripts/deepseek-review.sh security 2>&1 | tee -a "$LOG"; then
      log "${YELLOW}[INFRA WARNING] DeepSeek security audit başarısız — API/ağ hatası. Ürün FAIL değil.${NC}"
      notify_telegram "⚠️ *[INFRA] DeepSeek security audit basarisiz* — API hatasi, urun FAIL degil"
    fi
    log ""
  else
    log "${YELLOW}[INFRA WARNING] DeepSeek script bulunamadı, review atlanıyor.${NC}"
    notify_telegram "⚠️ *[INFRA] DeepSeek script bulunamadi* — review atlandi, urun FAIL degil"
  fi

  # Cerebras deep review (en çok değişen dosya)
  if [ -f "scripts/cerebras-review.sh" ]; then
    local changed=$(git diff --name-only 2>/dev/null | grep '\.js$' | head -1)
    if [ -n "$changed" ] && [ -f "$changed" ]; then
      log "Cerebras derin review: $changed"
      ./scripts/cerebras-review.sh deep "$changed" 2>&1 | tee -a "$LOG" || true
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

  log "P3 regression testleri..."
  local p3_result=$(npm run test:p3 2>&1 | tail -1)
  log "  $p3_result"
  if echo "$p3_result" | grep -q "failed"; then
    notify_phone "HATA: P3 Test FAIL" "$p3_result" "urgent" "x"
    notify_telegram "❌ *Test FAIL:* $p3_result"
  fi

  log "Smoke testleri..."
  local smoke_result=$(npm run test:smoke 2>&1 | tail -1)
  log "  $smoke_result"
  if echo "$smoke_result" | grep -q "failed"; then
    notify_phone "HATA: Smoke Test FAIL" "$smoke_result" "urgent" "x"
    notify_telegram "❌ *Smoke FAIL:* $smoke_result"
  fi
  log ""
}

# ═══════════════════════════════════════
# STEP 5: GEMINI UAT
# ═══════════════════════════════════════
step_uat() {
  divider
  log "${BOLD}🌐 STEP 5: Gemini UAT${NC}"
  log ""

  local uat_output="$RESULTS_DIR/uat-$TIMESTAMP.md"
  if command -v gemini &>/dev/null; then
    log "Gemini UAT başlatılıyor..."
    local uat_prompt="GEMINI.md dosyasını oku. docs/AI-COLLAB.md'deki son aşamayı oku. Canlı siteyi https://hellotalent.ai test et. Bulgularını docs/AI-COLLAB.md'ye UAT Raporu olarak yaz. Kod değiştirme."

    if gemini -p "$uat_prompt" > "$uat_output" 2>&1; then
      # Exit 0 olsa da quota/infra hatası içerebilir
      if grep -qiE 'QUOTA_EXHAUSTED|quota.*exceeded|rate.?limit|RESOURCE_EXHAUSTED' "$uat_output" 2>/dev/null; then
        log "${YELLOW}[INFRA WARNING] Gemini quota/rate-limit — UAT koşamadı. Ürün FAIL değil.${NC}"
        echo "[INFRA WARNING] Gemini quota/rate-limit — $(date '+%Y-%m-%d %H:%M')" >> "$uat_output"
        notify_telegram "⚠️ *[INFRA] Gemini quota/rate-limit* — UAT atlandi, urun FAIL degil"
      else
        log "${GREEN}UAT tamamlandı:${NC} $uat_output"
      fi
    else
      local uat_exit=$?
      # Hata tipini sınıflandır — altyapı mı yoksa ürün testi mi?
      if grep -qiE 'QUOTA_EXHAUSTED|quota.*exceeded|rate.?limit|RESOURCE_EXHAUSTED' "$uat_output" 2>/dev/null; then
        log "${YELLOW}[INFRA WARNING] Gemini quota/rate-limit (kod: $uat_exit) — UAT atlandi.${NC}"
        echo "[INFRA WARNING] Gemini quota/rate-limit — $(date '+%Y-%m-%d %H:%M')" >> "$uat_output"
        notify_telegram "⚠️ *[INFRA] Gemini quota/rate-limit* — UAT atlandi, urun FAIL degil"
      elif grep -qiE 'UNAUTHENTICATED|not authenticated|auth.*error|invalid.*key' "$uat_output" 2>/dev/null; then
        log "${YELLOW}[INFRA WARNING] Gemini auth hatası (kod: $uat_exit) — UAT atlandı.${NC}"
        echo "[INFRA WARNING] Gemini auth error — $(date '+%Y-%m-%d %H:%M')" >> "$uat_output"
        notify_telegram "⚠️ *[INFRA] Gemini auth hatasi* — UAT atlandi, urun FAIL degil"
      else
        log "${YELLOW}[INFRA WARNING] Gemini UAT beklenmedik hata (kod: $uat_exit) — UAT atlandı.${NC}"
        echo "[INFRA WARNING] Unexpected error code $uat_exit — $(date '+%Y-%m-%d %H:%M')" >> "$uat_output"
        notify_telegram "⚠️ *[INFRA] Gemini UAT beklenmedik hata* (kod: $uat_exit) — urun FAIL degil"
      fi
    fi
  else
    log "${YELLOW}[INFRA WARNING] Gemini CLI bulunamadı, UAT atlanıyor.${NC}"
    echo "[INFRA WARNING] Gemini CLI kurulu degil — $(date '+%Y-%m-%d %H:%M')" > "$uat_output"
    notify_telegram "⚠️ *[INFRA] Gemini CLI bulunamadi* — UAT atlandi, urun FAIL degil"
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
  log "  Sıradaki adım:"
  log "  1. ${CYAN}reviews/${NC} klasöründeki sonuçları incele"
  log "  2. Kritik bulgu varsa düzelt"
  log "  3. Codex masaüstüne dön, AI-COLLAB.md'yi göster"
  log "  4. Codex yeni aşama yazarsa: ${BOLD}./scripts/orchestrator.sh run${NC}"
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
