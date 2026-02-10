import { Test, TestingModule } from '@nestjs/testing';
import { TaxService } from './tax.service';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('TaxService', () => {
  let service: TaxService;
  let blockchain: any;

  const mockTaxEngine = {
    quoteTax: jest.fn(),
    TAX_BPS: jest.fn(),
    REPUBLIC_BPS: jest.fn(),
    CONFED_BPS: jest.fn(),
    confederationAccountId: jest.fn(),
    republicAccountIdOf: jest.fn(),
    isCollector: jest.fn(),
    connect: jest.fn(),
  };

  beforeEach(async () => {
    blockchain = {
      getTaxEngineContract: jest.fn().mockReturnValue(mockTaxEngine),
      getProvider: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxService,
        { provide: BlockchainService, useValue: blockchain },
      ],
    }).compile();

    service = module.get<TaxService>(TaxService);
  });

  describe('quoteTax', () => {
    it('should return tax breakdown', async () => {
      mockTaxEngine.quoteTax.mockResolvedValue([
        BigInt('7000000000000000'), // republic 0.007
        BigInt('3000000000000000'), // confed 0.003
      ]);

      const result = await service.quoteTax('0.1');
      expect(result.taxRate).toBe(10);
      expect(result.republicTax).toBeDefined();
      expect(result.confederationTax).toBeDefined();
    });

    it('should propagate blockchain errors', async () => {
      mockTaxEngine.quoteTax.mockRejectedValue(new Error('contract error'));
      await expect(service.quoteTax('100')).rejects.toThrow('contract error');
    });
  });

  describe('getTaxStats', () => {
    it('should return rate percentages', async () => {
      mockTaxEngine.TAX_BPS.mockResolvedValue(1000n);
      mockTaxEngine.REPUBLIC_BPS.mockResolvedValue(700n);
      mockTaxEngine.CONFED_BPS.mockResolvedValue(300n);

      const result = await service.getTaxStats();
      expect(result.taxRate).toBe(10);
      expect(result.republicShare).toBe(7);
      expect(result.confederationShare).toBe(3);
    });
  });

  describe('getConfederationAccountId', () => {
    it('should return account ID', async () => {
      mockTaxEngine.confederationAccountId.mockResolvedValue('0xCONFED');
      const result = await service.getConfederationAccountId();
      expect(result).toBe('0xCONFED');
    });
  });

  describe('getRepublicAccountId', () => {
    it('should return republic account by key', async () => {
      mockTaxEngine.republicAccountIdOf.mockResolvedValue('0xREPUBLIC');
      const result = await service.getRepublicAccountId('key1');
      expect(result).toBe('0xREPUBLIC');
    });
  });

  describe('isCollector', () => {
    it('should check collector status', async () => {
      mockTaxEngine.isCollector.mockResolvedValue(true);
      expect(await service.isCollector('0xABC')).toBe(true);
    });

    it('should return false for non-collector', async () => {
      mockTaxEngine.isCollector.mockResolvedValue(false);
      expect(await service.isCollector('0xDEF')).toBe(false);
    });
  });
});
