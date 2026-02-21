# INOMAD KHURAL - Quick Start Guide - iNomad Project
**Critical Path to Launch** 🚀

---

## ⚠️ CRITICAL: Start Here

### Step 1: Start PostgreSQL (5 minutes)

```bash
# Option A: Homebrew (recommended for Mac)
brew services start postgresql@14

# Option B: Docker
docker run --name postgres-inomad \
  -e POSTGRES_USER=inomad \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=inomad_khural \
  -p 5432:5432 \
  -d postgres:14
```

**Verify it's running**:
```bash
# Should show PostgreSQL is running
brew services list | grep postgresql

# OR for Docker
docker ps | grep postgres-inomad
```

---

### Step 2: Run Database Migrations (2 minutes)

```bash
cd /Users/inomadinc/inomad-client/backend

# Run all migrations (including new Arbad system)
npx prisma migrate dev

# You should see:
# ✔ Migration applied: 20260130_add_two_type_arbad_system
```

**Verify tables created**:
```bash
# Open Prisma Studio to view database
npx prisma studio
# Opens http://localhost:5555
# Check: FamilyArbad, OrganizationalArbad, Zun, CreditLine tables exist
```

---

### Step 3: Start Backend (1 minute)

```bash
cd /Users/inomadinc/inomad-client/backend

# Start in dev mode
npm run start:dev

# Should see:
# [Nest] Application successfully started on port 3001
```

**Verify backend is up**:
```bash
# In NEW terminal
curl http://localhost:3001/health
# Should return: {"status":"ok"}
```

---

### Step 4: Start Frontend (1 minute)

```bash
cd /Users/inomadinc/inomad-client

# Start Next.js dev server
npm run dev

# Should see:
# ✓ Ready on http://localhost:3000
```

**Verify frontend**:
- Open browser: http://localhost:3000
- Should see iNomad homepage

---

### Step 5: Start Blockchain (Local) (1 minute)

```bash
cd /Users/inomadinc/inomad-client/chain

# Start Anvil (local Ethereum node)
anvil

# Should see:
# Available Accounts
# Private Keys
# Listening on 127.0.0.1:8545
```

---

## 🧪 Quick Integration Test (5 minutes)

### Test 1: Create Family Arbad

```bash
# Get JWT token first (replace with your actual token)
export JWT_TOKEN="your-jwt-token-here"

# Create family arbad
curl -X POST http://localhost:3001/arbads/family \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "arbadId": 1,
    "husbandSeatId": 1,
    "wifeSeatId": 2,
    "children": [3, 4]
  }'

# Expected: 201 Created
# Response: { "id": "uuid", "arbadId": 1, ... }
```

### Test 2: Create Credit Line

```bash
curl -X POST http://localhost:3001/arbads/credit/lines \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "arbadId": 1,
    "creditType": "FAMILY"
  }'

# Expected: 201 Created
# Response: { "creditRating": 500, "creditLimit": "10000", ... }
```

### Test 3: Borrow from Credit Line

```bash
curl -X POST http://localhost:3001/arbads/credit/loans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "arbadId": 1,
    "principal": 5000,
    "interest": 250,
    "dueDate": "2026-03-01T00:00:00Z"
  }'

# Expected: 201 Created
# Response: { "loanId": 1, "principal": "5000", ... }
```

---

## 📋 Full Test Checklist

After basic tests pass, run comprehensive tests from:
**`backend/ARBAD_TESTING_GUIDE.md`**

### Critical Scenarios:
- [x] Family Arbad creation
- [x] Credit Line allocation
- [x] Loan borrowing
- [ ] Loan repayment
- [ ] Organizational Arbad
- [ ] Zun formation
- [ ] 3-tier distribution request
- [ ] Banker approval workflow
- [ ] Frontend UI components

---

## 🔴 If You See Errors

### Error: "Can't reach database server"
**Fix**: PostgreSQL not running
```bash
brew services start postgresql@14
```

### Error: "Port 3001 already in use"
**Fix**: Kill existing process
```bash
lsof -ti:3001 | xargs kill -9
npm run start:dev
```

### Error: "Module not found"
**Fix**: Install dependencies
```bash
cd backend && npm install
cd .. && npm install
```

### Error: "Migration failed"
**Fix**: Reset database
```bash
cd backend
npx prisma migrate reset
npx prisma migrate dev
```

---

## 🎯 Success Criteria

### ✅ System is Ready When:
1. PostgreSQL running on port 5432
2. Backend API running on port 3001
3. Frontend running on port 3000
4. Anvil blockchain on port 8545
5. All 3 quick tests pass (Family Arbad, Credit Line, Loan)

### 📊 Then Proceed To:
- Full integration testing (ARBAD_TESTING_GUIDE.md)
- Browser UI walkthrough
- FounderBootstrap test fixes
- Performance testing

---

## 🚀 Production Deployment Checklist

### Before Deploy:
- [ ] All integration tests passing
- [ ] FounderBootstrap tests fixed (11/12 → 12/12)
- [ ] Browser testing complete (Safari, Chrome, Firefox)
- [ ] Load testing done (1000+ users)
- [ ] Security audit complete
- [ ] Smart contracts deployed to testnet
- [ ] Environment variables configured
- [ ] Database backup strategy in place

---

**Estimated Time**: 30 minutes to fully running system  
**Next Document**: ARBAD_TESTING_GUIDE.md (comprehensive tests)  
**Help**: All docs in `/backend/` and root directory
