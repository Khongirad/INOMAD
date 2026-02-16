import { Test, TestingModule } from '@nestjs/testing';
import { AcademyController } from './academy.controller';
import { AcademyOfSciencesService } from './academy.service';

describe('AcademyController', () => {
  let controller: AcademyController;
  let service: any;

  beforeEach(async () => {
    const mockService = {
      submitPatent: jest.fn().mockResolvedValue({ id: 'p1' }),
      reviewPatent: jest.fn().mockResolvedValue({ reviewed: true }),
      getPatent: jest.fn().mockResolvedValue({ id: 'p1' }),
      getPatentsBySubmitter: jest.fn().mockResolvedValue([]),
      registerDiscovery: jest.fn().mockResolvedValue({ id: 'd1' }),
      peerReviewDiscovery: jest.fn().mockResolvedValue({ reviewed: true }),
      getDiscovery: jest.fn().mockResolvedValue({ id: 'd1' }),
      getDiscoveriesByScientist: jest.fn().mockResolvedValue([]),
      requestGrant: jest.fn().mockResolvedValue({ id: 'g1' }),
      approveGrant: jest.fn().mockResolvedValue({ approved: true }),
      getGrant: jest.fn().mockResolvedValue({ id: 'g1' }),
      getGrantsByScientist: jest.fn().mockResolvedValue([]),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AcademyController],
      providers: [{ provide: AcademyOfSciencesService, useValue: mockService }],
    }).compile();
    controller = module.get(AcademyController);
    service = module.get(AcademyOfSciencesService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  // Patents
  it('submitPatent', async () => { await controller.submitPatent({} as any); expect(service.submitPatent).toHaveBeenCalled(); });
  it('submitPatent error', async () => { service.submitPatent.mockRejectedValue(new Error('err')); await expect(controller.submitPatent({} as any)).rejects.toThrow(); });
  it('reviewPatent', async () => { await controller.reviewPatent('p1', {} as any); expect(service.reviewPatent).toHaveBeenCalledWith('p1', {}); });
  it('reviewPatent error', async () => { service.reviewPatent.mockRejectedValue(new Error('err')); await expect(controller.reviewPatent('p1', {} as any)).rejects.toThrow(); });
  it('getPatent', async () => { await controller.getPatent('p1'); expect(service.getPatent).toHaveBeenCalledWith('p1'); });
  it('getPatent error', async () => { service.getPatent.mockRejectedValue(new Error('err')); await expect(controller.getPatent('p1')).rejects.toThrow(); });
  it('getPatentsBySubmitter', async () => { await controller.getPatentsBySubmitter('s1'); expect(service.getPatentsBySubmitter).toHaveBeenCalledWith('s1'); });
  it('getPatentsBySubmitter error', async () => { service.getPatentsBySubmitter.mockRejectedValue(new Error('err')); await expect(controller.getPatentsBySubmitter('s1')).rejects.toThrow(); });

  // Discoveries
  it('registerDiscovery', async () => { await controller.registerDiscovery({} as any); expect(service.registerDiscovery).toHaveBeenCalled(); });
  it('registerDiscovery error', async () => { service.registerDiscovery.mockRejectedValue(new Error('err')); await expect(controller.registerDiscovery({} as any)).rejects.toThrow(); });
  it('peerReviewDiscovery', async () => { await controller.peerReviewDiscovery('d1', {} as any); expect(service.peerReviewDiscovery).toHaveBeenCalledWith('d1', {}); });
  it('peerReviewDiscovery error', async () => { service.peerReviewDiscovery.mockRejectedValue(new Error('err')); await expect(controller.peerReviewDiscovery('d1', {} as any)).rejects.toThrow(); });
  it('getDiscovery', async () => { await controller.getDiscovery('d1'); expect(service.getDiscovery).toHaveBeenCalledWith('d1'); });
  it('getDiscovery error', async () => { service.getDiscovery.mockRejectedValue(new Error('err')); await expect(controller.getDiscovery('d1')).rejects.toThrow(); });
  it('getDiscoveriesByScientist', async () => { await controller.getDiscoveriesByScientist('s1'); expect(service.getDiscoveriesByScientist).toHaveBeenCalledWith('s1'); });
  it('getDiscoveriesByScientist error', async () => { service.getDiscoveriesByScientist.mockRejectedValue(new Error('err')); await expect(controller.getDiscoveriesByScientist('s1')).rejects.toThrow(); });

  // Grants
  it('requestGrant', async () => { await controller.requestGrant({} as any); expect(service.requestGrant).toHaveBeenCalled(); });
  it('requestGrant error', async () => { service.requestGrant.mockRejectedValue(new Error('err')); await expect(controller.requestGrant({} as any)).rejects.toThrow(); });
  it('approveGrant', async () => { await controller.approveGrant('g1', {} as any); expect(service.approveGrant).toHaveBeenCalledWith('g1', {}); });
  it('approveGrant error', async () => { service.approveGrant.mockRejectedValue(new Error('err')); await expect(controller.approveGrant('g1', {} as any)).rejects.toThrow(); });
  it('getGrant', async () => { await controller.getGrant('g1'); expect(service.getGrant).toHaveBeenCalledWith('g1'); });
  it('getGrant error', async () => { service.getGrant.mockRejectedValue(new Error('err')); await expect(controller.getGrant('g1')).rejects.toThrow(); });
  it('getGrantsByScientist', async () => { await controller.getGrantsByScientist('s1'); expect(service.getGrantsByScientist).toHaveBeenCalledWith('s1'); });
  it('getGrantsByScientist error', async () => { service.getGrantsByScientist.mockRejectedValue(new Error('err')); await expect(controller.getGrantsByScientist('s1')).rejects.toThrow(); });
});
