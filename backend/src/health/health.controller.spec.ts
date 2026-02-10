import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: any;

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();
    controller = module.get<HealthController>(HealthController);
  });

  it('check returns ok when db healthy', async () => {
    const r = await controller.check();
    expect(r.status).toBe('ok');
  });

  it('check returns degraded when db fails', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('db down'));
    const r = await controller.check();
    expect(r.status).toBe('degraded');
  });
});
