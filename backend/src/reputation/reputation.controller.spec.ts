import { Test, TestingModule } from '@nestjs/testing';
import { ReputationController } from './reputation.controller';
import { ReputationService } from './reputation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ReputationController', () => {
  let controller: ReputationController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReputationController],
      providers: [
        { provide: ReputationService, useValue: { getReputation: jest.fn().mockResolvedValue({}), getHistory: jest.fn().mockResolvedValue([]) } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<ReputationController>(ReputationController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
