-- Manual Migration Script for State Archive & Bank System
-- This script fixes Prisma's broken AlterEnum generation
-- Apply this manually to fix the database schema

-- ============================================================
-- PHASE 1: Clean up old structures
-- ============================================================

-- Drop foreign key constraints from old Document table
ALTER TABLE "Quest" DROP CONSTRAINT IF EXISTS "Quest_assignmentDocId_fkey";
ALTER TABLE "DocumentSignature" DROP CONSTRAINT IF EXISTS "DocumentSignature_documentId_fkey";

-- Drop old Document table (replaced by DocumentContract)
DROP TABLE IF EXISTS "Document" CASCADE;

-- Drop old DocumentStatus enum (will recreate with new values)
DROP TYPE IF EXISTS "DocumentStatus" CASCADE;

-- ============================================================
-- PHASE 2: Create new enums
-- ============================================================

-- New DocumentStatus enum (for State Archive system)
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'ARCHIVED');

-- New DocumentStage enum (tracks document lifecycle)
CREATE TYPE "DocumentStage" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'SIGNED', 'PENDING_NOTARIZATION', 'NOTARIZED', 'PENDING_LEGAL', 'CERTIFIED', 'ARCHIVED', 'PUBLISHED');

-- SignerRole enum (for multi-signature documents)
CREATE TYPE "SignerRole" AS ENUM ('CREATOR', 'CB_GOVERNOR', 'NOTARY', 'STATE_LAWYER', 'BANK_DIRECTOR', 'WITNESS', 'OFFICER');

-- AccessAction enum (for audit logging)
CREATE TYPE "AccessAction" AS ENUM ('VIEW', 'DOWNLOAD', 'PRINT', 'MODIFY', 'SIGN', 'ARCHIVE');

-- BankLicenseStatus enum
CREATE TYPE "BankLicenseStatus" AS ENUM ('PENDING', 'APPROVED', 'ISSUED', 'SUSPENDED', 'REVOKED');

-- BankStatus enum
CREATE TYPE "BankStatus" AS ENUM ('PENDING_LICENSE', 'LICENSED', 'OPERATIONAL', 'SUSPENDED', 'DISSOLVED');

-- ============================================================
-- PHASE 3: Modify existing tables
-- ============================================================

-- Update DocumentTemplate table (Chancellery → State Archive)
ALTER TABLE "DocumentTemplate" 
  DROP COLUMN IF EXISTS "fields",
  DROP COLUMN IF EXISTS "govtCode",
  DROP COLUMN IF EXISTS "isActive",
  DROP COLUMN IF EXISTS "minSignatures",
  DROP COLUMN IF EXISTS "nameEn",
  DROP COLUMN IF EXISTS "requiresWitnesses",
  DROP COLUMN IF EXISTS "scope",
  DROP COLUMN IF EXISTS "template",
  DROP COLUMN IF EXISTS "type";

-- Drop old indexes on DocumentTemplate
DROP INDEX IF EXISTS "DocumentTemplate_isActive_idx";
DROP INDEX IF EXISTS "DocumentTemplate_type_idx";

-- Add new columns to DocumentTemplate
ALTER TABLE "DocumentTemplate"
  ADD COLUMN IF NOT EXISTS "code" TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS "contentTemplate" TEXT,
  ADD COLUMN IF NOT EXISTS "contractTemplate" TEXT,
  ADD COLUMN IF NOT EXISTS "createdById" TEXT,
  ADD COLUMN IF NOT EXISTS "footerTemplate" TEXT,
  ADD COLUMN IF NOT EXISTS "headerTemplate" TEXT,
  ADD COLUMN IF NOT EXISTS "nameRu" TEXT,
  ADD COLUMN IF NOT EXISTS "optionalFields" TEXT[],
  ADD COLUMN IF NOT EXISTS "requiredFields" TEXT[],
  ADD COLUMN IF NOT EXISTS "requiredSignatures" TEXT[],
  ADD COLUMN IF NOT EXISTS "stagesRequired" TEXT[],
  ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS "templateSchema" JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "validationRules" JSONB,
  ADD COLUMN IF NOT EXISTS "blockchainEnabled" BOOLEAN DEFAULT true;

