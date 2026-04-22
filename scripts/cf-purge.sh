#!/usr/bin/env bash
# Cloudflare cache purge — infra-ops agent
# Usage: bash scripts/cf-purge.sh [--purge-everything | --paths "url1,url2"]

set -e

# Read config from .env.local (gitignored)
if [ -f ~/Downloads/Hellotalent/.env.local ]; then
  source ~/Downloads/Hellotalent/.env.local
fi

if [ -z "$CF_ZONE_ID" ] || [ -z "$CF_API_TOKEN" ]; then
  echo "[cf-purge] ERROR: CF_ZONE_ID or CF_API_TOKEN missing from .env.local"
  echo "[cf-purge] Setup: echo 'CF_ZONE_ID=xxx' >> .env.local && echo 'CF_API_TOKEN=yyy' >> .env.local"
  exit 1
fi

MODE="${1:---purge-everything}"

case $MODE in
  --purge-everything)
    DATA='{"purge_everything":true}'
    ;;
  --paths)
    shift
    PATHS="$1"
    # Convert comma-separated to JSON array
    DATA=$(python3 -c "import json, sys; paths = sys.argv[1].split(','); print(json.dumps({'files': [p.strip() for p in paths]}))" "$PATHS")
    ;;
  *)
    echo "[cf-purge] Usage: $0 [--purge-everything | --paths 'url1,url2']"
    exit 1
    ;;
esac

echo "[cf-purge] Purging with: $DATA"

RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data "$DATA")

SUCCESS=$(echo "$RESPONSE" | python3 -c "import json, sys; print(json.load(sys.stdin).get('success', False))")

if [ "$SUCCESS" = "True" ]; then
  echo "[cf-purge] SUCCESS"
  exit 0
else
  echo "[cf-purge] FAIL: $RESPONSE"
  exit 1
fi
