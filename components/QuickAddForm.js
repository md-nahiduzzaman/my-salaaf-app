'use client';

import { useState } from 'react';

export default function QuickAddForm({ bumpRefresh }) {
  const [task, setTask] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function addEntry(type) {
    const name = task.trim();
    if (!name) {
      setMsg('Enter a task name first.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: name, type }),
      });
      if (!res.ok) throw new Error();
      setMsg(`Logged: ${name} — ${type === 'start' ? 'started' : 'finished'}.`);
      setTask('');
      bumpRefresh();
    } catch {
      setMsg('Could not save entry.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-dashed">
      <h2 className="section-title" style={{ marginBottom: 10, display: 'block' }}>
        Log a task
      </h2>
      <input
        type="text"
        className="full-input"
        placeholder="Task name — e.g. Gift box design"
        value={task}
        onChange={(e) => setTask(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') addEntry('start');
        }}
      />
      <div className="btn-row">
        <button className="btn start" disabled={busy} onClick={() => addEntry('start')}>
          ▶ Start
        </button>
        <button className="btn finish" disabled={busy} onClick={() => addEntry('finish')}>
          ■ Finish
        </button>
      </div>
      <div className="form-msg">{msg}</div>
    </div>
  );
}
