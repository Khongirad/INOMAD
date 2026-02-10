import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationalArbanController } from './organizational-arban.controller';
import { OrganizationalArbanService } from './organizational-arban.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('OrganizationalArbanController', () => {
  let controller: OrganizationalArbanController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationalArbanController],
      providers: [
        { provide: OrganizationalArbanService, useValue: { getOrgArban: jest.fn() } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<OrganizationalArbanController>(OrganizationalArbanController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
