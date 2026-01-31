const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestUsers() {
  console.log('Creating test users for Arban System...\n');

  try {
    //  User 1
    const user1 = await prisma.user.upsert({
      where: { seatId: 'SEAT-001' },
      update: {},
      create: {
        seatId: 'SEAT-001',
        role: 'CITIZEN',
        walletStatus: 'UNLOCKED',
        verificationStatus: 'VERIFIED',
        isSuperVerified: true,
        walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        ethnicity: ['Buryat'],
        clan: 'Khongir',
      },
    });
    console.log('✅ Created user 1:', user1.seatId, user1.walletAddress);

    // User 2
    const user2 = await prisma.user.upsert({
      where: { seatId: 'SEAT-002' },
      update: {},
      create: {
        seatId: 'SEAT-002',
        role: 'CITIZEN',
        walletStatus: 'UNLOCKED',
        verificationStatus: 'VERIFIED',
        isSuperVerified: true,
        walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        ethnicity: ['Buryat'],
        clan: 'Khongir',
      },
    });
    console.log('✅ Created user 2:', user2.seatId, user2.walletAddress);

    console.log('\n✅ Test users created successfully!');
  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
