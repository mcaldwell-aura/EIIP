export interface WeeklyDigestTimeConfig {
  dayOfWeek: DayOfWeek;
  sendTime: string; // Format: "HH:mm AM/PM" (e.g., "06:00 PM")
}

export type DayOfWeek =
  | 'Sunday'
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const period = hour < 12 ? 'AM' : 'PM';
      const timeString = `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
      times.push(timeString);
    }
  }
  return times;
}

export const DEFAULT_WEEKLY_DIGEST_CONFIG: WeeklyDigestTimeConfig = {
  dayOfWeek: 'Friday',
  sendTime: '06:00 PM',
};
