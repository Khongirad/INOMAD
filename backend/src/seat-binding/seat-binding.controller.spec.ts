import { Test, TestingModule } from '@nestjs/testing';
import { SeatBindingController } from './seat-binding.controller';
import { SeatBindingService } from './seat-binding.service';
describe('SeatBindingController', () => {
  let controller: SeatBindingController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeatBindingController],
      providers: [{ provide: SeatBindingService, useValue: { bind: jest.fn(), getStatus: jest.fn().mockResolvedValue({}) } }],
    }).compile();
    controller = module.get<SeatBindingController>(SeatBindingController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
