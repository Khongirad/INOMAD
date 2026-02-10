import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Creates a mock PrismaService with all models auto-mocked.
 * Each model gets: findUnique, findFirst, findMany, create, update, delete, count, upsert
 */
export function createMockPrismaService(): jest.Mocked<PrismaService> {
  const modelMethods = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    aggregate: jest.fn(),
  });

  return {
    // Core models used in auth/bank/arban
    user: modelMethods(),
    session: modelMethods(),
    walletNonce: modelMethods(),
    bankAccount: modelMethods(),
    bankTransaction: modelMethods(),
    arban: modelMethods(),
    arbanMember: modelMethods(),
    citizenIdentity: modelMethods(),
    templeRecord: modelMethods(),
    marketplaceListing: modelMethods(),
    marketplacePurchase: modelMethods(),
    // Prisma client methods
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn((fn) => fn({
      bankAccount: modelMethods(),
      bankTransaction: modelMethods(),
    })),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  } as unknown as jest.Mocked<PrismaService>;
}
