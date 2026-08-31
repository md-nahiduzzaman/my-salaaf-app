// Single source of truth for the office-hours rule.
export const SHIFT_HOURS = 9;
export const LUNCH_MINUTES = 90; // 1:00 PM - 2:30 PM
export const EFFECTIVE_HOURS = SHIFT_HOURS - LUNCH_MINUTES / 60;
export const APP_TIMEZONE = 'Asia/Dhaka';

export function dateInAppTimeZone(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

export function timeInAppTimeZone(value) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
