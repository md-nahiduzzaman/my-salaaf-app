import { NextResponse } from 'next/server';
import { ensureTables } from '@/lib/db';
import { SHIFT_HOURS, LUNCH_MINUTES, dateInAppTimeZone } from '@/lib/config';

export const dynamic = 'force-dynamic';

function isValidDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || '');
}

function getCheckout(row) {
  const inTime = new Date(row.checkin_time);
  if (row.checkout_time) return new Date(row.checkout_time);
  return new Date(inTime.getTime() + SHIFT_HOURS * 3600000);
}

function withComputed(row) {
  if (!row) return null;
  const inTime = new Date(row.checkin_time);
  const outTime = getCheckout(row);
  const workedMs = Math.max(0, outTime.getTime() - inTime.getTime());
  const effectiveMs = Math.max(0, workedMs - LUNCH_MINUTES * 60000);

  return {
    ...row,
    day: typeof row.day === 'string' ? row.day.slice(0, 10) : row.day,
    checkout_time: outTime.toISOString(),
    effective_hours: Math.round((effectiveMs / 3600000) * 100) / 100,
  };
}

function parseDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req) {
  return saveCheckin(req);
}

export async function PUT(req) {
  return saveCheckin(req, true);
}

async function saveCheckin(req, isUpdate = false) {
  try {
    const sql = await ensureTables();
    const body = await req.json().catch(() => ({}));
    const checkinTime = parseDateTime(body.time) || new Date();
    const checkoutTime = parseDateTime(body.checkoutTime);

    if (!checkinTime) {
      return NextResponse.json({ error: 'Invalid check-in time' }, { status: 400 });
    }

    if (checkoutTime && checkoutTime <= checkinTime) {
      return NextResponse.json(
        { error: 'Check-out must be later than check-in.' },
        { status: 400 }
      );
    }

    const day = isValidDateString(body.day) ? body.day : dateInAppTimeZone(checkinTime);

    const rows = await sql`
      INSERT INTO checkins (day, checkin_time, checkout_time)
      VALUES (
        ${day}::date,
        ${checkinTime.toISOString()}::timestamptz,
        ${checkoutTime ? checkoutTime.toISOString() : null}::timestamptz
      )
      ON CONFLICT (day)
      DO UPDATE SET
        checkin_time = EXCLUDED.checkin_time,
        checkout_time = EXCLUDED.checkout_time
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
    const date = searchParams.get('date') || dateInAppTimeZone();

    if (!isValidDateString(date)) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    const rows = await sql`
      SELECT * FROM checkins WHERE day = ${date}::date;
    `;

    return NextResponse.json({ checkin: withComputed(rows[0]) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load check-in' }, { status: 500 });
  }
}
