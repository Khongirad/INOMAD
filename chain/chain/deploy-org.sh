#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

set -a
source ./org.local.env
set +a

echo "RPC_URL=$RPC_URL"
echo "SEAT_SBT=$SEAT_SBT"
echo "W1=$W1"

forge build

ORG_REGISTRY=$(
  forge create --broadcast --legacy contracts/OrgRegistry.sol:OrgRegistry \
    --rpc-url "$RPC_URL" --private-key "$PK0" \
    --constructor-args "$SEAT_SBT" \
  | awk '/Deployed to:/ {print $3}'
)
echo "ORG_REGISTRY=$ORG_REGISTRY"

ORG_POS_REGISTRY=$(
  forge create --broadcast --legacy contracts/OrgPositionsRegistry.sol:OrgPositionsRegistry \
    --rpc-url "$RPC_URL" --private-key "$PK0" \
    --constructor-args "$SEAT_SBT" "$ORG_REGISTRY" \
  | awk '/Deployed to:/ {print $3}'
)
echo "ORG_POS_REGISTRY=$ORG_POS_REGISTRY"

ADMIN_SEAT=1
META_URI="ipfs://bank-of-siberia/v1"

cast send "$ORG_REGISTRY" "createOrg(uint256,address,string)" \
  "$ADMIN_SEAT" "$W1" "$META_URI" \
  --rpc-url "$RPC_URL" --private-key "$PK0" >/dev/null

ROOT_UNIT_ID=$(
  cast call "$ORG_REGISTRY" "orgs(uint256)((uint256,uint256,address,string,uint256,bool))" 1 \
    --rpc-url "$RPC_URL" | sed -n '5p'
)
echo "ROOT_UNIT_ID=$ROOT_UNIT_ID"

cast send "$ORG_POS_REGISTRY" "defineRole(uint256,uint32,string,uint256,uint256)" 1 1 "Operator" 1 0 \
  --rpc-url "$RPC_URL" --private-key "$PK0" >/dev/null
cast send "$ORG_POS_REGISTRY" "defineRole(uint256,uint32,string,uint256,uint256)" 1 2 "Auditor" 4 0 \
  --rpc-url "$RPC_URL" --private-key "$PK0" >/dev/null
cast send "$ORG_POS_REGISTRY" "defineRole(uint256,uint32,string,uint256,uint256)" 1 3 "Treasurer" 2 5000000000000000000 \
  --rpc-url "$RPC_URL" --private-key "$PK0" >/dev/null

cast send "$ORG_POS_REGISTRY" "assign(uint256,uint16,uint32,uint256)" "$ROOT_UNIT_ID" 0 1 1 \
  --rpc-url "$RPC_URL" --private-key "$PK0" >/dev/null
cast send "$ORG_POS_REGISTRY" "assign(uint256,uint16,uint32,uint256)" "$ROOT_UNIT_ID" 1 2 3 \
  --rpc-url "$RPC_URL" --private-key "$PK0" >/dev/null
cast send "$ORG_POS_REGISTRY" "assign(uint256,uint16,uint32,uint256)" "$ROOT_UNIT_ID" 2 3 4 \
  --rpc-url "$RPC_URL" --private-key "$PK0" >/dev/null

echo "Slot 0:"; cast call "$ORG_POS_REGISTRY" "getSlot(uint256,uint16)((uint256,uint32))" "$ROOT_UNIT_ID" 0 --rpc-url "$RPC_URL"
echo "Slot 1:"; cast call "$ORG_POS_REGISTRY" "getSlot(uint256,uint16)((uint256,uint32))" "$ROOT_UNIT_ID" 1 --rpc-url "$RPC_URL"
echo "Slot 2:"; cast call "$ORG_POS_REGISTRY" "getSlot(uint256,uint16)((uint256,uint32))" "$ROOT_UNIT_ID" 2 --rpc-url "$RPC_URL"

cat > addresses-org.json <<JSON
{
  "SeatSBT": "$SEAT_SBT",
  "OrgRegistry": "$ORG_REGISTRY",
  "OrgPositionsRegistry": "$ORG_POS_REGISTRY",
  "Org1_Wallet": "$W1",
  "Org1_RootUnitId": "$ROOT_UNIT_ID"
}
JSON

echo "Wrote chain/addresses-org.json"
