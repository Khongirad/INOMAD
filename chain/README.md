# INOMAD KHURAL

Decentralized governance platform with ALTAN economic system.

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL (via Docker or local)
- npm

### 1. Start Database (Docker)

```bash
cd backend
docker-compose up -d
```

Or configure `DATABASE_URL` in `backend/.env` for your PostgreSQL instance.

### 2. Backend Setup

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run build
npm run start:dev
```

Backend runs at: http://localhost:3001/api

### 3. Frontend Setup

```bash
# From project root
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

### 4. Verify Setup

```bash
# Test backend endpoints
cd backend
./scripts/smoke-test.sh

# Or manually
curl http://localhost:3001/api/health
```

## Key Endpoints

| Endpoint | Description |
|----------|-------------|
| GET /api/health | Health check |
| GET /api/khural | List governance groups |
| GET /api/guilds | List guilds/organizations |
| GET /api/tasks | List contracts/tasks |
| GET /api/audit/history | Public event history |

## Key Pages

| Route | Description |
|-------|-------------|
| /khural | Fractal governance map |
| /board | Task/contract marketplace |
| /registries/history | State archives & council review |

## Architecture

```
inomad-client/
├── src/                    # Next.js frontend
│   ├── app/(app)/         # Main app routes
│   ├── components/        # UI components
│   └── lib/               # Utilities & API client
├── backend/               # NestJS backend
│   ├── src/               # API modules
│   └── prisma/            # Database schema
└── chain/                 # Solidity contracts
```

## Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL="postgresql://..."
PORT=3001
CORS_ORIGIN="http://localhost:3000"
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```
