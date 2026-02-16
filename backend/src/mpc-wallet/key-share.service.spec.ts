import { Test, TestingModule } from '@nestjs/testing';
import { KeyShareService } from './key-share.service';
import { PrismaService } from '../prisma/prisma.service';

describe('KeyShareService', () => {
  let service: KeyShareService;
  let prisma: any;

  const mockShare = {
    id: 'ks1', walletId: 'w1', shareType: 'DEVICE',
    shareIndex: 0, publicKey: '0xADDR', deviceId: 'dev1',
    deviceName: 'iPhone', userAgent: 'Safari', isActive: true,
    lastUsedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = {
      keyShare: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([mockShare]),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id: 'ks-new', ...data }),
        ),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockShare, ...data }),
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(2),
      },
      mPCWallet: {
        findUnique: jest.fn().mockResolvedValue({ id: 'w1', address: '0xADDR' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KeyShareService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(KeyShareService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('registerDevice', () => {
    it('creates new device share when not existing', async () => {
      const r = await service.registerDevice('w1', 'dev1', 'iPhone', 'Safari');
      expect(r.walletId).toBe('w1');
      expect(r.shareType).toBe('DEVICE');
      expect(r.shareIndex).toBe(2); // count returned 2
      expect(prisma.keyShare.create).toHaveBeenCalled();
    });

    it('updates lastUsedAt when device already registered', async () => {
      prisma.keyShare.findFirst.mockResolvedValue(mockShare);
      const r = await service.registerDevice('w1', 'dev1', 'iPhone', 'Safari');
      expect(prisma.keyShare.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ks1' },
        }),
      );
    });
  });

  describe('revokeDevice', () => {
    it('revokes a device share', async () => {
      const r = await service.revokeDevice('w1', 'dev1', 'Lost device');
      expect(prisma.keyShare.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isActive: false,
            revokeReason: 'Lost device',
          }),
        }),
      );
    });
  });

  describe('getActiveDevices', () => {
    it('returns active device shares', async () => {
      const r = await service.getActiveDevices('w1');
      expect(r).toHaveLength(1);
      expect(prisma.keyShare.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            walletId: 'w1', shareType: 'DEVICE', isActive: true,
          }),
        }),
      );
    });
  });

  describe('touchDevice', () => {
    it('updates lastUsedAt for active device', async () => {
      await service.touchDevice('w1', 'dev1');
      expect(prisma.keyShare.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            walletId: 'w1', deviceId: 'dev1', isActive: true,
          }),
        }),
      );
    });
  });
});
