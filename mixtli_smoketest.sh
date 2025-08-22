
#!/usr/bin/env bash
set -e

BASE_URL="${1:-https://mixtli-pro.onrender.com}"
echo "Smoke test contra: $BASE_URL"

curl -fsSL "$BASE_URL/salud"
echo
