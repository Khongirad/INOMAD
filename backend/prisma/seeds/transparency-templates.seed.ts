import { PrismaClient, PowerBranchType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTransparencyTemplates() {
  console.log('🌱 Seeding GOST Activity Templates...');
  
  const templates = [
    // LEGISLATIVE (3 templates)
    {
      code: 'LEG-001',
      name: 'Внесение законопроекта',
      description: 'Официальное внесение нового законопроекта',
      powerBranch: 'LEGISLATIVE' as PowerBranchType,
      actionNameTemplate: 'Законопроект {{billNumber}}: {{title}}',
      descriptionTemplate: 'Внесен законопроект {{billNumber}} "{{title}}" от {{sponsor}}',
      parametersSchema: {
        type: 'object',
        required: ['billNumber', 'title', 'sponsor'],
        properties: {
          billNumber: { type: 'string' },
          title: { type: 'string' },
          sponsor: { type: 'string' },
        },
      },
    },
    {
      code: 'LEG-002',
      name: 'Голосование по законопроекту',
      description: 'Проведение голосования',
      powerBranch: 'LEGISLATIVE' as PowerBranchType,
      actionNameTemplate: 'Голосование {{billNumber}}',
      descriptionTemplate: 'Голосование по {{billNumber}}: ЗА {{votesFor}}, ПРОТИВ {{votesAgainst}}',
      parametersSchema: {
        type: 'object',
        required: ['billNumber', 'votesFor', 'votesAgainst'],
        properties: {
          billNumber: { type: 'string' },
          votesFor: { type: 'integer' },
          votesAgainst: { type: 'integer' },
          abstentions: { type: 'integer' },
          result: { type: 'string', enum: ['PASSED', 'REJECTED'] },
        },
      },
    },
    {
      code: 'LEG-003',
      name: 'Принятие закона',
      description: 'Официальное принятие закона',
      powerBranch: 'LEGISLATIVE' as PowerBranchType,
      actionNameTemplate: 'Закон {{lawNumber}}',
      descriptionTemplate: 'Принят закон {{lawNumber}} "{{title}}" с эффектом от {{effectiveDate}}',
      parametersSchema: {
        type: 'object',
        required: ['lawNumber', 'title', 'effectiveDate'],
        properties: {
          lawNumber: { type: 'string' },
          title: { type: 'string' },
          effectiveDate: { type: 'string', format: 'date' },
        },
      },
    },
    
    // EXECUTIVE (3 templates)
    {
      code: 'EXEC-001',
      name: 'Издание указа',
      description: 'Издание исполнительного указа',
      powerBranch: 'EXECUTIVE' as PowerBranchType,
      actionNameTemplate: 'Указ {{decreeNumber}}',
      descriptionTemplate: 'Издан указ {{decreeNumber}} "{{title}}" от {{issuedBy}}',
      parametersSchema: {
        type: 'object',
        required: ['decreeNumber', 'title', 'issuedBy'],
        properties: {
          decreeNumber: { type: 'string' },
          title: { type: 'string' },
          issuedBy: { type: 'string' },
          budgetImpact: { type: 'number' },
        },
      },
    },
    {
      code: 'EXEC-002',
      name: 'Назначение на должность',
      description: 'Официальное назначение',
      powerBranch: 'EXECUTIVE' as PowerBranchType,
      actionNameTemplate: 'Назначение: {{appointeeName}}',
      descriptionTemplate: '{{appointeeName}} назначен на должность {{position}} в {{department}}',
      parametersSchema: {
        type: 'object',
        required: ['appointeeName', 'position', 'department'],
        properties: {
          appointeeName: { type: 'string' },
          position: { type: 'string' },
          department: { type: 'string' },
          salary: { type: 'number' },
        },
      },
    },
    {
      code: 'EXEC-003',
      name: 'Выполнение бюджета',
      description: 'Отчет о выполнении бюджетной программы',
      powerBranch: 'EXECUTIVE' as PowerBranchType,
      actionNameTemplate: 'Бюджет: {{programName}}',
      descriptionTemplate: 'Программа {{programName}}: выделено {{allocated}}, потрачено {{spent}} Алтан',
      parametersSchema: {
        type: 'object',
        required: ['programName', 'allocated', 'spent'],
        properties: {
          programName: { type: 'string' },
          allocated: { type: 'number' },
          spent: { type: 'number' },
          completionRate: { type: 'number' },
        },
      },
    },
    
    // JUDICIAL (3 templates)
    {
      code: 'JUD-001',
      name: 'Регистрация дела',
      description: 'Регистрация нового судебного дела',
      powerBranch: 'JUDICIAL' as PowerBranchType,
      actionNameTemplate: 'Дело {{caseNumber}}',
      descriptionTemplate: 'Зарегистрировано дело {{caseNumber}} ({{caseType}}) в {{court}}',
      parametersSchema: {
        type: 'object',
        required: ['caseNumber', 'caseType', 'court'],
        properties: {
          caseNumber: { type: 'string' },
          caseType: { type: 'string' },
          court: { type: 'string' },
          plaintiff: { type: 'string' },
          defendant: { type: 'string' },
        },
      },
    },
    {
      code: 'JUD-002',
      name: 'Вынесение решения',
      description: 'Официальное решение суда',
      powerBranch: 'JUDICIAL' as PowerBranchType,
      actionNameTemplate: 'Решение по делу {{caseNumber}}',
      descriptionTemplate: 'Вынесено решение "{{verdict}}" по делу {{caseNumber}}, судья {{judge}}',
      parametersSchema: {
        type: 'object',
        required: ['caseNumber', 'verdict', 'judge'],
        properties: {
          caseNumber: { type: 'string' },
          verdict: { type: 'string' },
          judge: { type: 'string' },
          damages: { type: 'number' },
        },
      },
    },
    {
      code: 'JUD-003',
      name: 'Проверка конституционности',
      description: 'Проверка закона на соответствие конституции',
      powerBranch: 'JUDICIAL' as PowerBranchType,
      actionNameTemplate: 'Конституционность закона {{lawNumber}}',
      descriptionTemplate: 'Закон {{lawNumber}}: {{ruling}}',
      parametersSchema: {
        type: 'object',
        required: ['lawNumber', 'ruling'],
        properties: {
          lawNumber: { type: 'string' },
          ruling: { type: 'string', enum: ['CONSTITUTIONAL', 'UNCONSTITUTIONAL'] },
          petitioner: { type: 'string' },
        },
      },
    },
    
    // BANKING (4 templates)
    {
      code: 'BANK-001',
      name: 'Эмиссия валюты',
      description: 'Выпуск новых единиц Алтан',
      powerBranch: 'BANKING' as PowerBranchType,
      actionNameTemplate: 'Эмиссия {{amount}} Алтан',
      descriptionTemplate: 'Выпущено {{amount}} Алтан. Причина: {{reason}}',
      parametersSchema: {
        type: 'object',
        required: ['amount', 'reason'],
        properties: {
          amount: { type: 'number' },
          reason: { type: 'string' },
          authorizedBy: { type: 'string' },
          inflationTarget: { type: 'number' },
        },
      },
    },
    {
      code: 'BANK-002',
      name: 'Изменение учетной ставки',
      description: 'Изменение базовой процентной ставки',
      powerBranch: 'BANKING' as PowerBranchType,
      actionNameTemplate: 'Учетная ставка: {{previousRate}}% → {{newRate}}%',
      descriptionTemplate: 'Изменение ставки с {{previousRate}}% на {{newRate}}%. Вступает в силу {{effectiveDate}}',
      parametersSchema: {
        type: 'object',
        required: ['previousRate', 'newRate', 'effectiveDate'],
        properties: {
          previousRate: { type: 'number' },
          newRate: { type: 'number' },
          effectiveDate: { type: 'string', format: 'date' },
          reason: { type: 'string' },
        },
      },
    },
    {
      code: 'BANK-003',
      name: 'Межбанковский перевод',
      description: 'Крупный межбанковский перевод',
      powerBranch: 'BANKING' as PowerBranchType,
      actionNameTemplate: 'Перевод {{amount}} Алтан',
      descriptionTemplate: 'Переведено {{amount}} Алтан из {{fromBank}} в {{toBank}}. Цель: {{purpose}}',
      parametersSchema: {
        type: 'object',
        required: ['amount', 'fromBank', 'toBank', 'purpose'],
        properties: {
          amount: { type: 'number' },
          fromBank: { type: 'string' },
          toBank: { type: 'string' },
          purpose: { type: 'string' },
        },
      },
    },
    {
      code: 'BANK-004',
      name: 'Отчет о резервах',
      description: 'Отчет об обязательных резервах',
      powerBranch: 'BANKING' as PowerBranchType,
      actionNameTemplate: 'Резервы {{bankName}}',
      descriptionTemplate: 'Банк {{bankName}}: требуется {{requiredReserves}}, фактически {{actualReserves}} Алтан',
      parametersSchema: {
        type: 'object',
        required: ['bankName', 'requiredReserves', 'actualReserves'],
        properties: {
          bankName: { type: 'string' },
          requiredReserves: { type: 'number' },
          actualReserves: { type: 'number' },
          liquidityRatio: { type: 'number' },
          compliance: { type: 'boolean' },
        },
      },
    },
  ];
  
  for (const template of templates) {
    try {
      // @ts-ignore - Prisma Client may not have activityTemplate yet
      const created = await prisma.activityTemplate.upsert({
        where: { code: template.code },
        update: template,
        create: template,
      });
      console.log(`  ✅ ${created.code}: ${created.name} (${created.powerBranch})`);
    } catch (error) {
      console.error(`  ❌ Failed to seed ${template.code}:`, error.message);
    }
  }
  
  // @ts-ignore
  const count = await prisma.activityTemplate.count();
  console.log(`\n✨ Total GOST templates in database: ${count}`);
}

seedTransparencyTemplates()
  .catch((e) => {
    console.error('💥 Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
