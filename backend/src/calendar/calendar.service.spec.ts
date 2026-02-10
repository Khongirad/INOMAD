import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CalendarService', () => {
  let service: CalendarService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      calendarEvent: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'evt-1' }),
        update: jest.fn(),
        delete: jest.fn(),
      },
      calendarNote: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'note-1' }),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CalendarService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
  });

  describe('getEventsInRange', () => {
    it('should query events within date range', async () => {
      const start = new Date('2026-01-01');
      const end = new Date('2026-01-31');
      await service.getEventsInRange('u1', start, end);
      expect(prisma.calendarEvent.findMany).toHaveBeenCalled();
    });
  });

  describe('createEvent', () => {
    it('should create event for user', async () => {
      const result = await service.createEvent('u1', { title: 'Meeting', startDate: '2026-02-01' });
      expect(result.id).toBe('evt-1');
    });
  });

  describe('updateEvent', () => {
    it('should throw NotFoundException for missing event', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue(null);
      await expect(service.updateEvent('bad', 'u1', {})).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue({ id: 'evt-1', userId: 'u2' });
      await expect(service.updateEvent('evt-1', 'u1', {})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteEvent', () => {
    it('should delete owned event', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue({ id: 'evt-1', userId: 'u1' });
      const result = await service.deleteEvent('evt-1', 'u1');
      expect(result.message).toContain('deleted');
    });
  });

  describe('getEvent', () => {
    it('should throw for non-public event from non-owner', async () => {
      prisma.calendarEvent.findUnique.mockResolvedValue({ id: 'evt-1', userId: 'u2', isPublic: false });
      await expect(service.getEvent('evt-1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createNote', () => {
    it('should create note', async () => {
      const result = await service.createNote('u1', { content: 'Test', date: '2026-02-01' });
      expect(result.id).toBe('note-1');
    });
  });

  describe('deleteNote', () => {
    it('should throw NotFoundException for missing note', async () => {
      prisma.calendarNote.findUnique.mockResolvedValue(null);
      await expect(service.deleteNote('bad', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-owner', async () => {
      prisma.calendarNote.findUnique.mockResolvedValue({ id: 'n-1', userId: 'u2' });
      await expect(service.deleteNote('n-1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });
});
