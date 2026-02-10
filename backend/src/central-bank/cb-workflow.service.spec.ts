import { Test, TestingModule } from '@nestjs/testing';
import { CBWorkflowService } from './cb-workflow.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentTemplateService } from '../archive/document-template.service';
import { DocumentContractService } from '../archive/document-contract.service';
import { NotaryService } from '../archive/notary.service';
import { LegalService } from '../archive/legal.service';

describe('CbWorkflowService', () => {
  let service: CBWorkflowService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      bank: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    const templateService = { getTemplateByCode: jest.fn().mockResolvedValue({ id: 't1' }) };
    const contractService = { createContract: jest.fn().mockResolvedValue({ id: 'c1' }) };
    const notaryService = { notarizeDocument: jest.fn().mockResolvedValue({}) };
    const legalService = { certifyDocument: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CBWorkflowService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocumentTemplateService, useValue: templateService },
        { provide: DocumentContractService, useValue: contractService },
        { provide: NotaryService, useValue: notaryService },
        { provide: LegalService, useValue: legalService },
      ],
    }).compile();
    service = module.get<CBWorkflowService>(CBWorkflowService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
