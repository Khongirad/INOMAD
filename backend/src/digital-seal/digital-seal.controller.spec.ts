import { Test, TestingModule } from '@nestjs/testing';
import { DigitalSealController } from './digital-seal.controller';
import { DigitalSealService } from './digital-seal.service';
describe('DigitalSealController', () => {
  let controller: DigitalSealController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DigitalSealController],
      providers: [{ provide: DigitalSealService, useValue: { createSeal: jest.fn(), verifySeal: jest.fn() } }],
    }).compile();
    controller = module.get<DigitalSealController>(DigitalSealController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
