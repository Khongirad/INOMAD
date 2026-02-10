import { Test, TestingModule } from '@nestjs/testing';
import { JusticeController } from './justice.controller';
import { CouncilOfJusticeService } from './justice.service';
describe('JusticeController', () => {
  let controller: JusticeController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JusticeController],
      providers: [{ provide: CouncilOfJusticeService, useValue: { nominateMember: jest.fn(), fileCase: jest.fn() } }],
    }).compile();
    controller = module.get<JusticeController>(JusticeController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
