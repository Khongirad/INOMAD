import { Test, TestingModule } from '@nestjs/testing';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

describe('HistoryController', () => {
  let controller: HistoryController;
  const req = { user: { sub: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      getHistory: jest.fn().mockResolvedValue([]),
      createRecord: jest.fn().mockResolvedValue({ id: 'r1' }),
      updateRecord: jest.fn().mockResolvedValue({ id: 'r1' }),
      deleteRecord: jest.fn().mockResolvedValue({ id: 'r1' }),
      publishRecord: jest.fn().mockResolvedValue({ id: 'r1' }),
      getUserNarratives: jest.fn().mockResolvedValue([]),
      getRecord: jest.fn().mockResolvedValue({ id: 'r1' }),
    };
    const module = await Test.createTestingModule({
      controllers: [HistoryController],
      providers: [{ provide: HistoryService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get(HistoryController);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('gets history', async () => { await controller.getHistory('NATIONAL' as any, 'scope1'); });
  it('gets all history', async () => { await controller.getHistory('NATIONAL' as any, 'scope1', 'true'); });
  it('creates record', async () => { await controller.createRecord(req, { title: 'Event' }); });
  it('updates record', async () => { await controller.updateRecord('r1', req, { title: 'Updated' }); });
  it('deletes record', async () => { await controller.deleteRecord('r1', req); });
  it('publishes record', async () => { await controller.publishRecord('r1', req); });
  it('gets user narratives', async () => { await controller.getUserNarratives('u1'); });
  it('gets record', async () => { await controller.getRecord('r1'); });
});
