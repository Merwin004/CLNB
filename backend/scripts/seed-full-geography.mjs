// One-off script: replaces the placeholder geography seed (3 regions, a
// handful of provinces/cities/barangays — see 0002-0004 migrations) with the
// real nationwide region/province/city-municipality lists from the source
// workbook's hidden "Codes" sheet (region list) and "Province"/
// "City-Municipality" sheets (region -> province -> city cascades). Answers
// "why does the system only have three regions" — those three were always a
// placeholder sized to the original mock data, not the real form's list.
//
// Existing region/province/city rows that were placeholders under an
// informal name (e.g. regions.name = 'NCR') get RENAMED in place to the
// official name (e.g. 'NATIONAL CAPITAL REGION (NCR)') rather than replaced,
// so any child_profiles row already pointing at that id by FK keeps working
// — see data/ph-geography.json's `renameFrom` fields, generated once from
// the workbook (not re-fetched live — this is stable reference data, unlike
// import-legacy-database-sheet.mjs's historical rows).
//
// Barangays are NOT included here — the source workbook has no barangay
// master list at all (there are ~42,000 nationwide; DOLE's real form takes
// Barangay as free text, not a validated dropdown). Our schema still models
// present_barangay_id as a lookup FK, which is a real mismatch worth
// revisiting separately — this script doesn't touch it.
//
// Safe to re-run. Run from backend/: node scripts/seed-full-geography.mjs

import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { pool } from '../src/db/pool.js'

async function upsertByRename(table, nameColumn, row, lookupExtra) {
  if (row.renameFrom) {
    const { rowCount } = await pool.query(
      `UPDATE ${table} SET ${nameColumn} = $1 WHERE ${nameColumn} = $2${lookupExtra ? ` AND ${lookupExtra.clause}` : ''}`,
      lookupExtra ? [row.name, row.renameFrom, ...lookupExtra.params] : [row.name, row.renameFrom],
    )
    if (rowCount > 0) return 'renamed'
  }
  return null // caller falls back to a normal insert
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in first.')
    process.exit(1)
  }

  const { regions, provinces, cities } = JSON.parse(await readFile(new URL('./data/ph-geography.json', import.meta.url)))

  let regionsRenamed = 0
  let regionsInserted = 0
  for (const r of regions) {
    if ((await upsertByRename('regions', 'name', r)) === 'renamed') {
      regionsRenamed += 1
    } else {
      const { rowCount } = await pool.query('INSERT INTO regions (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [r.name])
      regionsInserted += rowCount
    }
  }
  console.log(`Regions: ${regionsRenamed} renamed, ${regionsInserted} inserted (of ${regions.length}).`)

  let provincesRenamed = 0
  let provincesInserted = 0
  let provincesSkipped = 0
  for (const p of provinces) {
    const { rows: regionRows } = await pool.query('SELECT id FROM regions WHERE name = $1', [p.region])
    if (regionRows.length === 0) {
      console.warn(`Skipping province "${p.name}" — region "${p.region}" not found`)
      provincesSkipped += 1
      continue
    }
    const regionId = regionRows[0].id
    if (p.renameFrom && (await upsertByRename('provinces', 'name', p, { clause: 'region_id = $3', params: [regionId] })) === 'renamed') {
      provincesRenamed += 1
    } else {
      const { rowCount } = await pool.query(
        'INSERT INTO provinces (region_id, name) VALUES ($1, $2) ON CONFLICT (region_id, name) DO NOTHING',
        [regionId, p.name],
      )
      provincesInserted += rowCount
    }
  }
  console.log(`Provinces: ${provincesRenamed} renamed, ${provincesInserted} inserted, ${provincesSkipped} skipped (of ${provinces.length}).`)

  let citiesRenamed = 0
  let citiesInserted = 0
  let citiesSkipped = 0
  for (const c of cities) {
    const { rows: provinceRows } = await pool.query('SELECT id FROM provinces WHERE name = $1', [c.province])
    if (provinceRows.length === 0) {
      console.warn(`Skipping city "${c.name}" — province "${c.province}" not found`)
      citiesSkipped += 1
      continue
    }
    const provinceId = provinceRows[0].id
    if (c.renameFrom && (await upsertByRename('cities_municipalities', 'name', c, { clause: 'province_id = $3', params: [provinceId] })) === 'renamed') {
      citiesRenamed += 1
    } else {
      const { rowCount } = await pool.query(
        'INSERT INTO cities_municipalities (province_id, name) VALUES ($1, $2) ON CONFLICT (province_id, name) DO NOTHING',
        [provinceId, c.name],
      )
      citiesInserted += rowCount
    }
  }
  console.log(`Cities/Municipalities: ${citiesRenamed} renamed, ${citiesInserted} inserted, ${citiesSkipped} skipped (of ${cities.length}).`)

  await pool.end()
}

main()
