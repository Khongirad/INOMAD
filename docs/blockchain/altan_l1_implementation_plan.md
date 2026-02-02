# ALTAN L1 Blockchain - Implementation Plan

## 🎯 Overview

**Goal**: Build sovereign ALTAN L1 blockchain on Cosmos SDK  
**Timeline**: 8 weeks to testnet  
**Modules**: 6 custom SDK modules  
**Token**: ALTAN (2.1T max supply)

---

## 📅 Phase 1: Environment Setup (Weekend - Feb 1-2)

### Day 1: Saturday (Feb 1)

#### Morning (4 hours)
- [ ] Install Go 1.21+ and dependencies
- [ ] Install Cosmos SDK tooling (ignite, starport)
- [ ] Set up project structure
- [ ] Initialize git repository

```bash
# Commands
brew install go
go version  # Should be 1.21+

# Install Ignite CLI (recommended for scaffolding)
curl https://get.ignite.com/cli! | bash
ignite version

# Create project
ignite scaffold chain altan --no-module
cd altan
```

#### Afternoon (4 hours)
- [ ] Configure project for ALTAN specifications
- [ ] Update chain config (chain-id, denom)
- [ ] First local run test
- [ ] Commit initial structure

```bash
# Project structure after setup
altan/
├── app/
│   └── app.go           # Main application
├── cmd/
│   └── altand/          # CLI binary
├── proto/               # Protobuf definitions
├── x/                   # Custom modules (empty for now)
├── config.yml           # Ignite config
└── go.mod
```

**Deliverables Day 1**:
- ✅ Working local node
- ✅ ALTAN denomination configured
- ✅ Git repository initialized

---

### Day 2: Sunday (Feb 2)

#### Morning (4 hours)
- [ ] Scaffold x/corelaw module (empty)
- [ ] Define protobuf messages
- [ ] Generate Go code from proto
- [ ] Basic keeper structure

```bash
ignite scaffold module corelaw --dep bank

# Creates:
# x/corelaw/
# ├── keeper/
# ├── types/
# ├── genesis.go
# └── module.go
```

#### Afternoon (4 hours)
- [ ] Write Genesis configuration
- [ ] Test local devnet with custom genesis
- [ ] Document setup process
- [ ] Push to GitHub

**Deliverables Day 2**:
- ✅ x/corelaw module scaffolded
- ✅ Protobuf messages defined
- ✅ Local devnet running
- ✅ Documentation updated

---

## 📅 Phase 2: x/corelaw Module (Week 1 - Feb 3-9)

### Day 3-4: Monday-Tuesday

#### Tasks
- [ ] Define Article structure (proto)
- [ ] Implement state storage (keeper)
- [ ] Add QueryArticle function
- [ ] Add QueryNetworkFee function

```protobuf
// proto/altan/corelaw/v1/corelaw.proto
message Article {
  uint32 article_number = 1;
  string title = 2;
  string content = 3;
  ArticleCategory category = 4;
}

message CoreLawParams {
  uint32 network_fee_bps = 1;  // 3 = 0.03%
  uint32 tax_rate_bps = 2;     // 1000 = 10%
}
```

**Deliverables**:
- ✅ Article proto defined
- ✅ Store/retrieve articles
- ✅ Query endpoints working

---

### Day 5-6: Wednesday-Thursday

#### Tasks
- [ ] Implement FreezeLaw mechanism
- [ ] Add governance integration
- [ ] Write CLI commands
- [ ] Add events for law changes

```go
// x/corelaw/keeper/msg_server.go
func (k msgServer) FreezeLaw(ctx context.Context, msg *types.MsgFreezeLaw) (*types.MsgFreezeLawResponse, error) {
    if k.IsFrozen(ctx) {
        return nil, types.ErrAlreadyFrozen
    }
    
    // Only governance can freeze
    if !k.IsGovernanceProposal(ctx) {
        return nil, types.ErrNotGovernanceProposal
    }
    
    k.SetFrozen(ctx, true)
    k.SetFrozenAt(ctx, ctx.BlockTime())
    
    return &types.MsgFreezeLawResponse{}, nil
}
```

**Deliverables**:
- ✅ Freeze mechanism working
- ✅ CLI commands (query, freeze)
- ✅ Events emitting correctly

---

### Day 7-8: Friday-Saturday

#### Tasks
- [ ] Genesis articles (37 articles)
- [ ] Integration tests
- [ ] Unit tests (80%+ coverage)
- [ ] Documentation

