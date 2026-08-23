import { NextResponse } from 'next/server';
import { ensureTables } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
