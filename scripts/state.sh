#!/bin/bash
# state.sh — Aşama state machine
# Durumlar: idle → planning → waiting_approval → implementing → reviewing → reporting → idle
#
# Kullanım:
#   source scripts/state.sh
#   state_get                    → mevcut state JSON
#   state_set "implementing"     → durumu güncelle
#   state_set_stage 50           → aşama numarasını güncelle
#   state_set_task "Employer onboarding"  → aktif görevi güncelle
#   state_summary                → Durum özeti

STATE_FILE="${STATE_FILE:-.state.json}"

DAILY_PLAN_FILE="${DAILY_PLAN_FILE:-.daily-plan.json}"

_ensure_state() {
  if [ ! -f "$STATE_FILE" ]; then
    cat > "$STATE_FILE" << 'JSON'
{
  "phase": "idle",
  "stage": 0,
  "task": "",
  "last_commit": "",
  "last_update": "",
  "pending_input": ""
}
JSON
  fi
}

state_get() {
  _ensure_state
  cat "$STATE_FILE"
}

state_read() {
  _ensure_state
  jq -r ".${1}" "$STATE_FILE" 2>/dev/null || echo ""
}

state_set() {
  _ensure_state
  local key="$1"
  local value="$2"
  local tmp="${STATE_FILE}.tmp.$$"
  jq --arg k "$key" --arg v "$value" '.[$k] = $v | .last_update = now' "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
}

# Lock wrapper for plan mutations (prevents race from duplicate Telegram messages)
_plan_lock() {
  local lockfile="${DAILY_PLAN_FILE}.lock"
  if [ -f "$lockfile" ]; then
    local lock_age=$(( $(date +%s) - $(stat -f%m "$lockfile" 2>/dev/null || echo 0) ))
    [ "$lock_age" -lt 3 ] && return 1  # debounce: skip if locked within 3s
  fi
  touch "$lockfile"
  return 0
}

state_set_phase() {
  state_set "phase" "$1"
}

state_set_stage() {
  state_set "stage" "$1"
}

state_set_task() {
  state_set "task" "$1"
}

state_summary() {
  _ensure_state
  local phase=$(state_read "phase")
  local stage=$(state_read "stage")
  local task=$(state_read "task")
  local commit=$(git log --oneline -1 2>/dev/null || echo "?")

  local phase_tr=""
  case "$phase" in
    idle)              phase_tr="Beklemede" ;;
    planning)          phase_tr="Planlaniyor" ;;
    waiting_approval)  phase_tr="Onay bekleniyor" ;;
    implementing)      phase_tr="Uygulaniyor" ;;
    reviewing)         phase_tr="Review ediliyor" ;;
    reporting)         phase_tr="Raporlaniyor" ;;
    *)                 phase_tr="$phase" ;;
  esac

  echo "Asama: $stage
Durum: $phase_tr
Gorev: ${task:-Tanimli degil}
Son commit: $commit"
}

# ── Günlük plan yönetimi ──

plan_save() {
  # plan_save '["Asama 50: Pozisyon metrikleri", "Asama 51: Profil testleri"]'
  local date_str=$(date '+%Y-%m-%d')
  local items="$1"
  cat > "$DAILY_PLAN_FILE" << PLAN
{
  "date": "$date_str",
  "items": $items,
  "completed": [],
  "current_index": 0
}
PLAN
}

plan_get() {
  [ -f "$DAILY_PLAN_FILE" ] && cat "$DAILY_PLAN_FILE" || echo "{}"
}

plan_current_item() {
  [ -f "$DAILY_PLAN_FILE" ] || return
  local idx=$(jq -r '.current_index // 0' "$DAILY_PLAN_FILE")
  jq -r ".items[$idx] // empty" "$DAILY_PLAN_FILE"
}

plan_mark_done() {
  [ -f "$DAILY_PLAN_FILE" ] || return
  _plan_lock || return  # debounce duplicate calls
  local tmp="${DAILY_PLAN_FILE}.tmp.$$"
  local current=$(plan_current_item)
  [ -z "$current" ] && return  # no more items
  jq --arg item "$current" '
    .completed += [$item] |
    .current_index += 1
  ' "$DAILY_PLAN_FILE" > "$tmp" && mv "$tmp" "$DAILY_PLAN_FILE"
}

plan_remaining() {
  if [ ! -f "$DAILY_PLAN_FILE" ]; then echo "Plan yok"; return; fi
  local idx=$(jq -r '.current_index // 0' "$DAILY_PLAN_FILE")
  local total=$(jq -r '.items | length' "$DAILY_PLAN_FILE")
  local done=$(jq -r '.completed | length' "$DAILY_PLAN_FILE")

  echo "Tamamlanan: $done / $total"
  jq -r --argjson idx "$idx" '.items[$idx:] | to_entries[] | "[ ] \(.value)"' "$DAILY_PLAN_FILE" 2>/dev/null || true
  jq -r '.completed[] | "[x] \(.)"' "$DAILY_PLAN_FILE" 2>/dev/null || true
}

plan_summary() {
  if [ ! -f "$DAILY_PLAN_FILE" ]; then echo "Gunluk plan henuz olusturulmadi."; return; fi
  local date_str=$(jq -r '.date' "$DAILY_PLAN_FILE")
  local total=$(jq -r '.items | length' "$DAILY_PLAN_FILE")
  local done=$(jq -r '.completed | length' "$DAILY_PLAN_FILE")
  local idx=$(jq -r '.current_index // 0' "$DAILY_PLAN_FILE")

  local msg="GUNUN PLANI — $date_str
Ilerleme: $done / $total

"
  # Completed items
  local completed_items=$(jq -r '.completed[]' "$DAILY_PLAN_FILE" 2>/dev/null || true)
  if [ -n "$completed_items" ]; then
    while IFS= read -r item; do
      msg+="[x] $item
"
    done <<< "$completed_items"
  fi

  # Remaining items
  local remaining_items=$(jq -r --argjson idx "$idx" '.items[$idx:][]' "$DAILY_PLAN_FILE" 2>/dev/null || true)
  if [ -n "$remaining_items" ]; then
    while IFS= read -r item; do
      msg+="[ ] $item
"
    done <<< "$remaining_items"
  fi

  echo "$msg"
}
