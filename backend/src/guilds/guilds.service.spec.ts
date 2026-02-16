import { Test, TestingModule } from '@nestjs/testing';
import { GuildsService } from './guilds.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('GuildsService', () => {
  let service: GuildsService;
  let prisma: any;

  const mockGuild = {
    id: 'g1', type: 'PROFESSIONAL', name: 'Engineers',
    description: 'Engineering guild', profession: { id: 'p1', name: 'Engineer' },
    members: [], tasks: [],
  };

  const mockPrisma = () => ({
    guild: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
    guildMember: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildsService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(GuildsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── createGuild ───────────────────────
  describe('createGuild', () => {
    it('should create a guild', async () => {
      prisma.guild.create.mockResolvedValue(mockGuild);
      const result = await service.createGuild({
        type: 'PROFESSIONAL' as any, name: 'Engineers',
        description: 'Engineering guild', professionId: 'p1',
      });
      expect(result.name).toBe('Engineers');
    });
  });

  // ─── getGuild ──────────────────────────
  describe('getGuild', () => {
    it('should return guild with members', async () => {
      prisma.guild.findUnique.mockResolvedValue(mockGuild);
      const result = await service.getGuild('g1');
      expect(result.id).toBe('g1');
    });

    it('should throw NotFoundException', async () => {
      prisma.guild.findUnique.mockResolvedValue(null);
      await expect(service.getGuild('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── listGuilds ────────────────────────
  describe('listGuilds', () => {
    it('should list all guilds', async () => {
      prisma.guild.findMany.mockResolvedValue([mockGuild]);
      const result = await service.listGuilds();
      expect(result).toHaveLength(1);
    });

    it('should filter by type', async () => {
      prisma.guild.findMany.mockResolvedValue([mockGuild]);
      const result = await service.listGuilds('PROFESSIONAL');
      expect(result).toHaveLength(1);
    });
  });

  // ─── joinGuild ─────────────────────────
  describe('joinGuild', () => {
    it('should join guild', async () => {
      prisma.guildMember.findUnique.mockResolvedValue(null);
      prisma.guildMember.create.mockResolvedValue({ guildId: 'g1', userId: 'u1', role: 'MEMBER' });
      const result = await service.joinGuild('g1', 'u1');
      expect(result.role).toBe('MEMBER');
    });

    it('should throw if already a member', async () => {
      prisma.guildMember.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.joinGuild('g1', 'u1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getGuildMembers ───────────────────
  describe('getGuildMembers', () => {
    it('should return guild members', async () => {
      prisma.guildMember.findMany.mockResolvedValue([{ userId: 'u1', user: { id: 'u1' } }]);
      const result = await service.getGuildMembers('g1');
      expect(result).toHaveLength(1);
    });
  });
});
