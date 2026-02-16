import { Test, TestingModule } from '@nestjs/testing';
import { DigitalSealController } from './digital-seal.controller';
import { DigitalSealService } from './digital-seal.service';

describe('DigitalSealController', () => {
  let controller: DigitalSealController;
  let service: any;

  const mockSeal = { id: 's1', documentHash: '0xABC', approvalCount: 0, executed: false };

  beforeEach(async () => {
    const mockService = {
      createSeal: jest.fn().mockResolvedValue(mockSeal),
      approveSeal: jest.fn().mockResolvedValue({ ...mockSeal, approvalCount: 1 }),
      revokeSeal: jest.fn().mockResolvedValue(mockSeal),
      executeSeal: jest.fn().mockResolvedValue({ ...mockSeal, executed: true }),
      getSeal: jest.fn().mockResolvedValue(mockSeal),
      getSealStatus: jest.fn().mockResolvedValue({ ...mockSeal, onChain: { approved: true, executed: false, approvalCount: 1 } }),
      getSealsForUser: jest.fn().mockResolvedValue([mockSeal]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DigitalSealController],
      providers: [{ provide: DigitalSealService, useValue: mockService }],
    }).compile();

    controller = module.get(DigitalSealController);
    service = module.get(DigitalSealService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('creates seal', async () => {
    const r = await controller.createSeal({ docHash: '0x1', requiredApprovals: 2, signerSeatIds: ['s1', 's2'] } as any);
    expect(r.id).toBe('s1');
  });

  it('throws on create error', async () => {
    service.createSeal.mockRejectedValue(new Error('invalid'));
    await expect(controller.createSeal({} as any)).rejects.toThrow('invalid');
  });

  it('approves seal', async () => {
    const r = await controller.approveSeal('s1', { seatId: 's1' } as any);
    expect(r).toBeDefined();
  });

  it('throws on approve error', async () => {
    service.approveSeal.mockRejectedValue(new Error('fail'));
    await expect(controller.approveSeal('s1', {} as any)).rejects.toThrow('fail');
  });

  it('revokes seal', async () => {
    const r = await controller.revokeSeal('s1', { seatId: 's1' } as any);
    expect(r).toBeDefined();
  });

  it('throws on revoke error', async () => {
    service.revokeSeal.mockRejectedValue(new Error('fail'));
    await expect(controller.revokeSeal('s1', {} as any)).rejects.toThrow();
  });

  it('executes seal', async () => {
    const r = await controller.executeSeal('s1', { seatId: 's1' } as any);
    expect(r).toBeDefined();
  });

  it('gets seal', async () => {
    const r = await controller.getSeal('s1');
    expect(r.id).toBe('s1');
  });

  it('throws when seal not found', async () => {
    service.getSeal.mockResolvedValue(null);
    await expect(controller.getSeal('nonexist')).rejects.toThrow('not found');
  });

  it('gets seal status', async () => {
    const r = await controller.getSealStatus('s1');
    expect(r).toBeDefined();
  });

  it('gets seals for user', async () => {
    const r = await controller.getSealsForUser('seat1');
    expect(r.length).toBe(1);
  });
});
