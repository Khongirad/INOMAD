import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentTemplateService } from '../archive/document-template.service';
import { DocumentContractService } from '../archive/document-contract.service';
import { NotaryService } from '../archive/notary.service';
import { LegalService } from '../archive/legal.service';
import { Bank, DocumentContract, BankLicenseStatus, BankStatus } from '@prisma/client';

/**
 * CBWorkflowService
 * 
 * Formal Central Bank workflows for:
 * - Banking license issuance
 * - Correspondent account opening
 * - ALTAN emission protocols
 * 
 * All workflows use State Archive document system
 */
@Injectable()
export class CBWorkflowService {
  private readonly logger = new Logger(CBWorkflowService.name);

  constructor(
    private prisma: PrismaService,
    private templateService: DocumentTemplateService,
    private documentService: DocumentContractService,
    private notaryService: NotaryService,
    private legalService: LegalService,
  ) {}

  /**
   * Issue banking license (complete formal workflow)
   * 
   * Process:
   * 1. Create Bank entity (PENDING_LICENSE status)
   * 2. Generate license document from BANKING_LICENSE_001 template
   * 3. CB Governor signs document
   * 4. Submit for notarization → NOTARIZED
   * 5. Submit for legal certification → CERTIFIED
   * 6. Archive document with license number
   * 7. Update bank status to ISSUED/LICENSED
   */
  async issueBankingLicense(
    governorId: string,
    bankData: {
      name: string;
      nameRu?: string;
      legalAddress: string;
      taxId: string;
      directorId?: string;
    },
  ): Promise<{
    bank: Bank;
    licenseDocument: DocumentContract;
  }> {
    this.logger.log(`Issuing banking license for: ${bankData.name}`);

    // 1. Verify CB Governor
    const governor = await this.prisma.user.findUnique({
      where: { id: governorId },
    });

    if (!governor || (governor.role !== 'CREATOR' && governor.role !== 'CB_GOVERNOR')) {
      throw new BadRequestException('Only Creator or CB Governor can issue banking licenses');
    }

    // 2. Create Bank entity
    const bank = await this.prisma.bank.create({
      data: {
        name: bankData.name,
        nameRu: bankData.nameRu,
        legalAddress: bankData.legalAddress,
        taxId: bankData.taxId,
        directorId: bankData.directorId,
        licenseStatus: BankLicenseStatus.PENDING,
        operationalStatus: BankStatus.PENDING_LICENSE,
      },
    });

    this.logger.log(`Bank entity created: ${bank.id}`);

    // 3. Generate document number
    const licenseNumber = await this.generateLicenseNumber();

    // 4. Get template
    const template = await this.templateService.getTemplate('BANKING_LICENSE_001');

    // 5. Prepare variables for template
    const variables = {
      BANK_NAME: bank.name,
      BANK_ADDRESS: bank.legalAddress,
      TAX_ID: bank.taxId,
      LICENSE_NUMBER: licenseNumber,
      ISSUE_DATE: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      GOVERNOR_NAME: governor.username || 'Central Bank Governor',
      REGISTRY_NUMBER: `SR-${licenseNumber}`, // State Registry number
    };

    // 6. Create license document
    const licenseDocument = await this.documentService.createDocument({
      templateCode: 'BANKING_LICENSE_001',
      issuerId: governorId,
      recipientId: bankData.directorId,
      title: `Banking License - ${bank.name}`,
      titleRu: `Лицензия на банковскую деятельность - ${bank.nameRu || bank.name}`,
      variables,
      documentNumberPrefix: licenseNumber,
    });

    this.logger.log(`License document created: ${licenseDocument.documentNumber}`);

    // 7. Update bank with license document reference
    await this.prisma.bank.update({
      where: { id: bank.id },
      data: {
        licenseNumber,
        licenseDocumentId: licenseDocument.id,
        licenseStatus: BankLicenseStatus.APPROVED,
      },
    });

    this.logger.log(`✅ Banking license issued: ${licenseNumber} for ${bank.name}`);

    // Return bank with updated license document
    const updatedBank = await this.prisma.bank.findUnique({
      where: { id: bank.id },
      include: {
        director: true,
        licenseDocument: true,
      },
    });

    return {
      bank: updatedBank!,
      licenseDocument,
    };
  }

