import { Test, TestingModule } from '@nestjs/testing';
import { CitizenshipController } from './citizenship.controller';
import { CitizenshipService } from './citizenship.service';
import { AuthGuard } from '../auth/auth.guard';

describe('CitizenshipController', () => {
  let controller: CitizenshipController;
  let service: any;
  const req = { user: { userId: 'u1', id: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      grantInitialRight: jest.fn().mockResolvedValue({ granted: true }),
      inheritRight: jest.fn().mockResolvedValue({ inherited: true }),
      revertToFund: jest.fn().mockResolvedValue({ reverted: true }),
      getRightHistory: jest.fn().mockResolvedValue([]),
      delegateKhuralSeat: jest.fn().mockResolvedValue({ delegated: true }),
      revokeKhuralDelegation: jest.fn().mockResolvedValue({ revoked: true }),
      applyForCitizenship: jest.fn().mockResolvedValue({ applied: true }),
      voteOnAdmission: jest.fn().mockResolvedValue({ voted: true }),
      listPendingAdmissions: jest.fn().mockResolvedValue([]),
      canParticipateInLegislature: jest.fn().mockResolvedValue(true),
      canParticipateInGovernment: jest.fn().mockResolvedValue(false),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CitizenshipController],
      providers: [{ provide: CitizenshipService, useValue: mockService }],
    }).overrideGuard(AuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(CitizenshipController);
    service = module.get(CitizenshipService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('grantInitialRight', async () => { await controller.grantInitialRight(req, { userId: 'u2' }); expect(service.grantInitialRight).toHaveBeenCalledWith('u2', 'u1'); });
  it('inheritRight', async () => { await controller.inheritRight({ fatherId: 'f1', sonId: 's1' }); expect(service.inheritRight).toHaveBeenCalledWith('f1', 's1'); });
  it('revertToFund', async () => { await controller.revertToFund({ userId: 'u2', reason: 'no heir' }); expect(service.revertToFund).toHaveBeenCalledWith('u2', 'no heir'); });
  it('getRightHistory', async () => { await controller.getRightHistory('u2'); expect(service.getRightHistory).toHaveBeenCalledWith('u2'); });
  it('delegateKhuralSeat', async () => { await controller.delegateKhuralSeat(req, { spouseId: 'sp1' }); expect(service.delegateKhuralSeat).toHaveBeenCalledWith('u1', 'sp1'); });
  it('revokeKhuralDelegation', async () => { await controller.revokeKhuralDelegation(req); expect(service.revokeKhuralDelegation).toHaveBeenCalledWith('u1'); });
  it('applyForCitizenship', async () => { await controller.applyForCitizenship(req); expect(service.applyForCitizenship).toHaveBeenCalledWith('u1'); });
  it('voteOnAdmission', async () => { await controller.voteOnAdmission('adm1', req, { vote: 'FOR' }); expect(service.voteOnAdmission).toHaveBeenCalledWith('adm1', 'u1', 'FOR', undefined); });
  it('listPendingAdmissions', async () => { await controller.listPendingAdmissions(); expect(service.listPendingAdmissions).toHaveBeenCalled(); });
  it('checkLegislativeEligibility', async () => { const r = await controller.checkLegislativeEligibility('u2'); expect(r.canParticipateInLegislature).toBe(true); });
  it('checkGovernmentEligibility', async () => { const r = await controller.checkGovernmentEligibility('u2'); expect(r.canParticipateInGovernment).toBe(false); });
});
