import pg from 'pg'
import 'dotenv/config'

const { Pool, types } = pg

// pg's default DATE parser builds a JS Date at local midnight, which then
// serializes to UTC and can shift the calendar date by a day depending on
// the server's OS timezone (bit us in testing: 2013-05-02 came back as
// 2013-05-01T16:00:00.000Z on a UTC+8 machine). A birthdate has no
// time-of-day component and must never be timezone-shifted — keep it as
// the raw "YYYY-MM-DD" string instead. OID 1082 = date.
types.setTypeParser(1082, (value) => value)

// Lazy-connects on first query, so the server can still boot (and non-DB
// routes still work) before DATABASE_URL is configured. See .env.example.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: true } : undefined,
})

export function query(text, params) {
  return pool.query(text, params)
}
