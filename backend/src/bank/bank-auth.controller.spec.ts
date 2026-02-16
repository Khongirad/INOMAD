import { Test, TestingModule } from '@nestjs/testing';
import { BankAuthController } from './bank-auth.controller';
import { BankAuthService } from './bank-auth.service';

describe('BankAuthController', () => {
  let controller: BankAuthController;
  const mockService = {
    generateNonce: jest.fn().mockResolvedValue({ nonce: 'abc123', expiresAt: new Date() }),
    issueTicket: jest.fn().mockResolvedValue({ ticket: 'tk_123', expiresAt: new Date(), seatId: 'seat1' }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [BankAuthController],
      providers: [{ provide: BankAuthService, useValue: mockService }],
    }).compile();
    controller = module.get(BankAuthController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('requests nonce', async () => {
    const r = await controller.requestNonce({ address: '0xabc' });
    expect(r.nonce).toBe('abc123');
    expect(mockService.generateNonce).toHaveBeenCalledWith('0xabc');
  });

  it('issues ticket', async () => {
    const r = await controller.issueTicket({ address: '0xabc', signature: '0xsig', nonce: 'abc123' });
    expect(r.ok).toBe(true);
    expect(r.ok).toBe(true);
    expect(mockService.issueTicket).toHaveBeenCalledWith('0xabc', '0xsig', 'abc123');
  });
});
