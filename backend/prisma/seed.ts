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
  const arban = await prisma.khuralGroup.create({
    data: {
      level: 'ARBAN',
      name: 'Test Arban Unit 1',
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
  const ledger1 = await prisma.altanLedger.create({
    data: {
      userId: user1.id,
      balance: 1000,
    },
  });

  const ledger2 = await prisma.altanLedger.create({
    data: {
      userId: user2.id,
      balance: 500,
    },
  });

  const ledger3 = await prisma.altanLedger.create({
    data: {
      userId: user3.id,
      balance: 100,
    },
  });

  console.log('✅ Created ALTAN ledgers');

  // Create BankLinks (opaque pointers from identity to banking domain)
  // bankRef = ledger.id — only the banking module can resolve this
  await prisma.bankLink.upsert({
    where: { userId: user1.id },
    update: {},
    create: {
      userId: user1.id,
      bankCode: 'BANK_OF_SIBERIA',
      bankRef: ledger1.id,
    },
  });

  await prisma.bankLink.upsert({
    where: { userId: user2.id },
    update: {},
    create: {
      userId: user2.id,
      bankCode: 'BANK_OF_SIBERIA',
      bankRef: ledger2.id,
    },
  });

  await prisma.bankLink.upsert({
    where: { userId: user3.id },
    update: {},
    create: {
      userId: user3.id,
      bankCode: 'BANK_OF_SIBERIA',
      bankRef: ledger3.id,
    },
  });

  console.log('✅ Created BankLinks (opaque pointers)');

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

  // ============================
  // CENTRAL BANK SEED DATA
  // ============================

  // Create Central Bank Governor (first wallet)
  // Use a test wallet address — in production, this would be the actual governor's wallet
  const governorAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const boardMemberAddress = '0xabcdef1234567890abcdef1234567890abcdef12';

  const governor = await prisma.centralBankOfficer.upsert({
    where: { walletAddress: governorAddress },
    update: {},
    create: {
      walletAddress: governorAddress,
      role: 'GOVERNOR',
      name: 'Governor of Central Bank',
      isActive: true,
    },
  });

  const boardMember = await prisma.centralBankOfficer.upsert({
    where: { walletAddress: boardMemberAddress },
    update: {},
    create: {
      walletAddress: boardMemberAddress,
      role: 'BOARD_MEMBER',
      name: 'Board Member #1',
      isActive: true,
    },
  });

  console.log('✅ Created Central Bank officers');

  // Create Bank of Siberia license
  // Bank address should match the existing Bank of Siberia setup
  const bankOfSiberiaAddress = '0x9876543210fedcba9876543210fedcba98765432';

  const bankLicense = await prisma.centralBankLicense.upsert({
    where: { bankCode: 'SIB001' },
    update: {},
    create: {
      bankAddress: bankOfSiberiaAddress,
      bankCode: 'SIB001',
      bankName: 'Bank of Siberia',
      status: 'ACTIVE',
      issuedById: governor.id,
    },
  });

  console.log('✅ Created Bank of Siberia license');

  // Create correspondent account for Bank of Siberia
  const corrAccount = await prisma.corrAccount.upsert({
    where: { licenseId: bankLicense.id },
    update: {},
    create: {
      licenseId: bankLicense.id,
      accountRef: `CORR:SIB001:${bankLicense.id.substring(0, 8)}`,
      balance: 0, // Start with zero, Governor will mint initial supply
    },
  });

  console.log('✅ Created correspondent account for Bank of Siberia');

  // Create initial monetary policy
  const existingPolicy = await prisma.monetaryPolicy.findFirst({
    where: { isActive: true },
  });

  if (!existingPolicy) {
    await prisma.monetaryPolicy.create({
      data: {
        officialRate: 1.0, // 1 ALT = 1 USD peg initially
        reserveRequirement: 0.10, // 10% reserve requirement
        dailyEmissionLimit: 10000000, // 10 million ALTAN daily limit
        isActive: true,
        effectiveFrom: new Date(),
      },
    });
    console.log('✅ Created initial monetary policy');
  } else {
    console.log('✅ Monetary policy already exists');
  }

  // Seed initial emission to Bank of Siberia (initial liquidity)
  const existingEmission = await prisma.emissionRecord.findFirst({
    where: { corrAccountId: corrAccount.id },
  });

  if (!existingEmission) {
    const initialEmission = 1000000; // 1 million ALTAN initial supply

    await prisma.$transaction(async (tx) => {
      // Update corr account balance
      await tx.corrAccount.update({
        where: { id: corrAccount.id },
        data: { balance: { increment: initialEmission } },
      });

      // Create emission record
      await tx.emissionRecord.create({
        data: {
          type: 'MINT',
          amount: initialEmission,
          reason: 'Initial liquidity provision for Bank of Siberia',
          memo: 'Genesis emission — Central Bank seed data',
          corrAccountId: corrAccount.id,
          authorizedById: governor.id,
          status: 'COMPLETED',
        },
      });

      // Create ALTAN transaction record
      await tx.altanTransaction.create({
        data: {
          amount: initialEmission,
          type: 'MINT',
          status: 'COMPLETED',
          memo: 'Initial liquidity provision for Bank of Siberia',
          toBankRef: corrAccount.accountRef,
        },
      });
    });

    console.log(`✅ Minted initial ${initialEmission.toLocaleString()} ALTAN to Bank of Siberia`);
  } else {
    console.log('✅ Initial emission already exists');
  }

  // ============================
  // GUILD PLATFORM SEED DATA (Education, Elections, Invitations)
  // ============================


  // Create sample Education Certification
  // Disabled: EducationRecord model not in schema
  /*
  try {
    await prisma.educationRecord.create({
      data: {
        guildId: architectGuild.id,
        userId: user3.id,
        programName: 'Master Architect Certification',
        creditsEarned: 120,
        certificateIssued: true,
        completedAt: new Date(),
      },
    });
    console.log('✅ Education records seeded');
  } catch (error) {
    console.log('⚠️  Education model not in schema, skipping');
  }
  */

  // Create sample Election
  // Disabled: Election schema doesn't have guildId field, ElectionCandidate doesn't have userId
  /*
  try {
    const guildElection = await prisma.election.create({
      data: {
        guildId: architectGuild.id,
        electionType: 'LEADER',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        status: 'ACTIVE',
        description: 'Annual guild leader election',
      },
    });

    await prisma.electionCandidate.create({
      data: {
        electionId: guildElection.id,
        userId: user1.id,
        statement: 'Leading with innovation and integrity',
        voteCount: 0,
      },
    });

    await prisma.electionCandidate.create({
      data: {
        electionId: guildElection.id,
        userId: user2.id,
        statement: 'Building stronger communities together',
        voteCount: 0,
      },
    });

    console.log('✅ Created sample guild election with candidates');
  } catch (error) {
    console.log('⚠️  Election models not properly set up, skipping');
  }
  */

  // Create sample Guild Invitations
  // Disabled: Invitation model not in schema
  /*
  try {
    await prisma.invitation.create({
      data: {
        guildId: buildersGuild.id,
        invitedUserId: user3.id,
        invitedByUserId: user2.id,
        message: 'Join our guild and help build the future!',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });
    console.log('✅ Guild invitations seeded');
  } catch (error) {
    console.log('⚠️  Invitation model not properly set up, skipping');
  }
  */

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
