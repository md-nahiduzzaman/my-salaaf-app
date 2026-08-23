// Pairs sequential start -> finish entries per task within a list.
// Returns completed pairs (with duration) and any still-open starts.
export function pairEntries(entries) {
  const byTask = {};
  entries.forEach((e) => {
    if (!byTask[e.task]) byTask[e.task] = [];
    byTask[e.task].push(e);
  });

  const pairs = [];
  const openStarts = [];

  Object.keys(byTask).forEach((task) => {
    const items = byTask[task].sort((a, b) => new Date(a.ts) - new Date(b.ts));
    let pending = null;
    items.forEach((e) => {
      if (e.type === 'start') {
        if (pending) openStarts.push({ task, start: pending });
        pending = e;
      } else if (e.type === 'finish') {
        if (pending) {
          pairs.push({
            task,
            start: pending,
            finish: e,
            durationMs: new Date(e.ts) - new Date(pending.ts),
          });
          pending = null;
        }
      }
    });
    if (pending) openStarts.push({ task, start: pending });
  });

  return { pairs, openStarts };
}

export function formatDuration(ms) {
  if (ms < 0) ms = 0;
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function formatTime(isoStr) {
  return new Date(isoStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDay(dayVal) {
  // Postgres DATE columns can come back as either a JS Date or a string
  // depending on driver settings - handle both.
  if (typeof dayVal === 'string') return dayVal.slice(0, 10);
  return dayVal.toISOString().slice(0, 10);
}
