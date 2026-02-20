import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  const mockUser = {
    id: 'u1',
    seatId: 'SEAT-001',
    username: 'testuser',
    passwordHash: 'hashed_secret',
    gender: null,
    dateOfBirth: null,
    ethnicity: [],
    birthPlace: null,
    clan: null,
    nationality: null,
    currentAddress: null,
    khuralSeats: [],
    guildMemberships: [],
    altanLedger: null,
    onboardingProgress: null,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  describe('findBySeatId', () => {
    it('returns user with relations', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: 'SEAT-1' });
      const r = await service.findBySeatId('SEAT-1');
      expect(r.seatId).toBe('SEAT-1');
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { seatId: 'SEAT-1' } }),
      );
    });
  });

  describe('findById', () => {
    it('returns user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      const r = await service.findById('u1');
      expect(r.id).toBe('u1');
    });
  });

  describe('getFullProfile', () => {
    it('returns user profile without passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const profile = await service.getFullProfile('u1');
      expect(profile.id).toBe('u1');
      expect(profile.username).toBe('testuser');
      expect((profile as any).passwordHash).toBeUndefined();
    });

    it('throws NotFoundException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getFullProfile('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('updates gender and dateOfBirth', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const updatedUser = {
        ...mockUser,
        gender: 'male',
        dateOfBirth: new Date('1990-01-15'),
      };
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('u1', {
        gender: 'male',
        dateOfBirth: '1990-01-15',
      });

      expect(result.gender).toBe('male');
      expect((result as any).passwordHash).toBeUndefined();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          gender: 'male',
          dateOfBirth: new Date('1990-01-15'),
        },
      });
    });

    it('updates ethnicity and clan', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const updatedUser = {
        ...mockUser,
        ethnicity: ['Mongol', 'Khalkha'],
        clan: 'Borjigin',
      };
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('u1', {
        ethnicity: ['Mongol', 'Khalkha'],
        clan: 'Borjigin',
      });

      expect(result.ethnicity).toEqual(['Mongol', 'Khalkha']);
      expect(result.clan).toBe('Borjigin');
    });

    it('updates birthPlace as JSON object', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const birthPlace = { city: 'Ulaanbaatar', country: 'Mongolia' };
      const updatedUser = { ...mockUser, birthPlace };
      prisma.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateProfile('u1', { birthPlace });

      expect(result.birthPlace).toEqual(birthPlace);
    });

    it('only updates provided fields (partial update)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, clan: 'Borjigin' });

      await service.updateProfile('u1', { clan: 'Borjigin' });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { clan: 'Borjigin' },
      });
    });

    it('throws NotFoundException for non-existent user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.updateProfile('nonexistent', { gender: 'female' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('handles empty DTO (no-op update)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await service.updateProfile('u1', {});

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {},
      });
      expect(result.id).toBe('u1');
    });
  });
});
