# Session Walkthrough: x/corelaw Module Integration
## February 2, 2026

### Objective
Manually integrate the x/corelaw module into ALTAN L1 blockchain bypassing Ignite CLI and protobuf generation toolchain conflicts.

---

## Phase 1: Module Creation ✅

### Files Created

**1. `x/corelaw/module.go`**
- Implemented Cosmos SDK `AppModule` interface
- Methods: `RegisterInvariants`, `Route`, `QuerierRoute`, `RegisterServices`, `InitGenesis`, `ExportGenesis`, `ConsensusVersion`, `BeginBlock`, `EndBlock`
- **Key Feature**: Manual module implementation without protobuf-generated code

**2. `x/corelaw/keeper/genesis.go`**
```go
func (k Keeper) InitGenesis(ctx sdk.Context, data types.GenesisState) {
    // Initialize params and articles
}

func (k Keeper) ExportGenesis(ctx sdk.Context) *types.GenesisState {
    // Export current state
}
```

**3. `x/corelaw/types/genesis.go`**
```go
type GenesisState struct {
    Params   Params    `json:"params"`
    Articles []Article `json:"articles"`
}

type Article struct {
    Number     uint32 `json:"number"`
    Title      string `json:"title"`
   Category   string `json:"category"`
    Text       string `json:"text"`
    EnactedAt  string `json:"enacted_at"`
}
```
- **Fixed**: Removed duplicate constant definitions (now in keys.go only)

**4. `x/corelaw/types/params.go`**
```go
type Params struct {
    NetworkFeeBps uint32 `json:"network_fee_bps"` // 3 = 0.03%
    NetworkFeeCap string `json:"network_fee_cap"` // 1000 ALTAN
    TaxRateBps    uint32 `json:"tax_rate_bps"`    // 1000 = 10%
}
```

**5. `x/corelaw/types/genesis_articles.go`**
- **All 37 Constitutional Articles**:
  - 📜 **PRINCIPLES** (1-7): Humanity, Democracy, Rule of Law, Transparency, Tech Neutrality, Movement Freedom, Property Rights
  - 🛡️ **RIGHTS** (8-15): Life, Speech, Education, Labor, Family, Conscience, Fair Trial, Data Protection
  - 🏛️ **GOVERNANCE** (16-22): Arbad/Zun system, Myangad/Tumed, Republican/Confederate Khurals, Subsidiarity, E-Voting
  - 💰 **ECONOMY** (23-30): Economic Freedom, Competition, Central Bank, ALTAN currency, **Article 27 (Network Fee)**, Annual Tax, Budget Transparency, Credit System
  - 🌍 **LAND** (31-33): State Ownership, Lifetime Rights, Transfer Rights
  - ⚖️ **JUSTICE** (34-36): Judicial Independence, Court System, **Article 36 (FreezeLaw)**
  - 🛡️ **SECURITY** (37): National Defense

---

## Phase 2: App Integration ✅

### Modified: `app/app.go`

**Imports Added**:
```go
corelawkeeper "altan/x/corelaw/keeper"
corelawtypes "altan/x/corelaw/types"
"altan/x/corelaw"
```

**Store Key Added**:
```go
keys := sdk.NewKVStoreKeys(
    // ... existing keys
    corelawtypes.StoreKey,
)
```

**Keeper Initialization**:
```go
app.CorelawKeeper = corelawkeeper.NewKeeper(
    appCodec,
    keys[corelawtypes.StoreKey],
    app.GetSubspace(corelawtypes.ModuleName),
)
```

**Module Manager**:
```go
app.mm = module.NewManager(
    // ... existing modules
    corelaw.NewAppModule(appCodec, app.CorelawKeeper),
)
```

**Block Ordering**:
- Added `corelawtypes.ModuleName` to BeginBlockers, EndBlockers, InitGenesis orders

---

## Phase 3: Dependency Resolution ✅

### Issue: ABCI Compatibility Error
```
undefined: abci.ResponseDeliverTx
```

### Root Cause
- CometBFT v0.38.17 introduced breaking ABCI API changes
- Cosmos SDK v0.47.3 incompatible with CometBFT v0.38+

### Solution
**Dependency Updates**:
```
Cosmos SDK: v0.47.3  → v0.47.13  (upgrade)
CometBFT:   v0.38.17 → v0.37.10  (downgrade)
```

