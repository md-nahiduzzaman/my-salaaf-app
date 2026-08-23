import { NextResponse } from 'next/server';
import { ensureTables } from '@/lib/db';
import { APP_TIMEZONE } from '@/lib/config';

export const dynamic = 'force-dynamic';

function isValidDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '');
}

export async function POST(req) {
  try {
    const sql = await ensureTables();
    const body = await req.json().catch(() => ({}));
    const task = (body.task || '').trim();
    const type = ['start', 'finish', 'postpone'].includes(body.type) ? body.type : 'start';
    if (!task) return NextResponse.json({ error: 'Task name is required' }, { status: 400 });

    const ts = body.ts ? new Date(body.ts) : new Date();
    if (Number.isNaN(ts.getTime())) return NextResponse.json({ error: 'Invalid timestamp' }, { status: 400 });

    const rows = await sql`
      INSERT INTO task_entries (task, type, ts)
      VALUES (${task}, ${type}, ${ts.toISOString()}::timestamptz)
      RETURNING *;
    `;
    return NextResponse.json({ entry: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const sql = await ensureTables();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (date && !isValidDateString(date)) return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    if ((from && !isValidDateString(from)) || (to && !isValidDateString(to))) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    let rows;
    if (date) {
      rows = await sql`
        SELECT * FROM task_entries
        WHERE (ts AT TIME ZONE ${APP_TIMEZONE})::date = ${date}::date
        ORDER BY ts ASC;
      `;
    } else if (from && to) {
      rows = await sql`
        SELECT * FROM task_entries
        WHERE (ts AT TIME ZONE ${APP_TIMEZONE})::date BETWEEN ${from}::date AND ${to}::date
        ORDER BY ts ASC;
      `;
    } else {
      rows = await sql`SELECT * FROM task_entries ORDER BY ts DESC LIMIT 200;`;
    }
    return NextResponse.json({ entries: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load entries' }, { status: 500 });
  }
}
