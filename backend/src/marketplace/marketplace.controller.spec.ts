import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('MarketplaceController', () => {
  let controller: MarketplaceController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketplaceController],
      providers: [
        { provide: MarketplaceService, useValue: { createListing: jest.fn(), getListings: jest.fn().mockResolvedValue([]) } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<MarketplaceController>(MarketplaceController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
