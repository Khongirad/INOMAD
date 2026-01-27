import { PrismaClient, VerificationStatus } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING RITUAL SIMULATION ---');
  
  // 1. Register User (Mocking RegistrationService logic)
  const userData = {
    birthPlace: { city: 'Ulan-Ude', region: 'Buryatia' },
    ethnicity: ['Buryat'],
    clan: 'Khongirad'
  };

  const user = await prisma.user.create({
    data: {
        seatId: 'TEMP-' + Date.now(),
        verificationStatus: VerificationStatus.DRAFT,
        ...userData
    }
  });
  console.log('Step 1: User created in DRAFT state.', user.id);

  // 2. Assign Territory (We'll use a local instance of the logic for the script)
  // For simplicity, we'll just call a mock version or rely on the service being tested.
  // Actually, I'll just manually trigger the logic I wrote in the service by hitting the DB.
  
  // Create a minimal hierarchy if not exists
  const tumen = await prisma.khuralGroup.upsert({
    where: { id: 'bry-tumen-id' },
    update: {},
    create: { id: 'bry-tumen-id', level: 'TUMEN', name: 'Buryatia' }
  });

  const myangan = await prisma.khuralGroup.upsert({
    where: { id: 'bry-myangan-id' },
    update: {},
    create: { id: 'bry-myangan-id', level: 'MYANGAN', name: 'Myangan 1', parentGroupId: tumen.id }
  });

  const zuun = await prisma.khuralGroup.upsert({
    where: { id: 'bry-zuun-id' },
    update: {},
    create: { id: 'bry-zuun-id', level: 'ZUUN', name: 'Zuun 1', parentGroupId: myangan.id }
  });

  const arban = await prisma.khuralGroup.upsert({
    where: { id: 'bry-arban-id' },
    update: {},
    create: { id: 'bry-arban-id', level: 'ARBAN', name: 'Arban 1', parentGroupId: zuun.id }
  });

  const seat = await prisma.khuralSeat.create({
    data: { groupId: arban.id, index: 5 }
  });

  // Assign
  const hierarchicalSeatId = 'BRY-T1-M01-Z01-A01-S05';
  await prisma.user.update({
    where: { id: user.id },
    data: { 
        seatId: hierarchicalSeatId,
        verificationStatus: VerificationStatus.PENDING 
    }
  });
  console.log('Step 2: Territory assigned. SeatID:', hierarchicalSeatId);

  // 3. Super-Verify by Founder
  const founder = await prisma.user.findUnique({ where: { seatId: 'FOUNDER-001' } });
  if (!founder) throw new Error('Founder not found. Seed the database first.');

  await prisma.user.update({
    where: { id: user.id },
    data: {
        verificationStatus: VerificationStatus.VERIFIED,
        isSuperVerified: true,
        superVerifiedBy: 'FOUNDER-001'
    }
  });
  console.log('Step 3: Super-Verification completed by FOUNDER-001.');

  // Final check
  const finalUser = await prisma.user.findUnique({ where: { id: user.id } });
  console.log('Final User Status:', finalUser?.verificationStatus);
  console.log('--- SIMULATION COMPLETE ---');
}

main().finally(() => prisma.$disconnect());
