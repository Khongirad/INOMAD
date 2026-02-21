import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test users
  const user1 = await prisma.user.upsert({
    where: { seatId: 'SEAT_001' },
    update: {},
    create: {
      seatId: 'SEAT_001',
      role: 'LEADER',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { seatId: 'SEAT_002' },
    update: {},
    create: {
      seatId: 'SEAT_002',
      role: 'CITIZEN',
    },
  });

  const user3 = await prisma.user.upsert({
    where: { seatId: 'SEAT_003' },
    update: {},
    create: {
      seatId: 'SEAT_003',
      role: 'CITIZEN',
    },
  });

  console.log('✅ Created test users');

  // Create professions
  const architect = await prisma.profession.upsert({
    where: { name: 'Architect' },
    update: {},
    create: {
      name: 'Architect',
      description: 'Designs and plans structures and systems',
    },
  });

  const builder = await prisma.profession.upsert({
    where: { name: 'Builder' },
    update: {},
    create: {
      name: 'Builder',
      description: 'Constructs and builds physical infrastructure',
    },
  });

  const healer = await prisma.profession.upsert({
    where: { name: 'Healer' },
    update: {},
    create: {
      name: 'Healer',
      description: 'Provides medical care and healing services',
    },
  });

  const notary = await prisma.profession.upsert({
    where: { name: 'Notary' },
    update: {},
    create: {
      name: 'Notary',
      description: 'Certifies documents and legal agreements',
    },
  });

  console.log('✅ Created professions');

  // Create Khural groups
  const arbad = await prisma.khuralGroup.create({
    data: {
      level: 'ARBAD',
      name: 'Test Arbad Unit 1',
      seats: {
        create: Array.from({ length: 10 }, (_, i) => ({
          index: i,
          isLeaderSeat: i === 0,
          occupantUserId: i === 0 ? user1.id : i === 1 ? user2.id : undefined,
        })),
      },
    },
  });

  console.log('✅ Created Khural group with seats');

  // Create profession guilds
  const architectGuild = await prisma.guild.create({
    data: {
      type: 'PROFESSION',
      name: 'Architects Guild',
      description: 'Professional association of architects',
      professionId: architect.id,
      members: {
        create: [
          {
            userId: user1.id,
            role: 'LEADER',
            professionRank: 5,
          },
        ],
      },
    },
  });

  const buildersGuild = await prisma.guild.create({
    data: {
      type: 'PROFESSION',
      name: 'Builders Guild',
      description: 'Professional association of builders',
      professionId: builder.id,
      members: {
        create: [
          {
            userId: user2.id,
            role: 'MEMBER',
            professionRank: 2,
          },
        ],
      },
    },
  });

  console.log('✅ Created profession guilds');

  // Create ALTAN ledgers
  await prisma.altanLedger.create({
    data: {
      userId: user1.id,
      balance: 1000,
    },
  });

  await prisma.altanLedger.create({
    data: {
      userId: user2.id,
      balance: 500,
    },
  });

  await prisma.altanLedger.create({
    data: {
      userId: user3.id,
      balance: 100,
    },
  });

  console.log('✅ Created ALTAN ledgers');

  // Create sample tasks
  await prisma.task.create({
    data: {
      title: 'Design new community center',
      description: 'Create architectural plans for a 500-person community center',
      professionId: architect.id,
      rewardAltan: 250,
      status: 'OPEN',
      createdByUserId: user1.id,
      postedByGuildId: architectGuild.id,
    },
  });

  await prisma.task.create({
    data: {
      title: 'Build irrigation system',
      description: 'Construct water distribution system for agricultural zone',
      professionId: builder.id,
      rewardAltan: 500,
      status: 'OPEN',
      createdByUserId: user1.id,
      postedByGuildId: buildersGuild.id,
    },
  });

  console.log('✅ Created sample tasks');

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
