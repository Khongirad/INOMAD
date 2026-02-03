import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Creator Account Seed Script
 * 
 * Creates the supreme Creator account with full administrative privileges.
 * Run this script ONCE to initialize the Creator account.
 * 
 * Usage:
 *   npx ts-node prisma/seed-creator.ts
 */

async function main() {
  console.log('🌟 Creating Creator Account...\n');

  // Generate a random seatId for Creator
  const creatorSeatId = `CREATOR-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  
  // Check if Creator already exists
  const existingCreator = await prisma.user.findFirst({
    where: { role: 'CREATOR' },
  });

  if (existingCreator) {
    console.log('⚠️  Creator account already exists!');
    console.log(`SeatID: ${existingCreator.seatId}`);
    console.log('\nIf you want to reset the Creator account, please delete it manually first.');
    return;
  }

  // Create Creator account
  const creator = await prisma.user.create({
    data: {
      seatId: creatorSeatId,
      role: 'CREATOR',
      verificationStatus: 'VERIFIED',
      isSuperVerified: true,
      walletStatus: 'UNLOCKED',
      isFrozen: false,
      ethnicity: ['CREATOR'],
      clan: 'KHURAL_ADMIN',
      birthPlace: {
        region: 'SYSTEM',
        city: 'ALTAN',
      },
      currentAddress: {
        region: 'SYSTEM',
        city: 'ALTAN',
      },
    },
  });

  console.log('✅ Creator Account Created Successfully!\n');
  console.log('═══════════════════════════════════════');
  console.log('CREATOR CREDENTIALS:');
  console.log('═══════════════════════════════════════');
  console.log(`SeatID: ${creator.seatId}`);
  console.log(`User ID: ${creator.id}`);
  console.log(`Role: ${creator.role}`);
  console.log(`Status: ${creator.verificationStatus}`);
  console.log('═══════════════════════════════════════\n');

  console.log('📝 IMPORTANT NOTES:');
  console.log('1. Save the SeatID - you\'ll need it to login');
  console.log('2. You must create an MPC wallet for this account');
  console.log('3. The Creator account cannot be frozen or deleted');
  console.log('4. You can create up to 9 ADMIN accounts\n');

  console.log('🔐 Next Steps:');
  console.log('1. Navigate to /wallet to create Creator MPC wallet');
  console.log('2. Login with the SeatID above');
  console.log('3. Access /creator/admins to manage admin accounts');
  console.log('4. Access /admin to verify users\n');
}

main()
  .catch((e) => {
    console.error('❌ Error creating Creator account:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
