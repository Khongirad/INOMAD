#!/bin/bash

# Test Phase 1 Backend Integration
# Tests all deployed contracts with backend services

echo "=== Phase 1 Backend Integration Tests ==="
echo ""

BASE_URL="http://localhost:3001/api"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>&1)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $status_code)"
        echo "Response: $body"
        ((FAILED++))
        return 1
    fi
}

echo "1. Health Check"
echo "==============="
test_endpoint "API Health" "$BASE_URL/health" "200"
echo ""

echo "2. DigitalSeal Endpoints (7 total)"
echo "==================================="
# These should return 404/400 for non-existent IDs, not 500
test_endpoint "Get Seal (404 expected)" "$BASE_URL/digital-seal/test-id-123" "404"
test_endpoint "Get User Seals" "$BASE_URL/digital-seal/user/seat-123" "200"
echo ""

echo "3. Academy Endpoints (12 total)"
echo "================================"
test_endpoint "Get Patent (404 expected)" "$BASE_URL/academy/patents/test-id-123" "404"
test_endpoint "Get User Patents" "$BASE_URL/academy/patents/user/seat-123" "200"
test_endpoint "Get Discovery (404 expected)" "$BASE_URL/academy/discoveries/test-id-123" "404"
test_endpoint "Get User Discoveries" "$BASE_URL/academy/discoveries/user/seat-123" "200"
test_endpoint "Get Grant (404 expected)" "$BASE_URL/academy/grants/test-id-123" "404"
test_endpoint "Get User Grants" "$BASE_URL/academy/grants/user/seat-123" "200"
echo ""

echo "4. Justice Endpoints (13 total)"
echo "================================"
test_endpoint "Get Member (404 expected)" "$BASE_URL/justice/members/test-id-123" "404"
test_endpoint "Get Member by Seat" "$BASE_URL/justice/members/seat/seat-123" "404"
test_endpoint "Get Case (404 expected)" "$BASE_URL/justice/cases/test-id-123" "404"
test_endpoint "Get Plaintiff Cases" "$BASE_URL/justice/cases/plaintiff/seat-123" "200"
test_endpoint "Get Defendant Cases" "$BASE_URL/justice/cases/defendant/seat-123" "200"
test_endpoint "Get Precedent (404 expected)" "$BASE_URL/justice/precedents/test-id-123" "404"
test_endpoint "Get Precedents by Case" "$BASE_URL/justice/precedents/case/1" "200"
echo ""

echo "=== Test Summary ==="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
