-- Create Siberian Pension Fund system account
-- This account funds Level 1-3 allocations for verified citizens

-- Insert Pension Fund system user
INSERT INTO "User" (
  id,
  email,
  username,
  "displayName",
  "seatId",
  "walletAddress",
  "verificationStatus",
  "walletStatus",
  "hasAcceptedTOS",
  "hasAcceptedConstitution",
  status,
  "createdAt",
  "updatedAt"
) VALUES (
  'PENSION-FUND-SYSTEM-001',
  'pension@system.khural',
  'PENSION_FUND_SYSTEM',
  'Siberian Pension Fund',
  'SYSTEM-PENSION',
  '0x0000000000000000000000000000000000000001', -- System address
  'VERIFIED',
  'UNLOCKED',
  true,
  true,
  'LEGAL_SUBJECT',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  username = EXCLUDED.username;

-- Create BankLink for Pension Fund
INSERT INTO "BankLink" (
  id,
  "userId",
  "bankRef",
  "bankCode",
  status,
  "createdAt"
) VALUES (
  'BL-PENSION-FUND-001',
  'PENSION-FUND-SYSTEM-001',
  'BANK-SPF-SIBERIA',
  'BOS',
  'ACTIVE',
  NOW()
) ON CONFLICT ("userId") DO NOTHING;

-- Initialize ledger with 2.1 trillion ALTAN
-- Source: Central Bank emission to Pension Fund
INSERT INTO "AltanLedger" (
  "userId",
  balance,
  "createdAt",
  "updatedAt"
) VALUES (
  'PENSION-FUND-SYSTEM-001',
  2100000000000, -- 2.1 trillion ALTAN
  NOW(),
  NOW()
) ON CONFLICT ("userId") DO UPDATE SET
  balance = EXCLUDED.balance,
  "updatedAt" = NOW();

-- Record CB emission transaction
INSERT INTO "AltanTransaction" (
  id,
  "fromUserId",
  "toUserId",
  "fromBankRef",
  "toBankRef",
  amount,
  type,
  status,
  memo,
  "createdAt"
) VALUES (
  gen_random_uuid(),
  NULL, -- Central Bank (no userId)
  'PENSION-FUND-SYSTEM-001',
  'CB-EMISSION',
  'BANK-SPF-SIBERIA',
  2100000000000,
  'EMISSION',
  'COMPLETED',
  'Initial emission: 2.1 trillion ALTAN to Siberian Pension Fund for citizen distribution',
  NOW()
) ON CONFLICT DO NOTHING;
