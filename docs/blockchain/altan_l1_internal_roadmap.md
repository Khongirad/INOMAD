# ALTAN L1 Internal System Development Plan
## Sovereign Blockchain for Siberian Confederation

**Version**: 2.0 (Refocused on Internal Systems)  
**Date**: January 31, 2026  
**Duration**: 8 weeks (Feb 2 - Mar 30, 2026)  
**Scope**: Core sovereign modules ONLY (no external bridges)

---

## Strategic Pivot: Internal First, Bridges Later

### Phase Separation:

```yaml
Phase 1 (NOW): Sovereign Internal System
  - Duration: 8 weeks
  - Focus: Citizens of Siberian Confederation ONLY
  - Modules: corelaw, tax, khural, banking, land
  - No External Dependencies
  
Phase 2 (LATER): External Bridges
  - Duration: TBD (after Phase 1 complete)
  - Focus: International integration
  - Modules: altanusd (US), altanrub (Russia), altancny (China)
  - Depends on: Phase 1 completion + regulatory approvals
```

**Rationale**:
1. ✅ **Sovereignty First** - Build independent system before depending on external actors
2. ✅ **Faster Launch** - No regulatory delays from US/NY
3. ✅ **User Acquisition** - 145M Siberians can start using immediately
4. ✅ **Negotiation Power** - Working system = better terms with banks later

---

## Core Modules for Sovereign System

### Module 1: x/corelaw (Week 1-2)
**Status**: 70% complete

**Purpose**: Constitutional foundation + network fees

**Features**:
- Store all 37 articles of constitution (✅ done)
- Calculate 0.03% network fee (✅ done)
- FreezeLaw authority (Justice Court only)
- Read-only after genesis (immutable law)

**Remaining Work**:
- Generate protobuf Go code
- Integrate into app.go
- Create query server
- Write unit tests

---

### Module 2: x/tax (Week 2-3)
**Status**: Not started

**Purpose**: Annual 10% tax collection (Article 28)

**Features**:
```go
// Automatic annual tax
type TaxCollector struct {
    Rate          sdk.Dec  // 10% = 0.10
    LastCollection time.Time
    Treasury      sdk.AccAddress
}

// Runs once per year (on anniversary of wallet creation)
func (k Keeper) CollectAnnualTax(ctx sdk.Context, citizen sdk.AccAddress) error {
    balance := k.bankKeeper.GetBalance(ctx, citizen, "ualtan")
    tax := balance.Amount.Mul(TaxRate).Quo(sdk.NewInt(100))
    
    // Transfer to treasury
    return k.bankKeeper.SendCoins(ctx, citizen, Treasury, sdk.NewCoins(tax))
}
```

**Edge Cases**:
- What if balance < tax owed? (partial payment, debt tracking)
- Tax exemptions for minors? (under 18 years old)
- Tax credits for public service?

**Timeline**: 1 week development + 1 week testing

---

### Module 3: x/khural (Week 4-6)
**Status**: Not started

**Purpose**: 5-level governance hierarchy (Articles 16-22)

**Hierarchy**:
```
Arban (10 families)
  ↓
Zun (100 families = 10 Arbans)
  ↓
Myangang (1,000 families = 10 Zuns)
  ↓
Tumen (10,000 families = 10 Myangangs)
  ↓
Republican Khural (Province level)
  ↓
Confederative Khural (National level)
```

**Features**:
```go
type Proposal struct {
    ID          uint64
    Level       KhuralLevel  // ARBAN, ZUN, MYANGANG, TUMEN, REPUBLICAN, CONFEDERATIVE
    Title       string
    Description string
    ProposedBy  sdk.AccAddress
    VotingStart time.Time
    VotingEnd   time.Time
    
    // Voting results
    YesVotes    sdk.Int
    NoVotes     sdk.Int
    Abstain     sdk.Int
    
    Status      ProposalStatus  // PENDING, ACTIVE, PASSED, REJECTED
}

// Electronic voting (Article 22)
func (k Keeper) Vote(ctx sdk.Context, proposalID uint64, voter sdk.AccAddress, vote VoteOption) error {
    // Verify voter eligibility at this Khural level
    if !k.IsMemberOfKhural(ctx, proposalID, voter) {
        return ErrNotEligibleToVote
    }
    
    // Record vote on-chain (immutable, transparent)
    k.SetVote(ctx, proposalID, voter, vote)
    
    // Digital signature for audit trail
    ctx.EventManager().EmitEvent(
        sdk.NewEvent(
            "vote_cast",
            sdk.NewAttribute("proposal_id", proposalID),
            sdk.NewAttribute("voter", voter.String()),
            sdk.NewAttribute("vote", vote.String()),
            sdk.NewAttribute("signature", ctx.TxBytes()),
        ),
    )
}
```

