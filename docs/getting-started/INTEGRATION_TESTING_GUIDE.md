# Arbad System - Integration Testing Guide

**Date**: January 30, 2026  
**Backend**: http://localhost:3001  
**Status**: ✅ All services running

---

## Quick System Check

### ✅ Services Running
```bash
# Health check
curl -s http://localhost:3001/api/health | jq
```
**Expected**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-30T20:41:48.601Z",
  "services": {
    "api": "ok",
    "database": "ok"
  }
}
```

### ✅ Database Status
- **PostgreSQL**: Running (port 5432)
- **Database**: inomad_khural
- **Tables**: 34 models
- **Migrations**: Up to date ✓

### ✅ Blockchain Status
- **Network**: Anvil (localhost:8545)
- **Chain ID**: 31337
- **ArbadCompletion**: `0x5fbdb2315678afecb367f032d93f642f64180aa3`
- **ArbadCreditLine**: `0xe7f1725e7734ce288f8367e1bb143e90bb3f0512`

---

## Authentication Requirements

### 🔐 All Arbad endpoints require:

1. **JWT Authentication**
   - Header: `Authorization: Bearer <token>`
   - Obtained via `/api/auth/login` or similar

2. **Seat ID Header**
   - Header: `x-seat-id: <seatId>`
   - User's seat ID from identity system

3. **Wallet Private Key**
   - Sent in request body as `privateKey`
   - Used to sign blockchain transactions
   - ⚠️ **NEVER use real private keys in production logs**

### Example Auth Headers
```bash
-H "Authorization: Bearer eyJhbGc..." \
-H "x-seat-id: 1" \
-H "Content-Type: application/json"
```

---

## Testing Endpoints

### 1. Family Arbad Endpoints (9)

#### 1.1 Register Marriage
Creates a new Family Arbad.

```bash
curl -X POST http://localhost:3001/api/arbads/family/marriage \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "husbandSeatId": 1,
    "wifeSeatId": 2,
    "privateKey": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  }'
```

**Expected**: `201 Created`
```json
{
  "arbadId": 1,
  "txHash": "0x..."
}
```

**Blockchain Event**: `MarriageRegistered(arbadId, husbandSeatId, wifeSeatId)`

**Database Check**:
```sql
SELECT * FROM "FamilyArbad" WHERE "arbadId" = 1;
```

---

#### 1.2 Add Child
```bash
curl -X POST http://localhost:3001/api/arbads/family/1/children \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "childSeatId": 3,
    "privateKey": "0x..."
  }'
```

**Expected**: `201 Created`
```json
{
  "success": true,
  "message": "Child added successfully"
}
```

---

#### 1.3 Change Heir
```bash
curl -X PUT http://localhost:3001/api/arbads/family/1/heir \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "newHeirSeatId": 3,
    "privateKey": "0x..."
  }'
```

---

#### 1.4 Set Khural Representative
```bash
curl -X POST http://localhost:3001/api/arbads/family/1/khural-rep \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "repSeatId": 1,
    "birthYear": 1990,
    "privateKey": "0x..."
  }'
```

---

#### 1.5 Get Khural Representatives (Public - No Auth)
```bash
curl -X GET http://localhost:3001/api/arbads/family/khural-reps \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1"
```

---

#### 1.6 Get Family Arbad
```bash
curl -X GET http://localhost:3001/api/arbads/family/1 \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1"
```

**Expected**:
```json
{
  "arbadId": 1,
  "husbandSeatId": 1,
  "wifeSeatId": 2,
  "childrenSeatIds": [3],
  "heirSeatId": 3,
  "isActive": true,
  "createdAt": "2026-01-30T..."
}
```

---

#### 1.7 Get Family by Seat ID
```bash
curl -X GET http://localhost:3001/api/arbads/family/by-seat/1 \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1"
```

---

#### 1.8 Check Khural Eligibility
```bash
curl -X GET http://localhost:3001/api/arbads/family/1/khural-eligible \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1"
```

**Expected**:
```json
{
  "arbadId": 1,
  "eligible": true
}
```

---

#### 1.9 Sync from Blockchain
```bash
curl -X POST http://localhost:3001/api/arbads/family/1/sync \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1"
```

---

### 2. Zun Endpoints (5)

#### 2.1 Form Zun
Combine 10 family arbads into a Zun.

```bash
curl -X POST http://localhost:3001/api/arbads/zun \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "familyArbadIds": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    "privateKey": "0x..."
  }'
```

**Expected**: `201 Created`
```json
{
  "zunId": 1,
  "txHash": "0x..."
}
```

---

#### 2.2 Set Zun Elder
```bash
curl -X PUT http://localhost:3001/api/arbads/zun/1/elder \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "elderSeatId": 1,
    "privateKey": "0x..."
  }'
```

---

#### 2.3 Get Zun
```bash
curl -X GET http://localhost:3001/api/arbads/zun/1 \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1"
```

---

#### 2.4 Get Zun by Family Arbad
```bash
curl -X GET http://localhost:3001/api/arbads/zun/by-family/1 \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1"
```

---

#### 2.5 Sync Zun from Blockchain
```bash
curl -X POST http://localhost:3001/api/arbads/zun/1/sync \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1"
```

---

### 3. Organizational Arbad Endpoints (6)

#### 3.1 Create Organization
```bash
curl -X POST http://localhost:3001/api/arbads/org \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Siberian Trading Guild",
    "orgType": 6,
    "privateKey": "0x..."
  }'
