"use client";

import { useEffect, useState, useCallback } from "react";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function monthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function fmtMs(ms) {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function timeValue(iso) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function dhakaIso(date, time) {
  const [y, mo, day] = date.split("-").map(Number);
  const [h, m] = time.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, day, h - 6, m)).toISOString();
}

export default function ReportPanel({ refreshKey }) {
  const [scope, setScope] = useState("day");
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(monthStr());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const anchorDate = scope === "month" ? `${month}-01` : date;

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

  function openEdit(pair) {
    setMsg("");
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
    if (!editing?.task.trim()) {
      setMsg("Enter a task name.");
      return;
    }

    const startIso = dhakaIso(editing.startDate, editing.startTime);
    const finishIso = dhakaIso(editing.finishDate, editing.finishTime);

    if (new Date(finishIso) <= new Date(startIso)) {
      setMsg("Finish time must be later than start time.");
      return;
    }

    setSaving(true);
    setMsg("");

    try {
      const first = await fetch(`/api/entries/${editing.pair.start.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: editing.task.trim(), ts: startIso }),
      });
      if (!first.ok) throw new Error("Could not update start entry.");

      const second = await fetch(`/api/entries/${editing.pair.finish.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: editing.task.trim(), ts: finishIso }),
      });
      if (!second.ok) throw new Error("Could not update finish entry.");

      setEditing(null);
      await load();
    } catch (err) {
      setMsg(err.message || "Could not save task.");
    } finally {
      setSaving(false);
    }
  }

  const taskPairs = report?.taskPairs || [];

  return (
    <div>
      <div className="toggle-row" style={{ marginBottom: 14 }}>
        {["day", "week", "month"].map((m) => (
          <button
            key={m}
            className={`toggle-btn ${scope === m ? "active" : ""}`}
            onClick={() => setScope(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        {scope === "month" ? (
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        ) : (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {taskPairs.length === 0 ? (
                <tr>
                  <td colSpan={3}>No completed tasks in this period.</td>
                </tr>
              ) : (
                taskPairs.map((pair) => (
                  <tr key={`${pair.start.id}-${pair.finish.id}`}>
                    <td>{pair.task}</td>
                    <td className="dur">{fmtMs(pair.durationMs)}</td>
                    <td className="edit-cell">
                      <button
                        className="table-edit-btn"
                        onClick={() => openEdit(pair)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {taskPairs.length > 0 && (
              <tfoot>
                <tr className="total-row">
                  <td>Office days logged: {report.daysPresent}</td>
                  <td className="dur">{fmtMs(report.totalEffectiveMs)} eff.</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>

          {report.openStarts?.length > 0 && (
            <div className="in-progress-note">
              ● Still in progress: {report.openStarts.join(", ")}
            </div>
          )}

          {report.postponed?.length > 0 && (
            <div className="in-progress-note postponed-note">
              ↷ Postponed: {report.postponed.join(", ")}
            </div>
          )}

          <textarea className="text-report" readOnly value={report.text} />
          <div className="copy-row">
            <button className="btn" onClick={copyText}>
              {copied ? "Copied ✓" : "Copy as text"}
            </button>
          </div>
        </>
      )}

      {editing && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => e.target === e.currentTarget && setEditing(null)}
        >
          <div className="edit-modal">
            <div className="section-head">
              <h2 className="section-title">Edit Task</h2>
              <button className="modal-close" onClick={() => setEditing(null)}>
                ×
              </button>
            </div>

            <label className="edit-field">
              Task name
              <input
                type="text"
                value={editing.task}
                onChange={(e) =>
                  setEditing({ ...editing, task: e.target.value })
                }
              />
            </label>

            <div className="edit-task-grid">
              <label className="edit-field">
                Start date
                <input
                  type="date"
                  value={editing.startDate}
                  onChange={(e) =>
                    setEditing({ ...editing, startDate: e.target.value })
                  }
                />
              </label>
              <label className="edit-field">
                Start time
                <input
                  type="time"
                  value={editing.startTime}
                  onChange={(e) =>
                    setEditing({ ...editing, startTime: e.target.value })
                  }
                />
              </label>
              <label className="edit-field">
                Finish date
                <input
                  type="date"
                  value={editing.finishDate}
                  onChange={(e) =>
                    setEditing({ ...editing, finishDate: e.target.value })
                  }
                />
              </label>
              <label className="edit-field">
                Finish time
                <input
                  type="time"
                  value={editing.finishTime}
                  onChange={(e) =>
                    setEditing({ ...editing, finishTime: e.target.value })
                  }
                />
              </label>
            </div>

            {msg && <div className="form-msg">{msg}</div>}

            <div className="btn-row">
              <button
                className="btn start"
                disabled={saving}
                onClick={saveEdit}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                className="btn"
                disabled={saving}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
