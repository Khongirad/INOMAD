# Arbad System Integration Testing Guide
**Date**: January 30, 2026  
**Purpose**: Comprehensive testing plan for Two-Type Arbad System

---

## 🎯 Testing Overview

### Systems to Test
1. **Family Arbad System** (Legislative Branch)
2. **Organizational Arbad System** (Executive/Judicial/Banking)
3. **Zun/Clan Formation** (10 Family Arbads)
4. **Credit Line System** (Rating, borrowing, repayment)
5. **3-Tier Distribution** (Manual approval workflow)

---

## 📋 Prerequisites

### Database Setup
```bash
# 1. Start PostgreSQL (macOS)
brew services start postgresql@14

# OR use Docker
docker run --name postgres-inomad \
  -e POSTGRES_USER=inomad \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=inomad_khural \
  -p 5432:5432 \
  -d postgres:14

# 2. Run migrations
cd backend
npx prisma migrate dev

# 3. Verify tables created
npx prisma studio
```

### Backend Setup
```bash
cd backend
npm run start:dev
# Server should start on http://localhost:3001
```

### Frontend Setup
```bash
cd ..
npm run dev
# Frontend should start on http://localhost:3000
```

### Blockchain Setup
```bash
cd chain
anvil
# Blockchain on http://localhost:8545
```

---

## 🧪 API Testing Plan

### Phase 1: Family Arbad Creation

#### Test 1.1: Create Family Arbad
```bash
curl -X POST http://localhost:3001/arbads/family \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "arbadId": 1,
    "husbandSeatId": 1,
    "wifeSeatId": 2,
    "children": [3, 4, 5]
  }'
```

**Expected Response**:
```json
{
  "id": "uuid",
  "arbadId": 1,
  "husbandSeatId": 1,
  "wifeSeatId": 2,
  "heirSeatId": null,
  "isActive": true,
  "children": [
    {"childSeatId": 3},
    {"childSeatId": 4},
    {"childSeatId": 5}
  ],
  "createdAt": "2026-01-30T..."
}
```

#### Test 1.2: Designate Heir
```bash
curl -X PATCH http://localhost:3001/arbads/family/1/heir \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "heirSeatId": 3
  }'
```

#### Test 1.3: Assign Khural Representative
```bash
curl -X PATCH http://localhost:3001/arbads/family/1/khural-rep \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "khuralRepSeatId": 1,
    "khuralRepBirthYear": 1975
  }'
```

#### Test 1.4: Get Family Arbad Details
```bash
curl http://localhost:3001/arbads/family/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Phase 2: Credit Line Testing

#### Test 2.1: Create Credit Line for Family Arbad
```bash
curl -X POST http://localhost:3001/arbads/credit/lines \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "arbadId": 1,
    "creditType": "FAMILY"
  }'
```

**Expected Response**:
```json
{
  "id": "uuid",
  "arbadId": 1,
  "creditType": "FAMILY",
  "creditRating": 500,
  "creditLimit": "10000.000000",
  "borrowed": "0.000000",
  "isActive": true
}
```

#### Test 2.2: Borrow from Credit Line
```bash
curl -X POST http://localhost:3001/arbads/credit/loans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "arbadId": 1,
    "principal": 5000,
    "interest": 250,
    "dueDate": "2026-03-01T00:00:00Z"
  }'
```

**Expected Response**:
```json
{
  "id": "uuid",
  "loanId": 1,
  "arbadId": 1,
  "principal": "5000.000000",
  "interest": "250.000000",
  "dueDate": "2026-03-01T00:00:00.000Z",
  "isActive": true,
  "isDefaulted": false
}
```

#### Test 2.3: Check Credit Line Status
```bash
curl http://localhost:3001/arbads/credit/lines/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected**: `borrowed` should be 5000

#### Test 2.4: Repay Loan
```bash
curl -X PATCH http://localhost:3001/arbads/credit/loans/1/repay \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected**: Credit rating increases, `borrowed` decreases

---

### Phase 3: Organizational Arbad

#### Test 3.1: Create Organizational Arbad (Government)
```bash
curl -X POST http://localhost:3001/arbads/organizational \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "arbadId": 100,
    "name": "Ministry of Finance",
    "orgType": "EXECUTIVE",
    "powerBranch": "EXECUTIVE",
    "members": [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
  }'
