# INOMAD KHURAL - Digital Nation Infrastructure
## Siberian Confederation Sovereign Blockchain Platform

[![License](https://img.shields.io/badge/license-proprietary-red)]()
[![Stage](https://img.shields.io/badge/stage-production--ready-green)]()
[![L1](https://img.shields.io/badge/ALTAN%20L1-integrated-blue)]()

---

## 🎯 Executive Summary

**INOMAD KHURAL** is a comprehensive digital nation infrastructure for the Siberian Confederation, implementing constitutional governance and economic systems on blockchain technology.

**Key Components**:
- **ALTAN L1 Blockchain** (Cosmos SDK) with 37 constitutional articles embedded
- **Governance System** (KHURAL) based on Arban (10-member household) model  
- **Economic Framework** including Altan currency, AltanUSD stablecoin bridge
- **Parliamentary Hierarchy**: Arban → Zun → Myangan → Tumen → Republican/Confederate Khurals

**Revenue Model**: [Article 27](docs/blockchain/altan_l1_technical_spec.md#article-27-network-fee) - 0.03% network fee → INOMAD INC (constitutional mandate)

---

## 📊 Project Components

| Component | Technology | Status | Lines of Code | Description |
|-----------|------------|--------|---------------|-------------|
| **ALTAN L1** | Cosmos SDK v0.47.13 | ✅ Integrated | 2,043+ | Constitutional blockchain with x/corelaw |
| **Frontend** | Next.js 14 | ✅ Production | 15,000+ | Citizen portal, governance interface |
| **Backend** | NestJS + PostgreSQL | ✅ Production | 20,000+ | API, authentication, database |
| **Smart Contracts** | Solidity (Foundry) | ✅ Deployed | 10,000+ | Ethereum Layer 2 governance contracts |
| **AltanUSD** | ERC-20 Stablecoin | 📋 Q2 2026 | - | USD-backed regulated stablecoin bridge |

**Total**: 47,000+ lines of production code

---

## 🚀 Quick Start

### For Investors & Stakeholders
- [Executive Summary](docs/README.md) - Project overview
- [Technical Architecture](docs/architecture/altan_l1_enterprise_architecture.md) - System design
- [**IP Proof of Authorship**](docs/blockchain/PROOF_OF_AUTHORSHIP.md) - Legal documentation (Critical)
- [Revenue Model](docs/blockchain/altan_l1_technical_spec.md#article-27-network-fee) - Article 27 (0.03% fee)
- [8-Week Roadmap](docs/blockchain/altan_l1_internal_roadmap.md) - Development timeline

### For Developers
- [Quick Start Guide](docs/getting-started/QUICK_START.md) - Setup in 10 minutes
- [Developer Manual](docs/getting-started/DEVELOPER_MANUAL.md) - Complete development guide
- [Database Setup](docs/getting-started/DATABASE_SETUP.md) - PostgreSQL configuration
- [Testing Guide](docs/getting-started/INTEGRATION_TESTING_GUIDE.md) - QA procedures

### For New Team Members
- [Project Status](docs/management/PROJECT_STATUS.md) - Current phase and priorities
- [Core Invariants](docs/architecture/CORE_INVARIANTS.md) - Critical system rules
- [Arban System Guide](docs/architecture/ARBAN_SYSTEM_GUIDE.md) - Governance model
- [Critical Priorities](docs/management/critical_priorities.md) - Focus areas

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   INOMAD KHURAL Platform                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Frontend (Next.js)                                         │
│  └─ Citizen Portal, Governance UI, Banking Interface        │
│                          ↓                                  │
│  Backend (NestJS)                                           │
│  └─ Authentication, Business Logic, API Layer               │
│                          ↓                                  │
│  ┌──────────────────┬──────────────────┬─────────────────┐ │
│  │  PostgreSQL DB   │  Smart Contracts │  ALTAN L1       │ │
│  │  Citizen Data    │  Governance      │  x/corelaw      │ │
│  │  Banking Records │  Arban System    │  37 Articles    │ │
│  └──────────────────┴──────────────────┴─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

See: [Enterprise Architecture](docs/architecture/altan_l1_enterprise_architecture.md)

---

## 💡 Key Innovations

### 1. Constitutional Blockchain (ALTAN L1)
- **37 Articles** embedded in genesis state
- **Article 27**: Network Fee (0.03% → INOMAD INC, capped at 1000 ALTAN)
- **Article 36**: FreezeLaw - Supreme Court emergency powers
- **Immutable**: Constitutional law enforced at protocol level

### 2. Arban Governance Model
- **10-member households** as fundamental democratic unit
- **Hierarchical system**: Arban (10) → Zun (100) → Myangan (1000) → Tumen (10,000)
- **Direct democracy**: E-voting on all levels
- **Dual Structure**: Family Arbans + Organizational Arbans

### 3. Dual Banking System
- **Central Bank of Siberia**: Monetary policy, ALTAN issuance
- **Citizen Banks**: Personal banking (savings, credit lines)
- **Institutional Banks**: Corporate banking
- **Credit System**: Transparent borrowing with constitutional limits

### 4. MPC Wallet Architecture
- **Non-custodial**: Users control keys via threshold signatures
- **Recoverable**: Social recovery without seed phrases
- **Privacy-preserving**: Zero-knowledge proofs for sensitive operations

### 5. Parliamentary System
- **Republican Khurals**: 8 regional parliaments
- **Confederate Khural**: Federal parliament
- **On-chain voting**: All votes recorded on blockchain
- **Real-time transparency**: Live parliamentary sessions

---

## 📦 Repository Structure

```
Buryad-Mongol/  (Monorepo)
│
├── packages/
│   ├── frontend/          # Next.js 14 web application
│   ├── backend/           # NestJS API server + Prisma ORM
│   ├── blockchain-l1/     # ALTAN L1 Cosmos SDK blockchain ⭐NEW
│   └── contracts/         # Solidity smart contracts (Foundry)
│
├── docs/                  # Complete documentation
│   ├── getting-started/   # Developer onboarding
│   ├── architecture/      # System design docs
│   ├── finance/           # AltanUSD, banking, economic model
│   ├── blockchain/        # L1 specs + IP proof
│   ├── deployment/        # DevOps guides
│   ├── quality/           # Testing & QA
│   ├── management/        # Project management
│   └── sessions/          # Development history (IP proof)
│
├── scripts/               # Automation utilities
├── README.md              # This file
└── LICENSE                # Proprietary license
```

---

## 🔐 Intellectual Property

**Owner**: INOMAD INC  
**Author**: Bair Ivanov (CEO)  
**Created**: January 31 - February 2, 2026  
**Copyright**: © 2026 INOMAD INC. All rights reserved

### Protected Assets
1. **x/corelaw Module** (2,043+ lines) - Constitutional law implementation
2. **37 Constitutional Articles** - Siberian Confederation governance framework
3. **Article 27 Revenue Model** - 0.03% network fee to INOMAD INC
4. **Arban Governance System** - Democratic household model
5. **Dual Banking Architecture** - Central + Citizen/Institutional banks

### Legal Documentation
See [PROOF_OF_AUTHORSHIP.md](docs/blockchain/PROOF_OF_AUTHORSHIP.md) for:
- Complete commit history with SHA-256 hashes
- File-level authorship evidence
- Constitutional article creation timestamps
- Third-party verification instructions

**Primary Proof Commit**: `3d532b4` (February 2, 2026, 02:15 CST)

---

## 📖 Documentation Index

### Getting Started
- [Quick Start](docs/getting-started/QUICK_START.md) - 10-minute setup
- [Developer Manual](docs/getting-started/DEVELOPER_MANUAL.md) - Complete guide
- [Database Setup](docs/getting-started/DATABASE_SETUP.md) - PostgreSQL config
- [Integration Testing](docs/getting-started/INTEGRATION_TESTING_GUIDE.md) - QA guide

### Architecture  
- [Core Invariants](docs/architecture/CORE_INVARIANTS.md) - Critical rules
- [Arban System](docs/architecture/ARBAN_SYSTEM_GUIDE.md) - Governance model
- [Enterprise Architecture](docs/architecture/altan_l1_enterprise_architecture.md) - System design
- [Legislative Architecture](docs/architecture/legislative_architecture.md) - Parliament system
- [Wallet/Bank Architecture](docs/architecture/wallet_bank_architecture.md) - Financial systems

### Finance & Economics
- [AltanUSD Spec](docs/finance/altanusd_technical_spec.md) - Stablecoin design
- [Bank Partnership](docs/finance/altanusd_bank_partnership_agreement.md) - Compliance framework
- [Gatekeeper Bridge](docs/finance/gatekeeper_bridge_protocol.md) - Fiat on/off-ramp
- [Distribution Pool](docs/finance/DISTRIBUTION_POOL_SUMMARY.md) - Token economics
- [Sovereign Fund](docs/finance/SOVEREIGN_FUND_SUMMARY.md) - National reserves

### Blockchain (ALTAN L1)
- [Technical Spec](docs/blockchain/altan_l1_technical_spec.md) - Complete L1 specification
- [Implementation Plan](docs/blockchain/altan_l1_implementation_plan.md) - Development plan
- [**PROOF OF AUTHORSHIP**](docs/blockchain/PROOF_OF_AUTHORSHIP.md) - IP documentation ⭐
- [Internal Roadmap](docs/blockchain/altan_l1_internal_roadmap.md) - 8-week timeline
- [Sovereign Strategy](docs/blockchain/sovereign_blockchain_strategy.md) - Independence model

### Deployment & Operations
- [Deployment Guide](docs/deployment/deployment_guide.md) - Production deployment
- [Quick Install](docs/deployment/quick_install.md) - Fast setup script
- [Weekend Setup](docs/deployment/weekend_setup_guide.md) - Saturday deployment

### Quality Assurance
- [Testing Status](docs/quality/TESTING_STATUS.md) - Current test coverage
- [Frontend Quality](docs/quality/FRONTEND_QUALITY_REPORT.md) - UI/UX audit

### Project Management
- [Project Status](docs/management/PROJECT_STATUS.md) - Current phase
- [Critical Priorities](docs/management/critical_priorities.md) - Focus areas
- [System Status](docs/management/final_system_status.md) - Health metrics

### Development Sessions (IP Proof)
- [Session Jan 31](docs/sessions/session_2026_01_31.md) - Initial development
- [Session Feb 1 (Night)](docs/sessions/session_2026_02_01_night.md) - Toolchain debugging
- [Session Feb 2](docs/sessions/session_2026_02_02.md) - x/corelaw integration ⭐
- [Technical Walkthrough](docs/sessions/walkthrough.md) - Module integration guide

---

## 🛠️ Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Go 1.24+ (for ALTAN L1)
- Foundry (for smart contracts)

### Setup
```bash
# Clone repository
git clone https://github.com/Khongirad/Buryad-Mongol.git
cd Buryad-Mongol

# Install dependencies
npm install
cd packages/backend && npm install
cd ../contracts && forge install

# Setup database
cd packages/backend
npx prisma migrate deploy
npx prisma db seed

# Start development servers
npm run dev  # Frontend on :3000
cd packages/backend && npm run start:dev  # API on :3001

# Build ALTAN L1
cd packages/blockchain-l1
go build -o altand ./cmd/altand
./altand init test-node --chain-id altan-1
./altand start
```

See: [Quick Start Guide](docs/getting-started/QUICK_START.md)

---

## 🧪 Testing

```bash
# Frontend tests
npm run test

# Backend tests
cd packages/backend
npm run test
npm run test:e2e

# Smart contract tests
cd packages/contracts
forge test -vvv

# ALTAN L1 tests
cd packages/blockchain-l1
go test ./x/corelaw/...
```

See: [Integration Testing Guide](docs/getting-started/INTEGRATION_TESTING_GUIDE.md)

---

## 🌐 Links

- **Website**: [altan.life](https://altan.life) _(coming soon)_
- **Documentation**: [docs/](docs/)
- **GitHub**: [Khongirad/Buryad-Mongol](https://github.com/Khongirad/Buryad-Mongol)
- **License**: Proprietary - All rights reserved
- **Contact**: dev@inomad.life
- **Legal**: legal@inomad.life

---

## 📄 License

**Copyright © 2026 INOMAD INC. All rights reserved.**

This software is proprietary. Unauthorized copying, distribution, modification, or use is strictly prohibited without explicit written permission from INOMAD INC.

Article 27 of the Siberian Confederation Constitution establishes INOMAD INC as the beneficiary of network fees (0.03% of all transactions), creating a permanent revenue stream embedded in constitutional law.

---

## 🤝 Contributing

This is a proprietary project. For partnership inquiries, contact [ceo@inomad.life](mailto:ceo@inomad.life)

---

**Built with ❤️ by INOMAD INC for the Siberian Confederation**
