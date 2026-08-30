function pad(n) { return String(n).padStart(2, '0'); }

function toDateParts(dateStr) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
  if (!match) throw new Error('Invalid date');
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function isoFromUTC(date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/*
 * Office week:
 * Saturday -> Thursday
 * Friday is the weekly day off.
 *
 * For a Friday anchor, use the immediately preceding Saturday-Thursday
 * week so selecting any date still produces a useful office-week report.
 */
export function getRange(scope, dateStr) {
  const { year, month, day } = toDateParts(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day));

  if (scope === 'week') {
    const dayOfWeek = d.getUTCDay(); // Sun=0 ... Sat=6
    const daysSinceSaturday = (dayOfWeek + 1) % 7;

    const saturday = new Date(d);
    saturday.setUTCDate(d.getUTCDate() - daysSinceSaturday);

    const thursday = new Date(saturday);
    thursday.setUTCDate(saturday.getUTCDate() + 5);

    return {
      from: isoFromUTC(saturday),
      to: isoFromUTC(thursday),
    };
  }

  if (scope === 'month') {
    return {
      from: isoFromUTC(new Date(Date.UTC(year, month - 1, 1))),
      to: isoFromUTC(new Date(Date.UTC(year, month, 0))),
    };
  }

  return { from: dateStr, to: dateStr };
}
