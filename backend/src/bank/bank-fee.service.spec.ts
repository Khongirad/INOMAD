import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BankFeeService } from './bank-fee.service';

describe('BankFeeService', () => {
  let service: BankFeeService;

  const createService = async (config: Record<string, any> = {}) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankFeeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => config[key]),
          },
        },
      ],
    }).compile();

    return module.get<BankFeeService>(BankFeeService);
  };

  describe('computeFee', () => {
    beforeEach(async () => {
      service = await createService({
        FEE_BPS: 3,
        INOMAD_FEE_BANK_REF: 'INOMAD-INC-001',
      });
    });

    it('should compute 0.03% fee on standard transfer', () => {
      // 1000 ALTAN * 0.03% = 0.3 ALTAN
      const fee = service.computeFee(1000);
      expect(fee).toBe(0.3);
    });

    it('should compute fee on small amount', () => {
      // 10 ALTAN * 0.03% = 0.003 ALTAN
      const fee = service.computeFee(10);
      expect(fee).toBe(0.003);
    });

    it('should compute fee on large amount', () => {
      // 1,000,000 ALTAN * 0.03% = 300 ALTAN
      const fee = service.computeFee(1000000);
      expect(fee).toBe(300);
    });

    it('should return 0 for zero amount', () => {
      expect(service.computeFee(0)).toBe(0);
    });

    it('should return 0 for negative amount', () => {
      expect(service.computeFee(-100)).toBe(0);
    });

    it('should round to 6 decimal places (ALTAN precision)', () => {
      // 1 ALTAN * 0.03% = 0.0003
      const fee = service.computeFee(1);
      expect(fee).toBe(0.0003);
      // Verify no floating point issues
      expect(fee.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
    });
  });

  describe('getInomadBankRef', () => {
    it('should return configured bankRef', async () => {
      service = await createService({
        FEE_BPS: 3,
        INOMAD_FEE_BANK_REF: 'INOMAD-INC-001',
      });

      expect(service.getInomadBankRef()).toBe('INOMAD-INC-001');
    });

    it('should return empty string when not configured', async () => {
      service = await createService({});

      expect(service.getInomadBankRef()).toBe('');
    });
  });

  describe('isEnabled', () => {
    it('should return true when bankRef is configured', async () => {
      service = await createService({
        INOMAD_FEE_BANK_REF: 'INOMAD-INC-001',
      });

      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when bankRef is not configured', async () => {
      service = await createService({});

      expect(service.isEnabled()).toBe(false);
    });
  });
});
