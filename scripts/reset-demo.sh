#!/usr/bin/env bash
set -euo pipefail

PUBLIC_URL="${PUBLIC_URL:-https://mixtli-pro.onrender.com}"
echo "→ Reset demo (delete genérico)"
curl -s -X DELETE "$PUBLIC_URL/api/users/" || true
echo
