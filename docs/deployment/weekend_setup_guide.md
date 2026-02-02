# ALTAN L1 - Weekend Setup Guide (Feb 1-2, 2026)

## 🎯 Goal
Get ALTAN L1 blockchain running locally by end of weekend

## ⏱️ Time Estimate
- Saturday Morning: 4 hours
- Saturday Afternoon: 4 hours  
- Sunday Morning: 4 hours
- Sunday Afternoon: 4 hours
**Total: 16 hours**

---

## Saturday Morning (4 hours) - Base Environment

### Step 1: Install Homebrew (15 min)

```bash
# Install Homebrew (package manager for macOS)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Verify installation
brew --version
# Expected: Homebrew 4.x.x
```

### Step 2: Install Go 1.21+ (10 min)

```bash
# Install Go via Homebrew
brew install go

# Verify installation
go version
# Expected: go version go1.21.x or higher

# Set up Go environment (add to ~/.zshrc)
echo 'export GOPATH=$HOME/go' >> ~/.zshrc
echo 'export PATH=$PATH:$GOPATH/bin' >> ~/.zshrc
source ~/.zshrc

# Verify GOPATH
echo $GOPATH
# Expected: /Users/inomadinc/go
```

### Step 3: Install Ignite CLI (15 min)

```bash
# Install Ignite CLI (Cosmos SDK scaffolding tool)
curl https://get.ignite.com/cli! | bash

# Verify installation
ignite version
# Expected: Ignite CLI version x.x.x

# If command not found, add to PATH
echo 'export PATH=$PATH:$HOME/.ignite' >> ~/.zshrc
source ~/.zshrc
```

### Step 4: Create Project Directory (5 min)

```bash
# Create workspace
mkdir -p ~/blockchain/altan
cd ~/blockchain/altan

# Initialize git
git init
git config user.name "ALTAN Development"
git config user.email "dev@altan.network"

# Create README
cat > README.md << 'EOF'
# ALTAN Confederation Blockchain

Sovereign L1 blockchain for the ALTAN Confederation.

- **Framework**: Cosmos SDK v0.50.x
- **Consensus**: CometBFT (Tendermint)
- **Target**: 145 million users
- **Max Supply**: 2.1 Trillion ALTAN

## Quick Start

```bash
# Build
ignite chain build

# Run local node
ignite chain serve
```

## Documentation

See `/docs` for technical specifications.
EOF

git add README.md
git commit -m "Initial commit"
```

### Step 5: Scaffold ALTAN Chain (60 min)

```bash
cd ~/blockchain/altan

# Scaffold new Cosmos SDK chain
# --no-module flag (we'll add custom modules manually)
ignite scaffold chain altan --no-module

# This creates:
# - app/         (main application)
# - cmd/         (CLI binary)
# - proto/       (protobuf definitions)
# - x/           (custom modules - empty for now)
# - config.yml   (Ignite config)
# - go.mod       (Go dependencies)

# Wait for dependencies to download (5-10 min)
```

### Step 6: First Build Test (30 min)

```bash
cd ~/blockchain/altan

# Build the chain
ignite chain build

# Expected output:
# ✓ Building...
# ✓ Binary built successfully

# Verify binary
ls -la ~/go/bin/ | grep altan
# Expected: altand (the blockchain daemon)

# Test version
altand version
# Expected: (version number)
```

**End of Saturday Morning** ✅  
**Checkpoint**: You should have Go, Ignite, and a buildable ALTAN chain

---

## Saturday Afternoon (4 hours) - Configuration

### Step 7: Configure Chain Parameters (60 min)

