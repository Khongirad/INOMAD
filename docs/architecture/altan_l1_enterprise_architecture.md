# ALTAN L1 - Enterprise Architecture (145M Users)

## Executive Summary

**Target Scale**: 145 million users  
**Architecture**: Multi-zone ecosystem with horizontal scaling  
**Design Principle**: Build for 500M, deploy for 145M

---

## 1. Custom Tax Module (x/tax)

### 1.1 Hybrid Fee Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TRANSACTION                          │
└─────────────────────┬───────────────────────────────────┘
                      │
          ┌───────────▼───────────┐
          │   Tax Module          │
          │   calculateFee()      │
          └───────────┬───────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼───────┐           ┌───────▼───────┐
│   GAS FEE     │           │ INOMAD COMM.  │
│ (No Cap)      │           │ (Cap 1000)    │
│               │           │               │
│ → Validators  │           │ → INOMAD INC  │
│ → Community   │           │   Treasury    │
│   Pool        │           │               │
└───────────────┘           └───────────────┘
```

### 1.2 Tax Module Implementation

```go
// x/tax/types/keys.go
const (
    ModuleName = "tax"
    
    // Store keys
    TaxConfigKey        = "TaxConfig"
    InomadTreasuryKey   = "InomadTreasury"
    FounderAddressKey   = "FounderAddress"
)

// x/tax/types/tax.proto
message TaxConfig {
    uint32 commission_rate_bps = 1;      // 3 = 0.03%
    string commission_cap = 2;           // "1000000000" (1000 ALTAN)
    string inomad_treasury = 3;          // Treasury address
    string founder_address = 4;          // Bair Ivanov only
    bool is_active = 5;
}

message InomadTreasury {
    string address = 1;
    string balance = 2;
    string total_collected = 3;
    google.protobuf.Timestamp last_withdrawal = 4;
}
```

### 1.3 INOMAD INC Treasury (Founder Only)

```go
// x/tax/keeper/treasury.go

// CRITICAL: Only founder (Bair Ivanov) can access treasury
const FounderAddress = "altan1bairivanov..."  // Hardcoded for security

type TreasuryKeeper struct {
    storeKey    storetypes.StoreKey
    bankKeeper  BankKeeper
}

// WithdrawFromTreasury - FOUNDER ONLY
func (k TreasuryKeeper) WithdrawFromTreasury(
    ctx sdk.Context,
    requester sdk.AccAddress,
    amount sdk.Coins,
    destination sdk.AccAddress,
) error {
    // CRITICAL SECURITY CHECK
    if requester.String() != FounderAddress {
        return sdkerrors.Wrap(sdkerrors.ErrUnauthorized, 
            "only founder Bair Ivanov can withdraw from INOMAD treasury")
    }
    
    treasury := k.GetTreasuryAddress(ctx)
    
    // Transfer from treasury to destination
    if err := k.bankKeeper.SendCoins(ctx, treasury, destination, amount); err != nil {
        return err
    }
    
    // Emit event for audit
    ctx.EventManager().EmitEvent(
        sdk.NewEvent(
            "inomad_treasury_withdrawal",
            sdk.NewAttribute("amount", amount.String()),
            sdk.NewAttribute("destination", destination.String()),
            sdk.NewAttribute("authorized_by", requester.String()),
            sdk.NewAttribute("timestamp", ctx.BlockTime().String()),
        ),
    )
    
    return nil
}

// CollectCommission - called by AnteHandler
func (k TreasuryKeeper) CollectCommission(
    ctx sdk.Context,
    payer sdk.AccAddress,
    amount sdk.Coins,
) error {
    treasury := k.GetTreasuryAddress(ctx)
    
    if err := k.bankKeeper.SendCoins(ctx, payer, treasury, amount); err != nil {
        return err
    }
    
    // Update total collected
    k.IncrementTotalCollected(ctx, amount)
    
    return nil
}
```

### 1.4 Governance-Adjustable Parameters

```go
// x/tax/types/params.go
type Params struct {
    CommissionRateBPS    uint32 `json:"commission_rate_bps"`    // Default: 3
    CommissionCapAmount  string `json:"commission_cap_amount"`  // Default: 1000 ALTAN
    MinGasPrice          string `json:"min_gas_price"`          // Default: 0.001 ualtan
    BlockGasLimit        uint64 `json:"block_gas_limit"`        // Default: 50000000
    TaxActive            bool   `json:"tax_active"`             // Default: true
}

