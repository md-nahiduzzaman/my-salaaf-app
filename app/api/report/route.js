import { NextResponse } from 'next/server';
import { ensureTables } from '@/lib/db';
import { getRange } from '@/lib/dateRange';
import { SHIFT_HOURS, EFFECTIVE_HOURS } from '@/lib/config';
import {
  pairEntries,
  formatDuration,
  formatTime,
  formatDay,
} from '@/lib/reportUtils';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const sql = await ensureTables();
    const { searchParams } = new URL(req.url);
    const scope = ['day', 'week', 'month'].includes(searchParams.get('scope'))
      ? searchParams.get('scope')
      : 'day';
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const { from, to } = getRange(scope, date);

    const checkins = await sql`
      SELECT * FROM checkins
      WHERE day BETWEEN ${from}::date AND ${to}::date
      ORDER BY day ASC;
    `;
    const entries = await sql`
      SELECT * FROM task_entries
      WHERE ts::date BETWEEN ${from}::date AND ${to}::date
      ORDER BY ts ASC;
    `;

    const { pairs, openStarts } = pairEntries(entries);

    const taskTotals = {};
    pairs.forEach((p) => {
      taskTotals[p.task] = (taskTotals[p.task] || 0) + p.durationMs;
    });

    const daysPresent = checkins.length;
    const totalEffectiveMs = daysPresent * EFFECTIVE_HOURS * 3600000;

    const checkinSummaries = checkins.map((c) => {
      const inTime = new Date(c.checkin_time);
      const outTime = new Date(inTime.getTime() + SHIFT_HOURS * 3600000);
      return {
        day: formatDay(c.day),
        checkin: inTime.toISOString(),
        checkout: outTime.toISOString(),
      };
    });

    // --- Plain text report, ready to copy-paste ---
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
        lines.push(
          `- ${c.day}: In ${formatTime(c.checkin)} -> Out ${formatTime(
            c.checkout
          )} (Effective ${EFFECTIVE_HOURS}h)`
        );
      });
    }

    lines.push('');
    lines.push('Tasks:');
    const taskKeys = Object.keys(taskTotals).sort(
      (a, b) => taskTotals[b] - taskTotals[a]
    );
    if (taskKeys.length === 0) {
      lines.push('- No completed tasks in this period.');
    } else {
      taskKeys.forEach((task) => {
        lines.push(`- ${task}: ${formatDuration(taskTotals[task])}`);
      });
    }

    if (openStarts.length) {
      lines.push('');
      lines.push(
        `In progress (no finish logged): ${openStarts
          .map((o) => o.task)
          .join(', ')}`
      );
    }

    const text = lines.join('\n');

    return NextResponse.json({
      scope,
      from,
      to,
      daysPresent,
      totalEffectiveMs,
      checkins: checkinSummaries,
      taskTotals,
      openStarts: openStarts.map((o) => o.task),
      text,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to build report' }, { status: 500 });
  }
}
