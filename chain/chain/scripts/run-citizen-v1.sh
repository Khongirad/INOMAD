#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ADDR_JSON="${ADDR_JSON:-$ROOT_DIR/chain/addresses-citizen.json}"

: "${RPC_URL:?RPC_URL is required}"
: "${PRIVATE_KEY:?PRIVATE_KEY is required}"

if [[ ! -f "$ADDR_JSON" ]]; then
  echo "[citizen] bootstrapping..."
  "$ROOT_DIR/chain/scripts/bootstrap-citizen-v1.sh"
else
  echo "[citizen] addresses found: $ADDR_JSON"
fi

echo "[citizen] smoke..."
node "$ROOT_DIR/chain/scripts/smoke-citizen-v1.js" "$ADDR_JSON"
echo "[citizen] done"
