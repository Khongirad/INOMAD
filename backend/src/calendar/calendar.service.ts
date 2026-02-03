import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  // ============== EVENTS ==============

  /**
   * Get events in date range for a user
   */
  async getEventsInRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.calendarEvent.findMany({
      where: {
        userId,
        startDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });
  }

  /**
   * Create calendar event
   */
  async createEvent(userId: string, eventData: any) {
    return this.prisma.calendarEvent.create({
      data: {
        ...eventData,
        userId,
        startDate: new Date(eventData.startDate),
        endDate: eventData.endDate ? new Date(eventData.endDate) : null,
      },
    });
  }

  /**
   * Update calendar event
   */
  async updateEvent(eventId: string, userId: string, eventData: any) {
    // Check ownership
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.userId !== userId) {
      throw new ForbiddenException('You can only update your own events');
    }

    return this.prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        ...eventData,
        startDate: eventData.startDate ? new Date(eventData.startDate) : undefined,
        endDate: eventData.endDate ? new Date(eventData.endDate) : undefined,
      },
    });
  }

  /**
   * Delete calendar event
   */
  async deleteEvent(eventId: string, userId: string) {
    // Check ownership
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.userId !== userId) {
      throw new ForbiddenException('You can only delete your own events');
    }

    await this.prisma.calendarEvent.delete({
      where: { id: eventId },
    });

    return { message: 'Event deleted successfully' };
  }

  /**
   * Get single event
   */
  async getEvent(eventId: string, userId: string) {
    const event = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check access (owner or public)
    if (event.userId !== userId && !event.isPublic) {
      throw new ForbiddenException('You do not have access to this event');
    }

    return event;
  }

  /**
   * Get upcoming events for user (for dashboard)
   */
  async getUpcomingEvents(userId: string, days: number = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.calendarEvent.findMany({
      where: {
        userId,
        startDate: {
          gte: now,
          lte: futureDate,
        },
      },
      orderBy: {
        startDate: 'asc',
      },
      take: 10,
    });
  }

  // ============== NOTES ==============

  /**
   * Get notes for specific date
   */
  async getNotesForDate(userId: string, date: Date) {
    // Get notes for the entire day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.calendarNote.findMany({
      where: {
        userId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get notes in date range
   */
  async getNotesInRange(userId: string, startDate: Date, endDate: Date) {
    return this.prisma.calendarNote.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  /**
   * Create calendar note
   */
  async createNote(userId: string, noteData: any) {
    return this.prisma.calendarNote.create({
      data: {
        ...noteData,
        userId,
        date: new Date(noteData.date),
      },
    });
  }

  /**
   * Update calendar note
   */
  async updateNote(noteId: string, userId: string, noteData: any) {
    // Check ownership
    const note = await this.prisma.calendarNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    if (note.userId !== userId) {
      throw new ForbiddenException('You can only update your own notes');
    }

    return this.prisma.calendarNote.update({
      where: { id: noteId },
      data: {
        ...noteData,
        date: noteData.date ? new Date(noteData.date) : undefined,
      },
    });
  }

  /**
   * Delete calendar note
   */
  async deleteNote(noteId: string, userId: string) {
    // Check ownership
    const note = await this.prisma.calendarNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    if (note.userId !== userId) {
      throw new ForbiddenException('You can only delete your own notes');
    }

    await this.prisma.calendarNote.delete({
      where: { id: noteId },
    });

    return { message: 'Note deleted successfully' };
  }

  /**
   * Get all user's notes (for search/filter)
   */
  async getAllNotes(userId: string) {
    return this.prisma.calendarNote.findMany({
      where: { userId },
      orderBy: {
        date: 'desc',
      },
    });
  }
}
