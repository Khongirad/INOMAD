import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from './calendar.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('CalendarService', () => {
  let service: CalendarService;
  let prisma: any;

  const mockEvent = {
    id: 'ev-1', userId: 'u1', title: 'Meeting', isPublic: false,
    startDate: new Date(), endDate: new Date(),
  };

  const mockNote = { id: 'n1', userId: 'u1', content: 'Note text', date: new Date() };

  const mockPrisma = () => ({
    calendarEvent: {
      findMany: jest.fn(), findUnique: jest.fn(),
      create: jest.fn(), update: jest.fn(), delete: jest.fn(),
    },
    calendarNote: {
      findMany: jest.fn(), findUnique: jest.fn(),
      create: jest.fn(), update: jest.fn(), delete: jest.fn(),
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(CalendarService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── Events ────────────────────────────
  describe('getEventsInRange', () => {
    it('should return events in range', async () => {
      prisma.calendarEvent.findMany.mockResolvedValue([mockEvent]);
      const result = await service.getEventsInRange('u1', new Date(), new Date());
      expect(result).toHaveLength(1);
    });
  });

  describe('createEvent', () => {
    it('should create event', async () => {
      prisma.calendarEvent.create.mockResolvedValue(mockEvent);
      const result = await service.createEvent('u1', { title: 'Meeting', startDate: new Date().toISOString() });
      expect(result.title).toBe('Meeting');
    });
  });

  describe('updateEvent', () => {
    it('should update own event', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(mockEvent);
      prisma.calendarEvent.update.mockResolvedValue({ ...mockEvent, title: 'Updated' });
      const result = await service.updateEvent('ev-1', 'u1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('should throw NotFoundException', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(null);
      await expect(service.updateEvent('bad', 'u1', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for other user', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(mockEvent);
      await expect(service.updateEvent('ev-1', 'u2', {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteEvent', () => {
    it('should delete own event', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(mockEvent);
      prisma.calendarEvent.delete.mockResolvedValue({});
      const result = await service.deleteEvent('ev-1', 'u1');
      expect(result.message).toContain('deleted');
    });

    it('should throw ForbiddenException for other user', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(mockEvent);
      await expect(service.deleteEvent('ev-1', 'u2')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getEvent', () => {
    it('should return own event', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(mockEvent);
      const result = await service.getEvent('ev-1', 'u1');
      expect(result.id).toBe('ev-1');
    });

    it('should throw for private event of other user', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(mockEvent); // isPublic: false
      await expect(service.getEvent('ev-1', 'u2')).rejects.toThrow(ForbiddenException);
    });

    it('should allow access to public event', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue({ ...mockEvent, isPublic: true });
      const result = await service.getEvent('ev-1', 'u2');
      expect(result.id).toBe('ev-1');
    });
  });

  describe('getUpcomingEvents', () => {
    it('should return upcoming events', async () => {
      prisma.calendarEvent.findMany.mockResolvedValue([mockEvent]);
      const result = await service.getUpcomingEvents('u1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── Notes ─────────────────────────────
  describe('getNotesForDate', () => {
    it('should return notes for a date', async () => {
      prisma.calendarNote.findMany.mockResolvedValue([mockNote]);
      const result = await service.getNotesForDate('u1', new Date());
      expect(result).toHaveLength(1);
    });
  });

  describe('createNote', () => {
    it('should create note', async () => {
      prisma.calendarNote.create.mockResolvedValue(mockNote);
      const result = await service.createNote('u1', { content: 'Note text', date: new Date().toISOString() });
      expect(result.content).toBe('Note text');
    });
  });

  describe('updateNote', () => {
    it('should update own note', async () => {
      prisma.calendarNote.findUnique.mockResolvedValue(mockNote);
      prisma.calendarNote.update.mockResolvedValue({ ...mockNote, content: 'Updated' });
      const result = await service.updateNote('n1', 'u1', { content: 'Updated' });
      expect(result.content).toBe('Updated');
    });

    it('should throw ForbiddenException for other user', async () => {
      prisma.calendarNote.findUnique.mockResolvedValue(mockNote);
      await expect(service.updateNote('n1', 'u2', {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteNote', () => {
    it('should delete own note', async () => {
      prisma.calendarNote.findUnique.mockResolvedValue(mockNote);
      prisma.calendarNote.delete.mockResolvedValue({});
      const result = await service.deleteNote('n1', 'u1');
      expect(result.message).toContain('deleted');
    });

    it('should throw ForbiddenException for other user', async () => {
      prisma.calendarNote.findUnique.mockResolvedValue(mockNote);
      await expect(service.deleteNote('n1', 'u2')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAllNotes', () => {
    it('should return all notes', async () => {
      prisma.calendarNote.findMany.mockResolvedValue([mockNote]);
      const result = await service.getAllNotes('u1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── getNotesInRange ──────────────────
  describe('getNotesInRange', () => {
    it('should return notes in date range', async () => {
      prisma.calendarNote.findMany.mockResolvedValue([mockNote]);
      const result = await service.getNotesInRange('u1', new Date(), new Date());
      expect(result).toHaveLength(1);
    });
  });

  // ─── getEvent NotFoundException ───────
  describe('getEvent edge cases', () => {
    it('should throw NotFoundException when event not found', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(null);
      await expect(service.getEvent('bad', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteEvent NotFoundException ────
  describe('deleteEvent edge cases', () => {
    it('should throw NotFoundException when event not found', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(null);
      await expect(service.deleteEvent('bad', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteNote NotFoundException ─────
  describe('deleteNote edge cases', () => {
    it('should throw NotFoundException when note not found', async () => {
      prisma.calendarNote.findUnique.mockResolvedValue(null);
      await expect(service.deleteNote('bad', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateNote NotFoundException ─────
  describe('updateNote edge cases', () => {
    it('should throw NotFoundException when note not found', async () => {
      prisma.calendarNote.findUnique.mockResolvedValue(null);
      await expect(service.updateNote('bad', 'u1', {})).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getUpcomingEvents with custom days
  describe('getUpcomingEvents edge cases', () => {
    it('should support custom days parameter', async () => {
      prisma.calendarEvent.findMany.mockResolvedValue([]);
      const result = await service.getUpcomingEvents('u1', 30);
      expect(result).toEqual([]);
    });
  });

  // ─── updateEvent NotFoundException ────
  describe('updateEvent edge cases', () => {
    it('should not throw for same user', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(mockEvent);
      prisma.calendarEvent.update.mockResolvedValue({ ...mockEvent, title: 'New' });
      const result = await service.updateEvent('ev-1', 'u1', { title: 'New' });
      expect(result.title).toBe('New');
    });
  });
});

