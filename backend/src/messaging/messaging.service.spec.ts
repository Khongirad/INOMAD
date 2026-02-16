import { Test, TestingModule } from '@nestjs/testing';
import { MessagingService } from './messaging.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MessagingService', () => {
  let service: MessagingService;
  let prisma: any;

  const mockConversation = {
    id: 'conv1', type: 'DIRECT_MESSAGE', name: null,
    organizationId: null, questId: null, contractId: null, caseId: null,
    createdAt: new Date(), updatedAt: new Date(),
    participants: [
      { userId: 'u1', role: 'MEMBER', user: { id: 'u1', username: 'user1' } },
      { userId: 'u2', role: 'MEMBER', user: { id: 'u2', username: 'user2' } },
    ],
  };

  const mockMessage = {
    id: 'msg1', conversationId: 'conv1', senderId: 'u1',
    body: 'Hello', replyToId: null, attachments: [], isEdited: false,
    isDeleted: false, editedAt: null, deletedAt: null, createdAt: new Date(),
    sender: { id: 'u1', username: 'user1' },
  };

  const mockParticipant = {
    userId: 'u1', conversationId: 'conv1', role: 'ADMIN',
    lastReadAt: new Date(), isMuted: false,
  };

  beforeEach(async () => {
    const mockPrisma = {
      conversation: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(mockConversation),
        update: jest.fn().mockResolvedValue(mockConversation),
      },
      conversationParticipant: {
        findUnique: jest.fn().mockResolvedValue(mockParticipant),
        findMany: jest.fn().mockResolvedValue([
          { userId: 'u2', isMuted: false },
        ]),
        create: jest.fn().mockResolvedValue({ userId: 'u3', role: 'MEMBER', user: { id: 'u3', username: 'u3' } }),
        update: jest.fn().mockResolvedValue({ ...mockParticipant, isMuted: true }),
        delete: jest.fn().mockResolvedValue(mockParticipant),
      },
      message: {
        create: jest.fn().mockResolvedValue(mockMessage),
        findMany: jest.fn().mockResolvedValue([mockMessage]),
        findUnique: jest.fn().mockResolvedValue(mockMessage),
        update: jest.fn().mockResolvedValue({ ...mockMessage, body: 'Edited' }),
      },
      notification: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(MessagingService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('createDirectMessage', () => {
    it('creates new DM', async () => {
      const r = await service.createDirectMessage('u1', 'u2');
      expect(r.id).toBe('conv1');
      expect(prisma.conversation.create).toHaveBeenCalled();
    });
    it('returns existing DM', async () => {
      prisma.conversation.findFirst.mockResolvedValue(mockConversation);
      const r = await service.createDirectMessage('u1', 'u2');
      expect(r.id).toBe('conv1');
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });
  });

  describe('createConversation', () => {
    it('creates group conversation', async () => {
      const r = await service.createConversation('u1', {
        name: 'Group', type: 'GROUP_CHAT' as any,
        participantIds: ['u2', 'u3'],
      });
      expect(r.id).toBe('conv1');
    });
    it('creates with context bindings', async () => {
      await service.createConversation('u1', {
        name: 'Org Chat', type: 'ORGANIZATION' as any,
        organizationId: 'org1', questId: 'q1', contractId: 'c1', caseId: 'cs1',
      });
      expect(prisma.conversation.create).toHaveBeenCalled();
    });
    it('deduplicates creator in participants', async () => {
      await service.createConversation('u1', {
        name: 'Group', type: 'GROUP_CHAT' as any,
        participantIds: ['u1', 'u2'],
      });
      expect(prisma.conversation.create).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('sends message', async () => {
      const r = await service.sendMessage('u1', 'conv1', 'Hello');
      expect(r.id).toBe('msg1');
      expect(prisma.conversation.update).toHaveBeenCalled();
      expect(prisma.notification.createMany).toHaveBeenCalled();
    });
    it('sends with attachments', async () => {
      await service.sendMessage('u1', 'conv1', 'File', undefined, ['file1.jpg']);
      expect(prisma.message.create).toHaveBeenCalled();
    });
    it('sends reply', async () => {
      await service.sendMessage('u1', 'conv1', 'Reply', 'msg0');
      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ replyToId: 'msg0' }),
        }),
      );
    });
    it('throws when not participant', async () => {
      prisma.conversationParticipant.findUnique.mockResolvedValue(null);
      await expect(service.sendMessage('u1', 'conv1', 'Hi')).rejects.toThrow('not a participant');
    });
    it('skips notifications when no other unmuted participants', async () => {
      prisma.conversationParticipant.findMany.mockResolvedValue([]);
      await service.sendMessage('u1', 'conv1', 'Hello');
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    it('returns messages', async () => {
      const r = await service.getMessages('u1', 'conv1');
      expect(r).toHaveLength(1);
    });
    it('returns with cursor pagination', async () => {
      await service.getMessages('u1', 'conv1', 'cursor1', 25);
      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 25, cursor: { id: 'cursor1' }, skip: 1 }),
      );
    });
    it('throws when not participant', async () => {
      prisma.conversationParticipant.findUnique.mockResolvedValue(null);
      await expect(service.getMessages('u1', 'conv1')).rejects.toThrow('not a participant');
    });
  });

  describe('getUserConversations', () => {
    it('returns conversations', async () => {
      prisma.conversationParticipant.findMany.mockResolvedValue([
        {
          lastReadAt: new Date(), isMuted: false, role: 'MEMBER',
          conversation: {
            ...mockConversation,
            messages: [mockMessage],
            participants: mockConversation.participants,
          },
        },
      ]);
      const r = await service.getUserConversations('u1');
      expect(r).toHaveLength(1);
      expect(r[0].unreadCount).toBe(0);
    });
    it('counts unread when no lastReadAt', async () => {
      prisma.conversationParticipant.findMany.mockResolvedValue([
        {
          lastReadAt: null, isMuted: false, role: 'MEMBER',
          conversation: {
            ...mockConversation,
            messages: [mockMessage],
            participants: mockConversation.participants,
          },
        },
      ]);
      const r = await service.getUserConversations('u1');
      expect(r[0].unreadCount).toBe(1);
    });
  });

  describe('addParticipant', () => {
    it('adds participant', async () => {
      const r = await service.addParticipant('u1', 'conv1', 'u3');
      expect(r.userId).toBe('u3');
    });
    it('throws when not admin', async () => {
      prisma.conversationParticipant.findUnique.mockResolvedValue({
        ...mockParticipant, role: 'MEMBER',
      });
      await expect(service.addParticipant('u1', 'conv1', 'u3')).rejects.toThrow('Only admins');
    });
    it('throws when admin not found', async () => {
      prisma.conversationParticipant.findUnique.mockResolvedValue(null);
      await expect(service.addParticipant('u1', 'conv1', 'u3')).rejects.toThrow('Only admins');
    });
  });

  describe('leaveConversation', () => {
    it('leaves conversation', async () => {
      await service.leaveConversation('u1', 'conv1');
      expect(prisma.conversationParticipant.delete).toHaveBeenCalled();
    });
  });

  describe('toggleMute', () => {
    it('toggles mute', async () => {
      const r = await service.toggleMute('u1', 'conv1');
      expect(prisma.conversationParticipant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isMuted: true },
        }),
      );
    });
    it('throws when not found', async () => {
      prisma.conversationParticipant.findUnique.mockResolvedValue(null);
      await expect(service.toggleMute('u1', 'conv1')).rejects.toThrow('not found');
    });
  });

  describe('editMessage', () => {
    it('edits message', async () => {
      await service.editMessage('u1', 'msg1', 'Edited');
      expect(prisma.message.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ body: 'Edited', isEdited: true }),
        }),
      );
    });
    it('throws when not found', async () => {
      prisma.message.findUnique.mockResolvedValue(null);
      await expect(service.editMessage('u1', 'bad', 'Edit')).rejects.toThrow('not found');
    });
    it('throws when not sender', async () => {
      prisma.message.findUnique.mockResolvedValue({ ...mockMessage, senderId: 'other' });
      await expect(service.editMessage('u1', 'msg1', 'Edit')).rejects.toThrow('Only sender');
    });
  });

  describe('deleteMessage', () => {
    it('deletes message', async () => {
      await service.deleteMessage('u1', 'msg1');
      expect(prisma.message.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isDeleted: true }),
        }),
      );
    });
    it('throws when not found', async () => {
      prisma.message.findUnique.mockResolvedValue(null);
      await expect(service.deleteMessage('u1', 'bad')).rejects.toThrow('not found');
    });
    it('throws when not sender', async () => {
      prisma.message.findUnique.mockResolvedValue({ ...mockMessage, senderId: 'other' });
      await expect(service.deleteMessage('u1', 'msg1')).rejects.toThrow('Only sender');
    });
  });
});
