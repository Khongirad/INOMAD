import { Test, TestingModule } from '@nestjs/testing';
import { BankHierarchyService } from './bank-hierarchy.service';
import { ConfigService } from '@nestjs/config';

describe('BankHierarchyService', () => {
  let service: BankHierarchyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankHierarchyService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('false'), // blockchain disabled
          },
        },
      ],
    }).compile();

    service = module.get<BankHierarchyService>(BankHierarchyService);
  });

  describe('registerEmployee', () => {
    it('should throw when contract not initialized', async () => {
      await expect(
        service.registerEmployee({ seatId: 1, wallet: '0xAddr', bankArbanId: 1 }),
      ).rejects.toThrow('Contract not initialized');
    });
  });

  describe('getEmployee', () => {
    it('should throw when contract not initialized', async () => {
      await expect(service.getEmployee(1)).rejects.toThrow('Contract not initialized');
    });
  });

  describe('getHierarchyPath', () => {
    it('should throw when contract not initialized', async () => {
      await expect(service.getHierarchyPath(1)).rejects.toThrow('Contract not initialized');
    });
  });

  describe('updatePerformance', () => {
    it('should throw when contract not initialized', async () => {
      await expect(service.updatePerformance(1, 50)).rejects.toThrow('Contract not initialized');
    });
  });

  describe('canBePromoted', () => {
    it('should throw when contract not initialized', async () => {
      await expect(service.canBePromoted(1)).rejects.toThrow('Contract not initialized');
    });
  });
});
