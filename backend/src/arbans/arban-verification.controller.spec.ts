import { Test, TestingModule } from '@nestjs/testing';
import { ArbanVerificationController } from './arban-verification.controller';
import { ArbanVerificationService } from './arban-verification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ArbanVerificationController', () => {
  let controller: ArbanVerificationController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArbanVerificationController],
      providers: [
        { provide: ArbanVerificationService, useValue: { getStatus: jest.fn(), verify: jest.fn() } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<ArbanVerificationController>(ArbanVerificationController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