```

**Org Types**:
- 0: NONE
- 1: EXECUTIVE
- 2: JUDICIAL
- 3: BANKING
- 4: PRIVATE_COMPANY
- 5: STATE_COMPANY
- 6: GUILD
- 7: SCIENTIFIC_COUNCIL
- 8: EKHE_KHURAL

---

#### 3.2 Add Member to Organization
```bash
curl -X POST http://localhost:3001/api/arbads/org/1/members \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "seatId": 2,
    "privateKey": "0x..."
  }'
```

---

#### 3.3 Set Organization Leader
```bash
curl -X PUT http://localhost:3001/api/arbads/org/1/leader \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "leaderSeatId": 1,
    "privateKey": "0x..."
  }'
```

---

#### 3.4 Create Department
```bash
curl -X POST http://localhost:3001/api/arbads/org/1/departments \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "deptName": "Research Division",
    "privateKey": "0x..."
  }'
```

---

#### 3.5 Get Organization
```bash
curl -X GET http://localhost:3001/api/arbads/org/1 \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1"
```

---

#### 3.6 Get Organizations by Type
```bash
curl -X GET 'http://localhost:3001/api/arbads/org?orgType=6' \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1"
```

---

### 4. Credit System Endpoints (14)

#### 4.1 Open Family Credit Line
```bash
curl -X POST http://localhost:3001/api/arbads/credit/family/1/open \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "privateKey": "0x..."
  }'
```

**Expected**:
```json
{
  "creditLineId": "1-family",
  "txHash": "0x...",
  "maxCredit": "100000000000000000000"
}
```

---

#### 4.2 Borrow from Family Credit Line
```bash
curl -X POST http://localhost:3001/api/arbads/credit/family/1/borrow \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "1000000000000000000",
    "privateKey": "0x..."
  }'
```

---

#### 4.3 Repay Family Loan
```bash
curl -X POST http://localhost:3001/api/arbads/credit/family/1/repay \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "loanId": "loan-1",
    "amount": "500000000000000000",
    "privateKey": "0x..."
  }'
```

---

#### 4.4 Get Family Credit Line
```bash
curl -X GET http://localhost:3001/api/arbads/credit/family/1 \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1"
```

---

#### 4.5 Get Family Loans
```bash
curl -X GET http://localhost:3001/api/arbads/credit/family/1/loans \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1"
```

---

#### 4.6 Get Family Credit Dashboard
```bash
curl -X GET http://localhost:3001/api/arbads/credit/family/1/dashboard \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1"
```

---

#### 4.7-4.12 Organizational Credit (Same as Family)
Replace `/family/` with `/org/` in the above endpoints.

---

#### 4.13 Set Interest Rate (Admin)
```bash
curl -X PUT http://localhost:3001/api/arbads/credit/interest-rate \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "x-seat-id: 1" \
  -H "Content-Type: application/json" \
  -d '{
    "rateBps": 600,
    "privateKey": "0x..."
  }'
```

---

#### 4.14 Get Interest Rate
```bash
curl -X GET http://localhost:3001/api/arbads/credit/interest-rate \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "x-seat-id: 1"
```

**Current Status**: Returns 401 (auth required)

---

## Verification Steps

### 1. Database Verification
```bash
cd backend && npx prisma studio
```

**Tables to check**:
- `FamilyArbad`
- `FamilyArbadChild`
- `Zun`
- `ZunMember`
- `OrganizationalArbad`
- `OrgArbadMember`
- `CreditLine`
- `Loan`

---

### 2. Blockchain Event Logs

Check Anvil terminal for event emissions:
```
MarriageRegistered(arbadId, husbandId, wifeId)
ChildAdded(arbadId, childSeatId)
ZunFormed(zunId, familyArbadIds)
OrgArbadCreated(arbadId, name, orgType, branch)
CreditLineOpened(arbadId, isOrg, maxCredit)
Borrowed(arbadId, isOrg, amount)
Repaid(loanId, amount)
```

---

### 3. Contract State Verification

Using `cast` (Foundry):
```bash
# Get Family Arbad from contract
cast call 0x5fbdb2315678afecb367f032d93f642f64180aa3 \
  "getFamilyArbad(uint256)" 1

# Get Credit Line status
cast call 0xe7f1725e7734ce288f8367e1bb143e90bb3f0512 \
  "getCreditLine(uint256,bool)" 1 false
```

---

## Known Limitations

1. **Authentication Required**: All endpoints need valid JWT + seat ID
2. **Wallet Management**: Private keys must be provided in requests (not production-ready)
3. **Test Data**: No seed data available, must create from scratch
4. **Anvil State**: Blockchain state resets when Anvil restarts

---

## Next Steps

### Option 1: Get Real JWT Token
1. Create test user via `/api/auth/register`
2. Login via `/api/auth/login`
3. Use returned token for Arbad endpoints

### Option 2: Browser UI Testing
1. Start frontend: `npm run dev`
2. Navigate to `http://localhost:3000/arbads`
3. Test flows via UI

### Option 3: Mock Auth Middleware
Temporarily disable `JwtAuthGuard` for testing (development only)

---

## Success Criteria

- [ ] Health check passing
- [ ] Database connected (34 tables)
- [ ] Contracts deployed and accessible
- [ ] At least 1 successful marriage registration
- [ ] Database shows Family Arbad record
- [ ] Blockchain event emitted
- [ ] Credit line can be opened
- [ ] No TypeScript compilation errors
- [ ] Backend logs show no runtime errors
