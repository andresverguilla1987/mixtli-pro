#!/usr/bin/env bash
set -euo pipefail

COLLECTION="${1:-cartero/mixtli-api-prod.postman_collection.json}"
ENV_FILE="${2:-cartero/mixtli-prod.postman_environment.json}"
REPORT_DIR="${3:-reports}"

mkdir -p "$REPORT_DIR"

echo "Running Newman:"
echo " - Collection: $COLLECTION"
echo " - Env:        $ENV_FILE"
echo " - Reports:    $REPORT_DIR"

newman run "$COLLECTION"   -e "$ENV_FILE"   --reporters cli,htmlextra,json   --reporter-htmlextra-export "$REPORT_DIR/newman-report.html"   --reporter-json-export "$REPORT_DIR/newman-report.json"   --timeout-request 20000   --insecure

echo "Newman finished ✅"
