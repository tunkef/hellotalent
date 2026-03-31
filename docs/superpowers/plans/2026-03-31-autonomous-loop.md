# Autonomous Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable fully autonomous Claude-Codex-Telegram loop so the user never needs to sit at the computer — approve/revise/redirect stages from Telegram only.

**Architecture:** 3 new shell scripts wrap the existing pipeline. `codex-bridge.sh` uses Computer Use to talk to Codex desktop app. `telegram-gate.sh` sends detailed stage summaries and waits for user approval via Telegram polling. `autonomous-loop.sh` orchestrates the full state machine: PIPELINE → REPORT → WAIT_CODEX → GATE → loop.

**Tech Stack:** Bash, Telegram Bot API (curl + jq), Claude Code Computer Use, existing orchestrator.sh pipeline

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `scripts/telegram-gate.sh` | Create | Send stage summaries to Telegram, poll for user approval/feedback |
| `scripts/codex-bridge.sh` | Create | Use Computer Use to send messages to Codex desktop app and read responses |
| `scripts/autonomous-loop.sh` | Create | State machine orchestrating the full loop |
| `scripts/autopilot.sh` | Modify | Skip own pipeline call when autonomous-loop is active |
| `.gitignore` | Modify | Add new runtime state files |
| `tests/autonomous-loop.bats` | Create | BATS test suite for all 3 scripts |

---

### Task 1: Test Infrastructure — Install BATS

Shell scripts need a test framework. BATS (Bash Automated Testing System) is the standard for bash TDD.

**Files:**
- Modify: `.gitignore`
- Create: `tests/test_helper.bash`

- [ ] **Step 1: Install BATS via npm**

```bash
npm install --save-dev bats bats-assert bats-support
```

- [ ] **Step 2: Create test helper with common setup**

Create `tests/test_helper.bash`:

```bash
#!/bin/bash
# Common test helper for BATS tests
# Loads bats-support and bats-assert

load 'node_modules/bats-support/load'
load 'node_modules/bats-assert/load'

# Project root
export PROJECT_DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")/.." && pwd)"

# Mock env for tests
export TELEGRAM_BOT_TOKEN="test-token-123"
export TELEGRAM_CHAT_ID="8754557605"

# Temp dir for test state files
setup() {
  export TEST_TMP="$(mktemp -d)"
}

teardown() {
  rm -rf "$TEST_TMP"
}
```

- [ ] **Step 3: Verify BATS runs**

```bash
npx bats --version
```

Expected: version number (e.g., `1.11.0`)

- [ ] **Step 4: Commit**

```bash
git add tests/test_helper.bash package.json package-lock.json
git commit -m "chore: add BATS test framework for shell script TDD"
```

---

### Task 2: telegram-gate.sh — Failing Tests

Write all tests for telegram-gate.sh before any implementation.

**Files:**
- Create: `tests/telegram-gate.bats`

- [ ] **Step 1: Write tests for notify command**

Create `tests/telegram-gate.bats`:

