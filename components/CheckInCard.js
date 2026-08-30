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
    timeZone: "Asia/Dhaka",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeInputValue(iso) {
  if (!iso) return "";

  return new Date(iso).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatTotalTime(startIso, endIso) {
  if (!startIso || !endIso) return "—";

  const start = new Date(startIso);
  const end = new Date(endIso);

  const totalMinutes = Math.max(0, Math.round((end - start) / 60000));

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export default function CheckInCard({
  refreshKey,
  bumpRefresh,
  editMode = false,
}) {
  const [checkin, setCheckin] = useState(undefined);
  const [editing, setEditing] = useState(false);

  const [checkinInput, setCheckinInput] = useState("");
  const [checkoutInput, setCheckoutInput] = useState("");

  const [msg, setMsg] = useState("");

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

    setMsg("");
    setEditing(true);
  }

  function localDhakaIso(timeValue) {
    if (!timeValue) return null;

    const [h, m] = timeValue.split(":").map(Number);

    const date = todayStr();

    const utcMs = Date.UTC(
      Number(date.slice(0, 4)),
      Number(date.slice(5, 7)) - 1,
      Number(date.slice(8, 10)),
      h - 6,
      m,
      0,
      0,
    );

    return new Date(utcMs).toISOString();
  }

  async function submitCheckin(e) {
    e.preventDefault();

    if (!checkinInput) {
      setMsg("Enter check-in time.");
      return;
    }

    const time = localDhakaIso(checkinInput);

    // New check-in:
    // Checkout will be automatically calculated by the server.
    if (!checkin) {
      try {
        const res = await fetch("/api/checkin", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            time,
            checkoutTime: null,
            day: todayStr(),
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));

          throw new Error(data.error || "Could not save check-in.");
        }

        setEditing(false);
        setMsg("Check-in saved.");

        bumpRefresh();
      } catch (err) {
        setMsg(err.message || "Could not save check-in.");
      }

      return;
    }

    // Edit mode:
    // Checkout is required so overtime can be entered.
    if (!checkoutInput) {
      setMsg("Enter check-out time.");
      return;
    }

    const checkoutTime = localDhakaIso(checkoutInput);

    if (new Date(checkoutTime) <= new Date(time)) {
      setMsg("Check-out must be later than check-in.");
      return;
    }

    try {
      const res = await fetch("/api/checkin", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          time,
          checkoutTime,
          day: todayStr(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        throw new Error(data.error || "Could not update check-in.");
      }

      setEditing(false);
      setMsg("Check-in updated.");

      bumpRefresh();
    } catch (err) {
      setMsg(err.message || "Could not update check-in.");
    }
  }

  /*
   * Loading
   */
  if (checkin === undefined) {
    return <div className="checkin-card">Loading today&apos;s check-in…</div>;
  }

  /*
   * NEW CHECK-IN / EDIT MODE
   */
  if (!checkin || editing) {
    return (
      <form
        className="checkin-card"
        onSubmit={submitCheckin}
        style={{
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        <div className="section-head" style={{ marginBottom: 6 }}>
          <h2 className="section-title">
            {checkin ? "Edit Check-in" : "Check In"}
          </h2>
        </div>

        <div className="edit-checkin-grid">
          {/* CHECK-IN */}
          <label>
            Check-in
            <input
              type="time"
              value={checkinInput}
              onChange={(e) => setCheckinInput(e.target.value)}
            />
          </label>

          {/* CHECK-OUT ONLY WHEN EDITING */}
          {checkin && (
            <label>
              Check-out
              <input
                type="time"
                value={checkoutInput}
                onChange={(e) => setCheckoutInput(e.target.value)}
              />
            </label>
          )}
        </div>

        {/* NEW CHECK-IN MESSAGE */}
        {!checkin && (
          <div
            className="form-msg"
            style={{
              fontSize: "10px",
              opacity: 0.65,
              marginTop: "-4px",
            }}
          >
            Check-out will be calculated automatically.
          </div>
        )}

        <div className="btn-row">
          <button type="submit" className="btn start">
            Save
          </button>

          {checkin && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setEditing(false);
                setMsg("");
              }}
            >
              Cancel
            </button>
          )}
        </div>

        {msg && <div className="form-msg">{msg}</div>}
      </form>
    );
  }

  /*
   * TODAY'S CHECK-IN DISPLAY
   */
  const totalTime = formatTotalTime(
    checkin.checkin_time,
    checkin.checkout_time,
  );

  return (
    <div className="checkin-card">
      <div className="checkin-grid">
        {/* CHECK-IN */}
        <div>
          <div className="label">Check-in</div>

          <div className="value">{fmtTime(checkin.checkin_time)}</div>
        </div>

        {/* CHECK-OUT */}
        <div>
          <div className="label">Check-out</div>

          <div className="value">{fmtTime(checkin.checkout_time)}</div>
        </div>

        {/* TOTAL TIME */}
        <div>
          <div className="label">Total Time</div>

          <div className="value">{totalTime}</div>
        </div>
      </div>

      {/* SMALL LUNCH INFORMATION */}
      <div
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: "9px",
          opacity: 0.55,
          marginTop: "8px",
          letterSpacing: "0.3px",
        }}
      >
        Lunch 1:00–2:30 PM
      </div>

      {/* HIDDEN EDIT BUTTON */}
      {editMode && (
        <button className="btn" onClick={openEdit} style={{ marginTop: "8px" }}>
          Edit
        </button>
      )}
    </div>
  );
}
