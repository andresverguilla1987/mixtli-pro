#!/usr/bin/env bash
set -e
BASE_URL=${BASE_URL:-http://localhost:10000}
echo "Hit /salud ..."
curl -s -D - "$BASE_URL/salud" | sed -n '1,10p'
echo
echo "Hit /metrics (first lines) ..."
curl -s "$BASE_URL/metrics" | head -n 30
