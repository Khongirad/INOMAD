import { Test, TestingModule } from '@nestjs/testing';
import { InvitationService } from './invitation.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('InvitationService', () => {
  let service: InvitationService;
  let prisma: any;

  const mockPrisma = () => ({
    organization: { findUnique: jest.fn() },
    organizationMember: { findFirst: jest.fn(), create: jest.fn() },
    guildInvitation: {
      findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(),
      create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), delete: jest.fn(),
    },
    educationVerification: { findFirst: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(InvitationService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('sendInvitation', () => {
    const dto = { guildId: 'g1', inviterId: 'u1', inviteeId: 'u2' };

    it('should throw if guild not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.sendInvitation(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw if not a guild', async () => {
      prisma.organization.findUnique.mockResolvedValue({ type: 'COMPANY' });
      await expect(service.sendInvitation(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if inviter is not member', async () => {
      prisma.organization.findUnique.mockResolvedValue({ type: 'GUILD' });
      prisma.organizationMember.findFirst.mockResolvedValueOnce(null);
      await expect(service.sendInvitation(dto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw if invitee is already member', async () => {
      prisma.organization.findUnique.mockResolvedValue({ type: 'GUILD' });
      prisma.organizationMember.findFirst
        .mockResolvedValueOnce({ id: 'mem1' }) // inviter is member
        .mockResolvedValueOnce({ id: 'mem2' }); // invitee already member
      await expect(service.sendInvitation(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if pending invitation exists', async () => {
      prisma.organization.findUnique.mockResolvedValue({ type: 'GUILD' });
      prisma.organizationMember.findFirst
        .mockResolvedValueOnce({ id: 'mem1' }) // inviter
        .mockResolvedValueOnce(null); // invitee not member
      prisma.guildInvitation.findFirst.mockResolvedValue({ id: 'inv1' });
      await expect(service.sendInvitation(dto)).rejects.toThrow(BadRequestException);
    });

    it('should create invitation successfully', async () => {
      prisma.organization.findUnique.mockResolvedValue({ type: 'GUILD' });
      prisma.organizationMember.findFirst
        .mockResolvedValueOnce({ id: 'mem1' })
        .mockResolvedValueOnce(null);
      prisma.guildInvitation.findFirst.mockResolvedValue(null);
      prisma.guildInvitation.create.mockResolvedValue({
        id: 'inv1', guildId: 'g1', inviterId: 'u1', inviteeId: 'u2', status: 'PENDING',
      });
      const result = await service.sendInvitation(dto);
      expect(result.status).toBe('PENDING');
    });

    it('should throw if education required but missing', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        type: 'GUILD', requiresEducation: true, fieldOfStudy: 'CS',
      });
      prisma.organizationMember.findFirst
        .mockResolvedValueOnce({ id: 'mem1' })
        .mockResolvedValueOnce(null);
      prisma.guildInvitation.findFirst.mockResolvedValue(null);
      prisma.educationVerification.findFirst.mockResolvedValue(null);
      await expect(service.sendInvitation(dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('acceptInvitation', () => {
    it('should throw if not found', async () => {
      prisma.guildInvitation.findUnique.mockResolvedValue(null);
      await expect(service.acceptInvitation('inv1', 'u2')).rejects.toThrow(NotFoundException);
    });

    it('should throw if not the invitee', async () => {
      prisma.guildInvitation.findUnique.mockResolvedValue({ inviteeId: 'other', status: 'PENDING' });
      await expect(service.acceptInvitation('inv1', 'u2')).rejects.toThrow(ForbiddenException);
    });

    it('should throw if already processed', async () => {
      prisma.guildInvitation.findUnique.mockResolvedValue({ inviteeId: 'u2', status: 'ACCEPTED' });
      await expect(service.acceptInvitation('inv1', 'u2')).rejects.toThrow(BadRequestException);
    });

    it('should accept and create membership', async () => {
      prisma.guildInvitation.findUnique.mockResolvedValue({
        inviteeId: 'u2', status: 'PENDING', guildId: 'g1', inviterId: 'u1',
      });
      prisma.guildInvitation.update.mockResolvedValue({ status: 'ACCEPTED' });
      prisma.organizationMember.create.mockResolvedValue({});
      const result = await service.acceptInvitation('inv1', 'u2');
      expect(result.status).toBe('ACCEPTED');
      expect(prisma.organizationMember.create).toHaveBeenCalled();
    });
  });

  describe('rejectInvitation', () => {
    it('should reject invitation', async () => {
      prisma.guildInvitation.findUnique.mockResolvedValue({ inviteeId: 'u2', status: 'PENDING' });
      prisma.guildInvitation.update.mockResolvedValue({ status: 'REJECTED' });
      const result = await service.rejectInvitation('inv1', 'u2');
      expect(result.status).toBe('REJECTED');
    });
  });

  describe('cancelInvitation', () => {
    it('should throw if not inviter', async () => {
      prisma.guildInvitation.findUnique.mockResolvedValue({ inviterId: 'other', status: 'PENDING' });
      await expect(service.cancelInvitation('inv1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should cancel pending invitation', async () => {
      prisma.guildInvitation.findUnique.mockResolvedValue({ inviterId: 'u1', status: 'PENDING' });
      prisma.guildInvitation.delete.mockResolvedValue({});
      await service.cancelInvitation('inv1', 'u1');
      expect(prisma.guildInvitation.delete).toHaveBeenCalled();
    });
  });

  describe('getInvitationsSent', () => {
    it('should return invitations', async () => {
      prisma.guildInvitation.findMany.mockResolvedValue([{ id: '1' }]);
      const result = await service.getInvitationsSent('u1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getInvitationsReceived', () => {
    it('should filter by status', async () => {
      prisma.guildInvitation.findMany.mockResolvedValue([]);
      await service.getInvitationsReceived('u2', 'PENDING' as any);
      expect(prisma.guildInvitation.findMany).toHaveBeenCalled();
    });
  });

  describe('getGuildInvitations', () => {
    it('should throw if not leader', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue(null);
      await expect(service.getGuildInvitations('g1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('expireOldInvitations', () => {
    it('should expire old invitations', async () => {
      prisma.guildInvitation.updateMany.mockResolvedValue({ count: 3 });
      const result = await service.expireOldInvitations(30);
      expect(result).toBe(3);
    });
  });

  describe('getInvitationChain', () => {
    it('should return invitation chain for user in guild', async () => {
      prisma.organizationMember.findFirst
        .mockResolvedValueOnce({
          user: { id: 'u2', username: 'bob' },
          inviter: { id: 'u1', username: 'alice' },
          invitedBy: 'u1',
          joinedAt: new Date(),
        })
        .mockResolvedValueOnce({
          user: { id: 'u1', username: 'alice' },
          inviter: null,
          invitedBy: null,
          joinedAt: new Date(),
        });
      const result = await service.getInvitationChain('u2', 'g1');
      expect(result).toHaveLength(2);
    });
  });

  describe('hasVerifiedEducation', () => {
    it('should return true when education is verified', async () => {
      prisma.educationVerification.findFirst.mockResolvedValue({ id: 'ev1', isVerified: true });
      const result = await (service as any).hasVerifiedEducation('u1', 'Computer Science');
      expect(result).toBe(true);
    });

    it('should return false when no education record', async () => {
      prisma.educationVerification.findFirst.mockResolvedValue(null);
      const result = await (service as any).hasVerifiedEducation('u1', 'Computer Science');
      expect(result).toBe(false);
    });
  });

  describe('cancelInvitation edge cases', () => {
    it('should throw if invitation is not pending', async () => {
      prisma.guildInvitation.findUnique.mockResolvedValue({ inviterId: 'u1', status: 'ACCEPTED' });
      await expect(service.cancelInvitation('inv1', 'u1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getInvitationsReceived without filter', () => {
    it('should return all invitations when no status filter', async () => {
      prisma.guildInvitation.findMany.mockResolvedValue([{ id: '1' }, { id: '2' }]);
      const result = await service.getInvitationsReceived('u2');
      expect(result).toHaveLength(2);
    });
  });
});
