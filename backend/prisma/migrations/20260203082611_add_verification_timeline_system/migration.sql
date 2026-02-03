-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('ACCOUNT_CREATED', 'IDENTITY_VERIFIED', 'CITIZENSHIP_GRANTED', 'CONTRACT_SIGNED', 'CONTRACT_COMPLETED', 'CONTRACT_CANCELLED', 'TASK_ASSIGNED', 'TASK_COMPLETED', 'TASK_REVIEWED', 'LOAN_REQUESTED', 'LOAN_APPROVED', 'LOAN_REPAID', 'PAYMENT_MADE', 'VOTE_CAST', 'PROPOSAL_SUBMITTED', 'LAW_ENACTED', 'COURSE_COMPLETED', 'CERTIFICATION_EARNED', 'CASE_FILED', 'JUDGMENT_RENDERED', 'CUSTOM_EVENT');

-- CreateEnum
CREATE TYPE "EventScope" AS ENUM ('INDIVIDUAL', 'FAMILY', 'CLAN', 'ARBAN', 'HORDE', 'NATION', 'CONFEDERATION');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "clanId" TEXT,
ADD COLUMN     "currentArbanId" TEXT,
ADD COLUMN     "familyId" TEXT,
ADD COLUMN     "hordeId" TEXT,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxVerifications" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "nationId" TEXT,
ADD COLUMN     "verificationCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UserVerification" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedUserId" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "verificationMethod" TEXT NOT NULL,
    "notes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" TEXT,
    "timelineEventId" TEXT,

    CONSTRAINT "UserVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "EventType" NOT NULL,
    "scope" "EventScope" NOT NULL DEFAULT 'INDIVIDUAL',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "actorId" TEXT,
    "targetId" TEXT,
    "location" TEXT,
    "timezone" TEXT DEFAULT 'UTC',
    "familyId" TEXT,
    "clanId" TEXT,
    "arbanId" TEXT,
    "hordeId" TEXT,
    "nationId" TEXT,
    "isLegalContract" BOOLEAN NOT NULL DEFAULT false,
    "contractHash" TEXT,
    "witnessIds" TEXT[],
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "taskId" TEXT,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalRecord" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scope" "EventScope" NOT NULL,
    "scopeId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "eventIds" TEXT[],

    CONSTRAINT "HistoricalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserVerification_timelineEventId_key" ON "UserVerification"("timelineEventId");

-- CreateIndex
CREATE INDEX "UserVerification_verifierId_idx" ON "UserVerification"("verifierId");

-- CreateIndex
CREATE INDEX "UserVerification_verifiedUserId_idx" ON "UserVerification"("verifiedUserId");

-- CreateIndex
CREATE INDEX "UserVerification_createdAt_idx" ON "UserVerification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserVerification_verifiedUserId_verifierId_key" ON "UserVerification"("verifiedUserId", "verifierId");

-- CreateIndex
CREATE INDEX "TimelineEvent_actorId_createdAt_idx" ON "TimelineEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "TimelineEvent_targetId_createdAt_idx" ON "TimelineEvent"("targetId", "createdAt");

-- CreateIndex
CREATE INDEX "TimelineEvent_type_scope_idx" ON "TimelineEvent"("type", "scope");

-- CreateIndex
CREATE INDEX "TimelineEvent_createdAt_idx" ON "TimelineEvent"("createdAt");

-- CreateIndex
CREATE INDEX "TimelineEvent_arbanId_idx" ON "TimelineEvent"("arbanId");

-- CreateIndex
CREATE INDEX "TimelineEvent_clanId_idx" ON "TimelineEvent"("clanId");

-- CreateIndex
CREATE INDEX "HistoricalRecord_scope_scopeId_idx" ON "HistoricalRecord"("scope", "scopeId");

-- CreateIndex
CREATE INDEX "HistoricalRecord_createdAt_idx" ON "HistoricalRecord"("createdAt");

-- CreateIndex
CREATE INDEX "HistoricalRecord_isPublished_idx" ON "HistoricalRecord"("isPublished");

-- AddForeignKey
ALTER TABLE "UserVerification" ADD CONSTRAINT "UserVerification_verifiedUserId_fkey" FOREIGN KEY ("verifiedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVerification" ADD CONSTRAINT "UserVerification_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVerification" ADD CONSTRAINT "UserVerification_timelineEventId_fkey" FOREIGN KEY ("timelineEventId") REFERENCES "TimelineEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalRecord" ADD CONSTRAINT "HistoricalRecord_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
