import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RegistrationService', () => {
  let service: RegistrationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      khuralGroup: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      khuralSeat: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      khuralEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RegistrationService>(RegistrationService);
  });

  describe('assignTerritory', () => {
    it('should throw for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.assignTerritory('unknown', 'Bayangol'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create tumen when none exists for district', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.khuralGroup.findFirst.mockResolvedValue(null);

      // Create new tumen
      prisma.khuralGroup.create
        .mockResolvedValueOnce({ id: 'tumen-1', name: 'Bayangol Tumen I', childGroups: [] }) // tumen
        .mockResolvedValueOnce({ id: 'myangan-1', name: 'M1' }) // myangan
        .mockResolvedValueOnce({ id: 'zuun-1', name: 'Z1' }) // zuun
        .mockResolvedValueOnce({ id: 'arban-1', name: 'A1' }); // arban

      // findAvailableChild returns null (need to create)
      prisma.khuralGroup.findMany.mockResolvedValue([]);
      prisma.khuralGroup.count.mockResolvedValue(0);

      // Seats
      prisma.khuralSeat.findMany.mockResolvedValue([]);
      prisma.khuralSeat.create.mockResolvedValue({ id: 'seat-0', index: 0, isLeaderSeat: true });

      prisma.user.update.mockResolvedValue({});

      const result = await service.assignTerritory('user-1', 'Bayangol');

      expect(result.seatIndex).toBe(0);
      expect(result.seatId).toBeDefined();
    });
  });

  describe('initiateRegistration', () => {
    it('should create user with CITIZEN role and DRAFT status', async () => {
      prisma.user.create.mockResolvedValue({
        id: 'new-user',
        seatId: 'TEMP-123',
        role: 'CITIZEN',
        verificationStatus: 'DRAFT',
        walletStatus: 'LOCKED',
      });

      const result = await service.initiateRegistration({
        birthPlace: 'Ulaanbaatar',
        ethnicity: ['Khalkha'],
        clan: 'Borjigon',
      });

      expect(result.role).toBe('CITIZEN');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: 'CITIZEN',
          walletStatus: 'LOCKED',
          verificationStatus: 'DRAFT',
        }),
      });
    });
  });

  describe('getUpdatedUser', () => {
    it('should return user by ID', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', seatId: 'SEAT-001' });

      const result = await service.getUpdatedUser('user-1');

      expect(result.id).toBe('user-1');
    });
  });
});
