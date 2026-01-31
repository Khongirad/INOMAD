# Developer Manual

## Getting Started

### Environment Setup

1. **Clone the repository**
```bash
git clone git@github.com:inomadinc/inomad-client.git
cd inomad-client
```

2. **Install dependencies**
```bash
# Root (frontend)
npm install

# Backend
cd backend && npm install
```

3. **Setup PostgreSQL**
```bash
createdb inomad_khural
```

4. **Configure environment**
```bash
cp backend/.env.example backend/.env
# Edit with your credentials
```

5. **Run migrations**
```bash
cd backend
npx prisma migrate dev
```

6. **Start development servers**
```bash
# Terminal 1: Backend
cd backend && npm run start:dev

# Terminal 2: Frontend
npm run dev

# Terminal 3: Blockchain (optional)
cd chain && anvil
```

---

## Project Structure

### Backend (`/backend`)

```
src/
├── app.module.ts          # Main module
├── auth/                  # Authentication
│   ├── auth.service.ts
│   └── guards/            # JWT, roles
├── arbans/                # Arban system
│   ├── family-arban.*     # FamilyArban CRUD
│   ├── organizational-arban.* # OrgArban CRUD
│   ├── credit.*           # Credit lines
│   └── zun.*              # Clan management
├── mpc-wallet/            # MPC Wallet (NEW)
│   ├── mpc-wallet.service.ts  # Key splitting
│   ├── recovery.service.ts    # Social recovery
│   └── key-share.service.ts   # Device management
├── digital-seal/          # 2-of-2 multisig
├── academy/               # Academy of Sciences
├── justice/               # Council of Justice
└── temple/                # Temple of Heaven
```

### Frontend (`/src`)

```
src/
├── app/                   # Next.js pages
├── components/
│   ├── arbans/            # Arban components
│   │   ├── family/        # MarriageRegistration, etc.
│   │   ├── credit/        # CreditDashboard, BorrowForm
│   │   └── zun/           # ClanTree
│   └── governance/        # Governance components
│       ├── seal/          # DigitalSeal
│       ├── academy/       # Academy
│       ├── justice/       # Justice
│       └── temple/        # Temple
└── lib/
    ├── hooks/             # React hooks
    │   ├── use-auth.ts
    │   ├── use-mpc-wallet.ts  # MPC Wallet (NEW)
    │   └── ...
    └── api/               # API clients
```

### Smart Contracts (`/chain`)

```
contracts/
├── AltanBankOfSiberia.sol    # Central bank
├── AltanActivationRegistry.sol
├── DigitalSeal.sol           # 2-of-2 multisig
├── AcademyOfSciences.sol     # Patent registry
├── CouncilOfJustice.sol      # Justice system
└── TempleOfHeaven.sol        # State records

test/
├── DigitalSeal.t.sol
├── AcademyOfSciences.t.sol
└── ...
```

---

## Key Concepts

### Arban System

Two types of Arbans:

1. **FamilyArban** (Семейный Арбан)
   - Husband + Wife + Children
   - Khural Representative elected from group
   - Linked to Zun (clan)

2. **OrganizationalArban** (Организационный Арбан)
   - 10 members + 1 leader
   - For work/guild units
   - Own credit line

### MPC Wallet

Private key split into 3 shares (2-of-3 threshold):

```
Device Share (browser) + Server Share (backend) = Sign Transaction
```

Recovery options:
- **SOCIAL**: Guardians approve (spouse + khural rep)
- **EMAIL**: Verification code
- **ARBAN**: Arban-based recovery

### Credit System

Each Arban has a credit line:
- `creditRating`: 300-850 score
- `creditLimit`: Max borrowable amount
- `borrowed`: Current debt
- On-time repayments increase rating

---

## Common Tasks

### Add New API Endpoint

1. Create service method in `*.service.ts`
2. Add controller route in `*.controller.ts`
3. Register in module if new module

### Add Database Model

1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name model_name`
3. Use in services: `this.prisma.modelName.findMany()`

### Add Smart Contract

1. Create `.sol` in `chain/contracts/`
2. Write tests in `chain/test/`
3. Run `forge test`
4. Create ABI in `backend/src/blockchain/abis/`

### Add Frontend Component

1. Create in appropriate `components/` folder
2. Use existing hooks from `lib/hooks/`
3. Follow Material-UI patterns

---

## Testing

### Backend

```bash
cd backend
npm run test        # Unit tests
npm run test:e2e    # E2E tests
```

### Smart Contracts

```bash
cd chain
forge test          # All tests
forge test -vvv     # Verbose
forge test --match-test testSpecific  # Specific test
```

### Frontend

```bash
npm run test
```

---

## Deployment

See `chain/DEPLOYMENT.md` for smart contract deployment.

Backend deployment:
```bash
cd backend
npm run build
npm run start:prod
```

---

## Troubleshooting

### Prisma Issues

```bash
npx prisma generate   # Regenerate client
npx prisma db push    # Force sync (dev only)
npx prisma migrate reset  # Reset database
```

### TypeScript Errors

```bash
npx tsc --noEmit  # Check without compiling
```

### Blockchain Connection

Ensure Anvil is running:
```bash
anvil --host 0.0.0.0 --port 8545
```

---

## Contact

For questions, reach out to the team lead or check the artifact documentation in `.gemini/antigravity/brain/`.