```go
// x/corelaw/genesis.go
func DefaultGenesis() *GenesisState {
    return &GenesisState{
        Params: DefaultParams(),
        Articles: []Article{
            {ArticleNumber: 1, Title: "Принцип человечности", ...},
            {ArticleNumber: 26, Title: "ALTAN как валюта", ...},
            {ArticleNumber: 27, Title: "Сетевой сбор 0.03%", ...},
            // ... all 37 articles
        },
        IsFrozen: false,
    }
}
```

**Deliverables Week 1**:
- ✅ Complete x/corelaw module
- ✅ 37 articles in genesis
- ✅ Tests passing
- ✅ Documentation complete

---

## 📅 Phase 3: x/citizen + x/arban (Week 2 - Feb 10-16)

### x/citizen Module (Days 9-11)

#### Tasks
- [ ] Scaffold x/citizen module
- [ ] Define Citizen proto
- [ ] Implement registration
- [ ] Implement verification levels
- [ ] Census tracking

```protobuf
// proto/altan/citizen/v1/citizen.proto
message Citizen {
  string id = 1;
  string wallet_address = 2;
  CitizenStatus status = 3;
  VerificationLevel verification = 4;
  string arban_id = 5;
}

message CensusData {
  uint64 total_citizens = 1;
  uint64 total_arbans = 2;
  uint64 verified_citizens = 3;
}
```

**Deliverables**:
- ✅ Citizen registration
- ✅ Verification system
- ✅ Census queries

---

### x/arban Module (Days 12-14)

#### Tasks
- [ ] Scaffold x/arban module
- [ ] Family arban type
- [ ] Organizational arban type
- [ ] Member management
- [ ] Hierarchy queries

```protobuf
// proto/altan/arban/v1/arban.proto
message Arban {
  string id = 1;
  ArbanType type = 2;  // FAMILY or ORGANIZATIONAL
  string name = 3;
  repeated Member members = 4;
  string khural_id = 5;
  uint64 created_at = 6;
}

message Member {
  string citizen_id = 1;
  MemberRole role = 2;  // HEAD, MEMBER, etc.
}
```

**Deliverables Week 2**:
- ✅ x/citizen module complete
- ✅ x/arban module complete
- ✅ Integration between modules
- ✅ Tests for both modules

---

## 📅 Phase 4: x/khural (Week 3 - Feb 17-23)

### 4-Level Democratic Hierarchy

#### Days 15-17: Core Structure
- [ ] Scaffold x/khural module
- [ ] Define 4 levels (Arban, Zun, Myangan, Tumen)
- [ ] Proposal creation
- [ ] Voting mechanism

```protobuf
// proto/altan/khural/v1/khural.proto
enum KhuralLevel {
  ARBAN = 0;    // 10 families
  ZUN = 1;      // 100 families
  MYANGAN = 2;  // 1,000 families
  TUMEN = 3;    // 10,000 families
}

message Khural {
  string id = 1;
  KhuralLevel level = 2;
  string name = 3;
  repeated string representatives = 4;
  uint64 population = 5;
}

message Proposal {
  uint64 id = 1;
  string title = 2;
  KhuralLevel level = 3;
  ProposalStatus status = 4;
  VotingResults results = 5;
}
```

#### Days 18-19: Voting Logic
- [ ] Weighted voting (by population)
- [ ] Quorum checking (40%)
- [ ] Threshold calculation (51%)
- [ ] Veto mechanism (33.4%)

```go
// x/khural/keeper/voting.go
func (k Keeper) TallyVotes(ctx context.Context, proposalId uint64) (*VotingResult, error) {
    proposal := k.GetProposal(ctx, proposalId)
    votes := k.GetVotes(ctx, proposalId)
    
    totalWeight := k.GetTotalVotingWeight(ctx, proposal.Level)
    
    var yesWeight, noWeight, abstainWeight sdk.Int
    for _, vote := range votes {
        weight := k.GetVotingWeight(ctx, vote.Voter, proposal.Level)
        switch vote.Option {
        case VoteYes:
            yesWeight = yesWeight.Add(weight)
        case VoteNo:
            noWeight = noWeight.Add(weight)
        case VoteAbstain:
            abstainWeight = abstainWeight.Add(weight)
        }
    }
    
    participationRate := yesWeight.Add(noWeight).Add(abstainWeight).Quo(totalWeight)
    
    // Check quorum (40%)
    if participationRate.LT(sdk.NewDecWithPrec(40, 2)) {
        return &VotingResult{Status: ProposalRejected, Reason: "Quorum not reached"}, nil
    }
    
    // Check threshold (51%)
    yesRate := yesWeight.Quo(yesWeight.Add(noWeight))
    if yesRate.GT(sdk.NewDecWithPrec(51, 2)) {
        return &VotingResult{Status: ProposalPassed}, nil
    }
    
    return &VotingResult{Status: ProposalRejected}, nil
}
```

