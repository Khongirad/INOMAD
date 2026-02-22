-- Sprint 5: Legal Ecosystem & Temple of Heaven
-- ContractTemplate (Temple Scholar-owned), LegalContract, ContractSignatory, TempleSnapshot

-- ────────────────────────────────────────────────────────────────
-- 1. Enums
-- ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "ContractStatus" AS ENUM (
    'DRAFT', 'PENDING_SIGNATURES', 'ACTIVE', 'COMPLETED', 'REVOKED', 'ARCHIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SignatoryRole" AS ENUM ('NOTARY', 'LAWYER', 'MEDIATOR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ────────────────────────────────────────────────────────────────
-- 2. ContractTemplate — canonical blueprints (Temple of Heaven)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ContractTemplate" (
  "id"           TEXT    NOT NULL DEFAULT gen_random_uuid()::text,
  "code"         TEXT    NOT NULL,
  "title"        TEXT    NOT NULL,
  "bodyTemplate" TEXT    NOT NULL,
  "source"       TEXT    NOT NULL DEFAULT 'Temple of Heaven',
  "requiredRank" INTEGER NOT NULL DEFAULT 1,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ContractTemplate_pkey"     PRIMARY KEY ("id"),
  CONSTRAINT "ContractTemplate_code_key" UNIQUE ("code")
);

CREATE INDEX IF NOT EXISTS "ContractTemplate_code_idx"     ON "ContractTemplate" ("code");
CREATE INDEX IF NOT EXISTS "ContractTemplate_isActive_idx" ON "ContractTemplate" ("isActive");

