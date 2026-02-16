import { Test, TestingModule } from '@nestjs/testing';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';
import { BankAuthGuard } from './bank-auth.guard';

describe('BankController', () => {
  let controller: BankController;
  let service: any;
  const req = { bankUser: { bankRef: 'BANK-ABC' } } as any;

  beforeEach(async () => {
    const mockService = {
      getBalance: jest.fn().mockResolvedValue({ balance: '10000.00', bankRef: 'BANK-ABC' }),
      getHistory: jest.fn().mockResolvedValue([{ id: 'tx1' }]),
      transfer: jest.fn().mockResolvedValue({ txId: 'tx1', fee: '0.03' }),
      resolveBankRef: jest.fn().mockResolvedValue({ exists: true, displayName: 'Test' }),
    };
    const module = await Test.createTestingModule({
      controllers: [BankController],
      providers: [{ provide: BankService, useValue: mockService }],
    })
      .overrideGuard(BankAuthGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get(BankController);
    service = module.get(BankService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('gets balance', async () => {
    const r = await controller.getBalance(req);
    expect(r.ok).toBe(true);
  });

  it('gets history', async () => {
    const r = await controller.getHistory(req, '25');
    expect(r.ok).toBe(true);
    expect(service.getHistory).toHaveBeenCalledWith('BANK-ABC', 25);
  });

  it('caps history limit at 100', async () => {
    await controller.getHistory(req, '999');
    expect(service.getHistory).toHaveBeenCalledWith('BANK-ABC', 100);
  });

  it('defaults history limit to 50', async () => {
    await controller.getHistory(req);
    expect(service.getHistory).toHaveBeenCalledWith('BANK-ABC', 50);
  });

  it('transfers funds', async () => {
    const r = await controller.transfer(req, { recipientBankRef: 'BANK-XYZ', amount: 100, memo: 'test' } as any);
    expect(r.ok).toBe(true);
  });

  it('resolves bank ref', async () => {
    const r = await controller.resolve('BANK-XYZ');
    expect(r.ok).toBe(true);
  });

  it('returns not found for empty bankRef', async () => {
    const r = await controller.resolve('');
    expect(r.ok).toBe(false);
  });
});
