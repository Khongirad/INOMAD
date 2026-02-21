import { PrismaClient, VerificationStatus, WalletStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create Founder
  const founder = await prisma.user.upsert({
    where: { seatId: 'FOUNDER-001' },
    update: { 
      verificationStatus: VerificationStatus.VERIFIED,
      walletStatus: WalletStatus.UNLOCKED 
    },
    create: {
      id: 'founder-uuid',
      seatId: 'FOUNDER-001',
      role: 'ADMIN',
      verificationStatus: VerificationStatus.VERIFIED,
      walletStatus: WalletStatus.UNLOCKED,
      ethnicity: ['Buryat'],
      clan: 'Khongirad',
      isSuperVerified: true,
    },
  });

  console.log('✅ Founder created/updated:', founder.seatId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