**Subsidiarity Principle** (Article 21):
- Proposals start at lowest competent level
- Escalate only if local Khural cannot resolve
- Example: Road repair → Arban → Zun → Myangang (stop when decided)

**Timeline**: 3 weeks (complex governance logic)

---

### Module 4: x/banking (Week 6-7)
**Status**: Not started

**Purpose**: Central Bank of Altan (Article 25)

**Features**:
```go
type CentralBank struct {
    Governor      sdk.AccAddress
    Board         []sdk.AccAddress  // 5 board members
    
    // Monetary policy
    MaxSupply     sdk.Int  // 2.1 Trillion ALTAN
    CirculatingSupply sdk.Int
    ReserveRatio  sdk.Dec  // For future fractional reserve
    
    // Emergency powers
    CanFreezeMints bool  // In case of crisis
    CanAdjustFees  bool  // Can't change 0.03%, but can adjust cap
}

// Mint new ALTAN (only for government spending)
func (k Keeper) MintForTreasury(
    ctx sdk.Context,
    amount sdk.Coin,
    purpose string,  // e.g., "Infrastructure budget Q1 2026"
) error {
    // 1. Only Governor or Board can mint
    if !k.IsAuthorized(ctx) {
        return ErrUnauthorized
    }
    
    // 2. Check max supply
    current := k.GetCirculatingSupply(ctx)
    max := k.GetMaxSupply(ctx)
    if current.Add(amount.Amount).GT(max) {
        return ErrExceedsMaxSupply
    }
    
    // 3. Require Khural approval for large mints (>1% of supply)
    threshold := max.Quo(sdk.NewInt(100))
    if amount.Amount.GT(threshold) {
        if !k.HasKhuralApproval(ctx, purpose) {
            return ErrRequiresKhuralApproval
        }
    }
    
    // 4. Mint to treasury
    return k.bankKeeper.MintCoins(ctx, ModuleName, sdk.NewCoins(amount))
}
```

**Constraints**:
- Max 2.1 Trillion ALTAN (hard cap, Article 26)
- Minting requires public justification (transparency)
- Large mints (>1% supply) need Khural vote

**Timeline**: 1 week (simpler than Khural, but critical)

---

### Module 5: x/land (Week 7-8)
**Status**: Not started

**Purpose**: Land ownership system (Articles 31-33)

**Features**:
```go
type LandParcel struct {
    ID           string  // GPS coordinates or land registry ID
    OwnerCitizen sdk.AccAddress
    SizeM2       uint64  // Size in square meters
    AcquiredAt   time.Time
    LastTransfer time.Time
    
    // Article 32: Every citizen gets 1 hectare (10,000 m²) free
    IsFreeAllotment bool
}

// Claim free land (once per citizen)
func (k Keeper) ClaimFreeAllotment(
    ctx sdk.Context,
    citizen sdk.AccAddress,
    parcelID string,
) error {
    // 1. Verify citizenship
    if !k.IsCitizen(ctx, citizen) {
        return ErrNotCitizen
    }
    
    // 2. Check if already claimed
    if k.HasClaimedFreeAllotment(ctx, citizen) {
        return ErrAlreadyClaimed
    }
    
    // 3. Verify parcel size ≤ 10,000 m² (1 hectare)
    parcel := k.GetParcel(ctx, parcelID)
    if parcel.SizeM2 > 10_000 {
        return ErrExceedsFreeAllotmentSize
    }
    
    // 4. Verify parcel is unowned
    if !parcel.OwnerCitizen.Empty() {
        return ErrParcelAlreadyOwned
    }
    
    // 5. Transfer ownership
    parcel.OwnerCitizen = citizen
    parcel.IsFreeAllotment = true
    parcel.AcquiredAt = ctx.BlockTime()
    k.SetParcel(ctx, parcel)
    
    // 6. Mark citizen as having claimed
    k.SetHasClaimedFreeAllotment(ctx, citizen, true)
    
    return nil
}

// Buy/sell land (Article 33)
func (k Keeper) TransferLand(
    ctx sdk.Context,
    parcelID string,
    buyer sdk.AccAddress,
    price sdk.Coin,
) error {
    parcel := k.GetParcel(ctx, parcelID)
    seller := parcel.OwnerCitizen
    
    // 1. Both must be citizens (no foreign ownership)
    if !k.IsCitizen(ctx, buyer) || !k.IsCitizen(ctx, seller) {
        return ErrMustBeCitizen
    }
    
    // 2. Transfer payment
    if err := k.bankKeeper.SendCoins(ctx, buyer, seller, sdk.NewCoins(price)); err != nil {
        return err
    }
    
    // 3. Transfer ownership
    parcel.OwnerCitizen = buyer
    parcel.LastTransfer = ctx.BlockTime()
    parcel.IsFreeAllotment = false  // No longer free after first transfer
    k.SetParcel(ctx, parcel)
    
    // 4. Record on blockchain (immutable land registry)
    ctx.EventManager().EmitEvent(
        sdk.NewEvent(
            "land_transferred",
            sdk.NewAttribute("parcel_id", parcelID),
            sdk.NewAttribute("from", seller.String()),
            sdk.NewAttribute("to", buyer.String()),
            sdk.NewAttribute("price", price.String()),
        ),
    )
    
    return nil
}
```

