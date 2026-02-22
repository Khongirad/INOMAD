-- Sprint 3 Khural: Term-Limit Schema Migration
-- Republican Khural chairman term tracking (max 2 terms × 4 years)
-- Confederative Khural secretary rotation (1 term × 1 year, no repeat)

-- ────────────────────────────────────────────────────────────────
-- 1. Add term-limit fields to RepublicanKhural
-- ────────────────────────────────────────────────────────────────
ALTER TABLE "RepublicanKhural"
  ADD COLUMN IF NOT EXISTS "chairmanTermStart" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "chairmanTermEnd"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "chairmanTermCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "RepublicanKhural_chairmanUserId_idx"
  ON "RepublicanKhural" ("chairmanUserId")
  WHERE "chairmanUserId" IS NOT NULL;

-- ────────────────────────────────────────────────────────────────
-- 2. Add secretary term fields to ConfederativeKhural
-- ────────────────────────────────────────────────────────────────
ALTER TABLE "ConfederativeKhural"
  ADD COLUMN IF NOT EXISTS "secretaryUserId"     TEXT,
  ADD COLUMN IF NOT EXISTS "secretaryRepublicId" TEXT,
  ADD COLUMN IF NOT EXISTS "secretaryTermStart"  TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "secretaryTermEnd"    TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ConfederativeKhural_isActive_idx"
  ON "ConfederativeKhural" ("isActive");

-- ────────────────────────────────────────────────────────────────
-- 3. Create KhuralChairmanTerm table
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "KhuralChairmanTerm" (
  "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "republicId" TEXT         NOT NULL,
  "userId"     TEXT         NOT NULL,
  "seatId"     TEXT,
  "termNumber" INTEGER      NOT NULL,
  "termStart"  TIMESTAMP(3) NOT NULL,
  "termEnd"    TIMESTAMP(3),
  "endReason"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KhuralChairmanTerm_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KhuralChairmanTerm_republicId_fkey"
    FOREIGN KEY ("republicId") REFERENCES "RepublicanKhural"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KhuralChairmanTerm_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "KhuralChairmanTerm_republicId_idx"
  ON "KhuralChairmanTerm" ("republicId");

CREATE INDEX IF NOT EXISTS "KhuralChairmanTerm_userId_idx"
  ON "KhuralChairmanTerm" ("userId");

CREATE INDEX IF NOT EXISTS "KhuralChairmanTerm_republicId_userId_idx"
  ON "KhuralChairmanTerm" ("republicId", "userId");

-- ────────────────────────────────────────────────────────────────
-- 4. Create KhuralSecretaryTerm table
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "KhuralSecretaryTerm" (
  "id"              TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "confederationId" TEXT         NOT NULL,
  "userId"          TEXT         NOT NULL,
  "republicId"      TEXT         NOT NULL,
  "termStart"       TIMESTAMP(3) NOT NULL,
  "termEnd"         TIMESTAMP(3),
  "endReason"       TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "KhuralSecretaryTerm_pkey" PRIMARY KEY ("id"),
  -- Strict rotation: each (confederation, user) pair is UNIQUE — no repeat service
  CONSTRAINT "KhuralSecretaryTerm_confederationId_userId_key"
    UNIQUE ("confederationId", "userId"),
  CONSTRAINT "KhuralSecretaryTerm_confederationId_fkey"
    FOREIGN KEY ("confederationId") REFERENCES "ConfederativeKhural"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "KhuralSecretaryTerm_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "KhuralSecretaryTerm_confederationId_idx"
  ON "KhuralSecretaryTerm" ("confederationId");

CREATE INDEX IF NOT EXISTS "KhuralSecretaryTerm_userId_idx"
  ON "KhuralSecretaryTerm" ("userId");

CREATE INDEX IF NOT EXISTS "KhuralSecretaryTerm_republicId_idx"
  ON "KhuralSecretaryTerm" ("republicId");
