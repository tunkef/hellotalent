# Audio Transcription Pipeline

> Tuna ses notlarını otomatik metin'e çevirir. Tamamen local (Whisper medium model, Türkçe optimize).

## Workflow

```
[Notes/Voice Memo ses kaydı]
        ↓ (Tuna manuel copy)
~/Downloads/audio-inbox/
        ↓ (launchd watcher her 60sn kontrol)
[transcribe-watcher.sh]
        ↓
~/Downloads/audio-transcripts/YYYY-MM-DD-HHMMSS-<name>.txt
[orig → audio-inbox/processed/]
```

## Tuna kullanım

### Otomatik (önerilen)

```bash
# 1. Ses notunu inbox'a kopyala
cp "~/Library/Containers/com.apple.Notes/.../Yeni Kayıt.m4a" ~/Downloads/audio-inbox/

# 2. 60-120 saniye bekle (launchd interval)

# 3. Transcript hazır
ls ~/Downloads/audio-transcripts/
cat ~/Downloads/audio-transcripts/2026-05-16-HHMMSS-Yeni-Kayit.txt
```

### Manuel (hızlı)

```bash
bash ~/Downloads/Hellotalent/scripts/transcribe-audio.sh "<audio-path>"
```

## Setup (bir kerelik)

Halihazırda kuruludur. Yeniden setup için:

```bash
# 1. Python 3.12 venv
/opt/homebrew/bin/python3.12 -m venv ~/.venv_whisper
~/.venv_whisper/bin/pip install --upgrade pip
~/.venv_whisper/bin/pip install openai-whisper

# 2. Klasörler
mkdir -p ~/Downloads/audio-inbox/processed ~/Downloads/audio-inbox/.errors ~/Downloads/audio-transcripts

# 3. launchd job
launchctl load ~/Library/LaunchAgents/com.hellotalent.audio-transcriber.plist

# 4. Test (ilk run model download ~769MB)
bash scripts/transcribe-audio.sh path/to/test.m4a
```

## Yapı

| Path | Görev |
|------|-------|
| `~/.venv_whisper/` | Python 3.12 + openai-whisper venv |
| `~/Downloads/audio-inbox/` | Tuna .m4a/.mp3/.wav buraya bırakır |
| `~/Downloads/audio-inbox/processed/` | Başarılı transcribe sonrası orig |
| `~/Downloads/audio-inbox/.errors/` | Hata durumunda orig |
| `~/Downloads/audio-transcripts/` | .txt çıktılar (timestamped) |
| `scripts/transcribe-audio.sh` | Tek dosya transcribe helper |
| `scripts/transcribe-watcher.sh` | Watcher daemon (launchd çağırır) |
| `~/Library/LaunchAgents/com.hellotalent.audio-transcriber.plist` | Her 60sn tetikleyen cron |
| `~/Library/Logs/audio-transcriber.log` | Aktivite log |

## Model

- **medium** (769MB) — Türkçe için optimal
- İlk run sırasında otomatik download (~/.cache/whisper/)
- Performance: M1/M2'de ~60 sn per 1 dk ses

Değiştirmek için: `scripts/transcribe-audio.sh` → `--model medium` satırını `small` (244M, hızlı) veya `large-v3` (1.5GB, premium) yap.

## Troubleshooting

### Watcher çalışmıyor

```bash
# Status
launchctl list | grep audio-transcriber

# Log
tail -50 ~/Library/Logs/audio-transcriber.log

# Restart
launchctl unload ~/Library/LaunchAgents/com.hellotalent.audio-transcriber.plist
launchctl load ~/Library/LaunchAgents/com.hellotalent.audio-transcriber.plist
```

### Stale lock

```bash
rm -f /tmp/audio-transcriber.lock
```

### Whisper hatası

```bash
~/.venv_whisper/bin/whisper --help    # binary kontrol
~/.venv_whisper/bin/pip install --upgrade openai-whisper
```

### Disk

```bash
du -sh ~/.cache/whisper ~/Downloads/audio-transcripts
```

## Privacy

- 100% local — hiçbir API call, OpenAI cloud kullanılmaz
- Audio + transcript hiçbir 3rd party'ye gönderilmez
- ~/.cache/whisper sadece model weights (download)

## Bypass

```bash
TRANSCRIBE_SKIP=1 bash scripts/transcribe-audio.sh ...    # script no-op
WATCHER_SKIP=1 bash scripts/transcribe-watcher.sh         # watcher no-op
```

## Out of scope

- Real-time mic transcription
- Voice → bash komut
- Speaker diarization
- HelloTalent UI entegrasyonu (CV upload vs)