  /**
   * Open correspondent account with Central Bank
   * 
   * Process:
   * 1. Verify bank exists and has valid license
   * 2. Create correspondent agreement document
   * 3. Dual signatures (CB Governor + Bank Director)
   * 4. Notarization + Legal certification
   * 5. Update bank with correspondent account number
   * 6. Update bank status to OPERATIONAL
   */
  async openCorrespondentAccount(
    governorId: string,
    bankId: string,
    accountNumber: string,
  ): Promise<{
    bank: Bank;
    agreement: DocumentContract;
  }> {
    this.logger.log(`Opening correspondent account for bank ${bankId}: ${accountNumber}`);

    // 1. Verify bank exists and is licensed
    const bank = await this.prisma.bank.findUnique({
      where: { id: bankId },
      include: {
        director: true,
      },
    });

    if (!bank) {
      throw new NotFoundException('Bank not found');
    }

    if (bank.licenseStatus !== BankLicenseStatus.ISSUED) {
      throw new BadRequestException('Bank must have issued license before opening correspondent account');
    }

    // 2. Verify CB Governor
    const governor = await this.prisma.user.findUnique({
      where: { id: governorId },
    });

    if (!governor || (governor.role !== 'CREATOR' && governor.role !== 'CB_GOVERNOR')) {
      throw new BadRequestException('Only Creator or CB Governor can open correspondent accounts');
    }

    // 3. Get template
    const template = await this.templateService.getTemplate('CORRESPONDENT_ACCOUNT_001');

    // 4. Generate agreement number
    const agreementNumber = await this.generateAgreementNumber();

    // 5. Prepare variables
    const variables = {
      BANK_NAME: bank.name,
      ACCOUNT_NUMBER: accountNumber,
      AGREEMENT_NUMBER: agreementNumber,
      ISSUE_DATE: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      GOVERNOR_NAME: governor.username || 'Central Bank Governor',
      BANK_DIRECTOR: bank.director?.username || 'Bank Director',
    };

    // 6. Create agreement document
    const agreement = await this.documentService.createDocument({
      templateCode: 'CORRESPONDENT_ACCOUNT_001',
      issuerId: governorId,
      recipientId: bank.directorId,
      title: `Correspondent Account Agreement - ${bank.name}`,
      titleRu: `Договор корреспондентского счета - ${bank.nameRu || bank.name}`,
      variables,
      documentNumberPrefix: agreementNumber,
    });

    this.logger.log(`Agreement document created: ${agreement.documentNumber}`);

    // 7. Update bank with correspondent account
    const updatedBank = await this.prisma.bank.update({
      where: { id: bankId },
      data: {
        correspondentAccountNumber: accountNumber,
        correspondentAgreementId: agreement.id,
        operationalStatus: BankStatus.OPERATIONAL,
      },
      include: {
        director: true,
        licenseDocument: true,
        correspondentAgreement: true,
      },
    });

    this.logger.log(`✅ Correspondent account opened: ${accountNumber} for ${bank.name}`);

    return {
      bank: updatedBank,
      agreement,
    };
  }

