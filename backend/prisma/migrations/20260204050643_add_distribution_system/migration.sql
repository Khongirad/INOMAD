-- CreateTable
CREATE TABLE "DistributionPool" (
    "id" TEXT NOT NULL,
    "totalEmission" DECIMAL(20,2) NOT NULL,
    "citizenPool" DECIMAL(20,2) NOT NULL,
    "stateTreasury" DECIMAL(20,2) NOT NULL,
    "peoplesFund" DECIMAL(20,2) NOT NULL,
    "totalDistributed" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "totalCitizens" INTEGER NOT NULL DEFAULT 0,
    "perCitizenShare" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "emissionDate" TIMESTAMP(3) NOT NULL,
    "emissionTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributionPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDistribution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalAllocation" DECIMAL(18,2) NOT NULL,
    "unverifiedReceived" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "arbanVerifiedReceived" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "zunReceived" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "fullyReceived" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalReceived" DECIMAL(18,2) NOT NULL,
    "remainingBalance" DECIMAL(18,2) NOT NULL,
    "firstDistributionAt" TIMESTAMP(3),
    "lastDistributionAt" TIMESTAMP(3),
    "fullyDistributedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DistributionPool_status_idx" ON "DistributionPool"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UserDistribution_userId_key" ON "UserDistribution"("userId");

-- CreateIndex
CREATE INDEX "UserDistribution_userId_idx" ON "UserDistribution"("userId");

-- CreateIndex
CREATE INDEX "UserDistribution_fullyDistributedAt_idx" ON "UserDistribution"("fullyDistributedAt");

-- AddForeignKey
ALTER TABLE "UserDistribution" ADD CONSTRAINT "UserDistribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
