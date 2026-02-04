import { Injectable, Logger } from '@nestjs/common';
import { DocumentTemplateService } from './document-template.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * TemplateSeederService
 * 
 * Seeds initial document templates for State Archive system.
 * Templates for:
 * - Banking License
 * - Emission Protocol
 * - Correspondent Account Agreement
 */
@Injectable()
export class TemplateSeederService {
  private readonly logger = new Logger(TemplateSeederService.name);

  constructor(
    private prisma: PrismaService,
    private templateService: DocumentTemplateService,
  ) {}

  /**
   * Seed all initial templates
   * Called during bootstrap or manually
   */
  async seedTemplates(creatorId: string) {
    this.logger.log('Seeding initial document templates...');

    try {
      await this.seedBankingLicenseTemplate(creatorId);
      await this.seedEmissionProtocolTemplate(creatorId);
      await this.seedCorrespondentAccountTemplate(creatorId);

      this.logger.log('✅ All templates seeded successfully');
    } catch (error) {
      this.logger.error('Failed to seed templates:', error);
      throw error;
    }
  }

  /**
   * Banking License Template
   */
  private async seedBankingLicenseTemplate(creatorId: string) {
    const code = 'BANKING_LICENSE_001';

    // Check if already exists
    const existing = await this.prisma.documentTemplate.findUnique({
      where: { code },
    });

    if (existing) {
      this.logger.log(`Template ${code} already exists, skipping...`);
      return;
    }

    const template = await this.templateService.createTemplate(creatorId, {
      code,
      name: 'Banking License',
      nameRu: 'Лицензия на банковскую деятельность',
      category: 'Banking',
      templateSchema: {
        type: 'object',
        properties: {
          BANK_NAME: { type: 'string', description: 'Bank name' },
          BANK_ADDRESS: { type: 'string', description: 'Legal address' },
          TAX_ID: { type: 'string', description: 'Tax identification number' },
          LICENSE_NUMBER: { type: 'string', description: 'License number (auto-generated)' },
          ISSUE_DATE: { type: 'string', description: 'Issue date' },
          GOVERNOR_NAME: { type: 'string', description: 'Central Bank Governor name' },
          REGISTRY_NUMBER: { type: 'string', description: 'State registry number' },
        },
        required: ['BANK_NAME', 'BANK_ADDRESS', 'TAX_ID', 'ISSUE_DATE', 'GOVERNOR_NAME'],
      },
      requiredFields: ['BANK_NAME', 'BANK_ADDRESS', 'TAX_ID', 'ISSUE_DATE', 'GOVERNOR_NAME'],
      optionalFields: ['LICENSE_NUMBER', 'REGISTRY_NUMBER'],
      contentTemplate: `
CENTRAL BANK OF THE SIBERIAN CONFEDERATION

BANKING LICENSE

License Number: {{LICENSE_NUMBER}}
Date of Issue: {{ISSUE_DATE}}

This license is hereby granted to:

Name: {{BANK_NAME}}
Legal Address: {{BANK_ADDRESS}}
Tax Identification Number: {{TAX_ID}}

The above-named entity is authorized to conduct the following banking operations:

1. Accepting deposits from individuals and legal entities
2. Extending credit and making loans
3. Opening and maintaining bank accounts
4. Providing payment and settlement services
5. Foreign exchange operations
6. Issuing bank cards and payment instruments
7. Providing safe deposit services
8. Operating correspondent accounts

This license is issued without expiration subject to compliance with all applicable laws, regulations, and Central Bank directives.

The license may be suspended or revoked for violations of banking regulations, financial instability, or other grounds established by law.

Registered in the State Registry under number: {{REGISTRY_NUMBER}}

Chairman of the Central Bank: {{GOVERNOR_NAME}}

Digital Signature: [SIGNATURE]
Official Seal: [SEAL]

---

This is an official document of the Central Bank of the Siberian Confederation.
Issued in accordance with the Banking Law and Central Bank Charter.
`.trim(),
      headerTemplate: `CENTRAL BANK OF THE SIBERIAN CONFEDERATION\n`,
      footerTemplate: `\n---\nDocument authenticity verified via State Archive blockchain proof.`,
      requiredSignatures: ['CB_GOVERNOR', 'NOTARY', 'STATE_LAWYER'],
      stagesRequired: ['DRAFT', 'SIGNED', 'PENDING_NOTARIZATION', 'NOTARIZED', 'PENDING_LEGAL', 'CERTIFIED', 'ARCHIVED'],
      blockchainEnabled: true,
      contractTemplate: null, // Optional: Smart contract code
      validationRules: {
        TAX_ID: { pattern: '^[0-9]{10,12}$' },
      },
    });

    this.logger.log(`✅ Created template: ${template.code}`);
  }

