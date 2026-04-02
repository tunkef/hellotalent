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
#   state_summary                → Telegram'a gönderilecek özet

STATE_FILE="${STATE_FILE:-.state.json}"

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
  local tmp="${STATE_FILE}.tmp"
  jq --arg k "$key" --arg v "$value" '.[$k] = $v | .last_update = now' "$STATE_FILE" > "$tmp" && mv "$tmp" "$STATE_FILE"
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
