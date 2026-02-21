# BankArbadHierarchy ↔ ArbadCompletion Integration Plan

## Overview

**Two separate but connected systems:**

1. **ArbadCompletion** — Citizen organization (Family/Organizational Arbads)
2. **BankArbadHierarchy** — Bank internal structure (Tumed → Myangad → Zun → Arbad)

## Key Principle

> **Every bank employee is a citizen FIRST, bank employee SECOND.**

```
Citizen (SeatSBT) → ArbadCompletion membership → Bank employment → BankArbadHierarchy position
```

---

## Current State

### ArbadCompletion
- **Family Arbads**: Legislative (Khural) power - MANDATORY for all citizens
- **Organizational Arbads**: Executive/Judicial/Banking branches, Organizations, Guilds
- **Arbad size**: 10 citizens per Arbad
- **Scaling**: Arbad (10) → Zun (10 Arbads = 100) → Myangad (10 Zuns = 1000) → Tumed (10 Myangads = 10000)

### BankArbadHierarchy
- **Internal bank structure**: Builds **bottom-up**
  - Start: Create Arbad (10 employees)
  - Growth: 10 Arbads → Zun (100)
  - Growth: 10 Zuns → Myangad (1000)
  - Growth: 10 Myangads → Tumed (10000)
- **Role assignment by position**: CHAIRMAN, BANKER, OFFICER, TELLER
- **Collective responsibility**: Performance scores cascade upwards
- **Employee tracking**: Links `seatId` to position in hierarchy

---

## Integration Architecture

### 1. Citizen → Bank Employee Flow

```mermaid
graph LR
    A[Citizen with SeatSBT] --> B[Joins Family/Org Arbad]
    B --> C[Family Arbad: Tier 1-2-3 from CitizenBank]
    B --> D[Org Arbad: Bank employee application]
    D --> E[Registered in BankArbadHierarchy]
    E --> F[Assigned to Arbad/Zun/Myangad/Tumed]
    F --> G[Gets bank role: TELLER/OFFICER/BANKER/CHAIRMAN]
```

### 2. Data Flow

| System | Stores | Links |
|--------|--------|-------|
| **ArbadCompletion** | Citizen Arbad membership | `seatId` → `arbadId` |
| **CitizenBank** | Personal accounts, tier distribution | `seatId` → `accountId` |
| **BankArbadHierarchy** | Employment structure | `seatId` → `employeeId` → `arbadId` |

### 3. Dual Mandatory Membership

**Every citizen has exactly TWO Arbads:**

1. **Family Arbad** (MANDATORY)
   - Legislative power (Khural)
   - Formed through marriage
   - Provides Tier 1-2-3 distribution from CitizenBank
   - One Khural representative per family (husband OR wife)

2. **ONE of the following** (MANDATORY):
   - **Executive Branch** Organizational Arbad (Government, Presidency)
   - **Judicial Branch** Organizational Arbad (Courts)
   - **Banking Branch** Organizational Arbad (Central Bank, Commercial Banks)
   - **Organization** Arbad (Private/State companies)
   - **Professional Guild** Arbad
     - Guild elects representative
     - Representative nominated to Temple of Heaven:
       - Scientific Council (for scholars/scientists)
       - Wisdom Council (for wise citizens)

**Example:**
```
Citizen Ivan Petrov:
├─ Family Arbad #234 (with wife + children)
└─ Bank Employee Arbad #5 (BankArbadHierarchy, position: Teller)
```

---

## Implementation Steps

### Phase 1: Link ArbadCompletion → BankArbadHierarchy

**Goal**: Bank hiring requires ArbadCompletion membership.

#### Smart Contract Updates

**BankArbadHierarchy.sol** — Add validation:

```solidity
// Add reference to ArbadCompletion
ArbadCompletion public arbadCompletion;

function setArbadCompletion(address _arbad) external onlyRole(DEFAULT_ADMIN_ROLE) {
    arbadCompletion = ArbadCompletion(_arbad);
}

// Update registerEmployee to check ArbadCompletion
function registerEmployee(
    uint256 arbadId,
    address wallet,
    uint256 seatId
) external onlyRole(OFFICER_ROLE) returns (uint256 employeeId) {
    // VALIDATION: Must be a citizen with seat
    require(seatId != 0, "Must have SeatSBT");
    
    // OPTIONAL: Check if in Org Arbad
    (ArbadCompletion.ArbadType arbadType, uint256 citizenArbadId) = 
        arbadCompletion.getArbadTypeForSeat(seatId);
    
    // Register as bank employee
    // ... existing logic
}
```

