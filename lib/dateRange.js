function pad(n) { return String(n).padStart(2, '0'); }

function parts(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '');
  if (!m) throw new Error('Invalid date');
  return { y: +m[1], mo: +m[2], d: +m[3] };
}

function iso(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

// Office week = Saturday through Thursday. Friday is the weekly off day.
export function getRange(scope, dateStr) {
  const { y, mo, d } = parts(dateStr);
  const date = new Date(Date.UTC(y, mo - 1, d));

  if (scope === 'week') {
    const dow = date.getUTCDay(); // Sun 0 ... Sat 6
    const sinceSaturday = (dow + 1) % 7;
    const from = new Date(date);
    from.setUTCDate(date.getUTCDate() - sinceSaturday);
    const to = new Date(from);
    to.setUTCDate(from.getUTCDate() + 5);
    return { from: iso(from), to: iso(to) };
  }

  if (scope === 'month') {
    const from = new Date(Date.UTC(y, mo - 1, 1));
    const to = new Date(Date.UTC(y, mo, 0));
    return { from: iso(from), to: iso(to) };
  }

  return { from: dateStr, to: dateStr };
}