```bash
cd ~/blockchain/altan

# Edit config.yml for ALTAN specifications
cat > config.yml << 'EOF'
version: 1

accounts:
  - name: alice
    coins:
      - 10000000000000000ualtan  # 10B ALTAN for testing
  - name: bob
    coins:
      - 1000000000000000ualtan   # 1B ALTAN for testing

validators:
  - name: alice
    bonded: 1000000000000ualtan  # 1M ALTAN staked

client:
  vuex:
    path: vue/src/store
  
faucet:
  name: alice
  coins:
    - 100000000ualtan
  
genesis:
  app_state:
    staking:
      params:
        bond_denom: ualtan
        max_validators: 100
        unbonding_time: "1814400s"  # 21 days
    
    bank:
      denom_metadata:
        - description: "Native token of ALTAN Confederation"
          denom_units:
            - denom: ualtan
              exponent: 0
              aliases: ["microaltan"]
            - denom: altan
              exponent: 6
          base: ualtan
          display: altan
          name: ALTAN
          symbol: ALTAN
      
      supply:
        - denom: ualtan
          amount: "11000000000000000"  # 11B for testing
EOF
```

### Step 8: Update Chain ID (10 min)

```bash
# Chain ID for testnet
sed -i '' 's/chain_id: "altan"/chain_id: "altan-testnet-1"/' config.yml

# Verify
grep "chain_id" config.yml
# Expected: chain_id: "altan-testnet-1"
```

### Step 9: First Local Run (90 min)

```bash
cd ~/blockchain/altan

# Clean any previous state
rm -rf ~/.altan

# Start local testnet
ignite chain serve

# Expected output:
# 🌍 Tendermint node: http://0.0.0.0:26657
# 🌍 API server: http://0.0.0.0:1317
# 🌍 Token faucet: http://0.0.0.0:4500

# Chain is now running!
# Press Ctrl+C to stop when ready
```

### Step 10: Test Basic Queries (20 min)

```bash
# In a NEW terminal window

# Check status
altand status

# Query balances
altand query bank balances $(altand keys show alice -a)

# Expected: 10B ualtan

# Test transfer
altand tx bank send alice $(altand keys show bob -a) 1000000ualtan \
  --chain-id altan-testnet-1 \
  --yes

# Wait ~6 seconds, then check bob's balance
altand query bank balances $(altand keys show bob -a)

# Expected: 1B + 1M ualtan
```

### Step 11: Commit Progress (10 min)

```bash
cd ~/blockchain/altan

# Add all files
git add .
git commit -m "feat: initial ALTAN chain with testnet config

- Configured ALTAN denomination (ualtan, 6 decimals)
- Set chain-id to altan-testnet-1
- Max validators: 100
- Test accounts with 11B ALTAN total
- Local node runs successfully"

# Create GitHub repo (optional)
# Follow GitHub instructions to push
```

**End of Saturday Afternoon** ✅  
**Checkpoint**: Local ALTAN testnet running, transfers working

---

## Sunday Morning (4 hours) - First Custom Module

### Step 12: Scaffold x/corelaw Module (30 min)

```bash
cd ~/blockchain/altan

# Scaffold corelaw module with bank dependency
ignite scaffold module corelaw --dep bank

# This creates:
# - x/corelaw/keeper/
# - x/corelaw/types/
# - x/corelaw/genesis.go
# - x/corelaw/module.go
# - proto/altan/corelaw/v1/

# Verify
ls -la x/corelaw/
```

### Step 13: Define Article Protobuf (60 min)

```bash
# Create proto file
cat > proto/altan/corelaw/v1/article.proto << 'EOF'
syntax = "proto3";
package altan.corelaw.v1;

option go_package = "altan/x/corelaw/types";

enum ArticleCategory {
  PRINCIPLES = 0;
  RIGHTS = 1;
  GOVERNANCE = 2;
  ECONOMY = 3;
  LAND = 4;
  JUSTICE = 5;
  SECURITY = 6;
  OTHER = 7;
}

message Article {
  uint32 article_number = 1;
  string title = 2;
  string content = 3;
  ArticleCategory category = 4;
}

message CoreLawState {
  repeated Article articles = 1;
  bool is_frozen = 2;
  string frozen_at = 3;
  string law_hash = 4;
}
EOF

# Create params proto
cat > proto/altan/corelaw/v1/params.proto << 'EOF'
syntax = "proto3";
package altan.corelaw.v1;

option go_package = "altan/x/corelaw/types";

message Params {
  uint32 network_fee_bps = 1;     // 3 = 0.03%
  uint32 tax_rate_bps = 2;        // 1000 = 10% annual
}
EOF

# Generate Go code
ignite chain build

# This generates types in x/corelaw/types/
```