-- Update version column type
ALTER TABLE "DocumentTemplate" 
  ALTER COLUMN "version" SET DEFAULT '1.0',
  ALTER COLUMN "version" TYPE TEXT USING version::text;

-- Update DocumentSignature table
DROP INDEX IF EXISTS "DocumentSignature_signedAt_idx";

ALTER TABLE "DocumentSignature"
  DROP COLUMN IF EXISTS "location",
  DROP COLUMN IF EXISTS "role";

ALTER TABLE "DocumentSignature"
  ADD COLUMN IF NOT EXISTS "algorithm" TEXT DEFAULT 'ECDSA-secp256k1',
  ADD COLUMN IF NOT EXISTS "publicKey" TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS "signerRole" "SignerRole" DEFAULT 'CREATOR',
  ADD COLUMN IF NOT EXISTS "verified" BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);

-- Make ipAddress NOT NULL (set default for existing rows first)
UPDATE "DocumentSignature" SET "ipAddress" = '127.0.0.1' WHERE "ipAddress" IS NULL;
ALTER TABLE "DocumentSignature" ALTER COLUMN "ipAddress" SET NOT NULL;

-- ============================================================
-- PHASE 4: Create new tables
-- ============================================================

-- DocumentContract table (replaces old Document)
CREATE TABLE IF NOT EXISTS "DocumentContract" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "registryNumber" TEXT,
    "archiveNumber" TEXT,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleRu" TEXT,
    "variables" JSONB NOT NULL,
    "generatedContent" TEXT NOT NULL,
    "attachments" JSONB,
    "issuerId" TEXT NOT NULL,
    "recipientId" TEXT,
    "currentStage" "DocumentStage" NOT NULL DEFAULT 'DRAFT',
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "blockchainTxHash" TEXT,
    "contractAddress" TEXT,
    "blockchainData" JSONB,
    "documentHash" TEXT NOT NULL,
    "hashTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "archivedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentContract_pkey" PRIMARY KEY ("id")
);

-- DocumentStageHistory table
CREATE TABLE IF NOT EXISTS "DocumentStageHistory" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fromStage" "DocumentStage",
    "toStage" "DocumentStage" NOT NULL,
    "triggeredById" TEXT NOT NULL,
    "notes" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockchainTx" TEXT,

    CONSTRAINT "DocumentStageHistory_pkey" PRIMARY KEY ("id")
);

-- NotarizationRecord table
CREATE TABLE IF NOT EXISTS "NotarizationRecord" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "notaryId" TEXT NOT NULL,
    "registryNumber" TEXT NOT NULL,
    "notes" TEXT,
    "sealImage" TEXT,
    "signature" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "notarizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotarizationRecord_pkey" PRIMARY KEY ("id")
);

-- LegalCertification table
CREATE TABLE IF NOT EXISTS "LegalCertification" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "lawyerId" TEXT NOT NULL,
    "opinion" TEXT NOT NULL,
    "opinionRu" TEXT,
    "compliant" BOOLEAN NOT NULL,
    "notes" TEXT,
    "signature" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "certifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalCertification_pkey" PRIMARY KEY ("id")
);

-- DocumentAccessLog table
CREATE TABLE IF NOT EXISTS "DocumentAccessLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AccessAction" NOT NULL,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,

    CONSTRAINT "DocumentAccessLog_pkey" PRIMARY KEY ("id")
);

-- Bank table
CREATE TABLE IF NOT EXISTS "Bank" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameRu" TEXT,
    "legalAddress" TEXT NOT NULL,
    "taxId" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "licenseDocumentId" TEXT,
    "licenseStatus" "BankLicenseStatus" NOT NULL DEFAULT 'PENDING',
    "licenseIssuedAt" TIMESTAMP(3),
    "correspondentAccountNumber" TEXT,
    "correspondentAgreementId" TEXT,
    "directorId" TEXT,
    "operationalStatus" "BankStatus" NOT NULL DEFAULT 'PENDING_LICENSE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- PHASE 5: Create indexes
-- ============================================================

