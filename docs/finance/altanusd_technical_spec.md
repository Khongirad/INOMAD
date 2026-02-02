# AltanUSD Technical Specification (US-Compliant Stablecoin)

**Version**: 1.0  
**Date**: 2026-01-31  
**Compliance**: GENIUS Act (2025), NYDFS Stablecoin Guidance, 23 NYCRR Part 500

---

## Executive Summary

**AltanUSD** is a USD-pegged stablecoin serving as a legal bridge between:
- **US Dollar (USD)** - fiat reserve held in US custodian bank
- **ALTAN Ecosystem** - sovereign L1 blockchain

**Key Characteristics**:
- 1 AltanUSD = $1.00 USD (1:1 peg)
- 100% reserve backing (cash, deposits, T-bills)
- Exclusive mint authority: US partner bank only
- Guaranteed redemption within 2 business days
- Monthly CPA attestations
- Public reserve dashboard

---

## 1. Reserve Management Architecture

### 1.1 Reserve Segregation

```yaml
Legal Structure:
  Reserve Account: Special Purpose Account (SPA)
  Bank: US-licensed custodian bank
  Insurance: FDIC-insured (up to $250K per depositor)
  Jurisdiction: New York or Delaware

Technical Enforcement:
  - Reserve account programmatically isolated from INOMAD INC operational funds
  - No commingling of reserves with corporate treasury
  - Separate accounting ledger
  - Multi-sig wallets (3-of-5) for reserve movements
```

### 1.2 Eligible Reserve Assets

```yaml
Allowed Assets (100% composition):
  1. Cash (USD): 
     - Demand deposits in FDIC-insured banks
     - Money market funds (AAA-rated only)
     
  2. Treasury Bills (T-bills):
     - Maturity: ≤ 90 days
     - Issuer: US Treasury only
     - Credit rating: AAA (sovereign)
     
  3. Ultra-short Government Bonds:
     - Duration: ≤ 3 months
     - Liquidity: Daily redemption available

Prohibited Assets:
  ❌ Corporate bonds
  ❌ Equities
  ❌ Crypto (except AltanUSD itself)
  ❌ Derivatives
  ❌ Real estate
  ❌ Commodities
```

### 1.3 No Rehypothecation Rule

```solidity
// Smart contract enforcement
contract AltanUSDReserve {
    // CRITICAL: Reserves cannot be pledged or lent
    bool public constant REHYPOTHECATION_ALLOWED = false;
    
    modifier noRehypothecation() {
        require(
            !isReservePledged(),
            "Reserves cannot be used as collateral"
        );
        _;
    }
    
    function pledgeReserve() external pure {
        revert("Rehypothecation prohibited by GENIUS Act");
    }
}
```

---

## 2. Mint/Burn Smart Contract Logic

### 2.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER (Alice)                             │
│  Wants to buy 10,000 AltanUSD                               │
└──────────────────────┬──────────────────────────────────────┘
                       │ 1. Wire $10,000
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              US PARTNER BANK (Custodian)                    │
│  - Receives $10,000 USD                                     │
│  - Credits Reserve Account                                  │
│  - Verifies AML/KYC                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │ 2. API call to mint
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         ALTAN L1 BLOCKCHAIN (x/altanusd module)             │
│  - Verifies bank signature                                  │
│  - Checks reserve balance ≥ total_supply + 10,000           │
│  - Mints 10,000 AltanUSD to Alice's wallet                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Exclusive Mint Authority