  /**
   * Emission Protocol Template
   */
  private async seedEmissionProtocolTemplate(creatorId: string) {
    const code = 'EMISSION_PROTOCOL_001';

    const existing = await this.prisma.documentTemplate.findUnique({
      where: { code },
    });

    if (existing) {
      this.logger.log(`Template ${code} already exists, skipping...`);
      return;
    }

    const template = await this.templateService.createTemplate(creatorId, {
      code,
      name: 'ALTAN Emission Protocol',
      nameRu: 'Протокол эмиссии АЛТАН',
      category: 'Emission',
      templateSchema: {
        type: 'object',
        properties: {
          EMISSION_AMOUNT: { type: 'string', description: 'Total amount to emit' },
          RECIPIENT_BANK: { type: 'string', description: 'Recipient bank name' },
          RECIPIENT_ACCOUNT: { type: 'string', description: 'Recipient correspondent account' },
          PROTOCOL_NUMBER: { type: 'string', description: 'Protocol number' },
          ISSUE_DATE: { type: 'string', description: 'Issue date' },
          GOVERNOR_NAME: { type: 'string', description: 'Governor name' },
          PURPOSE: { type: 'string', description: 'Purpose of emission' },
          LEGAL_BASIS: { type: 'string', description: 'Legal authorization' },
        },
        required: ['EMISSION_AMOUNT', 'RECIPIENT_BANK', 'RECIPIENT_ACCOUNT', 'ISSUE_DATE', 'GOVERNOR_NAME', 'PURPOSE'],
      },
      requiredFields: ['EMISSION_AMOUNT', 'RECIPIENT_BANK', 'RECIPIENT_ACCOUNT', 'ISSUE_DATE', 'GOVERNOR_NAME', 'PURPOSE'],
      optionalFields: ['PROTOCOL_NUMBER', 'LEGAL_BASIS'],
      contentTemplate: `
CENTRAL BANK OF THE SIBERIAN CONFEDERATION

ALTAN EMISSION PROTOCOL

Protocol Number: {{PROTOCOL_NUMBER}}
Date: {{ISSUE_DATE}}

EMISSION AUTHORIZATION

The Central Bank of the Siberian Confederation hereby authorizes the emission of ALTAN currency in accordance with Article XII of the Khaganate Constitution and the Central Bank Charter.

EMISSION DETAILS:

Amount to be emitted: {{EMISSION_AMOUNT}} ALTAN
Recipient Institution: {{RECIPIENT_BANK}}
Correspondent Account: {{RECIPIENT_ACCOUNT}}
Purpose: {{PURPOSE}}
Legal Basis: {{LEGAL_BASIS}}

TERMS AND CONDITIONS:

1. The emitted ALTAN shall be credited to the correspondent account of {{RECIPIENT_BANK}} within 24 hours of protocol execution.

2. The recipient institution shall maintain full reserve backing and comply with all Central Bank regulations regarding reserve requirements.

3. This emission is executed in accordance with the monetary policy objectives of maintaining price stability and supporting economic growth.

4. The recipient institution shall provide monthly reports on the distribution and utilization of emitted funds.

5. This protocol is subject to notarization and legal certification as required by State Archive regulations.

AUTHORIZATION:

By my authority as Chairman of the Central Bank, I hereby execute this emission protocol.

Chairman of the Central Bank: {{GOVERNOR_NAME}}

Digital Signature: [SIGNATURE]
Official Seal: [SEAL]

---

This protocol is registered in the State Archive and recorded on the blockchain for immutable verification.
`.trim(),
      headerTemplate: `CENTRAL BANK OF THE SIBERIAN CONFEDERATION\nOFFICIAL EMISSION PROTOCOL\n`,
      footerTemplate: `\n---\nBlockchain Proof: [TX_HASH]\nState Archive Reference: [ARCHIVE_NUMBER]`,
      requiredSignatures: ['CB_GOVERNOR', 'NOTARY', 'STATE_LAWYER'],
      stagesRequired: ['DRAFT', 'SIGNED', 'PENDING_NOTARIZATION', 'NOTARIZED', 'PENDING_LEGAL', 'CERTIFIED', 'ARCHIVED'],
      blockchainEnabled: true,
      validationRules: {
        EMISSION_AMOUNT: { pattern: '^[0-9,.]+ ALTAN$' },
      },
    });

    this.logger.log(`✅ Created template: ${template.code}`);
  }

