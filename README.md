# Altan - Digital Nation Infrastructure

[![Build Status](https://img.shields.io/badge/build-in%20development-yellow)](https://github.com/inomadinc/inomad-client)
[![Phase](https://img.shields.io/badge/phase-2%20governance-blue)]()
[![License](https://img.shields.io/badge/license-proprietary-red)]()

## 🏛️ Overview

Altan is a comprehensive digital nation infrastructure built on Ethereum, implementing a decentralized governance system based on the Arban (household unit) model from Nomadic Culture Institute specifications.

## 📊 Project Status

**Current Phase**: Phase 2 - Governance Systems  
**Last Updated**: 2026-01-31

### Completed Features ✅

| Module | Status | Description |
|--------|--------|-------------|
| **Citizen Registration** | ✅ Complete | Identity verification, seat IDs, wallet creation |
| **Bank of Siberia** | ✅ Complete | Central bank, accounts, transactions |
| **Two-Type Arban System** | ✅ Complete | FamilyArban + OrganizationalArban |
| **Credit System** | ✅ Complete | Credit lines, borrowing, repayment |
| **Zun Clans** | ✅ Complete | Extended family structures |
| **Digital Seal** | ✅ Complete | 2-of-2 multisig contracts |
| **Academy of Sciences** | ✅ Complete | Patent/discovery registration |
| **Council of Justice** | ✅ Complete | Case filing, rulings |
| **Temple of Heaven** | ✅ Complete | State records, donations |
| **MPC Wallet (Week 1)** | ✅ Complete | Key splitting, recovery foundation |

### In Progress 🚧

| Module | Status | ETA |
|--------|--------|-----|
| MPC Wallet (Week 2-4) | 🚧 In Progress | Feb 2026 |
| Account Abstraction (ERC-4337) | 📋 Planned | Feb 2026 |
| Gasless Transactions | 📋 Planned | Feb 2026 |

---

## 🏗️ Architecture

```
inomad-client/
├── backend/          # NestJS API server
│   ├── src/
│   │   ├── auth/           # JWT authentication
│   │   ├── arbans/         # Arban management
│   │   ├── bank/           # Bank operations
│   │   ├── central-bank/   # Central bank admin
│   │   ├── mpc-wallet/     # MPC wallet (NEW)
│   │   ├── digital-seal/   # Multisig contracts
│   │   ├── academy/        # Academy of Sciences
│   │   ├── justice/        # Council of Justice
│   │   └── temple/         # Temple of Heaven
│   └── prisma/       # Database schema
├── chain/            # Solidity smart contracts
│   ├── contracts/
│   │   ├── AltanBankOfSiberia.sol
│   │   ├── DigitalSeal.sol
│   │   ├── AcademyOfSciences.sol
│   │   ├── CouncilOfJustice.sol
│   │   └── TempleOfHeaven.sol
│   └── test/         # Foundry tests
└── src/              # Next.js frontend
    ├── components/
    │   ├── arbans/         # Arban UI
    │   └── governance/     # Governance UI
    └── lib/
        └── hooks/          # React hooks
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Foundry (for smart contracts)
- pnpm or npm

### Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your database credentials

npm install
npx prisma migrate dev
npm run start:dev
```

### Smart Contracts

```bash
cd chain
forge build
forge test
```

### Frontend

```bash
npm install
npm run dev
```

---

## 📚 Key Modules

### MPC Wallet (NEW - Week 1 Complete)

Multi-Party Computation wallet with 2-of-3 threshold signing:
- **Device Share**: Stored in user's browser
- **Server Share**: Encrypted on backend
- **Recovery Share**: Distributed to guardians

API Endpoints:
```
POST /mpc-wallet/create
POST /mpc-wallet/sign-transaction
POST /mpc-wallet/guardians
POST /mpc-wallet/recovery/initiate
```

### Two-Type Arban System

- **FamilyArban**: Household units (husband + wife + children)
- **OrganizationalArban**: Work/guild units (10 members + leader)

### Digital Seal

2-of-2 multisig for business contracts:
```solidity
contract DigitalSeal {
    function approve() external;   // Both parties must approve
    function execute() external;   // Execute after 2 approvals
}
```

---

## 📋 Database Models

Key Prisma models (see `backend/prisma/schema.prisma`):

| Model | Purpose |
|-------|---------|
| `User` | Citizen records with seatId |
| `FamilyArban` | Household units |
| `OrganizationalArban` | Work units |
| `MPCWallet` | MPC wallet records |
| `SmartAccount` | ERC-4337 accounts |
| `DigitalSeal` | Multisig contracts |

---

## 🔐 Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/inomad_khural

# JWT
JWT_SECRET=your-secret-key

# Blockchain
CHAIN_RPC_URL=http://localhost:8545
PRIVATE_KEY=0x...

# MPC (NEW)
SERVER_SHARE_KEY=your-32-byte-hex-key
```

---

## 📝 Development Workflow

1. **Branch from `main`** for feature work
2. **Run tests** before committing: `npm test`
3. **Database changes**: Create migration with `npx prisma migrate dev --name feature_name`
4. **Smart contracts**: Test with `forge test -vvv`

---

## 👥 Team Contacts

- **Architecture**: See `/docs/diagrams/`
- **API Docs**: See Swagger at `http://localhost:3000/api`
- **Contracts**: See `chain/DEPLOYMENT.md`

---

## 📅 Roadmap

### Q1 2026
- [x] Phase 1: Core Infrastructure
- [x] Phase 2: Governance Systems
- [ ] Phase 2.5: MPC Wallet + Account Abstraction

### Q2 2026
- [ ] Phase 3: Gasless Transactions
- [ ] Phase 3.5: Mobile App Integration
- [ ] Phase 4: Mainnet Deployment

---

## 📄 License

Proprietary - Nomadic Culture Institute
