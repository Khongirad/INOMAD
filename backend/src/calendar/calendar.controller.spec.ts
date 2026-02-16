import { Test, TestingModule } from '@nestjs/testing';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('CalendarController', () => {
  let controller: CalendarController;
  let service: any;

  const req = { user: { sub: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      getEventsInRange: jest.fn().mockResolvedValue([{ id: 'e1', title: 'Meeting' }]),
      createEvent: jest.fn().mockResolvedValue({ id: 'e-new' }),
      updateEvent: jest.fn().mockResolvedValue({ id: 'e1' }),
      deleteEvent: jest.fn().mockResolvedValue(undefined),
      getEvent: jest.fn().mockResolvedValue({ id: 'e1' }),
      getUpcomingEvents: jest.fn().mockResolvedValue([]),
      getNotesForDate: jest.fn().mockResolvedValue([{ id: 'n1' }]),
      getNotesInRange: jest.fn().mockResolvedValue([]),
      getAllNotes: jest.fn().mockResolvedValue([]),
      createNote: jest.fn().mockResolvedValue({ id: 'n-new' }),
      updateNote: jest.fn().mockResolvedValue({ id: 'n1' }),
      deleteNote: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [{ provide: CalendarService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(CalendarController);
    service = module.get(CalendarService);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  // Events
  it('gets events in range', async () => {
    const r = await controller.getEvents(req, '2025-01-01', '2025-01-31');
    expect(service.getEventsInRange).toHaveBeenCalledWith('u1', expect.any(Date), expect.any(Date));
  });

  it('creates event', async () => {
    const r = await controller.createEvent(req, { title: 'Test' });
    expect(service.createEvent).toHaveBeenCalledWith('u1', { title: 'Test' });
  });

  it('updates event', async () => {
    await controller.updateEvent('e1', req, { title: 'Updated' });
    expect(service.updateEvent).toHaveBeenCalledWith('e1', 'u1', { title: 'Updated' });
  });

  it('deletes event', async () => {
    await controller.deleteEvent('e1', req);
    expect(service.deleteEvent).toHaveBeenCalledWith('e1', 'u1');
  });

  it('gets single event', async () => {
    await controller.getEvent('e1', req);
    expect(service.getEvent).toHaveBeenCalledWith('e1', 'u1');
  });

  it('gets upcoming events with default days', async () => {
    await controller.getUpcomingEvents(req);
    expect(service.getUpcomingEvents).toHaveBeenCalledWith('u1', 7);
  });

  it('gets upcoming events with custom days', async () => {
    await controller.getUpcomingEvents(req, '14');
    expect(service.getUpcomingEvents).toHaveBeenCalledWith('u1', 14);
  });

  // Notes
  it('gets notes for a specific date', async () => {
    await controller.getNotes(req, '2025-01-15');
    expect(service.getNotesForDate).toHaveBeenCalledWith('u1', expect.any(Date));
  });

  it('gets notes in range', async () => {
    await controller.getNotes(req, undefined, '2025-01-01', '2025-01-31');
    expect(service.getNotesInRange).toHaveBeenCalled();
  });

  it('gets all notes when no filters', async () => {
    await controller.getNotes(req);
    expect(service.getAllNotes).toHaveBeenCalledWith('u1');
  });

  it('creates note', async () => {
    await controller.createNote(req, { content: 'Important' });
    expect(service.createNote).toHaveBeenCalledWith('u1', { content: 'Important' });
  });

  it('updates note', async () => {
    await controller.updateNote('n1', req, { content: 'Updated' });
    expect(service.updateNote).toHaveBeenCalledWith('n1', 'u1', { content: 'Updated' });
  });

  it('deletes note', async () => {
    await controller.deleteNote('n1', req);
    expect(service.deleteNote).toHaveBeenCalledWith('n1', 'u1');
  });
});
