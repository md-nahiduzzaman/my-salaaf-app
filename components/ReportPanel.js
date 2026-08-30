'use client';

import { useEffect, useState, useCallback } from 'react';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function monthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseDateParts(s) {
  const [year, month, day] = s.split('-').map(Number);
  return { year, month, day };
}

function addDays(dateStr, days) {
  const { year, month, day } = parseDateParts(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function officeWeekRange(dateStr) {
  const { year, month, day } = parseDateParts(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day));
  const sinceSaturday = (d.getUTCDay() + 1) % 7;
  const from = new Date(d);
  from.setUTCDate(d.getUTCDate() - sinceSaturday);
  const to = new Date(from);
  to.setUTCDate(from.getUTCDate() + 5);
  const f = (x) => `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
  return { from: f(from), to: f(to) };
}

function prettyDate(s, withYear = false) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {})
  }).format(new Date(`${s}T00:00:00Z`));
}

function fmtMs(ms) {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function timeValue(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function dhakaIso(date, time) {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, m] = time.split(':').map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - 6, m)).toISOString();
}

function DayRow({ c }) {
  return (
    <tr>
      <td>{prettyDate(c.day, false)}</td>
      <td>{timeValue(c.checkin)}</td>
      <td>{timeValue(c.checkout)}</td>
      <td className="dur">{fmtMs(c.totalMs)}</td>
      <td className="dur">{c.overtimeMs > 0 ? `+${fmtMs(c.overtimeMs)}` : '—'}</td>
    </tr>
  );
}

function TaskSummaryTable({ taskRows, report, editMode, openEdit, emptyText }) {
  return (
    <table className="report-table">
      <thead>
        <tr>
          <th>Task</th>
          <th>Time</th>
          {editMode && <th></th>}
        </tr>
      </thead>
      <tbody>
        {taskRows.length === 0 ? (
          <tr>
            <td colSpan={editMode ? 3 : 2}>{emptyText}</td>
          </tr>
        ) : (
          taskRows.map(([task, ms]) => {
            const pair = report.taskPairs?.find((item) => item.task === task);
            return (
              <tr key={task}>
                <td>{task}</td>
                <td className="dur">{fmtMs(ms)}</td>
                {editMode && (
                  <td className="edit-cell">
                    {pair && (
                      <button
                        className="table-edit-btn"
                        onClick={() => openEdit(pair)}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

export default function ReportPanel({ refreshKey, editMode = false }) {
  const [scope, setScope] = useState('day');
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(monthStr());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const anchorDate = scope === 'month' ? `${month}-01` : date;
  const selectedWeek = scope === 'week' ? officeWeekRange(date) : null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/report?scope=${scope}&date=${anchorDate}`);
      setReport(await res.json());
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [scope, anchorDate]);

  useEffect(() => { load(); }, [load, refreshKey]);

  function copyText() {
    if (!report?.text) return;
    navigator.clipboard.writeText(report.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function openEdit(pair) {
    setMsg('');
    setEditing({
      pair,
      task: pair.task,
      startDate: pair.start.ts.slice(0, 10),
      startTime: timeValue(pair.start.ts),
      finishDate: pair.finish.ts.slice(0, 10),
      finishTime: timeValue(pair.finish.ts),
    });
  }

  async function saveEdit() {
    if (!editing?.task.trim()) return setMsg('Enter a task name.');
    const startIso = dhakaIso(editing.startDate, editing.startTime);
    const finishIso = dhakaIso(editing.finishDate, editing.finishTime);
    if (new Date(finishIso) <= new Date(startIso)) return setMsg('Finish time must be later than start time.');

    setSaving(true); setMsg('');
    try {
      const a = await fetch(`/api/entries/${editing.pair.start.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: editing.task.trim(), ts: startIso }),
      });
      if (!a.ok) throw new Error('Could not update start entry.');
      const b = await fetch(`/api/entries/${editing.pair.finish.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: editing.task.trim(), ts: finishIso }),
      });
      if (!b.ok) throw new Error('Could not update finish entry.');
      setEditing(null);
      await load();
    } catch (e) {
      setMsg(e.message || 'Could not save task.');
    } finally { setSaving(false); }
  }

  const taskRows = report ? Object.entries(report.taskTotals || {}).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div>
      <div className="toggle-row" style={{ marginBottom: 14 }}>
        {['day', 'week', 'month'].map((m) => (
          <button key={m} className={`toggle-btn ${scope === m ? 'active' : ''}`} onClick={() => setScope(m)}>{m}</button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        {scope === 'month' ? (
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        ) : scope === 'week' ? (
          <div className="week-picker">
            <button type="button" className="week-nav-btn" aria-label="Previous office week" onClick={() => setDate(addDays(selectedWeek.from, -7))}>‹</button>
            <div className="week-picker-main">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <div className="week-range-label">{prettyDate(selectedWeek.from)} — {prettyDate(selectedWeek.to, true)}</div>
              <div className="week-range-sub">Saturday → Thursday · Friday off</div>
            </div>
            <button type="button" className="week-nav-btn" aria-label="Next office week" onClick={() => setDate(addDays(selectedWeek.from, 7))}>›</button>
          </div>
        ) : (
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        )}
      </div>

      {loading && <div className="empty-state">Building report…</div>}

      {!loading && report && (
        <>
          {scope === 'day' ? (
            <table className="report-table">
              <thead><tr><th>Task</th><th>Time</th>{editMode && <th></th>}</tr></thead>
              <tbody>
                {taskRows.length === 0 ? (
                  <tr><td colSpan={editMode ? 3 : 2}>No completed tasks in this period.</td></tr>
                ) : (
                  taskRows.map(([task, ms]) => {
                    const pair = report.taskPairs?.find((p) => p.task === task);
                    return (
                      <tr key={task}>
                        <td>{task}</td>
                        <td className="dur">{fmtMs(ms)}</td>
                        {editMode && (
                          <td className="edit-cell">
                            {pair && <button className="table-edit-btn" onClick={() => openEdit(pair)}>Edit</button>}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot><tr className="total-row"><td>Office days logged: {report.daysPresent}</td><td className="dur">{fmtMs(report.totalWorkMs)}</td>{editMode && <td></td>}</tr>{report.totalOvertimeMs > 0 && <tr className="overtime-row"><td>Overtime</td><td className="dur">+{fmtMs(report.totalOvertimeMs)}</td>{editMode && <td></td>}</tr>}</tfoot>
            </table>
          ) : scope === 'week' ? (
            <>
              <table className="report-table daily-report-table">
                <thead><tr><th>Date</th><th>In</th><th>Out</th><th>Total</th><th>Overtime</th></tr></thead>
                <tbody>
                  {report.checkins?.length ? report.checkins.map((c) => <DayRow key={c.day} c={c} />) : <tr><td colSpan={5}>No office days logged in this week.</td></tr>}
                </tbody>
                <tfoot>
                  <tr className="total-row"><td colSpan={3}>Office days logged: {report.daysPresent}</td><td className="dur">{fmtMs(report.totalWorkMs)}</td><td className="dur">{report.totalOvertimeMs > 0 ? `+${fmtMs(report.totalOvertimeMs)}` : '—'}</td></tr>
                </tfoot>
              </table>
              <div className="report-subhead">TASK SUMMARY</div>
              <TaskSummaryTable
                taskRows={taskRows}
                report={report}
                editMode={editMode}
                openEdit={openEdit}
                emptyText="No completed tasks in this week."
              />
            </>
          ) : (
            <>
              <table className="report-table daily-report-table">
                <thead><tr><th>Date</th><th>Total</th><th>Overtime</th></tr></thead>
                <tbody>{report.checkins?.length ? report.checkins.map((c) => <tr key={c.day}><td>{prettyDate(c.day, false)}</td><td className="dur">{fmtMs(c.totalMs)}</td><td className="dur">{c.overtimeMs > 0 ? `+${fmtMs(c.overtimeMs)}` : '—'}</td></tr>) : <tr><td colSpan={3}>No office days logged in this month.</td></tr>}</tbody>
                <tfoot><tr className="total-row"><td>Office days logged: {report.daysPresent}</td><td className="dur">{fmtMs(report.totalWorkMs)}</td><td className="dur">{report.totalOvertimeMs > 0 ? `+${fmtMs(report.totalOvertimeMs)}` : '—'}</td></tr></tfoot>
              </table>
              <div className="report-subhead">TASK SUMMARY</div>
              <TaskSummaryTable
                taskRows={taskRows}
                report={report}
                editMode={editMode}
                openEdit={openEdit}
                emptyText="No completed tasks in this month."
              />
            </>
          )}

          {report.openStarts?.length > 0 && <div className="in-progress-note">● Still in progress: {report.openStarts.join(', ')}</div>}
          {report.postponed?.length > 0 && <div className="in-progress-note postponed-note">↷ Postponed: {report.postponed.join(', ')}</div>}

          <textarea className="text-report" readOnly value={report.text} />
          <div className="copy-row"><button className="btn" onClick={copyText}>{copied ? 'Copied ✓' : 'Copy as text'}</button></div>
        </>
      )}

      {editing && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setEditing(null)}>
          <div className="edit-modal">
            <div className="section-head"><h2 className="section-title">Edit Task</h2><button className="modal-close" onClick={() => setEditing(null)}>×</button></div>
            <label className="edit-field">Task name<input type="text" value={editing.task} onChange={(e) => setEditing({ ...editing, task: e.target.value })} /></label>
            <div className="edit-task-grid">
              <label className="edit-field">Start date<input type="date" value={editing.startDate} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} /></label>
              <label className="edit-field">Start time<input type="time" value={editing.startTime} onChange={(e) => setEditing({ ...editing, startTime: e.target.value })} /></label>
              <label className="edit-field">Finish date<input type="date" value={editing.finishDate} onChange={(e) => setEditing({ ...editing, finishDate: e.target.value })} /></label>
              <label className="edit-field">Finish time<input type="time" value={editing.finishTime} onChange={(e) => setEditing({ ...editing, finishTime: e.target.value })} /></label>
            </div>
            {msg && <div className="form-msg">{msg}</div>}
            <div className="btn-row"><button className="btn start" disabled={saving} onClick={saveEdit}>{saving ? 'Saving…' : 'Save changes'}</button><button className="btn" disabled={saving} onClick={() => setEditing(null)}>Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
