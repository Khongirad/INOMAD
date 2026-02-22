-- Sprint 2 Scale: Composite indexes for hot query patterns
-- These indexes dramatically speed up listZuns, listMyangads, listTumeds, listOrganizations

-- Zun: isActive + myangadId (used together in listZuns)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Zun_myangadId_isActive_idx"
  ON "Zun" ("myangadId", "isActive") WHERE "isActive" = true;

-- Myangad: isActive + tumedId (used together in listMyangads)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Myangad_tumedId_isActive_idx"
  ON "Myangad" ("tumedId", "isActive") WHERE "isActive" = true;

-- Tumed: isActive + republicId (used together in listTumeds)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Tumed_republicId_isActive_idx"
  ON "Tumed" ("republicId", "isActive") WHERE "isActive" = true;

-- User: currentArbadId (search all members of an Arbad)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "User_currentArbadId_idx"
  ON "User" ("currentArbadId") WHERE "currentArbadId" IS NOT NULL;

-- FamilyArbad: isActive (hot filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "FamilyArbad_isActive_idx"
  ON "FamilyArbad" ("isActive") WHERE "isActive" = true;

-- OrganizationalArbad: parentOrgId + isActive (used in cycle detection CTE)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "OrganizationalArbad_parentOrgId_isActive_idx"
  ON "OrganizationalArbad" ("parentOrgId", "isActive");

-- Organization: type + branch (used in listOrganizations filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Organization_type_branch_idx"
  ON "Organization" ("type", "branch");