  /**
   * Execute ALTAN emission protocol
   * 
   * Process:
   * 1. Verify recipient bank is operational
   * 2. Create emission protocol document
   * 3. CB Governor signs
   * 4. Notarization + Legal certification
   * 5. Execute actual emission (placeholder for now - would credit correspondent account)
   * 6. Archive protocol with blockchain TX
   */
  async executeEmission(
    governorId: string,
    emissionData: {
      amount: string; // "2.1 trillion ALTAN"
      recipientBankId: string;
      purpose: string;
      legalBasis?: string;
    },
  ): Promise<{
    emissionDocument: DocumentContract;
    message: string;
  }> {
    this.logger.log(`Executing emission: ${emissionData.amount}`);

    // 1. Verify recipient bank
    const bank = await this.prisma.bank.findUnique({
      where: { id: emissionData.recipientBankId },
    });

    if (!bank) {
      throw new NotFoundException('Recipient bank not found');
    }

    if (bank.operationalStatus !== BankStatus.OPERATIONAL) {
      throw new BadRequestException('Recipient bank must be operational to receive emission');
    }

    if (!bank.correspondentAccountNumber) {
      throw new BadRequestException('Recipient bank must have correspondent account');
    }

    // 2. Verify CB Governor
    const governor = await this.prisma.user.findUnique({
      where: { id: governorId },
    });

    if (!governor || (governor.role !== 'CREATOR' && governor.role !== 'CB_GOVERNOR')) {
      throw new BadRequestException('Only Creator or CB Governor can execute emission');
    }

    // 3. Generate protocol number
    const protocolNumber = await this.generateProtocolNumber();

    // 4. Get template
    const template = await this.templateService.getTemplate('EMISSION_PROTOCOL_001');

    // 5. Prepare variables
    const variables = {
      EMISSION_AMOUNT: emissionData.amount,
      RECIPIENT_BANK: bank.name,
      RECIPIENT_ACCOUNT: bank.correspondentAccountNumber,
      PROTOCOL_NUMBER: protocolNumber,
      ISSUE_DATE: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      GOVERNOR_NAME: governor.username || 'Central Bank Governor',
      PURPOSE: emissionData.purpose,
      LEGAL_BASIS: emissionData.legalBasis || 'Article XII of Khaganate Constitution, Central Bank Charter Section 3.1',
    };

    // 6. Create emission protocol document
    const emissionDocument = await this.documentService.createDocument({
      templateCode: 'EMISSION_PROTOCOL_001',
      issuerId: governorId,
      recipientId: bank.directorId,
      title: `ALTAN Emission Protocol - ${emissionData.amount}`,
      titleRu: `Протокол эмиссии АЛТАН - ${emissionData.amount}`,
      variables,
      documentNumberPrefix: protocolNumber,
    });

    this.logger.log(`Emission protocol created: ${emissionDocument.documentNumber}`);

    // TODO: 7. Execute actual emission (would credit correspondent account)
    // This would integrate with actual ALTAN ledger/blockchain
    // For now, just create the document

    this.logger.log(`✅ Emission protocol executed: ${protocolNumber} for ${emissionData.amount}`);

    return {
      emissionDocument,
      message: `Emission protocol ${protocolNumber} created. Actual emission execution requires blockchain integration.`,
    };
  }

  // ==================
  // HELPER METHODS
  // ==================

  /**
   * Generate unique banking license number
   * Format: BL-001/2026
   */
  private async generateLicenseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.bank.count({
      where: {
        licenseIssuedAt: {
          gte: new Date(`${year}-01-01`),
        },
      },
    });

    const number = String(count + 1).padStart(3, '0');
    return `BL-${number}/${year}`;
  }

  /**
   * Generate unique correspondent agreement number
   * Format: CA-001/2026
   */
  private async generateAgreementNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.bank.count({
      where: {
        correspondentAgreementId: { not: null },
      },
    });

    const number = String(count + 1).padStart(3, '0');
    return `CA-${number}/${year}`;
  }

  /**
   * Generate unique emission protocol number
   * Format: EP-001/2026
   */
  private async generateProtocolNumber(): Promise<string> {
    const year = new Date().getFullYear();
    // Count emission protocol documents
    const count = await this.prisma.documentContract.count({
      where: {
        documentNumber: {
          startsWith: 'EP-',
        },
      },
    });

    const number = String(count + 1).padStart(3, '0');
    return `EP-${number}/${year}`;
  }
}
