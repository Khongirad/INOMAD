import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('should be defined', () => {
    // PrismaService extends PrismaClient, so we only test it's instantiable
    const service = new PrismaService();
    expect(service).toBeDefined();
  });
});
