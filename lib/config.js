// Single source of truth for the office-hours rule.
// Change these if the shift length or lunch window ever changes.
export const SHIFT_HOURS = 9; // check-out = check-in + SHIFT_HOURS
export const LUNCH_MINUTES = 90; // 1:00 PM - 2:30 PM
export const EFFECTIVE_HOURS = SHIFT_HOURS - LUNCH_MINUTES / 60; // 7.5
