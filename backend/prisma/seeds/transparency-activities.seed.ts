import { PrismaClient, PowerBranchType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Sample transparency activities to demonstrate the system
 * These represent real government actions that would be logged
 */
async function seedTransparencyActivities() {
  console.log('🌱 Seeding sample transparency activities...');
  
  // First, get the test user we created
  const testUser = await prisma.user.findFirst({
    where: { username: 'test_citizen_001' }
  });
  
  if (!testUser) {
    console.log('⚠️  No test user found. Please run auth tests first to create test_citizen_001');
    return;
  }
  
  console.log(`✅ Found user: ${testUser.seatId}`);
  
  const activities = [
    // LEGISLATIVE activities
    {
      templateCode: 'LEG-001',
      powerBranch: 'LEGISLATIVE',
      hierarchyLevel: 'REPUBLIC',
      userId: testUser.id,
      parameters: {
        billNumber: '2026-001',
        title: 'О цифровой собственности и правах граждан',
        sponsor: 'Citizen Council Level 1000',
        category: 'Digital Rights',
      },
      blockchainTxHash: '0x' + Math.random().toString(16).substring(2, 66),
    },
    {
      templateCode: 'LEG-002',
      powerBranch: 'LEGISLATIVE',
      hierarchyLevel: 'REPUBLIC',
      userId: testUser.id,
      parameters: {
        billNumber: '2026-001',
        votesFor: 8547,
        votesAgainst: 1203,
        abstentions: 250,
        result: 'PASSED',
        quorum: true,
      },
      blockchainTxHash: '0x' + Math.random().toString(16).substring(2, 66),
    },
    {
      templateCode: 'LEG-003',
      powerBranch: 'LEGISLATIVE',
      hierarchyLevel: 'REPUBLIC',
      userId: testUser.id,
      parameters: {
        lawNumber: 'KHURAL-2026-001',
        title: 'О цифровой собственности и правах граждан',
        effectiveDate: '2026-03-01',
        signedBy: 'Supreme Khural',
        publicationDate: '2026-02-05',
      },
      blockchainTxHash: '0x' + Math.random().toString(16).substring(2, 66),
    },

    // EXECUTIVE activities
    {
      templateCode: 'EXEC-001',
      powerBranch: 'EXECUTIVE',
      hierarchyLevel: 'REPUBLIC',
      userId: testUser.id,
      parameters: {
        decreeNumber: 'EXEC-2026-042',
        title: 'Об утверждении плана цифровизации государственных услуг',
        issuedBy: 'Executive Council',
        effectiveDate: '2026-02-10',
        scope: 'All government services',
        budgetImpact: 15000000,
      },
      blockchainTxHash: '0x' + Math.random().toString(16).substring(2, 66),
    },
    {
      templateCode: 'EXEC-002',
      powerBranch: 'EXECUTIVE',
      hierarchyLevel: 'LEVEL_1000',
      userId: testUser.id,
      parameters: {
        appointeeName: 'Батмөнх Доржиев',
        position: 'Руководитель Департамента Цифровых Услуг',
        department: 'Министерство Цифрового Развития',
        appointedBy: 'Minister of Digital Development',
        termLength: '4 years',
        salary: 250000,
      },
      blockchainTxHash: '0x' + Math.random().toString(16).substring(2, 66),
    },
    {
      templateCode: 'EXEC-003',
      powerBranch: 'EXECUTIVE',
      hierarchyLevel: 'REPUBLIC',
      userId: testUser.id,
      parameters: {
        programName: 'Программа развития сельских территорий 2026',
        allocated: 50000000,
        spent: 37500000,
        beneficiaries: 12450,
        completionRate: 75,
      },
      blockchainTxHash: '0x' + Math.random().toString(16).substring(2, 66),
    },

    // JUDICIAL activities
    {
      templateCode: 'JUD-001',
      powerBranch: 'JUDICIAL',
      hierarchyLevel: 'LEVEL_100',
      userId: testUser.id,
      parameters: {
        caseNumber: 'CIVIL-2026-00142',
        caseType: 'Гражданское (имущественный спор)',
        court: 'Zun Court Level 100',
        plaintiff: 'Arban #127',
        defendant: 'Arban #134',
        filingDate: '2026-01-15',
      },
      blockchainTxHash: '0x' + Math.random().toString(16).substring(2, 66),
    },
    {
      templateCode: 'JUD-002',
      powerBranch: 'JUDICIAL',
      hierarchyLevel: 'LEVEL_100',
      userId: testUser.id,
      parameters: {
        caseNumber: 'CIVIL-2026-00142',
        verdict: 'В пользу истца с частичным удовлетворением требований',
        judge: 'Judge Цэрэнпил Батсүх',
        sentenced: 'Возмещение ущерба',
        damages: 125000,
        appealDeadline: '2026-03-15',
      },
      blockchainTxHash: '0x' + Math.random().toString(16).substring(2, 66),
    },
    {
      templateCode: 'JUD-003',
      powerBranch: 'JUDICIAL',
      hierarchyLevel: 'REPUBLIC',
      userId: testUser.id,
      parameters: {
        lawNumber: 'KHURAL-2025-087',
        petitioner: 'Confederation Human Rights Council',
        ruling: 'PARTIALLY_UNCONSTITUTIONAL',
        reasoning: 'Статьи 14 и 15 противоречат конституционным гарантиям свободы слова',
        effectOnLaw: 'Статьи 14-15 отменены, остальные положения остаются в силе',
      },
      blockchainTxHash: '0x' + Math.random().toString(16).substring(2, 66),
    },

    // BANKING activities
    {
      templateCode: 'BANK-001',
      powerBranch: 'BANKING',
      hierarchyLevel: 'REPUBLIC',
      userId: testUser.id,
      parameters: {
        amount: 1000000000,
        reason: 'Квартальная эмиссия для поддержания целевой инфляции 2.5%',
        authorizedBy: 'Central Bank Governor',
        inflationTarget: 2.5,
        circulationBefore: 45000000000,
        circulationAfter: 46000000000,
      },
      blockchainTxHash: '0x' + Math.random().toString(16).substring(2, 66),
    },
    {
      templateCode: 'BANK-002',
      powerBranch: 'BANKING',
      hierarchyLevel: 'REPUBLIC',
      userId: testUser.id,
      parameters: {
        previousRate: 4.5,
        newRate: 4.25,
        effectiveDate: '2026-02-15',
        reason: 'Снижение для стимулирования экономической активности',
        expectedImpact: 'Увеличение кредитования на 8-12% в следующем квартале',
      },
      blockchainTxHash: '0x' + Math.random().toString(16).substring(2, 66),
    },
    {
      templateCode: 'BANK-003',
      powerBranch: 'BANKING',
      hierarchyLevel: 'REPUBLIC',
      userId: testUser.id,
      parameters: {
        amount: 500000000,
        fromBank: 'Central Bank INOMAD',
        toBank: 'Commercial Bank "Алтан"',
        purpose: 'Рефинансирование кредитных линий для сельского хозяйства',
        authorizedBy: 'CB Governor + CB Board',
        settlementTime: new Date().toISOString(),
      },
      blockchainTxHash: '0x' + Math.random().toString(16).substring(2, 66),
    },
    {
      templateCode: 'BANK-004',
      powerBranch: 'BANKING',
      hierarchyLevel: 'REPUBLIC',
      userId: testUser.id,
      parameters: {
        bankName: 'Commercial Bank "Хурал"',
        requiredReserves: 2500000000,
        actualReserves: 2750000000,
        liquidityRatio: 110,
        compliance: true,
      },
      blockchainTxHash: '0x' + Math.random().toString(16).substring(2, 66),
    },
  ];

  let created = 0;
  for (const activity of activities) {
    try {
      // Get the template to render action name and description
      // @ts-ignore
      const template = await prisma.activityTemplate.findUnique({
        where: { code: activity.templateCode },
      });

      if (!template) {
        console.log(`  ⚠️  Template ${activity.templateCode} not found, skipping`);
        continue;
      }

      // Simple template rendering (replace {{key}} with value)
      const renderTemplate = (tmpl: string, params: any): string => {
        return tmpl.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] || '');
      };

      const actionName = renderTemplate(template.actionNameTemplate, activity.parameters);
      const description = renderTemplate(template.descriptionTemplate, activity.parameters);

      // @ts-ignore
      const entry = await prisma.activityEntry.create({
        data: {
          powerBranch: activity.powerBranch as PowerBranchType,
          hierarchyLevel: activity.hierarchyLevel as any, // Type bypass - Prisma $Enums.HierarchyLevel not exported
          performedByUserId: activity.userId, // Correct field name
          txHash: activity.blockchainTxHash, // Correct field name
          actionName,
          actionDescription: description,
          actionParameters: activity.parameters,
          performedAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)),
        },
      });

      created++;
      console.log(`  ✅ ${activity.templateCode}: ${actionName.substring(0, 50)}...`);
    } catch (error) {
      console.error(`  ❌ Failed to create activity ${activity.templateCode}:`, error.message);
    }
  }

  // @ts-ignore
  const total = await prisma.activityEntry.count();
  console.log(`\n✨ Created ${created} sample activities. Total in database: ${total}`);
}

seedTransparencyActivities()
  .catch((e) => {
    console.error('💥 Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
