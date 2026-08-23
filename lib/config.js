// Single source of truth for office-hours and local calendar rules.
export const SHIFT_HOURS = 9; // check-out = check-in + SHIFT_HOURS
export const LUNCH_MINUTES = 90; // 1:00 PM - 2:30 PM
export const EFFECTIVE_HOURS = SHIFT_HOURS - LUNCH_MINUTES / 60; // 7.5

// Bangladesh local timezone.
// This keeps calendar dates and report times correct on Vercel.
export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Dhaka";

export function dateInAppTimeZone(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
