import { Test, TestingModule } from '@nestjs/testing';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';
import { AuthGuard } from '../auth/auth.guard';

describe('TaxController', () => {
  let controller: TaxController;
  let service: any;
  const req = { user: { userId: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      generateTaxRecord: jest.fn().mockResolvedValue({ id: 'tr1' }),
      fileTaxReturn: jest.fn().mockResolvedValue({ filed: true }),
      payTax: jest.fn().mockResolvedValue({ paid: true }),
      getTaxHistory: jest.fn().mockResolvedValue([]),
      getTaxRecord: jest.fn().mockResolvedValue({ id: 'tr1' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaxController],
      providers: [{ provide: TaxService, useValue: mockService }],
    }).overrideGuard(AuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(TaxController);
    service = module.get(TaxService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('generateTaxRecord', async () => { await controller.generateTaxRecord(req, '2025'); expect(service.generateTaxRecord).toHaveBeenCalledWith('u1', 2025); });
  it('fileTaxReturn', async () => { await controller.fileTaxReturn(req, 'tr1'); expect(service.fileTaxReturn).toHaveBeenCalledWith('u1', 'tr1'); });
  it('payTax', async () => { await controller.payTax(req, 'tr1'); expect(service.payTax).toHaveBeenCalledWith('u1', 'tr1'); });
  it('getTaxHistory', async () => { await controller.getTaxHistory(req); expect(service.getTaxHistory).toHaveBeenCalledWith('u1'); });
  it('getTaxRecord', async () => { await controller.getTaxRecord('tr1'); expect(service.getTaxRecord).toHaveBeenCalledWith('tr1'); });
});
