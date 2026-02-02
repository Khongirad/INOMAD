# ALTAN L1 Blockchain

Cosmos SDK-based Layer 1 blockchain for the Siberian Confederation, implementing constitutional governance through the x/corelaw module.

## Features

- **x/corelaw Module**: 37 constitutional articles embedded in blockchain
- **Article 27**: Network fee model (0.03% → INOMAD INC)
- **Article 36**: FreezeLaw - Supreme Court emergency powers
- **Cosmos SDK**: v0.47.13
- **CometBFT**: v0.38.0
- **Go**: 1.24.12

## Constitutional Articles

- **PRINCIPLES** (1-7): Humanity, Democracy, Rule of Law, Transparency
- **RIGHTS** (8-15): Life, Speech, Education, Labor, Data Protection
- **GOVERNANCE** (16-22): Arban/Zun system, Khurals, E-Voting
- **ECONOMY** (23-30): Central Bank, **Network Fee**, Annual Tax, Credit System
- **LAND** (31-33): State Ownership, Lifetime Rights, Transfer Rights
- **JUSTICE** (34-36): Judicial Independence, Court System, **FreezeLaw**
- **SECURITY** (37): National Defense

## Installation

```bash
# Clone repository
git clone https://github.com/Khongirad/altan-blockchain.git
cd altan-blockchain

# Install dependencies
go mod download

# Build binary
go build -o altand ./cmd/altand

# Initialize chain
./altand init test-node --chain-id altan-1

# Start node
./altand start
```

## Query Constitutional Articles

```bash
# Query module parameters
./altand query corelaw params

# Query Article 27 (Network Fee)
./altand query corelaw article 27

# Query Article 36 (FreezeLaw)
./altand query corelaw article 36

# Query all articles (1-37)
for i in {1..37}; do ./altand query corelaw article $i; done
```

## Article 27: Network Fee (Revenue Model)

> **Сетевой сбор**
>
> Сетевой сбор в размере 0.03% взимается со всех транзакций для поддержания инфраструктуры блокчейна. Комиссия направляется компании INOMAD INC с максимальным лимитом 1000 АЛТАН за транзакцию. Газовый сбор не ограничен и защищает сеть от спама.

**English**: A network fee of 0.03% is levied on all transactions for blockchain infrastructure maintenance. The fee is directed to INOMAD INC with a maximum limit of 1,000 ALTAN per transaction.

**Economic Model**:
- Fee Rate: 0.03% (3 basis points)
- Fee Cap: 1,000 ALTAN per transaction
- Beneficiary: INOMAD INC (constitutional mandate)
- Gas Fee: Separate, unlimited (spam protection)

## Development Timeline

- **Jan 31, 2026**: Initial protobuf definitions (commit ac669d4)
- **Feb 1, 2026**: Go toolchain setup (commit 17d15e2)
- **Feb 2, 2026**: Complete module integration (commit 3d532b4) ✅ **PRIMARY PROOF**
- **Feb 2, 2026**: ABCI compatibility fix (commit ebbf43f)
- **Feb 2, 2026**: Store/IAVL compatibility fix (commit 213bce4)

**Total**: 2,043+ lines of code, 37 constitutional articles

## Proof of Authorship

See [PROOF_OF_AUTHORSHIP.md](https://github.com/Khongirad/altan-documentation/blob/main/PROOF_OF_AUTHORSHIP.md) for comprehensive intellectual property documentation including:

- Complete commit history with timestamps
- File-level authorship evidence
- Constitutional article creation proof
- Legal declarations and copyright notices

## Project Structure

```
altan/
├── app/
│   └── app.go              # Module integration
├── x/
│   └── corelaw/            # Constitutional law module
│       ├── module.go       # AppModule implementation
│       ├── keeper/         # State management
│       │   ├── genesis.go  # Genesis init/export
│       │   ├── article.go  # Article queries
│       │   └── params.go   # Parameter management
│       └── types/          # Type definitions
│           ├── genesis.go  # GenesisState
│           ├── params.go   # Module params
│           └── genesis_articles.go  # 37 articles
├── proto/                  # Protobuf definitions
├── cmd/
│   └── altand/            # Binary entry point
└── go.mod                 # Dependencies
```

## License

**Copyright © 2026 INOMAD INC. All rights reserved.**

This is proprietary software. Unauthorized copying, distribution, or use is strictly prohibited.

## Links

- **Documentation**: https://github.com/Khongirad/altan-documentation
- **Main Project**: https://github.com/Khongirad/Buryad-Mongol
- **Author**: INOMAD INC (dev@inomad.life)

## Contact

For questions regarding intellectual property rights: legal@inomad.life