#### Days 20-21: Integration
- [ ] Connect with x/citizen (voter eligibility)
- [ ] Connect with x/arban (representation)
- [ ] CLI commands
- [ ] Tests

**Deliverables Week 3**:
- ✅ x/khural 4-level hierarchy
- ✅ Proposal system
- ✅ Voting mechanism
- ✅ Full integration with citizen/arban

---

## 📅 Phase 5: x/centralbank + x/banking (Week 4 - Feb 24 - Mar 2)

### x/centralbank Module (Days 22-24)

#### Tasks
- [ ] Scaffold x/centralbank
- [ ] Emission control
- [ ] Daily limits enforcement
- [ ] Bank licensing
- [ ] Reserve requirements

```protobuf
// proto/altan/centralbank/v1/centralbank.proto
message MonetaryPolicy {
  string max_supply = 1;  // 2.1T
  string total_supply = 2;
  uint64 daily_emission_limit = 3;
  uint64 official_rate_bps = 4;  // vs USD
}

message LicensedBank {
  uint64 id = 1;
  string name = 2;
  string address = 3;
  BankStatus status = 4;
  uint64 reserve_requirement_bps = 5;
}
```

**Deliverables**:
- ✅ Emission control working
- ✅ Bank licensing system
- ✅ Reserve requirements enforced

---

### x/banking Module (Days 25-28)

#### Tasks
- [ ] Scaffold x/banking
- [ ] Citizen accounts
- [ ] Institutional accounts
- [ ] Guardian protection
- [ ] Transfer with fees (0.03%)

```go
// x/banking/keeper/transfer.go
func (k Keeper) Transfer(ctx context.Context, from, to string, amount sdk.Coins) error {
    // Get network fee from corelaw
    feeBPS := k.corelawKeeper.GetNetworkFeeBPS(ctx)
    
    // Calculate fee
    fee := amount.MulInt(sdk.NewInt(int64(feeBPS))).QuoInt(sdk.NewInt(10000))
    
    // Transfer main amount
    if err := k.bankKeeper.SendCoins(ctx, from, to, amount); err != nil {
        return err
    }
    
    // Collect fee to treasury
    if err := k.bankKeeper.SendCoins(ctx, from, k.GetTreasury(ctx), fee); err != nil {
        return err
    }
    
    return nil
}
```

**Deliverables Week 4**:
- ✅ x/centralbank complete
- ✅ x/banking complete
- ✅ Fee system working
- ✅ All 6 modules integrated

---

## 📅 Phase 6: Integration & Testing (Week 5-6 - Mar 3-16)

### Week 5: Integration Testing

#### Tasks
- [ ] End-to-end test scenarios
- [ ] Multi-module integration tests
- [ ] Genesis file generation
- [ ] Performance testing

```yaml
Test Scenarios:
1. Citizen registers → Joins arban → Votes
2. Central bank emits → Bank receives → Transfer with fee
3. Proposal created → Voted → Executed
4. Law frozen → No more changes
5. Multi-sig bank operations
```

#### Performance Targets
```yaml
Block Time: 3 seconds
TPS: 1,000+ transactions
Finality: 6 seconds (2 blocks)
```

---

### Week 6: Final Testing

#### Tasks
- [ ] Security review (internal)
- [ ] Fix critical bugs
- [ ] Update documentation
- [ ] Prepare testnet deployment

**Deliverables Week 5-6**:
- ✅ All integration tests pass
- ✅ Performance targets met
- ✅ Documentation complete
- ✅ Ready for testnet

---

## 📅 Phase 7: Testnet Launch (Week 7-8 - Mar 17-30)

### Week 7: Testnet Preparation

#### Tasks
- [ ] Set up testnet infrastructure
- [ ] Configure 5 genesis validators
- [ ] Deploy explorer
- [ ] Create faucet
- [ ] Write validator guide

```yaml
Infrastructure:
- 5 Validator nodes (cloud)
- 3 RPC nodes
- 1 Archive node
- 1 Explorer
- 1 Faucet
```

---

### Week 8: Launch

#### Tasks
- [ ] Genesis ceremony
- [ ] Validator onboarding
- [ ] Public testnet launch
- [ ] Community announcement
- [ ] Monitor and fix issues

