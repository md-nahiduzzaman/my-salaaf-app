import { NextResponse } from 'next/server';
import { ensureTables } from '@/lib/db';
import { SHIFT_HOURS, EFFECTIVE_HOURS } from '@/lib/config';

export const dynamic = 'force-dynamic';

function dayStr(d) {
  return d.toISOString().slice(0, 10);
}

function withComputed(row) {
  if (!row) return null;
  const inTime = new Date(row.checkin_time);
  const outTime = new Date(inTime.getTime() + SHIFT_HOURS * 3600000);
  return {
    ...row,
    day: typeof row.day === 'string' ? row.day.slice(0, 10) : row.day,
    checkout_time: outTime.toISOString(),
    effective_hours: EFFECTIVE_HOURS,
  };
}

export async function POST(req) {
  try {
    const sql = await ensureTables();
    const body = await req.json().catch(() => ({}));
    const checkinTime = body.time ? new Date(body.time) : new Date();
    if (Number.isNaN(checkinTime.getTime())) {
      return NextResponse.json({ error: 'Invalid time' }, { status: 400 });
    }
    const day = dayStr(checkinTime);

    const rows = await sql`
      INSERT INTO checkins (day, checkin_time)
      VALUES (${day}::date, ${checkinTime.toISOString()}::timestamptz)
      ON CONFLICT (day)
      DO UPDATE SET checkin_time = EXCLUDED.checkin_time
      RETURNING *;
    `;

    return NextResponse.json({ checkin: withComputed(rows[0]) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to save check-in' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const sql = await ensureTables();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || dayStr(new Date());
    const rows = await sql`SELECT * FROM checkins WHERE day = ${date}::date;`;
    return NextResponse.json({ checkin: withComputed(rows[0]) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load check-in' }, { status: 500 });
  }
}
