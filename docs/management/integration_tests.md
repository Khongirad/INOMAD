# Integration Test Scenarios - Bank of Siberia

## Overview

End-to-end integration tests verifying the complete Bank of Siberia architecture works together: ArbanCompletion → CitizenBank → BankArbanHierarchy → CitizenWalletGuard → JudicialMultiSig.

---

## Scenario 1: Complete Employee Onboarding Flow

**Objective**: Verify a citizen can become a bank employee with full integration.

### Pre-conditions:
- Citizen has SeatSBT (seatId: 123)
- Citizen is married (Family Arban exists)
- Bank hierarchy exists (Tumen → Myangan → Zun → Arban)

### Test Steps:

```bash
# 1. Verify citizen is in ArbanCompletion
curl -X GET http://localhost:3000/arban/family/seat/123 \
  -H "Authorization: Bearer $JWT_TOKEN"
# Expected: Returns Family Arban details

# 2. Register employee in BankArbanHierarchy
curl -X POST http://localhost:3000/bank/hierarchy/register \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "seatId": 123,
    "wallet": "0xEmployee123...",
    "bankArbanId": 1
  }'
# Expected: employeeId returned, citizen verified

# 3. Verify employee in database
curl -X GET http://localhost:3000/bank/hierarchy/employee/1 \
  -H "Authorization: Bearer $JWT_TOKEN"
# Expected: Employee details with hierarchy path

# 4. Verify hierarchy path on-chain
cast call $BANK_HIERARCHY_ADDRESS \
  "getHierarchyPath(uint256)" 1
# Expected: arbanId=1, zunId=1, myanganId=1, tumenId=1
```

### Expected Results:
- ✅ Citizen verified in ArbanCompletion
- ✅ Employee registered on-chain (BankArbanHierarchy)
- ✅ Employee saved in database
- ✅ Hierarchy path correct

---

## Scenario 2: Tier Distribution to Bank Employee

**Objective**: Verify bank employees receive tier distributions as citizens.

### Pre-conditions:
- Employee registered (from Scenario 1)
- Family Arban has children (eligible for Tier 2)
- CitizenBank has funds in distribution pool

### Test Steps:

```bash
# 1. Open citizen account
cast send $CITIZEN_BANK_ADDRESS \
  "openAccount(uint256,string)" 123 "Employee Bank Account" \
  --private-key $OFFICER_KEY

# 2. Distribute Tier 1 (marriage)
cast send $CITIZEN_BANK_ADDRESS \
  "distributeTier1(uint256,uint256)" 123 1 \
  --private-key $OFFICER_KEY

# 3. Verify balance
cast call $CITIZEN_BANK_ADDRESS \
  "getBalance(uint256)" 1

# 4. Request Tier 2 distribution (has children)
curl -X POST http://localhost:3000/bank/tier/request \
  -d '{"seatId": 123, "tier": 2}'

# 5. Approve and distribute
cast send $CITIZEN_BANK_ADDRESS \
  "distributeTier2(uint256,uint256)" 123 1 \
  --private-key $OFFICER_KEY
```

### Expected Results:
- ✅ Tier 1 distributed (100 ALTAN)
- ✅ Tier 2 distributed (500 ALTAN)
- ✅ Employee receives citizen benefits while working at bank

---

## Scenario 3: Performance Cascade (Collective Responsibility)

**Objective**: Verify performance updates cascade through hierarchy.

### Pre-conditions:
- Bank hierarchy fully populated:
  - Tumen #1 (Chairman)
  - Myangan #1 (10 Zuns)
  - Zun #1 (10 Arbans)
  - Arban #1 (10 Employees)

### Test Steps:

```bash
# 1. Update employee #5 performance to 90
curl -X PUT http://localhost:3000/bank/hierarchy/performance/5 \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{"score": 90}'

# 2. Update employee #8 performance to 40 (below threshold)
curl -X PUT http://localhost:3000/bank/hierarchy/performance/8 \
  -d '{"score": 40}'

# 3. Check Arban #1 average
cast call $BANK_HIERARCHY_ADDRESS "getArban(uint256)" 1
# Expected: avgPerformance updated

# 4. Check for CollectiveResponsibilityTriggered event
cast logs --from-block latest \
  --address $BANK_HIERARCHY_ADDRESS \
  --event-signature "CollectiveResponsibilityTriggered(uint256,string)"

# 5. Verify cascade to Zun
cast call $BANK_HIERARCHY_ADDRESS "getZun(uint256)" 1
# Expected: avgPerformance reflects Arban average
```

### Expected Results:
- ✅ Individual scores updated
- ✅ Arban average calculated correctly
- ✅ Collective responsibility event triggered (score < 50)
- ✅ Performance cascades: Arban → Zun → Myangan → Tumen

---

## Scenario 4: Judicial Freeze Order Flow

**Objective**: Verify complete freeze order from proposal to execution.

### Pre-conditions:
- JudicialMultiSig has 5 judges
- Employee wallet exists in CitizenWalletGuard
- Threshold is 3-of-5

### Test Steps:

