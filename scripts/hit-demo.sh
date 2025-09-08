#!/usr/bin/env bash
set -euo pipefail

PUBLIC_URL="${PUBLIC_URL:-https://mixtli-pro.onrender.com}"
echo "→ Smoke (HEAD /)"
curl -s -D- -o /dev/null "$PUBLIC_URL/" | head -n 1 || true

echo "→ Salud"
curl -s "$PUBLIC_URL/salud"; echo

echo "→ GET /api/users"
curl -s "$PUBLIC_URL/api/users"; echo

echo "→ POST /api/users"
curl -s -X POST "$PUBLIC_URL/api/users" -H "Content-Type: application/json" -d '{}' ; echo

echo "→ PUT /api/users/"
curl -s -X PUT "$PUBLIC_URL/api/users/" -H "Content-Type: application/json" -d '{"name":"Demo Update"}'; echo

echo "→ DELETE /api/users/"
curl -s -X DELETE "$PUBLIC_URL/api/users/"; echo
