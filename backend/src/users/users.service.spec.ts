import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('findBySeatId returns user with relations', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', seatId: 'SEAT-1' });
    const r = await service.findBySeatId('SEAT-1');
    expect(r.seatId).toBe('SEAT-1');
    expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { seatId: 'SEAT-1' } }));
  });

  it('findById returns user', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    const r = await service.findById('u1');
    expect(r.id).toBe('u1');
  });
});
