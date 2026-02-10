import { Test, TestingModule } from '@nestjs/testing';
import { FamilyArbanController } from './family-arban.controller';
import { FamilyArbanService } from './family-arban.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('FamilyArbanController', () => {
  let controller: FamilyArbanController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FamilyArbanController],
      providers: [
        { provide: FamilyArbanService, useValue: { getArban: jest.fn(), createArban: jest.fn() } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<FamilyArbanController>(FamilyArbanController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
