#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# transcribe-audio.sh — Whisper local transcription
# Reform 16 May 2026 — Audio pipeline (Tuna ses notu → text)
#
# Usage:
#   bash scripts/transcribe-audio.sh <audio-path> [output-dir]
#
# Output: transcript .txt path stdout'a yazılır
# Bypass: TRANSCRIBE_SKIP=1
#
# Model: medium (769M, en iyi Türkçe)
# Language: Turkish (force, auto-detect bypass)
# Backend: openai-whisper local (~/.venv_whisper)
# ════════════════════════════════════════════════════════════════════

set -e

if [ "${TRANSCRIBE_SKIP:-}" = "1" ]; then
  exit 0
fi

# Self-locate
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Args
AUDIO="${1:-}"
OUTPUT_DIR="${2:-$HOME/Downloads/audio-transcripts}"

if [ -z "$AUDIO" ]; then
  echo "Usage: $0 <audio-path> [output-dir]" >&2
  exit 1
fi

if [ ! -f "$AUDIO" ]; then
  echo "[transcribe-audio] Error: audio file not found: $AUDIO" >&2
  exit 1
fi

# Whisper venv check
WHISPER_BIN="$HOME/.venv_whisper/bin/whisper"
if [ ! -x "$WHISPER_BIN" ]; then
  echo "[transcribe-audio] Error: whisper venv not found. Run: python3.12 -m venv ~/.venv_whisper && ~/.venv_whisper/bin/pip install openai-whisper" >&2
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Naming: YYYY-MM-DD-HHMMSS-<sanitized-basename>.txt
TS=$(date +"%Y-%m-%d-%H%M%S")
BASE=$(basename "$AUDIO" | sed 's/\.[^.]*$//' | tr -c '[:alnum:]._-' '-' | sed 's/--*/-/g')
OUTPUT_BASE="${TS}-${BASE}"

# Whisper transcribe (medium, Turkish, txt format)
# Whisper writes to OUTPUT_DIR with same basename as input + .txt extension
# We rename after to add timestamp
echo "[transcribe-audio] Starting transcription: $(basename "$AUDIO") (medium model, Turkish)..." >&2

TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

"$WHISPER_BIN" "$AUDIO" \
  --model medium \
  --language Turkish \
  --output_format txt \
  --output_dir "$TMP_DIR" \
  --verbose False 2>&1 | tail -5 >&2

# Whisper output: <TMP_DIR>/<orig-basename-without-ext>.txt
ORIG_NAME=$(basename "$AUDIO" | sed 's/\.[^.]*$//')
TMP_TXT="$TMP_DIR/${ORIG_NAME}.txt"

if [ ! -f "$TMP_TXT" ]; then
  echo "[transcribe-audio] Error: whisper output not found at $TMP_TXT" >&2
  exit 1
fi

# Move + rename to output dir with timestamp prefix
FINAL_TXT="$OUTPUT_DIR/${OUTPUT_BASE}.txt"
mv "$TMP_TXT" "$FINAL_TXT"

echo "[transcribe-audio] ✓ Done: $FINAL_TXT" >&2
echo "$FINAL_TXT"

exit 0