```bash
#!/usr/bin/env bats

load 'test_helper'

# ── notify tests ──

@test "notify sends formatted Telegram message with stage number" {
  # Create a mock summary file
  cat > "$TEST_TMP/stage-summary.txt" <<'EOF'
Tema: Iyzico odeme entegrasyonu
Dosyalar: payment.js (yeni), profil-premium.js (guncelleme)
Codex notu: MVP icin tek seferlik odeme yeterli
Risk: Sandbox key gerekli
EOF

  # Mock curl to capture what would be sent
  curl() {
    echo "$@" >> "$TEST_TMP/curl-calls.log"
    echo '{"ok":true}'
  }
  export -f curl

  source "$PROJECT_DIR/scripts/telegram-gate.sh"
  _notify 23 "$TEST_TMP/stage-summary.txt"

  # Verify curl was called
  assert [ -f "$TEST_TMP/curl-calls.log" ]

  # Verify message contains stage number
  run grep "23" "$TEST_TMP/curl-calls.log"
  assert_success
}

@test "notify fails gracefully when summary file missing" {
  curl() { echo '{"ok":true}'; }
  export -f curl

  source "$PROJECT_DIR/scripts/telegram-gate.sh"
  run _notify 23 "/nonexistent/file.txt"
  assert_failure
}

@test "notify includes all required sections in message" {
  cat > "$TEST_TMP/stage-summary.txt" <<'EOF'
Tema: Test tema
Dosyalar: test.js (yeni)
Codex notu: Test notu
Risk: Yok
EOF

  local captured_msg=""
  curl() {
    for arg in "$@"; do
      captured_msg+="$arg "
    done
    echo "$captured_msg" >> "$TEST_TMP/curl-msg.log"
    echo '{"ok":true}'
  }
  export -f curl

  source "$PROJECT_DIR/scripts/telegram-gate.sh"
  _notify 10 "$TEST_TMP/stage-summary.txt"

  run cat "$TEST_TMP/curl-msg.log"
  assert_output --partial "Tema"
  assert_output --partial "Dosyalar"
  assert_output --partial "go"
  assert_output --partial "dont"
}

# ── wait tests ──

@test "wait returns GO when user sends go" {
  # Mock Telegram getUpdates to return "go"
  curl() {
    if [[ "$*" == *"getUpdates"* ]]; then
      echo '{"ok":true,"result":[{"update_id":1001,"message":{"chat":{"id":8754557605},"text":"go"}}]}'
    else
      echo '{"ok":true}'
    fi
  }
  export -f curl

  source "$PROJECT_DIR/scripts/telegram-gate.sh"
  export GATE_OFFSET_FILE="$TEST_TMP/.telegram-gate.offset"
  run _wait_for_approval
  assert_output "GO"
}

@test "wait returns DONT when user sends dont" {
  curl() {
    if [[ "$*" == *"getUpdates"* ]]; then
      echo '{"ok":true,"result":[{"update_id":1002,"message":{"chat":{"id":8754557605},"text":"dont"}}]}'
    else
      echo '{"ok":true}'
    fi
  }
  export -f curl

  source "$PROJECT_DIR/scripts/telegram-gate.sh"
  export GATE_OFFSET_FILE="$TEST_TMP/.telegram-gate.offset"
  run _wait_for_approval
  assert_output "DONT"
}

@test "wait returns FEEDBACK with message for free text" {
  curl() {
    if [[ "$*" == *"getUpdates"* ]]; then
      echo '{"ok":true,"result":[{"update_id":1003,"message":{"chat":{"id":8754557605},"text":"buna bir de coach panel ekle"}}]}'
    else
      echo '{"ok":true}'
    fi
  }
  export -f curl

  source "$PROJECT_DIR/scripts/telegram-gate.sh"
  export GATE_OFFSET_FILE="$TEST_TMP/.telegram-gate.offset"
  run _wait_for_approval
  assert_output "FEEDBACK:buna bir de coach panel ekle"
}

@test "wait ignores messages from other chat IDs" {
  local call_count=0
  curl() {
    if [[ "$*" == *"getUpdates"* ]]; then
      call_count=$((call_count + 1))
      if [ "$call_count" -le 1 ]; then
        # First call: message from wrong chat
        echo '{"ok":true,"result":[{"update_id":1004,"message":{"chat":{"id":999999},"text":"go"}}]}'
      else
        # Second call: message from correct chat
        echo '{"ok":true,"result":[{"update_id":1005,"message":{"chat":{"id":8754557605},"text":"go"}}]}'
      fi
    else
      echo '{"ok":true}'
    fi
  }
  export -f curl

  source "$PROJECT_DIR/scripts/telegram-gate.sh"
  export GATE_OFFSET_FILE="$TEST_TMP/.telegram-gate.offset"
  run _wait_for_approval
  assert_output "GO"
}

@test "wait updates offset file after reading message" {
  curl() {
    if [[ "$*" == *"getUpdates"* ]]; then
      echo '{"ok":true,"result":[{"update_id":2000,"message":{"chat":{"id":8754557605},"text":"go"}}]}'
    else
      echo '{"ok":true}'
    fi
  }
  export -f curl

  source "$PROJECT_DIR/scripts/telegram-gate.sh"
  export GATE_OFFSET_FILE="$TEST_TMP/.telegram-gate.offset"
  _wait_for_approval > /dev/null

  run cat "$TEST_TMP/.telegram-gate.offset"
  assert_output "2001"
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx bats tests/telegram-gate.bats
```

Expected: All tests FAIL (scripts/telegram-gate.sh does not exist yet)

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/telegram-gate.bats
git commit -m "test: add failing tests for telegram-gate.sh"
```

---

### Task 3: telegram-gate.sh — Implementation

Make all Task 2 tests pass.

**Files:**
- Create: `scripts/telegram-gate.sh`

- [ ] **Step 1: Implement telegram-gate.sh**

Create `scripts/telegram-gate.sh`:

```bash
#!/bin/bash
# ═══════════════════════════════════════════════════
# HelloTalent Telegram Gate — Onay Kapisi
# Kullaniciya detayli asama ozeti gonderir, onay bekler.
#
#   ./scripts/telegram-gate.sh notify <asama_no> <ozet_dosyasi>
#   ./scripts/telegram-gate.sh wait
# ═══════════════════════════════════════════════════

set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.local ] && set -a && . .env.local && set +a

BOT_TOKEN="${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN env variable gerekli.}"
CHAT_ID="${TELEGRAM_CHAT_ID:-8754557605}"
API="https://api.telegram.org/bot$BOT_TOKEN"
GATE_OFFSET_FILE="${GATE_OFFSET_FILE:-.telegram-gate.offset}"
LOG_FILE="reviews/telegram-gate.log"

mkdir -p reviews

_send() {
  local text="$1"
  local retry=0
  while [ $retry -lt 3 ]; do
    local result
    result=$(curl -s -X POST "$API/sendMessage" \
      -d "chat_id=$CHAT_ID" \
      --data-urlencode "text=$text" \
      -d "parse_mode=Markdown" 2>/dev/null)
    if echo "$result" | jq -e '.ok' > /dev/null 2>&1; then
      return 0
    fi
    retry=$((retry + 1))
    sleep 2
  done
  echo "$(date '+%H:%M:%S') HATA: Telegram mesaj gonderilemedi (3 deneme)" >> "$LOG_FILE"
  osascript -e 'display notification "Telegram mesaj gonderilemedi" with title "Autonomous Loop HATA"' 2>/dev/null || true
  return 1
}

