import { api } from './client';

// Types
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  calendarType: 'GREGORIAN' | 'MONGOLIAN';
  eventType: 'HOLIDAY' | 'SEASON' | 'RITUAL' | 'CUSTOM';
  isRecurring: boolean;
  createdBy?: string;
  createdAt: string;
}

export interface CreateCalendarEventDto {
  title: string;
  description?: string;
  date: Date;
  calendarType: 'GREGORIAN' | 'MONGOLIAN';
  eventType: CalendarEvent['eventType'];
  isRecurring?: boolean;
}

export interface DateConversionResult {
  converted: string;
  formatted: string;
}

// API Functions

/**
 * Get calendar events within a date range
 */
export async function getCalendarEvents(
  startDate?: Date,
  endDate?: Date,
  type?: string
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams();
  
  if (startDate) params.append('startDate', startDate.toISOString());
  if (endDate) params.append('endDate', endDate.toISOString());
  if (type) params.append('type', type);
  
  const query = params.toString() ? `?${params.toString()}` : '';
  return api.get(`/calendar/events${query}`);
}

/**
 * Get upcoming events within specified days
 */
export async function getUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
  return api.get(`/calendar/upcoming?days=${days}`);
}

/**
 * Create a new calendar event
 */
export async function createCalendarEvent(data: CreateCalendarEventDto): Promise<CalendarEvent> {
  return api.post('/calendar/events', data);
}

/**
 * Update an existing calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  data: Partial<CreateCalendarEventDto>
): Promise<CalendarEvent> {
  return api.put(`/calendar/events/${eventId}`, data);
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<{ success: boolean }> {
  return api.delete(`/calendar/events/${eventId}`);
}

/**
 * Convert date between Gregorian and Mongolian calendars
 */
export async function convertDate(
  date: Date,
  from: 'GREGORIAN' | 'MONGOLIAN',
  to: 'GREGORIAN' | 'MONGOLIAN'
): Promise<DateConversionResult> {
  return api.post('/calendar/convert', { date, from, to });
}

/**
 * Create a calendar note
 */
export async function createCalendarNote(data: {
  date: Date;
  content: string;
  tags?: string[];
}): Promise<any> {
  return api.post('/calendar/notes', data);
}
