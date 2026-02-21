# Legislative Branch Deployment Guide

## Overview

This guide walks through deploying the complete Legislative Branch (Khural) system to any EVM-compatible network.

## Prerequisites

- Foundry installed (`curl -L https://foundry.paradigm.xyz | bash`)
- Private key with ETH/native tokens for deployment
- RPC URL for target network

## Environment Setup

Create `.env.deployment` file:

```bash
# Network
RPC_URL=https://your-rpc-url
PRIVATE_KEY=your-private-key-here

# Configuration
ADMIN_ADDRESS=0x... # Admin wallet address
TEMPLE_ADDRESS=0x... # Temple of Heaven address (optional)

# Optional: Existing contracts
VOTING_CENTER_ADDRESS=
STATISTICS_BUREAU_ADDRESS=
```

## Deployment Steps

### 1. Full System Deployment

Deploy all contracts in one transaction:

```bash
cd chain
forge script script/DeployLegislativeBranch.s.sol:DeployLegislativeBranch \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify # Optional: verify on block explorer
```

This deploys:
- ✅ StatisticsBureau
- ✅ VotingCenter
- ✅ ArbadKhural #1 (sample)
- ✅ ZunKhural #1 (sample)
- ✅ MyangadgKhural #1 (sample)
- ✅ TumedKhural #1 (sample)

### 2. Verify Deployment

Check deployment output:

```bash
cat legislative_deployment.env
```

Should contain all contract addresses.

### 3. Update Backend Configuration

Copy addresses to backend `.env`:

```bash
# Add to backend/.env
VOTING_CENTER_ADDRESS=0x...
STATISTICS_BUREAU_ADDRESS=0x...
```

### 4. Initialize First Arbad

Add representatives to Arbad #1:

```solidity
// In Foundry console or via script
cast send $ARBAD_1_ADDRESS \
  "addRepresentative(address,uint256)" \
  0xRepAddress1 1 \
  --private-key $ADMIN_KEY \
  --rpc-url $RPC_URL

// Repeat for up to 10 representatives
```

### 5. Test Proposal Creation

Create a test proposal:

```bash
# Via backend API
curl -X POST http://localhost:3000/legislative/voting/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "proposalType": 0,
    "khuralLevel": 1,
    "khuralId": 1,
    "title": "Test Proposal",
    "description": "First test proposal",
    "votingPeriod": 604800,
    "privateKey": "0x..."
  }'
```

## Deploy Additional Khurals

### Deploy More Arbads

```bash
forge script script/DeployLegislativeBranch.s.sol:DeployAdditionalKhurals \
  --sig "deployArbad(address,uint256,string,address)" \
  $ADMIN_ADDRESS \
  2 \
  "Second Arbad" \
  $VOTING_CENTER_ADDRESS \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

### Deploy More Zuns/Myangads/Tumeds

Same pattern with:
- `deployZun(address,uint256,string,address)`
- `deployMyangad(address,uint256,string,address)`
- `deployTumed(address,uint256,string,address)`

## Post-Deployment Configuration

### 1. Update Census Data

```bash
cast send $STATISTICS_BUREAU_ADDRESS \
  "updateCensus(uint256,uint256,uint256,uint256,uint256,uint256)" \
  10000 5000 500 50 5 1 \
  --private-key $ADMIN_KEY
```

### 2. Grant Legislative Role

Grant `LEGISLATIVE_ROLE` to Legislative Branch admin:

```bash
cast send $VOTING_CENTER_ADDRESS \
  "grantRole(bytes32,address)" \
  $(cast keccak "LEGISLATIVE_ROLE") \
  $LEGISLATIVE_ADMIN \
  --private-key $ADMIN_KEY
```

### 3. Setup Event Listeners

Start backend service to listen for events:

```bash
cd backend
npm run start:dev
```

## Verification

### Check Deployment

```bash
# Check VotingCenter
cast call $VOTING_CENTER_ADDRESS "proposalCount()" --rpc-url $RPC_URL

# Check StatisticsBureau
cast call $STATISTICS_BUREAU_ADDRESS "getCensus()" --rpc-url $RPC_URL

# Check Arbad
cast call $ARBAD_1_ADDRESS "getRepresentativeCount()" --rpc-url $RPC_URL
```

### Test Full Flow

1. Add representative to Arbad
2. Create proposal via API
3. Vote on proposal
4. Wait for voting period
5. Finalize proposal
6. Check results

## Troubleshooting

### Deployment Fails

- Check gas: `--gas-estimate-multiplier 200`
- Check nonce: `--slow` flag
- Check RPC: Try different endpoint

### Role Issues

Ensure all roles granted:
- StatisticsBureau → VOTING_CENTER_ROLE to VotingCenter
- VotingCenter → DEFAULT_ADMIN_ROLE to each Khural
- Each Khural → KHURAL_ROLE to representatives

### Transaction Reverts

Common issues:
- Already voted
- Voting period ended
- Not a representative
- Invalid proposal ID

Check with:
```bash
cast call $VOTING_CENTER_ADDRESS \
  "getProposal(uint256)" \
  1 \
  --rpc-url $RPC_URL
```

## Network-Specific Notes

### Localhost/Anvil

```bash
# Start local node
anvil

# Deploy
forge script ... --rpc-url http://localhost:8545
```

### Testnet (Sepolia, Mumbai, etc)

```bash
# Set RPC
export RPC_URL=https://rpc.sepolia.org

# Deploy with verification
forge script ... --verify --etherscan-api-key $ETHERSCAN_KEY
```

### Mainnet

⚠️ **CRITICAL**: Test on testnet first!

```bash
# Use hardware wallet or secure key management
# Consider multi-sig for admin
# Verify all addresses before deployment
```

## Gas Estimates

Approximate gas costs:

| Contract | Gas Estimate |
|----------|-------------|
| StatisticsBureau | ~2,500,000 |
| VotingCenter | ~3,000,000 |
| ArbadKhural | ~1,800,000 |
| ZunKhural | ~1,800,000 |
| MyangadgKhural | ~1,800,000 |
| TumedKhural | ~1,900,000 |
| **Total** | **~12,800,000** |

At 50 gwei: ~0.64 ETH
At 100 gwei: ~1.28 ETH

## Security Checklist

- [ ] Admin key secured (hardware wallet recommended)
- [ ] Temple address verified
- [ ] RPC URL trusted
- [ ] Contracts compiled without warnings
- [ ] Tests passing (26/26)
- [ ] Gas limits appropriate
- [ ] Block explorer verification planned
- [ ] Backup of deployment addresses
- [ ] Role assignments documented
- [ ] Emergency pause mechanism tested

## Support

For issues:
1. Check logs: `forge script ... -vvvv`
2. Verify contracts: `forge verify-contract ...`
3. Review test results: `forge test -vvv`

## Next Steps

After deployment:
1. Update API documentation
2. Deploy frontend
3. Create user guides
4. Monitor events
5. Regular census updates
6. Expand hierarchy as population grows