### Step 14: Implement Basic Keeper (90 min)

```bash
# Create keeper file
cat > x/corelaw/keeper/article.go << 'EOF'
package keeper

import (
    "context"
    
    "altan/x/corelaw/types"
    sdk "github.com/cosmos/cosmos-sdk/types"
)

// GetArticle retrieves an article by number
func (k Keeper) GetArticle(ctx context.Context, articleNumber uint32) (*types.Article, error) {
    store := k.storeService.OpenKVStore(ctx)
    
    key := types.ArticleKey(articleNumber)
    bz, err := store.Get(key)
    if err != nil {
        return nil, err
    }
    if bz == nil {
        return nil, types.ErrArticleNotFound
    }
    
    var article types.Article
    k.cdc.MustUnmarshal(bz, &article)
    return &article, nil
}

// SetArticle stores an article
func (k Keeper) SetArticle(ctx context.Context, article *types.Article) error {
    if k.IsFrozen(ctx) {
        return types.ErrLawFrozen
    }
    
    store := k.storeService.OpenKVStore(ctx)
    
    key := types.ArticleKey(article.ArticleNumber)
    bz := k.cdc.MustMarshal(article)
    
    return store.Set(key, bz)
}

// GetNetworkFeeBPS returns 0.03% (3 basis points)
func (k Keeper) GetNetworkFeeBPS(ctx context.Context) uint32 {
    params := k.GetParams(ctx)
    return params.NetworkFeeBps  // 3
}
EOF
```

### Step 15: Add Genesis Articles (60 min)

```bash
# Create genesis helper
cat > x/corelaw/keeper/genesis.go << 'EOF'
package keeper

import (
    "altan/x/corelaw/types"
    sdk "github.com/cosmos/cosmos-sdk/types"
)

func (k Keeper) InitGenesis(ctx sdk.Context, data *types.GenesisState) {
    // Set params
    k.SetParams(ctx, data.Params)
    
    // Load all 37 articles
    for _, article := range data.Articles {
        k.SetArticle(ctx, &article)
    }
    
    // Set frozen state
    k.SetFrozen(ctx, data.IsFrozen)
}

func DefaultGenesisArticles() []types.Article {
    return []types.Article{
        {
            ArticleNumber: 1,
            Title: "Принцип человечности",
            Content: "Человек, его жизнь, свобода и права являются высшей ценностью...",
            Category: types.ArticleCategory_PRINCIPLES,
        },
        {
            ArticleNumber: 26,
            Title: "Национальная валюта АЛТАН",
            Content: "АЛТАН является единственной официальной валютой Конфедерации...",
            Category: types.ArticleCategory_ECONOMY,
        },
        {
            ArticleNumber: 27,
            Title: "Сетевой сбор",
            Content: "Сетевой сбор в размере 0.03% взимается со всех транзакций...",
            Category: types.ArticleCategory_ECONOMY,
        },
        // TODO: Add remaining 34 articles
    }
}
EOF
```

**End of Sunday Morning** ✅  
**Checkpoint**: x/corelaw module scaffolded with basic keeper functions

---

## Sunday Afternoon (4 hours) - Testing & Documentation

### Step 16: Build with CoreLaw Module (30 min)

```bash
cd ~/blockchain/altan

# Rebuild with new module
ignite chain build

# Check for errors
# If successful, continue
```

### Step 17: Test Local Node (60 min)