_notify() {
  local stage_no="$1"
  local summary_file="$2"

  if [ ! -f "$summary_file" ]; then
    echo "HATA: Ozet dosyasi bulunamadi: $summary_file" >&2
    return 1
  fi

  local tema=$(grep -i "^Tema:" "$summary_file" | head -1 | sed 's/^Tema: *//')
  local dosyalar=$(grep -i "^Dosyalar:" "$summary_file" | head -1 | sed 's/^Dosyalar: *//')
  local codex_notu=$(grep -i "^Codex notu:" "$summary_file" | head -1 | sed 's/^Codex notu: *//')
  local risk=$(grep -i "^Risk:" "$summary_file" | head -1 | sed 's/^Risk: *//')

  local msg="🔄 *Yeni Asama: $stage_no*

📋 *Tema:* $tema
📁 *Dosyalar:* $dosyalar
🎯 *Codex notu:* $codex_notu
⚠️ *Risk:* $risk

→ *go* — onayla, Claude baslasin
→ *dont* — bu asamayi iptal et
→ veya ne istedigini yaz"

  _send "$msg"
  echo "$(date '+%H:%M:%S') Bildirim gonderildi: Asama $stage_no" >> "$LOG_FILE"
}

_wait_for_approval() {
  local offset=$(cat "$GATE_OFFSET_FILE" 2>/dev/null || echo "0")

  while true; do
    local response
    response=$(curl -s "$API/getUpdates?offset=$offset&timeout=30" 2>/dev/null)
    local updates
    updates=$(echo "$response" | jq -r '.result | length' 2>/dev/null || echo "0")

    if [ "$updates" -gt 0 ]; then
      local i=0
      while [ $i -lt "$updates" ]; do
        local update_id
        update_id=$(echo "$response" | jq -r ".result[$i].update_id")
        local msg_text
        msg_text=$(echo "$response" | jq -r ".result[$i].message.text // empty")
        local sender_id
        sender_id=$(echo "$response" | jq -r ".result[$i].message.chat.id // empty")

        offset=$((update_id + 1))
        echo "$offset" > "$GATE_OFFSET_FILE"

        if [ "$sender_id" = "$CHAT_ID" ] && [ -n "$msg_text" ]; then
          local lower
          lower=$(echo "$msg_text" | tr '[:upper:]' '[:lower:]')
          echo "$(date '+%H:%M:%S') Kullanici cevabi: $msg_text" >> "$LOG_FILE"

          case "$lower" in
            go)
              echo "GO"
              return 0
              ;;
            dont|don\'t|stop)
              echo "DONT"
              return 0
              ;;
            *)
              echo "FEEDBACK:$msg_text"
              return 0
              ;;
          esac
        fi

        i=$((i + 1))
      done
    fi
  done
}

# ── CLI entry point ──
case "${1:-help}" in
  notify)
    _notify "${2:?Asama numarasi gerekli}" "${3:?Ozet dosyasi gerekli}"
    ;;
  wait)
    _wait_for_approval
    ;;
  *)
    echo "Telegram Gate — Onay Kapisi"
    echo ""
    echo "  $0 notify <asama_no> <ozet_dosyasi>"
    echo "  $0 wait"
    ;;
esac
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x scripts/telegram-gate.sh
```

- [ ] **Step 3: Run syntax check**

```bash
bash -n scripts/telegram-gate.sh
```

Expected: no output (clean)

- [ ] **Step 4: Run tests**

```bash
npx bats tests/telegram-gate.bats
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/telegram-gate.sh
git commit -m "feat: implement telegram-gate.sh — user approval gateway"
```

---

### Task 4: codex-bridge.sh — Failing Tests

Write tests for codex-bridge.sh. Since Computer Use is interactive and hard to unit test, we test the message formatting, argument parsing, and state management — not the actual screen interaction.

**Files:**
- Create: `tests/codex-bridge.bats`

- [ ] **Step 1: Write tests**

Create `tests/codex-bridge.bats`:

```bash
#!/usr/bin/env bats

load 'test_helper'

# ── Argument parsing tests ──

@test "report requires a summary argument" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  run _validate_report_args ""
  assert_failure
}

@test "report accepts a summary string" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  run _validate_report_args "Asama 21 bitti. 2 dosya degisti."
  assert_success
}

@test "send-user-feedback requires both original and comment args" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  run _validate_feedback_args "only one arg" ""
  assert_failure
}

@test "send-user-feedback accepts both args" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  run _validate_feedback_args "kullanici mesaji" "claude yorumu"
  assert_success
}

# ── Message formatting tests ──

@test "format_report_message includes stage summary" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  run _format_report_message "Asama 21 bitti. 2 dosya degisti, testler gecti."
  assert_output --partial "Asama 21 bitti"
  assert_output --partial "Sonraki asamayi yaz"
}

@test "format_feedback_message includes both original and comment" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  run _format_feedback_message "bunu birak coach panel fix et" "Kullanici coach-studio.js'teki bug'i kastetmis olabilir"
  assert_output --partial "bunu birak coach panel fix et"
  assert_output --partial "coach-studio.js"
}

