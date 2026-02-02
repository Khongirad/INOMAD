# Weekend Task: Complete x/corelaw Module
## Feb 1-2, 2026 (Saturday-Sunday)

**Goal**: Finish x/corelaw integration and test on local testnet  
**Time Estimate**: 4-6 hours  
**Priority**: HIGH (blocks all other modules)

---

## Current Status

```yaml
✅ Completed (70%):
  - Protobuf definitions (4 files)
  - Keeper implementation (3 files)
  - Types package (4 files)
  - 37 constitutional articles
  - Go 1.21 compatibility fix

🟡 In Progress (30%):
  - Protobuf code generation
  - App.go integration
  - Query server
  - Unit tests
  - Local testnet launch
```

---

## Task Checklist

### Task 1: Generate Protobuf Code (30 min)

**Commands**:
```bash
cd ~/blockchain/altan/altan

# Clean previous builds
rm -rf .ignite/
make clean

# Generate protobuf Go code
make proto-gen
# OR if makefile doesn't exist:
ignite chain serve --reset-once
```

**Expected Output**:
```
✔ Building proto...
✔ Generated Go code for proto files
```

**Troubleshooting**:
- If `make proto-gen` not found → Use `ignite chain serve`
- If protoc errors → Check proto file syntax
- If import errors → Verify go.mod has cosmos dependencies

**Verification**:
```bash
# Check generated files exist
ls -la x/corelaw/types/*.pb.go
# Should see: article.pb.go, params.pb.go, genesis.pb.go, query.pb.go

# Check Go build
go build ./x/corelaw/...
# Should compile without errors
```

---

### Task 2: Wire Module into app.go (45 min)

**File**: `app/app.go`

**Step 1**: Add import
```go
// Around line 50, with other imports
corelawkeeper "altan/x/corelaw/keeper"
corelawtypes "altan/x/corelaw/types"
```

**Step 2**: Add keeper to App struct
```go
// Around line 150, in type AltanApp struct
type AltanApp struct {
    // ... existing keepers ...
    
    CorelawKeeper corelawkeeper.Keeper  // ADD THIS
    
    // ... rest of struct ...
}
```

**Step 3**: Initialize keeper
```go
// Around line 300, in NewAltanApp function

// Initialize corelaw keeper
app.CorelawKeeper = corelawkeeper.NewKeeper(
    appCodec,
    keys[corelawtypes.StoreKey],
    app.GetSubspace(corelawtypes.ModuleName),
)
```

**Step 4**: Add to module manager
```go
// Around line 400, in app.mm = module.NewManager(...)

app.mm = module.NewManager(
    // ... existing modules ...
    
    corelaw.NewAppModule(appCodec, app.CorelawKeeper),  // ADD THIS
)
```

**Step 5**: Add to module order
```go
// Around line 450, SetOrderBeginBlockers

app.mm.SetOrderBeginBlockers(
    // ... existing modules ...
    corelawtypes.ModuleName,  // ADD THIS
)

// And in SetOrderEndBlockers
app.mm.SetOrderEndBlockers(
    // ... existing modules ...
    corelawtypes.ModuleName,  // ADD THIS
)
```

**Verification**:
```bash
go build ./app/...
# Should compile without errors
```

---

### Task 3: Implement Query Server (45 min)

**File**: `x/corelaw/keeper/query_server.go` (NEW)

```go
package keeper

import (
    "context"
    
    sdk "github.com/cosmos/cosmos-sdk/types"
    "altan/x/corelaw/types"
)

var _ types.QueryServer = Keeper{}

// Params query
func (k Keeper) Params(
    goCtx context.Context,
    req *types.QueryParamsRequest,
) (*types.QueryParamsResponse, error) {
    ctx := sdk.UnwrapSDKContext(goCtx)
    params := k.GetParams(ctx)
    
    return &types.QueryParamsResponse{Params: params}, nil
}

// Article query (single article by number)
func (k Keeper) Article(
    goCtx context.Context,
    req *types.QueryArticleRequest,
) (*types.QueryArticleResponse, error) {
    ctx := sdk.UnwrapSDKContext(goCtx)
    
    article, found := k.GetArticle(ctx, req.ArticleNumber)
    if !found {
        return nil, types.ErrArticleNotFound
    }
    
    return &types.QueryArticleResponse{Article: article}, nil
}

// AllArticles query
func (k Keeper) AllArticles(
    goCtx context.Context,
    req *types.QueryAllArticlesRequest,
) (*types.QueryAllArticlesResponse, error) {
    ctx := sdk.UnwrapSDKContext(goCtx)
    articles := k.GetAllArticles(ctx)
    
    return &types.QueryAllArticlesResponse{Articles: articles}, nil
}

// CoreLawState query
func (k Keeper) CoreLawState(
    goCtx context.Context,
    req *types.QueryCoreLawStateRequest,
) (*types.QueryCoreLawStateResponse, error) {
    ctx := sdk.UnwrapSDKContext(goCtx)
    
    state := types.CoreLawState{
        TotalArticles: 37,
        Articles:      k.GetAllArticles(ctx),
        LastModified:  ctx.BlockTime(),
    }
    
    return &types.QueryCoreLawStateResponse{State: state}, nil
}

// NetworkFee query (calculate fee for a given amount)
func (k Keeper) NetworkFee(
    goCtx context.Context,
    req *types.QueryNetworkFeeRequest,
) (*types.QueryNetworkFeeResponse, error) {
    ctx := sdk.UnwrapSDKContext(goCtx)
    
    amount, ok := sdk.NewIntFromString(req.Amount)
    if !ok {
        return nil, types.ErrInvalidAmount
    }
    
    fee := k.CalculateNetworkFee(ctx, amount)
    
    return &types.QueryNetworkFeeResponse{
        Fee:       fee.String(),
        Rate:      "0.03%",
        Cap:       "1000000000",  // 1000 ALTAN in ualtan
    }, nil
}
```

