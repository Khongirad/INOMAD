#!/usr/bin/env bash
set -euo pipefail

set -a
source ./foreign.local.env
set +a

: "${RPC_URL:?}"
: "${PK0:?}"

DEPLOYER=$(cast wallet address --private-key "$PK0")
echo "DEPLOYER=$DEPLOYER"
echo "RPC_URL=$RPC_URL"

# build
forge build

# 1) deploy ForeignSeatSBT(owner=deployer)
FOREIGN_SEAT_SBT=$(
  forge create --broadcast --legacy contracts/ForeignSeatSBT.sol:ForeignSeatSBT \
    --rpc-url "$RPC_URL" --private-key "$PK0" \
    --constructor-args "$DEPLOYER" \
  | awk '/Deployed to:/ {print $3}'
)
echo "FOREIGN_SEAT_SBT=$FOREIGN_SEAT_SBT"

# 2) deploy ForeignAffairsRegistry(foreignSeatSbt, owner=deployer)
FOREIGN_AFFAIRS=$(
  forge create --broadcast --legacy contracts/ForeignAffairsRegistry.sol:ForeignAffairsRegistry \
    --rpc-url "$RPC_URL" --private-key "$PK0" \
    --constructor-args "$FOREIGN_SEAT_SBT" "$DEPLOYER" \
  | awk '/Deployed to:/ {print $3}'
)
echo "FOREIGN_AFFAIRS=$FOREIGN_AFFAIRS"

# 3) set minter on ForeignSeatSBT -> ForeignAffairsRegistry
cast send "$FOREIGN_SEAT_SBT" "setMinter(address)" "$FOREIGN_AFFAIRS" \
  --rpc-url "$RPC_URL" --private-key "$PK0" >/dev/null
echo "MINTER set: ForeignAffairsRegistry"

# 4) deploy GatewayRouter(gov=deployer)
GATEWAY=$(
  forge create --broadcast --legacy contracts/GatewayRouter.sol:GatewayRouter \
    --rpc-url "$RPC_URL" --private-key "$PK0" \
    --constructor-args "$DEPLOYER" \
  | awk '/Deployed to:/ {print $3}'
)
echo "GATEWAY=$GATEWAY"

# 5) (optional) set officer (deployer itself as officer)
cast send "$FOREIGN_AFFAIRS" "setOfficer(address,bool)" "$DEPLOYER" true \
  --rpc-url "$RPC_URL" --private-key "$PK0" >/dev/null
echo "OFFICER set: deployer"

# Persist
cat > addresses-foreign.json <<JSON
{
  "ForeignSeatSBT": "$FOREIGN_SEAT_SBT",
  "ForeignAffairsRegistry": "$FOREIGN_AFFAIRS",
  "GatewayRouter": "$GATEWAY",
  "Gov": "$DEPLOYER"
}
JSON
echo "Wrote addresses-foreign.json"

# ---- quick checks ----
echo "CHECK: ForeignSeatSBT.owner"
cast call "$FOREIGN_SEAT_SBT" "owner()(address)" --rpc-url "$RPC_URL"

echo "CHECK: ForeignSeatSBT.minter"
cast call "$FOREIGN_SEAT_SBT" "minter()(address)" --rpc-url "$RPC_URL"

echo "CHECK: ForeignAffairs.owner"
cast call "$FOREIGN_AFFAIRS" "owner()(address)" --rpc-url "$RPC_URL"

echo "CHECK: Gateway.gov"
cast call "$GATEWAY" "gov()(address)" --rpc-url "$RPC_URL"
