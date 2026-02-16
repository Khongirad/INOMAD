import { Test, TestingModule } from '@nestjs/testing';
import { TempleController } from './temple.controller';
import { TempleOfHeavenService } from './temple.service';

describe('TempleController', () => {
  let controller: TempleController;
  let service: any;

  beforeEach(async () => {
    const mockService = {
      submitRecord: jest.fn().mockResolvedValue({ id: 'r1' }),
      getRecord: jest.fn().mockResolvedValue({ id: 'r1' }),
      getRecordsByType: jest.fn().mockResolvedValue([]),
      getStatistics: jest.fn().mockResolvedValue({ total: 10 }),
      verifyRecord: jest.fn().mockResolvedValue({ verified: true }),
      makeDonation: jest.fn().mockResolvedValue({ amount: 100 }),
      getDonationBalance: jest.fn().mockResolvedValue({ balance: 500 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TempleController],
      providers: [{ provide: TempleOfHeavenService, useValue: mockService }],
    }).compile();
    controller = module.get(TempleController);
    service = module.get(TempleOfHeavenService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('submitRecord success', async () => { const r = await controller.submitRecord({ title: 'T' } as any); expect(r.success).toBe(true); });
  it('submitRecord error', async () => { service.submitRecord.mockRejectedValue(new Error('bad')); await expect(controller.submitRecord({} as any)).rejects.toThrow('bad'); });

  it('getRecord success', async () => { const r = await controller.getRecord('r1'); expect(r.success).toBe(true); });
  it('getRecord error', async () => { service.getRecord.mockRejectedValue(new Error('nf')); await expect(controller.getRecord('x')).rejects.toThrow('nf'); });

  it('getRecordsByType with type', async () => { const r = await controller.getRecordsByType('LIBRARY'); expect(r.success).toBe(true); expect(service.getRecordsByType).toHaveBeenCalledWith('LIBRARY'); });
  it('getRecordsByType without type -> stats', async () => { const r = await controller.getRecordsByType(); expect(r.success).toBe(true); expect(service.getStatistics).toHaveBeenCalled(); });
  it('getRecordsByType error', async () => { service.getRecordsByType.mockRejectedValue(new Error('err')); await expect(controller.getRecordsByType('X')).rejects.toThrow('err'); });

  it('verifyRecord success', async () => { const r = await controller.verifyRecord('r1', {} as any); expect(r.success).toBe(true); });
  it('verifyRecord error', async () => { service.verifyRecord.mockRejectedValue(new Error('err')); await expect(controller.verifyRecord('r1', {} as any)).rejects.toThrow('err'); });

  it('donate success', async () => { const r = await controller.donate({ amount: 100 } as any); expect(r.success).toBe(true); });
  it('donate error', async () => { service.makeDonation.mockRejectedValue(new Error('err')); await expect(controller.donate({} as any)).rejects.toThrow('err'); });

  it('getBalance success', async () => { const r = await controller.getBalance(); expect(r.success).toBe(true); });
  it('getBalance error', async () => { service.getDonationBalance.mockRejectedValue(new Error('err')); await expect(controller.getBalance()).rejects.toThrow('err'); });

  it('getStatistics success', async () => { const r = await controller.getStatistics(); expect(r.success).toBe(true); });
  it('getStatistics error', async () => { service.getStatistics.mockRejectedValue(new Error('err')); await expect(controller.getStatistics()).rejects.toThrow('err'); });
});