```bash
# 1. Judge 1 proposes freeze order
cast send $JUDICIAL_MULTISIG_ADDRESS \
  "proposeFreezeOrder(address,bytes32,string)" \
  0xEmployee123... \
  0x1234...case_hash \
  "Investigation: Financial fraud" \
  --private-key $JUDGE_1_KEY

# 2. Check order status
cast call $JUDICIAL_MULTISIG_ADDRESS \
  "getOrder(uint256)" 1
# Expected: status=PENDING, signatureCount=1

# 3. Judge 2 signs
cast send $JUDICIAL_MULTISIG_ADDRESS \
  "signOrder(uint256)" 1 \
  --private-key $JUDGE_2_KEY

# 4. Judge 3 signs (reaches threshold)
cast send $JUDICIAL_MULTISIG_ADDRESS \
  "signOrder(uint256)" 1 \
  --private-key $JUDGE_3_KEY

# 5. Execute order
cast send $JUDICIAL_MULTISIG_ADDRESS \
  "executeOrder(uint256)" 1 \
  --private-key $JUDGE_1_KEY

# 6. Verify wallet is frozen
cast call $CITIZEN_WALLET_GUARD_ADDRESS \
  "checkTransaction(address,address,uint256)" \
  0xEmployee123... \
  0xRecipient... \
  1000000
# Expected: allowed=false, reason="Judicial freeze"
```

### Expected Results:
- ✅ Order proposed by judge
- ✅ Multiple judges sign
- ✅ Order executes after threshold
- ✅ Wallet frozen in CitizenWalletGuard
- ✅ Transactions blocked

---

## Scenario 5: Institutional Bank Account

**Objective**: Verify government/organization accounts work correctly.

### Pre-conditions:
- InstitutionalBank deployed
- Treasury multi-sig wallet exists

### Test Steps:

```bash
# 1. Open government account
cast send $INSTITUTIONAL_BANK_ADDRESS \
  "openGovAccount(address,uint256,bytes32,string)" \
  $GOV_TREASURY \
  1 \
  0x...registration_hash \
  "State Treasury" \
  --private-key $CHAIRMAN_KEY

# 2. Distribute funds from correspondent account
cast send $INSTITUTIONAL_BANK_ADDRESS \
  "distributeFromCorr(uint256,uint256)" \
  1 \
  10000000000000 \
  --private-key $OFFICER_KEY

# 3. Verify balance
cast call $INSTITUTIONAL_BANK_ADDRESS \
  "getBalance(uint256)" 1

# 4. Attempt large transfer (test daily limit)
# Approve first
cast send $ALTAN_ADDRESS \
  "approve(address,uint256)" \
  $INSTITUTIONAL_BANK_ADDRESS \
  10000000000000 \
  --from $GOV_TREASURY

# Transfer
cast send $INSTITUTIONAL_BANK_ADDRESS \
  "transferFrom(uint256,address,uint256)" \
  1 \
  0xRecipient... \
  15000000000000 \
  --from $GOV_TREASURY
# Expected: Revert - DailyLimitExceeded
```

### Expected Results:
- ✅ Government account opened
- ✅ Funds distributed
- ✅ Daily limits enforced
- ✅ Multi-sig requirements work

---

## Scenario 6: Promotion Eligibility Check

**Objective**: Verify promotion system based on performance.

### Pre-conditions:
- Employee registered with initial performance 75

### Test Steps:

```bash
# 1. Check initial promotion eligibility
curl -X GET http://localhost:3000/bank/hierarchy/promotion/1 \
  -H "Authorization: Bearer $JWT_TOKEN"
# Expected: canBePromoted=false (need score >= 80)

# 2. Update performance to 85
curl -X PUT http://localhost:3000/bank/hierarchy/performance/1 \
  -d '{"score": 85}'

# 3. Check promotion eligibility again
curl -X GET http://localhost:3000/bank/hierarchy/promotion/1
# Expected: canBePromoted=true
```

### Expected Results:
- ✅ Promotion blocked at low performance
- ✅ Promotion allowed at high performance
- ✅ Threshold enforced correctly (>= 80)

---

## Performance Benchmarks

### Gas Costs (Estimated)

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| Employee Registration | ~350,000 | One-time per employee |
| Performance Update | ~100,000 | Includes cascade calculation |
| Judicial Freeze Proposal | ~250,000 | First signature |
| Judicial Freeze Sign | ~80,000 | Additional signatures |
| Judicial Freeze Execute | ~200,000 | Calls CitizenWalletGuard |
| Tier Distribution | ~150,000 | Per tier |
| Institutional Account Open | ~200,000 | One-time |

### Throughput Targets

- **Employee Registration**: 100 per hour
- **Performance Updates**: 1,000 per day
- **Tier Distributions**: 500 per day
- **Judicial Orders**: 10 per day

---

## Monitoring Checklist

After deployment, monitor:

- [ ] Employee registration success rate
- [ ] Performance update frequency
- [ ] Collective responsibility triggers
- [ ] Judicial order execution time
- [ ] Tier distribution success rate
- [ ] Daily limit enforcement
- [ ] Error rates per endpoint
- [ ] Gas cost trends

---

## Rollback Scenarios

### Critical Bugs Found

**Scenario A**: Employee registration fails citizen verification
- **Action**: Pause employee registration via backend
- **Fix**: Update citizen verification logic
- **Deploy**: New BankHierarchy service version

**Scenario B**: Performance cascade fails
- **Action**: Manual performance recalculation script
- **Fix**: Update cascade logic in contract
- **Deploy**: Cannot update contract, deploy new version

**Scenario C**: Judicial freeze not working
- **Action**: Manual freeze via CitizenWalletGuard admin
- **Fix**: Check JudicialMultiSig signature threshold
- **Deploy**: Reconfigure threshold if needed

---

## Success Criteria

✅ **All scenarios pass without errors**
✅ **Gas costs within acceptable ranges**
✅ **Performance metrics meet targets**
✅ **No security vulnerabilities found**
✅ **Rollback procedures validated**

---

## Next Steps After Tests Pass

1. Deploy to production
2. Run tests against production
3. Monitor for 48 hours
4. Document any issues
5. Optimize gas costs if needed
6. Train bank staff on new system
