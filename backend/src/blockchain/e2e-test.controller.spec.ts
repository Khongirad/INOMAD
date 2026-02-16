import { Test, TestingModule } from '@nestjs/testing';
import { E2ETestController } from './e2e-test.controller';
import { E2ETestService } from './e2e-test.service';
import { BlockchainService } from './blockchain.service';
import { ForbiddenException } from '@nestjs/common';

describe('E2ETestController', () => {
  let controller: E2ETestController;
  const mockE2EService = {
    runAllTests: jest.fn().mockResolvedValue({ passed: 5, failed: 0 }),
  };
  const mockBlockchainService = {
    isAvailable: jest.fn().mockReturnValue(true),
    getTotalSeats: jest.fn().mockResolvedValue(100),
  };

  beforeEach(async () => {
    delete process.env.NODE_ENV;

    const module = await Test.createTestingModule({
      controllers: [E2ETestController],
      providers: [
        { provide: E2ETestService, useValue: mockE2EService },
        { provide: BlockchainService, useValue: mockBlockchainService },
      ],
    }).compile();
    controller = module.get(E2ETestController);
  });

  afterEach(() => { delete process.env.NODE_ENV; });

  it('should be defined', () => expect(controller).toBeDefined());

  // ============== runAllTests ==============

  it('runs all tests in non-production', async () => {
    const r = await controller.runAllTests();
    expect(r.passed).toBe(5);
  });

  it('blocks runAllTests in production', async () => {
    process.env.NODE_ENV = 'production';
    await expect(controller.runAllTests()).rejects.toThrow(ForbiddenException);
  });

  // ============== healthCheck ==============

  it('returns health when blockchain available', async () => {
    const r = await controller.healthCheck();
    expect(r.status).toBe('connected');
    expect(r.blockchain.available).toBe(true);
    expect(r.blockchain.totalSeats).toBe(100);
  });

  it('returns offline status when blockchain unavailable', async () => {
    mockBlockchainService.isAvailable.mockReturnValueOnce(false);
    const r = await controller.healthCheck();
    expect(r.status).toBe('offline');
    expect(r.blockchain.totalSeats).toBeNull();
  });

  it('handles getTotalSeats error gracefully', async () => {
    mockBlockchainService.getTotalSeats.mockRejectedValueOnce(new Error('fail'));
    const r = await controller.healthCheck();
    expect(r.status).toBe('connected');
    expect(r.blockchain.totalSeats).toBeNull();
  });

  it('blocks healthCheck in production', async () => {
    process.env.NODE_ENV = 'production';
    await expect(controller.healthCheck()).rejects.toThrow(ForbiddenException);
  });

  // ============== testContract ==============

  it('returns not implemented message', async () => {
    const r = await controller.testContract();
    expect(r.message).toBe('Not implemented yet');
  });

  it('blocks testContract in production', async () => {
    process.env.NODE_ENV = 'production';
    await expect(controller.testContract()).rejects.toThrow(ForbiddenException);
  });
});
