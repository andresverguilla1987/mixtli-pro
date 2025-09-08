#!/usr/bin/env bash
set -euo pipefail

PUBLIC_URL="${PUBLIC_URL:-https://mixtli-pro.onrender.com}"

echo "→ Semilla mínima de usuarios (3)"
for i in 1 2 3; do
  curl -s -X POST "$PUBLIC_URL/api/users" -H "Content-Type: application/json" -d '{}' >/dev/null || true
done
echo "OK"
