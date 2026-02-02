-- CreateEnum
CREATE TYPE "BankPosition" AS ENUM ('EMPLOYEE', 'TELLER', 'OFFICER', 'BANKER', 'CHAIRMAN');

-- CreateEnum
CREATE TYPE "ProposalType" AS ENUM ('ARBAN_BUDGET', 'ARBAN_LEADER', 'ARBAN_PROJECT', 'ZUN_POLICY', 'ZUN_ELDER', 'ZUN_BUDGET', 'MYANGAN_LAW', 'MYANGAN_LEADER', 'TUMEN_NATIONAL', 'TUMEN_CHAIRMAN', 'CONSTITUTIONAL');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('ACTIVE', 'PASSED', 'REJECTED', 'EXECUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MarketplaceListingType" AS ENUM ('PHYSICAL_GOOD', 'DIGITAL_GOOD', 'SERVICE', 'WORK');

-- CreateEnum
CREATE TYPE "MarketplaceListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MarketplacePurchaseStatus" AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "JobPostingStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'CLOSED');

-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "BankEmployee" (
    "id" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "employeeId" BIGINT NOT NULL,
    "bankArbanId" BIGINT NOT NULL,
    "bankZunId" BIGINT,
    "bankMyanganId" BIGINT,
    "bankTumenId" BIGINT,
    "performance" INTEGER NOT NULL DEFAULT 75,
    "position" "BankPosition" NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "proposalId" INTEGER NOT NULL,
    "proposalType" "ProposalType" NOT NULL,
    "khuralLevel" "KhuralLevel" NOT NULL,
    "khuralId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "executionData" TEXT,
    "proposer" TEXT NOT NULL,
    "proposerSeatId" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'ACTIVE',
    "votingPeriod" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3) NOT NULL,
    "votesFor" INTEGER NOT NULL DEFAULT 0,
    "votesAgainst" INTEGER NOT NULL DEFAULT 0,
    "quorumRequired" INTEGER NOT NULL,
    "finalized" BOOLEAN NOT NULL DEFAULT false,
    "finalizedAt" TIMESTAMP(3),
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "executedAt" TIMESTAMP(3),
    "txHash" TEXT,
    "blockNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "voter" TEXT NOT NULL,
    "voterSeatId" TEXT,
    "support" BOOLEAN NOT NULL,
    "reason" TEXT,
    "khuralLevel" "KhuralLevel" NOT NULL,
    "votingPower" INTEGER NOT NULL DEFAULT 1,
    "txHash" TEXT,
    "blockNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KhuralDelegate" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "seatId" TEXT,
    "khuralLevel" "KhuralLevel" NOT NULL,
    "khuralId" INTEGER NOT NULL,
    "sourceLevel" "KhuralLevel",
    "sourceId" INTEGER,
    "role" TEXT NOT NULL,
    "electedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "termEnds" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "proposalsCreated" INTEGER NOT NULL DEFAULT 0,
    "votescast" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KhuralDelegate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotingStatistics" (
    "id" TEXT NOT NULL,
    "khuralLevel" "KhuralLevel" NOT NULL,
    "period" TEXT NOT NULL,
    "totalProposals" INTEGER NOT NULL DEFAULT 0,
    "passedProposals" INTEGER NOT NULL DEFAULT 0,
    "rejectedProposals" INTEGER NOT NULL DEFAULT 0,
    "totalVotes" INTEGER NOT NULL DEFAULT 0,
    "participationRate" DOUBLE PRECISION,
    "averageQuorum" DOUBLE PRECISION,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VotingStatistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "listingType" "MarketplaceListingType" NOT NULL,
    "status" "MarketplaceListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "images" TEXT[],
    "price" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "totalRating" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplacePurchase" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "totalPrice" TEXT NOT NULL,
    "status" "MarketplacePurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "shippingAddress" TEXT,
    "trackingInfo" TEXT,
    "txHash" TEXT,
    "escrowId" TEXT,
    "rating" INTEGER,
    "review" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MarketplacePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" TEXT,
    "salary" TEXT NOT NULL,
    "duration" TEXT,
    "location" TEXT,
    "remote" BOOLEAN NOT NULL DEFAULT false,
    "status" "JobPostingStatus" NOT NULL DEFAULT 'OPEN',
    "deadline" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "coverLetter" TEXT NOT NULL,
    "resumeUrl" TEXT,
    "expectedSalary" TEXT,
    "status" "JobApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "employerNotes" TEXT,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankEmployee_seatId_key" ON "BankEmployee"("seatId");

-- CreateIndex
CREATE UNIQUE INDEX "BankEmployee_wallet_key" ON "BankEmployee"("wallet");

-- CreateIndex
CREATE UNIQUE INDEX "BankEmployee_employeeId_key" ON "BankEmployee"("employeeId");

-- CreateIndex
CREATE INDEX "BankEmployee_seatId_idx" ON "BankEmployee"("seatId");

-- CreateIndex
CREATE INDEX "BankEmployee_wallet_idx" ON "BankEmployee"("wallet");

-- CreateIndex
CREATE INDEX "BankEmployee_bankArbanId_idx" ON "BankEmployee"("bankArbanId");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_proposalId_key" ON "Proposal"("proposalId");

-- CreateIndex
CREATE INDEX "Proposal_proposalId_idx" ON "Proposal"("proposalId");

-- CreateIndex
CREATE INDEX "Proposal_khuralLevel_khuralId_idx" ON "Proposal"("khuralLevel", "khuralId");

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- CreateIndex
CREATE INDEX "Proposal_proposer_idx" ON "Proposal"("proposer");

-- CreateIndex
CREATE INDEX "Vote_voter_idx" ON "Vote"("voter");

-- CreateIndex
CREATE INDEX "Vote_proposalId_idx" ON "Vote"("proposalId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_proposalId_voter_key" ON "Vote"("proposalId", "voter");

-- CreateIndex
CREATE INDEX "KhuralDelegate_seatId_idx" ON "KhuralDelegate"("seatId");

-- CreateIndex
CREATE INDEX "KhuralDelegate_khuralLevel_khuralId_idx" ON "KhuralDelegate"("khuralLevel", "khuralId");

-- CreateIndex
CREATE INDEX "KhuralDelegate_active_idx" ON "KhuralDelegate"("active");

-- CreateIndex
CREATE UNIQUE INDEX "KhuralDelegate_walletAddress_khuralLevel_khuralId_key" ON "KhuralDelegate"("walletAddress", "khuralLevel", "khuralId");

-- CreateIndex
CREATE INDEX "VotingStatistics_khuralLevel_idx" ON "VotingStatistics"("khuralLevel");

-- CreateIndex
CREATE UNIQUE INDEX "VotingStatistics_khuralLevel_period_key" ON "VotingStatistics"("khuralLevel", "period");

-- CreateIndex
CREATE INDEX "MarketplaceListing_sellerId_idx" ON "MarketplaceListing"("sellerId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_categoryId_idx" ON "MarketplaceListing"("categoryId");

-- CreateIndex
CREATE INDEX "MarketplaceListing_status_idx" ON "MarketplaceListing"("status");

-- CreateIndex
CREATE INDEX "MarketplaceListing_listingType_idx" ON "MarketplaceListing"("listingType");

-- CreateIndex
CREATE INDEX "MarketplacePurchase_listingId_idx" ON "MarketplacePurchase"("listingId");

-- CreateIndex
CREATE INDEX "MarketplacePurchase_buyerId_idx" ON "MarketplacePurchase"("buyerId");

-- CreateIndex
CREATE INDEX "MarketplacePurchase_status_idx" ON "MarketplacePurchase"("status");

-- CreateIndex
CREATE INDEX "Job_employerId_idx" ON "Job"("employerId");

-- CreateIndex
CREATE INDEX "Job_categoryId_idx" ON "Job"("categoryId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "JobApplication_jobId_idx" ON "JobApplication"("jobId");

-- CreateIndex
CREATE INDEX "JobApplication_applicantId_idx" ON "JobApplication"("applicantId");

-- CreateIndex
CREATE INDEX "JobApplication_status_idx" ON "JobApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_jobId_applicantId_key" ON "JobApplication"("jobId", "applicantId");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_proposerSeatId_fkey" FOREIGN KEY ("proposerSeatId") REFERENCES "User"("seatId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_voterSeatId_fkey" FOREIGN KEY ("voterSeatId") REFERENCES "User"("seatId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KhuralDelegate" ADD CONSTRAINT "KhuralDelegate_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "User"("seatId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplacePurchase" ADD CONSTRAINT "MarketplacePurchase_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
