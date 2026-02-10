import { Test, TestingModule } from '@nestjs/testing';
import { ZunController } from './zun.controller';
import { ZunService } from './zun.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ZunController', () => {
  let controller: ZunController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZunController],
      providers: [
        { provide: ZunService, useValue: { getZun: jest.fn() } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<ZunController>(ZunController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
