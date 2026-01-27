# Seat Binding Layer - Testing Guide

## Overview

The Seat Binding Layer establishes cryptographic verification between backend KhuralSeats and on-chain SeatSBT tokens.

## Prerequisites

1. **Running blockchain node** with deployed SeatSBT contract
2. **Contract addresses** configured in `.env`
3. **Test wallet** with at least one SeatSBT

## Configuration

Update `backend/.env`:

```bash
# Blockchain RPC
ALTAN_RPC_URL="http://localhost:8545"

# Contract Addresses (get from deployment)
SEAT_SBT_ADDRESS="0x..."
ALTAN_ADDRESS="0x..."
```

## API Endpoints

### 1. Bind Seat to User

Verifies on-chain ownership and binds seat to backend user.

```bash
curl -X POST http://localhost:3001/api/seat-binding/bind \
  -H "Content-Type: application/json" \
  -H "x-seat-id: SEAT_001" \
  -d '{
    "seatId": "1",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

**Success Response:**
```json
{
  "userId": "uuid",
  "seatId": "1",
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "verified": true,
  "onChainOwner": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "bindingTimestamp": "2026-01-19T11:15:23.000Z"
}
```

**Error Response (not owner):**
```json
{
  "statusCode": 401,
  "message": "Wallet 0x... does not own SeatSBT 1. Actual owner: 0x..."
}
```

### 2. Get Binding Status

```bash
curl http://localhost:3001/api/seat-binding/status \
  -H "x-seat-id: SEAT_001"
```

**Response:**
```json
{
  "bound": true,
  "userId": "uuid",
  "seatId": "1",
  "role": "CITIZEN",
  "boundAt": "2026-01-19T11:15:23.000Z",
  "onChainStatus": {
    "exists": true,
    "owner": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }
}
```

### 3. Verify Binding

Re-checks on-chain ownership to ensure binding is still valid.

```bash
curl -X POST http://localhost:3001/api/seat-binding/verify \
  -H "x-seat-id: SEAT_001"
```

**Response:**
```json
{
  "userId": "uuid",
  "seatId": "1",
  "valid": true
}
```

### 4. Sync Seats from Blockchain

Discovers all seats owned by a wallet address.

```bash
curl -X POST http://localhost:3001/api/seat-binding/sync \
  -H "Content-Type: application/json" \
  -H "x-seat-id: SEAT_001" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

**Response:**
```json
["1", "42", "103"]
```

## Testing Workflow

### Scenario 1: First-Time Seat Binding

```bash
# 1. User has wallet with SeatSBT #1
WALLET="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
SEAT_ID="1"

# 2. Bind seat to user
curl -X POST http://localhost:3001/api/seat-binding/bind \
  -H "Content-Type: application/json" \
  -H "x-seat-id: SEAT_001" \
  -d "{
    \"seatId\": \"$SEAT_ID\",
    \"walletAddress\": \"$WALLET\"
  }"

# 3. Check status
curl http://localhost:3001/api/seat-binding/status \
  -H "x-seat-id: SEAT_001"

# 4. Verify binding
curl -X POST http://localhost:3001/api/seat-binding/verify \
  -H "x-seat-id: SEAT_001"
```

### Scenario 2: Discover All Seats

```bash
# Find all seats owned by wallet
curl -X POST http://localhost:3001/api/seat-binding/sync \
  -H "Content-Type: application/json" \
  -H "x-seat-id: SEAT_001" \
  -d '{
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

### Scenario 3: Attempt Invalid Binding

```bash
# Try to bind seat you don't own
curl -X POST http://localhost:3001/api/seat-binding/bind \
  -H "Content-Type: application/json" \
  -H "x-seat-id: SEAT_001" \
  -d '{
    "seatId": "999",
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'

# Expected: 401 Unauthorized
```

## Offline Mode

If blockchain is not available, the service will:
- Log warnings
- Return `null` for on-chain queries
- Reject binding attempts with error

Check logs for:
```
[BlockchainService] ✅ Blockchain service initialized
```

Or:
```
[BlockchainService] Blockchain configuration incomplete. Running in offline mode.
```

## Integration with Khural

Once seats are bound, Khural operations can verify legitimacy:

```typescript
// Before assigning seat in Khural
const isValid = await seatBindingService.verifySeatBinding(userId);
if (!isValid) {
  throw new UnauthorizedException('Seat binding invalid');
}
```

## Security Notes

1. **Sybil Protection**: One SeatSBT = One User. Enforced on-chain.
2. **Immutability**: SeatSBT is soulbound (non-transferable).
3. **Verification**: All critical operations should call `verifySeatBinding()`.
4. **Audit Trail**: All binding events are logged with timestamps.

## Next Steps

With seat binding in place:

1. **Module B (ALTAN Transactions)** can now verify sender/receiver legitimacy
2. **Module C (Audit History)** can attribute actions to verified identities
3. **Khural voting** can enforce one-person-one-vote

---

**The identity layer is now sovereign and cryptographically verifiable.**
