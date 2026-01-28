# Distribution Pool — Implementation Summary

## Overview

Implemented **Distribution Pool System** in AltanBankOfSiberia for automatic ALTAN distribution to verified citizens.

---

## Smart Contract Modifications: AltanBankOfSiberia.sol

**Modified**: `chain/contracts/AltanBankOfSiberia.sol`  
**Lines Added**: ~70 lines

### New State Variables

```solidity
// Distribution Pool (for distributing to new citizens)
address public distributionPool;

// Sovereign Wealth Fund (pension fund - remainder goes here)
address public sovereignFund;

// Citizen distribution tracking
uint256 public perCitizenAmount;           // Initial amount per verified citizen
uint256 public totalDistributed;           // Total distributed to citizens
mapping(uint256 => bool) public hasReceivedDistribution;  // seatId => received
```

### New Methods

✅ **setDistributionPool(address)** — Set distribution pool address  
✅ **setSovereignFund(address)** — Set sovereign fund address  
✅ **setPerCitizenAmount(uint256)** — Set per-citizen distribution amount

✅ **distributeToNewCitizen(seatId, accountId)** — Distribute ALTAN to verified citizen  
  - Auto-called when citizen becomes verified
  - Checks if already received
  - Transfers from distributionPool to citizen wallet
  - Tracks distribution in mapping

✅ **transferToSovereignFund(amount, reason)** — Transfer remainder to pension fund  
  - Called after initial distribution complete
  - Transfers from distributionPool to sovereignFund
  - Emits event for transparency

### New Events

```solidity
event DistributionPoolSet(address indexed oldPool, address indexed newPool);
event SovereignFundSet(address indexed oldFund, address indexed newFund);
event PerCitizenAmountSet(uint256 oldAmount, uint256 newAmount);
event CitizenDistributed(uint256 indexed seatId, uint256 indexed accountId, uint256 amount);
event FundTransferred(address indexed fund, uint256 amount, string reason);
```

---

## Backend Integration

### citizen-distribution.service.ts

**Location**: `backend/src/identity/citizen-distribution.service.ts`  
**Size**: 220 lines  

**6 Methods**:
1. `hasReceivedDistribution(seatId)` — Check if citizen received distribution
2. `getPerCitizenAmount()` — Get distribution amount
3. `getTotalDistributed()` — Get total distributed
4. `getDistributionPoolAddress()` — Get pool address
5. `getDistributionStatus()` — Complete status for dashboard
6. `checkEligibility(userId)` — Check if user eligible

### distribution.controller.ts

**Location**: `backend/src/identity/distribution.controller.ts`  
**Size**: 3 API endpoints  

**Endpoints**:
- `GET /api/distribution/status` — Get distribution status
- `GET /api/distribution/received/:seatId` — Check if received
- `GET /api/distribution/eligibility/:userId` — Check eligibility

---

## API Examples

### Get Distribution Status

```bash
curl http://localhost:3001/api/distribution/status
```

**Response**:
```json
{
  "perCitizenAmount": "17241.00",
  "totalDistributed": "172410.00",
  "distributionPool": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  "sovereignFund": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
}
```

### Check Eligibility

```bash
curl http://localhost:3001/api/distribution/eligibility/user123
```

**Response**:
```json
{
  "eligible": true,
  "seatId": "5"
}
```

---

## Usage Flow

### 1. Setup Distribution Pool

```solidity
// Bank Chairman configures
bankOfSiberia.setDistributionPool(poolAddress);
bankOfSiberia.setSovereignFund(fundAddress);
bankOfSiberia.setPerCitizenAmount(17_241 * 1e6);  // 17,241 ALTAN
```

### 2. Citizen Gets Verified

```typescript
// Backend detects verification
const { eligible, seatId } = await distributionService.checkEligibility(userId);

if (eligible) {
  // Call smart contract (requires OFFICER_ROLE)
  await bankOfSiberia.distributeToNewCitizen(seatId, accountId);
}
```

### 3. Transfer Remainder to Fund

```solidity
// After initial distribution complete
bankOfSiberia.transferToSovereignFund(
  remainingAmount,
  "Initial distribution complete"
);
```

---

## Monetary Flow

```
┌─────────────────────────────────────────────────────┐
│           Центральный Банк Сибири                   │
│  emitToBank() → corrAccount                         │
└───────────────────────┬─────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│              Банк Сибири                            │
│  corrAccount → distributionPool                     │
└───────────────────────┬─────────────────────────────┘
                        │
        ┌───────────────┴──────────────┐
        │                              │
        ▼                              ▼
┌──────────────────┐      ┌────────────────────────┐
│ Citizen Wallets  │      │ Sovereign Wealth Fund  │
│ (verified only)  │      │ (remainder + profits)  │
└──────────────────┘      └────────────────────────┘
```

---

## Integration Points

### On Citizen Verification
```typescript
// When citizen verification completes:
if (verificationStatus === 'VERIFIED') {
  const eligible = await distributionService.checkEligibility(userId);
  if (eligible && !await distributionService.hasReceivedDistribution(seatId)) {
    // Trigger distribution (requires officer signature)
    // bankOfSiberia.distributeToNewCitizen(seatId, accountId)
  }
}
```

### Dashboard Display
```typescript
const status = await distributionService.getDistributionStatus();
// Show: perCitizenAmount, totalDistributed, fund balance
```

---

## Next Steps

1. ✅ Founder Bootstrap complete
2. ✅ Distribution Pool complete
3. ⏳ **Sovereign Wealth Fund contract** (P1)
4. ⏳ Frontend integration (dashboard widgets)

---

**Архитектура суверенна. 🏛️**
