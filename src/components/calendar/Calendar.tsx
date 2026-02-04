'use client';

import { useState, useEffect } from 'react';
import { 
  gregorianToLunar, 
  formatLunarDate, 
  MONGOLIAN_MONTHS,
  getLunarEventsForMonth 
} from '@/lib/lunar-calendar';
import { useAuth } from '@/lib/hooks/use-auth';
import { getCalendarEvents } from '@/lib/api';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  category?: string;
  color?: string;
}

type CalendarType = 'gregorian' | 'lunar';

export function Calendar() {
  const { token } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarType, setCalendarType] = useState<CalendarType>('gregorian');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
    // Save preference
    localStorage.setItem('calendar-type', calendarType);
  }, [currentDate, calendarType]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);

      const data = await getCalendarEvents(startDate.toISOString(), endDate.toISOString());
      setEvents(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch events';
      console.error('Failed to fetch events:', err);
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const renderGregorianCalendar = () => {
    const daysInMonth = getDaysInMonth();
    const firstDay = getFirstDayOfMonth();
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50"></div>);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = 
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth() &&
        date.getFullYear() === new Date().getFullYear();
      
      const lunar = gregorianToLunar(date);

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 p-2 hover:bg-gray-50 cursor-pointer transition-colors ${
            isToday ? 'bg-blue-50 border-blue-300' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
              {day}
            </span>
            <span className="text-xs text-gray-500">
              {lunar.phaseEmoji}
            </span>
          </div>
          
          <div className="space-y-1 overflow-hidden">
            {dayEvents.slice(0, 2).map(event => (
              <div
                key={event.id}
                className="text-xs px-1 py-0.5 rounded truncate"
                style={{ backgroundColor: event.color + '20', color: event.color || '#3B82F6' }}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500 px-1">
                +{dayEvents.length - 2} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const renderLunarCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    // Get lunar events for this month
    const lunarEvents = getLunarEventsForMonth(year, month);
    
    const daysInMonth = getDaysInMonth();
    const firstDay = getFirstDayOfMonth();
    const days = [];

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50"></div>);
    }

    // Days with lunar info
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const lunar = gregorianToLunar(date);
      const dayEvents = getEventsForDate(date);
      const lunarDayEvents = lunarEvents.filter(e => 
        e.date.getDate() === day
      );

      const isToday = 
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth() &&
        date.getFullYear() === new Date().getFullYear();

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 p-2 hover:bg-purple-50 cursor-pointer transition-colors ${
            isToday ? 'bg-purple-100 border-purple-400' : ''
          }`}
        >
          <div className="text-center mb-1">
            <div className="text-2xl">{lunar.phaseEmoji}</div>
            <div className="text-xs text-gray-600">
              {lunar.monthName.split(' ')[0]} {lunar.day}
            </div>
            <div className="text-xs text-gray-400">
              ({day})
            </div>
          </div>

          {/* Lunar special events */}
          {lunarDayEvents.map((evt, idx) => (
            <div
              key={idx}
              className={`text-xs px-1 py-0.5 rounded text-center ${
                evt.type === 'holiday' ? 'bg-red-100 text-red-800' :
                evt.type === 'phase' ? 'bg-yellow-100 text-yellow-800' :
                'bg-purple-100 text-purple-800'
              }`}
            >
              {evt.event.split(' ')[0]}
            </div>
          ))}

          {/* User events */}
          {dayEvents.length > 0 && (
            <div className="text-xs text-gray-500 text-center mt-1">
              • {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const lunarDate = gregorianToLunar(currentDate);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {calendarType === 'gregorian' ? monthName : lunarDate.monthName}
          </h2>
          {calendarType === 'lunar' && (
            <p className="text-sm text-gray-500">{monthName}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Calendar Type Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setCalendarType('gregorian')}
              className={` px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                calendarType === 'gregorian'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Gregorian
            </button>
            <button
              onClick={() => setCalendarType('lunar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                calendarType === 'lunar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🌙 Lunar
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Today
            </button>
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ◀
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-700 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-0 border border-gray-200">
          {calendarType === 'gregorian' ? renderGregorianCalendar() : renderLunarCalendar()}
        </div>
      )}
    </div>
  );
}
