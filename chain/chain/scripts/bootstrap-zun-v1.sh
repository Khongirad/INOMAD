#!/usr/bin/env bash
set -euo pipefail

: "${RPC_URL:?RPC_URL is required}"
: "${PRIVATE_KEY:?PRIVATE_KEY is required}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ADDRS="${1:-chain/addresses-citizen.json}"

OWNER="$(cast wallet address --private-key "$PRIVATE_KEY")"
CREATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "[zun] root=$ROOT"
echo "[zun] owner=$OWNER"
echo "[zun] addrs=$ADDRS"

ARBAN="$(jq -r .contracts.ArbanRegistry "$ADDRS")"
if [[ -z "$ARBAN" || "$ARBAN" == "null" ]]; then
  echo "[zun] missing .contracts.ArbanRegistry in $ADDRS" >&2
  exit 1
fi
echo "[zun] ArbanRegistry=$ARBAN"

deploy_contract() {
  local contract_path="$1"
  shift

  echo "[zun] deploying $contract_path ..." >&2
  local out addr
  out="$(forge create "$contract_path" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    "$@")"

  addr="$(printf '%s\n' "$out" | awk -F': ' '/Deployed to:/ {print $2}' | tail -n1)"
  if [[ -z "$addr" || "$addr" != 0x* ]]; then
    echo "[zun] failed to parse deployed address" >&2
    echo "$out" >&2
    exit 1
  fi
  echo "$addr"
}

ZUN_REGISTRY_ADDRESS="$(deploy_contract "chain/contracts/ZunRegistry.sol:ZunRegistry" --constructor-args "$ARBAN" "$OWNER")"
echo "[zun] ZunRegistry deployed: $ZUN_REGISTRY_ADDRESS"

tmp="$(mktemp)"
jq --arg zunRegistry "$ZUN_REGISTRY_ADDRESS" \
   --arg createdAt "$CREATED_AT" \
   '.contracts.ZunRegistry = $zunRegistry
    | .meta.zunBootstrapAt = $createdAt' \
   "$ADDRS" > "$tmp"
mv "$tmp" "$ADDRS"

echo "[zun] wrote $ADDRS"
echo "[zun] bootstrap done"
