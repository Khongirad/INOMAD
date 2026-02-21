# Legislative Branch (Khural) - Architecture Plan

## Overview

**Approach**: Combo (Deploy Bank + Build Khural)
**Timeline**: 2 weeks
**Key Insight**: VotingCenter as central hub under Legislative control

---

## Architecture: Legislative Branch

```
Legislative Branch (Законодательная власть)
├── VotingCenter.sol (Центр голосования)
│   ├── Manages all votes & proposals
│   ├── Controlled by Legislative authority
│   └── Used by:
│       ├─ ArbadKhural (10 families)
│       ├─ ZunKhural (100 families)
│       ├─ MyangadgKhural (1000 families)
│       └─ TumedKhural (10000 families)
│
├── StatisticsBureau.sol (Бюро статистики)
│   ├── Collects voting data
│   ├── Census & population stats
│   ├── Linked to Temple of Heaven
│   └── Provides data to:
│       ├─ VotingCenter
│       ├─ ScientistCouncil
│       └─ Government
│
└── Khural Hierarchy
    ├── ArbadKhural.sol (Arbad level)
    ├── ZunKhural.sol (Zun level)
    ├── MyangadgKhural.sol (Myangad level)
    └── TumedKhural.sol (National level)
```

---

## Phase 1: Deployment (Week 1, Days 1-2)

### Step 1.1: Deploy Bank Contracts ✅

**Already Ready:**
- ✅ DeployBankContracts.s.sol
- ✅ All contracts tested (53 tests)
- ✅ Environment template

**Execution:**

```bash
# 1. Set environment variables
cp chain/.env.deployment.example chain/.env
# Edit .env with actual addresses

# 2. Deploy
cd chain
forge script script/DeployBankContracts.s.sol \
  --rpc-url $ALTAN_RPC_URL \
  --broadcast \
  --verify

# 3. Update backend .env
# Copy deployed addresses to backend/.env

# 4. Run database migration
cd backend
npx prisma migrate deploy

# 5. Restart backend
pm2 restart inomad-backend
```

**Output**: 5 deployed contracts
- CitizenWalletGuard
- JudicialMultiSig  
- CitizenBank
- InstitutionalBank
- BankArbadHierarchy

**Time**: 4 hours

---

## Phase 2: VotingCenter Core (Week 1, Days 3-7)

### Smart Contract Architecture

#### **VotingCenter.sol** (Core Hub)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title VotingCenter
 * @notice Centralized voting hub for all Legislative Branch votes
 * 
 * Features:
 * - Proposal creation & management
 * - Vote recording & tallying
 * - Execution after passing
 * - Used by all Khural levels
 * - Linked to StatisticsBureau
 */
