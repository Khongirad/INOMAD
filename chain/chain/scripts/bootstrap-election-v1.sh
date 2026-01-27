#!/usr/bin/env bash
set -euo pipefail

: "${RPC_URL:?RPC_URL is required}"
: "${PRIVATE_KEY:?PRIVATE_KEY is required}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ADDRS="${1:-chain/addresses-citizen.json}"

OWNER="$(cast wallet address --private-key "$PRIVATE_KEY")"
CREATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "[election] root=$ROOT"
echo "[election] owner=$OWNER"
echo "[election] addrs=$ADDRS"

deploy_contract() {
  local contract_path="$1"
  shift

  echo "[election] deploying $contract_path ..." >&2

  local out addr
  out="$(forge create "$contract_path" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    "$@")"

  addr="$(printf '%s\n' "$out" | awk -F': ' '/Deployed to:/ {print $2}' | tail -n1)"
  if [[ -z "$addr" || "$addr" != 0x* ]]; then
    echo "[election] failed to parse deployed address" >&2
    echo "$out" >&2
    exit 1
  fi
  echo "$addr"
}

ELECTION_REGISTRY_ADDRESS="$(deploy_contract "chain/contracts/ElectionRegistry.sol:ElectionRegistry" --constructor-args "$OWNER")"
echo "[election] ElectionRegistry deployed: $ELECTION_REGISTRY_ADDRESS"

# merge into addresses json
tmp="$(mktemp)"
jq --arg electionRegistry "$ELECTION_REGISTRY_ADDRESS" \
   --arg createdAt "$CREATED_AT" \
   '.contracts.ElectionRegistry = $electionRegistry
    | .meta.electionBootstrapAt = $createdAt' \
   "$ADDRS" > "$tmp"
mv "$tmp" "$ADDRS"

echo "[election] wrote $ADDRS"
echo "[election] bootstrap done"
