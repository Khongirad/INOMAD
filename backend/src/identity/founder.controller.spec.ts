import { Test, TestingModule } from '@nestjs/testing';
import { FounderController } from './founder.controller';
import { FounderService } from './founder.service';

describe('FounderController', () => {
  let controller: FounderController;
  const mockService = {
    getBootstrapStatus: jest.fn().mockResolvedValue({ totalCitizens: 5, isBootstrapped: false }),
    isFounder: jest.fn().mockResolvedValue(true),
    wasVerifiedByFounder: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [FounderController],
      providers: [{ provide: FounderService, useValue: mockService }],
    }).compile();
    controller = module.get(FounderController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('gets bootstrap status', async () => {
    const r = await controller.getBootstrapStatus();
    expect(r.totalCitizens).toBe(5);
  });

  it('checks if user is founder (true)', async () => {
    const r = await controller.checkIsFounder('u1');
    expect(r.isFounder).toBe(true);
    expect(r.status).toBeDefined();
  });

  it('checks if user is founder (false)', async () => {
    mockService.isFounder.mockResolvedValueOnce(false);
    const r = await controller.checkIsFounder('u2');
    expect(r.isFounder).toBe(false);
    expect(r.status).toBeNull();
  });

  it('checks verification by founder', async () => {
    const r = await controller.wasVerifiedByFounder('seat1');
    expect(r.seatId).toBe('seat1');
    expect(r.verifiedByFounder).toBe(true);
  });
});