contract VotingCenter is AccessControl {
    bytes32 public constant LEGISLATIVE_ROLE = keccak256("LEGISLATIVE_ROLE");
    bytes32 public constant KHURAL_ROLE = keccak256("KHURAL_ROLE");
    
    enum ProposalType {
        ARBAD_BUDGET,      // Arbad-level budget
        ARBAD_LEADER,      // Elect Arbad leader
        ZUN_POLICY,        // Zun-level policy
        ZUN_ELDER,         // Elect Zun elder
        MYANGAD_LAW,       // Myangad regional law
        TUMED_NATIONAL,    // National legislation
        CONSTITUTIONAL     // Constitution amendment
    }
    
    enum ProposalStatus {
        PENDING,
        ACTIVE,
        PASSED,
        REJECTED,
        EXECUTED,
        CANCELLED
    }
    
    struct Proposal {
        uint256 id;
        ProposalType proposalType;
        address proposer;
        uint256 khuralLevel;      // 1=Arbad, 2=Zun, 3=Myangad, 4=Tumed
        uint256 khuralId;         // ID of specific Khural
        string title;
        string description;
        bytes executionData;      // Encoded function call
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 quorumRequired;
        uint256 startTime;
        uint256 endTime;
        ProposalStatus status;
    }
    
    struct Vote {
        address voter;
        bool support;
        uint256 timestamp;
        string reason;
    }
    
    // Proposal storage
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => Vote)) public votes;
    mapping(uint256 => address[]) public proposalVoters;
    uint256 public proposalCount;
    
    // Statistics Bureau link
    address public statisticsBureau;
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        ProposalType proposalType,
        uint256 khuralLevel,
        uint256 khuralId,
        address proposer
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votesFor,
        uint256 votesAgainst
    );
    
    event ProposalExecuted(
        uint256 indexed proposalId,
        bool success
    );
    
    constructor(address admin, address _statisticsBureau) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(LEGISLATIVE_ROLE, admin);
        statisticsBureau = _statisticsBureau;
    }
    
    /**
     * @notice Create a new proposal
     * @param proposalType Type of proposal
     * @param khuralLevel Level (1-4)
     * @param khuralId Specific Khural ID
     * @param title Proposal title
     * @param description Full description
     * @param executionData Encoded execution call
     * @param votingPeriod Duration in seconds
     */
    function createProposal(
        ProposalType proposalType,
        uint256 khuralLevel,
        uint256 khuralId,
        string memory title,
        string memory description,
        bytes memory executionData,
        uint256 votingPeriod
    ) external onlyRole(KHURAL_ROLE) returns (uint256) {
        require(khuralLevel >= 1 && khuralLevel <= 4, "Invalid level");
        
        uint256 proposalId = ++proposalCount;
        
        // Calculate quorum based on level
        uint256 quorum = _calculateQuorum(khuralLevel);
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            proposalType: proposalType,
            proposer: msg.sender,
            khuralLevel: khuralLevel,
            khuralId: khuralId,
            title: title,
            description: description,
            executionData: executionData,
            votesFor: 0,
            votesAgainst: 0,
            quorumRequired: quorum,
            startTime: block.timestamp,
            endTime: block.timestamp + votingPeriod,
            status: ProposalStatus.ACTIVE
        });
        
        emit ProposalCreated(proposalId, proposalType, khuralLevel, khuralId, msg.sender);
        
        // Report to StatisticsBureau
        IStatisticsBureau(statisticsBureau).recordProposal(proposalId, khuralLevel);
        
        return proposalId;
    }
    
    /**
     * @notice Cast a vote on a proposal
     */
    function vote(
        uint256 proposalId,
        bool support,
        string memory reason
    ) external onlyRole(KHURAL_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.ACTIVE, "Not active");
        require(block.timestamp <= proposal.endTime, "Voting ended");
        require(votes[proposalId][msg.sender].voter == address(0), "Already voted");
        
        // Record vote
        votes[proposalId][msg.sender] = Vote({
            voter: msg.sender,
            support: support,
            timestamp: block.timestamp,
            reason: reason
        });
        
        proposalVoters[proposalId].push(msg.sender);
        
        // Update tallies
        if (support) {
            proposal.votesFor++;
        } else {
            proposal.votesAgainst++;
        }
        
        emit VoteCast(proposalId, msg.sender, support, proposal.votesFor, proposal.votesAgainst);
        
        // Report to StatisticsBureau
        IStatisticsBureau(statisticsBureau).recordVote(proposalId, msg.sender, support);
    }
    
    /**
     * @notice Finalize a proposal after voting period
     */
    function finalizeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.ACTIVE, "Not active");
        require(block.timestamp > proposal.endTime, "Voting ongoing");
        
        uint256 totalVotes = proposal.votesFor + proposal.votesAgainst;
        
        // Check quorum
        if (totalVotes < proposal.quorumRequired) {
            proposal.status = ProposalStatus.REJECTED;
            return;
        }
        
        // Check majority
        if (proposal.votesFor > proposal.votesAgainst) {
            proposal.status = ProposalStatus.PASSED;
        } else {
            proposal.status = ProposalStatus.REJECTED;
        }
    }
    
    /**
     * @notice Execute a passed proposal
     */
    function executeProposal(uint256 proposalId) external onlyRole(LEGISLATIVE_ROLE) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.PASSED, "Not passed");
        
        // Execute the proposal's action
        (bool success,) = address(this).call(proposal.executionData);
        
        proposal.status = ProposalStatus.EXECUTED;
        emit ProposalExecuted(proposalId, success);
    }
    
    function _calculateQuorum(uint256 level) internal pure returns (uint256) {
        // Arbad: 6/10 (60%)
        if (level == 1) return 6;
        // Zun: 6/10 (60%)
        if (level == 2) return 6;
        // Myangad: 7/10 (70%)
        if (level == 3) return 7;
        // Tumed: 8/10 (80%)
        return 8;
    }
    
    // View functions
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }
    
    function getVote(uint256 proposalId, address voter) external view returns (Vote memory) {
        return votes[proposalId][voter];
    }
}

