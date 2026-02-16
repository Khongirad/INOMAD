import { Test, TestingModule } from '@nestjs/testing';
import { BankFeeService } from './bank-fee.service';
import { ConfigService } from '@nestjs/config';

describe('BankFeeService', () => {
  let service: BankFeeService;

  const mockConfig = () => ({
    get: jest.fn((key: string) => {
      switch (key) {
        case 'FEE_BPS': return 3;
        case 'INOMAD_FEE_BANK_REF': return 'INOMAD-FEE-REF';
        default: return undefined;
      }
    }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankFeeService,
        { provide: ConfigService, useFactory: mockConfig },
      ],
    }).compile();
    service = module.get(BankFeeService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('computeFee', () => {
    it('should compute 0.03% fee', () => {
      const fee = service.computeFee(10000);
      expect(fee).toBe(3); // 10000 * 3 / 10000
    });

    it('should return 0 for zero amount', () => {
      expect(service.computeFee(0)).toBe(0);
    });

    it('should return 0 for negative amount', () => {
      expect(service.computeFee(-100)).toBe(0);
    });

    it('should round to 6 decimal places', () => {
      const fee = service.computeFee(1);
      expect(fee).toBe(0.0003);
    });
  });

  describe('getInomadBankRef', () => {
    it('should return configured bank ref', () => {
      expect(service.getInomadBankRef()).toBe('INOMAD-FEE-REF');
    });
  });

  describe('isEnabled', () => {
    it('should return true when configured', () => {
      expect(service.isEnabled()).toBe(true);
    });
  });
});