```go
// x/altanusd/keeper/mint.go
package keeper

import (
    sdk "github.com/cosmos/cosmos-sdk/types"
    "altan/x/altanusd/types"
)

const (
    // CRITICAL: Only this address can mint AltanUSD
    US_BANK_MINT_ADDRESS = "altan1usbankpartner..."
)

type Keeper struct {
    bankKeeper    BankKeeper
    reserveOracle ReserveOracle
}

// Mint - ONLY callable by US partner bank
func (k Keeper) Mint(
    ctx sdk.Context,
    amount sdk.Coin,
    recipient sdk.AccAddress,
    bankTxHash string,  // Wire transfer confirmation
) error {
    // 1. Verify caller is authorized bank
    if !k.IsAuthorizedMinter(ctx, ctx.EventManager()) {
        return types.ErrUnauthorizedMinter
    }
    
    // 2. Verify reserve backing
    currentSupply := k.GetTotalSupply(ctx)
    reserveBalance := k.reserveOracle.GetReserveBalance(ctx)
    
    if reserveBalance.LT(currentSupply.Add(amount.Amount)) {
        return types.ErrInsufficientReserve
    }
    
    // 3. Record wire transfer reference
    k.RecordBankTransaction(ctx, bankTxHash, amount, recipient)
    
    // 4. Mint tokens
    coins := sdk.NewCoins(sdk.NewCoin("ualtanusd", amount.Amount))
    if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, coins); err != nil {
        return err
    }
    
    // 5. Send to recipient
    if err := k.bankKeeper.SendCoinsFromModuleToAccount(
        ctx, types.ModuleName, recipient, coins,
    ); err != nil {
        return err
    }
    
    // 6. Emit event for compliance tracking
    ctx.EventManager().EmitEvent(
        sdk.NewEvent(
            "altanusd_minted",
            sdk.NewAttribute("amount", amount.String()),
            sdk.NewAttribute("recipient", recipient.String()),
            sdk.NewAttribute("bank_tx_hash", bankTxHash),
            sdk.NewAttribute("reserve_balance", reserveBalance.String()),
            sdk.NewAttribute("timestamp", ctx.BlockTime().String()),
        ),
    )
    
    return nil
}

func (k Keeper) IsAuthorizedMinter(ctx sdk.Context, em sdk.EventManager) bool {
    // Extract transaction signer
    signer := getSigner(ctx)
    return signer.String() == US_BANK_MINT_ADDRESS
}
```

### 2.3 Guaranteed Redemption (Burn)

```go
// x/altanusd/keeper/burn.go

const (
    REDEMPTION_DEADLINE_HOURS = 48  // 2 business days
)

type RedemptionRequest struct {
    ID              string
    Holder          sdk.AccAddress
    Amount          sdk.Coin
    BankAccount     string  // Recipient bank account
    Status          RedemptionStatus
    RequestTime     time.Time
    CompletionTime  time.Time
    WireReference   string
}

type RedemptionStatus int
const (
    PENDING RedemptionStatus = iota
    PROCESSING
    COMPLETED
    FAILED
)

// RequestRedemption - User initiates USD withdrawal
func (k Keeper) RequestRedemption(
    ctx sdk.Context,
    holder sdk.AccAddress,
    amount sdk.Coin,
    bankAccount string,
) (string, error) {
    // 1. Verify holder balance
    balance := k.bankKeeper.GetBalance(ctx, holder, "ualtanusd")
    if balance.LT(amount.Amount) {
        return "", types.ErrInsufficientBalance
    }
    
    // 2. Lock AltanUSD tokens (escrow)
    escrowAddr := k.GetEscrowAddress(ctx)
    if err := k.bankKeeper.SendCoins(ctx, holder, escrowAddr, sdk.NewCoins(amount)); err != nil {
        return "", err
    }
    
    // 3. Create redemption request
    requestID := generateRequestID(ctx, holder)
    request := RedemptionRequest{
        ID:          requestID,
        Holder:      holder,
        Amount:      amount,
        BankAccount: bankAccount,
        Status:      PENDING,
        RequestTime: ctx.BlockTime(),
    }
    
    k.SetRedemptionRequest(ctx, request)
    
    // 4. Notify US bank (off-chain)
    k.NotifyBankOfRedemption(ctx, request)
    
    // 5. Emit event
    ctx.EventManager().EmitEvent(
        sdk.NewEvent(
            "redemption_requested",
            sdk.NewAttribute("request_id", requestID),
            sdk.NewAttribute("holder", holder.String()),
            sdk.NewAttribute("amount", amount.String()),
            sdk.NewAttribute("deadline", ctx.BlockTime().Add(48*time.Hour).String()),
        ),
    )
    
    return requestID, nil
}

// CompleteRedemption - Called by bank after wire transfer
func (k Keeper) CompleteRedemption(
    ctx sdk.Context,
    requestID string,
    wireReference string,
) error {
    // 1. Only bank can complete
    if !k.IsAuthorizedMinter(ctx, ctx.EventManager()) {
        return types.ErrUnauthorizedMinter
    }
    
    request, found := k.GetRedemptionRequest(ctx, requestID)
    if !found {
        return types.ErrRedemptionNotFound
    }
    
    // 2. Check deadline compliance
    deadline := request.RequestTime.Add(REDEMPTION_DEADLINE_HOURS * time.Hour)
    if ctx.BlockTime().After(deadline) {
        // Log SLA breach for NYDFS reporting
        k.LogSLABreach(ctx, requestID)
    }
    
    // 3. Burn escrowed tokens
    escrowAddr := k.GetEscrowAddress(ctx)
    coins := sdk.NewCoins(request.Amount)
    if err := k.bankKeeper.SendCoinsFromAccountToModule(
        ctx, escrowAddr, types.ModuleName, coins,
    ); err != nil {
        return err
    }
    
    if err := k.bankKeeper.BurnCoins(ctx, types.ModuleName, coins); err != nil {
        return err
    }
    
    // 4. Update request status
    request.Status = COMPLETED
    request.CompletionTime = ctx.BlockTime()
    request.WireReference = wireReference
    k.SetRedemptionRequest(ctx, request)
    
    // 5. Emit completion event
    ctx.EventManager().EmitEvent(
        sdk.NewEvent(
            "redemption_completed",
            sdk.NewAttribute("request_id", requestID),
            sdk.NewAttribute("wire_reference", wireReference),
            sdk.NewAttribute("processing_time", ctx.BlockTime().Sub(request.RequestTime).String()),
        ),
    )
    
    return nil
}
```