interface IStatisticsBureau {
    function recordProposal(uint256 proposalId, uint256 level) external;
    function recordVote(uint256 proposalId, address voter, bool support) external;
}
```

#### **StatisticsBureau.sol**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title StatisticsBureau
 * @notice Collects and analyzes voting & population data
 * 
 * Responsibilities:
 * - Census data
 * - Voting statistics
 * - Participation rates
 * - Reports to Temple of Heaven (Scientist Council)
 */
contract StatisticsBureau is AccessControl {
    bytes32 public constant LEGISLATIVE_ROLE = keccak256("LEGISLATIVE_ROLE");
    bytes32 public constant VOTING_CENTER_ROLE = keccak256("VOTING_CENTER_ROLE");
    
    struct VotingStats {
        uint256 totalProposals;
        uint256 totalVotes;
        uint256 participationRate;
        uint256 lastUpdated;
    }
    
    struct CensusData {
        uint256 totalCitizens;
        uint256 totalFamilies;
        uint256 totalArbads;
        uint256 totalZuns;
        uint256 totalMyangads;
        uint256 totalTumeds;
        uint256 lastCensus;
    }
    
    // Statistics storage
    mapping(uint256 => VotingStats) public khuralStats; // khuralLevel => stats
    CensusData public census;
    
    // Temple of Heaven link
    address public templeOfHeaven;
    
    constructor(address admin, address _temple) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(LEGISLATIVE_ROLE, admin);
        templeOfHeaven = _temple;
    }
    
    function recordProposal(uint256 proposalId, uint256 level) 
        external 
        onlyRole(VOTING_CENTER_ROLE) 
    {
        khuralStats[level].totalProposals++;
        khuralStats[level].lastUpdated = block.timestamp;
    }
    
    function recordVote(uint256 proposalId, address voter, bool support) 
        external 
        onlyRole(VOTING_CENTER_ROLE) 
    {
        // Track vote in statistics
        // Can expand with more detailed analytics
    }
    
    function updateCensus(
        uint256 citizens,
        uint256 families,
        uint256 arbads,
        uint256 zuns,
        uint256 myangads,
        uint256 tumeds
    ) external onlyRole(LEGISLATIVE_ROLE) {
        census = CensusData({
            totalCitizens: citizens,
            totalFamilies: families,
            totalArbads: arbads,
            totalZuns: zuns,
            totalMyangads: myangads,
            totalTumeds: tumeds,
            lastCensus: block.timestamp
        });
        
        // Report to Temple of Heaven for scientific analysis
        // ITempleOfHeaven(templeOfHeaven).receiveCensusData(census);
    }
    
    function getStats(uint256 level) external view returns (VotingStats memory) {
        return khuralStats[level];
    }
}
```

#### **ArbadKhural.sol** (Uses VotingCenter)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./VotingCenter.sol";

/**
 * @title ArbadKhural
 * @notice Arbad-level (10 families) legislative assembly
 * 
 * Design:
 * - 10 family representatives vote
 * - Proposals managed by VotingCenter
 * - Decisions on local budget, projects, leader
 */
contract ArbadKhural is AccessControl {
    bytes32 public constant REPRESENTATIVE_ROLE = keccak256("REPRESENTATIVE_ROLE");
    
    VotingCenter public votingCenter;
    uint256 public arbadId;
    
    // Representatives (max 10)
    address[] public representatives;
    mapping(address => bool) public isRepresentative;
    
    constructor(
        address admin,
        uint256 _arbadId,
        address _votingCenter
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        arbadId = _arbadId;
        votingCenter = VotingCenter(_votingCenter);
    }
    
    function addRepresentative(address rep) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(representatives.length < 10, "Max 10 representatives");
        require(!isRepresentative[rep], "Already representative");
        
        representatives.push(rep);
        isRepresentative[rep] = true;
        
        // Grant role in VotingCenter
        votingCenter.grantRole(votingCenter.KHURAL_ROLE(), rep);
    }
    
    function createProposal(
        VotingCenter.ProposalType proposalType,
        string memory title,
        string memory description,
        bytes memory executionData
    ) external returns (uint256) {
        require(isRepresentative[msg.sender], "Not representative");
        
        return votingCenter.createProposal(
            proposalType,
            1, // Arbad level
            arbadId,
            title,
            description,
            executionData,
            7 days // Voting period
        );
    }
}
```

---

## Phase 3: Full Khural Hierarchy (Week 2)

### Contracts to Create:

1. **ZunKhural.sol** - 10 Arbad delegates vote
2. **MyangadgKhural.sol** - 10 Zun delegates vote
3. **TumedKhural.sol** - 10 Myangad delegates vote (National)

All use the same VotingCenter.

---

## Backend Integration

### Database Schema (Prisma)

```prisma
model Proposal {
  id              String   @id @default(uuid())
  proposalId      BigInt   @unique // On-chain ID
  proposalType    ProposalType
  khuralLevel     Int      // 1-4
  khuralId        BigInt
  title           String
  description     String
  proposer        String
  votesFor        Int      @default(0)
  votesAgainst    Int      @default(0)
  quorumRequired  Int
  status          ProposalStatus
  startTime       DateTime
  endTime         DateTime
  executedAt      DateTime?
  createdAt       DateTime @default(now())
  
  votes           Vote[]
  
  @@index([khuralLevel])
  @@index([status])
}

