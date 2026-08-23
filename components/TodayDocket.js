'use client';

import { useEffect, useState, useCallback } from 'react';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Show only tasks whose latest event is START.
// FINISH/POSTPONE are stored as history events, but are not shown as a
// second task in Today's Docket. If the same task is started again later,
// its newest START becomes visible again.
function getActiveStarts(entries) {
  const latestByTask = new Map();

  entries
    .slice()
    .sort((a, b) => new Date(a.ts) - new Date(b.ts))
    .forEach((entry) => {
      latestByTask.set(entry.task, entry);
    });

  return Array.from(latestByTask.values())
    .filter((entry) => entry.type === 'start')
    .sort((a, b) => new Date(b.ts) - new Date(a.ts));
}

export default function TodayDocket({ refreshKey, bumpRefresh }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/entries?date=${todayStr()}`);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function del(id) {
    try {
      await fetch(`/api/entries/${id}`, { method: 'DELETE' });
      bumpRefresh();
    } catch {
      // ignore - list will just stay as-is on failure
    }
  }

  if (loading) {
    return <div className="empty-state">Loading…</div>;
  }

  const activeTasks = getActiveStarts(entries);

  if (activeTasks.length === 0) {
    return <div className="empty-state">No active tasks — add a new task above.</div>;
  }

  return (
    <div className="stub-list">
      {activeTasks.map((e) => (
        <div className="stub" key={e.id}>
          <div>
            <div className="task-name">{e.task}</div>
            <div className="meta">{fmtTime(e.ts)}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="docket-action finish-action"
              onClick={async () => {
                const res = await fetch('/api/entries', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ task: e.task, type: 'finish' }),
                });
                if (res.ok) bumpRefresh();
              }}
            >
              ✓ Finish
            </button>

            <button
              className="docket-action postpone-action"
              onClick={async () => {
                const res = await fetch('/api/entries', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ task: e.task, type: 'postpone' }),
                });
                if (res.ok) bumpRefresh();
              }}
            >
              ↷ Postpone
            </button>

            <button className="del-btn" title="Delete entry" onClick={() => del(e.id)}>
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
