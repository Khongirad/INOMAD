set -euo pipefail

export RPC_URL="http://127.0.0.1:8545"
export PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

ADDR_FILE="chain/addresses-citizen.json"
LOG_FILE="deploy-branch-factory.log"

test -f "$ADDR_FILE"

OWNER="$(cast wallet address --private-key "$PRIVATE_KEY")"
echo "OWNER=$OWNER" | tee "$LOG_FILE"

forge build 2>&1 | tee -a "$LOG_FILE"

BRANCH_REGISTRY="$(
  forge create chain/contracts/BranchRegistry.sol:BranchRegistry \
    --constructor-args "$OWNER" \
    --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" \
  2>&1 | tee -a "$LOG_FILE" | sed -n 's/.*Deployed to: //p' | tail -n 1
)"
echo "BRANCH_REGISTRY=$BRANCH_REGISTRY" | tee -a "$LOG_FILE"
test -n "$BRANCH_REGISTRY"

CAPSULE_FACTORY="$(
  forge create chain/contracts/CapsuleFactory.sol:CapsuleFactory \
    --constructor-args "$BRANCH_REGISTRY" "$OWNER" \
    --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" \
  2>&1 | tee -a "$LOG_FILE" | sed -n 's/.*Deployed to: //p' | tail -n 1
)"
echo "CAPSULE_FACTORY=$CAPSULE_FACTORY" | tee -a "$LOG_FILE"
test -n "$CAPSULE_FACTORY"

tmp="$(mktemp)"
jq --arg br "$BRANCH_REGISTRY" --arg cf "$CAPSULE_FACTORY" '
  .contracts.BranchRegistry = $br
  | .contracts.CapsuleFactory = $cf
' "$ADDR_FILE" > "$tmp" && mv "$tmp" "$ADDR_FILE"

echo "Saved to $ADDR_FILE" | tee -a "$LOG_FILE"
jq -r '.contracts | {BranchRegistry, CapsuleFactory}' "$ADDR_FILE" | tee -a "$LOG_FILE"

cast call "$BRANCH_REGISTRY" "owner()(address)" --rpc-url "$RPC_URL" | tee -a "$LOG_FILE"

echo "DONE. Log: $LOG_FILE"
