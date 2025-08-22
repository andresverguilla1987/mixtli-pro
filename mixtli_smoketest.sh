#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-${BASE_URL:-}}"

if [[ -z "${BASE_URL}" ]]; then
  echo "❌ Debes pasar la URL base: ./mixtli_smoketest.sh https://mixtli-pro.onrender.com"
  exit 1
fi

ADMIN_EMAIL="admin@mixtli.local"
ADMIN_PASS="Admin123*"

echo "🏁 Smoke test contra: $BASE_URL"

# Salud
curl -fsSL "$BASE_URL/salud" || { echo "❌ /salud fallo"; exit 1; }
echo "✅ /salud OK"

# Login
LOGIN_RES=$(curl -s -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d "{"email":"$ADMIN_EMAIL","password":"$ADMIN_PASS"}")
TOKEN=$(echo "$LOGIN_RES" | grep -oE '"token":"[^"]+' | cut -d'"' -f3)

if [[ -z "$TOKEN" ]]; then
  echo "❌ No se obtuvo token"
  echo "$LOGIN_RES"
  exit 1
fi
echo "✅ Login OK"

# Users (list)
curl -fsSL -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/users" >/dev/null || { echo "❌ /api/users fallo"; exit 1; }
echo "✅ /api/users OK"
