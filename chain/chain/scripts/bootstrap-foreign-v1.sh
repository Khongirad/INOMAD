#!/usr/bin/env bash
set -euo pipefail

: "${RPC:?RPC empty}"
: "${PK:?PK empty}"

# адреса модулей (из addresses-foreign.json)
AUTH="$(jq -r '.ExecutiveAuthority' addresses-foreign.json)"
SBT="$(jq -r '.ForeignSeatSBT' addresses-foreign.json)"
FAR="$(jq -r '.ForeignAffairsRegistry' addresses-foreign.json)"
GW="$(jq -r '.GatewayRouter' addresses-foreign.json)"
CABINET="$(jq -r '.Gov' addresses-foreign.json)"

# акторы (можно переопределить снаружи)
MFA_MINISTER="${MFA_MINISTER:-$CABINET}"
EMBASSY="${EMBASSY:-$CABINET}"

echo "RPC=$RPC"
echo "AUTH=$AUTH"
echo "SBT=$SBT"
echo "FAR=$FAR"
echo "GW=$GW"
echo "CABINET=$CABINET"
echo "MFA_MINISTER=$MFA_MINISTER"
echo "EMBASSY=$EMBASSY"
echo

echo "[1/4] route FOREIGN_AFFAIRS -> FAR"
cast send "$GW" "setRoute(bytes32,address,bool)" "$(cast keccak 'FOREIGN_AFFAIRS')" "$FAR" true \
  --rpc-url "$RPC" --private-key "$PK" >/dev/null
echo "OK"

echo "[2/4] SBT.minter = FAR"
cast send "$SBT" "setMinter(address)" "$FAR" \
  --rpc-url "$RPC" --private-key "$PK" >/dev/null
echo "OK"

echo "[3/4] roles: MFA_ADMIN + OFFICERs"
cast send "$AUTH" "grantRole(bytes32,address)" "$(cast keccak 'FOREIGN_AFFAIRS_ADMIN')" "$MFA_MINISTER" \
  --rpc-url "$RPC" --private-key "$PK" >/dev/null

cast send "$AUTH" "grantRole(bytes32,address)" "$(cast keccak 'FOREIGN_AFFAIRS_OFFICER')" "$GW" \
  --rpc-url "$RPC" --private-key "$PK" >/dev/null

cast send "$AUTH" "grantRole(bytes32,address)" "$(cast keccak 'FOREIGN_AFFAIRS_OFFICER')" "$EMBASSY" \
  --rpc-url "$RPC" --private-key "$PK" >/dev/null
echo "OK"

echo "[4/4] sanity checks"
ROUTE="$(cast call "$GW" "getRoute(bytes32)(address)" "$(cast keccak 'FOREIGN_AFFAIRS')" --rpc-url "$RPC")"
MINTER="$(cast call "$SBT" "minter()(address)" --rpc-url "$RPC")"
OK_GW="$(cast call "$AUTH" "hasRole(bytes32,address)(bool)" "$(cast keccak 'FOREIGN_AFFAIRS_OFFICER')" "$GW" --rpc-url "$RPC")"
OK_MFA="$(cast call "$AUTH" "hasRole(bytes32,address)(bool)" "$(cast keccak 'FOREIGN_AFFAIRS_ADMIN')" "$MFA_MINISTER" --rpc-url "$RPC")"

echo "Route  = $ROUTE"
echo "Minter = $MINTER"
echo "GW OFFICER = $OK_GW"
echo "MFA ADMIN  = $OK_MFA"

test "$(echo "$ROUTE"  | tr '[:upper:]' '[:lower:]')" = "$(echo "$FAR" | tr '[:upper:]' '[:lower:]')"
test "$(echo "$MINTER" | tr '[:upper:]' '[:lower:]')" = "$(echo "$FAR" | tr '[:upper:]' '[:lower:]')"
test "$OK_GW" = "true"
test "$OK_MFA" = "true"

echo
echo "BOOTSTRAP OK"