**Key Point**: Land ownership is on-chain → immutable registry, no corruption

**Timeline**: 2 weeks (critical for property rights)

---

## 8-Week Development Schedule

### Week 1 (Feb 2-8): x/corelaw Completion

**Monday-Tuesday**:
- Generate protobuf Go code (`make proto-gen`)
- Fix any compilation errors
- Wire module into app.go

**Wednesday-Thursday**:
- Implement query server (gRPC endpoints)
- Test queries locally (`altand query corelaw article 27`)
- Verify network fee calculation

**Friday**:
- Unit tests (keeper, queries)
- Integration tests (full chain)
- Documentation

**Deliverable**: x/corelaw 100% complete, tested, documented

---

### Week 2 (Feb 9-15): x/tax Development

**Monday-Tuesday**:
- Design tax collection logic
- Protobuf definitions
- Genesis parameters

**Wednesday-Thursday**:
- Implement keeper (CollectAnnualTax, TrackDebt)
- Create tax collector BeginBlocker (runs automatically)
- Handle edge cases (insufficient balance, exemptions)

**Friday**:
- Unit tests
- Simulation tests (100 citizens, 10 years)
- Treasury balance verification

**Deliverable**: x/tax complete, automated collection working

---

### Week 3 (Feb 16-22): x/khural Design

**Monday-Tuesday**:
- Detailed architecture document
- Protobuf schema (Proposal, Vote, KhuralLevel)
- Database schema (who belongs to which Khural)

**Wednesday-Thursday**:
- Design subsidiarity algorithm
- Voting weight calculations
- Proposal lifecycle (submit → vote → execute)

**Friday**:
- Mock implementation (no code, just logic)
- Review with team
- Finalize design

**Deliverable**: x/khural design document approved

---

### Week 4-5 (Feb 23 - Mar 8): x/khural Implementation

**Week 4 (Keeper Layer)**:
- CreateProposal, Vote, TallyVotes
- Membership management (who is in Arban/Zun/etc)
- Escalation logic (Arban → Zun → Myangang)

**Week 5 (Integration)**:
- Connect to x/corelaw (constitutional amendments)
- Connect to x/banking (budget approvals)
- CLI commands (`altand tx khural submit-proposal ...`)

**Deliverable**: x/khural working, can vote on proposals

---

### Week 6 (Mar 9-15): x/banking Development

**Monday-Tuesday**:
- Central Bank structure
- Governor election logic
- Board management

**Wednesday-Thursday**:
- Mint functions (with Khural approval)
- Max supply enforcement (2.1T hard cap)
- Treasury management

**Friday**:
- Emergency powers (pause minting in crisis)
- Audit logs (all mints publicly visible)
- Tests

**Deliverable**: x/banking complete, Central Bank operational

---

### Week 7-8 (Mar 16-29): x/land Development

**Week 7 (Core)**:
- Land parcel structure
- Free allotment claiming (1 hectare per citizen)
- Ownership transfer logic

**Week 8 (Registry)**:
- Import existing land data (if available)
- Create land registry UI (for INOMAD client)
- Verification system (GPS, surveys)

**Deliverable**: x/land complete, citizens can claim/trade land

---

### Week 8 (Mar 30): Integration & Launch Prep

**Final Tasks**:
- ✅ All modules tested together
- ✅ Genesis file prepared (initial parameters)
- ✅ Validator recruitment (10 initial validators)
- ✅ Migration plan from Polygon
- ✅ Public documentation

**Launch Readiness Checklist**:
```yaml
Technical:
  ✅ All 5 modules operational
  ✅ Unit tests passing (>90% coverage)
  ✅ Integration tests passing
  ✅ Security audit (external firm)
  ✅ Load testing (1000 TPS sustained)

Operational:
  ✅ 10 validators ready
  ✅ Faucet for testnet (citizens can get ALTAN)
  ✅ Block explorer deployed
  ✅ Documentation site live

Legal/Governance:
  ✅ Constitutional ratification (Khural vote)
  ✅ Initial treasury funding (1% of max supply)
  ✅ Land registry initial import
```

