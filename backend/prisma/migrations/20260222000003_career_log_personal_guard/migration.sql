-- Sprint 4: Career Log & Personal Guard — Schema Migration
-- CareerLog: career-tracking for all hierarchy levels
-- LawArticle: Constitution / Statute references for oath ceremonies
-- CareerLawRef: many-to-many junction (CareerLog ↔ LawArticle)

-- ────────────────────────────────────────────────────────────────
-- 1. Create Enums
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "CareerRole" AS ENUM ('ARBAD', 'ZUN', 'MYANGAD', 'TUMED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CareerType" AS ENUM ('LEADER', 'STAFF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CareerStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'REVOKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────
-- 2. Create LawArticle table
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "LawArticle" (
  "id"       TEXT    NOT NULL DEFAULT gen_random_uuid()::text,
  "code"     TEXT    NOT NULL,
  "title"    TEXT    NOT NULL,
  "body"     TEXT    NOT NULL,
  "source"   TEXT    NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT "LawArticle_pkey"        PRIMARY KEY ("id"),
  CONSTRAINT "LawArticle_code_key"    UNIQUE ("code")
);

CREATE INDEX IF NOT EXISTS "LawArticle_source_idx"   ON "LawArticle" ("source");
CREATE INDEX IF NOT EXISTS "LawArticle_isActive_idx" ON "LawArticle" ("isActive");

-- ────────────────────────────────────────────────────────────────
-- 3. Create CareerLog table
-- Personal Guard mechanic: STAFF rows point leaderId at Leader's CareerLog
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CareerLog" (
  "id"             TEXT           NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"         TEXT           NOT NULL,
  "role"           "CareerRole"   NOT NULL,
  "type"           "CareerType"   NOT NULL,
  "status"         "CareerStatus" NOT NULL DEFAULT 'ACTIVE',

  -- Personal Guard bond: NULL for LEADER rows, set for STAFF rows
  "leaderId"       TEXT,

  -- Scope of the appointment
  "arbadId"        TEXT,
  "zunId"          TEXT,
  "myangadId"      TEXT,
  "tumedId"        TEXT,

  -- Digital oath
  "contractHash"   TEXT           NOT NULL,
  "inaugurationAt" TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"      TIMESTAMP(3)   NOT NULL,
  "exitReason"     TEXT,

  CONSTRAINT "CareerLog_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "CareerLog_contractHash_key"  UNIQUE ("contractHash"),
  CONSTRAINT "CareerLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CareerLog_leaderId_fkey"
    FOREIGN KEY ("leaderId") REFERENCES "CareerLog"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CareerLog_userId_idx"        ON "CareerLog" ("userId");
CREATE INDEX IF NOT EXISTS "CareerLog_leaderId_idx"      ON "CareerLog" ("leaderId");
CREATE INDEX IF NOT EXISTS "CareerLog_status_idx"        ON "CareerLog" ("status");
CREATE INDEX IF NOT EXISTS "CareerLog_role_status_idx"   ON "CareerLog" ("role", "status");
CREATE INDEX IF NOT EXISTS "CareerLog_expiresAt_idx"     ON "CareerLog" ("expiresAt");
CREATE INDEX IF NOT EXISTS "CareerLog_userId_status_idx" ON "CareerLog" ("userId", "status");

-- ────────────────────────────────────────────────────────────────
-- 4. Create CareerLawRef junction table
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CareerLawRef" (
  "careerLogId"  TEXT NOT NULL,
  "lawArticleId" TEXT NOT NULL,

  CONSTRAINT "CareerLawRef_pkey"
    PRIMARY KEY ("careerLogId", "lawArticleId"),
  CONSTRAINT "CareerLawRef_careerLogId_fkey"
    FOREIGN KEY ("careerLogId") REFERENCES "CareerLog"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CareerLawRef_lawArticleId_fkey"
    FOREIGN KEY ("lawArticleId") REFERENCES "LawArticle"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CareerLawRef_lawArticleId_idx" ON "CareerLawRef" ("lawArticleId");

-- ────────────────────────────────────────────────────────────────
-- 5. Seed default law articles for inauguration ceremonies
-- ────────────────────────────────────────────────────────────────
INSERT INTO "LawArticle" ("id", "code", "title", "body", "source") VALUES
  (gen_random_uuid()::text, 'CONST-1-1',  'Sovereignty of the People',     'All power in the Siberian Confederation derives from the people. The decimal hierarchy exists to serve and represent the people, not to rule them.', 'Constitution'),
  (gen_random_uuid()::text, 'CONST-2-3',  'Term Limits & Rotation',        'No Leader shall serve more than two consecutive terms at any single level. Leadership is a duty, not a privilege.', 'Constitution'),
  (gen_random_uuid()::text, 'CONST-3-7',  'Collective Responsibility',     'A Leader and their Apparatus (Personal Guard) bear joint responsibility for decisions made during their term. The Staff derives authority from the Leader.', 'Constitution'),
  (gen_random_uuid()::text, 'STAT-ZUN-1', 'Zun Elder Duties',              'The Elder of a Zun shall represent all 10 Arbads equally, arbitrate internal disputes, and report to the Myangad Khural.', 'Zun Statute'),
  (gen_random_uuid()::text, 'STAT-ZUN-2', 'Zun Staff (Apparatus) Rights',  'The 9 Arbad elders forming the Zun Elder''s Apparatus retain the right to veto decisions that violate this statute by unanimous agreement.', 'Zun Statute'),
  (gen_random_uuid()::text, 'STAT-MYG-1','Myangad Commander Duties',       'The Commander of a Myangad shall coordinate the 10 Zun Elders, manage collective resources, and represent the Myangad at the Tumed assembly.', 'Myangad Charter'),
  (gen_random_uuid()::text, 'STAT-TUM-1','Tumed Chief Duties',             'The Chief of a Tumed holds executive authority over 10 Myangads and is accountable to the Republican Khural every 6 months.', 'Tumed Charter')
ON CONFLICT ("code") DO NOTHING;