**Deliverables Week 7-8**:
- ✅ ALTAN testnet live
- ✅ Explorer running
- ✅ Faucet working
- ✅ 5+ validators active

---

## 📋 Daily Task Checklist

### This Weekend (Feb 1-2)

**Saturday Feb 1**:
```
[ ] 09:00 - Install Go 1.21+
[ ] 09:30 - Install Ignite CLI
[ ] 10:00 - Scaffold altan chain
[ ] 11:00 - Configure chain-id and denom
[ ] 12:00 - Lunch
[ ] 13:00 - First local run test
[ ] 14:00 - Basic genesis configuration
[ ] 15:00 - Git repository setup
[ ] 16:00 - Push initial commit
[ ] 17:00 - Document setup process
```

**Sunday Feb 2**:
```
[ ] 09:00 - Scaffold x/corelaw module
[ ] 10:00 - Define proto messages
[ ] 11:00 - Generate Go code
[ ] 12:00 - Lunch
[ ] 13:00 - Basic keeper functions
[ ] 14:00 - Genesis with params
[ ] 15:00 - Test local devnet
[ ] 16:00 - Debug and fix issues
[ ] 17:00 - Final commit + documentation
```

---

## 📊 Success Criteria

### Phase 1 (Weekend)
- ✅ `altand start` runs without errors
- ✅ ALTAN token denomination configured
- ✅ x/corelaw module scaffolded

### Phase 2 (Week 1)
- ✅ `altand query corelaw article 27` returns network fee
- ✅ FreezeLaw governance proposal works
- ✅ 80%+ test coverage

### Phase 3 (Week 2)
- ✅ Citizens can register and join arbans
- ✅ Census query returns correct data
- ✅ Arban hierarchy queries work

### Phase 4 (Week 3)
- ✅ 4-level Khural structure functional
- ✅ Proposals can be created and voted
- ✅ Voting weights calculated correctly

### Phase 5 (Week 4)
- ✅ Central bank can emit tokens
- ✅ Bank accounts work
- ✅ 0.03% fee collected on transfers

### Phase 6 (Week 5-6)
- ✅ All e2e tests pass
- ✅ 1000+ TPS achieved
- ✅ Documentation complete

### Phase 7-8 (Testnet)
- ✅ Testnet running stable for 24h+
- ✅ 5+ validators active
- ✅ Community using testnet

---

## 🛠️ Tools & Resources

### Development
```bash
# Required tools
go version          # 1.21+
ignite version      # Latest
protoc version      # 3.x
docker version      # For local testing
```

### Documentation
- [Cosmos SDK Docs](https://docs.cosmos.network/)
- [Ignite CLI Docs](https://docs.ignite.com/)
- [CometBFT Docs](https://docs.cometbft.com/)

### Repositories
```
github.com/altan-confederation/altan       # Main chain
github.com/altan-confederation/explorer    # Block explorer
github.com/altan-confederation/faucet      # Testnet faucet
github.com/altan-confederation/docs        # Documentation
```

---

## 📁 Project Structure (Final)

```
altan/
├── app/
│   ├── app.go              # Main application
│   ├── genesis.go          # Genesis handling
│   └── keepers.go          # Keeper injection
├── cmd/
│   └── altand/
│       └── main.go         # CLI entry
├── proto/
│   └── altan/
│       ├── corelaw/v1/
│       ├── citizen/v1/
│       ├── arban/v1/
│       ├── khural/v1/
│       ├── centralbank/v1/
│       └── banking/v1/
├── x/
│   ├── corelaw/
│   │   ├── keeper/
│   │   ├── types/
│   │   ├── genesis.go
│   │   └── module.go
│   ├── citizen/
│   ├── arban/
│   ├── khural/
│   ├── centralbank/
│   └── banking/
├── testutil/
├── scripts/
├── docs/
├── config.yml
├── go.mod
└── README.md
```

---

## 🚨 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Module complexity | Start simple, iterate |
| Integration issues | Test after each module |
| Performance problems | Profile early |
| Security vulnerabilities | Internal review + audit |
| Validator availability | Start with 5 trusted |

---

## 📞 Support Channels

- **Technical issues**: GitHub Issues
- **Questions**: Discord #dev-chat
- **Urgent**: Direct message to lead dev

---

**Document Version**: 1.0  
**Created**: 2026-01-31  
**Target Completion**: 2026-03-30 (Testnet)

Ready to start this weekend! 🚀