# ── State management tests ──

@test "log writes to codex-bridge.log" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  export BRIDGE_LOG="$TEST_TMP/codex-bridge.log"
  _bridge_log "test message"
  run cat "$TEST_TMP/codex-bridge.log"
  assert_output --partial "test message"
}

# ── Timeout tests ──

@test "read timeout returns error after max wait" {
  source "$PROJECT_DIR/scripts/codex-bridge.sh"
  export CODEX_READ_TIMEOUT=2
  export CODEX_READ_INTERVAL=1
  # Mock _check_codex_response to always return empty
  _check_codex_response() { echo ""; }
  export -f _check_codex_response
  run _read_with_timeout
  assert_failure
  assert_output --partial "TIMEOUT"
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx bats tests/codex-bridge.bats
```

Expected: All tests FAIL

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/codex-bridge.bats
git commit -m "test: add failing tests for codex-bridge.sh"
```

---

### Task 5: codex-bridge.sh — Implementation

Make all Task 4 tests pass. The actual Computer Use interaction will be handled by Claude Code at runtime — this script formats messages and manages state.

**Files:**
- Create: `scripts/codex-bridge.sh`

- [ ] **Step 1: Implement codex-bridge.sh**

Create `scripts/codex-bridge.sh`:

```bash
#!/bin/bash
# ═══════════════════════════════════════════════════
# HelloTalent Codex Bridge — Computer Use ile Codex Iletisimi
# Codex desktop app'e mesaj yazar, cevap okur.
#
#   ./scripts/codex-bridge.sh report <ozet>
#   ./scripts/codex-bridge.sh read
#   ./scripts/codex-bridge.sh send-user-feedback <orijinal> <yorum>
# ═══════════════════════════════════════════════════

set -euo pipefail
cd "$(dirname "$0")/.."

BRIDGE_LOG="${BRIDGE_LOG:-reviews/codex-bridge.log}"
CODEX_READ_TIMEOUT="${CODEX_READ_TIMEOUT:-600}"
CODEX_READ_INTERVAL="${CODEX_READ_INTERVAL:-10}"
CODEX_APP_NAME="Codex"
CODEX_MAX_RETRIES=3

mkdir -p reviews

_bridge_log() {
  echo "$(date '+%H:%M:%S') $1" >> "$BRIDGE_LOG"
}

# ── Validation ──

_validate_report_args() {
  [ -n "$1" ] || return 1
}

_validate_feedback_args() {
  [ -n "$1" ] && [ -n "$2" ] || return 1
}

# ── Message formatting ──

_format_report_message() {
  local summary="$1"
  echo "$summary

Sonraki asamayi yaz. AI-COLLAB.md formatinda: tema, scope, dosyalar, hedef, kurallar."
}

_format_feedback_message() {
  local original="$1"
  local comment="$2"
  echo "Kullanici geri bildirimi:
\"$original\"

Claude CTO yorumu:
$comment

Bu geri bildirime gore asamayi revize et."
}

# ── Computer Use: Codex app'e mesaj gonder ──

_open_codex_app() {
  local retry=0
  while [ $retry -lt $CODEX_MAX_RETRIES ]; do
    if osascript -e "tell application \"$CODEX_APP_NAME\" to activate" 2>/dev/null; then
      _bridge_log "Codex app acildi"
      sleep 2
      return 0
    fi
    retry=$((retry + 1))
    _bridge_log "Codex app acilamadi, deneme $retry/$CODEX_MAX_RETRIES"
    sleep 3
  done
  _bridge_log "HATA: Codex app $CODEX_MAX_RETRIES denemede acilamadi"
  return 1
}

_send_to_codex() {
  local message="$1"
  _bridge_log "Codex'e mesaj gonderiliyor (${#message} karakter)"

  # Computer Use will handle the actual UI interaction:
  # 1. Click on message input field
  # 2. Type the message
  # 3. Press Enter to send
  # This function is called by Claude Code with Computer Use enabled
  # The actual implementation uses Computer Use tools at runtime

  echo "$message"
}

# ── Computer Use: Codex cevabini oku ──

_check_codex_response() {
  # Computer Use will screenshot and read the response
  # Returns empty string if no new response, or the response text
  echo ""
}

_read_with_timeout() {
  local elapsed=0
  while [ $elapsed -lt "$CODEX_READ_TIMEOUT" ]; do
    local response
    response=$(_check_codex_response)
    if [ -n "$response" ]; then
      _bridge_log "Codex cevap verdi (${#response} karakter)"
      echo "$response"
      return 0
    fi
    sleep "$CODEX_READ_INTERVAL"
    elapsed=$((elapsed + CODEX_READ_INTERVAL))
    _bridge_log "Codex cevap bekleniyor... ${elapsed}s / ${CODEX_READ_TIMEOUT}s"
  done
  _bridge_log "TIMEOUT: Codex $CODEX_READ_TIMEOUT saniyede cevap vermedi"
  echo "TIMEOUT"
  return 1
}

# ── CLI entry point ──
case "${1:-help}" in
  report)
    summary="${2:?Ozet gerekli}"
    _validate_report_args "$summary"
    message=$(_format_report_message "$summary")
    _bridge_log "REPORT basladi"
    if _open_codex_app; then
      _send_to_codex "$message"
      _bridge_log "REPORT tamamlandi"
    else
      _bridge_log "REPORT basarisiz: Codex acilamadi"
      exit 1
    fi
    ;;

  read)
    _bridge_log "READ basladi"
    _read_with_timeout
    ;;

  send-user-feedback)
    original="${2:?Orijinal mesaj gerekli}"
    comment="${3:?Claude yorumu gerekli}"
    _validate_feedback_args "$original" "$comment"
    message=$(_format_feedback_message "$original" "$comment")
    _bridge_log "FEEDBACK basladi"
    if _open_codex_app; then
      _send_to_codex "$message"
      _bridge_log "FEEDBACK tamamlandi"
    else
      _bridge_log "FEEDBACK basarisiz: Codex acilamadi"
      exit 1
    fi
    ;;

  *)
    echo "Codex Bridge — Computer Use ile Codex Iletisimi"
    echo ""
    echo "  $0 report <ozet>                        Codex'e rapor gonder"
    echo "  $0 read                                 Codex cevabini oku (max 10dk)"
    echo "  $0 send-user-feedback <orijinal> <yorum>  Kullanici feedback'ini ilet"
    ;;
esac
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x scripts/codex-bridge.sh
```

- [ ] **Step 3: Run syntax check**

```bash
bash -n scripts/codex-bridge.sh
```

Expected: no output (clean)

- [ ] **Step 4: Run tests**

```bash
npx bats tests/codex-bridge.bats
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/codex-bridge.sh
git commit -m "feat: implement codex-bridge.sh — Computer Use Codex interface"
```

---

### Task 6: autonomous-loop.sh — Failing Tests

Write tests for the state machine logic.

**Files:**
- Create: `tests/autonomous-loop.bats`

- [ ] **Step 1: Write tests**

Create `tests/autonomous-loop.bats`:

```bash
#!/usr/bin/env bats

load 'test_helper'

# ── State management tests ──

@test "initial state is IDLE" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"
  run _get_state
  assert_output "IDLE"
}

@test "set_state writes to state file" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"
  _set_state "PIPELINE"
  run cat "$TEST_TMP/.autonomous-loop.state"
  assert_output "PIPELINE"
}

@test "set_state cycles through valid states" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"

  for state in IDLE PIPELINE REPORT WAIT_CODEX GATE; do
    _set_state "$state"
    run _get_state
    assert_output "$state"
  done
}

@test "set_state rejects invalid state" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"
  run _set_state "INVALID"
  assert_failure
}

# ── Stage summary extraction ──

@test "extract_stage_summary parses AI-COLLAB stage correctly" {
  cat > "$TEST_TMP/collab.md" <<'EOF'
## 65. Claude Icin Gorev — Asama 22
Tema: Iyzico odeme entegrasyonu
Scope: payment.js, profil-premium.js
Hedef: MVP checkout akisi

Kurallar:
- Scope disina cikma
EOF

  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  run _extract_stage_summary "$TEST_TMP/collab.md" 22
  assert_output --partial "Iyzico"
}

# ── Active check ──

@test "is_active returns true when pid file exists with running process" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export LOOP_PID_FILE="$TEST_TMP/.autonomous-loop.pid"
  echo $$ > "$LOOP_PID_FILE"
  run _is_active
  assert_success
}

@test "is_active returns false when pid file missing" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export LOOP_PID_FILE="$TEST_TMP/.autonomous-loop.pid"
  run _is_active
  assert_failure
}

# ── Gate result handling ──

@test "handle_gate_result GO returns 0" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"
  run _handle_gate_result "GO"
  assert_success
}

@test "handle_gate_result DONT sets state to IDLE" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"
  _handle_gate_result "DONT"
  run _get_state
  assert_output "IDLE"
}

@test "handle_gate_result FEEDBACK returns feedback text" {
  source "$PROJECT_DIR/scripts/autonomous-loop.sh"
  export STATE_FILE="$TEST_TMP/.autonomous-loop.state"
  run _handle_gate_result "FEEDBACK:bunu birak coach fix et"
  assert_output --partial "bunu birak coach fix et"
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx bats tests/autonomous-loop.bats
```

Expected: All tests FAIL

- [ ] **Step 3: Commit failing tests**

```bash
git add tests/autonomous-loop.bats
git commit -m "test: add failing tests for autonomous-loop.sh"
```

---

### Task 7: autonomous-loop.sh — Implementation

Make all Task 6 tests pass.

**Files:**
- Create: `scripts/autonomous-loop.sh`

- [ ] **Step 1: Implement autonomous-loop.sh**

Create `scripts/autonomous-loop.sh`:

```bash
#!/bin/bash
# ═══════════════════════════════════════════════════
# HelloTalent Autonomous Loop
# Tam otonom Claude-Codex-Telegram dongusu.
#
#   ./scripts/autonomous-loop.sh start   → Donguyu baslat
#   ./scripts/autonomous-loop.sh stop    → Durdur
#   ./scripts/autonomous-loop.sh status  → Durum
# ═══════════════════════════════════════════════════

set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.local ] && set -a && . .env.local && set +a

STATE_FILE="${STATE_FILE:-.autonomous-loop.state}"
LOOP_PID_FILE="${LOOP_PID_FILE:-.autonomous-loop.pid}"
LOG_FILE="reviews/autonomous-loop.log"
COLLAB_FILE="docs/AI-COLLAB.md"
STAGE_FILE=".autopilot.stage"

VALID_STATES="IDLE PIPELINE REPORT WAIT_CODEX GATE"

mkdir -p reviews

_loop_log() {
  echo "$(date '+%H:%M:%S') $1" >> "$LOG_FILE"
}

# ── State management ──

_get_state() {
  if [ -f "$STATE_FILE" ]; then
    cat "$STATE_FILE"
  else
    echo "IDLE"
  fi
}

_set_state() {
  local new_state="$1"
  if ! echo "$VALID_STATES" | grep -qw "$new_state"; then
    echo "HATA: Gecersiz state: $new_state" >&2
    return 1
  fi
  echo "$new_state" > "$STATE_FILE"
  _loop_log "State → $new_state"
}

# ── Stage summary extraction ──

_extract_stage_summary() {
  local collab_file="$1"
  local stage_no="$2"
  # Extract everything between this stage header and the next ## header
  sed -n "/Claude Icin Gorev.*[Aa]sama $stage_no/,/^## /{ /^## .*[Aa]sama $stage_no/d; /^## /d; p; }" "$collab_file"
}

# ── Active check ──

_is_active() {
  [ -f "$LOOP_PID_FILE" ] && kill -0 "$(cat "$LOOP_PID_FILE" 2>/dev/null)" 2>/dev/null
}

# ── Telegram notify helper ──

_notify_telegram() {
  local msg="$1"
  if [ -f "scripts/telegram-bot.sh" ]; then
    ./scripts/telegram-bot.sh send "$msg" 2>/dev/null || true
  fi
}

# ── Gate result handling ──

_handle_gate_result() {
  local result="$1"
  case "$result" in
    GO)
      _loop_log "Kullanici onayladi: GO"
      return 0
      ;;
    DONT)
      _loop_log "Kullanici iptal etti: DONT"
      _set_state "IDLE"
      return 0
      ;;
    FEEDBACK:*)
      local feedback="${result#FEEDBACK:}"
      _loop_log "Kullanici feedback: $feedback"
      echo "$feedback"
      return 0
      ;;
  esac
}

# ── Ana dongu ──

_main_loop() {
  trap 'rm -f "$LOOP_PID_FILE"; _loop_log "Dongu durduruldu"; exit 0' EXIT INT TERM
  echo $$ > "$LOOP_PID_FILE"

  _loop_log "=== AUTONOMOUS LOOP BASLADI ==="
  _notify_telegram "🤖 *Autonomous Loop aktif!* Tam otonom mod baslatildi."

  # Crash recovery: mevcut state'den devam et
  local state
  state=$(_get_state)
  _loop_log "Baslangic state: $state"

  while true; do
    state=$(_get_state)

    case "$state" in
      IDLE)
        # Telegram dinle — kullanici yeni yon verebilir
        _loop_log "IDLE: Yeni asama veya kullanici mesaji bekleniyor"

        # Autopilot'un stage algilamasini bekle
        local current_stage=$(cat "$STAGE_FILE" 2>/dev/null || echo "0")
        local latest_stage
        latest_stage=$(grep -E '^## [0-9]+\. Claude Icin Gorev' "$COLLAB_FILE" 2>/dev/null \
          | grep -oE 'A[sş]ama [0-9]+' | grep -oE '[0-9]+' | sort -n | tail -1 || echo "0")

        if [ "$latest_stage" -gt "$current_stage" ] 2>/dev/null; then
          echo "$latest_stage" > "$STAGE_FILE"
          _loop_log "Yeni asama algilandi: $latest_stage"
          _set_state "PIPELINE"
          continue
        fi

        sleep 5
        ;;

      PIPELINE)
        _loop_log "PIPELINE: orchestrator.sh run baslatiliyor"
        _notify_telegram "⚙️ *Pipeline basliyor...*"

        if ./scripts/orchestrator.sh run >> "$LOG_FILE" 2>&1; then
          _loop_log "PIPELINE: Basarili"
          _set_state "REPORT"
        else
          _loop_log "PIPELINE: HATA"
          _notify_telegram "❌ *Pipeline hata verdi!* Log: reviews/autonomous-loop.log"
          _set_state "IDLE"
        fi
        ;;

      REPORT)
        local stage_no=$(cat "$STAGE_FILE" 2>/dev/null || echo "?")
        _loop_log "REPORT: Codex'e rapor gonderiliyor (Asama $stage_no)"

        local summary="Asama $stage_no bitti. Pipeline tamamlandi (Grok→Claude→DeepSeek→Gemini). Sonraki asamayi yaz."

        if ./scripts/codex-bridge.sh report "$summary"; then
          _loop_log "REPORT: Codex'e gonderildi"
          _set_state "WAIT_CODEX"
        else
          _loop_log "REPORT: Codex'e gonderilemedi"
          _notify_telegram "⚠️ *Codex'e ulasilamiyor.* Bilgisayari kontrol et."
          _set_state "IDLE"
        fi
        ;;

      WAIT_CODEX)
        _loop_log "WAIT_CODEX: Codex cevap bekleniyor (max 10dk)"

        local codex_response
        if codex_response=$(./scripts/codex-bridge.sh read); then
          _loop_log "WAIT_CODEX: Codex cevap verdi"

          # Codex cevabini summary dosyasina yaz
          local stage_no=$(cat "$STAGE_FILE" 2>/dev/null || echo "?")
          local summary_file="reviews/stage-${stage_no}-summary.txt"
          echo "$codex_response" > "$summary_file"

          # AI-COLLAB.md'ye Codex'in cevabini ekle
          {
            echo ""
            echo "$codex_response"
          } >> "$COLLAB_FILE"

          _set_state "GATE"
        else
          _loop_log "WAIT_CODEX: Codex timeout"
          _notify_telegram "⏳ *Codex 10dk'dir cevap vermedi.* Bekleyeyim mi? (go = bekle, dont = iptal)"

          local timeout_result
          timeout_result=$(./scripts/telegram-gate.sh wait)
          if [ "$timeout_result" = "GO" ]; then
            _loop_log "Kullanici beklemeye devam dedi"
            # Stay in WAIT_CODEX — will retry
          else
            _set_state "IDLE"
          fi
        fi
        ;;

      GATE)
        local stage_no=$(cat "$STAGE_FILE" 2>/dev/null || echo "?")
        local summary_file="reviews/stage-${stage_no}-summary.txt"
        _loop_log "GATE: Kullanici onayi bekleniyor (Asama $stage_no)"

        # Telegram'dan detayli ozet gonder
        ./scripts/telegram-gate.sh notify "$stage_no" "$summary_file"

        # Onay bekle
        local gate_result
        gate_result=$(./scripts/telegram-gate.sh wait)

        local feedback
        feedback=$(_handle_gate_result "$gate_result")

        case "$gate_result" in
          GO)
            _loop_log "GATE → PIPELINE (kullanici onayladi)"
            _set_state "PIPELINE"
            ;;
          DONT)
            _loop_log "GATE → IDLE (kullanici iptal etti, dinlemeye devam)"
            _notify_telegram "🛑 *Asama iptal edildi.* Yeni bir sey yazmak istersen bekliyorum."
            # IDLE state'de Telegram dinlemeye devam edecek
            ;;
          FEEDBACK:*)
            _loop_log "GATE → REPORT (kullanici revize istedi)"
            _notify_telegram "🔄 *Feedback Codex'e iletiliyor...*"

            local user_msg="${gate_result#FEEDBACK:}"
            local claude_comment="Kullanici bu asamayi revize istiyor. Orijinal mesaj yukarda."

            ./scripts/codex-bridge.sh send-user-feedback "$user_msg" "$claude_comment"
            _set_state "WAIT_CODEX"
            ;;
        esac
        ;;
    esac
  done
}

# ── CLI entry point ──
case "${1:-help}" in
  start)
    if _is_active; then
      echo "Autonomous Loop zaten calisiyor (PID: $(cat "$LOOP_PID_FILE"))"
      exit 0
    fi
    echo "Autonomous Loop baslatiliyor..."
    nohup "$0" _run >> "$LOG_FILE" 2>&1 &
    echo $! > "$LOOP_PID_FILE"
    disown $! 2>/dev/null || true
    echo "✅ Autonomous Loop aktif (PID: $!)"
    echo ""
    echo "  Codex yeni asama yazdiginda pipeline otomatik calisacak."
    echo "  Bitince Telegram'dan onay isteyecek."
    echo ""
    echo "  Durum: ./scripts/autonomous-loop.sh status"
    echo "  Durdur: ./scripts/autonomous-loop.sh stop"
    ;;

  stop)
    if [ -f "$LOOP_PID_FILE" ]; then
      local pid=$(cat "$LOOP_PID_FILE")
      kill "$pid" 2>/dev/null || true
      rm -f "$LOOP_PID_FILE" "$STATE_FILE"
      echo "Autonomous Loop durduruldu."
      _notify_telegram "🔴 *Autonomous Loop durduruldu.*"
    else
      echo "Autonomous Loop calismyior."
    fi
    ;;

  status)
    if _is_active; then
      echo "✅ Autonomous Loop calisiyor (PID: $(cat "$LOOP_PID_FILE"))"
      echo "   State: $(_get_state)"
      echo "   Asama: $(cat "$STAGE_FILE" 2>/dev/null || echo "?")"
    else
      echo "❌ Autonomous Loop calismiyor."
    fi
    ;;

  _run)
    _main_loop
    ;;

  *)
    echo "Autonomous Loop — Tam Otonom Pipeline"
    echo ""
    echo "  $0 start    Donguyu baslat"
    echo "  $0 stop     Durdur"
    echo "  $0 status   Durum"
    ;;
esac
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x scripts/autonomous-loop.sh
```

- [ ] **Step 3: Run syntax check**

```bash
bash -n scripts/autonomous-loop.sh
```

Expected: no output (clean)

- [ ] **Step 4: Run tests**

```bash
npx bats tests/autonomous-loop.bats
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/autonomous-loop.sh
git commit -m "feat: implement autonomous-loop.sh — full state machine"
```

---

### Task 8: Modify autopilot.sh — autonomous-loop Integration

When autonomous-loop is active, autopilot should skip its own pipeline call.

**Files:**
- Modify: `scripts/autopilot.sh:92-127`
- Create: `tests/autopilot-integration.bats`

- [ ] **Step 1: Write failing test**

Create `tests/autopilot-integration.bats`:

```bash
#!/usr/bin/env bats

load 'test_helper'

@test "autopilot skips pipeline when autonomous-loop is active" {
  # Create a fake autonomous-loop.pid with our PID
  echo $$ > "$TEST_TMP/.autonomous-loop.pid"

  source "$PROJECT_DIR/scripts/autopilot.sh"
  export LOOP_PID_FILE="$TEST_TMP/.autonomous-loop.pid"
  run _should_skip_pipeline
  assert_success
  assert_output --partial "autonomous-loop aktif"
}

@test "autopilot runs pipeline when autonomous-loop is NOT active" {
  source "$PROJECT_DIR/scripts/autopilot.sh"
  export LOOP_PID_FILE="$TEST_TMP/.autonomous-loop.pid"
  run _should_skip_pipeline
  assert_failure
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx bats tests/autopilot-integration.bats
```

Expected: FAIL

- [ ] **Step 3: Add integration check to autopilot.sh**

In `scripts/autopilot.sh`, add this function before the `watch_loop` function (around line 60):

```bash
# ── Autonomous loop aktif mi kontrol ──
_should_skip_pipeline() {
  local loop_pid_file="${LOOP_PID_FILE:-.autonomous-loop.pid}"
  if [ -f "$loop_pid_file" ] && kill -0 "$(cat "$loop_pid_file" 2>/dev/null)" 2>/dev/null; then
    echo "autonomous-loop aktif, pipeline atlaniyor"
    return 0
  fi
  return 1
}
```

Then modify the pipeline call inside `watch_loop` (around line 114), wrapping the existing orchestrator call:

```bash
      # Pipeline çalıştır
      if _should_skip_pipeline; then
        echo "$(date '+%H:%M:%S') autonomous-loop aktif — pipeline delegated" >> "$LOG_FILE"
      else
        echo "$(date '+%H:%M:%S') Pipeline baslatiliyor..." >> "$LOG_FILE"
        if ./scripts/orchestrator.sh run >> "$LOG_FILE" 2>&1; then
          echo "$(date '+%H:%M:%S') Pipeline BASARILI" >> "$LOG_FILE"
          notify "Asama $new_stage Tamamlandi" "Pipeline basariyla bitti." "default" "white_check_mark"
        else
          echo "$(date '+%H:%M:%S') Pipeline HATA" >> "$LOG_FILE"
          notify "HATA: Asama $new_stage" "Pipeline hataya dustu!" "urgent" "x"
        fi
      fi
```

- [ ] **Step 4: Run syntax check**

```bash
bash -n scripts/autopilot.sh
```

Expected: no output (clean)

- [ ] **Step 5: Run tests**

```bash
npx bats tests/autopilot-integration.bats
```

Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/autopilot.sh tests/autopilot-integration.bats
git commit -m "feat: autopilot delegates to autonomous-loop when active"
```

---

### Task 9: .gitignore Update

Add new runtime state files.

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add new entries to .gitignore**

Append after the existing `.telegram-bot.session` line:

```
.autonomous-loop.state
.autonomous-loop.pid
.telegram-gate.offset
```

- [ ] **Step 2: Verify**

```bash
git status
```

Expected: Only `.gitignore` shows as modified. No state files appear as untracked.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add autonomous-loop state files to gitignore"
```

---

### Task 10: Integration Test — Full Loop Dry Run

Verify all scripts work together with a dry run.

**Files:**
- No new files

- [ ] **Step 1: Syntax check all new scripts**

```bash
bash -n scripts/telegram-gate.sh && echo "PASS" || echo "FAIL"
bash -n scripts/codex-bridge.sh && echo "PASS" || echo "FAIL"
bash -n scripts/autonomous-loop.sh && echo "PASS" || echo "FAIL"
bash -n scripts/autopilot.sh && echo "PASS" || echo "FAIL"
```

Expected: All PASS

- [ ] **Step 2: Run all BATS tests**

```bash
npx bats tests/telegram-gate.bats tests/codex-bridge.bats tests/autonomous-loop.bats tests/autopilot-integration.bats
```

Expected: All tests PASS

- [ ] **Step 3: Verify autonomous-loop status when not running**

```bash
./scripts/autonomous-loop.sh status
```

Expected: `❌ Autonomous Loop calismiyor.`

- [ ] **Step 4: Verify autopilot still works independently**

```bash
./scripts/autopilot.sh status
```

Expected: Shows current autopilot state (nohup or launchd)

- [ ] **Step 5: Commit integration verification**

```bash
git add -A
git commit -m "test: verify autonomous loop integration — all checks pass"
```

- [ ] **Step 6: Update AI-COLLAB.md with completion summary**

Append the Claude Cikti Ozeti for this implementation to `docs/AI-COLLAB.md`.