  /**
   * Correspondent Account Agreement Template
   */
  private async seedCorrespondentAccountTemplate(creatorId: string) {
    const code = 'CORRESPONDENT_ACCOUNT_001';

    const existing = await this.prisma.documentTemplate.findUnique({
      where: { code },
    });

    if (existing) {
      this.logger.log(`Template ${code} already exists, skipping...`);
      return;
    }

    const template = await this.templateService.createTemplate(creatorId, {
      code,
      name: 'Correspondent Account Agreement',
      nameRu: 'Договор корреспондентского счета',
      category: 'Banking',
      templateSchema: {
        type: 'object',
        properties: {
          BANK_NAME: { type: 'string', description: 'Bank name' },
          ACCOUNT_NUMBER: { type: 'string', description: 'Account number' },
          AGREEMENT_NUMBER: { type: 'string', description: 'Agreement number' },
          ISSUE_DATE: { type: 'string', description: 'Date' },
          GOVERNOR_NAME: { type: 'string', description: 'Governor name' },
          BANK_DIRECTOR: { type: 'string', description: 'Bank director name' },
        },
        required: ['BANK_NAME', 'ACCOUNT_NUMBER', 'ISSUE_DATE', 'GOVERNOR_NAME', 'BANK_DIRECTOR'],
      },
      requiredFields: ['BANK_NAME', 'ACCOUNT_NUMBER', 'ISSUE_DATE', 'GOVERNOR_NAME', 'BANK_DIRECTOR'],
      optionalFields: ['AGREEMENT_NUMBER'],
      contentTemplate: `
CORRESPONDENT ACCOUNT AGREEMENT

Agreement Number: {{AGREEMENT_NUMBER}}
Date: {{ISSUE_DATE}}

PARTIES:

1. Central Bank of the Siberian Confederation (hereinafter "Central Bank")
   Represented by: {{GOVERNOR_NAME}}, Chairman

2. {{BANK_NAME}} (hereinafter "Correspondent Bank")
   Represented by: {{BANK_DIRECTOR}}, Director

SUBJECT MATTER:

The Central Bank hereby opens a correspondent account for the Correspondent Bank to facilitate interbank settlements, reserve management, and monetary operations.

Account Number: {{ACCOUNT_NUMBER}}

RIGHTS AND OBLIGATIONS:

Central Bank shall:
- Maintain the correspondent account and process transactions
- Provide settlement services in ALTAN
- Ensure security and confidentiality of transactions
- Apply reserve requirements as established by Central Bank regulations

Correspondent Bank shall:
- Maintain minimum reserve balance as required
- Comply with all Central Bank directives and regulations
- Report all transactions as required
- Use the account solely for authorized banking operations

SETTLEMENT AND FEES:

All transactions shall be settled in ALTAN on a real-time basis. The Central Bank may charge fees for certain services as published in the official fee schedule.

TERM AND TERMINATION:

This agreement is effective upon execution and continues indefinitely subject to compliance with all terms. Either party may terminate upon 30 days written notice.

SIGNATURES:

For Central Bank:                    For {{BANK_NAME}}:
{{GOVERNOR_NAME}}                    {{BANK_DIRECTOR}}
Chairman                             Director

Digital Signature: [SIGNATURE]       Digital Signature: [SIGNATURE]
`.trim(),
      headerTemplate: `CENTRAL BANK OF THE SIBERIAN CONFEDERATION\n`,
      footerTemplate: `\n---\nState Archive Registration: [ARCHIVE_NUMBER]`,
      requiredSignatures: ['CB_GOVERNOR', 'BANK_DIRECTOR', 'NOTARY', 'STATE_LAWYER'],
      stagesRequired: ['DRAFT', 'SIGNED', 'PENDING_NOTARIZATION', 'NOTARIZED', 'PENDING_LEGAL', 'CERTIFIED', 'ARCHIVED'],
      blockchainEnabled: true,
    });

    this.logger.log(`✅ Created template: ${template.code}`);
  }
}
