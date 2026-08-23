"use client";

import { useEffect, useState, useCallback } from "react";

function todayStr() {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TodayDocket({ refreshKey, bumpRefresh }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

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

  async function updateTask(task, type, id) {
    setBusyId(id);

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task,
          type,
        }),
      });

      if (!res.ok) {
        throw new Error();
      }

      bumpRefresh();
    } catch {
      alert("Could not update task.");
    } finally {
      setBusyId(null);
    }
  }

  async function del(id) {
    try {
      await fetch(`/api/entries/${id}`, {
        method: "DELETE",
      });

      bumpRefresh();
    } catch {
      // ignore
    }
  }

  if (loading) {
    return <div className="empty-state">Loading…</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        No entries yet — log your first task above.
      </div>
    );
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

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {e.type === "start" && (
                <>
                  <button
                    className="docket-action finish-action"
                    disabled={busyId === e.id}
                    onClick={() => updateTask(e.task, "finish", e.id)}
                  >
                    ✓ Finish
                  </button>

                  <button
                    className="docket-action postpone-action"
                    disabled={busyId === e.id}
                    onClick={() => updateTask(e.task, "postpone", e.id)}
                  >
                    ↷ Postpone
                  </button>
                </>
              )}

              {e.type === "finish" && (
                <span className="stamp finish">Finished</span>
              )}

              {e.type === "postpone" && (
                <span className="stamp postpone">Postponed</span>
              )}

              <button
                className="del-btn"
                title="Delete entry"
                onClick={() => del(e.id)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