**Verification**:
```bash
go build ./x/corelaw/keeper/...
```

---

### Task 4: Update Genesis (30 min)

**File**: `x/corelaw/keeper/genesis.go` (NEW)

```go
package keeper

import (
    sdk "github.com/cosmos/cosmos-sdk/types"
    "altan/x/corelaw/types"
)

// InitGenesis initializes the module's state from genesis
func (k Keeper) InitGenesis(ctx sdk.Context, data types.GenesisState) {
    // Set parameters
    k.SetParams(ctx, data.Params)
    
    // Load all 37 articles
    articles := types.DefaultGenesisArticles()
    for _, article := range articles {
        k.SetArticle(ctx, article)
    }
}

// ExportGenesis exports the module's state to genesis
func (k Keeper) ExportGenesis(ctx sdk.Context) *types.GenesisState {
    return &types.GenesisState{
        Params:   k.GetParams(ctx),
        Articles: k.GetAllArticles(ctx),
    }
}
```

**File**: `x/corelaw/module.go` (UPDATE)

```go
// Add to AppModule

func (am AppModule) InitGenesis(ctx sdk.Context, cdc codec.JSONCodec, data json.RawMessage) []abci.ValidatorUpdate {
    var genesisState types.GenesisState
    cdc.MustUnmarshalJSON(data, &genesisState)
    am.keeper.InitGenesis(ctx, genesisState)
    return []abci.ValidatorUpdate{}
}

func (am AppModule) ExportGenesis(ctx sdk.Context, cdc codec.JSONCodec) json.RawMessage {
    gs := am.keeper.ExportGenesis(ctx)
    return cdc.MustMarshalJSON(gs)
}
```

---

### Task 5: Build and Test (60 min)

**Step 1**: Clean build
```bash
cd ~/blockchain/altan/altan

# Clean everything
rm -rf .ignite/
rm go.sum
go mod tidy

# Build
ignite chain build
```

**Expected**: Successful compilation

**Step 2**: Launch local testnet
```bash
ignite chain serve --reset-once
```

**Expected Output**:
```
✔ Building the blockchain...
✔ Initialized the chain
✔ Started blockchain
🌍 Tendermint node: http://0.0.0.0:26657
🌍 Blockchain API: http://0.0.0.0:1317
🌍 Token faucet: http://0.0.0.0:4500
```

**Step 3**: Test queries
```bash
# Open new terminal

# Query params
altand query corelaw params

# Query specific article (Article 27 - Network Fee)
altand query corelaw article 27

# Query all articles
altand query corelaw all-articles

# Calculate network fee for 10,000 ALTAN
altand query corelaw network-fee 10000000000
```

**Expected Output**:
```yaml
# Article 27
article:
  number: 27
  title: "Сетевой Налог"
  category: ECONOMY
  text: "При каждой транзакции взимается сетевой налог в размере 0.03%..."
  enacted_at: "2026-01-01T00:00:00Z"
  
# Network fee calculation
fee: "3000000"  # 3 ALTAN (0.03% of 10,000)
rate: "0.03%"
cap: "1000000000"  # 1000 ALTAN max
```

---

### Task 6: Unit Tests (60 min)

**File**: `x/corelaw/keeper/keeper_test.go` (NEW)

