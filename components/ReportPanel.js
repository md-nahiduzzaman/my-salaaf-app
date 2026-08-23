'use client';

import { useEffect, useState, useCallback } from 'react';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

function monthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtMs(ms) {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function ReportPanel({ refreshKey }) {
  const [scope, setScope] = useState('day');
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(monthStr());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const anchorDate = scope === 'month' ? `${month}-01` : date;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/report?scope=${scope}&date=${anchorDate}`);
      const data = await res.json();
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [scope, anchorDate]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  function copyText() {
    if (!report?.text) return;
    navigator.clipboard.writeText(report.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const taskRows = report ? Object.entries(report.taskTotals || {}).sort((a, b) => b[1] - a[1]) : [];

  return (
    <div>
      <div className="toggle-row" style={{ marginBottom: 14 }}>
        {['day', 'week', 'month'].map((m) => (
          <button
            key={m}
            className={`toggle-btn ${scope === m ? 'active' : ''}`}
            onClick={() => setScope(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        {scope === 'month' ? (
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        ) : (
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        )}
      </div>

      {loading && <div className="empty-state">Building report…</div>}

      {!loading && report && (
        <>
          <table className="report-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {taskRows.length === 0 ? (
                <tr>
                  <td colSpan={2}>No completed tasks in this period.</td>
                </tr>
              ) : (
                taskRows.map(([task, ms]) => (
                  <tr key={task}>
                    <td>{task}</td>
                    <td className="dur">{fmtMs(ms)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {taskRows.length > 0 && (
              <tfoot>
                <tr className="total-row">
                  <td>Office days logged: {report.daysPresent}</td>
                  <td className="dur">{fmtMs(report.totalEffectiveMs)} eff.</td>
                </tr>
              </tfoot>
            )}
          </table>

          {report.openStarts?.length > 0 && (
            <div className="in-progress-note">
              ● Still in progress: {report.openStarts.join(', ')}
            </div>
          )}

          <textarea className="text-report" readOnly value={report.text} />
          <div className="copy-row">
            <button className="btn" onClick={copyText}>
              {copied ? 'Copied ✓' : 'Copy as text'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
