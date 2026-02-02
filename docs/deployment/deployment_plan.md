# ALTAN Smart Contract Deployment Plan

## Overview

Comprehensive deployment plan for all ALTAN ecosystem smart contracts to blockchain. This covers local testing, testnet deployment, and mainnet launch.

---

## 📋 Deployment Checklist

### Current Status
- ✅ Phase 1 contracts deployed (local Anvil)
  - DigitalSeal, CouncilOfJustice, AcademyOfSciences, etc.
- ❌ Banking contracts not deployed
- ❌ Legislative contracts not deployed
- ❌ Marketplace contracts not deployed
- ❌ No testnet/mainnet deployments

---

## 🎯 Deployment Strategy

### Phase 1: Local Testing (Anvil) ✅ PARTIAL
**Network:** localhost:8545 (Chain ID: 31337)  
**Purpose:** Development and testing  
**Status:** Some contracts deployed

### Phase 2: Testnet Deployment 🔜 NEXT
**Networks:** Sepolia (Ethereum) or Mumbai (Polygon)  
**Purpose:** Public testing before mainnet  
**Status:** Not started

### Phase 3: Mainnet Deployment 🔜 FUTURE
**Networks:** Ethereum L1 or Polygon/Arbitrum L2  
**Purpose:** Production launch  
**Status:** Not started

---

## 📦 Contracts to Deploy

### Group 1: Core Infrastructure (HIGHEST PRIORITY)
**Deployment Script:** `DeployPhase1.s.sol`

| Contract | Purpose | Status | Dependencies |
|----------|---------|--------|--------------|
| DigitalSeal | 2-of-2 multisig | ✅ Local | None |
| ScientistCouncil | Scientific governance | ✅ Local | None |
| WisdomCouncil | Ethical governance | ✅ Local | None |
| TempleOfHeaven | Supreme authority | ✅ Local | Both Councils |
| AcademyOfSciences | Research governance | ✅ Local | ScientistCouncil |
| CouncilOfJustice | Judicial system | ✅ Local | TempleOfHeaven |

**Gas Estimate:** ~8,100,000

---

### Group 2: Citizen & Identity
**Deployment Script:** `DeploySovereignStack.s.sol` or manual

| Contract | Purpose | Status | Dependencies |
|----------|---------|--------|--------------|
| CitizenRegistry | Citizen management | ✅ Local | None |
| SeatSBT | Soulbound citizenship | ✅ Local | CitizenRegistry |
| ActivationRegistry | Citizen activation | ✅ Local | CitizenRegistry |

---

### Group 3: Economic Foundation
**Deployment Script:** Custom needed

| Contract | Purpose | Status | Dependencies |
|----------|---------|--------|--------------|
| AltanToken | Native currency | ❌ Need | None |
| CentralBank | Monetary authority | ❌ Need | AltanToken |
| MarketRegistry | Market infrastructure | ❌ Need | CentralBank |

---

### Group 4: Banking System
**Deployment Script:** `DeployBankContracts.s.sol`

| Contract | Purpose | Status | Dependencies |
|----------|---------|--------|--------------|
| CitizenBank | Tier 1 banking | ❌ Need | AltanToken, CentralBank |
| InstitutionalBank | Tier 2 banking | ❌ Need | AltanToken, CentralBank |
| CitizenWalletGuard | Security layer | ❌ Need | CitizenBank |
| JudicialMultisig | Court oversight | ❌ Need | CouncilOfJustice |
| BankHierarchy | Employee management | ❌ Need | InstitutionalBank |

**Gas Estimate:** ~15,000,000

---

### Group 5: Legislative Branch
**Deployment Script:** `DeployLegislativeBranch.s.sol`

| Contract | Purpose | Status | Dependencies |
|----------|---------|--------|--------------|
| StatisticsBureau | Census tracking | ❌ Need | None |
| VotingCenter | Voting hub | ❌ Need | StatisticsBureau |
| ArbanKhural | Level 1 council | ❌ Need | VotingCenter |
| ZunKhural | Level 2 council | ❌ Need | VotingCenter |
| MyangangKhural | Level 3 council | ❌ Need | VotingCenter |
| TumenKhural | Level 4 council | ❌ Need | VotingCenter |

**Gas Estimate:** ~12,800,000

---

### Group 6: Arban System
**Deployment Script:** `DeployArbanSystem.s.sol`

| Contract | Purpose | Status | Dependencies |
|----------|---------|--------|--------------|
| ArbanCompletion | Arban management | ❌ Need | CitizenRegistry |
| FamilyArban | Family units | ❌ Need | ArbanCompletion |
| OrganizationalArban | Organizations | ❌ Need | ArbanCompletion |

---

### Group 7: Marketplace
**Deployment Script:** Custom (need to create)

| Contract | Purpose | Status | Dependencies |
|----------|---------|--------|--------------|
| Marketplace | General marketplace | ❌ Need | AltanToken |
| JobMarketplace | Employment platform | ❌ Need | AltanToken |

