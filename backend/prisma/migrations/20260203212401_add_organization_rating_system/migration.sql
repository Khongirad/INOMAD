-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('GUILD', 'COMMITTEE', 'SERVICE', 'ARBAN', 'HUNDRED', 'THOUSAND', 'REPUBLIC', 'CONFEDERATION');

-- CreateEnum
CREATE TYPE "BranchType" AS ENUM ('LEGISLATIVE', 'EXECUTIVE', 'JUSTICE', 'BANKING', 'CIVIL_SERVICE');

-- CreateEnum
CREATE TYPE "RatingCategory" AS ENUM ('TRUST', 'QUALITY', 'FINANCIAL', 'LEADERSHIP', 'INNOVATION');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "branch" "BranchType",
    "description" TEXT,
    "parentId" TEXT,
    "level" INTEGER NOT NULL,
    "republicId" TEXT,
    "republic" TEXT,
    "leaderId" TEXT NOT NULL,
    "minMembers" INTEGER NOT NULL DEFAULT 10,
    "maxMembers" INTEGER NOT NULL DEFAULT 10,
    "treasury" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalEarned" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "trustScore" DECIMAL(65,30) NOT NULL DEFAULT 5.0,
    "qualityScore" DECIMAL(65,30) NOT NULL DEFAULT 5.0,
    "financialScore" DECIMAL(65,30) NOT NULL DEFAULT 5.0,
    "overallRating" DECIMAL(65,30) NOT NULL DEFAULT 5.0,
    "contractsCompleted" INTEGER NOT NULL DEFAULT 0,
    "contractsActive" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currentRank" INTEGER,
    "previousRank" INTEGER,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "contributionScore" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationRating" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "category" "RatingCategory" NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "contractId" TEXT,

    CONSTRAINT "OrganizationRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationAchievement" (
    "id" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rank" INTEGER,
    "rewardAltan" DECIMAL(65,30),
    "badge" TEXT,

    CONSTRAINT "OrganizationAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArbanNetwork" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "arbanId" TEXT NOT NULL,
    "positionX" DOUBLE PRECISION NOT NULL,
    "positionY" DOUBLE PRECISION NOT NULL,
    "layer" INTEGER NOT NULL,
    "connectedTo" TEXT[],
    "clusterColor" TEXT,
    "importance" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArbanNetwork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_type_overallRating_idx" ON "Organization"("type", "overallRating");

-- CreateIndex
CREATE INDEX "Organization_republicId_idx" ON "Organization"("republicId");

-- CreateIndex
CREATE INDEX "Organization_currentRank_idx" ON "Organization"("currentRank");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "OrganizationRating_organizationId_category_idx" ON "OrganizationRating"("organizationId", "category");

-- CreateIndex
CREATE INDEX "OrganizationRating_raterId_idx" ON "OrganizationRating"("raterId");

-- CreateIndex
CREATE INDEX "OrganizationAchievement_organizationId_idx" ON "OrganizationAchievement"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "ArbanNetwork_arbanId_key" ON "ArbanNetwork"("arbanId");

-- CreateIndex
CREATE INDEX "ArbanNetwork_layer_idx" ON "ArbanNetwork"("layer");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRating" ADD CONSTRAINT "OrganizationRating_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationRating" ADD CONSTRAINT "OrganizationRating_raterId_fkey" FOREIGN KEY ("raterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAchievement" ADD CONSTRAINT "OrganizationAchievement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArbanNetwork" ADD CONSTRAINT "ArbanNetwork_arbanId_fkey" FOREIGN KEY ("arbanId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
