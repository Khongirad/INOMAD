import { Test, TestingModule } from '@nestjs/testing';
import { KhuralController } from './khural.controller';
import { KhuralService } from './khural.service';

describe('KhuralController', () => {
  let controller: KhuralController;
  const mockService = {
    createGroup: jest.fn().mockResolvedValue({ id: 'k1', name: 'Local Khural' }),
    listGroups: jest.fn().mockResolvedValue([{ id: 'k1' }]),
    getGroup: jest.fn().mockResolvedValue({ id: 'k1', name: 'Local Khural' }),
    applySeat: jest.fn().mockResolvedValue({ success: true }),
    assignSeat: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [KhuralController],
      providers: [{ provide: KhuralService, useValue: mockService }],
    }).compile();
    controller = module.get(KhuralController);
  });

  const req = { user: { id: 'u1' } };

  it('should be defined', () => expect(controller).toBeDefined());

  it('creates group', async () => {
    const r = await controller.createGroup({ name: 'Local Khural', level: 'LOCAL' } as any);
    expect(r.id).toBe('k1');
  });

  it('lists groups without filter', async () => {
    const r = await controller.listGroups();
    expect(r).toHaveLength(1);
  });

  it('lists groups with level filter', async () => {
    await controller.listGroups('REPUBLICAN');
    expect(mockService.listGroups).toHaveBeenCalledWith('REPUBLICAN');
  });

  it('gets group', async () => {
    const r = await controller.getGroup('k1');
    expect(r.name).toBe('Local Khural');
  });

  it('applies for seat', async () => {
    const r = await controller.applySeat('k1', { seatIndex: 0 } as any, req as any);
    expect(mockService.applySeat).toHaveBeenCalledWith('k1', 0, 'u1');
  });

  it('assigns seat', async () => {
    const r = await controller.assignSeat('k1', { seatIndex: 1, userId: 'u2' } as any, req as any);
    expect(mockService.assignSeat).toHaveBeenCalledWith('k1', 1, 'u2', 'u1');
  });
});