-- ────────────────────────────────────────────────────────────────
-- 3. LegalContract — the primary contract entity
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "LegalContract" (
  "id"               TEXT             NOT NULL DEFAULT gen_random_uuid()::text,
  "templateId"       TEXT             NOT NULL,
  "title"            TEXT             NOT NULL,
  "partyAId"         TEXT             NOT NULL,
  "partyBId"         TEXT             NOT NULL,
  "bankRequisites"   JSONB            NOT NULL,
  "legalAddress"     TEXT             NOT NULL,
  "customConditions" TEXT,
  "status"           "ContractStatus" NOT NULL DEFAULT 'DRAFT',
  "requiredRank"     INTEGER          NOT NULL,
  "contractHash"     TEXT,
  "activatedAt"      TIMESTAMP(3),
  "createdAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"        TIMESTAMP(3),

  CONSTRAINT "LegalContract_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "LegalContract_contractHash_key"  UNIQUE ("contractHash"),
  CONSTRAINT "LegalContract_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "ContractTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LegalContract_partyAId_fkey"
    FOREIGN KEY ("partyAId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "LegalContract_partyBId_fkey"
    FOREIGN KEY ("partyBId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "LegalContract_status_idx"     ON "LegalContract" ("status");
CREATE INDEX IF NOT EXISTS "LegalContract_partyAId_idx"   ON "LegalContract" ("partyAId");
CREATE INDEX IF NOT EXISTS "LegalContract_partyBId_idx"   ON "LegalContract" ("partyBId");
CREATE INDEX IF NOT EXISTS "LegalContract_templateId_idx" ON "LegalContract" ("templateId");
CREATE INDEX IF NOT EXISTS "LegalContract_expiresAt_idx"  ON "LegalContract" ("expiresAt");

-- ────────────────────────────────────────────────────────────────
-- 4. ContractSignatory — multi-sig table (one row per participant)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ContractSignatory" (
  "id"            TEXT            NOT NULL DEFAULT gen_random_uuid()::text,
  "contractId"    TEXT            NOT NULL,
  "userId"        TEXT            NOT NULL,
  "role"          "SignatoryRole" NOT NULL,
  "notaryRank"    INTEGER,
  "feePercent"    DECIMAL(5, 4),
  "signatureHash" TEXT,
  "isConfirmed"   BOOLEAN         NOT NULL DEFAULT false,
  "confirmedAt"   TIMESTAMP(3),

  CONSTRAINT "ContractSignatory_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "ContractSignatory_contractUser_key"  UNIQUE ("contractId", "userId"),
  CONSTRAINT "ContractSignatory_signatureHash_key" UNIQUE ("signatureHash"),
  CONSTRAINT "ContractSignatory_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "LegalContract"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContractSignatory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ContractSignatory_contractId_role_idx"
  ON "ContractSignatory" ("contractId", "role");
CREATE INDEX IF NOT EXISTS "ContractSignatory_contractId_isConfirmed_idx"
  ON "ContractSignatory" ("contractId", "isConfirmed");
CREATE INDEX IF NOT EXISTS "ContractSignatory_userId_idx"
  ON "ContractSignatory" ("userId");

-- ────────────────────────────────────────────────────────────────
-- 5. TempleSnapshot — immutable cold storage archive
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "TempleSnapshot" (
  "id"           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "contractId"   TEXT         NOT NULL,
  "snapshotJson" JSONB        NOT NULL,
  "archivedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archiveHash"  TEXT         NOT NULL,

  CONSTRAINT "TempleSnapshot_pkey"          PRIMARY KEY ("id"),
  CONSTRAINT "TempleSnapshot_contractId_key" UNIQUE ("contractId"),
  CONSTRAINT "TempleSnapshot_archiveHash_key" UNIQUE ("archiveHash"),
  CONSTRAINT "TempleSnapshot_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "LegalContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TempleSnapshot_archivedAt_idx" ON "TempleSnapshot" ("archivedAt");

-- ────────────────────────────────────────────────────────────────
-- 6. Seed default ContractTemplates (Temple of Heaven)
-- ────────────────────────────────────────────────────────────────
INSERT INTO "ContractTemplate" ("id", "code", "title", "bodyTemplate", "requiredRank", "updatedAt") VALUES
  (
    gen_random_uuid()::text,
    'ZUN-LABOR-v1',
    'Зун: Трудовой договор',
    'Трудовой договор на уровне Зун (100 семей).
Сторона А: {{partyA_name}} ({{partyA_legalAddress}})
Банковские реквизиты А: {{partyA_bank}}
Сторона Б: {{partyB_name}} ({{partyB_legalAddress}})
Банковские реквизиты Б: {{partyB_bank}}
Срок договора: {{duration}}
Дополнительные условия: {{customConditions}}
Нотариальный ранг: 1',
    1,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'MYANGAD-SERVICE-v1',
    'Мьянгад: Договор оказания услуг',
    'Договор оказания услуг на уровне Мьянгад (1 000 семей).
Сторона А: {{partyA_name}} | Адрес: {{partyA_legalAddress}} | Реквизиты: {{partyA_bank}}
Сторона Б: {{partyB_name}} | Адрес: {{partyB_legalAddress}} | Реквизиты: {{partyB_bank}}
Предмет договора: {{subject}}
Дополнительные условия: {{customConditions}}
Нотариальный ранг: 2',
    2,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'TUMED-PARTNERSHIP-v1',
    'Тумэд: Соглашение о партнёрстве',
    'Соглашение о партнёрстве на уровне Тумэд (10 000 семей).
Сторона А: {{partyA_name}} | Юр. адрес: {{partyA_legalAddress}} | Банк: {{partyA_bank}}
Сторона Б: {{partyB_name}} | Юр. адрес: {{partyB_legalAddress}} | Банк: {{partyB_bank}}
Сумма сделки: {{amount}} ALTAN
Дополнительные условия: {{customConditions}}
Нотариальный ранг: 3',
    3,
    CURRENT_TIMESTAMP
  ),
  (
    gen_random_uuid()::text,
    'ZUN-MEDIATION-v1',
    'Зун: Договор с посредником',
    'Договор с участием посредника.
Сторона А: {{partyA_name}} | Сторона Б: {{partyB_name}}
Посредник: {{mediator_name}} | Комиссия посредника: {{mediator_fee}}%
ВНИМАНИЕ: Суммарная комиссия всех посредников не может превышать 1%.
Дополнительные условия: {{customConditions}}',
    1,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("code") DO NOTHING;
