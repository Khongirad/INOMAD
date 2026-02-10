import { Test, TestingModule } from '@nestjs/testing';
import { TransparencyController } from './transparency.controller';
import { ActivityLogService } from './activity-log.service';
import { TransparencyService } from './transparency.service';


describe('TransparencyController', () => {
  let controller: TransparencyController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransparencyController],
      providers: [
        { provide: ActivityLogService, useValue: { getActivities: jest.fn().mockResolvedValue([]) } },
        { provide: TransparencyService, useValue: { getPublicReports: jest.fn().mockResolvedValue([]) } },
      ],
    })

    .compile();
    controller = module.get<TransparencyController>(TransparencyController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
