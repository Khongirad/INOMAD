import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Calendar')
@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  // ============== EVENTS ==============

  @Get('events')
  async getEvents(
    @Request() req,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    return this.calendarService.getEventsInRange(req.user.sub, startDate, endDate);
  }

  @Post('events')
  async createEvent(@Request() req, @Body() body: any) {
    return this.calendarService.createEvent(req.user.sub, body);
  }

  @Put('events/:id')
  async updateEvent(
    @Param('id') id: string,
    @Request() req,
    @Body() body: any,
  ) {
    return this.calendarService.updateEvent(id, req.user.sub, body);
  }

  @Delete('events/:id')
  async deleteEvent(@Param('id') id: string, @Request() req) {
    return this.calendarService.deleteEvent(id, req.user.sub);
  }

  @Get('events/:id')
  async getEvent(@Param('id') id: string, @Request() req) {
    return this.calendarService.getEvent(id, req.user.sub);
  }

  @Get('upcoming')
  async getUpcomingEvents(@Request() req, @Query('days') days?: string) {
    const daysCount = days ? parseInt(days, 10) : 7;
    return this.calendarService.getUpcomingEvents(req.user.sub, daysCount);
  }

  // ============== NOTES ==============

  @Get('notes')
  async getNotes(
    @Request() req,
    @Query('date') date?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    if (date) {
      // Get notes for specific date
      return this.calendarService.getNotesForDate(req.user.sub, new Date(date));
    } else if (start && end) {
      // Get notes in range
      return this.calendarService.getNotesInRange(
        req.user.sub,
        new Date(start),
        new Date(end),
      );
    } else {
      // Get all notes
      return this.calendarService.getAllNotes(req.user.sub);
    }
  }

  @Post('notes')
  async createNote(@Request() req, @Body() body: any) {
    return this.calendarService.createNote(req.user.sub, body);
  }

  @Put('notes/:id')
  async updateNote(
    @Param('id') id: string,
    @Request() req,
    @Body() body: any,
  ) {
    return this.calendarService.updateNote(id, req.user.sub, body);
  }

  @Delete('notes/:id')
  async deleteNote(@Param('id') id: string, @Request() req) {
    return this.calendarService.deleteNote(id, req.user.sub);
  }

  // ============== REMINDERS ==============

  @Post('events/:id/reminder')
  async setReminder(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { minutesBefore: number },
  ) {
    return this.calendarService.setReminder(id, req.user.sub, body.minutesBefore);
  }

  @Delete('events/:id/reminder')
  async removeReminder(@Param('id') id: string, @Request() req) {
    return this.calendarService.removeReminder(id, req.user.sub);
  }

  @Get('reminders')
  async getReminders(@Request() req) {
    return this.calendarService.getEventsWithReminders(req.user.sub);
  }

  @Get('reminders/due')
  async getDueReminders() {
    return this.calendarService.getDueReminders();
  }
}
