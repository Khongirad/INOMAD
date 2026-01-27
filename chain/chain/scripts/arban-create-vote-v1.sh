#!/usr/bin/env bash
set -euo pipefail

: "${RPC_URL:?RPC_URL is required}"
: "${PRIVATE_KEY:?PRIVATE_KEY is required}"   # admin/deployer key
ADDRS="${1:-chain/addresses-citizen.json}"
MODE="${2:-public}"                          # public | private

SEAT=$(jq -r .contracts.SeatSBT "$ADDRS")
ACT=$(jq -r .contracts.CitizenActivation "$ADDRS")
ARB=$(jq -r .contracts.ArbanRegistry "$ADDRS")

echo "[arban] SeatSBT=$SEAT"
echo "[arban] CitizenActivation=$ACT"
echo "[arban] ArbanRegistry=$ARB"
echo "[arban] mode=$MODE"

SEATS='[1,2,3,4,5,6,7,8,9,10]'

# ensure ACTIVE
for i in $(seq 1 10); do
  ok=$(cast call "$ACT" "isActive(uint256)(bool)" "$i" --rpc-url "$RPC_URL")
  if [[ "$ok" != "true" ]]; then
    echo "[arban] seat $i is not ACTIVE"
    exit 1
  fi
done
echo "[arban] seats 1..10 ACTIVE=ok"

if [[ "$MODE" == "private" ]]; then
  : "${FOUNDER_SEAT_ID:=1}"
  echo "[arban] creating PRIVATE arban, founderSeatId=$FOUNDER_SEAT_ID"
  cast send "$ARB" "createArbanPrivate(uint256[10],uint256)" "$SEATS" "$FOUNDER_SEAT_ID" \
    --gas-limit 1200000 --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" >/dev/null
  echo "[arban] done (PRIVATE)"
  exit 0
fi

if [[ "$MODE" == "public" ]]; then
  : "${CANDIDATE_SEAT_ID:=1}"
  : "${ELECTION_SECONDS:=30}"
  : "${VERIFIER_COUNT:=2}"

  # If contract exposes nextArbanId() we can derive created arbanId deterministically:
  # newArbanId = nextArbanId_before
  next_before=$(cast call "$ARB" "nextArbanId()(uint32)" --rpc-url "$RPC_URL" 2>/dev/null || true)
  if [[ -z "$next_before" ]]; then
    echo "[arban] ERROR: ArbanRegistry must expose nextArbanId()(uint32) for this script."
    echo "        Add: 'uint32 public nextArbanId = 1;' (already) and keep it public."
    exit 1
  fi

  END_TS=$(( $(date +%s) + ELECTION_SECONDS ))
  echo "[arban] creating PUBLIC arban, electionSeconds=$ELECTION_SECONDS, candidateSeatId=$CANDIDATE_SEAT_ID, endTs=$END_TS"

  cast send "$ARB" "createArbanPublic(uint256[10],uint64)" "$SEATS" "$END_TS" \
    --gas-limit 1500000 --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" >/dev/null

  # arbanId is (nextArbanId_before)
  ARBAN_ID="$next_before"
  echo "[arban] public arbanId=$ARBAN_ID"

  echo "[arban] verifier voting (count=$VERIFIER_COUNT)"
  for idx in $(seq 1 "$VERIFIER_COUNT"); do
    var="PK_VERIFIER_${idx}"
    pk="${!var:-}"
    if [[ -z "$pk" ]]; then
      echo "[arban] missing env $var"
      echo "        export PK_VERIFIER_1=0x... PK_VERIFIER_2=0x... (and so on) then rerun."
      exit 1
    fi

    voter=$(cast wallet address --private-key "$pk")
    echo "[arban] verifier $idx voter=$voter -> vote candidate=$CANDIDATE_SEAT_ID"
    cast send "$ARB" "voteLeader(uint32,uint256)" "$ARBAN_ID" "$CANDIDATE_SEAT_ID" \
      --gas-limit 500000 --rpc-url "$RPC_URL" --private-key "$pk" >/dev/null
  done

  echo "[arban] waiting election end..."
  while [[ $(date +%s) -lt $END_TS ]]; do sleep 1; done

  echo "[arban] finalize election"
  cast send "$ARB" "finalizeLeaderElection(uint32)" "$ARBAN_ID" \
    --gas-limit 800000 --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" >/dev/null

  echo "[arban] done (PUBLIC) arbanId=$ARBAN_ID"
  exit 0
fi

echo "[arban] invalid MODE: $MODE (use public|private)"
exit 1
