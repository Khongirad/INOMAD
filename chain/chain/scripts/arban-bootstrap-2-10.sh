#!/usr/bin/env bash
set -euo pipefail

: "${RPC_URL:?RPC_URL is required}"
: "${PRIVATE_KEY:?PRIVATE_KEY is required}"

ADDRS="${1:-chain/addresses-citizen.json}"
ARB="$(jq -r .contracts.ArbanRegistry "$ADDRS")"
ACT="$(jq -r .contracts.CitizenActivation "$ADDRS")"

if [[ -z "$ARB" || "$ARB" == "null" ]]; then echo "missing ArbanRegistry in $ADDRS" >&2; exit 1; fi
if [[ -z "$ACT" || "$ACT" == "null" ]]; then echo "missing CitizenActivation in $ADDRS" >&2; exit 1; fi

echo "[arbans] ArbanRegistry=$ARB"

for arbanId in $(seq 2 10); do
  if cast call "$ARB" "getSeats(uint32)(uint256[10])" "$arbanId" --rpc-url "$RPC_URL" >/dev/null 2>&1; then
    echo "[arbans] arbanId=$arbanId exists"
    continue
  fi

  startSeat=$(( (arbanId - 1) * 10 + 1 ))

  # sanity: all seats active
  for k in $(seq 0 9); do
    seatId=$((startSeat + k))
    ok=$(cast call "$ACT" "isActive(uint256)(bool)" "$seatId" --rpc-url "$RPC_URL")
    if [[ "$ok" != "true" ]]; then
      echo "[arbans] seat $seatId not active -> abort" >&2
      exit 1
    fi
  done

  seats_json="["
  for k in $(seq 0 9); do
    seatId=$((startSeat + k))
    seats_json+="$seatId"
    [[ "$k" == "9" ]] || seats_json+=","
  done
  seats_json+="]"

  echo "[arbans] create arbanId=$arbanId seats=$seats_json leaderSeat=$startSeat"
  cast send "$ARB" "createArban(uint256[10])(uint32)" "$seats_json" \
    --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --gas-limit 2500000 >/dev/null

  cast send "$ARB" "setLeader(uint32,uint256)" "$arbanId" "$startSeat" \
    --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --gas-limit 500000 >/dev/null
done

echo "[arbans] done"
