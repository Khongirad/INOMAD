import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createPensionFund() {
  console.log('Creating Siberian Pension Fund system account...');

  try {
    // Create Pension Fund user
    const pensionFundUser = await prisma.user.upsert({
      where: { email: 'pension@system.khural' },
      update: {
        username: 'PENSION_FUND_SYSTEM',
      },
      create: {
        id: 'PENSION-FUND-SYSTEM-001',
        email: 'pension@system.khural',
        username: 'PENSION_FUND_SYSTEM',
        seatId: 'SYSTEM-PENSION',
        walletAddress: '0x0000000000000000000000000000000000000001', // System address
        verificationStatus: 'VERIFIED',
        walletStatus: 'UNLOCKED',
        hasAcceptedTOS: true,
        hasAcceptedConstitution: true,
        // status field doesn't exist in User model
      },
    });

    console.log(`✓ Pension Fund user: ${pensionFundUser.id}`);

    // Create BankLink
    const bankLink = await prisma.bankLink.upsert({
      where: { userId: pensionFundUser.id},
      update: {},
      create: {
        userId: pensionFundUser.id,
        bankRef: 'BANK-SPF-SIBERIA',
        bankCode: 'BOS',
        status: 'ACTIVE',
      },
    });

    console.log(`✓ BankLink created: ${bankLink.bankRef}`);

    // Initialize ledger with funds for testing
    // Note: Full 2.1T requires higher precision. Using 100M for initial testing.
    // This is enough for ~1M citizens @ 100 ALTAN each
    const TESTING_BALANCE = 100000000; // 100 million ALTAN
    
    const ledger = await prisma.altanLedger.upsert({
      where: { userId: pensionFundUser.id },
      update: {
        balance: TESTING_BALANCE,
      },
      create: {
        userId: pensionFundUser.id,
        balance: TESTING_BALANCE,
      },
    });

    console.log(`✓ Ledger initialized: ${ledger.balance} ALTAN`);

    // Record CB emission transaction
    const emission = await prisma.altanTransaction.create({
      data: {
        fromUserId: null, // Central Bank (no userId)
        toUserId: pensionFundUser.id,
        fromBankRef: 'CB-EMISSION',
        toBankRef: 'BANK-SPF-SIBERIA',
        amount: TESTING_BALANCE,
        type: 'TRANSFER', // Using TRANSFER instead of EMISSION
        status: 'COMPLETED',
        memo: `Initial testing emission: ${TESTING_BALANCE.toLocaleString()} ALTAN to Siberian Pension Fund`,
      },
    });

    console.log(`✓ Emission transaction: ${emission.id}`);

    console.log('\n========================================');
    console.log('✅ Pension Fund Setup Complete');
    console.log('========================================');
    console.log(`User ID: ${pensionFundUser.id}`);
    console.log(`Seat ID: ${pensionFundUser.seatId}`);
    console.log(`Bank Ref: ${bankLink.bankRef}`);
    console.log(`Balance: ${ledger.balance.toLocaleString()} ALTAN (testing funds)`);
    console.log(`Note: Full 2.1T requires database migration for higher precision`);
    console.log('========================================\n');

    return pensionFundUser;
  } catch (error) {
    console.error('Error creating Pension Fund:', error);
    throw error;
  }
}

async function main() {
  try {
    await createPensionFund();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
