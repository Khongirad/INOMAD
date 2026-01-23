-- AlterTable: Add bankRef columns and memo to AltanTransaction
ALTER TABLE "AltanTransaction" ADD COLUMN "fromBankRef" TEXT;
ALTER TABLE "AltanTransaction" ADD COLUMN "toBankRef" TEXT;
ALTER TABLE "AltanTransaction" ADD COLUMN "memo" TEXT;

-- CreateIndex
CREATE INDEX "AltanTransaction_fromBankRef_idx" ON "AltanTransaction"("fromBankRef");
CREATE INDEX "AltanTransaction_toBankRef_idx" ON "AltanTransaction"("toBankRef");
