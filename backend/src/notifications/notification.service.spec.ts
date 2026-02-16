import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let prisma: any;

  const mockNotification = {
    id: 'n1', userId: 'u1', type: 'SYSTEM', title: 'Test',
    body: 'Body', icon: null, linkUrl: null, sourceOrgId: null,
    sourceUserId: null, resourceId: null, resourceType: null,
    isRead: false, readAt: null, isDismissed: false, dismissedAt: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      notification: {
        create: jest.fn().mockResolvedValue(mockNotification),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([mockNotification]),
        findUnique: jest.fn().mockResolvedValue(mockNotification),
        count: jest.fn().mockResolvedValue(5),
        update: jest.fn().mockResolvedValue({ ...mockNotification, isRead: true }),
        updateMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
      organizationMember: {
        findMany: jest.fn().mockResolvedValue([
          { userId: 'u1' }, { userId: 'u2' }, { userId: 'u3' },
        ]),
      },
      $transaction: jest.fn().mockResolvedValue([
        [mockNotification], 5, 3,
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(NotificationService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('create', () => {
    it('creates notification', async () => {
      const r = await service.create({
        userId: 'u1', type: 'SYSTEM' as any,
        title: 'Test', body: 'Body',
      });
      expect(r.id).toBe('n1');
    });
  });

  describe('notifyOrganization', () => {
    it('sends notifications to org members', async () => {
      const r = await service.notifyOrganization('org1', {
        type: 'SYSTEM' as any, title: 'Org News', body: 'Body',
      });
      expect(r.sent).toBe(3);
      expect(prisma.notification.createMany).toHaveBeenCalled();
    });
    it('excludes specified user', async () => {
      const r = await service.notifyOrganization('org1', {
        type: 'SYSTEM' as any, title: 'News', body: 'Body',
      }, 'u1');
      expect(r.sent).toBe(2);
    });
    it('skips when no members remain', async () => {
      prisma.organizationMember.findMany.mockResolvedValue([{ userId: 'u1' }]);
      const r = await service.notifyOrganization('org1', {
        type: 'SYSTEM' as any, title: 'News', body: 'Body',
      }, 'u1');
      expect(r.sent).toBe(0);
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });
  });

  describe('getForUser', () => {
    it('returns paginated notifications', async () => {
      const r = await service.getForUser('u1');
      expect(r.data).toHaveLength(1);
      expect(r.unreadCount).toBe(3);
      expect(r.pagination.page).toBe(1);
    });
    it('applies unreadOnly filter', async () => {
      await service.getForUser('u1', { unreadOnly: true });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
    it('applies type filter', async () => {
      await service.getForUser('u1', { type: 'SYSTEM' as any });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
    it('applies pagination', async () => {
      await service.getForUser('u1', { page: 2, limit: 10 });
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('marks notification as read', async () => {
      await service.markAsRead('n1', 'u1');
      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isRead: true }),
        }),
      );
    });
    it('throws when not found', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);
      await expect(service.markAsRead('bad', 'u1')).rejects.toThrow('not found');
    });
    it('throws when not owner', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        ...mockNotification, userId: 'other',
      });
      await expect(service.markAsRead('n1', 'u1')).rejects.toThrow('not found');
    });
  });

  describe('markAllAsRead', () => {
    it('marks all as read', async () => {
      const r = await service.markAllAsRead('u1');
      expect(r.markedAsRead).toBe(3);
    });
  });

  describe('dismiss', () => {
    it('dismisses notification', async () => {
      await service.dismiss('n1', 'u1');
      expect(prisma.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isDismissed: true }),
        }),
      );
    });
  });

  describe('getUnreadCount', () => {
    it('returns unread count', async () => {
      const r = await service.getUnreadCount('u1');
      expect(r.unreadCount).toBe(5);
    });
  });
});