// These can be changed via governance proposal!
func DefaultParams() Params {
    return Params{
        CommissionRateBPS:   3,
        CommissionCapAmount: "1000000000",  // 1000 * 10^6
        MinGasPrice:         "1000",        // 0.001 ualtan
        BlockGasLimit:       50_000_000,
        TaxActive:           true,
    }
}
```

---

## 2. IBC Multi-Zone Architecture

### 2.1 Horizontal Scaling Strategy

```
                         ┌─────────────────────┐
                         │    COSMOS HUB       │
                         │   (IBC Router)      │
                         └──────────┬──────────┘
                                    │ IBC
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
┌───────▼───────┐           ┌───────▼───────┐           ┌───────▼───────┐
│  ALTAN-1      │           │  ALTAN-2      │           │  ALTAN-N      │
│  Main Zone    │───IBC────▶│  Overflow     │───IBC────▶│  Regional     │
│  50M users    │           │  50M users    │           │  45M users    │
│  5000 TPS     │           │  5000 TPS     │           │  5000 TPS     │
└───────────────┘           └───────────────┘           └───────────────┘
        │                           │                           │
        └───────────────────────────┴───────────────────────────┘
                                    │
                          ┌─────────▼─────────┐
                          │  SHARED STATE     │
                          │  - User balances  │
                          │  - Token supply   │
                          │  - Governance     │
                          └───────────────────┘
```

### 2.2 IBC Configuration in app.go

```go
// app/app.go

import (
    "github.com/cosmos/ibc-go/v8/modules/core"
    ibctransfer "github.com/cosmos/ibc-go/v8/modules/apps/transfer"
    ibckeeper "github.com/cosmos/ibc-go/v8/modules/core/keeper"
)

type AltanApp struct {
    // ... existing keepers
    
    // IBC Keepers - ENABLE FROM DAY 1
    IBCKeeper        *ibckeeper.Keeper
    TransferKeeper   ibctransferkeeper.Keeper
    
    // Scoped keepers for IBC
    ScopedIBCKeeper      capabilitykeeper.ScopedKeeper
    ScopedTransferKeeper capabilitykeeper.ScopedKeeper
}

func NewAltanApp(...) *AltanApp {
    // Initialize IBC
    app.IBCKeeper = ibckeeper.NewKeeper(
        appCodec,
        keys[ibcexported.StoreKey],
        app.GetSubspace(ibcexported.ModuleName),
        app.StakingKeeper,
        app.UpgradeKeeper,
        app.ScopedIBCKeeper,
    )
    
    // Transfer keeper for token transfers
    app.TransferKeeper = ibctransferkeeper.NewKeeper(
        appCodec,
        keys[ibctransfertypes.StoreKey],
        app.GetSubspace(ibctransfertypes.ModuleName),
        app.IBCKeeper.ChannelKeeper,
        app.IBCKeeper.ChannelKeeper,
        &app.IBCKeeper.PortKeeper,
        app.AccountKeeper,
        app.BankKeeper,
        app.ScopedTransferKeeper,
    )
    
    // Register IBC modules
    // ...
}
```

### 2.3 Standard Token Denomination

```yaml
# For exchange/wallet integration
Base Denomination: ualtan
Display Denomination: altan
Decimals: 6

# IBC format when transferred
IBC Denom: ibc/{hash}/ualtan

# Denom metadata for CoinGecko/exchanges
{
  "description": "Native token of ALTAN Confederation",
  "denom_units": [
    {"denom": "ualtan", "exponent": 0, "aliases": ["microaltan"]},
    {"denom": "maltan", "exponent": 3, "aliases": ["millialtan"]},
    {"denom": "altan", "exponent": 6}
  ],
  "base": "ualtan",
  "display": "altan",
  "name": "ALTAN",
  "symbol": "ALTAN",
  "uri": "https://altan.network/token-info.json"
}
```

---

## 3. State Management (145M Users)

### 3.1 Storage Estimation

```yaml
Per User State:
  - Account: ~200 bytes
  - Citizen record: ~500 bytes
  - Arbad membership: ~100 bytes
  - Bank account: ~300 bytes
  Total: ~1.1 KB per user

145M Users:
  - User state: ~160 GB
  - Transaction history: ~1 TB/year
  - Contract state: ~500 GB
  Total active state: ~700 GB
```

### 3.2 Pruning Strategy

```toml
# config/app.toml

[pruning]
# "custom" allows fine-tuned control
pruning = "custom"

# Keep last 100 blocks in full
pruning-keep-recent = "100"

# Keep every 10000th block (for archives)  
pruning-keep-every = "10000"

# Delete prunable data every 10 blocks
pruning-interval = "10"

[state-sync]
# Enable state sync for new validators
snapshot-interval = 1000
snapshot-keep-recent = 2
```

### 3.3 Node Types

```yaml
Validator Node:
  - Full state (700 GB)
  - Pruning: custom (100 blocks)
  - Purpose: Block production

