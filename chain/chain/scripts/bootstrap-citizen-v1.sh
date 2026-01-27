#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_JSON="${OUT_JSON:-$ROOT_DIR/chain/addresses-citizen.json}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1" >&2; exit 1; }; }
need jq
need forge
need cast

: "${RPC_URL:?RPC_URL is required}"
: "${PRIVATE_KEY:?PRIVATE_KEY is required}"

OWNER="${OWNER:-$(cast wallet address --private-key "$PRIVATE_KEY")}"
CREATED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "[citizen] root=$ROOT_DIR"
echo "[citizen] owner=$OWNER"
echo "[citizen] out=$OUT_JSON"

mkdir -p "$(dirname "$OUT_JSON")"

deploy_contract() {
  local contract_path="$1"
  shift
  local ctor_args=("$@")

  echo "[citizen] deploying $contract_path ..." >&2
  local out addr
  out="$(forge create "$contract_path" --broadcast \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --constructor-args "${ctor_args[@]}" \
    2>&1)"

  addr="$(echo "$out" | grep -Eo 'Deployed to: 0x[a-fA-F0-9]{40}' | awk '{print $3}' | tail -n1)"
  if [[ -z "${addr:-}" ]]; then
    echo "$out" >&2
    echo "Failed to parse deployed address for $contract_path" >&2
    exit 1
  fi
  echo "$addr"
}

write_json() {
  local seat_sbt="$1" activation="$2" arban="$3"
  local chain_id
  chain_id="$(cast chain-id --rpc-url "$RPC_URL")"

  jq -n \
    --arg chainId "$chain_id" \
    --arg rpc "$RPC_URL" \
    --arg owner "$OWNER" \
    --arg seatSbt "$seat_sbt" \
    --arg activation "$activation" \
    --arg arbanRegistry "$arban" \
    --arg createdAt "$CREATED_AT" \
    '{
      chainId: ($chainId|tonumber),
      rpcUrl: $rpc,
      owner: $owner,
      contracts: {
        SeatSBT: $seatSbt,
        CitizenActivation: $activation,
        ArbanRegistry: $arbanRegistry
      },
      createdAt: $createdAt
    }' > "$OUT_JSON"

  echo "[citizen] wrote $OUT_JSON"
}

SEAT_SBT_ADDRESS="${SEAT_SBT_ADDRESS:-}"
if [[ -n "$SEAT_SBT_ADDRESS" ]]; then
  echo "[citizen] using existing SeatSBT=$SEAT_SBT_ADDRESS"
else
  # NOTE: adjust this constructor line to your SeatSBT signature if needed
  SEAT_SBT_ADDRESS="$(deploy_contract "chain/contracts/SeatSBT.sol:SeatSBT" "$OWNER")"
  echo "[citizen] SeatSBT deployed: $SEAT_SBT_ADDRESS"
fi

REQUIRED_ATTESTATIONS="${REQUIRED_ATTESTATIONS:-2}"
CITIZEN_ACTIVATION_ADDRESS="$(deploy_contract "chain/contracts/CitizenActivation.sol:CitizenActivation" \
  "$SEAT_SBT_ADDRESS" "$OWNER" "$REQUIRED_ATTESTATIONS")"
echo "[citizen] CitizenActivation deployed: $CITIZEN_ACTIVATION_ADDRESS"

ARBAN_REGISTRY_ADDRESS="$(deploy_contract "chain/contracts/ArbanRegistry.sol:ArbanRegistry" \
  "$SEAT_SBT_ADDRESS" "$CITIZEN_ACTIVATION_ADDRESS" "$OWNER")"
echo "[citizen] ArbanRegistry deployed: $ARBAN_REGISTRY_ADDRESS"

write_json "$SEAT_SBT_ADDRESS" "$CITIZEN_ACTIVATION_ADDRESS" "$ARBAN_REGISTRY_ADDRESS"
echo "[citizen] bootstrap done"