### Phase 2: Backend Integration

#### New Service: `bank-hierarchy.service.ts`

```typescript
@Injectable()
export class BankHierarchyService {
  constructor(
    private readonly blockchainService: BlockchainService,
  ) {}

  async registerEmployee(employeeData: {
    seatId: number;
    wallet: string;
    arbadId: number; // Bank Arbad (10-person unit)
  }) {
    // 1. Verify citizen exists in ArbadCompletion
    const arbadType = await this.verifyArbadMembership(employeeData.seatId);
    
    // 2. Register in BankArbadHierarchy
    const tx = await this.hierarchyContract.registerEmployee(
      employeeData.arbadId,
      employeeData.wallet,
      employeeData.seatId
    );
    
    // 3. Store in DB
    await this.prisma.bankEmployee.create({
      data: {
        seatId: employeeData.seatId,
        wallet: employeeData.wallet,
        bankArbadId: employeeData.arbadId,
        employeeId: result.employeeId,
      }
    });
  }

  private async verifyArbadMembership(seatId: number) {
    const result = await this.arbadCompletionContract.getArbadTypeForSeat(seatId);
    
    if (result.arbadType === 0) { // NONE
      throw new Error('Employee must be member of an Arbad');
    }
    
    return result;
  }
}
```

#### Database Schema Addition

```prisma
model BankEmployee {
  id            Int      @id @default(autoincrement())
  seatId        Int      @unique
  wallet        String
  employeeId    Int      @unique // On-chain employee ID
  bankArbadId   Int      // Arbad (10) this employee belongs to
  performance   Int      @default(75)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### Phase 3: Role Assignment Logic

**Automatic role assignment based on position:**

```typescript
function getRole(hierarchyPosition: {
  tumedId: number;
  myangadId: number;
  zunId: number;
  arbadId: number;
  isArbadLeader: boolean;
  isZunLeader: boolean;
  isMyangadLeader: boolean;
  isTumedLeader: boolean;
}): BankRole {
  if (hierarchyPosition.isTumedLeader) return 'CHAIRMAN_ROLE';
  if (hierarchyPosition.isMyangadLeader) return 'BANKER_ROLE';
  if (hierarchyPosition.isZunLeader) return 'OFFICER_ROLE';
  if (hierarchyPosition.isArbadLeader) return 'TELLER_ROLE';
  return 'EMPLOYEE'; // Regular employee
}
```

---

## API Endpoints

### POST `/bank/hierarchy/register-employee`

```json
{
  "seatId": 123,
  "wallet": "0x...",
  "bankArbadId": 5
}
```

### GET `/bank/hierarchy/employee/:seatId`

```json
{
  "seatId": 123,
  "employeeId": 45,
  "hierarchy": {
    "arbad": { "id": 5, "name": "Retail Unit 5" },
    "zun": { "id": 2, "name": "Retail Division" },
    "myangad": { "id": 1, "name": "Branch 1" },
    "tumed": { "id": 1, "name": "Altan Bank of Siberia" }
  },
  "role": "TELLER_ROLE",
  "performance": 85,
  "citizenArbad": {
    "type": "FAMILY",
    "arbadId": 234
  }
}
```

---

## Benefits

1. **Citizen-First**: Bank employees are citizens with full rights
2. **Tier Distribution**: Employees receive Tier 1-2-3 from CitizenBank
3. **Khural Representation**: Employees can be Khural representatives via Family Arbad
4. **Performance Tracking**: Bank hierarchy tracks work performance separately
5. **Collective Responsibility**: Performance cascades up hierarchy

---

## Next Steps

1. ✅ BankArbadHierarchy.sol (complete)
2. ✅ Unit tests (complete)
3. 🔄 Add ArbadCompletion reference to BankArbadHierarchy
4. 🔄 Create `BankHierarchyService` backend
5. 🔄 Add Prisma schema for BankEmployee
6. 🔄 Add API endpoints
7. 🔄 Deploy and test integration

**Status**: Ready for backend implementation.
