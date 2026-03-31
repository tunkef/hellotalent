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
