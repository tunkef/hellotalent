#!/bin/bash
# Aider — Git-native AI commit assistant
# Her değişikliği otomatik anlamlı commit mesajıyla kaydeder
# Kullanım:
#   ./scripts/aider-commit.sh "bu dosyadaki X'i düzelt" profil-cv.js
#   ./scripts/aider-commit.sh "test ekle" profil-studio.js tests/p3.regression.spec.js

set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env.local ] && set -a && . .env.local && set +a

PROMPT="${1:?Kullanim: $0 \"gorev\" dosya1 [dosya2...]}"
shift
FILES="$@"

if [ -z "$FILES" ]; then
  echo "En az bir dosya belirtin."
  exit 1
fi

aider \
  --model "deepseek/deepseek-chat" \
  --api-key "deepseek=$DEEPSEEK_API_KEY" \
  --auto-commits \
  --no-auto-lint \
  --message "$PROMPT" \
  $FILES
