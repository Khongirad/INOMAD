#!/usr/bin/env bash
set -euo pipefail

: "${RPC_URL:?RPC_URL is required}"
: "${PRIVATE_KEY:?PRIVATE_KEY is required}"
: "${ARBAN_ID:?ARBAN_ID is required (e.g. 1)}"
: "${CANDIDATE_SEAT_ID:?CANDIDATE_SEAT_ID is required (e.g. 1)}"

ELECTION_SECONDS="${ELECTION_SECONDS:-20}"
VERIFIER_COUNT="${VERIFIER_COUNT:-2}"
ADDRS="${1:-chain/addresses-citizen.json}"

ARB="$(jq -r .contracts.ArbanRegistry "$ADDRS")"
ELR="$(jq -r .contracts.ElectionRegistry "$ADDRS")"
OWNER_ADDR="$(cast wallet address --private-key "$PRIVATE_KEY")"

echo "[arban-elect] ArbanRegistry=$ARB"
echo "[arban-elect] ElectionRegistry=$ELR"
echo "[arban-elect] owner=$OWNER_ADDR"
echo "[arban-elect] arbanId=$ARBAN_ID candidateSeatId=$CANDIDATE_SEAT_ID"
echo "[arban-elect] electionSeconds=$ELECTION_SECONDS verifierCount=$VERIFIER_COUNT"

echo "[arban-elect] ensure arban exists..."
if cast call "$ARB" "getSeats(uint32)(uint256[10])" "$ARBAN_ID" --rpc-url "$RPC_URL" >/dev/null 2>&1; then
  echo "[arban-elect] arban exists OK"
else
  echo "[arban-elect] arban not found -> creating arbanId=$ARBAN_ID with seats [1..10]"
  SEATS='[1,2,3,4,5,6,7,8,9,10]'
  cast send "$ARB" "createArban(uint256[10])(uint32)" "$SEATS" \
    --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --gas-limit 2000000 >/dev/null

  # set provisional leader to candidate (owner authority in current ArbanRegistry)
  cast send "$ARB" "setLeader(uint32,uint256)" "$ARBAN_ID" "$CANDIDATE_SEAT_ID" \
    --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --gas-limit 500000 >/dev/null
  echo "[arban-elect] created + setLeader prelim"
fi

# build voters from PK_VERIFIER_1..N
voters=()
for i in $(seq 1 "$VERIFIER_COUNT"); do
  var="PK_VERIFIER_${i}"
  pk="${!var:-}"
  if [[ -z "$pk" ]]; then
    echo "[arban-elect] missing env $var (private key for verifier $i)"
    exit 1
  fi
  addr="$(cast wallet address --private-key "$pk")"
  voters+=("$addr")
done

# endTs = now + ELECTION_SECONDS
now="$(date +%s)"
endTs=$((now + ELECTION_SECONDS))

echo "[arban-elect] voters:"
for v in "${voters[@]}"; do echo "  - $v"; done
echo "[arban-elect] endTs=$endTs"

CANDIDATES_TUPLE="[$CANDIDATE_SEAT_ID]"
VOTERS_TUPLE="[$(IFS=,; echo "${voters[*]}")]"

echo "[arban-elect] creating election..."
DATA="$(cast calldata "createElection(uint64,uint256[],address[])" "$endTs" "$CANDIDATES_TUPLE" "$VOTERS_TUPLE")"
cast send "$ELR" "$DATA" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --gas-limit 2500000 >/dev/null

next="$(cast call "$ELR" "nextElectionId()(uint256)" --rpc-url "$RPC_URL")"
ELECTION_ID=$((next - 1))
echo "[arban-elect] electionId=$ELECTION_ID"

echo "[arban-elect] voting..."
for i in $(seq 1 "$VERIFIER_COUNT"); do
  pk_var="PK_VERIFIER_${i}"
  pk="${!pk_var}"
  voter="$(cast wallet address --private-key "$pk")"
  echo "  - voter=$voter votes candidate=$CANDIDATE_SEAT_ID"
  cast send "$ELR" "voteFor(uint256,uint256)" "$ELECTION_ID" "$CANDIDATE_SEAT_ID" \
    --rpc-url "$RPC_URL" --private-key "$pk" --gas-limit 500000 >/dev/null
done

echo "[arban-elect] waiting election end..."
sleep "$((ELECTION_SECONDS + 1))"

echo "[arban-elect] finalize..."
cast send "$ELR" "finalize(uint256)(uint256,uint256)" "$ELECTION_ID" \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --gas-limit 900000 >/dev/null

echo "[arban-elect] apply result to ArbanRegistry.setLeader..."
cast send "$ARB" "setLeader(uint32,uint256)" "$ARBAN_ID" "$CANDIDATE_SEAT_ID" \
  --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --gas-limit 500000 >/dev/null

echo "[arban-elect] done"
