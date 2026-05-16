#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════
# transcribe-watcher.sh — Audio inbox watcher daemon
# Reform 16 May 2026 — launchd tarafından her dakika çağrılır
#
# Logic:
#   1. Lock file ile concurrent run prevention
#   2. ~/Downloads/audio-inbox/*.{m4a,mp3,wav,aac} glob
#   3. Her dosya için transcribe-audio.sh çağır
#   4. Başarılı → processed/ altına move
#   5. Hata → .errors/ altına move + log
#
# Log: ~/Library/Logs/audio-transcriber.log
# Bypass: WATCHER_SKIP=1
# ════════════════════════════════════════════════════════════════════

set -e

if [ "${WATCHER_SKIP:-}" = "1" ]; then
  exit 0
fi

# Self-locate
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TRANSCRIBE="$SCRIPT_DIR/transcribe-audio.sh"

INBOX="$HOME/Downloads/audio-inbox"
PROCESSED="$INBOX/processed"
ERRORS="$INBOX/.errors"
OUTPUT="$HOME/Downloads/audio-transcripts"
LOG="$HOME/Library/Logs/audio-transcriber.log"
LOCK="/tmp/audio-transcriber.lock"

mkdir -p "$INBOX" "$PROCESSED" "$ERRORS" "$OUTPUT" "$(dirname "$LOG")"

# Lock acquire
if [ -f "$LOCK" ]; then
  LOCK_AGE_SEC=$(( $(date +%s) - $(stat -f %m "$LOCK" 2>/dev/null || stat -c %Y "$LOCK") ))
  if [ "$LOCK_AGE_SEC" -lt 1800 ]; then
    # Active lock, başka watcher çalışıyor — sessizce çık
    exit 0
  else
    # Stale lock (30 dk), temizle
    rm -f "$LOCK"
  fi
fi
echo "$$" > "$LOCK"
trap "rm -f $LOCK" EXIT

# Timestamp helper
ts() { date +"%Y-%m-%d %H:%M:%S"; }

# Glob audio files (m4a, mp3, wav, aac)
shopt -s nullglob
AUDIO_FILES=("$INBOX"/*.m4a "$INBOX"/*.mp3 "$INBOX"/*.wav "$INBOX"/*.aac "$INBOX"/*.M4A "$INBOX"/*.MP3)
shopt -u nullglob

if [ "${#AUDIO_FILES[@]}" -eq 0 ]; then
  # Sessizce çık (her dakika tetikleniyor, gürültü yapma)
  exit 0
fi

echo "[$(ts)] Watcher start — ${#AUDIO_FILES[@]} file pending" >> "$LOG"

for AUDIO in "${AUDIO_FILES[@]}"; do
  NAME=$(basename "$AUDIO")
  echo "[$(ts)]   → $NAME" >> "$LOG"

  if TRANSCRIPT=$(bash "$TRANSCRIBE" "$AUDIO" "$OUTPUT" 2>>"$LOG"); then
    # Başarılı — orig dosyayı processed/ altına move
    mv "$AUDIO" "$PROCESSED/" 2>>"$LOG"
    echo "[$(ts)]     ✓ Transcript: $TRANSCRIPT" >> "$LOG"
  else
    # Hata — .errors/ altına move
    mv "$AUDIO" "$ERRORS/" 2>>"$LOG"
    echo "[$(ts)]     ✗ FAIL: moved to .errors/" >> "$LOG"
  fi
done

echo "[$(ts)] Watcher done" >> "$LOG"

exit 0
