# INOMAD KHURAL — Project Status
**Operating System for Sovereign Governance**

*Last updated: February 20, 2026 · Commit [`4ea3922`](https://github.com/Khongirad/INOMAD/commit/4ea3922)*

---

## 🏛️ What is INOMAD KHURAL?

INOMAD KHURAL is a **digital operating system for a sovereign nation-state**. Like macOS for a computer, it provides the foundational infrastructure through which a people exercises self-governance: electing representatives, passing laws, registering births/marriages/deaths, holding property, running a free market, and managing a sovereign currency.

The system is built around the principle of **determinism**: every citizen's journey through the sovereign system is predictable, irreversible, and cryptographically auditable. No step can be skipped or reversed. The chain of trust is permanent.

---

## 📊 Current State: POST-MVP ✅

The system is architecturally complete and operational. All four branches of governance are implemented and interconnected.

---

## 🏗️ Technical Architecture

| Layer | Technology | Status |
|-------|-----------|--------|
| **Backend API** | NestJS 10 + Prisma ORM + PostgreSQL | ✅ 53 modules |
| **Frontend** | Next.js 14 + TypeScript + TailwindCSS | ✅ All pages |
| **Blockchain L1** | ALTAN chain (Cosmos SDK) | ✅ Testnet |
| **Smart Contracts** | Solidity (EVM) | ✅ 133 contracts |
| **CI/CD** | GitHub Actions | ✅ Green |

### Backend Modules (53 total)

```
auth/           verification/    legislative/    elections/
bank/           distribution/    marketplace/    guilds/
zags-service/   justice/         disputes/       complaints/
land-registry/  migration/       mpc-wallet/     users/
central-bank/   khural/          state-anchor/   ubi-scheduler/
... and 33 more
```

---

## 🏛️ Four Branches of Sovereignty

### 1. Legislative Branch (Законодательная власть) ✅

**Purpose**: Citizen-driven lawmaking through the Khural (parliament)

- Khural proposals: submit → debate → vote → sign → archive
- Vote **nullifiers** (`sha256(seatId|proposalId|"vote")`) — mathematically prevents double-voting
- Signed law **content hash** locked at signing moment — text is immutable after signature
- Elections with certified result hashes (tamper-evident)
- Delegated representation system (`khuralRepresentativeId`)
- **Guard**: Requires `hasExclusiveLandRight` or delegated representative status

### 2. Executive Branch (Исполнительная власть) ✅

**Purpose**: Government services for citizens

**ZAGS (Civil Registry)**
- Marriage / civil union applications with mutual consent flow
- Divorce proceedings with finalization
- Death registration
- Name change applications
- Marriage certificates (verifiable public records)
- **Guard (added Feb 20)**: Requires `isVerified=true` AND `isLegalSubject=true`

**Migration Service** — border crossing, visa management

**Land Registry** — exclusive land rights, property registration

### 3. Judicial Branch (Судебная власть) ✅

**Purpose**: Dispute resolution and justice

- Complaints system
- Dispute mediation
- Justice case management
- **Access**: Admin-only (`AdminGuard`) — judicial power is institutional

### 4. Economy Branch (Свободный рынок) ✅

**Purpose**: Free market, banking, universal income

**Bank of Siberia (Central Bank)**
- ALTAN issuance (2.1 trillion total supply)
- Account management (personal + organizational)
- Balance reconciliation with on-chain drift detection

**Distribution System**
- Birthright ALTAN (1,000 ALTAN on citizen verification)
- UBI: 400 ALTAN/week to all verified citizens with active bank links
- Pension fund management

**Marketplace & Guilds**
- Guild registration and membership
- P2P marketplace listings
- Document contracts with intermediary support

---

## 👤 Citizen Journey (Registration → Full Citizenship)

```
Step 1: /gates/register
  → Enter username + password
  → Read and accept Terms of Service
  → Read and accept Constitution → isLegalSubject=true
  → Account created, 13-digit citizenNumber assigned (permanent)

Step 2: /activation
  → Request verification from existing citizen (guarantor)
  → Guarantor confirms → isVerified=true, verifiedAt=NOW (immutable)
  → 1,000 ALTAN birthright distributed automatically

Step 3: /profile/create
  → Enter demographic data (birthplace, ethnicity, clan, language)
  → Digital shell (юридическая оболочка) complete

Step 4: Full citizen rights
  → Vote in Khural (if landowner)
  → Access ZAGS services (marriage, name change, etc.)
  → Receive UBI (400 ALTAN/week)
  → Participate in marketplace
```

---

## 🔐 Determinism Guarantees (Audited Feb 20, 2026)

Every state transition in INOMAD KHURAL is **one-way and cryptographically auditable**:

| State | Method | Reversible | Evidence |
|-------|--------|-----------|----------|
| `citizenNumber` assigned | `generateCitizenNumber()` | ❌ Never | Non-sequential, collision-checked, locked in DB |
| `isLegalSubject = true` | `acceptConstitution()` | ❌ No (judicial only) | No code path sets it `false` |
| `acceptConstitution` safety | Idempotency guard | – | Returns stored value on retry, never overwrites timestamp |
| `isVerified = true` | `verifyUser()` | ❌ No (soft revoke only) | Guard at line 179 throws on re-verify |
| `verifiedAt` timestamp | `verifyUser()` | ❌ Never | Written once, no update path |
| Vote nullifier | `castVote()` | ❌ Never | `sha256` unique per seat+proposal |
| Law content hash | `signLaw()` | ❌ Never | Hash stored + verified on every read |
| Election result hash | `completeElection()` | ❌ Never | Re-verified on every `getElection()` call |
| Verification chain | `revokeVerification()` | Soft only | Sets `isActive=false`, history preserved |
| Balance drift | `BalanceReconciliationService` | – | Never auto-corrects, creates audit log |

---

## 🧪 Test Coverage

```
Total test suites:  89
Total tests:        3,057+
Pass rate:          100%

Key suites:
  legislative:            89 tests ✅
  verification:           56 tests ✅
  zags-service:           57 tests ✅
  auth-password:          30 tests ✅
  central-bank:           23 tests ✅
  state-anchor:           13 tests ✅
  elections:              28 tests ✅

TypeScript compilation:   0 errors
CI (run #62):             ✅ SUCCESS
```

---

## 📅 Development Timeline (Feb 2026)

| Date | Milestone |
|------|-----------|
| Feb 4-5 | Backend startup fixes, registration flow bug fixes |
| Feb 7-8 | Frontend pages implementation (State Map, Territory, Exchange) |
| Feb 9 | Global AuthGuard + `@Public()` decorator — security layer |
| Feb 10-11 | CI build fixes (Docker, secret leaks) |
| Feb 12-16 | Test coverage expansion to 95%+ (89 suites) |
| Feb 16-18 | API documentation, E2E test finalization |
| Feb 19 | Registration flow restructure, ALTAN birthright wiring, State Structure page |
| **Feb 20** | **Registration polish (7 UX), determinism audit, four-branches integration, daily report** |

---

## 🔗 Key Files

| File | Purpose |
|------|---------|
| `backend/src/auth/auth-password.service.ts` | Registration, TOS, Constitution acceptance |
| `backend/src/verification/verification.service.ts` | Guarantor chain, verification logic |
| `backend/src/legislative/legislative.service.ts` | Laws, votes, nullifiers |
| `backend/src/zags-service/zags-service.service.ts` | ZAGS civil registry |
| `backend/src/central-bank/central-bank.service.ts` | ALTAN issuance, accounts |
| `src/app/(auth)/gates/register/page.tsx` | Registration ceremony (4-step) |
| `src/app/(auth)/activation/page.tsx` | Guarantor verification flow |
| `docs/architecture/REGISTRATION_SPEC.md` | Registration system specification |
| `docs/architecture/MONETARY_POLICY.md` | Central bank & emission policy |

---

## ⚠️ Known Open Items

| Item | Priority | Notes |
|------|----------|-------|
| MPC wallet auto-open on verification | Medium | 100 ALTAN birthright triggers, but pool init needed in prod |
| Cosmos SDK node deployment | Medium | Chain runs locally, testnet deployment pending |
| E2E Playwright tests | Low | Unit coverage is solid; browser automation not yet written |
| `prisma db push` hanging in terminal | Info | Safe to kill — schema is in sync, no migrations pending |

---

*INOMAD KHURAL — The people are the source of law.*
*Registration is not account creation. It is the digital birth of a legal subject.*
