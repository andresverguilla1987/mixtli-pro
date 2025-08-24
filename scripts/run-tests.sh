#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if ! command -v newman >/dev/null 2>&1; then
  echo "Installing newman..."
  npm i -g newman >/dev/null
fi

echo "Running Postman smoke tests..."
newman run "$ROOT_DIR/postman/mixtli-api-prod.postman_collection.json"   -e "$ROOT_DIR/postman/mixtli-prod.postman_environment.json"   --reporters cli,junit   --reporter-junit-export "$ROOT_DIR/newman-report.xml"

echo "Done. Report at newman-report.xml"
