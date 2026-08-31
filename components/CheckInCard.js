'use client';

import { useEffect, useState, useCallback } from 'react';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

function localDhakaIso(timeValue) {
  if (!timeValue) return null;
  const [h, m] = timeValue.split(':').map(Number);
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

function formatTotalTime(startIso, endIso) {
  if (!startIso || !endIso) return '—';
  const minutes = Math.max(
    0,
    Math.round((new Date(endIso) - new Date(startIso)) / 60000)
  );
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

export default function CheckInCard({ refreshKey, bumpRefresh, editMode = false }) {
  const [checkin, setCheckin] = useState(undefined);
  const [editing, setEditing] = useState(false);
  const [checkinInput, setCheckinInput] = useState('');
  const [checkoutInput, setCheckoutInput] = useState('');
  const [msg, setMsg] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

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
    setCheckoutInput(checkin.checkout_is_manual ? timeInputValue(checkin.checkout_time) : '');
    setMsg('');
    setEditing(true);
  }

  async function handleCheckOut() {
    if (!checkin || checkingOut) return;

    setCheckingOut(true);
    setMsg('');

    try {
      const actualCheckout = new Date();
      const res = await fetch('/api/checkin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          time: checkin.checkin_time,
          checkoutTime: actualCheckout.toISOString(),
          day: checkin.day || todayStr(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not check out.');

      setCheckin(data.checkin);
      setMsg(`Checked out at ${fmtTime(data.checkin.checkout_time)}.`);
      bumpRefresh();
    } catch (err) {
      setMsg(err.message || 'Could not check out.');
    } finally {
      setCheckingOut(false);
    }
  }

  async function submitCheckin(e) {
    e.preventDefault();
    if (!checkinInput) {
      setMsg('Enter check-in time.');
      return;
    }

    const time = localDhakaIso(checkinInput);

    if (!checkin) {
      try {
        const res = await fetch('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ time }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not save check-in.');
        setEditing(false);
        setMsg('Check-in saved.');
        setCheckin(data.checkin);
        bumpRefresh();
      } catch (err) {
        setMsg(err.message || 'Could not save check-in.');
      }
      return;
    }

    if (!checkoutInput) {
      setMsg('Enter check-out time.');
      return;
    }

    const checkoutTime = localDhakaIso(checkoutInput);
    if (new Date(checkoutTime) <= new Date(time)) {
      setMsg('Check-out must be later than check-in.');
      return;
    }

    try {
      const res = await fetch('/api/checkin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time, checkoutTime, day: checkin.day || todayStr() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not update check-in.');
      setEditing(false);
      setMsg('Check-in updated.');
      setCheckin(data.checkin);
      bumpRefresh();
    } catch (err) {
      setMsg(err.message || 'Could not update check-in.');
    }
  }

  if (checkin === undefined) {
    return <div className="checkin-card">Loading today&apos;s check-in…</div>;
  }

  if (!checkin || editing) {
    return (
      <form className="checkin-card" onSubmit={submitCheckin} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        <div className="section-head" style={{ marginBottom: 6 }}>
          <h2 className="section-title">{checkin ? 'Edit Check-in' : 'Check In'}</h2>
        </div>
        <div className="edit-checkin-grid">
          <label>
            Check-in
            <input type="time" value={checkinInput} onChange={(e) => setCheckinInput(e.target.value)} />
          </label>
          {checkin && (
            <label>
              Check-out
              <input type="time" value={checkoutInput} onChange={(e) => setCheckoutInput(e.target.value)} />
            </label>
          )}
        </div>
        {!checkin && <div className="form-msg" style={{ fontSize: '10px', opacity: 0.65 }}>Check-out will be calculated automatically.</div>}
        <div className="btn-row">
          <button type="submit" className="btn start">Save</button>
          {checkin && <button type="button" className="btn" onClick={() => { setEditing(false); setMsg(''); }}>Cancel</button>}
        </div>
        {msg && <div className="form-msg">{msg}</div>}
      </form>
    );
  }

  const totalTime = formatTotalTime(checkin.checkin_time, checkin.checkout_time);

  return (
    <div className="checkin-card">
      <div className="checkin-grid">
        <div><div className="label">Check-in</div><div className="value">{fmtTime(checkin.checkin_time)}</div></div>
        <div><div className="label">Check-out</div><div className="value">{fmtTime(checkin.checkout_time)}</div></div>
        <div><div className="label">Total Time</div><div className="value">{totalTime}</div></div>
      </div>

      <div className="checkin-meta-row">
        <div className="lunch-note">Lunch 1:00–2:30 PM</div>
        {checkin.checkout_is_manual && <div className="checked-out-note">✓ Checked out</div>}
      </div>

      {!checkin.checkout_is_manual && (
        <button type="button" className="checkout-btn" onClick={handleCheckOut} disabled={checkingOut}>
          {checkingOut ? 'Checking out…' : 'Check Out'}
        </button>
      )}

      {editMode && <button type="button" className="btn" onClick={openEdit} style={{ marginTop: 8 }}>Edit</button>}
      {msg && <div className="form-msg">{msg}</div>}
    </div>
  );
}
