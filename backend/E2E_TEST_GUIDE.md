# E2E Integration Test Guide

## Quick Start

```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Backend
cd backend && npm run start:dev

# Terminal 3: Test
curl http://localhost:3001/api/e2e/health
curl http://localhost:3001/api/e2e/run
```

## Test Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/e2e/health` | Quick blockchain status |
| `GET /api/e2e/run` | Run all 5 integration tests |

## Tests Included

1. **Blockchain Connection** — verifies provider works
2. **SeatSBT Queries** — getSeatOwner, totalSupply
3. **Altan Balance Queries** — getAltanBalance
4. **Identity Integration** — DB + blockchain sync
5. **Bank Integration** — balance comparison

## Address Files

Backend reads from:
- `chain/addresses.json` — core contracts
- `chain/addresses-citizen.json` — citizen module
- `chain/addresses-banking.json` — banking module

## Bash Script

```bash
cd backend && ./scripts/e2e-test-setup.sh
```

Checks: Anvil status, address files, backend health, contract calls.
