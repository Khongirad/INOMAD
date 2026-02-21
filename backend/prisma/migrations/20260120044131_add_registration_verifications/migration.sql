-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CITIZEN', 'LEADER', 'ADMIN');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('LOCKED', 'PENDING', 'UNLOCKED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('DRAFT', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KhuralLevel" AS ENUM ('ARBAN', 'ZUUN', 'MYANGAN', 'TUMEN');

-- CreateEnum
CREATE TYPE "GuildType" AS ENUM ('CLAN', 'PROFESSION', 'ORGANIZATION', 'GOVERNMENT');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('MEMBER', 'OFFICER', 'LEADER');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'TAKEN', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TRANSFER', 'MINT', 'BURN', 'REWARD', 'FEE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "KhuralEventType" AS ENUM ('SESSION_START', 'DECREE_SIGNED', 'APPOINTMENT', 'AMENDMENT', 'EMERGENCY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CITIZEN',
    "walletStatus" "WalletStatus" NOT NULL DEFAULT 'LOCKED',
    "birthPlace" JSONB,
    "currentAddress" JSONB,
    "ethnicity" TEXT[],
    "clan" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "isSuperVerified" BOOLEAN NOT NULL DEFAULT false,
    "superVerifiedBy" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "verifierUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KhuralGroup" (
    "id" TEXT NOT NULL,
    "level" "KhuralLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "parentGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KhuralGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KhuralSeat" (
    "id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,
    "occupantUserId" TEXT,
    "isLeaderSeat" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KhuralSeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL,
    "type" "GuildType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "professionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMember" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "professionRank" INTEGER,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "professionId" TEXT,
    "rewardAltan" DECIMAL(18,6) NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "assignedUserId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "postedByGuildId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AltanLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "lastSyncedBlock" BIGINT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AltanLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AltanTransaction" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT,
    "amount" DECIMAL(18,6) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "txHash" TEXT,
    "blockNumber" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AltanTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "hash" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KhuralEvent" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "KhuralEventType" NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "relatedProposalId" TEXT,

    CONSTRAINT "KhuralEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KhuralEventVersion" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "proposedByUserId" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KhuralEventVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouncilVote" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "voterUserId" TEXT NOT NULL,
    "vote" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouncilVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnlockRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "WalletStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnlockRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnlockApproval" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "approverUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnlockApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_seatId_key" ON "User"("seatId");

-- CreateIndex
CREATE INDEX "User_seatId_idx" ON "User"("seatId");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_verificationStatus_idx" ON "User"("verificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_targetUserId_verifierUserId_key" ON "Verification"("targetUserId", "verifierUserId");

-- CreateIndex
CREATE INDEX "KhuralGroup_level_idx" ON "KhuralGroup"("level");

-- CreateIndex
CREATE INDEX "KhuralGroup_parentGroupId_idx" ON "KhuralGroup"("parentGroupId");

-- CreateIndex
CREATE INDEX "KhuralSeat_groupId_idx" ON "KhuralSeat"("groupId");

-- CreateIndex
CREATE INDEX "KhuralSeat_occupantUserId_idx" ON "KhuralSeat"("occupantUserId");

-- CreateIndex
CREATE UNIQUE INDEX "KhuralSeat_groupId_index_key" ON "KhuralSeat"("groupId", "index");

-- CreateIndex
CREATE INDEX "Guild_type_idx" ON "Guild"("type");

-- CreateIndex
CREATE INDEX "Guild_professionId_idx" ON "Guild"("professionId");

-- CreateIndex
CREATE INDEX "GuildMember_guildId_idx" ON "GuildMember"("guildId");

-- CreateIndex
CREATE INDEX "GuildMember_userId_idx" ON "GuildMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildMember_guildId_userId_key" ON "GuildMember"("guildId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profession_name_key" ON "Profession"("name");

-- CreateIndex
CREATE INDEX "Profession_name_idx" ON "Profession"("name");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_professionId_idx" ON "Task"("professionId");

-- CreateIndex
CREATE INDEX "Task_assignedUserId_idx" ON "Task"("assignedUserId");

-- CreateIndex
CREATE INDEX "Task_postedByGuildId_idx" ON "Task"("postedByGuildId");

-- CreateIndex
CREATE UNIQUE INDEX "AltanLedger_userId_key" ON "AltanLedger"("userId");

-- CreateIndex
CREATE INDEX "AltanLedger_userId_idx" ON "AltanLedger"("userId");

-- CreateIndex
CREATE INDEX "AltanTransaction_fromUserId_idx" ON "AltanTransaction"("fromUserId");

-- CreateIndex
CREATE INDEX "AltanTransaction_toUserId_idx" ON "AltanTransaction"("toUserId");

-- CreateIndex
CREATE INDEX "AltanTransaction_type_idx" ON "AltanTransaction"("type");

-- CreateIndex
CREATE INDEX "KhuralEventVersion_eventId_idx" ON "KhuralEventVersion"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "CouncilVote_versionId_voterUserId_key" ON "CouncilVote"("versionId", "voterUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UnlockRequest_userId_key" ON "UnlockRequest"("userId");

-- CreateIndex
CREATE INDEX "UnlockRequest_userId_idx" ON "UnlockRequest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UnlockApproval_requestId_approverUserId_key" ON "UnlockApproval"("requestId", "approverUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_verifierUserId_fkey" FOREIGN KEY ("verifierUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KhuralGroup" ADD CONSTRAINT "KhuralGroup_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "KhuralGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KhuralSeat" ADD CONSTRAINT "KhuralSeat_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "KhuralGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KhuralSeat" ADD CONSTRAINT "KhuralSeat_occupantUserId_fkey" FOREIGN KEY ("occupantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "Profession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "Profession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_postedByGuildId_fkey" FOREIGN KEY ("postedByGuildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AltanLedger" ADD CONSTRAINT "AltanLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AltanTransaction" ADD CONSTRAINT "AltanTransaction_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AltanTransaction" ADD CONSTRAINT "AltanTransaction_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KhuralEventVersion" ADD CONSTRAINT "KhuralEventVersion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "KhuralEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KhuralEventVersion" ADD CONSTRAINT "KhuralEventVersion_proposedByUserId_fkey" FOREIGN KEY ("proposedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilVote" ADD CONSTRAINT "CouncilVote_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "KhuralEventVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilVote" ADD CONSTRAINT "CouncilVote_voterUserId_fkey" FOREIGN KEY ("voterUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnlockRequest" ADD CONSTRAINT "UnlockRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnlockApproval" ADD CONSTRAINT "UnlockApproval_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "UnlockRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnlockApproval" ADD CONSTRAINT "UnlockApproval_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
