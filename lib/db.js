import { neon } from "@neondatabase/serverless";

let sqlClient = null;
let initialized = false;

function getConnectionString() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    null
  );
}

function getSql() {
  if (!sqlClient) {
    const connectionString = getConnectionString();

    if (!connectionString) {
      throw new Error(
        "No database connection string found. Connect a Postgres (Neon) database to this project in the Vercel Storage tab, or set DATABASE_URL locally.",
      );
    }

    sqlClient = neon(connectionString);
  }

  return sqlClient;
}

export async function ensureTables() {
  const sql = getSql();

  if (initialized) return sql;

  await sql`
    CREATE TABLE IF NOT EXISTS checkins (
      id SERIAL PRIMARY KEY,
      day DATE NOT NULL UNIQUE,
      checkin_time TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS task_entries (
      id SERIAL PRIMARY KEY,
      task TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('start', 'finish', 'postpone')),
      ts TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  /*
   * Existing databases may already have the old
   * CHECK constraint that only allowed start/finish.
   * Replace it so "postpone" can also be stored.
   */
  await sql`
    ALTER TABLE task_entries
    DROP CONSTRAINT IF EXISTS task_entries_type_check;
  `;

  await sql`
    ALTER TABLE task_entries
    ADD CONSTRAINT task_entries_type_check
    CHECK (type IN ('start', 'finish', 'postpone'));
  `;

  initialized = true;
  return sql;
}