---

## 🚀 Recommended Deployment Order

### Step 1: Complete Local Deployment
Deploy all missing contracts to Anvil for testing:

```bash
# 1. Start Anvil
anvil

# 2. Deploy core economic contracts (if not already)
forge script script/DeployEconomicFoundation.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast

# 3. Deploy banking system
forge script script/DeployBankContracts.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast

# 4. Deploy Legislative Branch
forge script script/DeployLegislativeBranch.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast

# 5. Deploy Arban System
forge script script/DeployArbanSystem.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast

# 6. Deploy Marketplace (if script exists)
forge script script/DeployMarketplace.s.sol \
  --rpc-url http://localhost:8545 \
  --broadcast
```

---

### Step 2: Test Locally
1. Update backend `.env` with local addresses
2. Run backend tests
3. Test frontend flows
4. Verify all integrations

---

### Step 3: Deploy to Testnet
**Recommended:** Sepolia (Ethereum testnet)

```bash
# Setup environment
export RPC_URL=https://rpc.sepolia.org
export PRIVATE_KEY=your_private_key
export ETHERSCAN_API_KEY=your_api_key

# Deploy in same order as local
forge script script/DeployPhase1.s.sol \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Continue with other scripts...
```

---

### Step 4: Verify & Test on Testnet
1. Verify all contracts on Etherscan
2. Update backend `.env` with testnet addresses
3. Run smoke tests
4. Invite beta users to test

---

### Step 5: Mainnet Deployment
⚠️ **CRITICAL: Do NOT deploy to mainnet until fully tested!**

Requirements:
- ✅ All testnet tests passing
- ✅ Security audit complete
- ✅ Multi-sig setup for admin
- ✅ Front-end tested
- ✅ Backup & recovery plan

---

## 🔧 Environment Configuration

### Local (.env.local)
```bash
# Network
RPC_URL=http://localhost:8545
CHAIN_ID=31337
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Core
ALTAN_ADDRESS=<deployed_address>
CENTRAL_BANK_ADDRESS=<deployed_address>
CITIZEN_REGISTRY_ADDRESS=<deployed_address>

# Banking
CITIZEN_BANK_ADDRESS=<deployed_address>
INSTITUTIONAL_BANK_ADDRESS=<deployed_address>

# Legislative
VOTING_CENTER_ADDRESS=<deployed_address>
STATISTICS_BUREAU_ADDRESS=<deployed_address>

# Marketplace
MARKETPLACE_ADDRESS=<deployed_address>
JOB_MARKETPLACE_ADDRESS=<deployed_address>
```

---

### Testnet (.env.sepolia)
```bash
RPC_URL=https://rpc.sepolia.org
CHAIN_ID=11155111
PRIVATE_KEY=<your_key>
ETHERSCAN_API_KEY=<your_key>

# Same contract addresses as local, but on Sepolia
```

---

### Mainnet (.env.production)
```bash
RPC_URL=https://eth-mainnet.alchemyapi.io/v2/<API_KEY>
CHAIN_ID=1
PRIVATE_KEY=<hardware_wallet_or_secure_key>

# Production contract addresses
```

---

## ⚠️ Important Notes

### Gas Costs
- **Total Local:** FREE (Anvil)
- **Total Sepolia:** FREE (faucet ETH)
- **Total Mainnet:** ~40,000,000 gas
  - At 50 gwei: ~2 ETH (~$5,000)
  - At 100 gwei: ~4 ETH (~$10,000)

### Security Checklist
- [ ] Use hardware wallet for mainnet
- [ ] Setup multi-sig for admin roles
- [ ] Verify all contract code on Etherscan
- [ ] Time-lock for critical functions
- [ ] Emergency pause mechanism tested
- [ ] Backup private keys securely
- [ ] Document all contract addresses
- [ ] Test recovery procedures

### Post-Deployment
1. Update `backend/.env` with all addresses
2. Save addresses to `chain/addresses-production.json`
3. Update frontend config
4. Document deployment in `DEPLOYMENT.md`
5. Create contract verification links
6. Setup monitoring & alerts

---

## 🎯 Immediate Next Steps

### Option A: Complete Local Deployment First (Recommended)
1. Check which contracts are missing locally
2. Deploy missing contracts to Anvil
3. Update backend `.env`
4. Test all flows end-to-end
5. **Then** deploy to testnet

### Option B: Deploy Directly to Testnet
1. Setup Sepolia RPC & faucet
2. Deploy all contracts to Sepolia
3. Verify on Etherscan
4. Test with frontend

---

## 📝 What Do You Want to Do?

1. **Deploy to Local Anvil** (missing contracts) - Best for development
2. **Deploy to Sepolia Testnet** - Best for public testing
3. **Check Current Deployment Status** - See what's already deployed
4. **Create Missing Deployment Scripts** - For marketplace, etc.

**Let me know and I'll proceed with the deployment!**
