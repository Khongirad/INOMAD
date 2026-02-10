import { Test, TestingModule } from '@nestjs/testing';
import { KeyShareService } from './key-share.service';
import { PrismaService } from '../prisma/prisma.service';

describe('KeyShareService', () => {
  let service: KeyShareService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      keyShare: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'ks1' }),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      mPCWallet: {
        findUnique: jest.fn().mockResolvedValue({ id: 'w1', maxDevices: 5 }),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [KeyShareService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<KeyShareService>(KeyShareService);
  });

  it('getActiveDevices returns list', async () => {
    const r = await service.getActiveDevices('w1');
    expect(prisma.keyShare.findMany).toHaveBeenCalled();
  });

  it('revokeDevice updates key shares', async () => {
    await service.revokeDevice('w1', 'device-1', 'lost device');
    expect(prisma.keyShare.updateMany).toHaveBeenCalled();
  });
});