```

#### Test 3.2: Assign Leader
```bash
curl -X PATCH http://localhost:3001/arbads/organizational/100/leader \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "leaderSeatId": 10
  }'
```

#### Test 3.3: Create Organizational Credit Line
```bash
curl -X POST http://localhost:3001/arbads/credit/lines \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "arbadId": 100,
    "creditType": "ORG"
  }'
```

---

### Phase 4: Zun (Clan) Formation

#### Test 4.1: Create Zun with 10 Family Arbads
```bash
curl -X POST http://localhost:3001/arbads/zun \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "zunId": 1,
    "name": "Borjigin Clan",
    "founderArbadId": 1,
    "memberArbadIds": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  }'
```

**Expected Response**:
```json
{
  "id": "uuid",
  "zunId": 1,
  "name": "Borjigin Clan",
  "founderArbadId": 1,
  "elderSeatId": null,
  "isActive": true,
  "memberArbads": 10
}
```

#### Test 4.2: Assign Elder
```bash
curl -X PATCH http://localhost:3001/arbads/zun/1/elder \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "elderSeatId": 1
  }'
```

---

## 🌐 Frontend Testing Plan

### Test 5: UI Components

#### 5.1: Credit Dashboard
1. Navigate to `/arbads/credit`
2. Verify credit line displays
3. Check credit rating visualization
4. Verify borrowed amount
5. Test borrow form

#### 5.2: Family Tree
1. Navigate to `/arbads/family/1`
2. Verify family structure displays
3. Check husband/wife/children
4. Verify heir designation
5. Test Khural rep display

#### 5.3: Clan Tree
1. Navigate to `/arbads/zun/1`
2. Verify clan hierarchy
3. Check 10 member arbads
4. Verify elder display

---

## ✅ Test Checklist

### Database Layer
- [ ] FamilyArbad table created
- [ ] OrganizationalArbad table created
- [ ] Zun table created
- [ ] CreditLine table created
- [ ] Loan table created
- [ ] TierDistribution table created
- [ ] All indexes created

### Backend API
- [ ] ArbadModule imported in app.module.ts
- [ ] Family Arbad CRUD endpoints work
- [ ] Organizational Arbad CRUD endpoints work
- [ ] Zun CRUD endpoints work
- [ ] Credit Line endpoints work
- [ ] Loan endpoints work

### Frontend UI
- [ ] Credit Dashboard renders
- [ ] Family Tree component works
- [ ] Clan Tree component works
- [ ] Borrow Form submits
- [ ] Marriage Registration works

### Integration
- [ ] API → Database writes work
- [ ] Frontend → API calls work
- [ ] Credit rating updates correctly
- [ ] Loan repayment updates balance
- [ ] 3-tier distribution detects eligibility

---

## 🐛 Known Issues

1. **PostgreSQL not running** - Need to start database
2. **ArbadModule not imported** - ✅ FIXED in this session
3. **No test data** - Need to seed database

---

## 📝 Test Results Template

```markdown
# Test Results - Arbad System
Date: [DATE]
Tester: [NAME]

## Family Arbad
- [ ] Create: [PASS/FAIL]
- [ ] Designate Heir: [PASS/FAIL]
- [ ] Assign Khural Rep: [PASS/FAIL]
- [ ] Get Details: [PASS/FAIL]

## Credit Line
- [ ] Create: [PASS/FAIL]
- [ ] Borrow: [PASS/FAIL]
- [ ] Repay: [PASS/FAIL]
- [ ] Rating Update: [PASS/FAIL]

## Organizational Arbad
- [ ] Create: [PASS/FAIL]
- [ ] Assign Leader: [PASS/FAIL]
- [ ] Get Members: [PASS/FAIL]

## Zun
- [ ] Create: [PASS/FAIL]
- [ ] Assign Elder: [PASS/FAIL]
- [ ] Get Members: [PASS/FAIL]

## Issues Found
1. [Description]
2. [Description]

## Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

## 🚀 Next Steps After Testing

1. **If tests pass**: Deploy to testnet
2. **If tests fail**: Debug and fix issues
3. **Performance**: Load testing with 1000+ arbads
4. **Security**: Penetration testing
5. **Documentation**: Update API docs with real examples

---

**Status**: Ready for testing once PostgreSQL is started  
**Estimated Time**: 2-3 hours for full test suite  
**Prerequisites**: Database running, migrations applied