Archive Node:
  - Full history (10+ TB)
  - Pruning: nothing
  - Purpose: Historical queries, indexers

Light Node:
  - Headers only (~10 GB)
  - Pruning: everything
  - Purpose: Mobile wallets, light clients
```

### 3.4 External Indexers

```yaml
# Don't query blockchain for history - use indexers!

Production Stack:
  1. SubQuery Indexer
     - Real-time indexing
     - GraphQL API
     - Faster than on-chain queries
     
  2. PostgreSQL Database
     - Transaction history
     - User analytics
     - Dashboard data
     
  3. Redis Cache
     - Balance lookups
     - Hot data (1M requests/sec)

Architecture:
  Blockchain → Indexer → PostgreSQL → API → Frontend
       ↓
     Redis (cache)
```

### 3.5 Indexer Configuration

```yaml
# subquery-project.yaml
specVersion: "1.0.0"
name: altan-indexer
version: 1.0.0

schema:
  file: ./schema.graphql

network:
  chainId: altan-1
  endpoint: 
    - wss://rpc.altan.network/websocket

dataSources:
  - kind: cosmos/Runtime
    startBlock: 1
    mapping:
      file: ./dist/index.js
      handlers:
        - handler: handleTransfer
          kind: cosmos/EventHandler
          filter:
            type: transfer
            
        - handler: handleCitizenRegistration
          kind: cosmos/EventHandler
          filter:
            type: citizen_registered
```

---

## 4. Sentry Node Architecture

### 4.1 Network Topology

```
                          INTERNET
                    (145M users, DDoS attacks)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼───────┐     ┌───────▼───────┐     ┌───────▼───────┐
│  SENTRY #1    │     │  SENTRY #2    │     │  SENTRY #3    │
│  Public IP    │     │  Public IP    │     │  Public IP    │
│  AWS Region A │     │  GCP Region B │     │  Azure Reg C  │
│  Cloudflare   │     │  Cloudflare   │     │  Cloudflare   │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   PRIVATE VPN     │
                    │   WireGuard       │
                    │   10.0.0.0/24     │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   VALIDATOR NODE  │
                    │   NO Public IP!   │
                    │   10.0.0.10       │
                    │                   │
                    │   Private Signing │
                    │   HSM Protected   │
                    └───────────────────┘
```

### 4.2 Sentry Node Configuration

```toml
# Sentry Node: config/config.toml

[p2p]
# Public facing
laddr = "tcp://0.0.0.0:26656"

# Connect to validator (private)
persistent_peers = "validator-node-id@10.0.0.10:26656"

# Hide validator from public
private_peer_ids = "validator-node-id"

# Allow peer exchange with internet
pex = true

# External address (for other nodes to find us)
external_address = "5.6.7.8:26656"

# Security: rate limiting
max_num_inbound_peers = 100
max_num_outbound_peers = 30
```

### 4.3 Validator Node Configuration

```toml
# Validator Node: config/config.toml

[p2p]
# Private only - NO public IP!
laddr = "tcp://10.0.0.10:26656"

# Only connect to our sentry nodes
persistent_peers = "sentry1-id@10.0.0.1:26656,sentry2-id@10.0.0.2:26656,sentry3-id@10.0.0.3:26656"

# NO peer exchange - private
pex = false

# No external address - hidden
external_address = ""

# Strict address book
addr_book_strict = true
```

### 4.4 DDoS Protection Layers

```yaml
Layer 1: Cloudflare
  - 100+ Tbps DDoS mitigation
  - Rate limiting
  - Bot protection
  
Layer 2: Load Balancer
  - Geographic distribution
  - Health checks
  - Auto-failover
  
Layer 3: Sentry Nodes
  - Connection filtering
  - Peer score system
  - Ban list management
  
Layer 4: Validator
  - Private network
  - No external access
  - HSM for signing
```

---

## 5. Governance Parameters

### 5.1 Dynamic Configuration

```protobuf
// proto/altan/gov/v1/params.proto
message NetworkParams {
    // Fees (adjustable via proposal)
    uint32 commission_rate_bps = 1;     // 0.03% = 3
    string commission_cap = 2;          // 1000 ALTAN
    string min_gas_price = 3;           // 0.001 ualtan
    
    // Block limits
    uint64 block_gas_limit = 4;         // 50,000,000
    uint64 max_tx_bytes = 5;            // 10,485,760 (10 MB)
    
    // Validator set
    uint32 max_validators = 6;          // 100
    bool permissioned_validators = 7;   // true for PoA start
    
    // Emergency
    bool emergency_halt = 8;            // false
    string emergency_admin = 9;         // Multi-sig
}
```

### 5.2 Proof of Authority Start

```go
// x/staking/keeper/validator_whitelist.go