-- DocumentContract indexes
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentContract_documentNumber_key" ON "DocumentContract"("documentNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentContract_registryNumber_key" ON "DocumentContract"("registryNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentContract_archiveNumber_key" ON "DocumentContract"("archiveNumber");
CREATE INDEX IF NOT EXISTS "DocumentContract_currentStage_status_idx" ON "DocumentContract"("currentStage", "status");
CREATE INDEX IF NOT EXISTS "DocumentContract_documentNumber_idx" ON "DocumentContract"("documentNumber");
CREATE INDEX IF NOT EXISTS "DocumentContract_templateId_idx" ON "DocumentContract"("templateId");

-- DocumentStageHistory indexes
CREATE INDEX IF NOT EXISTS "DocumentStageHistory_documentId_timestamp_idx" ON "DocumentStageHistory"("documentId", "timestamp");

-- NotarizationRecord indexes
CREATE UNIQUE INDEX IF NOT EXISTS "NotarizationRecord_documentId_key" ON "NotarizationRecord"("documentId");
CREATE UNIQUE INDEX IF NOT EXISTS "NotarizationRecord_registryNumber_key" ON "NotarizationRecord"("registryNumber");
CREATE INDEX IF NOT EXISTS "NotarizationRecord_notaryId_idx" ON "NotarizationRecord"("notaryId");

-- LegalCertification indexes
CREATE UNIQUE INDEX IF NOT EXISTS "LegalCertification_documentId_key" ON "LegalCertification"("documentId");
CREATE INDEX IF NOT EXISTS "LegalCertification_lawyerId_idx" ON "LegalCertification"("lawyerId");

-- DocumentAccessLog indexes
CREATE INDEX IF NOT EXISTS "DocumentAccessLog_documentId_timestamp_idx" ON "DocumentAccessLog"("documentId", "timestamp");
CREATE INDEX IF NOT EXISTS "DocumentAccessLog_userId_idx" ON "DocumentAccessLog"("userId");