---

## 3. NYDFS 23 NYCRR Part 500 Compliance

### 3.1 Multi-Factor Authentication (MFA)

```yaml
Required MFA for:
  - Bank administrator access to mint function
  - INOMAD admin access to system monitoring
  - Reserve account movements
  - Compliance dashboard access

Implementation:
  - Primary: Hardware security key (YubiKey)
  - Backup: TOTP (Google Authenticator)
  - Session timeout: 15 minutes
  - Re-authentication for sensitive operations
```

### 3.2 Asset Inventory System

```go
// x/altanusd/keeper/inventory.go

type AssetInventory struct {
    Timestamp         time.Time
    TotalSupply       sdk.Int
    ReserveBalance    sdk.Int
    CollateralRatio   sdk.Dec  // Should always be ≥ 1.00
    
    // Bank transactions
    MintTransactions  []MintRecord
    BurnTransactions  []BurnRecord
    
    // Reserve composition
    Cash              sdk.Int
    TBills            sdk.Int
    MoneyMarketFunds  sdk.Int
}

// DailyInventory - Automated snapshot at 00:00 UTC
func (k Keeper) DailyInventory(ctx sdk.Context) AssetInventory {
    supply := k.GetTotalSupply(ctx)
    reserve := k.reserveOracle.GetReserveBalance(ctx)
    
    inventory := AssetInventory{
        Timestamp:       ctx.BlockTime(),
        TotalSupply:     supply,
        ReserveBalance:  reserve,
        CollateralRatio: sdk.NewDecFromInt(reserve).Quo(sdk.NewDecFromInt(supply)),
    }
    
    // Store for audit trail
    k.SetDailyInventory(ctx, inventory)
    
    // Alert if under-collateralized
    if inventory.CollateralRatio.LT(sdk.OneDec()) {
        k.TriggerEmergencyAlert(ctx, inventory)
    }
    
    return inventory
}
```

### 3.3 On-Chain Analytics (AML/Sanctions)

