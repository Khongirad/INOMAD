import { Test, TestingModule } from '@nestjs/testing';
import { JusticeController } from './justice.controller';
import { CouncilOfJusticeService } from './justice.service';

describe('JusticeController', () => {
  let controller: JusticeController;
  let service: any;

  beforeEach(async () => {
    const mockService = {
      nominateMember: jest.fn().mockResolvedValue({ id: 'm1' }),
      approveMember: jest.fn().mockResolvedValue({ approved: true }),
      getMember: jest.fn().mockResolvedValue({ id: 'm1' }),
      getMemberBySeatId: jest.fn().mockResolvedValue({ id: 'm1' }),
      fileCase: jest.fn().mockResolvedValue({ id: 'c1' }),
      assignCase: jest.fn().mockResolvedValue({ assigned: true }),
      ruleOnCase: jest.fn().mockResolvedValue({ ruled: true }),
      getCase: jest.fn().mockResolvedValue({ id: 'c1' }),
      getCasesByPlaintiff: jest.fn().mockResolvedValue([]),
      getCasesByDefendant: jest.fn().mockResolvedValue([]),
      registerPrecedent: jest.fn().mockResolvedValue({ id: 'p1' }),
      getPrecedent: jest.fn().mockResolvedValue({ id: 'p1' }),
      getPrecedentsByCase: jest.fn().mockResolvedValue([]),
      nominateJudge: jest.fn().mockResolvedValue({ id: 'n1' }),
      getNominations: jest.fn().mockResolvedValue([]),
      approveNomination: jest.fn().mockResolvedValue({ approved: true }),
      getDashboardStats: jest.fn().mockResolvedValue({ total: 10 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JusticeController],
      providers: [{ provide: CouncilOfJusticeService, useValue: mockService }],
    }).compile();
    controller = module.get(JusticeController);
    service = module.get(CouncilOfJusticeService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  // Members
  it('nominateMember', async () => { await controller.nominateMember({} as any); expect(service.nominateMember).toHaveBeenCalled(); });
  it('nominateMember error', async () => { service.nominateMember.mockRejectedValue(new Error('err')); await expect(controller.nominateMember({} as any)).rejects.toThrow(); });
  it('approveMember', async () => { await controller.approveMember('m1', {} as any); expect(service.approveMember).toHaveBeenCalledWith('m1', {}); });
  it('approveMember error', async () => { service.approveMember.mockRejectedValue(new Error('err')); await expect(controller.approveMember('m1', {} as any)).rejects.toThrow(); });
  it('getMember', async () => { await controller.getMember('m1'); expect(service.getMember).toHaveBeenCalledWith('m1'); });
  it('getMember error', async () => { service.getMember.mockRejectedValue(new Error('err')); await expect(controller.getMember('m1')).rejects.toThrow(); });
  it('getMemberBySeatId', async () => { await controller.getMemberBySeatId('s1'); expect(service.getMemberBySeatId).toHaveBeenCalledWith('s1'); });
  it('getMemberBySeatId error', async () => { service.getMemberBySeatId.mockRejectedValue(new Error('err')); await expect(controller.getMemberBySeatId('s1')).rejects.toThrow(); });

  // Cases
  it('fileCase', async () => { await controller.fileCase({} as any); expect(service.fileCase).toHaveBeenCalled(); });
  it('fileCase error', async () => { service.fileCase.mockRejectedValue(new Error('err')); await expect(controller.fileCase({} as any)).rejects.toThrow(); });
  it('assignCase', async () => { await controller.assignCase('c1', {} as any); expect(service.assignCase).toHaveBeenCalledWith('c1', {}); });
  it('assignCase error', async () => { service.assignCase.mockRejectedValue(new Error('err')); await expect(controller.assignCase('c1', {} as any)).rejects.toThrow(); });
  it('ruleOnCase', async () => { await controller.ruleOnCase('c1', {} as any); expect(service.ruleOnCase).toHaveBeenCalledWith('c1', {}); });
  it('ruleOnCase error', async () => { service.ruleOnCase.mockRejectedValue(new Error('err')); await expect(controller.ruleOnCase('c1', {} as any)).rejects.toThrow(); });
  it('getCase', async () => { await controller.getCase('c1'); expect(service.getCase).toHaveBeenCalledWith('c1'); });
  it('getCase error', async () => { service.getCase.mockRejectedValue(new Error('err')); await expect(controller.getCase('c1')).rejects.toThrow(); });
  it('getCasesByPlaintiff', async () => { await controller.getCasesByPlaintiff('s1'); expect(service.getCasesByPlaintiff).toHaveBeenCalledWith('s1'); });
  it('getCasesByPlaintiff error', async () => { service.getCasesByPlaintiff.mockRejectedValue(new Error('err')); await expect(controller.getCasesByPlaintiff('s1')).rejects.toThrow(); });
  it('getCasesByDefendant', async () => { await controller.getCasesByDefendant('s1'); expect(service.getCasesByDefendant).toHaveBeenCalledWith('s1'); });
  it('getCasesByDefendant error', async () => { service.getCasesByDefendant.mockRejectedValue(new Error('err')); await expect(controller.getCasesByDefendant('s1')).rejects.toThrow(); });

  // Precedents
  it('registerPrecedent', async () => { await controller.registerPrecedent({} as any); expect(service.registerPrecedent).toHaveBeenCalled(); });
  it('registerPrecedent error', async () => { service.registerPrecedent.mockRejectedValue(new Error('err')); await expect(controller.registerPrecedent({} as any)).rejects.toThrow(); });
  it('getPrecedent', async () => { await controller.getPrecedent('p1'); expect(service.getPrecedent).toHaveBeenCalledWith('p1'); });
  it('getPrecedent error', async () => { service.getPrecedent.mockRejectedValue(new Error('err')); await expect(controller.getPrecedent('p1')).rejects.toThrow(); });
  it('getPrecedentsByCase', async () => { await controller.getPrecedentsByCase('1'); expect(service.getPrecedentsByCase).toHaveBeenCalledWith(1); });
  it('getPrecedentsByCase error', async () => { service.getPrecedentsByCase.mockRejectedValue(new Error('err')); await expect(controller.getPrecedentsByCase('1')).rejects.toThrow(); });

  // Nominations
  it('nominateJudge', async () => { await controller.nominateJudge({ candidateId: 'c', nominatorId: 'n', reason: 'r' }); expect(service.nominateJudge).toHaveBeenCalled(); });
  it('nominateJudge error', async () => { service.nominateJudge.mockRejectedValue(new Error('err')); await expect(controller.nominateJudge({ candidateId: 'c', nominatorId: 'n', reason: 'r' })).rejects.toThrow(); });
  it('getNominations', async () => { await controller.getNominations(); expect(service.getNominations).toHaveBeenCalled(); });
  it('getNominations error', async () => { service.getNominations.mockRejectedValue(new Error('err')); await expect(controller.getNominations()).rejects.toThrow(); });
  it('approveNomination', async () => { await controller.approveNomination('n1', { approverId: 'a1' }); expect(service.approveNomination).toHaveBeenCalledWith('n1', 'a1'); });
  it('approveNomination error', async () => { service.approveNomination.mockRejectedValue(new Error('err')); await expect(controller.approveNomination('n1', { approverId: 'a1' })).rejects.toThrow(); });

  // Dashboard
  it('getDashboardStats', async () => { await controller.getDashboardStats(); expect(service.getDashboardStats).toHaveBeenCalled(); });
  it('getDashboardStats error', async () => { service.getDashboardStats.mockRejectedValue(new Error('err')); await expect(controller.getDashboardStats()).rejects.toThrow(); });
});
