/**
 * Lunar Calendar Utilities for INOMAD KHURAL
 * 
 * Supports Mongolian Lunar Calendar (based on Chinese lunar calendar)
 * with traditional Mongolian month names and cultural observances.
 */

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
  isLeapMonth: boolean;
  phase: 'new' | 'waxing-crescent' | 'first-quarter' | 'waxing-gibbous' | 'full' | 'waning-gibbous' | 'last-quarter' | 'waning-crescent';
  phaseEmoji: string;
}

/**
 * Mongolian lunar month names
 */
export const MONGOLIAN_MONTHS = [
  'Цагаан сар',           // 1st - White Moon (Lunar New Year)
  'Хоёрдугаар сар',       // 2nd
  'Гуравдугаар сар',      // 3rd
  'Дөрөвдүгээр сар',      // 4th
  'Тавдугаар сар',        // 5th
  'Зургадугаар сар',      // 6th
  'Долдугаар сар',        // 7th
  'Наймдугаар сар',       // 8th
  'Есдүгээр сар',         // 9th
  'Аравдугаар сар',       // 10th
  'Арван нэгдүгээр сар',  // 11th
  'Арван хоёрдугаар сар', // 12th
];

/**
 * Get lunar phase emoji based on phase name
 */
export function getLunarPhaseEmoji(phase: LunarDate['phase']): string {
  const emojis = {
    'new': '🌑',
    'waxing-crescent': '🌒',
    'first-quarter': '🌓',
    'waxing-gibbous': '🌔',
    'full': '🌕',
    'waning-gibbous': '🌖',
    'last-quarter': '🌗',
    'waning-crescent': '🌘',
  };
  return emojis[phase];
}

/**
 * Calculate lunar phase from gregorian date
 * Uses simplified lunar phase calculation
 */
export function getLunarPhase(date: Date): LunarDate['phase'] {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Simplified calculation (for more accuracy, use a lunar calendar library)
  let c = 0;
  let e = 0;
  let jd = 0;
  let b = 0;

  if (month < 3) {
    const yearAdjusted = year - 1;
    const monthAdjusted = month + 12;
    c = Math.floor(yearAdjusted / 100);
    e = Math.floor(c / 4);
    jd = 365.25 * (yearAdjusted + 4716) + 30.6001 * (monthAdjusted + 1) + day + 2 - c + e - 1524.5;
  } else {
    c = Math.floor(year / 100);
    e = Math.floor(c / 4);
    jd = 365.25 * (year + 4716) + 30.6001 * (month + 1) + day + 2 - c + e - 1524.5;
  }

  const daysSinceNew = jd - 2451549.5;
  const newMoons = daysSinceNew / 29.53;
  const phase = (newMoons - Math.floor(newMoons)) * 29.53;

  if (phase < 1.84566) return 'new';
  if (phase < 5.53699) return 'waxing-crescent';
  if (phase < 9.22831) return 'first-quarter';
  if (phase < 12.91963) return 'waxing-gibbous';
  if (phase < 16.61096) return 'full';
  if (phase < 20.30228) return 'waning-gibbous';
  if (phase < 23.99361) return 'last-quarter';
  if (phase < 27.68493) return 'waning-crescent';
  return 'new';
}

/**
 * Simple Gregorian to Lunar conversion
 * Note: This is a simplified algorithm. For production, consider using
 * a library like 'lunar-javascript' or 'chinese-lunar-calendar'
 */
export function gregorianToLunar(date: Date): LunarDate {
  // This is a simplified placeholder implementation
  // For accurate conversion, we should use a proper lunar calendar library
  
  const phase = getLunarPhase(date);
  
  // Approximate lunar month (this is simplified - real calculation is complex)
  const gregorianMonth = date.getMonth();
  const lunarMonth = ((gregorianMonth + 11) % 12) + 1;
  
  // Approximate lunar day based on phase
  const phaseDay = {
    'new': 1,
    'waxing-crescent': 4,
    'first-quarter': 8,
    'waxing-gibbous': 12,
    'full': 15,
    'waning-gibbous': 19,
    'last-quarter': 23,
    'waning-crescent': 27,
  }[phase] || 1;
  
  return {
    year: date.getFullYear(),
    month: lunarMonth,
    day: phaseDay,
    monthName: MONGOLIAN_MONTHS[lunarMonth - 1],
    isLeapMonth: false,
    phase,
    phaseEmoji: getLunarPhaseEmoji(phase),
  };
}

/**
 * Convert lunar date to Gregorian (approximate)
 */
export function lunarToGregorian(lunarDate: LunarDate): Date {
  // Simplified conversion - in production use a proper library
  const gregorianMonth = (lunarDate.month + 1) % 12;
  return new Date(lunarDate.year, gregorianMonth, lunarDate.day);
}

/**
 * Check if date is Tsagaan Sar (Mongolian Lunar New Year)
 * Tsagaan Sar is celebrated on the first day of the first lunar month
 */
export function isTsagaanSar(date: Date): boolean {
  const lunar = gregorianToLunar(date);
  return lunar.month === 1 && lunar.day === 1;
}

/**
 * Check if date is full moon
 */
export function isFullMoon(date: Date): boolean {
  const phase = getLunarPhase(date);
  return phase === 'full';
}

/**
 * Check if date is new moon
 */
export function isNewMoon(date: Date): boolean {
  const phase = getLunarPhase(date);
  return phase === 'new';
}

/**
 * Get Mongolian month name
 */
export function getMonthName(month: number): string {
  if (month < 1 || month > 12) return '';
  return MONGOLIAN_MONTHS[month - 1];
}

/**
 * Format lunar date as string
 */
export function formatLunarDate(lunarDate: LunarDate): string {
  return `${lunarDate.monthName} ${lunarDate.day} ${lunarDate.phaseEmoji}`;
}

/**
 * Format dual date (Gregorian + Lunar)
 */
export function formatDualDate(date: Date): string {
  const lunar = gregorianToLunar(date);
  const gregorian = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  return `${gregorian} (${formatLunarDate(lunar)})`;
}

/**
 * Get important lunar events for a given month
 */
export function getLunarEventsForMonth(year: number, month: number): Array<{
  date: Date;
  event: string;
  type: 'holiday' | 'phase' | 'cultural';
}> {
  const events: Array<{ date: Date; event: string; type: 'holiday' | 'phase' | 'cultural' }> = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const lunar = gregorianToLunar(date);
    
    // Check for Tsagaan Sar
    if (lunar.month === 1 && lunar.day === 1) {
      events.push({
        date,
        event: 'Цагаан сар (Lunar New Year)',
        type: 'holiday',
      });
    }
    
    // Full moon
    if (lunar.phase === 'full') {
      events.push({
        date,
        event: `Бүтэн сар (Full Moon)`,
        type: 'phase',
      });
    }
    
    // New moon
    if (lunar.phase === 'new') {
      events.push({
        date,
        event: `Шинэ сар (New Moon)`,
        type: 'phase',
      });
    }
  }
  
  return events;
}
