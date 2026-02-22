-- ============================================================
-- Migration: hierarchy_rename_arbad_myangad_tumed
-- Date: 2026-02-21
-- Description: Rename hierarchy models from Mongolian original
--   terms to their standardized English equivalents:
--   Arban  → Arbad  (10-person unit)
--   Zun    → Zun    (100-person unit, NO change)
--   Myangan → Myangad (1,000-person unit)
--   Tumen  → Tumed  (10,000-person unit)
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. ENUM CHANGES
-- ─────────────────────────────────────────────

-- VerificationLevel: ARBAN_VERIFIED → ARBAD_VERIFIED
ALTER TYPE "VerificationLevel" RENAME VALUE 'ARBAN_VERIFIED' TO 'ARBAD_VERIFIED';

-- OrganizationType: ARBAN → ARBAD
ALTER TYPE "OrganizationType" RENAME VALUE 'ARBAN' TO 'ARBAD';

-- EventScope: ARBAN → ARBAD
ALTER TYPE "EventScope" RENAME VALUE 'ARBAN' TO 'ARBAD';

-- KhuralLevel: ZUUN → ZUN (was renamed from ZUUD earlier, now standardized)
-- Note: ARBAD, MYANGAD, TUMED already correct in KhuralLevel
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ZUUN'
             AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'KhuralLevel')) THEN
    ALTER TYPE "KhuralLevel" RENAME VALUE 'ZUUN' TO 'ZUN';
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 2. TABLE RENAMES (model name → snake_case table)
-- ─────────────────────────────────────────────

-- FamilyArban → FamilyArbad
ALTER TABLE IF EXISTS "FamilyArban" RENAME TO "FamilyArbad";

-- FamilyArbanChild → FamilyArbadChild
ALTER TABLE IF EXISTS "FamilyArbanChild" RENAME TO "FamilyArbadChild";

-- OrganizationalArban → OrganizationalArbad
ALTER TABLE IF EXISTS "OrganizationalArban" RENAME TO "OrganizationalArbad";

-- OrgArbanMember → OrgArbadMember
ALTER TABLE IF EXISTS "OrgArbanMember" RENAME TO "OrgArbadMember";

-- ArbanMutualVerification → ArbadMutualVerification
ALTER TABLE IF EXISTS "ArbanMutualVerification" RENAME TO "ArbadMutualVerification";

-- ArbanNetwork → ArbadNetwork
ALTER TABLE IF EXISTS "ArbanNetwork" RENAME TO "ArbadNetwork";

-- Myangan → Myangad
ALTER TABLE IF EXISTS "Myangan" RENAME TO "Myangad";

-- Tumen → Tumed
ALTER TABLE IF EXISTS "Tumen" RENAME TO "Tumed";

-- TumenCooperation → TumedCooperation
ALTER TABLE IF EXISTS "TumenCooperation" RENAME TO "TumedCooperation";

-- ─────────────────────────────────────────────
-- 3. COLUMN RENAMES
-- ─────────────────────────────────────────────

-- User table: currentArbanId → currentArbadId
ALTER TABLE "User" RENAME COLUMN "currentArbanId" TO "currentArbadId";

-- FamilyArbad table: arbanId → arbadId
ALTER TABLE "FamilyArbad" RENAME COLUMN "arbanId" TO "arbadId";

-- FamilyArbadChild table: arbanId → arbadId
ALTER TABLE "FamilyArbadChild" RENAME COLUMN "arbanId" TO "arbadId";

-- OrganizationalArbad table: arbanId → arbadId
ALTER TABLE "OrganizationalArbad" RENAME COLUMN "arbanId" TO "arbadId";

-- OrgArbadMember table: arbanId → arbadId
ALTER TABLE "OrgArbadMember" RENAME COLUMN "arbanId" TO "arbadId";

