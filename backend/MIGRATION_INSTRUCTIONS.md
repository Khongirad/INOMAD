# Manual Migration Instructions

## Problem

Prisma generates a broken migration for the State Archive & Bank system due to complex enum changes. The auto-generated migration tries to ALTER tables that don't exist yet, causing transaction failures.

## Solution

Apply the manual SQL script that fixes the ordering issues.

## Steps

### 1. Mark the failed migration as rolled back

```bash
cd backend
npx prisma migrate resolve --rolled-back "20260204064054_add_state_archive_and_bank_system"
```

### 2. Apply the manual SQL script

**Option A: Using psql (if installed)**
```bash
psql -d inomad_khural -f prisma/manual_migration_state_archive_bank.sql
```

**Option B: Using other PostgreSQL client**

Open your PostgreSQL client (TablePlus, pgAdmin, DBeaver, etc.) and execute the contents of:
```
backend/prisma/manual_migration_state_archive_bank.sql
```

**Option C: Using Node.js script**

Create a temporary file `apply_manual_migration.js`:
```javascript
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
  const prisma = new PrismaClient();
  const sql = fs.readFileSync(
    path.join(__dirname, 'prisma', 'manual_migration_state_archive_bank.sql'),
    'utf-8'
  );
  
  console.log('Applying manual migration...');
  await prisma.$executeRawUnsafe(sql);
  console.log('✅ Migration applied successfully!');
  
  await prisma.$disconnect();
}

main().catch(console.error);
```

Then run:
```bash
node apply_manual_migration.js
```

### 3. Mark the migration as applied (tricking Prisma)

```bash
npx prisma migrate resolve --applied "20260204064054_add_state_archive_and_bank_system"
```

### 4. Verify the schema

```bash
npx prisma db pull
# Check if schema.prisma matches your current schema

npx prisma generate
# Regenerate Prisma Client with updated types
```

### 5. Seed templates (if not done yet)

```bash
# Start backend if not running
npm run start:dev

# Seed templates
curl -X POST http://localhost:3001/archive/templates/seed \
  -H "Authorization: Bearer YOUR_JWT"
```

## What the Manual Migration Does

The SQL script performs these operations in the correct order:

1. **Phase 1**: Clean up old structures
   - Drop foreign keys from old `Document` table
   - Drop old `Document` table
   - Drop old `DocumentStatus` enum

2. **Phase 2**: Create new enums
   - `DocumentStatus` (new values)
   - `DocumentStage`
   - `SignerRole`
   - `AccessAction`
   - `BankLicenseStatus`
   - `BankStatus`

3. **Phase 3**: Modify existing tables
   - Update `DocumentTemplate` (remove Chancellery fields, add State Archive fields)
   - Update `DocumentSignature` (add new signature fields)

4. **Phase 4**: Create new tables
   - `DocumentContract` (replaces `Document`)
   - `DocumentStageHistory`
   - `NotarizationRecord`
   - `LegalCertification`
   - `DocumentAccessLog`
   - `Bank`

5. **Phase 5**: Create indexes
   - All unique constraints
   - All performance indexes

6. **Phase 6**: Add foreign key constraints
   - All table relationships

## Troubleshooting

### If you get "column already exists" errors

The script uses `IF NOT EXISTS` and `DROP ... IF EXISTS`, so it should be idempotent. But if you still get errors, you might need to manually drop conflicting columns/constraints first.

### If you get "foreign key violation" errors

Make sure no data exists in the old `Document` table that's being referenced. The script drops it with `CASCADE`.

### If migration appears stuck

Check PostgreSQL logs for deadlocks or long-running queries:
```sql
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

## After Successful Migration

Your database will have:
- ✅ State Archive system (8 new tables)
- ✅ Bank model
- ✅ All enums properly created
- ✅ All indexes and constraints
- ✅ Schema matching `prisma/schema.prisma`

You can then proceed with:
1. Seeding templates
2. Testing CB workflows
3. Issuing first banking license
4. Executing first ALTAN emission
