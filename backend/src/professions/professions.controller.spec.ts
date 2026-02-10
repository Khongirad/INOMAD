import { Test, TestingModule } from '@nestjs/testing';
import { ProfessionsController } from './professions.controller';
import { ProfessionsService } from './professions.service';

describe('ProfessionsController', () => {
  let controller: ProfessionsController;
  let service: any;

  beforeEach(async () => {
    service = {
      createProfession: jest.fn().mockResolvedValue({ id: 'p1' }),
      listProfessions: jest.fn().mockResolvedValue([]),
      getProfession: jest.fn().mockResolvedValue({ id: 'p1' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfessionsController],
      providers: [{ provide: ProfessionsService, useValue: service }],
    }).compile();
    controller = module.get<ProfessionsController>(ProfessionsController);
  });

  it('should be defined', () => { expect(controller).toBeDefined(); });
});
