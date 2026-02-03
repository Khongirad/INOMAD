-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ElectionStatus" AS ENUM ('UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EducationType" AS ENUM ('DIPLOMA', 'CERTIFICATE', 'RECOMMENDATION');

-- AlterTable
ALTER TABLE "OrganizationMember" ADD COLUMN     "invitedBy" TEXT;

-- CreateTable
CREATE TABLE "EducationVerification" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "type" "EducationType" NOT NULL,
    "institution" TEXT NOT NULL,
    "fieldOfStudy" TEXT NOT NULL,
    "graduationYear" INTEGER,
    "documentHash" TEXT,
    "documentUrl" TEXT,
    "recommenderId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "validForGuilds" TEXT[],

    CONSTRAINT "EducationVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildInvitation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guildId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),

    CONSTRAINT "GuildInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Election" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "ElectionStatus" NOT NULL DEFAULT 'UPCOMING',
    "winnerId" TEXT,
    "winnerVotes" INTEGER,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "turnoutRate" DECIMAL(65,30),

    CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectionCandidate" (
    "id" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "platform" TEXT,
    "votes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectionCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EducationVerification_userId_idx" ON "EducationVerification"("userId");

-- CreateIndex
CREATE INDEX "EducationVerification_isVerified_idx" ON "EducationVerification"("isVerified");

-- CreateIndex
CREATE INDEX "EducationVerification_fieldOfStudy_idx" ON "EducationVerification"("fieldOfStudy");

-- CreateIndex
CREATE INDEX "GuildInvitation_inviterId_idx" ON "GuildInvitation"("inviterId");

-- CreateIndex
CREATE INDEX "GuildInvitation_inviteeId_idx" ON "GuildInvitation"("inviteeId");

-- CreateIndex
CREATE INDEX "GuildInvitation_guildId_status_idx" ON "GuildInvitation"("guildId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GuildInvitation_guildId_inviteeId_key" ON "GuildInvitation"("guildId", "inviteeId");

-- CreateIndex
CREATE INDEX "Election_organizationId_idx" ON "Election"("organizationId");

-- CreateIndex
CREATE INDEX "Election_status_idx" ON "Election"("status");

-- CreateIndex
CREATE INDEX "Election_startDate_idx" ON "Election"("startDate");

-- CreateIndex
CREATE INDEX "ElectionCandidate_electionId_idx" ON "ElectionCandidate"("electionId");

-- CreateIndex
CREATE INDEX "ElectionCandidate_candidateId_idx" ON "ElectionCandidate"("candidateId");

-- CreateIndex
CREATE UNIQUE INDEX "ElectionCandidate_electionId_candidateId_key" ON "ElectionCandidate"("electionId", "candidateId");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationVerification" ADD CONSTRAINT "EducationVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationVerification" ADD CONSTRAINT "EducationVerification_recommenderId_fkey" FOREIGN KEY ("recommenderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildInvitation" ADD CONSTRAINT "GuildInvitation_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildInvitation" ADD CONSTRAINT "GuildInvitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildInvitation" ADD CONSTRAINT "GuildInvitation_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Election" ADD CONSTRAINT "Election_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Election" ADD CONSTRAINT "Election_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionCandidate" ADD CONSTRAINT "ElectionCandidate_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectionCandidate" ADD CONSTRAINT "ElectionCandidate_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
