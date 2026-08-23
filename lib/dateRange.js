function iso(d) {
  return d.toISOString().slice(0, 10);
}

// Returns { from, to } as YYYY-MM-DD strings (inclusive) for a given
// scope, anchored on dateStr (also YYYY-MM-DD).
export function getRange(scope, dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);

  if (scope === 'week') {
    const day = d.getDay(); // 0 = Sunday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: iso(monday), to: iso(sunday) };
  }

  if (scope === 'month') {
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { from: iso(first), to: iso(last) };
  }

  // default: day
  return { from: dateStr, to: dateStr };
}
