#!/usr/bin/env bats

load 'test_helper'

# ── notify tests ──

@test "notify sends formatted Telegram message with stage number" {
  cat > "$TEST_TMP/stage-summary.txt" <<'EOF'
Tema: Iyzico odeme entegrasyonu
Dosyalar: payment.js (yeni), profil-premium.js (guncelleme)
Codex notu: MVP icin tek seferlik odeme yeterli
Risk: Sandbox key gerekli
EOF

  curl() {
    echo "$@" >> "$TEST_TMP/curl-calls.log"
    echo '{"ok":true}'
  }
  export -f curl

  source "$PROJECT_DIR/scripts/telegram-gate.sh"
  _notify 23 "$TEST_TMP/stage-summary.txt"

  assert [ -f "$TEST_TMP/curl-calls.log" ]
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
  assert_output --partial "go"
  assert_output --partial "dont"
}

# ── wait tests ──

@test "wait returns GO when user sends go" {
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
        echo '{"ok":true,"result":[{"update_id":1004,"message":{"chat":{"id":999999},"text":"go"}}]}'
      else
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

# ── Fix #1: telegram-bot.sh should not reply "bilinmeyen komut" for gate commands ──
# (tested via telegram-bot behavior, not telegram-gate)

# ── Fix #9: parse_mode=Markdown ──

@test "send includes parse_mode=Markdown parameter" {
  curl() {
    echo "$@" >> "$TEST_TMP/curl-args.log"
    echo '{"ok":true}'
  }
  export -f curl

  source "$PROJECT_DIR/scripts/telegram-gate.sh"
  _send "test *bold* message"

  run grep "parse_mode" "$TEST_TMP/curl-args.log"
  assert_success
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
