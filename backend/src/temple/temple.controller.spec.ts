import { Test, TestingModule } from '@nestjs/testing';
import { TempleController } from './temple.controller';
import { TempleOfHeavenService } from './temple.service';


describe('TempleController', () => {
  let controller: TempleController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TempleController],
      providers: [
        { provide: TempleOfHeavenService, useValue: { submitRecord: jest.fn(), getRecord: jest.fn() } },
      ],
    })

    .compile();
    controller = module.get<TempleController>(TempleController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