-- ArbadMutualVerification table: arbanId → arbadId
ALTER TABLE "ArbadMutualVerification" RENAME COLUMN "arbanId" TO "arbadId";

-- ArbadNetwork table: arbanId → arbadId
ALTER TABLE "ArbadNetwork" RENAME COLUMN "arbanId" TO "arbadId";

-- Zun table: myanganId → myangadId  (relation FK)
ALTER TABLE "Zun" RENAME COLUMN "myanganId" TO "myangadId";

-- Myangad table: tumenId → tumedId  (relation FK)
ALTER TABLE "Myangad" RENAME COLUMN "tumenId" TO "tumedId";

-- Myangad table: totalArbans → totalArbads
ALTER TABLE "Myangad" RENAME COLUMN "totalArbans" TO "totalArbads";

-- Tumed table: totalArbans → totalArbads
ALTER TABLE "Tumed" RENAME COLUMN "totalArbans" TO "totalArbads";

-- Tumed table: totalMyangans → totalMyangads
ALTER TABLE "Tumed" RENAME COLUMN "totalMyangans" TO "totalMyangads";

-- TumedCooperation table: tumenAId → tumedAId
ALTER TABLE "TumedCooperation" RENAME COLUMN "tumenAId" TO "tumedAId";

-- TumedCooperation table: tumenBId → tumedBId
ALTER TABLE "TumedCooperation" RENAME COLUMN "tumenBId" TO "tumedBId";

-- ActivityEntry table: orgArbanId → orgArbadId
ALTER TABLE "ActivityEntry" RENAME COLUMN "orgArbanId" TO "orgArbadId";

-- BranchActivityReport table: orgArbanId → orgArbadId
ALTER TABLE IF EXISTS "BranchActivityReport" RENAME COLUMN "orgArbanId" TO "orgArbadId";

-- TimelineEvent table: arbanId → arbadId
ALTER TABLE IF EXISTS "TimelineEvent" RENAME COLUMN "arbanId" TO "arbadId";

-- CreditLine table: arbanId → arbadId
ALTER TABLE IF EXISTS "CreditLine" RENAME COLUMN "arbanId" TO "arbadId";

-- Loan table: arbanId → arbadId
ALTER TABLE IF EXISTS "Loan" RENAME COLUMN "arbanId" TO "arbadId";

-- TierDistribution table: arbanId → arbadId
ALTER TABLE IF EXISTS "TierDistribution" RENAME COLUMN "arbanId" TO "arbadId";

-- TierReceived table: arbanId → arbadId
ALTER TABLE IF EXISTS "TierReceived" RENAME COLUMN "arbanId" TO "arbadId";

-- BankEmployee table: arbanId → arbadId
ALTER TABLE IF EXISTS "BankEmployee" RENAME COLUMN "arbanId" TO "arbadId";

-- ─────────────────────────────────────────────
-- 4. UPDATE UNIQUE CONSTRAINT NAMES (Prisma requires matching names)
-- ─────────────────────────────────────────────

-- ArbadMutualVerification: @@unique([arbadId, verifierId, verifiedId])
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArbanMutualVerification_arbanId_verifierId_verifiedId_key') THEN
    ALTER INDEX "ArbanMutualVerification_arbanId_verifierId_verifiedId_key"
      RENAME TO "ArbadMutualVerification_arbadId_verifierId_verifiedId_key";
  END IF;
END $$;

-- TumedCooperation: @@unique([tumedAId, tumedBId])
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TumenCooperation_tumenAId_tumenBId_key') THEN
    ALTER INDEX "TumenCooperation_tumenAId_tumenBId_key"
      RENAME TO "TumedCooperation_tumedAId_tumedBId_key";
  END IF;
END $$;

-- FamilyArbad: @@unique([arbadId])
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FamilyArban_arbanId_key') THEN
    ALTER INDEX "FamilyArban_arbanId_key" RENAME TO "FamilyArbad_arbadId_key";
  END IF;
END $$;