```bash
# Clean previous state
rm -rf ~/.altan

# Start node with corelaw module
ignite chain serve

# In new terminal, test queries
altand query corelaw params
# Expected: network_fee_bps: 3, tax_rate_bps: 1000

# Test article query (if implemented)
altand query corelaw article 27
# Expected: Article details about network fee
```

### Step 18: Write Tests (90 min)

```bash
# Create test file
cat > x/corelaw/keeper/article_test.go << 'EOF'
package keeper_test

import (
    "testing"
    
    "github.com/stretchr/testify/require"
    keepertest "altan/testutil/keeper"
    "altan/x/corelaw/types"
)

func TestGetSetArticle(t *testing.T) {
    k, ctx := keepertest.CorelawKeeper(t)
    
    article := &types.Article{
        ArticleNumber: 1,
        Title: "Test Article",
        Content: "Test content",
        Category: types.ArticleCategory_PRINCIPLES,
    }
    
    // Set article
    err := k.SetArticle(ctx, article)
    require.NoError(t, err)
    
    // Get article
    retrieved, err := k.GetArticle(ctx, 1)
    require.NoError(t, err)
    require.Equal(t, article.Title, retrieved.Title)
}

func TestNetworkFee(t *testing.T) {
    k, ctx := keepertest.CorelawKeeper(t)
    
    feeBPS := k.GetNetworkFeeBPS(ctx)
    require.Equal(t, uint32(3), feeBPS)  // 0.03%
}
EOF

# Run tests
go test ./x/corelaw/keeper/...
```

### Step 19: Document Setup (30 min)

```bash
cd ~/blockchain/altan

# Create documentation
mkdir -p docs

cat > docs/SETUP.md << 'EOF'
# ALTAN L1 - Development Setup

## Prerequisites
- macOS
- Homebrew
- Go 1.21+
- Ignite CLI

## Installation

See [Weekend Setup Guide](../WEEKEND_SETUP.md)

## Running Locally

```bash
ignite chain serve
```

## Available Commands

```bash
# Query network fee
altand query corelaw params

# Query specific article
altand query corelaw article [number]
```

## Next Steps

- Week 1: Complete x/corelaw with all 37 articles
- Week 2: Add x/citizen and x/arban modules
EOF
```

### Step 20: Final Commit (10 min)

```bash
cd ~/blockchain/altan

git add .
git commit -m "feat: add x/corelaw module

- Article proto definitions
- Basic keeper (Get/Set Article)
- Genesis with 3 sample articles
- Network fee parameter (0.03%)
- Tests for article storage
- Documentation

Next: Complete all 37 articles in genesis"

# Push to GitHub if configured
# git remote add origin https://github.com/altan-confederation/altan.git
# git push -u origin main
```

**End of Sunday Afternoon** ✅  
**Weekend Complete!**

---

## ✅ Weekend Success Criteria

- [/] Go 1.21+ installed
- [ ] Ignite CLI working
- [ ] ALTAN chain builds successfully
- [ ] Local testnet runs
- [ ] x/corelaw module scaffolded
- [ ] Basic queries work
- [ ] Tests pass
- [ ] Documentation written

---

## 🚀 Next Week (Feb 3-9)

**Goal**: Complete x/corelaw module
- Load all 37 articles
- Implement FreezeLaw mechanism
- Add CLI commands
- Full test coverage
- Integration tests

---

## Troubleshooting

### Go not found after install
```bash
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.zshrc
source ~/.zshrc
```

### Ignite command not found
```bash
echo 'export PATH=$PATH:$HOME/.ignite' >> ~/.zshrc
source ~/.zshrc
```

### Build fails
```bash
# Clean and rebuild
go clean -modcache
ignite chain build
```

### Port already in use
```bash
# Kill existing process
lsof -ti:26657 | xargs kill -9
ignite chain serve
```

---

**Good luck with the weekend setup!** 🎯
