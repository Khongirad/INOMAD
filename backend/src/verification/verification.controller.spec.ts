import { Test, TestingModule } from '@nestjs/testing';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { TieredVerificationService } from './tiered-verification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

describe('VerificationController', () => {
  let controller: VerificationController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificationController],
      providers: [
        { provide: VerificationService, useValue: { getPendingUsers: jest.fn().mockResolvedValue([]) } },
        { provide: TieredVerificationService, useValue: { getEmissionStatus: jest.fn().mockResolvedValue({}) } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(AdminGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<VerificationController>(VerificationController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