---

## Migration from Polygon to ALTAN L1

### Two-Phase Migration:

**Phase 1: Soft Launch (Week 9-10)**
- ALTAN L1 testnet live
- Users can create wallets, claim land, vote
- Polygon remains primary (no forced migration)
- Bridge between Polygon ALTAN ↔ ALTAN L1 (1:1 swap)

**Phase 2: Hard Migration (Month 4+)**
- After 3 months of testnet stability
- Announce migration date (30 days notice)
- Snapshot Polygon balances at block X
- Airdrop equivalent ALTAN on L1
- Polygon contract frozen (no new mints)

**User Experience**:
```
Alice has 10,000 ALTAN on Polygon (ERC-20)

Soft Launch:
  - Alice can bridge to L1 anytime (optional)
  - Bridge contract: Burn Polygon ALTAN → Mint L1 ALTAN
  - Takes 10 minutes (finality on both chains)

Hard Migration:
  - Snapshot on March 30, 2026 at 00:00 UTC
  - Alice's Polygon balance: 10,000 ALTAN
  - Alice's L1 balance: 10,000 ALTAN (airdropped)
  - Polygon ALTAN frozen (can still bridge out, but no new mints)
```

---

## Technical Architecture

### Module Dependencies:

```
x/corelaw (foundation)
  ↓
x/tax (depends on corelaw for fee parameters)
  ↓
x/khural (depends on corelaw for constitution, tax for treasury)
  ↓
x/banking (depends on khural for approvals, tax for revenue)
  ↓
x/land (depends on banking for payments, khural for disputes)
```

### Integration with Existing INOMAD Client:

**Backend** (NestJS):
- Add ALTAN L1 RPC endpoints
- Query balance, transactions, proposals
- Submit transactions (vote, claim land, pay tax)

**Frontend** (React):
- Wallet switcher (Polygon vs ALTAN L1)
- Land registry map (view your 1 hectare)
- Khural voting interface
- Tax payment tracker

**Smart Contracts** (Migration):
- Pause new ArbanCreditLine on Polygon
- Recreate credit system on ALTAN L1 (native module)

---

## Success Metrics

### Month 1 (Testnet):
- 1,000 wallets created
- 100 land parcels claimed
- 10 Arban proposals voted on
- 0 critical bugs

### Month 3 (Mainnet Soft Launch):
- 10,000 active users
- $1M ALTAN circulating supply
- 100 validators
- 50 Khural proposals passed

### Month 6 (Full Migration):
- 100,000 active users
- $100M ALTAN circulating supply
- 500 validators
- 1,000 land parcels registered
- 10% annual tax collected successfully

---

## Risk Mitigation

### Technical Risks:

**Risk**: Module bugs cause loss of funds  
**Mitigation**: 
- External security audit (CertiK, Trail of Bits)
- Bug bounty program ($100K total)
- Gradual rollout (testnet → small mainnet → full)

**Risk**: Network downtime during migration  
**Mitigation**:
- Practice migration on testnet 3 times
- 30-day notice period
- Maintain Polygon bridge for 6 months

### Governance Risks:

**Risk**: Khural system abused (vote buying)  
**Mitigation**:
- On-chain vote verification (signatures public)
- Whistleblower protection (anonymous reporting)
- Penalties for vote manipulation (CoreLaw Article 36)

### Economic Risks:

**Risk**: 10% annual tax causes capital flight  
**Mitigation**:
- Tax collected in small increments (not all at once)
- Tax credits for productive activities
- Public goods funded by tax (schools, roads) = visible benefit

---

## Phase 2 Preview: External Bridges (After Week 8)

**Once internal system is stable**, add bridges:

1. **AltanUSD** (US Dollar) - Already designed, needs legal approval
2. **AltanRUB** (Russian Ruble) - Similar to AltanUSD, but with Russian bank
3. **AltanCNY** (Chinese Yuan) - For trade with China
4. **AltanEUR** (Euro) - For European partners

**Key Principle**: Internal ALTAN is sovereign, bridges are optional on-ramps

---

## Conclusion

**Priority**: Build sovereign system first, external bridges second

**Timeline**: 8 weeks to functional ALTAN L1 with all core modules

**Output**: Self-sufficient blockchain for 145M citizens

**Next Step**: Complete x/corelaw integration this weekend (Week 1 kickoff)

---

**Document Status**: Implementation Plan v2.0 - Internal Focus  
**Approved By**: Bair Ivanov, CEO INOMAD INC  
**Start Date**: February 2, 2026  
**Target Launch**: April 1, 2026 (Testnet)
