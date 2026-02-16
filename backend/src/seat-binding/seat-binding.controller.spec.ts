import { Test, TestingModule } from '@nestjs/testing';
import { SeatBindingController } from './seat-binding.controller';
import { SeatBindingService } from './seat-binding.service';

describe('SeatBindingController', () => {
  let controller: SeatBindingController;
  let service: any;
  const req = { user: { id: 'u1', seatId: 's1' } } as any;

  beforeEach(async () => {
    const mockService = {
      bindSeatToUser: jest.fn().mockResolvedValue({ bound: true }),
      getSeatBindingStatus: jest.fn().mockResolvedValue({ seatId: 's1' }),
      verifySeatBinding: jest.fn().mockResolvedValue(true),
      syncSeatsFromBlockchain: jest.fn().mockResolvedValue({ synced: 2 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeatBindingController],
      providers: [{ provide: SeatBindingService, useValue: mockService }],
    }).compile();
    controller = module.get(SeatBindingController);
    service = module.get(SeatBindingService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('bindSeat', async () => { await controller.bindSeat({ seatId: 's1', walletAddress: '0x1' } as any, req); expect(service.bindSeatToUser).toHaveBeenCalledWith('u1', 's1', '0x1'); });
  it('getStatus', async () => { await controller.getStatus(req); expect(service.getSeatBindingStatus).toHaveBeenCalledWith('u1'); });
  it('getUserStatus', async () => { await controller.getUserStatus('u2'); expect(service.getSeatBindingStatus).toHaveBeenCalledWith('u2'); });
  it('verifyBinding', async () => { const r = await controller.verifyBinding(req); expect(r.valid).toBe(true); expect(r.userId).toBe('u1'); });
  it('syncSeats', async () => { await controller.syncSeats({ walletAddress: '0x1' } as any); expect(service.syncSeatsFromBlockchain).toHaveBeenCalledWith('0x1'); });
});