model Vote {
  id          String   @id @default(uuid())
  proposalId  String
  voter       String
  support     Boolean
  reason      String?
  timestamp   DateTime @default(now())
  
  proposal    Proposal @relation(fields: [proposalId], references: [id])
  
  @@unique([proposalId, voter])
}

enum ProposalType {
  ARBAD_BUDGET
  ARBAD_LEADER
  ZUN_POLICY
  ZUN_ELDER
  MYANGAD_LAW
  TUMED_NATIONAL
  CONSTITUTIONAL
}

enum ProposalStatus {
  PENDING
  ACTIVE
  PASSED
  REJECTED
  EXECUTED
  CANCELLED
}
```

### Backend Services

```typescript
// voting-center.service.ts
@Injectable()
export class VotingCenterService {
  async createProposal(dto: CreateProposalDto): Promise<bigint>;
  async vote(proposalId: bigint, support: boolean, reason?: string): Promise<void>;
  async getProposal(proposalId: bigint): Promise<Proposal>;
  async getProposals(filter: ProposalFilter): Promise<Proposal[]>;
  async finalizeProposal(proposalId: bigint): Promise<void>;
  async executeProposal(proposalId: bigint): Promise<void>;
}

// statistics-bureau.service.ts
@Injectable()
export class StatisticsBureauService {
  async getCensus(): Promise<CensusData>;
  async getVotingStats(level: number): Promise<VotingStats>;
  async updateCensus(): Promise<void>;
}
```

---

## Frontend Components

```tsx
// src/components/governance/khural/
├── ProposalList.tsx
├── CreateProposal.tsx
├── VotingCard.tsx
├── VoteButton.tsx
├── ProposalResults.tsx
├── StatisticsDashboard.tsx
└── CensusView.tsx
```

---

## Timeline

### Week 1: Deploy + VotingCenter

| Day | Task | Output |
|-----|------|--------|
| Mon | Deploy Bank contracts | 5 contracts live |
| Tue | Create VotingCenter.sol | Core voting hub |
| Wed | Create StatisticsBureau.sol | Stats tracking |
| Thu | Create ArbadKhural.sol | Arbad voting |
| Fri | Test & Deploy | Voting system live |

### Week 2: Hierarchy + Frontend

| Day | Task | Output |
|-----|------|--------|
| Mon | ZunKhural, MyangadgKhural, TumedKhural | Full hierarchy |
| Tue | Backend services | API ready |
| Wed | Database migration | Schema ready |
| Thu-Fri | Frontend components | Voting UI |
| Sat | Integration testing | End-to-end flow |
| Sun | Polish & Deploy | Production ready |

---

## Integration Points

### VotingCenter ↔ Temple of Heaven

```solidity
// StatisticsBureau reports census to ScientistCouncil
interface ITempleOfHeaven {
    function receiveCensusData(CensusData memory data) external;
    function requestStatisticalAnalysis(bytes memory query) external returns (bytes memory);
}
```

**Use Cases:**
- Census data → Scientific analysis
- Voting patterns → Research
- Population trends → Policy recommendations

---

## Security & Governance

### Access Control

```
VotingCenter:
├── LEGISLATIVE_ROLE → Can execute proposals
├── KHURAL_ROLE → Can create proposals & vote
└── DEFAULT_ADMIN_ROLE → System admin

StatisticsBureau:
├── LEGISLATIVE_ROLE → Update census
├── VOTING_CENTER_ROLE → Record votes
└── DEFAULT_ADMIN_ROLE → System admin

ArbadKhural/ZunKhural/etc:
├── REPRESENTATIVE_ROLE → Voting rights
└── DEFAULT_ADMIN_ROLE → Add representatives
```

### Proposal Lifecycle

```
1. CREATE → Representative creates in VotingCenter
2. ACTIVE → Voting period (7 days default)
3. FINALIZE → Check quorum & majority
4. PASSED/REJECTED → Result determined
5. EXECUTE → Legislative authority executes
```

---

## Success Criteria

After 2 weeks:

✅ VotingCenter deployed and working
✅ All 4 Khural levels functional
✅ StatisticsBureau collecting data
✅ Backend API complete
✅ Frontend voting UI live
✅ Citizens can vote on proposals
✅ Temple of Heaven receives census data

---

## Summary

**Architecture**: Centralized VotingCenter manages all legislative votes
**Control**: Legislative Branch has LEGISLATIVE_ROLE
**Hierarchy**: Arbad → Zun → Myangad → Tumed
**Data**: StatisticsBureau tracks everything
**Integration**: Links to Temple of Heaven for scientific analysis

**This creates a complete democratic system under proper legislative control.** 🏛️
