jest.mock('../typechain-types/factories/ArbadCompletion__factory', () => ({
  ArbadCompletion__factory: { connect: jest.fn() },
}));
jest.mock('../blockchain/abis/arbadCompletion.abi', () => ({
  ArbadCompletion_ABI: [],
}));
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    Wallet: jest.fn().mockImplementation(() => ({})),
  },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { FamilyArbadController } from './family-arbad.controller';
import { FamilyArbadService } from './family-arbad.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('FamilyArbadController', () => {
  let controller: FamilyArbadController;
  let service: any;
  const req = { user: { sub: 'u1', privateKey: '0xKEY' } };

  beforeEach(async () => {
    const mockService = {
      registerMarriage: jest.fn().mockResolvedValue({ arbadId: 1, txHash: '0x1' }),
      addChild: jest.fn().mockResolvedValue(undefined),
      changeHeir: jest.fn().mockResolvedValue(undefined),
      setKhuralRepresentative: jest.fn().mockResolvedValue(undefined),
      getKhuralRepresentatives: jest.fn().mockResolvedValue([]),
      getFamilyArbad: jest.fn().mockResolvedValue({ arbadId: 1 }),
      getFamilyArbadBySeat: jest.fn().mockResolvedValue({ arbadId: 1 }),
      checkKhuralEligibility: jest.fn().mockResolvedValue(true),
      syncFromBlockchain: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FamilyArbadController],
      providers: [{ provide: FamilyArbadService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(FamilyArbadController);
    service = module.get(FamilyArbadService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('registers marriage', async () => {
    const r = await controller.registerMarriage(
      { husbandSeatId: 'h1', wifeSeatId: 'w1' }, req,
    );
    expect(r.arbadId).toBe(1);
  });

  it('adds child', async () => {
    const r = await controller.addChild(1, { childSeatId: 'c1' }, req);
    expect(r.success).toBe(true);
  });

  it('changes heir', async () => {
    const r = await controller.changeHeir(1, { newHeirSeatId: 'c1' }, req);
    expect(r.success).toBe(true);
  });

  it('sets khural rep', async () => {
    const r = await controller.setKhuralRep(
      1, { repSeatId: 'h1', birthYear: 1990 }, req,
    );
    expect(r.success).toBe(true);
  });

  it('gets khural representatives', async () => {
    await controller.getKhuralRepresentatives();
    expect(service.getKhuralRepresentatives).toHaveBeenCalled();
  });

  it('gets family arbad by id', async () => {
    const r = await controller.getFamilyArbad(1);
    expect(r.arbadId).toBe(1);
  });

  it('gets family arbad by seat', async () => {
    await controller.getFamilyArbadBySeat('seat1');
    expect(service.getFamilyArbadBySeat).toHaveBeenCalledWith('seat1');
  });

  it('checks khural eligibility', async () => {
    const r = await controller.checkKhuralEligibility(1);
    expect(r.eligible).toBe(true);
  });

  it('syncs from blockchain', async () => {
    const r = await controller.syncFromBlockchain(1);
    expect(r.success).toBe(true);
  });
});
