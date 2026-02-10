import { Test, TestingModule } from '@nestjs/testing';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('CalendarController', () => {
  let controller: CalendarController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [
        { provide: CalendarService, useValue: { getEvents: jest.fn().mockResolvedValue([]) } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<CalendarController>(CalendarController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
