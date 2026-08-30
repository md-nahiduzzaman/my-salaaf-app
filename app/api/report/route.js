import { NextResponse } from 'next/server';
import { ensureTables } from '@/lib/db';
import { getRange } from '@/lib/dateRange';
import { SHIFT_HOURS, APP_TIMEZONE, dateInAppTimeZone } from '@/lib/config';
import { pairEntries, formatDuration, formatTime, formatDay } from '@/lib/reportUtils';

export const dynamic = 'force-dynamic';

function totalMs(checkin) {
  const start = new Date(checkin.checkin_time);
  const end = checkin.checkout_time
    ? new Date(checkin.checkout_time)
    : new Date(start.getTime() + SHIFT_HOURS * 3600000);
  return Math.max(0, end.getTime() - start.getTime());
}

function overtimeMs(ms) {
  return Math.max(0, ms - SHIFT_HOURS * 3600000);
}

export async function GET(req) {
  try {
    const sql = await ensureTables();
    const { searchParams } = new URL(req.url);
    const scope = ['day', 'week', 'month'].includes(searchParams.get('scope'))
      ? searchParams.get('scope')
      : 'day';
    const date = searchParams.get('date') || dateInAppTimeZone();
    const { from, to } = getRange(scope, date);

    const checkins = await sql`
      SELECT * FROM checkins
      WHERE day BETWEEN ${from}::date AND ${to}::date
      ORDER BY day ASC;
    `;

    const entries = await sql`
      SELECT * FROM task_entries
      WHERE (ts AT TIME ZONE ${APP_TIMEZONE})::date BETWEEN ${from}::date AND ${to}::date
      ORDER BY ts ASC;
    `;

    const { pairs, openStarts, postponed = [] } = pairEntries(entries);

    const taskTotals = {};
    for (const p of pairs) {
      taskTotals[p.task] = (taskTotals[p.task] || 0) + p.durationMs;
    }

    const checkinSummaries = checkins.map((c) => {
      const start = new Date(c.checkin_time);
      const end = c.checkout_time
        ? new Date(c.checkout_time)
        : new Date(start.getTime() + SHIFT_HOURS * 3600000);
      const ms = Math.max(0, end.getTime() - start.getTime());
      return {
        day: formatDay(c.day),
        checkin: start.toISOString(),
        checkout: end.toISOString(),
        totalMs: ms,
        overtimeMs: overtimeMs(ms),
      };
    });

    const totalWorkMs = checkinSummaries.reduce((sum, c) => sum + c.totalMs, 0);
    const totalOvertimeMs = checkinSummaries.reduce((sum, c) => sum + c.overtimeMs, 0);

    const taskPairs = pairs.map((p) => ({
      task: p.task,
      start: { id: p.start.id, ts: new Date(p.start.ts).toISOString() },
      finish: { id: p.finish.id, ts: new Date(p.finish.ts).toISOString() },
      durationMs: p.durationMs,
    }));

    const lines = [];
    const label = scope === 'day' ? date : `${from} to ${to}`;
    lines.push(`Work Report (${scope}) — ${label}`);
    lines.push('');
    lines.push(`Office days logged: ${checkins.length}`);
    lines.push(`Total work time: ${formatDuration(totalWorkMs)}`);
    if (totalOvertimeMs > 0) lines.push(`Total overtime: ${formatDuration(totalOvertimeMs)}`);

    if (checkinSummaries.length) {
      lines.push('');
      if (scope === 'day') {
        lines.push('Check-in:');
      } else {
        lines.push('Daily summary:');
      }
      for (const c of checkinSummaries) {
        const suffix = c.overtimeMs > 0
          ? ` (Total ${formatDuration(c.totalMs)}, Overtime ${formatDuration(c.overtimeMs)})`
          : ` (Total ${formatDuration(c.totalMs)})`;
        lines.push(`- ${c.day}: In ${formatTime(c.checkin)} -> Out ${formatTime(c.checkout)}${suffix}`);
      }
    }

    lines.push('');
    lines.push('Tasks:');
    const taskKeys = Object.keys(taskTotals).sort((a, b) => taskTotals[b] - taskTotals[a]);
    if (!taskKeys.length) {
      lines.push('- No completed tasks in this period.');
    } else {
      taskKeys.forEach((task) => lines.push(`- ${task}: ${formatDuration(taskTotals[task])}`));
    }

    if (openStarts.length) {
      lines.push('');
      lines.push(`In progress (no finish logged): ${openStarts.map((o) => o.task).join(', ')}`);
    }
    if (postponed.length) {
      lines.push('');
      lines.push(`Postponed: ${postponed.map((o) => o.task).join(', ')}`);
    }

    return NextResponse.json({
      scope,
      from,
      to,
      daysPresent: checkins.length,
      totalWorkMs,
      totalOvertimeMs,
      checkins: checkinSummaries,
      taskTotals,
      taskPairs,
      openStarts: openStarts.map((o) => o.task),
      postponed: postponed.map((o) => o.task),
      text: lines.join('\n'),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to build report' }, { status: 500 });
  }
}
