import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InvitationService', () => {
  let service: InvitationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      organization: { findUnique: jest.fn() },
      organizationMember: {
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'mem-1' }),
      },
      guildInvitation: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 'inv-1', status: 'PENDING' }),
        update: jest.fn(),
        delete: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      educationVerification: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [InvitationService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
  });

  describe('sendInvitation', () => {
    it('should throw NotFoundException for missing guild', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.sendInvitation({
        guildId: 'bad', inviterId: 'u1', inviteeId: 'u2',
      })).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-guild org', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'g1', type: 'ARBAN' });
      await expect(service.sendInvitation({
        guildId: 'g1', inviterId: 'u1', inviteeId: 'u2',
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if inviter not in guild', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'g1', type: 'GUILD' });
      prisma.organizationMember.findFirst.mockResolvedValue(null);
      await expect(service.sendInvitation({
        guildId: 'g1', inviterId: 'u1', inviteeId: 'u2',
      })).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if invitee already member', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'g1', type: 'GUILD' });
      prisma.organizationMember.findFirst
        .mockResolvedValueOnce({ id: 'mem-1' }) // inviter is member
        .mockResolvedValueOnce({ id: 'mem-2' }); // invitee already member
      await expect(service.sendInvitation({
        guildId: 'g1', inviterId: 'u1', inviteeId: 'u2',
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for duplicate pending invite', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'g1', type: 'GUILD' });
      prisma.organizationMember.findFirst
        .mockResolvedValueOnce({ id: 'mem-1' }) // inviter is member
        .mockResolvedValueOnce(null); // invitee not member
      prisma.guildInvitation.findFirst.mockResolvedValue({ id: 'exists' });
      await expect(service.sendInvitation({
        guildId: 'g1', inviterId: 'u1', inviteeId: 'u2',
      })).rejects.toThrow(BadRequestException);
    });

    it('should create invitation', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'g1', type: 'GUILD' });
      prisma.organizationMember.findFirst
        .mockResolvedValueOnce({ id: 'mem-1' }) // inviter is member
        .mockResolvedValueOnce(null); // invitee not member
      prisma.guildInvitation.findFirst.mockResolvedValue(null);
      const result = await service.sendInvitation({
        guildId: 'g1', inviterId: 'u1', inviteeId: 'u2',
      });
      expect(result.id).toBe('inv-1');
    });
  });

  describe('acceptInvitation', () => {
    it('should throw NotFoundException for missing invitation', async () => {
      prisma.guildInvitation.findUnique.mockResolvedValue(null);
      await expect(service.acceptInvitation('bad', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-invitee', async () => {
      prisma.guildInvitation.findUnique.mockResolvedValue({ id: 'inv-1', inviteeId: 'u2', status: 'PENDING' });
      await expect(service.acceptInvitation('inv-1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if already processed', async () => {
      prisma.guildInvitation.findUnique.mockResolvedValue({ id: 'inv-1', inviteeId: 'u1', status: 'ACCEPTED' });
      await expect(service.acceptInvitation('inv-1', 'u1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectInvitation', () => {
    it('should throw NotFoundException for missing invitation', async () => {
      prisma.guildInvitation.findUnique.mockResolvedValue(null);
      await expect(service.rejectInvitation('bad', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-invitee', async () => {
      prisma.guildInvitation.findUnique.mockResolvedValue({ id: 'inv-1', inviteeId: 'u2', status: 'PENDING' });
      await expect(service.rejectInvitation('inv-1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelInvitation', () => {
    it('should throw NotFoundException for missing invitation', async () => {
      prisma.guildInvitation.findUnique.mockResolvedValue(null);
      await expect(service.cancelInvitation('bad', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-inviter', async () => {
      prisma.guildInvitation.findUnique.mockResolvedValue({ id: 'inv-1', inviterId: 'u2', status: 'PENDING' });
      await expect(service.cancelInvitation('inv-1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should delete pending invitation', async () => {
      prisma.guildInvitation.findUnique.mockResolvedValue({ id: 'inv-1', inviterId: 'u1', status: 'PENDING' });
      await service.cancelInvitation('inv-1', 'u1');
      expect(prisma.guildInvitation.delete).toHaveBeenCalled();
    });
  });

  describe('getInvitationsSent', () => {
    it('should return sent invitations', async () => {
      await service.getInvitationsSent('u1');
      expect(prisma.guildInvitation.findMany).toHaveBeenCalled();
    });
  });

  describe('getInvitationsReceived', () => {
    it('should return received invitations', async () => {
      await service.getInvitationsReceived('u1');
      expect(prisma.guildInvitation.findMany).toHaveBeenCalled();
    });
  });

  describe('getGuildInvitations', () => {
    it('should throw ForbiddenException for non-leader', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue(null);
      await expect(service.getGuildInvitations('g1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('expireOldInvitations', () => {
    it('should expire old pending invitations', async () => {
      const count = await service.expireOldInvitations(30);
      expect(count).toBe(2);
    });
  });
});
