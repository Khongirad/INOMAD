#!/bin/bash
# E2E Integration Test Setup Script
# Tests blockchain integration between backend and contracts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}   ALTAN E2E Integration Test Setup${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"

# Check if anvil is running
check_anvil() {
    echo -e "\n${YELLOW}[1/5] Checking Anvil...${NC}"
    if curl -s -X POST http://localhost:8545 \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Anvil is running${NC}"
        BLOCK=$(curl -s -X POST http://localhost:8545 \
            -H "Content-Type: application/json" \
            -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
            | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
        echo -e "   Current block: ${BLOCK}"
        return 0
    else
        echo -e "${RED}❌ Anvil not running${NC}"
        echo -e "   Start with: ${CYAN}anvil${NC}"
        return 1
    fi
}

# Check addresses files exist
check_addresses() {
    echo -e "\n${YELLOW}[2/5] Checking Address Files...${NC}"
    CHAIN_DIR="../chain"
    
    if [ -f "$CHAIN_DIR/addresses.json" ]; then
        echo -e "${GREEN}✅ addresses.json${NC}"
        SEAT_SBT=$(cat "$CHAIN_DIR/addresses.json" | grep -o '"SeatSBT": *"[^"]*"' | cut -d'"' -f4 || echo "")
        echo -e "   SeatSBT: ${SEAT_SBT:-NOT FOUND}"
    else
        echo -e "${RED}❌ addresses.json not found${NC}"
    fi
    
    if [ -f "$CHAIN_DIR/addresses-citizen.json" ]; then
        echo -e "${GREEN}✅ addresses-citizen.json${NC}"
    else
        echo -e "${YELLOW}⚠️  addresses-citizen.json not found${NC}"
    fi
    
    if [ -f "$CHAIN_DIR/addresses-banking.json" ]; then
        echo -e "${GREEN}✅ addresses-banking.json${NC}"
        ALTAN=$(cat "$CHAIN_DIR/addresses-banking.json" | grep -o '"Altan": *"[^"]*"' | head -1 | cut -d'"' -f4 || echo "")
        echo -e "   Altan: ${ALTAN:-NOT FOUND}"
    else
        echo -e "${YELLOW}⚠️  addresses-banking.json not found${NC}"
    fi
}

# Check backend
check_backend() {
    echo -e "\n${YELLOW}[3/5] Checking Backend...${NC}"
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is running on port 3001${NC}"
        return 0
    else
        echo -e "${RED}❌ Backend not running${NC}"
        echo -e "   Start with: ${CYAN}cd backend && npm run start:dev${NC}"
        return 1
    fi
}

# Test blockchain service
test_blockchain_service() {
    echo -e "\n${YELLOW}[4/5] Testing Blockchain Service...${NC}"
    
    # Test identity blockchain status
    echo -e "   Testing /api/identity/blockchain-status/1..."
    RESPONSE=$(curl -s http://localhost:3001/api/identity/blockchain-status/1 || echo "ERROR")
    
    if echo "$RESPONSE" | grep -q "seatExists"; then
        echo -e "${GREEN}✅ Blockchain service responding${NC}"
        echo -e "   Response: ${RESPONSE:0:100}..."
    else
        echo -e "${YELLOW}⚠️  Service may be in offline mode${NC}"
        echo -e "   Response: $RESPONSE"
    fi
}

# Run quick contract call
test_contract_call() {
    echo -e "\n${YELLOW}[5/5] Testing Direct Contract Call...${NC}"
    
    # Get SeatSBT totalSupply
    SEAT_SBT=$(cat ../chain/addresses.json 2>/dev/null | grep -o '"SeatSBT": *"[^"]*"' | cut -d'"' -f4 || echo "")
    
    if [ -n "$SEAT_SBT" ]; then
        # totalSupply() selector = 0x18160ddd
        RESULT=$(curl -s -X POST http://localhost:8545 \
            -H "Content-Type: application/json" \
            -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"$SEAT_SBT\",\"data\":\"0x18160ddd\"},\"latest\"],\"id\":1}" \
            | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
        
        if [ -n "$RESULT" ] && [ "$RESULT" != "0x" ]; then
            SUPPLY=$((16#${RESULT:2}))
            echo -e "${GREEN}✅ SeatSBT.totalSupply() = $SUPPLY${NC}"
        else
            echo -e "${YELLOW}⚠️  Contract call returned empty (may need deployment)${NC}"
        fi
    else
        echo -e "${RED}❌ SeatSBT address not found${NC}"
    fi
}

# Summary
print_summary() {
    echo -e "\n${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}   Summary${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "\nTo run full E2E test manually:"
    echo -e "  1. ${CYAN}anvil${NC}  (if not running)"
    echo -e "  2. ${CYAN}cd chain && forge script script/DeployConstitution.s.sol --rpc-url http://localhost:8545 --broadcast${NC}"
    echo -e "  3. ${CYAN}cd backend && npm run start:dev${NC}"
    echo -e "  4. ${CYAN}curl http://localhost:3001/api/identity/blockchain-status/1${NC}"
    echo -e "\n${GREEN}Ready for testing!${NC}"
}

# Main
main() {
    cd "$(dirname "$0")"
    
    check_anvil || true
    check_addresses
    check_backend || true
    test_blockchain_service
    test_contract_call
    print_summary
}

main
