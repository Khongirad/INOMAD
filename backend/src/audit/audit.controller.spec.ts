import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

describe('AuditController', () => {
  let controller: AuditController;
  const mockService = {
    getPublicHistory: jest.fn().mockResolvedValue([{ id: 'h1', action: 'CREATE' }]),
    getLogs: jest.fn().mockResolvedValue([{ id: 'l1', level: 'INFO' }]),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: mockService }],
    }).compile();
    controller = module.get(AuditController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('gets public history with defaults', async () => {
    const r = await controller.getPublicHistory(undefined as any, undefined as any);
    expect(r).toHaveLength(1);
    expect(mockService.getPublicHistory).toHaveBeenCalledWith(50, 0);
  });

  it('gets public history with custom params', async () => {
    await controller.getPublicHistory('10', '5');
    expect(mockService.getPublicHistory).toHaveBeenCalledWith(10, 5);
  });

  it('gets logs with defaults', async () => {
    const r = await controller.getLogs({ user: { id: 'u1' } } as any, undefined as any, undefined as any);
    expect(r).toHaveLength(1);
    expect(mockService.getLogs).toHaveBeenCalledWith(50, 0);
  });

  it('gets logs with custom params', async () => {
    await controller.getLogs({ user: { id: 'u1' } } as any, '25', '10');
    expect(mockService.getLogs).toHaveBeenCalledWith(25, 10);
  });
});
