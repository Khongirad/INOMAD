-- CreateEnum
CREATE TYPE "OrgArbanType" AS ENUM ('NONE', 'EXECUTIVE', 'JUDICIAL', 'BANKING', 'PRIVATE_COMPANY', 'STATE_COMPANY', 'GUILD', 'SCIENTIFIC_COUNCIL', 'EKHE_KHURAL');

-- CreateEnum
CREATE TYPE "PowerBranchType" AS ENUM ('NONE', 'LEGISLATIVE', 'EXECUTIVE', 'JUDICIAL', 'BANKING');

-- CreateEnum
CREATE TYPE "CreditLineType" AS ENUM ('NONE', 'FAMILY', 'ORG');

-- CreateEnum
CREATE TYPE "TierArbanType" AS ENUM ('NONE', 'FAMILY', 'ORG');

-- CreateTable
CREATE TABLE "FamilyArban" (
    "id" TEXT NOT NULL,
    "arbanId" BIGINT NOT NULL,
    "husbandSeatId" BIGINT NOT NULL,
    "wifeSeatId" BIGINT NOT NULL,
    "heirSeatId" BIGINT,
    "zunId" BIGINT,
    "khuralRepSeatId" BIGINT,
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
    "childSeatId" BIGINT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyArbanChild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zun" (
    "id" TEXT NOT NULL,
    "zunId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "founderArbanId" BIGINT NOT NULL,
    "elderSeatId" BIGINT,
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
    "leaderSeatId" BIGINT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationalArban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgArbanMember" (
    "id" TEXT NOT NULL,
    "arbanId" BIGINT NOT NULL,
    "seatId" BIGINT NOT NULL,
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
    "seatId" BIGINT NOT NULL,
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
    "seatId" BIGINT NOT NULL,
    "tier" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DECIMAL(18,6) NOT NULL,
    "txHash" TEXT,

    CONSTRAINT "TierReceived_pkey" PRIMARY KEY ("id")
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
