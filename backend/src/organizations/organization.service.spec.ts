import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { PrismaService } from '../prisma/prisma.service';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      organization: {
        create: jest.fn().mockResolvedValue({ id: 'org-1', name: 'Test Org' }),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      organizationMember: {
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'mem-1' }),
        delete: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      organizationRating: {
        create: jest.fn().mockResolvedValue({}),
        aggregate: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      organizationRevenue: {
        create: jest.fn().mockResolvedValue({}),
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrganizationService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
  });

  describe('createOrganization', () => {
    it('should throw NotFoundException when leader not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.createOrganization({
        name: 'Test', type: 'ARBAN' as any, leaderId: 'bad', level: 1,
      })).rejects.toThrow(NotFoundException);
    });

    it('should create organization when leader exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      const result = await service.createOrganization({
        name: 'Test', type: 'ARBAN' as any, leaderId: 'u1', level: 1,
      });
      expect(result.id).toBe('org-1');
    });
  });

  describe('getOrganization', () => {
    it('should throw NotFoundException for missing org', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.getOrganization('bad')).rejects.toThrow(NotFoundException);
    });

    it('should return org with relations', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'org-1', name: 'Test' });
      const result = await service.getOrganization('org-1');
      expect(result.name).toBe('Test');
    });
  });

  describe('addMember', () => {
    it('should throw NotFoundException for missing org', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.addMember('bad', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if already a member', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        members: [{ userId: 'u1', leftAt: null }],
      });
      await expect(service.addMember('org-1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should add member to org', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        members: [],
      });
      const result = await service.addMember('org-1', 'u1');
      expect(result.id).toBe('mem-1');
    });
  });

  describe('transferLeadership', () => {
    it('should throw ForbiddenException when new leader is not a member', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue(null);
      await expect(service.transferLeadership('org-1', 'u2')).rejects.toThrow(ForbiddenException);
    });

    it('should transfer leadership when member exists', async () => {
      prisma.organizationMember.findFirst.mockResolvedValue({ id: 'mem-1', userId: 'u2' });
      prisma.organization.update.mockResolvedValue({ id: 'org-1', leaderId: 'u2' });
      const result = await service.transferLeadership('org-1', 'u2');
      expect(result.leaderId).toBe('u2');
    });
  });

  describe('getLeaderboard', () => {
    it('should return sorted organizations', async () => {
      await service.getLeaderboard();
      expect(prisma.organization.findMany).toHaveBeenCalled();
    });
  });

  describe('deleteOrganization', () => {
    it('should delete organization', async () => {
      prisma.organization.delete.mockResolvedValue({ id: 'org-1' });
      await service.deleteOrganization('org-1');
      expect(prisma.organization.delete).toHaveBeenCalledWith({ where: { id: 'org-1' } });
    });
  });

  describe('updateOrganization', () => {
    it('should update organization', async () => {
      prisma.organization.update.mockResolvedValue({ id: 'org-1', name: 'Updated' });
      const result = await service.updateOrganization('org-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });
  });
});
