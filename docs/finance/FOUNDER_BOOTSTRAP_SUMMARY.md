# Founder Bootstrap — Implementation Summary

## Overview

Implemented **Founder Bootstrap System** to enable the first creator to become the first citizen with super-verification rights.

---

## Smart Contract: FounderBootstrap.sol

**Location**: `chain/contracts/FounderBootstrap.sol`  
**Size**: 200+ lines  

### Features

✅ **bootstrapFounder()** — Mint SeatSBT #1 for the founder  
✅ **verifyNewCitizen()** — Founder can verify citizens without 3-person quorum  
✅ **Bootstrap Limits**:
  - Maximum 100 citizens can be verified by founder
  - 90-day time limit for bootstrap phase
  - Auto-expires when limits reached

✅ **View Functions**:
  - `isBootstrapActive()` — Check if bootstrap is still active
  - `getRemainingVerifications()` — How many more citizens founder can verify
  - `getTimeRemaining()` — Time left in bootstrap phase
  - `wasVerifiedByFounder(seatId)` — Check if citizen was founder-verified

### Security

- One-time bootstrap (cannot be repeated)
- Time-bound (90 days) and/or count-bound (100 citizens)
- Fully auditable on-chain
- Uses existing CitizenRegistry for minting

---

## Backend Integration

### founder.service.ts

**Location**: `backend/src/identity/founder.service.ts`  
**Size**: 220+ lines  

**8 Methods**:
1. `isBootstrapActive()` — Check on-chain bootstrap status
2. `getFounderAddress()` — Get founder's wallet address
3. `isFounder(userId)` — Check if user is the founder
4. `getBootstrapStatus()` — Full status: active, verified count, limits
5. `wasVerifiedByFounder(seatId)` — On-chain verification check

### founder.controller.ts

**Location**: `backend/src/identity/founder.controller.ts`  
**Size**: 3 API endpoints  

**Endpoints**:
- `GET /api/founder/status` — Get bootstrap status
- `GET /api/founder/check/:userId` — Check if user is founder
- `GET /api/founder/verified/:seatId` — Check if seat was founder-verified

---

## API Examples

### Get Bootstrap Status

```bash
curl http://localhost:3001/api/founder/status
```

**Response**:
```json
{
  "isActive": true,
  "founder": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "bootstrapped": true,
  "timestamp": 1738044000000,
  "verifiedCount": 5,
  "remainingVerifications": 95,
  "timeRemaining": 7776000
}
```

### Check If User Is Founder

```bash
curl http://localhost:3001/api/founder/check/user123
```

**Response**:
```json
{
  "isFounder": true,
  "status": {
    "isActive": true,
    "verifiedCount": 5,
    "remainingVerifications": 95
  }
}
```

---

## Deployment Script

**Location**: `chain/script/DeployFounderBootstrap.s.sol`

```bash
forge script script/DeployFounderBootstrap.s.sol:DeployFounderBootstrap \
  --rpc-url http://localhost:8545 \
  --broadcast
```

---

## Usage Flow

### 1. Deploy FounderBootstrap Contract

```bash
cd chain
forge script script/DeployFounderBootstrap.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast
```

### 2. Bootstrap Founder (On-Chain)

```solidity
// Call from contract owner
founderBootstrap.bootstrapFounder(
  founderAddress,
  nationId,
  cohortArbadId,
  ethicsHash
);
// Returns seatId = 1
```

### 3. Founder Verifies Citizens

```solidity
// Founder can call this directly
founderBootstrap.verifyNewCitizen(
  citizenAddress,
  nationId,
  cohortArbadId,
  ethicsHash
);
// Bypasses 3-citizen verification requirement
```

### 4. Backend Queries

```typescript
// Check if bootstrap is active
const isActive = await founderService.isBootstrapActive();

// Get founder address
const founder = await founderService.getFounderAddress();

// Check if user is founder
const isFounder = await founderService.isFounder(userId);
```

---

## Next Steps

1. ✅ Founder Bootstrap complete
2. ⏳ Distribution Pool (auto-distribute Altan to verified citizens)
3. ⏳ Sovereign Wealth Fund (pension fund + resource profits)
4. ⏳ Frontend Integration (founder dashboard, verification UI)

---

**Архитектура суверенна. 🏛️**
