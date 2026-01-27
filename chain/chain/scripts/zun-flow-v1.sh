#!/usr/bin/env bash
set -euo pipefail

: "${RPC_URL:?RPC_URL is required}"
: "${PRIVATE_KEY:?PRIVATE_KEY is required}"

ADDRS="${1:-chain/addresses-citizen.json}"

ARB="$(jq -r .contracts.ArbanRegistry "$ADDRS")"
ZUN="$(jq -r .contracts.ZunRegistry "$ADDRS")"

if [[ -z "$ARB" || "$ARB" == "null" ]]; then echo "missing ArbanRegistry in $ADDRS" >&2; exit 1; fi
if [[ -z "$ZUN" || "$ZUN" == "null" ]]; then echo "missing ZunRegistry in $ADDRS" >&2; exit 1; fi

echo "[zun-flow] ArbanRegistry=$ARB"
echo "[zun-flow] ZunRegistry=$ZUN"

# params
ZUN_ID="${ZUN_ID:-1}"
LEADER_SEAT_ID="${LEADER_SEAT_ID:-1}"   # must be leader seatId of one of member arbans
AUTO_CREATE_ARBANS="${AUTO_CREATE_ARBANS:-1}"  # 1/0

# helper: create arban i with seats range [start..start+9] if not exist (best-effort)
ensure_arban() {
  local arban_id="$1"
  local start_seat="$2"

  # try getSeats: if succeeds -> exists
  if cast call "$ARB" "getSeats(uint32)(uint256[10])" "$arban_id" --rpc-url "$RPC_URL" >/dev/null 2>&1; then
    echo "[zun-flow] arbanId=$arban_id exists"
    return 0
  fi

  if [[ "$AUTO_CREATE_ARBANS" != "1" ]]; then
    echo "[zun-flow] arbanId=$arban_id missing, AUTO_CREATE_ARBANS=0" >&2
    exit 1
  fi

  # build seats array JSON: [start..start+9]
  local seats_json="["
  local k
  for k in $(seq 0 9); do
    seats_json+="$((start_seat + k))"
    [[ "$k" == "9" ]] || seats_json+=","
  done
  seats_json+="]"

  echo "[zun-flow] creating arbanId=$arban_id seats=$seats_json"
  cast send "$ARB" "createArban(uint256[10])(uint32)" "$seats_json" \
    --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --gas-limit 2500000 >/dev/null

  # set leader as first seat of that arban
  cast send "$ARB" "setLeader(uint32,uint256)" "$arban_id" "$start_seat" \
    --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --gas-limit 500000 >/dev/null

  echo "[zun-flow] arbanId=$arban_id created + leaderSeatId=$start_seat"
}

echo "[zun-flow] ensure 10 arbans (1..10) exist (each 10 seats)..."
# arban1 -> seats 1..10, arban2 -> 11..20 ... arban10 -> 91..100
for i in $(seq 1 10); do
  ensure_arban "$i" "$(((i-1)*10 + 1))"
done

echo "[zun-flow] create Zun (zunId=$ZUN_ID) from arbanIds [1..10]..."
ARBANS_JSON="[1,2,3,4,5,6,7,8,9,10]"
cast send "$ZUN" "createZun(uint32[10])(uint32)" "$ARBANS_JSON" \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --gas-limit 2500000 >/dev/null 

echo "[zun-flow] set leaderSeatId=$LEADER_SEAT_ID (must be leader of a member arban)..."
cast send "$ZUN" "setLeader(uint32,uint256)" "$ZUN_ID" "$LEADER_SEAT_ID" \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --gas-limit 500000 >/dev/null

echo "[zun-flow] verify:"
cast call "$ZUN" "getArbans(uint32)(uint32[10])" "$ZUN_ID" --rpc-url "$RPC_URL"
cast call "$ZUN" "getLeader(uint32)(uint256)" "$ZUN_ID" --rpc-url "$RPC_URL"

echo "[zun-flow] done"