```go
package keeper_test

import (
    "testing"
    
    "github.com/stretchr/testify/require"
    sdk "github.com/cosmos/cosmos-sdk/types"
    
    keepertest "altan/testutil/keeper"
    "altan/x/corelaw/keeper"
    "altan/x/corelaw/types"
)

func TestGetArticle(t *testing.T) {
    k, ctx := keepertest.CorelawKeeper(t)
    
    // Load articles
    articles := types.DefaultGenesisArticles()
    for _, article := range articles {
        k.SetArticle(ctx, article)
    }
    
    // Test get existing article
    article, found := k.GetArticle(ctx, 27)
    require.True(t, found)
    require.Equal(t, uint32(27), article.Number)
    require.Contains(t, article.Title, "Налог")
    
    // Test get non-existing article
    _, found = k.GetArticle(ctx, 999)
    require.False(t, found)
}

func TestCalculateNetworkFee(t *testing.T) {
    k, ctx := keepertest.CorelawKeeper(t)
    
    tests := []struct {
        name   string
        amount sdk.Int
        expected sdk.Int
    }{
        {
            name:   "small amount",
            amount: sdk.NewInt(1000_000000),  // 1000 ALTAN
            expected: sdk.NewInt(300000),     // 0.3 ALTAN (0.03%)
        },
        {
            name:   "amount at cap",
            amount: sdk.NewInt(10_000_000_000000),  // 10M ALTAN
            expected: sdk.NewInt(1000_000000),      // 1000 ALTAN (capped)
        },
        {
            name:   "zero amount",
            amount: sdk.NewInt(0),
            expected: sdk.NewInt(0),
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            fee := k.CalculateNetworkFee(ctx, tt.amount)
            require.Equal(t, tt.expected, fee)
        })
    }
}

func TestGetAllArticles(t *testing.T) {
    k, ctx := keepertest.CorelawKeeper(t)
    
    // Load articles
    articles := types.DefaultGenesisArticles()
    for _, article := range articles {
        k.SetArticle(ctx, article)
    }
    
    // Get all
    allArticles := k.GetAllArticles(ctx)
    require.Len(t, allArticles, 37)
}
```

**Run tests**:
```bash
go test ./x/corelaw/keeper/... -v
```

**Expected**: All tests pass

---

## Success Criteria

### ✅ Definition of Done:

- [ ] Protobuf code generated (4 .pb.go files exist)
- [ ] App.go integration complete (no compile errors)
- [ ] Query server implemented (5 query endpoints)
- [ ] Local testnet running successfully
- [ ] All queries return correct data
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Can query Article 27 and see "Сетевой Налог"
- [ ] Network fee calculation correct (0.03%, 1000 cap)

### 📊 Quality Gates:

```yaml
Code Quality:
  - No compile errors
  - No lint warnings (run: golangci-lint run)
  - Go tests passing (go test ./x/corelaw/...)
  
Functionality:
  - All 37 articles loaded in genesis
  - Query endpoints respond correctly
  - Network fee math is accurate
  
Documentation:
  - README.md for x/corelaw module
  - Query examples documented
  - Error messages clear
```

---

## Troubleshooting Guide

### Problem: Protobuf generation fails

**Symptoms**: `protoc: command not found`

**Solution**:
```bash
brew install protobuf
go install github.com/cosmos/gogoproto/protoc-gen-gogo@latest
```

---

### Problem: App.go compile errors

**Symptoms**: `undefined: corelawkeeper`

**Solution**:
- Check imports are correct
- Run `go mod tidy`
- Restart VSCode (LSP might be cached)

---

### Problem: Query server not found

**Symptoms**: `unknown query path: /altan.corelaw.v1.Query/Article`

**Solution**:
- Verify query_server.go implements types.QueryServer
- Check app.go registers the query server
- Restart chain (`ignite chain serve --reset-once`)

---

### Problem: Genesis fails to load

**Symptoms**: `panic: genesis state not found for module corelaw`

**Solution**:
- Add corelaw to app.go module manager
- Check genesis.go InitGenesis is called
- Verify config/config.yml includes corelaw

---

## Estimated Timeline

```yaml
Saturday (4 hours):
  09:00-10:00: Protobuf generation + app.go wiring
  10:00-11:00: Query server implementation
  11:00-12:00: Genesis setup
  12:00-13:00: Build and test queries

Sunday (2 hours):
  10:00-11:00: Unit tests
  11:00-12:00: Documentation + cleanup
```

**Total**: 6 hours focused work

---

## Next Steps (After Completion)

Once x/corelaw is done:

1. **Week 2**: Start x/tax module
2. **Week 3-6**: x/khural (electronic voting)
3. **Week 6-7**: x/banking (Central Bank)
4. **Week 7-8**: x/land (property rights)

---

## Questions to Resolve

1. **Article Amendments**: Can articles be changed? (Probably no, requires hard fork)
2. **FreezeLaw Authority**: How does Justice Court invoke FreezeLaw? (New module or part of khural?)
3. **Multi-language**: Should articles be in Russian + English? (Genesis has Russian, query can translate)

---

**Document Status**: Weekend Action Plan  
**Priority**: P0 (Blocking)  
**Owner**: Bair Ivanov  
**Due Date**: Sunday, Feb 2, 2026 EOD
