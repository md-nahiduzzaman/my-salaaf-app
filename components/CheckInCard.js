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

export default function CheckInCard({ refreshKey, bumpRefresh }) {
  const [checkin, setCheckin] = useState(undefined); // undefined = loading, null = none
  const [editing, setEditing] = useState(false);
  const [timeInput, setTimeInput] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/checkin?date=${todayStr()}`);
      const data = await res.json();
      setCheckin(data.checkin || null);
    } catch {
      setCheckin(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function submitCheckin(e) {
    e.preventDefault();
    let iso;
    if (timeInput) {
      const [h, m] = timeInput.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      iso = d.toISOString();
    }
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(iso ? { time: iso } : {}),
      });
      if (!res.ok) throw new Error();
      setEditing(false);
      setMsg('Check-in saved.');
      bumpRefresh();
    } catch {
      setMsg('Could not save check-in.');
    }
  }

  if (checkin === undefined) {
    return <div className="checkin-card">Loading today&apos;s check-in…</div>;
  }

  if (!checkin || editing) {
    return (
      <form className="checkin-card" onSubmit={submitCheckin} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div className="section-head" style={{ marginBottom: 6 }}>
          <h2 className="section-title">Check In</h2>
        </div>
        <div className="btn-row">
          <input
            type="time"
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            placeholder="Now"
          />
          <button type="submit" className="btn start">
            Check In {timeInput ? '' : '(now)'}
          </button>
          {editing && (
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
          )}
        </div>
        {msg && <div className="form-msg">{msg}</div>}
      </form>
    );
  }

  return (
    <div className="checkin-card">
      <div className="checkin-grid">
        <div>
          <div className="label">Check-in</div>
          <div className="value">{fmtTime(checkin.checkin_time)}</div>
        </div>
        <div>
          <div className="label">Check-out</div>
          <div className="value">{fmtTime(checkin.checkout_time)}</div>
        </div>
        <div>
          <div className="label">Effective</div>
          <div className="value">{checkin.effective_hours}h</div>
        </div>
      </div>
      <button className="btn" onClick={() => setEditing(true)}>
        Edit
      </button>
    </div>
  );
}
