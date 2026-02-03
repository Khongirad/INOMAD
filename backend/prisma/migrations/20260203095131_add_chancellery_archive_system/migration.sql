-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('EMPLOYMENT_CONTRACT', 'SERVICE_CONTRACT', 'PURCHASE_AGREEMENT', 'LEASE_AGREEMENT', 'LOAN_AGREEMENT', 'PARTNERSHIP_AGREEMENT', 'QUEST_ASSIGNMENT', 'WORK_ACCEPTANCE', 'COMPLETION_REPORT', 'PETITION', 'CERTIFICATE', 'ORDER', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURES', 'PARTIALLY_SIGNED', 'FULLY_SIGNED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SignatureRole" AS ENUM ('CREATOR', 'RECIPIENT', 'WITNESS', 'AUTHORITY');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('OPEN', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'COMPLETED', 'REJECTED', 'CANCELLED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'QUEST_CREATED';
ALTER TYPE "EventType" ADD VALUE 'QUEST_ACCEPTED';
ALTER TYPE "EventType" ADD VALUE 'QUEST_SUBMITTED';
ALTER TYPE "EventType" ADD VALUE 'QUEST_COMPLETED';
ALTER TYPE "EventType" ADD VALUE 'QUEST_REJECTED';
ALTER TYPE "EventType" ADD VALUE 'DOCUMENT_CREATED';
ALTER TYPE "EventType" ADD VALUE 'DOCUMENT_SIGNED';
ALTER TYPE "EventType" ADD VALUE 'DOCUMENT_FINALIZED';

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "govtCode" TEXT,
    "category" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "minSignatures" INTEGER NOT NULL DEFAULT 2,
    "requiresWitnesses" INTEGER NOT NULL DEFAULT 0,
    "scope" "EventScope" NOT NULL DEFAULT 'INDIVIDUAL',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "creatorId" TEXT NOT NULL,
    "recipientIds" TEXT[],
    "witnessIds" TEXT[],
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "attachments" TEXT[],
    "timelineEventId" TEXT,
    "questId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "archiveHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSignature" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "role" "SignatureRole" NOT NULL,
    "signature" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "location" TEXT,

    CONSTRAINT "DocumentSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "takerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "objectives" JSONB[],
    "requirements" JSONB,
    "minReputation" INTEGER,
    "rewardAltan" DECIMAL(18,4),
    "rewardItems" JSONB,
    "reputationGain" INTEGER,
    "deadline" TIMESTAMP(3),
    "estimatedDuration" INTEGER,
    "status" "QuestStatus" NOT NULL DEFAULT 'OPEN',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "submissions" JSONB[],
    "giverRating" INTEGER,
    "takerRating" INTEGER,
    "giverFeedback" TEXT,
    "takerFeedback" TEXT,
    "assignmentDocId" TEXT,
    "completionDocId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalDeals" INTEGER NOT NULL DEFAULT 0,
    "successfulDeals" INTEGER NOT NULL DEFAULT 0,
    "successRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "ratingsReceived" INTEGER NOT NULL DEFAULT 0,
    "questsCompleted" INTEGER NOT NULL DEFAULT 0,
    "questsPosted" INTEGER NOT NULL DEFAULT 0,
    "questSuccessRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "contractsSigned" INTEGER NOT NULL DEFAULT 0,
    "activeContracts" INTEGER NOT NULL DEFAULT 0,
    "badges" JSONB[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReputationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentTemplate_type_idx" ON "DocumentTemplate"("type");

-- CreateIndex
CREATE INDEX "DocumentTemplate_isActive_idx" ON "DocumentTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Document_timelineEventId_key" ON "Document"("timelineEventId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_questId_key" ON "Document"("questId");

-- CreateIndex
CREATE INDEX "Document_creatorId_idx" ON "Document"("creatorId");

-- CreateIndex
CREATE INDEX "Document_status_idx" ON "Document"("status");

-- CreateIndex
CREATE INDEX "Document_templateId_idx" ON "Document"("templateId");

-- CreateIndex
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");

-- CreateIndex
CREATE INDEX "DocumentSignature_documentId_idx" ON "DocumentSignature"("documentId");

-- CreateIndex
CREATE INDEX "DocumentSignature_signerId_idx" ON "DocumentSignature"("signerId");

-- CreateIndex
CREATE INDEX "DocumentSignature_signedAt_idx" ON "DocumentSignature"("signedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Quest_assignmentDocId_key" ON "Quest"("assignmentDocId");

-- CreateIndex
CREATE INDEX "Quest_giverId_idx" ON "Quest"("giverId");

-- CreateIndex
CREATE INDEX "Quest_takerId_idx" ON "Quest"("takerId");

-- CreateIndex
CREATE INDEX "Quest_status_idx" ON "Quest"("status");

-- CreateIndex
CREATE INDEX "Quest_deadline_idx" ON "Quest"("deadline");

-- CreateIndex
CREATE UNIQUE INDEX "ReputationProfile_userId_key" ON "ReputationProfile"("userId");

-- CreateIndex
CREATE INDEX "ReputationProfile_userId_idx" ON "ReputationProfile"("userId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_timelineEventId_fkey" FOREIGN KEY ("timelineEventId") REFERENCES "TimelineEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignature" ADD CONSTRAINT "DocumentSignature_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentSignature" ADD CONSTRAINT "DocumentSignature_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_takerId_fkey" FOREIGN KEY ("takerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_assignmentDocId_fkey" FOREIGN KEY ("assignmentDocId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationProfile" ADD CONSTRAINT "ReputationProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
