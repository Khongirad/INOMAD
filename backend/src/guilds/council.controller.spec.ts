import { Test, TestingModule } from '@nestjs/testing';
import { CouncilController } from './council.controller';
import { CouncilService } from './council.service';

describe('CouncilController', () => {
  let controller: CouncilController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouncilController],
      providers: [{ provide: CouncilService, useValue: { getCouncilMembers: jest.fn().mockResolvedValue([]) } }],
    }).compile();
    controller = module.get<CouncilController>(CouncilController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
