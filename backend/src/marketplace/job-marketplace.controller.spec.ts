import { Test, TestingModule } from '@nestjs/testing';
import { JobMarketplaceController } from './job-marketplace.controller';
import { JobMarketplaceService } from './job-marketplace.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('JobMarketplaceController', () => {
  let controller: JobMarketplaceController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JobMarketplaceController],
      providers: [
        { provide: JobMarketplaceService, useValue: { createPosting: jest.fn(), getPostings: jest.fn().mockResolvedValue([]) } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<JobMarketplaceController>(JobMarketplaceController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
