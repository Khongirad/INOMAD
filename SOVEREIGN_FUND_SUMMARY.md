# Sovereign Wealth Fund — Implementation Summary

## Overview

Implemented **Sovereign Wealth Fund** (Norway model) to store nation's wealth, track income sources, and provide full transparency.

---

## Smart Contract: SovereignWealthFund.sol

**Location**: `chain/contracts/SovereignWealthFund.sol`  
**Size**: 400+ lines  

### Core Features

✅ **Income Tracking** — 7 sources:
1. `INITIAL_DISTRIBUTION` — Remainder from citizen distribution
2. `RESOURCE_PROFITS` — Oil, gas, minerals
3. `FACTORY_DIVIDENDS` — National enterprises
4. `TAX_REVENUE` — Economic activity
5. `INVESTMENT_RETURNS` — Fund investments
6. `DONATIONS` — Voluntary contributions
7. `OTHER` — Miscellaneous

✅ **Investment Management**:
- Create investments with approval hash
- Track active investments
- Close completed investments
- Full transparency on beneficiaries

✅ **Annual Reporting**:
- Public annual reports
- Balance, received, invested, returns
- IPFS hash for detailed reports
- Democratic accountability

✅ **Emergency Withdrawals**:
- Requires DEFAULT_ADMIN_ROLE
- Multi-sig approval needed
- Should be used rarely
- Full audit trail

### Key Methods

```solidity
// Receive funds
function receiveFunds(IncomeSource source, uint256 amount, string reason);
function deposit(IncomeSource source, uint256 amount, string reason);

// Investments
function createInvestment(name, description, amount, beneficiary, approvalHash);
function closeInvestment(investmentId, finalAmount);

// Reporting
function publishAnnualReport(year, received, invested, returns, reportHash);

// Emergency only
function withdraw(to, amount, reason, approvalHash);
```

### Roles

- **DEFAULT_ADMIN_ROLE** — Full control
- **FUND_MANAGER_ROLE** — Manage funds and investments
- **AUDITOR_ROLE** — Publish annual reports

---

## Backend Integration

### sovereign-fund.service.ts

**Location**: `backend/src/identity/sovereign-fund.service.ts`  
**Size**: 280+ lines  

**6 Methods**:
1. `getCurrentBalance()` — Real-time fund balance
2. `getFundStats()` — Complete statistics
3. `getIncomeBreakdown()` — Income by source
4. `getActiveInvestments()` — Current investments
5. `getAnnualReports()` — Historical reports
6. `getFundOverview()` — Complete dashboard data

### sovereign-fund.controller.ts

**Location**: `backend/src/identity/sovereign-fund.controller.ts`

**6 Public API Endpoints**:
- `GET /api/sovereign-fund/balance` — Current balance
- `GET /api/sovereign-fund/stats` — Fund statistics
- `GET /api/sovereign-fund/income` — Income breakdown
- `GET /api/sovereign-fund/investments` — Active investments
- `GET /api/sovereign-fund/reports` — Annual reports
- `GET /api/sovereign-fund/overview` — Complete overview

---

## API Examples

### Get Fund Balance

```bash
curl http://localhost:3001/api/sovereign-fund/balance
```

**Response**:
```json
{
  "balance": "1250000000000.00"
}
```

### Get Fund Statistics

```bash
curl http://localhost:3001/api/sovereign-fund/stats
```

**Response**:
```json
{
  "balance": "1250000000000.00",
  "totalReceived": "1500000000000.00",
  "totalInvested": "240000000000.00",
  "totalWithdrawn": "0.00",
  "activeInvestments": 5
}
```

### Get Income Breakdown

```bash
curl http://localhost:3001/api/sovereign-fund/income
```

**Response**:
```json
[
  {
    "source": "INITIAL_DISTRIBUTION",
    "sourceId": 0,
    "amount": "827590000000.00"
  },
  {
    "source": "RESOURCE_PROFITS",
    "sourceId": 1,
    "amount": "520000000000.00"
  },
  {
    "source": "FACTORY_DIVIDENDS",
    "sourceId": 2,
    "amount": "152410000000.00"
  }
]
```

### Get Complete Overview

```bash
curl http://localhost:3001/api/sovereign-fund/overview
```

**Response**: Complete fund data including stats, income, investments, reports

---

## Usage Flow

### 1. Deploy Fund

```bash
cd chain
forge script script/DeploySovereignWealthFund.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast
```

### 2. Configure Bank

```solidity
// AltanBankOfSiberia
bankOfSiberia.setSovereignFund(fundAddress);
```

### 3. Transfer Initial Distribution Remainder

```solidity
// After citizen distribution complete
bankOfSiberia.transferToSovereignFund(
  remainingAmount,
  "Initial distribution complete"
);
```

### 4. Receive Resource Profits

```solidity
// From resource extraction contracts
fund.deposit(
  IncomeSource.RESOURCE_PROFITS,
  profitAmount,
  "Q1 2026 oil and gas profits"
);
```

### 5. Create Investment

```solidity
// Fund Manager
fund.createInvestment(
  "Trans-Siberian Railway Modernization",
  "Infrastructure investment",
  50_000_000 * 1e6,  // 50M ALTAN
  infrastructureContract,
  approvalDocHash
);
```

### 6. Publish Annual Report

```solidity
// Auditor
fund.publishAnnualReport(
  2026,
  totalReceivedThisYear,
  totalInvestedThisYear,
  investmentReturns,
  ipfsReportHash
);
```

---

## Public Transparency

### Citizens Can View:
✅ Current fund balance  
✅ Total received (all time)  
✅ Income breakdown by source  
✅ Active investments with details  
✅ Annual reports  
✅ Investment returns  

### Dashboard Widget Example

```
┌────────────────────────────────────────────────┐
│        Суверенный Фонд Благосостояния          │
├────────────────────────────────────────────────┤
│  Общий баланс: 1,250,000,000,000.00 ₳         │
│  На гражданина: 8,620.69 ₳                     │
├────────────────────────────────────────────────┤
│  📊 Источники дохода:                          │
│  • Initial Distribution:   66.1%               │
│  • Resource Profits:       41.6%               │
│  • Factory Dividends:      12.2%               │
│                                                │
│  💼 Активные инвестиции:   5                   │
│  📈 Всего инвестировано:   240B ₳              │
└────────────────────────────────────────────────┘
```

---

## Norway Model Comparison

| Feature | Norway Fund | Siberian Fund |
|---------|-------------|---------------|
| **Transparency** | ✅ Public | ✅ Public blockchain |
| **Income Sources** | Oil, Gas | Resources + Factories + Tax |
| **Investments** | Global stocks | Infrastructure + Projects |
| **Withdrawals** | Parliament vote | Multi-sig admin |
| **Reporting** | Annual | Annual + On-chain |

---

## Next Steps

1. ✅ Founder Bootstrap
2. ✅ Distribution Pool
3. ✅ **Sovereign Wealth Fund** 
4. ⏳ Frontend dashboard integration
5. ⏳ Database tracking
6. ⏳ WebSocket real-time updates

---

**Архитектура суверенна. Богатство прозрачно. 🏛️**