type ValidatorWhitelist struct {
    Enabled    bool
    Addresses  []string
    AdminMultisig string
}

func (k Keeper) CanCreateValidator(ctx sdk.Context, addr sdk.ValAddress) bool {
    whitelist := k.GetValidatorWhitelist(ctx)
    
    if !whitelist.Enabled {
        return true  // Permissionless
    }
    
    // Check if in whitelist
    for _, allowed := range whitelist.Addresses {
        if addr.String() == allowed {
            return true
        }
    }
    
    return false
}

// Transition to permissionless (governance proposal)
func (k Keeper) DisableValidatorWhitelist(ctx sdk.Context) error {
    whitelist := k.GetValidatorWhitelist(ctx)
    whitelist.Enabled = false
    k.SetValidatorWhitelist(ctx, whitelist)
    
    ctx.EventManager().EmitEvent(
        sdk.NewEvent(
            "validator_whitelist_disabled",
            sdk.NewAttribute("timestamp", ctx.BlockTime().String()),
        ),
    )
    
    return nil
}
```

### 5.3 Emergency Controls

```go
// x/emergency/keeper/emergency.go

type EmergencyModule struct {
    AdminMultisig string  // 3 of 5 multi-sig
}

// EmergencyHalt - stop all transactions (extreme case only)
func (k Keeper) EmergencyHalt(ctx sdk.Context, signer string) error {
    if !k.IsEmergencyAdmin(ctx, signer) {
        return sdkerrors.Wrap(sdkerrors.ErrUnauthorized, "not emergency admin")
    }
    
    k.SetHaltStatus(ctx, true)
    
    // This will cause all transactions to fail
    return nil
}

// AdjustGasLimit - hot-fix for spam attacks
func (k Keeper) AdjustGasLimit(ctx sdk.Context, newLimit uint64) error {
    // Can be done by emergency admin without full governance
    k.SetBlockGasLimit(ctx, newLimit)
    return nil
}
```

---

## 6. Genesis Configuration (Production)

```json
{
  "genesis_time": "2026-06-01T00:00:00Z",
  "chain_id": "altan-1",
  
  "app_state": {
    "tax": {
      "params": {
        "commission_rate_bps": 3,
        "commission_cap": "1000000000",
        "tax_active": true
      },
      "inomad_treasury": {
        "address": "altan1inomadtreasury...",
        "founder_address": "altan1bairivanov..."
      }
    },
    
    "staking": {
      "params": {
        "max_validators": 100,
        "unbonding_time": "1814400s"
      },
      "validator_whitelist": {
        "enabled": true,
        "addresses": [
          "altanvaloper1genesis1...",
          "altanvaloper1genesis2...",
          "altanvaloper1genesis3..."
        ]
      }
    },
    
    "gov": {
      "params": {
        "voting_period": "604800s",
        "quorum": "0.40",
        "threshold": "0.51"
      }
    },
    
    "emergency": {
      "admin_multisig": "altan1emergency3of5...",
      "halt_enabled": false
    }
  }
}
```

---

## 7. Scaling Roadmap

### Phase 1: Launch (Year 1)
```yaml
Users: 0 → 10M
Zones: 1 (altan-1)
TPS: 1,000
Validators: 10 → 50 (PoA → Hybrid)
```

### Phase 2: Growth (Year 2)
```yaml
Users: 10M → 50M
Zones: 1 → 3
TPS: 3,000 (1,000 per zone)
Validators: 50 → 100 (Permissionless)
```

### Phase 3: Scale (Year 3)
```yaml
Users: 50M → 145M
Zones: 3 → 10+
TPS: 10,000+ (distributed)
Validators: 100+ per zone
```

---

## 8. Checklist: What to Build Now

### Immediate (This Month)
- [x] Secure Dual Fee Model (implemented above)
- [ ] INOMAD Treasury with founder-only access
- [ ] IBC modules enabled in app.go
- [ ] Standard token denomination

### Short-term (3 Months)
- [ ] Custom Tax Module (x/tax)
- [ ] Validator whitelist (PoA)
- [ ] Sentry node architecture
- [ ] Pruning configuration

### Medium-term (6 Months)
- [ ] External indexer (SubQuery)
- [ ] Multi-zone preparation
- [ ] Emergency controls
- [ ] Governance parameters

---

**Document Version**: 1.0  
**Updated**: 2026-01-31  
**Target**: 145 Million Users  
**Author**: ALTAN Development Team
