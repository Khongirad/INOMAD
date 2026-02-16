import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { AuthGuard } from '../auth/auth.guard';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: any;
  const req = { user: { userId: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      getForUser: jest.fn().mockResolvedValue({ items: [] }),
      getUnreadCount: jest.fn().mockResolvedValue({ count: 5 }),
      markAsRead: jest.fn().mockResolvedValue({ read: true }),
      markAllAsRead: jest.fn().mockResolvedValue({ count: 5 }),
      dismiss: jest.fn().mockResolvedValue({ dismissed: true }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [{ provide: NotificationService, useValue: mockService }],
    }).overrideGuard(AuthGuard).useValue({ canActivate: () => true }).compile();
    controller = module.get(NotificationController);
    service = module.get(NotificationService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('getNotifications', async () => { await controller.getNotifications(req, 'true', undefined, '1', '10'); expect(service.getForUser).toHaveBeenCalledWith('u1', { unreadOnly: true, type: undefined, page: 1, limit: 10 }); });
  it('getNotifications defaults', async () => { await controller.getNotifications(req); expect(service.getForUser).toHaveBeenCalledWith('u1', { unreadOnly: false, type: undefined, page: 1, limit: 20 }); });
  it('getUnreadCount', async () => { await controller.getUnreadCount(req); expect(service.getUnreadCount).toHaveBeenCalledWith('u1'); });
  it('markAsRead', async () => { await controller.markAsRead('n1', req); expect(service.markAsRead).toHaveBeenCalledWith('n1', 'u1'); });
  it('markAllAsRead', async () => { await controller.markAllAsRead(req); expect(service.markAllAsRead).toHaveBeenCalledWith('u1'); });
  it('dismiss', async () => { await controller.dismiss('n1', req); expect(service.dismiss).toHaveBeenCalledWith('n1', 'u1'); });
});
