# INOMAD KHURAL / ALTAN Backend

Production-grade NestJS backend for the INOMAD sovereign digital platform.

## 🏗️ Architecture

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: ALTAN-native (x-seat-id header)
- **API**: RESTful

## 📦 Core Modules

### 1. **Auth Module**
- Middleware-based authentication via `x-seat-id` header
- Maps SeatSBT ID to user identity
- Role-based access control (CITIZEN, LEADER, ADMIN)

### 2. **Khural Module** (Governance)
- Circle-based governance system
- Fixed 10-seat groups (Arban, Zuun, Myangan, Tumen)
- Seat application and assignment logic
- Enforces unique seat occupancy

### 3. **Guilds Module**
- Clan, Profession, Organization, and Government guilds
- Member management with roles
- Guild-based task posting

### 4. **Professions Module**
- Skill-based identity system
- Profession guilds
- Task eligibility based on profession

### 5. **Tasks Module**
- Quest board system
- Task creation, acceptance, and completion
- ALTAN reward distribution
- Status tracking (OPEN, TAKEN, COMPLETED)

### 6. **ALTAN Module**
- Off-chain ledger (mirrors on-chain state)
- Balance tracking
- Transfer and reward logic
- Placeholder for blockchain sync

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
```

### Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database with test data
npm run db:seed
```

### Running the Server

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

Server will run on `http://localhost:3001/api`

## 📡 API Endpoints

### Khural (Governance)

```bash
# Create Khural group
POST /api/khural
{
  "level": "ARBAN",
  "name": "Test Arban 1"
}

# Get group (circle-ready format)
GET /api/khural/:id

# List all groups
GET /api/khural?level=ARBAN

# Apply for empty seat
POST /api/khural/:id/apply-seat
{
  "seatIndex": 5
}

# Assign seat (leader only)
POST /api/khural/:id/assign-seat
{
  "seatIndex": 3,
  "userId": "user-uuid"
}
```

### Guilds

```bash
# Create guild
POST /api/guilds
{
  "type": "PROFESSION",
  "name": "Architects Guild",
  "description": "Professional association",
  "professionId": "profession-uuid"
}

# List guilds
GET /api/guilds?type=PROFESSION

# Get guild details
GET /api/guilds/:id

# Join guild
POST /api/guilds/:id/join

# Get guild members
GET /api/guilds/:id/members
```

### Professions

```bash
# Create profession
POST /api/professions
{
  "name": "Architect",
  "description": "Designs structures"
}

# List professions
GET /api/professions

# Get profession details
GET /api/professions/:id
```

### Tasks

```bash
# Create task
POST /api/tasks
{
  "title": "Build community center",
  "description": "Construct 500-person facility",
  "professionId": "profession-uuid",
  "rewardAltan": 250,
  "postedByGuildId": "guild-uuid"
}

# List tasks
GET /api/tasks?status=OPEN&professionId=uuid

# Get task details
GET /api/tasks/:id

# Accept task
POST /api/tasks/:id/accept

# Complete task (triggers ALTAN reward)
POST /api/tasks/:id/complete
```

### ALTAN

```bash
# Get balance
GET /api/altan/balance

# Get user balance
GET /api/altan/balance/:userId

# Mint ALTAN (test only)
POST /api/altan/mint
{
  "amount": 1000
}

# Sync from blockchain (placeholder)
POST /api/altan/sync
```

## 🔐 Authentication

All requests (except health checks) require the `x-seat-id` header:

```bash
curl -H "x-seat-id: SEAT_001" http://localhost:3001/api/khural
```

Test seat IDs from seed data:
- `SEAT_001` (Leader)
- `SEAT_002` (Citizen)
- `SEAT_003` (Citizen)

## 🗄️ Database Schema

### Core Models

- **User**: Citizen identity (linked to SeatSBT)
- **KhuralGroup**: Governance circles (Arban/Zuun/Myangan/Tumen)
- **KhuralSeat**: Individual seats in circles (0-9 index)
- **Guild**: Organizations (Clan/Profession/Organization/Government)
- **GuildMember**: Guild membership with roles
- **Profession**: Skill-based identities
- **Task**: Quest board contracts
- **AltanLedger**: Off-chain ALTAN balance mirror

## 🧪 Testing with cURL

```bash
# Create Arban group
curl -X POST http://localhost:3001/api/khural \
  -H "Content-Type: application/json" \
  -H "x-seat-id: SEAT_001" \
  -d '{
    "level": "ARBAN",
    "name": "My Test Arban"
  }'

# Get group (returns circle-ready format)
curl http://localhost:3001/api/khural/{group-id} \
  -H "x-seat-id: SEAT_001"

# List open tasks
curl http://localhost:3001/api/tasks?status=OPEN \
  -H "x-seat-id: SEAT_002"

# Accept task
curl -X POST http://localhost:3001/api/tasks/{task-id}/accept \
  -H "x-seat-id: SEAT_002"
```

## 🔮 Future Enhancements

- [ ] On-chain synchronization with ALTAN blockchain
- [ ] SeatSBT signature verification
- [ ] WebSocket support for real-time updates
- [ ] GraphQL API layer
- [ ] Advanced permission system
- [ ] Voting mechanism for Khural sessions
- [ ] Task dispute resolution
- [ ] Profession rank progression logic

## 📝 Development Notes

### Khural Circle Logic

Groups are **always 10 seats** (indices 0-9). The first seat (index 0) is designated as the leader seat. The API returns seats in order, making it easy to render as a circle in the frontend.

### ALTAN Ledger

Currently operates as an off-chain mirror. The `AltanService.syncFromChain()` method is a placeholder for future blockchain integration. All transfers are atomic database transactions.

### Permission Model

- **CITIZEN**: Can apply for seats, join guilds, accept tasks
- **LEADER**: Can assign seats in their group, post tasks
- **ADMIN**: Full system access (future implementation)

## 🛠️ Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Verify DATABASE_URL in .env
# Format: postgresql://user:password@localhost:5432/database
```

### Prisma Issues

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Regenerate Prisma client
npm run prisma:generate
```

## 📄 License

Proprietary - INOMAD Platform

---

**Built with sovereignty in mind. No third-party dependencies. No MetaMask. Pure ALTAN.**
