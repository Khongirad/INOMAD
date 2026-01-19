#!/usr/bin/env bash
set -euo pipefail

: "${RPC_URL:?RPC_URL is required}"
: "${PRIVATE_KEY:?PRIVATE_KEY is required}"

ADDRS="${1:-chain/addresses-citizen.json}"

SEAT=$(jq -r .contracts.SeatSBT "$ADDRS")
ACT=$(jq -r .contracts.CitizenActivation "$ADDRS")
ARB=$(jq -r .contracts.ArbanRegistry "$ADDRS")

echo "[flow] SeatSBT=$SEAT"
echo "[flow] CitizenActivation=$ACT"
echo "[flow] ArbanRegistry=$ARB"

# Default anvil accounts (addresses)
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

# Verifier private keys (default anvil)
PK0="$PRIVATE_KEY"  # for C0
PK1=0x59c6995e998f97a5a0044966f094538e8d6d69c6c93f0f5d7d0d2f5d9f99a2c4  # for C1
V1=$(cast wallet address --private-key "$PK1")

echo "[flow] set verifiers C0 and C1..."
cast send "$ACT" "setVerifier(address,bool)" "$C0" true --gas-limit 500000 --rpc-url "$RPC_URL" --private-key "$PK0" >/dev/null
cast send "$ACT" "setVerifier(address,bool)" "$V1" true --gas-limit 500000 --rpc-url "$RPC_URL" --private-key "$PK0" >/dev/null

echo "[flow] issue 10 seats (seatId 1..10)..."
for i in $(seq 1 10); do
  to="${CITIZENS[$((i-1))]}"
  cast send "$ACT" "issue(address,uint256,uint32,uint16)" "$to" "$i" 1 0 --gas-limit 500000 --rpc-url "$RPC_URL" --private-key "$PK0" >/dev/null
done

echo "[flow] attest seats with verifier C0..."
for i in $(seq 1 10); do
  cast send "$ACT" "attest(uint256)" "$i" --gas-limit 500000 --rpc-url "$RPC_URL" --private-key "$PK0" >/dev/null
done

echo "[flow] attest seats with verifier C1..."
for i in $(seq 1 10); do
  cast send "$ACT" "attest(uint256)" "$i" --gas-limit 500000 --rpc-url "$RPC_URL" --private-key "$PK1" >/dev/null
done

echo "[flow] check active:"
for i in $(seq 1 10); do
  ok=$(cast call "$ACT" "isActive(uint256)(bool)" "$i" --rpc-url "$RPC_URL")
  echo "  seat $i active=$ok"
done

echo "[flow] create Arban (arbanId=1) with seats 1..10..."
SEATS_TUPLE="[1,2,3,4,5,6,7,8,9,10]"
cast send "$ARB" "createArban(uint256[10])" "$SEATS_TUPLE" --gas-limit 500000 --rpc-url "$RPC_URL" --private-key "$PK0" >/dev/null

echo "[flow] set leader seatId=1 for arbanId=1..."
cast send "$ARB" "setLeader(uint32,uint256)" 1 1 --gas-limit 500000 --rpc-url "$RPC_URL" --private-key "$PK0" >/dev/null

echo "[flow] done"
