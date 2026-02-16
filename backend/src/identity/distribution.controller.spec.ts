import { Test, TestingModule } from '@nestjs/testing';
import { DistributionController } from './distribution.controller';
import { CitizenDistributionService } from './citizen-distribution.service';

describe('DistributionController (identity)', () => {
  let controller: DistributionController;
  const mockService = {
    getDistributionStatus: jest.fn().mockResolvedValue({ totalDistributed: 10, remaining: 90 }),
    hasReceivedDistribution: jest.fn().mockResolvedValue(true),
    checkEligibility: jest.fn().mockResolvedValue({ eligible: true, reason: null }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [DistributionController],
      providers: [{ provide: CitizenDistributionService, useValue: mockService }],
    }).compile();
    controller = module.get(DistributionController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('gets distribution status', async () => {
    const r = await controller.getDistributionStatus();
    expect(r.totalDistributed).toBe(10);
  });

  it('checks received (true)', async () => {
    const r = await controller.hasReceived('seat1');
    expect(r.seatId).toBe('seat1');
    expect(r.hasReceived).toBe(true);
  });

  it('checks received (false)', async () => {
    mockService.hasReceivedDistribution.mockResolvedValueOnce(false);
    const r = await controller.hasReceived('seat2');
    expect(r.hasReceived).toBe(false);
  });

  it('checks eligibility', async () => {
    const r = await controller.checkEligibility('u1');
    expect(r.eligible).toBe(true);
  });
});
