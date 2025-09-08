#!/usr/bin/env bash
# Usage: ./scripts/notify-slack.sh "message text"
set -euo pipefail
if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
  echo "SLACK_WEBHOOK_URL not set"
  exit 1
fi
msg=${1:-"Ping"}
payload=$(jq -n --arg text "$msg" '{text:$text}')
curl -s -X POST -H 'Content-type: application/json' --data "$payload" "$SLACK_WEBHOOK_URL" >/dev/null
