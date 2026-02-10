import { Test, TestingModule } from '@nestjs/testing';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('TimelineController', () => {
  let controller: TimelineController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TimelineController],
      providers: [
        { provide: TimelineService, useValue: { getUserTimeline: jest.fn().mockResolvedValue([]) } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<TimelineController>(TimelineController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
