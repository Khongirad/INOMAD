import { Test, TestingModule } from '@nestjs/testing';
import { BankHierarchyController } from './bank-hierarchy.controller';
import { BankHierarchyService } from './bank-hierarchy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('BankHierarchyController', () => {
  let controller: BankHierarchyController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BankHierarchyController],
      providers: [
        { provide: BankHierarchyService, useValue: { getHierarchy: jest.fn() } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<BankHierarchyController>(BankHierarchyController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