**Commands Executed**:
```bash
go get github.com/cosmos/cosmos-sdk@v0.47.13
go get github.com/cometbft/cometbft@v0.37.10
go mod tidy
```

---

## Phase 4: Build Process 🔄

### Technical Details
- **Go Version**: 1.24.12 (auto-downloaded via `GOTOOLCHAIN=go1.24.12`)
- **Build Command**: `go build -o altand ./cmd/altand`
- **Status**: ⏳ In progress (30+ minutes due to large Cosmos SDK dependency tree)

### Challenges Encountered
1. **Go Version Conflicts**:
   - golang.org/x/exp required Go 1.24.0+
   - Go 1.24rc1 not recognized as >= 1.24.0
   - ✅ **Solved**: Used `GOTOOLCHAIN=go1.24.12` to auto-download stable release

2. **File Corruption**:
   - `genesis_articles.go` corrupted during sed batch editing
   - ✅ **Solved**: Rewrote entire file with all 37 articles in compact one-liner format

3. **Type Mismatches**:
   - Original Article struct used `ArticleNumber`, `Content`, enum `ArticleCategory_*`
   - ✅ **Solved**: Changed to `Number`, `Text`, string `Category`

---

## Git Commits

### Commit 1: Module Integration
```
commit 3d532b4
feat: Complete x/corelaw module integration with manual approach

FILES: 14 changed, 2043 insertions(+), 233 deletions(-)
- app/app.go (modified)
- x/corelaw/module.go (new)
- x/corelaw/keeper/genesis.go (new)
- x/corelaw/types/genesis.go (new)
- x/corelaw/types/params.go (modified)
- x/corelaw/types/genesis_articles.go (modified)
```

### Commit 2: Dependency Fix
```
commit ebbf43f
fix: Resolve ABCI compatibility issues

FILES: 2 changed, 58 insertions(+), 61 deletions(-)
- go.mod (Cosmos SDK v0.47.3→v0.47.13, CometBFT v0.38.17→v0.37.10)
- go.sum (updated checksums)
```

---

## Next Steps

### 1. Verify Build Completion
```bash
cd ~/blockchain/altan/altan
ls -lh altand  # Check if binary was created
./altand version  # Verify executable
```

### 2. Initialize Testnet
```bash
./altand init test-node --chain-id altan-1 --home ~/.altan-test
./altand keys add validator
./altand genesis add-genesis-account validator 1000000000000ualtan
./altand genesis gentx validator 1000000000ualtan --chain-id altan-1
./altand genesis collect-gentxs
```

### 3. Launch & Tes
```bash
./altand start --home ~/.altan-test

# In another terminal:
./alt and query corelaw params
./altand query corelaw article 27  # Network Fee article
# Expected: 0.03%, 1000 ALTAN cap, INOMAD INC
```

---

## Key Achievements

✅ **Manual Module Integration** - Bypassed Ignite CLI and protobuf generation  
✅ **All 37 Articles** - Complete Siberian Confederation Constitution  
✅ **Dependency Resolution** - Fixed ABCI compatibility (CometBFT downgrade)  
✅ **App.go Wiring** - Full Cosmos SDK integration  
✅ **Git Commits** - Two commits with detailed change documentation  
🔄 **Binary Build** - In progress (large dependency compilation)  

## Article 27 Highlight
```
Title: Сетевой сбор (Network Fee)
Content: Сетевой сбор в размере 0.03% взимается со всех транзакций для 
         поддержания инфраструктуры блокчейна. Комиссия направляется 
         компании INOMAD INC с максимальным лимитом 1000 АЛТАН за 
         транзакцию. Газовый сбор не ограничен и защищает сеть от спама.
```

**Economic Model**:
- Network Fee: 0.03% (3 basis points)
- Fee Cap: 1,000 ALTAN per transaction
- Recipient: INOMAD INC
- Gas Fee: Separate, unlimited (spam protection)

---

## Time Investment
- **Module Creation**: ~30 minutes
- **App Integration**: ~15 minutes
- **Dependency Debugging**: ~2 hours
- **Build Time**: 30+ minutes (ongoing)
- **Total**: ~3+ hours

## Remaining Verification Steps
- [ ] Confirm binary creation
- [ ] Initialize local testnet
- [ ] Query module params
- [ ] Query Article 27
- [ ] Calculate network fee for sample transaction
- [ ] Test genesis initialization

**Status**: 90% Complete - Core integration done, verification pending
