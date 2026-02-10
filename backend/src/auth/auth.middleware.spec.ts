import { AuthMiddleware } from './auth.middleware';
import { PrismaService } from '../prisma/prisma.service';
describe('AuthMiddleware', () => {
  let middleware: AuthMiddleware;
  beforeEach(() => {
    const prisma = {} as any;
    middleware = new AuthMiddleware(prisma);
  });
  it('should be defined', () => { expect(middleware).toBeDefined(); });
});
