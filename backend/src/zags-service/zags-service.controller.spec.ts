import { Test, TestingModule } from '@nestjs/testing';
import { ZagsServiceController } from './zags-service.controller';
import { ZagsServiceService } from './zags-service.service';

describe('ZagsServiceController', () => {
  let controller: ZagsServiceController;
  let service: any;
  const req = { user: { userId: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      checkEligibility: jest.fn().mockResolvedValue({ eligible: true }),
      createMarriageApplication: jest.fn().mockResolvedValue({ id: 'm1' }),
      getMyMarriages: jest.fn().mockResolvedValue([]),
      getPendingMarriages: jest.fn().mockResolvedValue([]),
      getMarriage: jest.fn().mockResolvedValue({ id: 'm1' }),
      getPendingConsents: jest.fn().mockResolvedValue([]),
      grantConsent: jest.fn().mockResolvedValue({ granted: true }),
      fileDivorce: jest.fn().mockResolvedValue({ id: 'd1' }),
      getCertificate: jest.fn().mockResolvedValue({ number: 'C123' }),
      verifyCertificate: jest.fn().mockResolvedValue({ valid: true }),
      getAllMarriages: jest.fn().mockResolvedValue([]),
      approveMarriage: jest.fn().mockResolvedValue({ approved: true }),
      rejectMarriage: jest.fn().mockResolvedValue({ rejected: true }),
      registerMarriage: jest.fn().mockResolvedValue({ registered: true }),
      finalizeDivorce: jest.fn().mockResolvedValue({ finalized: true }),
      createCivilUnion: jest.fn().mockResolvedValue({ id: 'cu1' }),
      recordWeddingGift: jest.fn().mockResolvedValue({ id: 'g1' }),
      getWeddingGifts: jest.fn().mockResolvedValue([]),
      getOfficerStats: jest.fn().mockResolvedValue({ total: 10 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZagsServiceController],
      providers: [{ provide: ZagsServiceService, useValue: mockService }],
    }).compile();
    controller = module.get(ZagsServiceController);
    service = module.get(ZagsServiceService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('checkEligibility', async () => { await controller.checkEligibility('u1'); expect(service.checkEligibility).toHaveBeenCalledWith('u1'); });
  it('createMarriageApplication', async () => { await controller.createMarriageApplication(req, {}); expect(service.createMarriageApplication).toHaveBeenCalledWith('u1', {}); });
  it('getMyMarriages', async () => { await controller.getMyMarriages(req); expect(service.getMyMarriages).toHaveBeenCalledWith('u1'); });
  it('getPendingMarriages', async () => { await controller.getPendingMarriages(); expect(service.getPendingMarriages).toHaveBeenCalled(); });
  it('getMarriage', async () => { await controller.getMarriage('m1'); expect(service.getMarriage).toHaveBeenCalledWith('m1'); });
  it('getPendingConsents', async () => { await controller.getPendingConsents(req); expect(service.getPendingConsents).toHaveBeenCalledWith('u1'); });
  it('grantConsent', async () => { await controller.grantConsent(req, 'm1', { approve: true }); expect(service.grantConsent).toHaveBeenCalledWith('u1', 'm1', true, undefined); });
  it('fileDivorce', async () => { await controller.fileDivorce(req, {}); expect(service.fileDivorce).toHaveBeenCalledWith('u1', {}); });
  it('getCertificate', async () => { await controller.getCertificate('C123'); expect(service.getCertificate).toHaveBeenCalledWith('C123'); });
  it('verifyCertificate', async () => { await controller.verifyCertificate('C123'); expect(service.verifyCertificate).toHaveBeenCalledWith('C123'); });
  it('publicCertificateLookup', async () => { await controller.publicCertificateLookup('C123'); expect(service.verifyCertificate).toHaveBeenCalledWith('C123'); });
  it('getAllMarriages', async () => { await controller.getAllMarriages(); expect(service.getAllMarriages).toHaveBeenCalled(); });
  it('approveMarriage', async () => { await controller.approveMarriage('m1', {}); expect(service.approveMarriage).toHaveBeenCalledWith('m1', undefined); });
  it('rejectMarriage', async () => { await controller.rejectMarriage('m1', { notes: 'N' }); expect(service.rejectMarriage).toHaveBeenCalledWith('m1', 'N'); });
  it('registerMarriage', async () => { await controller.registerMarriage(req, 'm1'); expect(service.registerMarriage).toHaveBeenCalledWith('m1', 'u1'); });
  it('finalizeDivorce', async () => { await controller.finalizeDivorce(req, 'd1'); expect(service.finalizeDivorce).toHaveBeenCalledWith('d1', 'u1'); });
  it('createCivilUnion', async () => { await controller.createCivilUnion(req, {}); expect(service.createCivilUnion).toHaveBeenCalledWith('u1', {}); });
  it('recordWeddingGift', async () => { await controller.recordWeddingGift('m1', { giverId: 'g1', giverName: 'G', recipientId: 'r1', description: 'D' }); expect(service.recordWeddingGift).toHaveBeenCalled(); });
  it('getWeddingGifts', async () => { await controller.getWeddingGifts('m1'); expect(service.getWeddingGifts).toHaveBeenCalledWith('m1'); });
  it('getOfficerStats', async () => { await controller.getOfficerStats(); expect(service.getOfficerStats).toHaveBeenCalled(); });
});
