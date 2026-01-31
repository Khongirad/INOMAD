-- CreateEnum
CREATE TYPE "OrgArbanType" AS ENUM ('NONE', 'EXECUTIVE', 'JUDICIAL', 'BANKING', 'PRIVATE_COMPANY', 'STATE_COMPANY', 'GUILD', 'SCIENTIFIC_COUNCIL', 'EKHE_KHURAL');

-- CreateEnum
CREATE TYPE "PowerBranchType" AS ENUM ('NONE', 'LEGISLATIVE', 'EXECUTIVE', 'JUDICIAL', 'BANKING');

-- CreateEnum
CREATE TYPE "CreditLineType" AS ENUM ('NONE', 'FAMILY', 'ORG');

-- CreateEnum
CREATE TYPE "TierArbanType" AS ENUM ('NONE', 'FAMILY', 'ORG');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('LIBRARY', 'ARCHIVE', 'CADASTRE');

-- CreateEnum
CREATE TYPE "PatentStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GrantStatus" AS ENUM ('REQUESTED', 'APPROVED', 'DISBURSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('PENDING', 'ASSIGNED', 'UNDER_REVIEW', 'RULED', 'APPEALED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RulingType" AS ENUM ('CIVIL', 'CRIMINAL', 'ADMINISTRATIVE');

-- CreateEnum
CREATE TYPE "MPCWalletStatus" AS ENUM ('PENDING_SETUP', 'ACTIVE', 'RECOVERY_MODE', 'FROZEN', 'MIGRATING');

-- CreateEnum
CREATE TYPE "ShareType" AS ENUM ('DEVICE', 'SERVER', 'RECOVERY');

-- CreateEnum
CREATE TYPE "RecoveryMethod" AS ENUM ('SOCIAL', 'EMAIL', 'PHONE', 'HARDWARE', 'ARBAN', 'NONE');

-- CreateEnum
CREATE TYPE "GuardianType" AS ENUM ('SPOUSE', 'FAMILY', 'KHURAL_REP', 'FRIEND', 'EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "RecoverySessionStatus" AS ENUM ('PENDING', 'VERIFYING', 'APPROVING', 'APPROVED', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "UserOpStatus" AS ENUM ('PENDING', 'SIGNED', 'SUBMITTED', 'MEMPOOL', 'INCLUDED', 'CONFIRMED', 'FAILED', 'REVERTED', 'DROPPED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "walletMigrated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FamilyArban" (
    "id" TEXT NOT NULL,
    "arbanId" BIGINT NOT NULL,
    "husbandSeatId" TEXT NOT NULL,
    "wifeSeatId" TEXT NOT NULL,
    "heirSeatId" TEXT,
    "zunId" BIGINT,
    "khuralRepSeatId" TEXT,
    "khuralRepBirthYear" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyArban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyArbanChild" (
    "id" TEXT NOT NULL,
    "arbanId" BIGINT NOT NULL,
    "childSeatId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyArbanChild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zun" (
    "id" TEXT NOT NULL,
    "zunId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "founderArbanId" BIGINT NOT NULL,
    "elderSeatId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationalArban" (
    "id" TEXT NOT NULL,
    "arbanId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "orgType" "OrgArbanType" NOT NULL,
    "powerBranch" "PowerBranchType" NOT NULL,
    "parentOrgId" BIGINT,
    "leaderSeatId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationalArban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgArbanMember" (
    "id" TEXT NOT NULL,
    "arbanId" BIGINT NOT NULL,
    "seatId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgArbanMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditLine" (
    "id" TEXT NOT NULL,
    "arbanId" BIGINT NOT NULL,
    "creditType" "CreditLineType" NOT NULL,
    "creditRating" INTEGER NOT NULL DEFAULT 500,
    "creditLimit" DECIMAL(18,6) NOT NULL,
    "borrowed" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "totalBorrowed" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "totalRepaid" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "defaultCount" INTEGER NOT NULL DEFAULT 0,
    "onTimeCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "loanId" BIGINT NOT NULL,
    "arbanId" BIGINT NOT NULL,
    "creditType" "CreditLineType" NOT NULL,
    "principal" DECIMAL(18,6) NOT NULL,
    "interest" DECIMAL(18,6) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repaidAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefaulted" BOOLEAN NOT NULL DEFAULT false,
    "txHashBorrow" TEXT,
    "txHashRepay" TEXT,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierDistribution" (
    "id" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "accountId" BIGINT NOT NULL,
    "tier" INTEGER NOT NULL,
    "arbanType" "TierArbanType" NOT NULL,
    "arbanId" BIGINT NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "rejected" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "txHash" TEXT,

    CONSTRAINT "TierDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierReceived" (
    "id" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(18,6) NOT NULL,
    "txHash" TEXT,

    CONSTRAINT "TierReceived_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DigitalSeal" (
    "id" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "signer1SeatId" TEXT NOT NULL,
    "signer2SeatId" TEXT NOT NULL,
    "documentHash" TEXT,
    "title" TEXT,
    "description" TEXT,
    "approvalCount" INTEGER NOT NULL DEFAULT 0,
    "signer1Approved" BOOLEAN NOT NULL DEFAULT false,
    "signer2Approved" BOOLEAN NOT NULL DEFAULT false,
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalSeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TempleRecord" (
    "id" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "recordType" "RecordType" NOT NULL,
    "submitterSeatId" TEXT NOT NULL,
    "scientificVerified" BOOLEAN NOT NULL DEFAULT false,
    "ethicalVerified" BOOLEAN NOT NULL DEFAULT false,
    "scientificVerifier" TEXT,
    "ethicalVerifier" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "TempleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScientistCouncilMember" (
    "id" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "degreeHash" TEXT NOT NULL,
    "nominatedByArbanId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "approvals" INTEGER NOT NULL DEFAULT 0,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "walletAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "ScientistCouncilMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WisdomCouncilMember" (
    "id" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "nominatedByArbanId" TEXT NOT NULL,
    "virtues" TEXT NOT NULL,
    "approvals" INTEGER NOT NULL DEFAULT 0,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "walletAddress" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "WisdomCouncilMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patent" (
    "id" TEXT NOT NULL,
    "patentId" INTEGER NOT NULL,
    "submitterSeatId" TEXT NOT NULL,
    "patentHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "status" "PatentStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewer" TEXT,
    "reviewNotes" TEXT,

    CONSTRAINT "Patent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discovery" (
    "id" TEXT NOT NULL,
    "discoveryId" INTEGER NOT NULL,
    "scientistSeatId" TEXT NOT NULL,
    "discoveryHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "peerReviews" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Discovery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchGrant" (
    "id" TEXT NOT NULL,
    "grantId" INTEGER NOT NULL,
    "scientistSeatId" TEXT NOT NULL,
    "projectTitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requestedAmount" BIGINT NOT NULL,
    "approvedAmount" BIGINT NOT NULL DEFAULT 0,
    "status" "GrantStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "disbursedAt" TIMESTAMP(3),

    CONSTRAINT "ResearchGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouncilOfJusticeMember" (
    "id" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "seatId" TEXT NOT NULL,
    "legalEducationHash" TEXT NOT NULL,
    "nominatedByArbanId" TEXT NOT NULL,
    "specialization" TEXT NOT NULL,
    "approvals" INTEGER NOT NULL DEFAULT 0,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "walletAddress" TEXT NOT NULL,
    "casesHandled" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "CouncilOfJusticeMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JudicialCase" (
    "id" TEXT NOT NULL,
    "caseId" INTEGER NOT NULL,
    "plaintiffSeatId" TEXT NOT NULL,
    "defendantSeatId" TEXT NOT NULL,
    "caseHash" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rulingType" "RulingType" NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'PENDING',
    "assignedJudge" TEXT,
    "rulingHash" TEXT,
    "ruling" TEXT,
    "filedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ruledAt" TIMESTAMP(3),

    CONSTRAINT "JudicialCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalPrecedent" (
    "id" TEXT NOT NULL,
    "precedentId" INTEGER NOT NULL,
    "sourceCaseId" INTEGER NOT NULL,
    "precedentHash" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "legalPrinciple" TEXT NOT NULL,
    "judge" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalPrecedent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MPCWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL DEFAULT 31337,
    "deviceShareId" TEXT,
    "serverShareEnc" TEXT,
    "recoveryMethod" "RecoveryMethod" NOT NULL DEFAULT 'SOCIAL',
    "status" "MPCWalletStatus" NOT NULL DEFAULT 'PENDING_SETUP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "MPCWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeyShare" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "shareType" "ShareType" NOT NULL,
    "shareIndex" INTEGER NOT NULL,
    "publicKey" TEXT NOT NULL,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "userAgent" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,

    CONSTRAINT "KeyShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoveryGuardian" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "guardianType" "GuardianType" NOT NULL,
    "guardianUserId" TEXT,
    "guardianRef" TEXT NOT NULL,
    "guardianName" TEXT,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "recoveryApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "RecoveryGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecoverySession" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "status" "RecoverySessionStatus" NOT NULL DEFAULT 'PENDING',
    "method" "RecoveryMethod" NOT NULL,
    "verificationCode" TEXT,
    "verificationSentTo" TEXT,
    "codeExpiresAt" TIMESTAMP(3),
    "requiredApprovals" INTEGER NOT NULL DEFAULT 2,
    "currentApprovals" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "RecoverySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartAccount" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "accountAddress" TEXT NOT NULL,
    "factoryAddress" TEXT NOT NULL,
    "nonce" BIGINT NOT NULL DEFAULT 0,
    "isDeployed" BOOLEAN NOT NULL DEFAULT false,
    "deployedAt" TIMESTAMP(3),
    "deployTxHash" TEXT,
    "totalGasSponsored" BIGINT NOT NULL DEFAULT 0,
    "dailyGasUsed" BIGINT NOT NULL DEFAULT 0,
    "lastGasResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmartAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOperation" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userOpHash" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "nonce" BIGINT NOT NULL,
    "initCode" TEXT,
    "callData" TEXT NOT NULL,
    "callGasLimit" BIGINT NOT NULL,
    "verificationGasLimit" BIGINT NOT NULL,
    "preVerificationGas" BIGINT NOT NULL,
    "maxFeePerGas" BIGINT NOT NULL,
    "maxPriorityFeePerGas" BIGINT NOT NULL,
    "paymasterAndData" TEXT,
    "signature" TEXT NOT NULL,
    "status" "UserOpStatus" NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "blockNumber" BIGINT,
    "gasUsed" BIGINT,
    "isSponsored" BOOLEAN NOT NULL DEFAULT true,
    "sponsorId" TEXT,
    "sponsoredAmount" BIGINT,
    "errorMessage" TEXT,
    "revertReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "executedAt" TIMESTAMP(3),

    CONSTRAINT "UserOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyArban_arbanId_key" ON "FamilyArban"("arbanId");

-- CreateIndex
CREATE INDEX "FamilyArban_husbandSeatId_idx" ON "FamilyArban"("husbandSeatId");

-- CreateIndex
CREATE INDEX "FamilyArban_wifeSeatId_idx" ON "FamilyArban"("wifeSeatId");

-- CreateIndex
CREATE INDEX "FamilyArban_zunId_idx" ON "FamilyArban"("zunId");

-- CreateIndex
CREATE INDEX "FamilyArban_khuralRepSeatId_idx" ON "FamilyArban"("khuralRepSeatId");

-- CreateIndex
CREATE INDEX "FamilyArbanChild_arbanId_idx" ON "FamilyArbanChild"("arbanId");

-- CreateIndex
CREATE INDEX "FamilyArbanChild_childSeatId_idx" ON "FamilyArbanChild"("childSeatId");

-- CreateIndex
CREATE UNIQUE INDEX "FamilyArbanChild_arbanId_childSeatId_key" ON "FamilyArbanChild"("arbanId", "childSeatId");

-- CreateIndex
CREATE UNIQUE INDEX "Zun_zunId_key" ON "Zun"("zunId");

-- CreateIndex
CREATE INDEX "Zun_founderArbanId_idx" ON "Zun"("founderArbanId");

-- CreateIndex
CREATE INDEX "Zun_elderSeatId_idx" ON "Zun"("elderSeatId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationalArban_arbanId_key" ON "OrganizationalArban"("arbanId");

-- CreateIndex
CREATE INDEX "OrganizationalArban_orgType_idx" ON "OrganizationalArban"("orgType");

-- CreateIndex
CREATE INDEX "OrganizationalArban_powerBranch_idx" ON "OrganizationalArban"("powerBranch");

-- CreateIndex
CREATE INDEX "OrganizationalArban_parentOrgId_idx" ON "OrganizationalArban"("parentOrgId");

-- CreateIndex
CREATE INDEX "OrganizationalArban_leaderSeatId_idx" ON "OrganizationalArban"("leaderSeatId");

-- CreateIndex
CREATE INDEX "OrgArbanMember_arbanId_idx" ON "OrgArbanMember"("arbanId");

-- CreateIndex
CREATE INDEX "OrgArbanMember_seatId_idx" ON "OrgArbanMember"("seatId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgArbanMember_arbanId_seatId_key" ON "OrgArbanMember"("arbanId", "seatId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditLine_arbanId_key" ON "CreditLine"("arbanId");

-- CreateIndex
CREATE INDEX "CreditLine_arbanId_idx" ON "CreditLine"("arbanId");

-- CreateIndex
CREATE INDEX "CreditLine_creditType_idx" ON "CreditLine"("creditType");

-- CreateIndex
CREATE INDEX "CreditLine_creditRating_idx" ON "CreditLine"("creditRating");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_loanId_key" ON "Loan"("loanId");

-- CreateIndex
CREATE INDEX "Loan_arbanId_idx" ON "Loan"("arbanId");

-- CreateIndex
CREATE INDEX "Loan_creditType_idx" ON "Loan"("creditType");

-- CreateIndex
CREATE INDEX "Loan_isActive_idx" ON "Loan"("isActive");

-- CreateIndex
CREATE INDEX "Loan_dueDate_idx" ON "Loan"("dueDate");

-- CreateIndex
CREATE INDEX "TierDistribution_seatId_idx" ON "TierDistribution"("seatId");

-- CreateIndex
CREATE INDEX "TierDistribution_tier_idx" ON "TierDistribution"("tier");

-- CreateIndex
CREATE INDEX "TierDistribution_arbanType_idx" ON "TierDistribution"("arbanType");

-- CreateIndex
CREATE INDEX "TierDistribution_arbanId_idx" ON "TierDistribution"("arbanId");

-- CreateIndex
CREATE INDEX "TierDistribution_approved_idx" ON "TierDistribution"("approved");

-- CreateIndex
CREATE INDEX "TierDistribution_rejected_idx" ON "TierDistribution"("rejected");

-- CreateIndex
CREATE INDEX "TierReceived_seatId_idx" ON "TierReceived"("seatId");

-- CreateIndex
CREATE UNIQUE INDEX "TierReceived_seatId_tier_key" ON "TierReceived"("seatId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "DigitalSeal_contractAddress_key" ON "DigitalSeal"("contractAddress");

-- CreateIndex
CREATE INDEX "DigitalSeal_signer1SeatId_idx" ON "DigitalSeal"("signer1SeatId");

-- CreateIndex
CREATE INDEX "DigitalSeal_signer2SeatId_idx" ON "DigitalSeal"("signer2SeatId");

-- CreateIndex
CREATE INDEX "DigitalSeal_executed_idx" ON "DigitalSeal"("executed");

-- CreateIndex
CREATE UNIQUE INDEX "TempleRecord_documentHash_key" ON "TempleRecord"("documentHash");

-- CreateIndex
CREATE INDEX "TempleRecord_submitterSeatId_idx" ON "TempleRecord"("submitterSeatId");

-- CreateIndex
CREATE INDEX "TempleRecord_recordType_idx" ON "TempleRecord"("recordType");

-- CreateIndex
CREATE UNIQUE INDEX "ScientistCouncilMember_seatId_key" ON "ScientistCouncilMember"("seatId");

-- CreateIndex
CREATE INDEX "ScientistCouncilMember_seatId_idx" ON "ScientistCouncilMember"("seatId");

-- CreateIndex
CREATE INDEX "ScientistCouncilMember_approved_idx" ON "ScientistCouncilMember"("approved");

-- CreateIndex
CREATE UNIQUE INDEX "WisdomCouncilMember_seatId_key" ON "WisdomCouncilMember"("seatId");

-- CreateIndex
CREATE INDEX "WisdomCouncilMember_seatId_idx" ON "WisdomCouncilMember"("seatId");

-- CreateIndex
CREATE INDEX "WisdomCouncilMember_approved_idx" ON "WisdomCouncilMember"("approved");

-- CreateIndex
CREATE UNIQUE INDEX "Patent_patentId_key" ON "Patent"("patentId");

-- CreateIndex
CREATE INDEX "Patent_submitterSeatId_idx" ON "Patent"("submitterSeatId");

-- CreateIndex
CREATE INDEX "Patent_status_idx" ON "Patent"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Discovery_discoveryId_key" ON "Discovery"("discoveryId");

-- CreateIndex
CREATE INDEX "Discovery_scientistSeatId_idx" ON "Discovery"("scientistSeatId");

-- CreateIndex
CREATE INDEX "Discovery_archived_idx" ON "Discovery"("archived");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchGrant_grantId_key" ON "ResearchGrant"("grantId");

-- CreateIndex
CREATE INDEX "ResearchGrant_scientistSeatId_idx" ON "ResearchGrant"("scientistSeatId");

-- CreateIndex
CREATE INDEX "ResearchGrant_status_idx" ON "ResearchGrant"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CouncilOfJusticeMember_memberId_key" ON "CouncilOfJusticeMember"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "CouncilOfJusticeMember_seatId_key" ON "CouncilOfJusticeMember"("seatId");

-- CreateIndex
CREATE INDEX "CouncilOfJusticeMember_seatId_idx" ON "CouncilOfJusticeMember"("seatId");

-- CreateIndex
CREATE INDEX "CouncilOfJusticeMember_approved_idx" ON "CouncilOfJusticeMember"("approved");

-- CreateIndex
CREATE UNIQUE INDEX "JudicialCase_caseId_key" ON "JudicialCase"("caseId");

-- CreateIndex
CREATE INDEX "JudicialCase_plaintiffSeatId_idx" ON "JudicialCase"("plaintiffSeatId");

-- CreateIndex
CREATE INDEX "JudicialCase_defendantSeatId_idx" ON "JudicialCase"("defendantSeatId");

-- CreateIndex
CREATE INDEX "JudicialCase_status_idx" ON "JudicialCase"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LegalPrecedent_precedentId_key" ON "LegalPrecedent"("precedentId");

-- CreateIndex
CREATE INDEX "LegalPrecedent_sourceCaseId_idx" ON "LegalPrecedent"("sourceCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "MPCWallet_userId_key" ON "MPCWallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MPCWallet_address_key" ON "MPCWallet"("address");

-- CreateIndex
CREATE INDEX "MPCWallet_address_idx" ON "MPCWallet"("address");

-- CreateIndex
CREATE INDEX "MPCWallet_status_idx" ON "MPCWallet"("status");

-- CreateIndex
CREATE INDEX "KeyShare_walletId_idx" ON "KeyShare"("walletId");

-- CreateIndex
CREATE INDEX "KeyShare_deviceId_idx" ON "KeyShare"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "KeyShare_walletId_shareType_shareIndex_key" ON "KeyShare"("walletId", "shareType", "shareIndex");

-- CreateIndex
CREATE INDEX "RecoveryGuardian_walletId_idx" ON "RecoveryGuardian"("walletId");

-- CreateIndex
CREATE INDEX "RecoveryGuardian_guardianUserId_idx" ON "RecoveryGuardian"("guardianUserId");

-- CreateIndex
CREATE UNIQUE INDEX "RecoveryGuardian_walletId_guardianRef_key" ON "RecoveryGuardian"("walletId", "guardianRef");

-- CreateIndex
CREATE INDEX "RecoverySession_walletId_idx" ON "RecoverySession"("walletId");

-- CreateIndex
CREATE INDEX "RecoverySession_status_idx" ON "RecoverySession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SmartAccount_walletId_key" ON "SmartAccount"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "SmartAccount_accountAddress_key" ON "SmartAccount"("accountAddress");

-- CreateIndex
CREATE INDEX "SmartAccount_accountAddress_idx" ON "SmartAccount"("accountAddress");

-- CreateIndex
CREATE UNIQUE INDEX "UserOperation_userOpHash_key" ON "UserOperation"("userOpHash");

-- CreateIndex
CREATE INDEX "UserOperation_accountId_idx" ON "UserOperation"("accountId");

-- CreateIndex
CREATE INDEX "UserOperation_status_idx" ON "UserOperation"("status");

-- CreateIndex
CREATE INDEX "UserOperation_userOpHash_idx" ON "UserOperation"("userOpHash");

-- CreateIndex
CREATE INDEX "UserOperation_sender_idx" ON "UserOperation"("sender");

-- AddForeignKey
ALTER TABLE "FamilyArban" ADD CONSTRAINT "FamilyArban_zunId_fkey" FOREIGN KEY ("zunId") REFERENCES "Zun"("zunId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyArbanChild" ADD CONSTRAINT "FamilyArbanChild_arbanId_fkey" FOREIGN KEY ("arbanId") REFERENCES "FamilyArban"("arbanId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationalArban" ADD CONSTRAINT "OrganizationalArban_parentOrgId_fkey" FOREIGN KEY ("parentOrgId") REFERENCES "OrganizationalArban"("arbanId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgArbanMember" ADD CONSTRAINT "OrgArbanMember_arbanId_fkey" FOREIGN KEY ("arbanId") REFERENCES "OrganizationalArban"("arbanId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_arbanId_fkey" FOREIGN KEY ("arbanId") REFERENCES "CreditLine"("arbanId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MPCWallet" ADD CONSTRAINT "MPCWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeyShare" ADD CONSTRAINT "KeyShare_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "MPCWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecoveryGuardian" ADD CONSTRAINT "RecoveryGuardian_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "MPCWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartAccount" ADD CONSTRAINT "SmartAccount_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "MPCWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOperation" ADD CONSTRAINT "UserOperation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SmartAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
