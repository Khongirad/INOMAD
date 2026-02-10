import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthPasswordService } from './auth-password.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthGuard } from './auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: { generateNonce: jest.fn(), verifySignature: jest.fn() } },
        { provide: AuthPasswordService, useValue: { register: jest.fn(), login: jest.fn() } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<AuthController>(AuthController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
