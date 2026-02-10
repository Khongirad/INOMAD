import { Test, TestingModule } from '@nestjs/testing';
import { DistributionController } from './distribution.controller';
import { CitizenDistributionService } from './citizen-distribution.service';
describe('DistributionController', () => {
  let controller: DistributionController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DistributionController],
      providers: [{ provide: CitizenDistributionService, useValue: { getDistributionStatus: jest.fn().mockResolvedValue({}) } }],
    }).compile();
    controller = module.get<DistributionController>(DistributionController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
