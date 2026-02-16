import { Test, TestingModule } from '@nestjs/testing';
import { ArchiveController } from './archive.controller';
import { DocumentTemplateService } from './document-template.service';
import { DocumentContractService } from './document-contract.service';
import { NotaryService } from './notary.service';
import { LegalService } from './legal.service';
import { TemplateSeederService } from './template-seeder.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ArchiveController', () => {
  let controller: ArchiveController;
  const req = { user: { userId: 'u1', seatId: 's1' }, ip: '127.0.0.1', headers: { 'user-agent': 'test-agent' } };

  const mockTemplate = { provide: DocumentTemplateService, useValue: {
    createTemplate: jest.fn().mockResolvedValue({ id: 't1' }),
    listTemplates: jest.fn().mockResolvedValue([]),
    getTemplate: jest.fn().mockResolvedValue({ id: 't1', code: 'BIRTH' }),
  }};
  const mockDocument = { provide: DocumentContractService, useValue: {
    createDocument: jest.fn().mockResolvedValue({ id: 'd1' }),
    getDocument: jest.fn().mockResolvedValue({ id: 'd1', issuerId: 'u1', recipientId: 'u2' }),
    getDocumentByNumber: jest.fn().mockResolvedValue({ id: 'd1', issuerId: 'u1', recipientId: 'u1' }),
    listDocuments: jest.fn().mockResolvedValue([]),
    signDocument: jest.fn().mockResolvedValue({ id: 'd1' }),
    submitForNotarization: jest.fn().mockResolvedValue({ id: 'd1' }),
    submitForLegal: jest.fn().mockResolvedValue({ id: 'd1' }),
    archiveDocument: jest.fn().mockResolvedValue({ id: 'd1' }),
    logAccess: jest.fn().mockResolvedValue(undefined),
  }};
  const mockNotary = { provide: NotaryService, useValue: {
    getPendingDocuments: jest.fn().mockResolvedValue([]),
    notarizeDocument: jest.fn().mockResolvedValue({ id: 'n1' }),
    getNotarization: jest.fn().mockResolvedValue({ id: 'n1' }),
    getNotaryRecords: jest.fn().mockResolvedValue([]),
    getRegistry: jest.fn().mockResolvedValue([]),
  }};
  const mockLegal = { provide: LegalService, useValue: {
    getPendingDocuments: jest.fn().mockResolvedValue([]),
    certifyDocument: jest.fn().mockResolvedValue({ id: 'l1' }),
    getCertification: jest.fn().mockResolvedValue({ id: 'l1' }),
    getLawyerCertifications: jest.fn().mockResolvedValue([]),
    getOpinions: jest.fn().mockResolvedValue([]),
    requestRevision: jest.fn().mockResolvedValue({ id: 'd1' }),
  }};
  const mockSeeder = { provide: TemplateSeederService, useValue: {
    seedTemplates: jest.fn().mockResolvedValue({ seeded: 5 }),
  }};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArchiveController],
      providers: [mockTemplate, mockDocument, mockNotary, mockLegal, mockSeeder],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(ArchiveController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  // Templates
  it('seeds templates', async () => { await controller.seedTemplates(req); });
  it('creates template', async () => { await controller.createTemplate(req, { code: 'X' }); });
  it('lists templates', async () => { await controller.listTemplates(); });
  it('lists templates by category', async () => { await controller.listTemplates('LEGAL'); });
  it('gets template', async () => { await controller.getTemplate('BIRTH'); });

  // Documents
  it('creates document', async () => {
    await controller.createDocument(req, {
      templateCode: 'BIRTH', title: 'Birth Cert', variables: { name: 'John' },
    });
  });

  it('gets document', async () => { await controller.getDocument('d1', req); });
  it('gets document by number', async () => { await controller.getDocumentByNumber('DOC-001', req); });
  it('lists documents', async () => { await controller.listDocuments({}); });
  it('signs document', async () => {
    await controller.signDocument('d1', req, { signerRole: 'ISSUER' as any, signature: '0x', publicKey: '0x' });
  });

  // Notary
  it('submits for notarization', async () => { await controller.submitForNotarization('d1', req); });
  it('submits for legal', async () => { await controller.submitForLegal('d1', req); });
  it('gets pending notarizations', async () => { await controller.getPendingNotarizations(); });
  it('notarizes document', async () => {
    await controller.notarizeDocument('d1', req, { signature: '0x', publicKey: '0x' });
  });
  it('gets notarization', async () => { await controller.getNotarization('d1'); });
  it('gets my notary records', async () => { await controller.getMyNotaryRecords(req); });
  it('gets notarial registry', async () => { await controller.getNotarialRegistry(); });
  it('gets notarial registry with filters', async () => {
    await controller.getNotarialRegistry('notary1', '2025-01-01', '2025-12-31');
  });

  // Legal
  it('gets pending legal', async () => { await controller.getPendingLegal(); });
  it('certifies document', async () => {
    await controller.certifyDocument('d1', req, {
      opinion: 'Compliant', compliant: true, signature: '0x', publicKey: '0x',
    });
  });
  it('gets certification', async () => { await controller.getCertification('d1'); });
  it('gets my certifications', async () => { await controller.getMyCertifications(req); });
  it('gets legal opinions', async () => { await controller.getLegalOpinions(); });
  it('gets legal opinions with filters', async () => {
    await controller.getLegalOpinions('lawyer1', 'true', '2025-01-01', '2025-12-31');
  });

  // Workflow
  it('requests revision', async () => {
    await controller.requestRevision('d1', req, { reason: 'Typo' });
  });
  it('archives document', async () => {
    await controller.archiveDocument('d1', req, { archiveNumber: 'ARC-001', blockchainTx: '0x' });
  });
});