```go
// x/altanusd/keeper/compliance.go

type ComplianceChecker struct {
    SanctionsAPI  SanctionsProvider  // OFAC, UN, EU lists
    RiskScorer    RiskScoringEngine
}

// CheckTransaction - Real-time screening
func (k Keeper) CheckTransaction(
    ctx sdk.Context,
    from sdk.AccAddress,
    to sdk.AccAddress,
    amount sdk.Coin,
) error {
    // 1. Check OFAC sanctions list
    if k.compliance.IsOnSanctionsList(ctx, from) {
        return types.ErrSanctionedAddress
    }
    if k.compliance.IsOnSanctionsList(ctx, to) {
        return types.ErrSanctionedAddress
    }
    
    // 2. Risk scoring
    riskScore := k.compliance.RiskScorer.CalculateRisk(ctx, from, to, amount)
    if riskScore > HIGH_RISK_THRESHOLD {
        // Flag for manual review
        k.FlagForReview(ctx, from, to, amount, riskScore)
    }
    
    // 3. Velocity checks (anti-money laundering)
    dailyVolume := k.GetDailyVolume(ctx, from)
    if dailyVolume.Add(amount.Amount).GT(DAILY_LIMIT) {
        return types.ErrDailyLimitExceeded
    }
    
    return nil
}

// Integration with Chainalysis or Elliptic
func (k Keeper) MonitorBlockchainActivity(ctx sdk.Context) {
    // Periodic batch analysis
    transactions := k.GetRecentTransactions(ctx, 1000)
    
    for _, tx := range transactions {
        report := k.compliance.AnalyzeTransaction(tx)
        if report.IsSuspicious {
            k.FileS AR(ctx, tx, report)  // Suspicious Activity Report
        }
    }
}
```

---

## 4. Transparency & Auditing

### 4.1 Monthly CPA Attestations

```yaml
Audit Firm: Big 4 accounting firm (PwC, Deloitte, EY, KPMG)
Frequency: Monthly
Scope:
  - Verify 100% reserve backing
  - Reconcile on-chain supply with bank balances
  - Review AML/KYC procedures
  - Test redemption process

Deliverables:
  - Attestation report (published within 10 days of month-end)
  - Real-time dashboard update
  - Regulator submission (NYDFS)
```

### 4.2 Public Transparency API

```go
// x/altanusd/types/query.proto
service Query {
    // Public endpoints (no auth required)
    rpc TotalSupply(QueryTotalSupplyRequest) returns (QueryTotalSupplyResponse);
    rpc ReserveBalance(QueryReserveBalanceRequest) returns (QueryReserveBalanceResponse);
    rpc CollateralRatio(QueryCollateralRatioRequest) returns (QueryCollateralRatioResponse);
    rpc LatestAttestation(QueryLatestAttestationRequest) returns (QueryLatestAttestationResponse);
}

message QueryCollateralRatioResponse {
    string ratio = 1;  // e.g., "1.02" (102% collateralized)
    string total_supply = 2;
    string reserve_balance = 3;
    google.protobuf.Timestamp last_updated = 4;
}
```

### 4.3 Real-Time Dashboard

```typescript
// Public dashboard API endpoint
GET https://api.altan.network/altanusd/status

Response:
{
  "total_supply": "150000000000000",  // 150M AltanUSD
  "reserve_usd": "150234567.89",      // $150.23M USD
  "collateral_ratio": "1.0016",       // 100.16%
  "last_attestation": {
    "date": "2026-01-31",
    "auditor": "Deloitte LLP",
    "status": "FULLY_BACKED",
    "report_url": "https://..."
  },
  "reserve_composition": {
    "cash": "50000000.00",            // $50M cash
    "t_bills": "100000000.00",        // $100M T-bills
    "mmf": "234567.89"                // $0.23M money market
  },
  "redemption_stats": {
    "pending_requests": 3,
    "average_processing_time_hours": 18,
    "sla_compliance_rate": "99.8%"
  }
}
```

---

## 5. Priority Claims in Liquidation

### 5.1 Legal Structure

```yaml
Trust Structure:
  Name: AltanUSD Reserve Trust
  Type: Special Purpose Trust (SPT)
  Jurisdiction: New York
  Trustee: US Bank (licensed trust company)
  
Priority Waterfall (insolvency):
  1. AltanUSD holders (pro-rata distribution)
  2. Trust administrative costs
  3. INOMAD INC (residual, if any)
  
Prohibition:
  - Reserve assets cannot be seized for INOMAD INC debts
  - Ring-fenced from bankruptcy estate
```

### 5.2 Smart Contract Enforcement

