import { Test, TestingModule } from '@nestjs/testing';
import { AcademyController } from './academy.controller';
import { AcademyOfSciencesService } from './academy.service';
describe('AcademyController', () => {
  let controller: AcademyController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AcademyController],
      providers: [{ provide: AcademyOfSciencesService, useValue: { getAcademyStats: jest.fn().mockResolvedValue({}) } }],
    }).compile();
    controller = module.get<AcademyController>(AcademyController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
