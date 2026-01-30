# Database Setup Required
**Status**: PostgreSQL Not Installed ⚠️

---

## Current Situation

**Diagnostic Results**:
- ❌ PostgreSQL not installed (`psql not found`)
- ❌ Docker not installed (`docker: command not found`)
- ❌ Homebrew not installed (`brew: command not found`)
- ✅ Backend configured for: `postgresql://localhost:5432/inomad_khural`

**Impact**: Cannot proceed with integration testing until database is available.

---

## Option 1: Install PostgreSQL via Homebrew (Recommended)

### Step 1: Install Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Step 2: Install PostgreSQL
```bash
brew install postgresql@14
```

### Step 3: Start PostgreSQL
```bash
brew services start postgresql@14
```

### Step 4: Create Database
```bash
createdb inomad_khural
```

**Time**: ~15-20 minutes

---

## Option 2: Install PostgreSQL Directly

### macOS (Download Installer)
1. Visit https://postgresapp.com/
2. Download Postgres.app
3. Install and launch
4. Create database `inomad_khural`

**Time**: ~10 minutes

---

## Option 3: Use Docker (if Docker is available)

### Install Docker Desktop
1. Visit https://www.docker.com/products/docker-desktop
2. Download and install
3. Launch Docker Desktop

### Run PostgreSQL Container
```bash
docker run --name postgres-inomad \
  -e POSTGRES_USER=inomad \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=inomad_khural \
  -p 5432:5432 \
  -d postgres:14
```

**Time**: ~20 minutes (including Docker installation)

---

## Option 4: Use Existing PostgreSQL (if already installed elsewhere)

If PostgreSQL is installed but not detected:

```bash
# Find PostgreSQL installation
find /usr -name psql 2>/dev/null
find /opt -name psql 2>/dev/null
find /Library -name psql 2>/dev/null

# If found, add to PATH
export PATH="/path/to/postgres/bin:$PATH"

# Start PostgreSQL
pg_ctl -D /path/to/data/directory start
```

---

## After PostgreSQL is Running

### Verify Connection
```bash
psql -h localhost -U inomad -d inomad_khural
# Password: password
```

### Run Migrations
```bash
cd /Users/inomadinc/inomad-client/backend
npx prisma migrate dev
```

### Start Backend
```bash
npm run start:dev
# Should see: Application successfully started on port 3001
```

### Start Frontend
```bash
cd /Users/inomadinc/inomad-client
npm run dev
# Should see: Ready on http://localhost:3000
```

---

## Next Steps (Once Database is Running)

Follow **QUICK_START.md** for:
1. Running migrations
2. Starting services
3. Integration testing

---

## Alternative: Cloud Database (Quick Option)

If local installation is problematic, use a cloud database:

### Supabase (Free Tier)
1. Visit https://supabase.com
2. Create free project
3. Get connection string
4. Update `backend/.env`:
```
DATABASE_URL="postgresql://[user]:[password]@[host]:5432/postgres"
```

### Neon (Free Tier)
1. Visit https://neon.tech
2. Create free project
3. Get connection string
4. Update `backend/.env`

**Time**: ~5 minutes

---

## Recommendation

**Best Option for Quick Testing**: 
- **Option 2** (Postgres.app) - Easiest, GUI-based, 10 minutes
- **Cloud Database** - Fastest if installation issues, 5 minutes

**Best Option for Production**: 
- **Option 1** (Homebrew) - Industry standard, manageable

---

**Current Blocker**: Database installation  
**Estimated Time to Resolve**: 5-20 minutes depending on option  
**Once Resolved**: Integration testing can begin immediately
