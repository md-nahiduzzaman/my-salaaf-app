import { NextResponse } from 'next/server';
import { ensureTables } from '@/lib/db';
import { getRange } from '@/lib/dateRange';
import { SHIFT_HOURS, EFFECTIVE_HOURS, LUNCH_MINUTES, APP_TIMEZONE, dateInAppTimeZone } from '@/lib/config';
import { pairEntries, formatDuration, formatTime, formatDay } from '@/lib/reportUtils';

export const dynamic = 'force-dynamic';

function effectiveMsForCheckin(c) {
  const inTime = new Date(c.checkin_time);
  const outTime = c.checkout_time
    ? new Date(c.checkout_time)
    : new Date(inTime.getTime() + SHIFT_HOURS * 3600000);
  return Math.max(0, outTime.getTime() - inTime.getTime() - LUNCH_MINUTES * 60000);
}

export async function GET(req) {
  try {
    const sql = await ensureTables();
    const { searchParams } = new URL(req.url);
    const scope = ['day', 'week', 'month'].includes(searchParams.get('scope')) ? searchParams.get('scope') : 'day';
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

    const { pairs, openStarts, postponed } = pairEntries(entries);
    const taskTotals = {};
    pairs.forEach((p) => {
      taskTotals[p.task] = (taskTotals[p.task] || 0) + p.durationMs;
    });

    const daysPresent = checkins.length;
    const totalEffectiveMs = checkins.reduce((sum, c) => sum + effectiveMsForCheckin(c), 0);

    const checkinSummaries = checkins.map((c) => {
      const inTime = new Date(c.checkin_time);
      const outTime = c.checkout_time
        ? new Date(c.checkout_time)
        : new Date(inTime.getTime() + SHIFT_HOURS * 3600000);
      const effectiveMs = effectiveMsForCheckin(c);
      return {
        day: formatDay(c.day),
        checkin: inTime.toISOString(),
        checkout: outTime.toISOString(),
        effectiveMs,
      };
    });

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
    lines.push(`Office days logged: ${daysPresent}`);
    lines.push(`Total effective work hours: ${formatDuration(totalEffectiveMs)}`);

    if (checkinSummaries.length) {
      lines.push('');
      lines.push('Check-ins:');
      checkinSummaries.forEach((c) => {
        lines.push(`- ${c.day}: In ${formatTime(c.checkin)} -> Out ${formatTime(c.checkout)} (Effective ${formatDuration(c.effectiveMs)})`);
      });
    }

    lines.push('');
    lines.push('Tasks:');
    const taskKeys = Object.keys(taskTotals).sort((a, b) => taskTotals[b] - taskTotals[a]);
    if (taskKeys.length === 0) {
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
      daysPresent,
      totalEffectiveMs,
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