```solidity
// Liquidation.sol
contract AltanUSDLiquidation {
    address public trustee;
    mapping(address => uint256) public claims;
    
    enum LiquidationStatus {
        OPERATIONAL,
        TRIGGERED,
        DISTRIBUTING,
        COMPLETED
    }
    
    LiquidationStatus public status = LiquidationStatus.OPERATIONAL;
    
    // Triggered by trustee or court order
    function triggerLiquidation() external onlyTrustee {
        require(status == LiquidationStatus.OPERATIONAL, "Already triggered");
        status = LiquidationStatus.TRIGGERED;
        
        // Snapshot all AltanUSD balances
        snapshotHolders();
        
        emit LiquidationTriggered(block.timestamp);
    }
    
    // Pro-rata distribution
    function distributeFunds() external onlyTrustee {
        require(status == LiquidationStatus.TRIGGERED, "Not in liquidation");
        
        uint256 totalReserve = getReserveBalance();
        uint256 totalSupply = getTotalSupply();
        
        // Should always be 1:1, but in crisis could be less
        uint256 recoveryRate = (totalReserve * 1e18) / totalSupply;
        
        for (address holder in holderList) {
            uint256 claim = claims[holder];
            uint256 payout = (claim * recoveryRate) / 1e18;
            
            // Trustee initiates wire transfer to holder
            initiateWireTransfer(holder, payout);
        }
        
        status = LiquidationStatus.DISTRIBUTING;
    }
}
```

---

## 6. Genesis Configuration

```json
{
  "app_state": {
    "altanusd": {
      "params": {
        "authorized_minter": "altan1usbankpartner...",
        "min_collateral_ratio": "1.00",
        "redemption_deadline_hours": 48,
        "daily_limit_per_user": "100000000000",
        "mfa_required": true
      },
      "reserve_oracle": {
        "bank_api_endpoint": "https://bank-api.us/reserve",
        "update_frequency_seconds": 3600
      },
      "compliance": {
        "sanctions_provider": "OFAC",
        "risk_threshold": 75,
        "sar_filing_required": true
      }
    }
  }
}
```

---

## 7. Integration with ALTAN Ecosystem

### 7.1 Use Cases

```
1. USD Bridge:
   User in US → Buys AltanUSD via bank → Uses in ALTAN ecosystem
   
2. Remittances:
   Worker in Siberia → Receives ALTAN salary → Converts to AltanUSD → Sends to family in US
   
3. Settlement:
   International trade → Payment in AltanUSD → Settled in 2 days vs 5-7 days wire
```

### 7.2 Fee Structure

```yaml
Blockchain Protocol Fees:
  Mint: FREE (no blockchain fee)
  Burn/Redeem: FREE (no blockchain fee)
  Transfer: 0.03% network fee (to INOMAD INC treasury)
    - Cap: 1000 ALTAN commission
    - Gas: Separate, no cap (spam protection)
    - Applies to ALL AltanUSD transfers on ALTAN L1

Bank Service Fees (Off-Chain):
  Bid-Ask Spread: 0.10% - 0.30% (set by bank)
    - Example: Customer buys 10,000 AltanUSD
      Wire to bank: $10,015 USD
      Minted: 10,000 AltanUSD (full amount, no deduction)
      Bank keeps: $15 spread
  
  Wire Transfers:
    - Incoming: $15-25 per wire
    - Outgoing: $20-30 per wire
  
  Custody (charged to INOMAD INC):
    - 0.02% annually on reserve balance

Revenue Distribution:
  INOMAD INC:
    - 0.03% network fee on all AltanUSD transfers
    - Projected: $1.5M/year (at $500M supply, 10x velocity)
  
  Bank:
    - 100% of spread revenue (~$5.25M/year)
    - 100% of wire fees (~$1M/year)  
    - 100% of custody fees (~$100K/year)
    - Total: ~$6.35M/year
```

**Key Advantage**: Bank can compete on pricing (adjust spread), offer volume discounts, and bundle services without blockchain constraints.

---

## 8. Roadmap

```yaml
Phase 1 (Q2 2026): Development
  - Smart contract audit (CertiK or Trail of Bits)
  - NYDFS BitLicense application
  - Bank partnership negotiations
  
Phase 2 (Q3 2026): Testnet
  - Deploy on ALTAN testnet
  - Simulated mint/burn with test bank
  - Compliance testing
  
Phase 3 (Q4 2026): Mainnet Launch
  - Regulatory approval
  - Initial mint: $10M AltanUSD
  - Public dashboard live
  - First monthly attestation
  
Phase 4 (Q1 2027): Scale
  - Expand to $100M supply
  - Additional bank partners
  - Exchange listings
```

---

**Document Status**: DRAFT - Technical Specification  
**Next Step**: Bank Partnership Agreement  
**Contact**: INOMAD INC Legal Team
