import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Creator Account Seed Script
 *
 * Creates the supreme Creator account — Citizen #0000000000001.
 * Bair Ivanov (Баир Иванов), born 1991, Kizhinga, Republic of Buryatia.
 * Clan: Khongirad. First verifier and root of the trust chain.
 *
 * Usage:
 *   npx ts-node prisma/seed-creator.ts
 */

async function main() {
  console.log('🌟 Creating Creator — First Citizen of INOMAD KHURAL...\n');

  // Check if Creator already exists
  const existingCreator = await prisma.user.findFirst({
    where: { role: 'CREATOR' },
  });

  if (existingCreator) {
    console.log('⚠️  Creator account already exists!');
    console.log(`SeatID: ${existingCreator.seatId}`);
    console.log(`Citizen #: ${existingCreator.citizenNumber}`);
    console.log(`Username: ${existingCreator.username}`);
    console.log('\nTo reset, delete the Creator account manually first.');
    return;
  }

  // Hash default password (should be changed on first login)
  const passwordHash = await bcrypt.hash('Khural2026!', 12);

  // Create Creator account — Citizen #0000000000001
  const creator = await prisma.user.create({
    data: {
      seatId: 'SEAT-00001',
      citizenNumber: '0000000000001',
      username: 'khongirad',
      passwordHash,
      role: 'CREATOR',

      // Legal status — Creator is automatically a legal subject
      hasAcceptedTOS: true,
      tosAcceptedAt: new Date(),
      hasAcceptedConstitution: true,
      constitutionAcceptedAt: new Date(),
      isLegalSubject: true,

      // Verification — Creator is the root of the trust chain
      verificationStatus: 'VERIFIED',
      isVerified: true,
      verifiedAt: new Date(),
      isSuperVerified: true,

      // Profile — Bair Ivanov
      dateOfBirth: new Date('1991-01-01'),
      gender: 'MALE',
      nationality: 'Buryad-Mongol',
      ethnicity: ['Buryad-Mongol'],
      clan: 'Khongirad',
      language: 'Buryad',
      birthPlace: {
        country: 'USSR',
        district: 'Kizhinginsky District, Republic of Buryatia',
        city: 'Kizhinga',
      },

      // System
      walletStatus: 'UNLOCKED',
      isFrozen: false,

      // Citizen type
      citizenType: 'INDIGENOUS',
      verificationCount: 0,
      maxVerifications: 999, // Creator has unlimited verifications
    },
  });

  console.log('✅ Creator Account — Citizen #1 Created!\n');
  console.log('═══════════════════════════════════════════════');
  console.log('   FIRST CITIZEN OF INOMAD KHURAL');
  console.log('═══════════════════════════════════════════════');
  console.log(`   Citizen Number : ${creator.citizenNumber}`);
  console.log(`   SeatID         : ${creator.seatId}`);
  console.log(`   Username       : ${creator.username}`);
  console.log(`   User ID        : ${creator.id}`);
  console.log(`   Role           : ${creator.role}`);
  console.log(`   Clan           : Khongirad`);
  console.log(`   Birthplace     : Kizhinga, Republic of Buryatia, USSR`);
  console.log('═══════════════════════════════════════════════\n');

  console.log('🔐 Default password: Khural2026!');
  console.log('   ⚠️  Change this immediately after first login!\n');

  console.log('📝 The Creator is:');
  console.log('   • The root of the verification chain');
  console.log('   • The first verifier (поручитель) for all initial citizens');
  console.log('   • Supreme administrator with unlimited verification quota');
}

main()
  .catch((e) => {
    console.error('❌ Error creating Creator account:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
