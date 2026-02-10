import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProfessionsService } from './professions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProfessionsService', () => {
  let service: ProfessionsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      profession: {
        create: jest.fn().mockResolvedValue({ id: 'p1', name: 'Engineer' }),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfessionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<ProfessionsService>(ProfessionsService);
  });

  it('createProfession creates a profession', async () => {
    const r = await service.createProfession({ name: 'Engineer', description: 'Builds things' });
    expect(r.name).toBe('Engineer');
  });

  it('getProfession throws NotFoundException for missing', async () => {
    prisma.profession.findUnique.mockResolvedValue(null);
    await expect(service.getProfession('missing')).rejects.toThrow(NotFoundException);
  });

  it('getProfession returns profession', async () => {
    prisma.profession.findUnique.mockResolvedValue({ id: 'p1' });
    const r = await service.getProfession('p1');
    expect(r.id).toBe('p1');
  });

  it('listProfessions returns all', async () => {
    await service.listProfessions();
    expect(prisma.profession.findMany).toHaveBeenCalled();
  });
});
