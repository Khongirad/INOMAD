import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationService } from './registration.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RegistrationService', () => {
  let service: RegistrationService;
  let prisma: any;

  const mockUser = { id: 'u1', seatId: null, role: 'CITIZEN' };
  const mockTumed = { id: 'tum1', level: 'TUMED', name: 'Novosibirsk Tumed I', childGroups: [] };
  const mockMyangad = { id: 'mya1', level: 'MYANGAD', name: 'Novosibirsk Tumed I - Myangad 1' };
  const mockZuud = { id: 'zun1', level: 'ZUUN', name: 'Myangad 1 - Zuud 1' };
  const mockArbad = { id: 'arb1', level: 'ARBAD', name: 'Zuud 1 - Arbad 1' };
  const mockSeat = { id: 'seat1', groupId: 'arb1', index: 0, isLeaderSeat: true, occupantUserId: null };

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockUser, ...data }),
        ),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'new-u', ...data }),
        ),
      },
      khuralGroup: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: `grp-${Date.now()}`, ...data, childGroups: [] }),
        ),
        count: jest.fn().mockResolvedValue(0),
      },
      khuralSeat: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: `s-${data.index}`, ...data, occupantUserId: null }),
        ),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockSeat, ...data }),
        ),
        count: jest.fn().mockResolvedValue(0),
      },
      khuralEvent: {
        create: jest.fn().mockResolvedValue({ id: 'ev1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(RegistrationService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('assignTerritory', () => {
    it('throws when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.assignTerritory('bad', 'district'))
        .rejects.toThrow('User not found');
    });

    it('creates full hierarchy and assigns seat for new district', async () => {
      // No existing groups — all will be created fresh
      prisma.khuralGroup.findFirst.mockResolvedValue(null);
      prisma.khuralGroup.findMany.mockResolvedValue([]);
      prisma.khuralGroup.count.mockResolvedValue(0);
      prisma.khuralSeat.findMany.mockResolvedValue([]);

      let createCallIndex = 0;
      prisma.khuralGroup.create.mockImplementation(({ data }: any) => {
        createCallIndex++;
        return Promise.resolve({
          id: `grp-${createCallIndex}`,
          ...data,
          childGroups: [],
          seats: [],
        });
      });

      const r = await service.assignTerritory('u1', 'Novosibirsk');
      expect(r.seatId).toBeDefined();
      expect(r.seatIndex).toBe(0);
      expect(prisma.khuralEvent.create).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('reuses existing tumed', async () => {
      prisma.khuralGroup.findFirst.mockResolvedValue(mockTumed);
      prisma.khuralGroup.findMany.mockResolvedValue([]);
      prisma.khuralGroup.count.mockResolvedValue(0);
      prisma.khuralSeat.findMany.mockResolvedValue([]);

      let idx = 0;
      prisma.khuralGroup.create.mockImplementation(({ data }: any) => {
        idx++;
        return Promise.resolve({ id: `g-${idx}`, ...data, childGroups: [], seats: [] });
      });

      const r = await service.assignTerritory('u1', 'Novosibirsk');
      // Should not create a new tumed since one exists
      expect(r.tumed.id).toBe('tum1');
    });

    it('uses empty seat in existing arbad', async () => {
      prisma.khuralGroup.findFirst
        .mockResolvedValueOnce(mockTumed);
      
      // findAvailableChild returns a group for each level
      prisma.khuralGroup.findMany
        .mockResolvedValueOnce([{ ...mockMyangad, seats: [], childGroups: [] }]) // for MYANGAD
        .mockResolvedValueOnce([{ ...mockZuud, seats: [], childGroups: [] }]) // for ZUUN
        .mockResolvedValueOnce([{ ...mockArbad, seats: [mockSeat], childGroups: [] }]); // for ARBAD

      prisma.khuralSeat.count.mockResolvedValue(5); // 5 occupied < 10
      prisma.khuralGroup.count.mockResolvedValue(3); // 3 children < 10

      // Return empty seats for the arbad
      prisma.khuralSeat.findMany.mockResolvedValue([
        { ...mockSeat, occupantUserId: null },
      ]);

      const r = await service.assignTerritory('u1', 'Novosibirsk');
      expect(r.seatIndex).toBe(0);
    });

    it('throws when arbad is full and all seats occupied', async () => {
      prisma.khuralGroup.findFirst.mockResolvedValue(mockTumed);
      prisma.khuralGroup.findMany.mockResolvedValue([]);
      prisma.khuralGroup.count.mockResolvedValue(0);
      
      // Seats all occupied
      const occupiedSeats = Array.from({ length: 10 }, (_, i) => ({
        id: `s-${i}`, groupId: 'arb1', index: i,
        isLeaderSeat: i === 0, occupantUserId: `user-${i}`,
      }));
      prisma.khuralSeat.findMany.mockResolvedValue(occupiedSeats);

      let idx = 0;
      prisma.khuralGroup.create.mockImplementation(({ data }: any) => {
        idx++;
        return Promise.resolve({ id: `g-${idx}`, ...data, childGroups: [], seats: [] });
      });

      await expect(service.assignTerritory('u1', 'TestDistrict'))
        .rejects.toThrow('full');
    });
  });

  describe('initiateRegistration', () => {
    it('creates user with temp seatId', async () => {
      const r = await service.initiateRegistration({
        birthPlace: 'Moscow', ethnicity: 'Siberian', clan: 'Khongirad',
      });
      expect(r.seatId).toContain('TEMP-');
      expect(r.role).toBe('CITIZEN');
    });
  });

  describe('getUpdatedUser', () => {
    it('returns user', async () => {
      const r = await service.getUpdatedUser('u1');
      expect(r!.id).toBe('u1');
    });
  });
});
