import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { pool } from './pool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.join(__dirname, 'migrations')

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in first.')
    process.exit(1)
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()
  const { rows: applied } = await pool.query('SELECT filename FROM schema_migrations')
  const appliedSet = new Set(applied.map((r) => r.filename))

  let ranCount = 0
  for (const file of files) {
    if (appliedSet.has(file)) continue

    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`Applied ${file}`)
      ranCount += 1
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`Failed on ${file}:`, err.message)
      process.exit(1)
    } finally {
      client.release()
    }
  }

  console.log(ranCount === 0 ? 'Already up to date.' : `Applied ${ranCount} migration(s).`)
  await pool.end()
}

run()
