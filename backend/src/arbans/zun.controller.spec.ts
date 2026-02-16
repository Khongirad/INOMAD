jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(),
    Wallet: jest.fn().mockImplementation(() => ({ address: '0xWALLET' })),
  },
}));

jest.mock('../typechain-types/factories/ArbanCompletion__factory', () => ({
  ArbanCompletion__factory: { connect: jest.fn() },
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ZunController } from './zun.controller';
import { ZunService } from './zun.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ZunController', () => {
  let controller: ZunController;

  beforeEach(async () => {
    const mockService = {
      formZun: jest.fn().mockResolvedValue({ zunId: 1 }),
      setZunElder: jest.fn().mockResolvedValue(undefined),
      getZun: jest.fn().mockResolvedValue({ id: 1, elderSeatId: 's1' }),
      getZunsByFamily: jest.fn().mockResolvedValue([]),
      syncFromBlockchain: jest.fn().mockResolvedValue(undefined),
    };
    const module = await Test.createTestingModule({
      controllers: [ZunController],
      providers: [{ provide: ZunService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get(ZunController);
  });

  const req = { user: { privateKey: '0xKEY' } };

  it('should be defined', () => expect(controller).toBeDefined());
  it('forms zun', async () => {
    const r = await controller.formZun({ familyArbanIds: [1, 2], elderSeatId: 's1' } as any, req);
    expect(r.zunId).toBe(1);
  });
  it('sets zun elder', async () => {
    const r = await controller.setZunElder(1, { elderSeatId: 's2' }, req);
    expect(r.success).toBe(true);
  });
  it('gets zun', async () => { await controller.getZun(1); });
  it('gets zuns by family', async () => { await controller.getZunsByFamily(1); });
  it('syncs from blockchain', async () => {
    const r = await controller.syncFromBlockchain(1);
    expect(r.success).toBe(true);
  });
});
