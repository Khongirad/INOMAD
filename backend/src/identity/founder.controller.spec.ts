import { Test, TestingModule } from '@nestjs/testing';
import { FounderController } from './founder.controller';
import { FounderService } from './founder.service';
describe('FounderController', () => {
  let controller: FounderController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FounderController],
      providers: [{ provide: FounderService, useValue: { getFounderStatus: jest.fn().mockResolvedValue({}) } }],
    }).compile();
    controller = module.get<FounderController>(FounderController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
