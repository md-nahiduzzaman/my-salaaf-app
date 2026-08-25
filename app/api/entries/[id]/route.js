import { NextResponse } from 'next/server';
import { ensureTables } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(req, { params }) {
  try {
    const sql = await ensureTables();
    const { id } = await params;
    if (!id || Number.isNaN(Number(id))) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const task = String(body.task || '').trim();
    const ts = new Date(body.ts);

    if (!task || Number.isNaN(ts.getTime())) {
      return NextResponse.json({ error: 'Task and valid time are required.' }, { status: 400 });
    }

    const rows = await sql`
      UPDATE task_entries
      SET task = ${task}, ts = ${ts.toISOString()}::timestamptz
      WHERE id = ${id}
      RETURNING *;
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: 'Entry not found.' }, { status: 404 });
    }

    return NextResponse.json({ entry: rows[0] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const sql = await ensureTables();
    const { id } = await params;
    if (!id || Number.isNaN(Number(id))) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    await sql`DELETE FROM task_entries WHERE id = ${id};`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
