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

  if (entries.length === 0) {
    return <div className="empty-state">No entries yet — log your first task above.</div>;
  }

  return (
    <div className="stub-list">
      {entries
        .slice()
        .reverse()
        .map((e) => (
          <div className="stub" key={e.id}>
            <div>
              <div className="task-name">{e.task}</div>
              <div className="meta">{fmtTime(e.ts)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className={`stamp ${e.type}`}>
                {e.type === 'start' ? 'Start' : 'Finish'}
              </span>
              <button className="del-btn" title="Delete entry" onClick={() => del(e.id)}>
                ×
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
