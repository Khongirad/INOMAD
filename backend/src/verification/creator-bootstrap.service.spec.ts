import { Test, TestingModule } from '@nestjs/testing';
import { CreatorBootstrapService } from './creator-bootstrap.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CreatorBootstrapService', () => {
  let service: CreatorBootstrapService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreatorBootstrapService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<CreatorBootstrapService>(CreatorBootstrapService);
  });

  it('isCreator returns true for CREATOR role', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'CREATOR' });
    expect(await service.isCreator('u1')).toBe(true);
  });

  it('isCreator returns false for non-CREATOR', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'CITIZEN' });
    expect(await service.isCreator('u1')).toBe(false);
  });

  it('hasAdminPrivileges returns true for ADMIN', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
    expect(await service.hasAdminPrivileges('u1')).toBe(true);
  });

  it('hasAdminPrivileges returns false for CITIZEN', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'CITIZEN' });
    expect(await service.hasAdminPrivileges('u1')).toBe(false);
  });

  it('ensureCreatorFullyVerified upgrades unverified creators', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 'c1', role: 'CREATOR', verificationLevel: 'UNVERIFIED' },
    ]);
    await service.ensureCreatorFullyVerified();
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' } }),
    );
  });
});