-- Bank indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Bank_taxId_key" ON "Bank"("taxId");
CREATE UNIQUE INDEX IF NOT EXISTS "Bank_licenseNumber_key" ON "Bank"("licenseNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Bank_licenseDocumentId_key" ON "Bank"("licenseDocumentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Bank_correspondentAccountNumber_key" ON "Bank"("correspondentAccountNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "Bank_correspondentAgreementId_key" ON "Bank"("correspondentAgreementId");
CREATE INDEX IF NOT EXISTS "Bank_licenseStatus_idx" ON "Bank"("licenseStatus");
CREATE INDEX IF NOT EXISTS "Bank_operationalStatus_idx" ON "Bank"("operationalStatus");
CREATE INDEX IF NOT EXISTS "Bank_taxId_idx" ON "Bank"("taxId");

-- DocumentTemplate indexes
CREATE UNIQUE INDEX IF NOT EXISTS "DocumentTemplate_code_key" ON "DocumentTemplate"("code");
CREATE INDEX IF NOT EXISTS "DocumentTemplate_category_status_idx" ON "DocumentTemplate"("category", "status");
CREATE INDEX IF NOT EXISTS "DocumentTemplate_code_idx" ON "DocumentTemplate"("code");

-- ============================================================
-- PHASE 6: Add foreign key constraints
-- ============================================================

-- DocumentTemplate foreign keys
ALTER TABLE "DocumentTemplate" 
  DROP CONSTRAINT IF EXISTS "DocumentTemplate_createdById_fkey",
  ADD CONSTRAINT "DocumentTemplate_createdById_fkey" 
    FOREIGN KEY ("createdById") REFERENCES "User"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- DocumentContract foreign keys
ALTER TABLE "DocumentContract"
  DROP CONSTRAINT IF EXISTS "DocumentContract_templateId_fkey",
  ADD CONSTRAINT "DocumentContract_templateId_fkey" 
    FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DocumentContract"
  DROP CONSTRAINT IF EXISTS "DocumentContract_issuerId_fkey",
  ADD CONSTRAINT "DocumentContract_issuerId_fkey" 
    FOREIGN KEY ("issuerId") REFERENCES "User"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DocumentContract"
  DROP CONSTRAINT IF EXISTS "DocumentContract_recipientId_fkey",
  ADD CONSTRAINT "DocumentContract_recipientId_fkey" 
    FOREIGN KEY ("recipientId") REFERENCES "User"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DocumentContract"
  DROP CONSTRAINT IF EXISTS "DocumentContract_archivedById_fkey",
  ADD CONSTRAINT "DocumentContract_archivedById_fkey" 
    FOREIGN KEY ("archivedById") REFERENCES "User"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- DocumentStageHistory foreign keys
ALTER TABLE "DocumentStageHistory"
  DROP CONSTRAINT IF EXISTS "DocumentStageHistory_documentId_fkey",
  ADD CONSTRAINT "DocumentStageHistory_documentId_fkey" 
    FOREIGN KEY ("documentId") REFERENCES "DocumentContract"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentStageHistory"
  DROP CONSTRAINT IF EXISTS "DocumentStageHistory_triggeredById_fkey",
  ADD CONSTRAINT "DocumentStageHistory_triggeredById_fkey" 
    FOREIGN KEY ("triggeredById") REFERENCES "User"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- DocumentSignature foreign keys
ALTER TABLE "DocumentSignature"
  DROP CONSTRAINT IF EXISTS "DocumentSignature_documentId_fkey",
  ADD CONSTRAINT "DocumentSignature_documentId_fkey" 
    FOREIGN KEY ("documentId") REFERENCES "DocumentContract"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- NotarizationRecord foreign keys
ALTER TABLE "NotarizationRecord"
  DROP CONSTRAINT IF EXISTS "NotarizationRecord_documentId_fkey",
  ADD CONSTRAINT "NotarizationRecord_documentId_fkey" 
    FOREIGN KEY ("documentId") REFERENCES "DocumentContract"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotarizationRecord"
  DROP CONSTRAINT IF EXISTS "NotarizationRecord_notaryId_fkey",
  ADD CONSTRAINT "NotarizationRecord_notaryId_fkey" 
    FOREIGN KEY ("notaryId") REFERENCES "User"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- LegalCertification foreign keys
ALTER TABLE "LegalCertification"
  DROP CONSTRAINT IF EXISTS "LegalCertification_documentId_fkey",
  ADD CONSTRAINT "LegalCertification_documentId_fkey" 
    FOREIGN KEY ("documentId") REFERENCES "DocumentContract"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LegalCertification"
  DROP CONSTRAINT IF EXISTS "LegalCertification_lawyerId_fkey",
  ADD CONSTRAINT "LegalCertification_lawyerId_fkey" 
    FOREIGN KEY ("lawyerId") REFERENCES "User"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- DocumentAccessLog foreign keys
ALTER TABLE "DocumentAccessLog"
  DROP CONSTRAINT IF EXISTS "DocumentAccessLog_documentId_fkey",
  ADD CONSTRAINT "DocumentAccessLog_documentId_fkey" 
    FOREIGN KEY ("documentId") REFERENCES "DocumentContract"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentAccessLog"
  DROP CONSTRAINT IF EXISTS "DocumentAccessLog_userId_fkey",
  ADD CONSTRAINT "DocumentAccessLog_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Bank foreign keys
ALTER TABLE "Bank"
  DROP CONSTRAINT IF EXISTS "Bank_licenseDocumentId_fkey",
  ADD CONSTRAINT "Bank_licenseDocumentId_fkey" 
    FOREIGN KEY ("licenseDocumentId") REFERENCES "DocumentContract"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Bank"
  DROP CONSTRAINT IF EXISTS "Bank_correspondentAgreementId_fkey",
  ADD CONSTRAINT "Bank_correspondentAgreementId_fkey" 
    FOREIGN KEY ("correspondentAgreementId") REFERENCES "DocumentContract"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Bank"
  DROP CONSTRAINT IF EXISTS "Bank_directorId_fkey",
  ADD CONSTRAINT "Bank_directorId_fkey" 
    FOREIGN KEY ("directorId") REFERENCES "User"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- PHASE 7: Update User table (add banksDirected relation)
-- ============================================================

-- Note: The User → Bank relation is handled by the Bank.directorId foreign key
-- No changes needed to User table structure

-- ============================================================
-- COMPLETE!
-- ============================================================

-- Migration complete. Schema should now match prisma/schema.prisma
