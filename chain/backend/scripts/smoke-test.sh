#!/bin/bash
# Smoke test script for INOMAD Backend
# Usage: ./scripts/smoke-test.sh [BASE_URL]

BASE_URL=${1:-http://localhost:3001/api}

echo "======================================"
echo "  INOMAD Backend Smoke Tests"
echo "  Base URL: $BASE_URL"
echo "======================================"

PASS=0
FAIL=0

test_endpoint() {
  local method=$1
  local endpoint=$2
  local expected_status=$3
  local description=$4

  url="$BASE_URL$endpoint"

  if [ "$method" == "GET" ]; then
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  else
    status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" -H "Content-Type: application/json")
  fi

  if [ "$status" == "$expected_status" ]; then
    echo "✓ PASS: $method $endpoint ($status) - $description"
    PASS=$((PASS+1))
  else
    echo "✗ FAIL: $method $endpoint (expected $expected_status, got $status) - $description"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "Testing endpoints..."
echo ""

# Health check
test_endpoint "GET" "/health" "200" "Health check"

# Khural endpoints
test_endpoint "GET" "/khural" "200" "List Khural groups"

# Guilds endpoints
test_endpoint "GET" "/guilds" "200" "List guilds"

# Tasks endpoints
test_endpoint "GET" "/tasks" "200" "List tasks"

# Audit endpoints
test_endpoint "GET" "/audit/history" "200" "Get public history"

# Professions endpoints
test_endpoint "GET" "/professions" "200" "List professions"

echo ""
echo "======================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "======================================"

if [ $FAIL -gt 0 ]; then
  exit 1
fi

exit 0
