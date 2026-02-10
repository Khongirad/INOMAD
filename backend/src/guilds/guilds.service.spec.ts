import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GuildsService } from './guilds.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GuildsService', () => {
  let service: GuildsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      guild: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      guildMember: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuildsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<GuildsService>(GuildsService);
  });

  describe('createGuild', () => {
    it('should create guild with profession', async () => {
      prisma.guild.create.mockResolvedValue({
        id: 'guild-1', name: 'Builders', type: 'TRADE', profession: { id: 'p1' },
      });
      const result = await service.createGuild({
        type: 'TRADE' as any, name: 'Builders', description: 'Build things', professionId: 'p1',
      } as any);
      expect(result.id).toBe('guild-1');
    });
  });

  describe('getGuild', () => {
    it('should throw NotFoundException for missing guild', async () => {
      prisma.guild.findUnique.mockResolvedValue(null);
      await expect(service.getGuild('bad')).rejects.toThrow(NotFoundException);
    });

    it('should return guild with members', async () => {
      prisma.guild.findUnique.mockResolvedValue({
        id: 'guild-1', name: 'Builders', members: [], tasks: [],
      });
      const result = await service.getGuild('guild-1');
      expect(result.id).toBe('guild-1');
    });
  });

  describe('listGuilds', () => {
    it('should list all guilds', async () => {
      await service.listGuilds();
      expect(prisma.guild.findMany).toHaveBeenCalled();
    });

    it('should filter by type', async () => {
      await service.listGuilds('TRADE');
      expect(prisma.guild.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { type: 'TRADE' } }),
      );
    });
  });

  describe('joinGuild', () => {
    it('should reject duplicate membership', async () => {
      prisma.guildMember.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.joinGuild('guild-1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should create membership', async () => {
      prisma.guildMember.findUnique.mockResolvedValue(null);
      prisma.guildMember.create.mockResolvedValue({
        guildId: 'guild-1', userId: 'u1', role: 'MEMBER',
      });
      const result = await service.joinGuild('guild-1', 'u1');
      expect(result.role).toBe('MEMBER');
    });
  });

  describe('getGuildMembers', () => {
    it('should return members for guild', async () => {
      prisma.guildMember.findMany.mockResolvedValue([{ userId: 'u1' }]);
      const result = await service.getGuildMembers('guild-1');
      expect(result).toHaveLength(1);
    });
  });
});
