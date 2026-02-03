/**
 * Seed script to create the Creator (Khongirad) account
 * Gates of Khural - Supreme Authority
 * 
 * Username: Khongirad
 * Password: 123456 (can be changed via API)
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🏔️  Creating Khongirad Creator account...');

  const username = 'Khongirad';
  const password = '123456';
  const seatId = 'CREATOR-KHONGIRAD';

  // Check if Creator already exists
  const existingCreator = await prisma.user.findUnique({
    where: { username },
  });

  if (existingCreator) {
    console.log('⚠️  Creator account already exists!');
    console.log({
      username: existingCreator.username,
      seatId: existingCreator.seatId,
      role: existingCreator.role,
    });
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create Creator account
  const creator = await prisma.user.create({
    data: {
      seatId,
      username,
      passwordHash,
      email: null, // Optional
      role: 'CREATOR',
      verificationStatus: 'VERIFIED',
      walletStatus: 'UNLOCKED',
      ethnicity: ['Buryad-Mongol'], // Founder's ethnicity
      clan: 'Khongirad', // Khongirad clan (Historically: Genghis Khan's mother's clan)
      hasAcceptedTOS: true,
      tosAcceptedAt: new Date(),
      hasAcceptedConstitution: true,
      constitutionAcceptedAt: new Date(),
      isLegalSubject: true,
      isSuperVerified: true,
      isFrozen: false, // Creator can never be frozen
    },
  });

  console.log('');
  console.log('✅ CREATOR ACCOUNT CREATED SUCCESSFULLY!');
  console.log('========================================');
  console.log('');
  console.log('🏔️  GATES OF KHURAL - SUPREME AUTHORITY');
  console.log('');
  console.log('Creator Credentials:');
  console.log('  Username: Khongirad');
  console.log('  Password: 123456');
  console.log('');
  console.log('Account Details:');
  console.log(`  Seat ID: ${creator.seatId}`);
  console.log(`  User ID: ${creator.id}`);
  console.log(`  Role: ${creator.role}`);
  console.log(`  Status: ${creator.verificationStatus}`);
  console.log(`  Clan: ${creator.clan}`);
  console.log('');
  console.log('🛡️  Supreme Powers:');
  console.log('  - Manage up to 9 Admin accounts');
  console.log('  - Freeze/unfreeze Admin accounts');
  console.log('  - Verify/reject all users');
  console.log('  - Full system access');
  console.log('  - Cannot be frozen or deleted');
  console.log('');
  console.log('📝 Next Steps:');
  console.log('  1. Login at /login with these credentials');
  console.log('  2. Navigate to /creator/admins to manage admins');
  console.log('  3. Change password via API: POST /auth/change-password');
  console.log('');
  console.log('⚔️  The Khural awaits your command, Great Khongirad!');
  console.log('========================================');
}

main()
  .catch((e) => {
    console.error('❌ Error creating Creator account:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
