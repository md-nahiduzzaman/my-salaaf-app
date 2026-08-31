import { NextResponse } from 'next/server';
import { ensureTables } from '@/lib/db';
import { SHIFT_HOURS, dateInAppTimeZone } from '@/lib/config';

export const dynamic = 'force-dynamic';

function computedCheckout(checkinTime) {
  return new Date(
    new Date(checkinTime).getTime() + SHIFT_HOURS * 60 * 60 * 1000
  ).toISOString();
}

function withComputed(row) {
  if (!row) return null;

  const autoCheckout = computedCheckout(row.checkin_time);
  const checkout = row.checkout_time
    ? new Date(row.checkout_time).toISOString()
    : autoCheckout;

  return {
    ...row,
    day: typeof row.day === 'string' ? row.day.slice(0, 10) : row.day,
    checkout_time: checkout,
    checkout_is_manual: Boolean(row.checkout_time),
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

    const day = dateInAppTimeZone(checkinTime);

    const rows = await sql`
      INSERT INTO checkins (day, checkin_time, checkout_time)
      VALUES (${day}::date, ${checkinTime.toISOString()}::timestamptz, NULL)
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

export async function PUT(req) {
  try {
    const sql = await ensureTables();
    const body = await req.json().catch(() => ({}));
    const checkinTime = body.time ? new Date(body.time) : null;
    const checkoutTime = body.checkoutTime ? new Date(body.checkoutTime) : null;

    if (!checkinTime || Number.isNaN(checkinTime.getTime())) {
      return NextResponse.json({ error: 'Invalid check-in time' }, { status: 400 });
    }

    if (checkoutTime && Number.isNaN(checkoutTime.getTime())) {
      return NextResponse.json({ error: 'Invalid check-out time' }, { status: 400 });
    }

    if (checkoutTime && checkoutTime <= checkinTime) {
      return NextResponse.json(
        { error: 'Check-out must be later than check-in.' },
        { status: 400 }
      );
    }

    const day = body.day || dateInAppTimeZone(checkinTime);

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
    return NextResponse.json({ error: 'Failed to update check-in' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const sql = await ensureTables();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || dateInAppTimeZone();
    const rows = await sql`
      SELECT * FROM checkins WHERE day = ${date}::date;
    `;

    return NextResponse.json({ checkin: withComputed(rows[0]) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to load check-in' }, { status: 500 });
  }
}
