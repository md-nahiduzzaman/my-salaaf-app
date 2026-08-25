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
    timeZone: 'Asia/Dhaka',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function timeInputValue(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Dhaka',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function CheckInCard({ refreshKey, bumpRefresh }) {
  const [checkin, setCheckin] = useState(undefined);
  const [editing, setEditing] = useState(false);
  const [checkinInput, setCheckinInput] = useState('');
  const [checkoutInput, setCheckoutInput] = useState('');
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

  function openEdit() {
    setCheckinInput(timeInputValue(checkin.checkin_time));
    setCheckoutInput(timeInputValue(checkin.checkout_time));
    setMsg('');
    setEditing(true);
  }

  function localDhakaIso(timeValue) {
    if (!timeValue) return null;
    const [h, m] = timeValue.split(':').map(Number);
    const now = new Date();
    const date = todayStr();
    const utcMs = Date.UTC(
      Number(date.slice(0, 4)),
      Number(date.slice(5, 7)) - 1,
      Number(date.slice(8, 10)),
      h - 6,
      m,
      0,
      0
    );
    return new Date(utcMs).toISOString();
  }

  async function submitCheckin(e) {
    e.preventDefault();
    if (!checkinInput || !checkoutInput) {
      setMsg('Enter both check-in and check-out times.');
      return;
    }

    const time = localDhakaIso(checkinInput);
    const checkoutTime = localDhakaIso(checkoutInput);

    if (new Date(checkoutTime) <= new Date(time)) {
      setMsg('Check-out must be later than check-in.');
      return;
    }

    try {
      const res = await fetch('/api/checkin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time,
          checkoutTime,
          day: todayStr(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not save check-in.');
      }

      setEditing(false);
      setMsg('Check-in saved.');
      bumpRefresh();
    } catch (err) {
      setMsg(err.message || 'Could not save check-in.');
    }
  }

  if (checkin === undefined) {
    return <div className="checkin-card">Loading today&apos;s check-in…</div>;
  }

  if (!checkin || editing) {
    return (
      <form
        className="checkin-card"
        onSubmit={submitCheckin}
        style={{ flexDirection: 'column', alignItems: 'stretch' }}
      >
        <div className="section-head" style={{ marginBottom: 6 }}>
          <h2 className="section-title">{checkin ? 'Edit Check-in' : 'Check In'}</h2>
        </div>
        <div className="edit-checkin-grid">
          <label>
            Check-in
            <input type="time" value={checkinInput} onChange={(e) => setCheckinInput(e.target.value)} />
          </label>
          <label>
            Check-out
            <input type="time" value={checkoutInput} onChange={(e) => setCheckoutInput(e.target.value)} />
          </label>
        </div>
        <div className="btn-row">
          <button type="submit" className="btn start">Save</button>
          {checkin && (
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
          )}
        </div>
        <div className="form-msg">{msg}</div>
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
      <button className="btn" onClick={openEdit}>Edit</button>
    </div>
  );
}
