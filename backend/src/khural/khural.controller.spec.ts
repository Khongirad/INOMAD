import { Test, TestingModule } from '@nestjs/testing';
import { KhuralController } from './khural.controller';
import { KhuralService } from './khural.service';

describe('KhuralController', () => {
  let controller: KhuralController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KhuralController],
      providers: [{ provide: KhuralService, useValue: { createKhural: jest.fn(), getAllKhurals: jest.fn().mockResolvedValue([]), getKhural: jest.fn() } }],
    }).compile();
    controller = module.get<KhuralController>(KhuralController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
