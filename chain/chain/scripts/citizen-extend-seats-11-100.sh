#!/usr/bin/env bash
set -euo pipefail

: "${RPC_URL:?RPC_URL is required}"
: "${PRIVATE_KEY:?PRIVATE_KEY is required}"

ADDRS="${1:-chain/addresses-citizen.json}"

ACT="$(jq -r .contracts.CitizenActivation "$ADDRS")"
SEAT="$(jq -r .contracts.SeatSBT "$ADDRS")"

if [[ -z "$ACT" || "$ACT" == "null" ]]; then echo "missing CitizenActivation in $ADDRS" >&2; exit 1; fi
if [[ -z "$SEAT" || "$SEAT" == "null" ]]; then echo "missing SeatSBT in $ADDRS" >&2; exit 1; fi

# Verifier keys (same pattern as before)
PK0="${PK_VERIFIER_1:-$PRIVATE_KEY}"
PK1="${PK_VERIFIER_2:-}"
if [[ -z "$PK1" ]]; then
  echo "Missing PK_VERIFIER_2. Export it and rerun." >&2
  exit 1
fi

V0="$(cast wallet address --private-key "$PK0")"
V1="$(cast wallet address --private-key "$PK1")"

echo "[extend] SeatSBT=$SEAT"
echo "[extend] CitizenActivation=$ACT"
echo "[extend] verifier0=$V0"
echo "[extend] verifier1=$V1"

# ensure verifiers are set (owner = PK0)
cast send "$ACT" "setVerifier(address,bool)" "$V0" true --rpc-url "$RPC_URL" --private-key "$PK0" --gas-limit 500000 >/dev/null
cast send "$ACT" "setVerifier(address,bool)" "$V1" true --rpc-url "$RPC_URL" --private-key "$PK0" --gas-limit 500000 >/dev/null

# recipients (10 anvil-like addresses, reuse)
C0=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
C1=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
C2=0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
C3=0x90F79bf6EB2c4f870365E785982E1f101E93b906
C4=0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
C5=0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
C6=0x976EA74026E726554dB657fA54763abd0C3a0aa9
C7=0x14dC79964da2C08b23698B3D3cc7Ca32193d9955
C8=0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f
C9=0xa0Ee7A142d267C1f36714E4a8F75612F20a79720
CITIZENS=("$C0" "$C1" "$C2" "$C3" "$C4" "$C5" "$C6" "$C7" "$C8" "$C9")

COHORT="${COHORT:-1}"
REGION="${REGION:-0}"

echo "[extend] issuing seats 11..100 (cohort=$COHORT region=$REGION)..."
for seatId in $(seq 11 100); do
  idx=$(( (seatId - 1) % 10 ))
  to="${CITIZENS[$idx]}"
  cast send "$ACT" "issue(address,uint256,uint32,uint16)" "$to" "$seatId" "$COHORT" "$REGION" \
    --rpc-url "$RPC_URL" --private-key "$PK0" --gas-limit 500000 >/dev/null
done

echo "[extend] attest seats 11..100 by verifier0..."
for seatId in $(seq 11 100); do
  cast send "$ACT" "attest(uint256)" "$seatId" \
    --rpc-url "$RPC_URL" --private-key "$PK0" --gas-limit 500000 >/dev/null
done

echo "[extend] attest seats 11..100 by verifier1..."
for seatId in $(seq 11 100); do
  cast send "$ACT" "attest(uint256)" "$seatId" \
    --rpc-url "$RPC_URL" --private-key "$PK1" --gas-limit 500000 >/dev/null
done

echo "[extend] quick check:"
for seatId in 11 20 50 100; do
  ok=$(cast call "$ACT" "isActive(uint256)(bool)" "$seatId" --rpc-url "$RPC_URL")
  echo "  seat $seatId active=$ok"
done

echo "[extend] done"
