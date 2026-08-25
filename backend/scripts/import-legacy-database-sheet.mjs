// One-off script: imports the real historical records from the source
// workbook's "Database" tab (Region IV-B / MIMAROPA, Oriental Mindoro —
// 20 rows as of 2026-08-24) into the real DB. This is the same "Database"
// sheet shape POST /api/profiles/import now accepts day-to-day (see
// import.routes.js, backend/assets/child-profile-import-template-master.xlsx,
// and the shared parsing helpers in ../src/lib/databaseFormat.js) — but this
// script stays separate rather than being folded into that route, because it
// fetches the sheet live from Google Sheets (not an uploaded file) and
// preserves each row's own historical control_no/status instead of
// generating a new draft, which the live import route deliberately never does.
//
// Safe to re-run — skips any control_no that already exists (the sheet's
// own "Child's ID No." column is already in our CL-{year}-{RO}-{FO}-{seq}-{sex}
// format, so it's used as control_no directly instead of generating a new one).
//
// Run from backend/: node scripts/import-legacy-database-sheet.mjs

import 'dotenv/config'
import { pool } from '../src/db/pool.js'
import { resolveGeography } from '../src/lib/geography.js'
import { toBool, toInt, toNumeric } from '../src/lib/coerce.js'
import { blank, parseName, parseDate, parseCodeList, parseCodeText, parseBlob } from '../src/lib/databaseFormat.js'

const SHEET_ID = '1DKA2JsfYa7DaGRiHvvDBm5E4i0hREGWr'
const DATABASE_TAB_GID = '764781843'
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${DATABASE_TAB_GID}`

const REGIONAL_OFFICE_CODE = 'R4B'
const FIELD_OFFICE_CODE = 'R4B-3'

function parseCsv(text) {
  const rows = []
  let row = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(cur)
      cur = ''
    } else if (c === '\n') {
      row.push(cur)
      cur = ''
      rows.push(row)
      row = []
    } else if (c !== '\r') {
      cur += c
    }
  }
  if (cur !== '' || row.length > 0) {
    row.push(cur)
    rows.push(row)
  }
  return rows
}

// A handful of geography cells have a stray comma-for-period typo
// ("STO, NINO" vs the "STO. NINO" spelling used elsewhere for the same
// barangay) — normalize rather than seed two rows for what's the same place.
function normalizeBarangay(raw) {
  const t = blank(raw)
  return t === 'STO, NINO' ? 'STO. NINO' : t
}

// One row's Sex cell is "No Input" (missing at encoding time) — the
// control_no's trailing M/F/X suffix is an authoritative fallback since it's
// generated from sex at creation time. (Only applies to this historical
// import, where control_no is already known — a live upload with no sex is
// just rejected, since there's no control_no yet to infer it from.)
function parseSex(raw, controlNo) {
  const t = blank(raw)
  if (t === 'Male' || t === 'Female') return t
  const suffix = controlNo.slice(-1)
  return suffix === 'M' ? 'Male' : suffix === 'F' ? 'Female' : null
}

async function fetchRows() {
  const res = await fetch(CSV_URL)
  if (!res.ok) throw new Error(`Could not fetch the Database tab (HTTP ${res.status}) — is the sheet still shared "Anyone with the link"?`)
  const rows = parseCsv(await res.text())
  return rows.slice(1).filter((r) => r.some((cell) => cell.trim() !== ''))
}

function mapRow(cols) {
  const { lastName, firstName, middleName } = parseName(cols[3])
  const placeOfBirthSameAsPresent = blank(cols[16]) === 'Same as Present Address'

  const familyMembers = []
  for (let i = 63; i <= 74; i++) {
    const blob = parseBlob(cols[i])
    if (!blob) continue
    familyMembers.push({
      name: blob.Name || null,
      relationship: blob.Rel || null,
      sex: blob.Sex || null,
      age: toInt(blob.Age),
      civil_status: blob['Civil Status'] || null,
      is_solo_parent: toBool(blob['Solo Parent']),
      highest_education: blob['Highest Educ'] || null,
      occupation: blob.Occupation || null,
      monthly_income: toNumeric(blob['Monthly Income']),
      skills: blob.Skills || null,
      whereabouts: blob.Whereabouts || null,
      disability_ailment: blob['Disability/Ailment'] || null,
    })
  }

  const servicesAvailed = []
  for (let i = 77; i <= 88; i++) {
    const blob = parseBlob(cols[i])
    const assistance = blob?.['Assistance Already Availed by the Family']
    if (!blob || !blank(assistance)) continue
    servicesAvailed.push({
      assistance,
      source: blob['Source of Assistance'] || null,
      year_availed: blob['Year Availed'] || null,
      availed_by: blob['Family Member Who Availed the Service'] || null,
      remarks: blob.Remarks || null,
    })
  }

  const servicesRequested = []
  for (let i = 89; i <= 100; i++) {
    const blob = parseBlob(cols[i])
    const assistance = blob?.['Type of Assistance Requested']
    if (!blob || !blank(assistance) || assistance.trim().toUpperCase() === 'NONE') continue
    const period = [blob['Start of Assistance'], blob['End of Assistance']].map(blank).filter(Boolean).join('–')
    servicesRequested.push({
      assistance,
      source: blob['Source of Assistance'] || null,
      period: period || null,
      requested_by: blob['Family Member Who Requested the Assistance'] || null,
      remarks: blob.Remarks || null,
    })
  }

  return {
    controlNo: cols[2].trim(),
    lastName,
    firstName,
    middleName: middleName || null,
    present: { region: blank(cols[4]), province: blank(cols[5]), municipality: blank(cols[7]), barangay: normalizeBarangay(cols[8]) },
    presentSitio: blank(cols[9]) || null,
    presentPhone: blank(cols[10]) || null,
    sex: parseSex(cols[11], cols[2].trim()),
    dob: parseDate(cols[12]),
    birthCertificate: toBool(blank(cols[15])),
    placeOfBirthSameAsPresent,
    religion: blank(cols[23]) || null,
    indigenousGroup: toBool(blank(cols[24])),
    livingWith: blank(cols[25]) || null,
    dwellingMaterial: blank(cols[28]) || null,
    everAttendedSchool: toBool(blank(cols[29])),
    attendingNow: toBool(blank(cols[30])),
    highestGrade: blank(cols[32]) || null,
    formOfEducation: blank(cols[33]) || null,
    ageStoppedSchooling: toInt(blank(cols[34])),
    dropoutReasons: parseCodeList(cols[35]),
    hasDisability: toBool(blank(cols[36])),
    heightCm: toNumeric(blank(cols[39])),
    weightKg: toNumeric(blank(cols[40])),
    ailments: parseCodeList(cols[41]),
    familyAilments: parseCodeList(cols[43]),
    taskPerformed: parseCodeText(cols[44]),
    employerName: blank(cols[45]) || null,
    employerContact: blank(cols[46]) || null,
    workArrangement: parseCodeText(cols[52]),
    hoursPerDay: toNumeric(blank(cols[53])),
    daysPerWeek: toInt(blank(cols[54])),
    ageStartedWorking: toInt(blank(cols[56])),
    hazards: parseCodeList(cols[57]),
    paymentBasis: parseCodeText(cols[58]),
    monthlyIncome: toNumeric(blank(cols[59])),
    earningsUse: parseCodeList(cols[60]),
    adultSupervises: toBool(blank(cols[61])),
    workSupervisor: parseCodeText(cols[62]),
    is4Ps: toBool(blank(cols[75])),
    householdIdNumber: blank(cols[76]) || null,
    familyMembers,
    servicesAvailed,
    servicesRequested,
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Copy backend/.env.example to backend/.env and fill it in first.')
    process.exit(1)
  }

  const { rows: userRows } = await pool.query('SELECT id FROM users ORDER BY id ASC LIMIT 1')
  if (userRows.length === 0) {
    console.error('No users found — register the encoder account first (POST /api/auth/register).')
    process.exit(1)
  }
  const createdBy = userRows[0].id

  const rawRows = await fetchRows()
  console.log(`Fetched ${rawRows.length} data row(s) from the Database tab.`)

  let created = 0
  let skipped = 0
  let failed = 0

  for (const cols of rawRows) {
    const row = mapRow(cols)

    const existing = await pool.query('SELECT id FROM child_profiles WHERE control_no = $1', [row.controlNo])
    if (existing.rows.length > 0) {
      skipped += 1
      continue
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const presentGeo = await resolveGeography(row.present)
      const birthGeo = row.placeOfBirthSameAsPresent ? presentGeo : null
      const year = parseInt(row.controlNo.match(/^CL-(\d{4})-/)?.[1], 10) || new Date().getFullYear()

      const { rows: inserted } = await client.query(
        `INSERT INTO child_profiles (
           control_no, year, regional_office_code, field_office_code, status,
           last_name, first_name, middle_name,
           present_region_id, present_province_id, present_city_id, present_barangay_text,
           present_sitio, present_phone, sex, date_of_birth, birth_certificate,
           birth_region_id, birth_province_id, birth_city_id, birth_barangay_id,
           religion, indigenous_group, living_with, dwelling_material,
           ever_attended_school, attending_now, highest_grade, form_of_education,
           age_stopped_schooling, dropout_reasons,
           has_disability, height_cm, weight_kg, ailments, family_ailments,
           task_performed, employer_name, employer_contact,
           work_arrangement, hours_per_day, days_per_week, age_started_working, hazards,
           payment_basis, monthly_income, earnings_use, adult_supervises, work_supervisor,
           is_4ps, household_id_number, created_by
         ) VALUES (
           $1, $2, $3, $4, 'complete',
           $5, $6, $7,
           $8, $9, $10, $11,
           $12, $13, $14, $15, $16,
           $17, $18, $19, $20,
           $21, $22, $23, $24,
           $25, $26, $27, $28,
           $29, $30,
           $31, $32, $33, $34, $35,
           $36, $37, $38,
           $39, $40, $41, $42, $43,
           $44, $45, $46, $47, $48,
           $49, $50, $51
         )
         RETURNING id`,
        [
          row.controlNo, year, REGIONAL_OFFICE_CODE, FIELD_OFFICE_CODE,
          row.lastName, row.firstName, row.middleName,
          presentGeo.presentRegionId, presentGeo.presentProvinceId, presentGeo.presentCityId, row.present.barangay || null,
          row.presentSitio, row.presentPhone, row.sex, row.dob, row.birthCertificate,
          birthGeo?.presentRegionId ?? null, birthGeo?.presentProvinceId ?? null, birthGeo?.presentCityId ?? null, null,
          row.religion, row.indigenousGroup, row.livingWith, row.dwellingMaterial,
          row.everAttendedSchool, row.attendingNow, row.highestGrade, row.formOfEducation,
          row.ageStoppedSchooling, JSON.stringify(row.dropoutReasons),
          row.hasDisability, row.heightCm, row.weightKg, JSON.stringify(row.ailments), JSON.stringify(row.familyAilments),
          row.taskPerformed, row.employerName, row.employerContact,
          row.workArrangement, row.hoursPerDay, row.daysPerWeek, row.ageStartedWorking, JSON.stringify(row.hazards),
          row.paymentBasis, row.monthlyIncome, JSON.stringify(row.earningsUse), row.adultSupervises, row.workSupervisor,
          row.is4Ps, row.householdIdNumber, createdBy,
        ],
      )
      const profileId = inserted[0].id

      await insertRows(client, 'family_members', profileId, row.familyMembers, [
        'name', 'relationship', 'sex', 'age', 'civil_status', 'is_solo_parent',
        'highest_education', 'occupation', 'monthly_income', 'skills', 'whereabouts', 'disability_ailment',
      ])
      await insertRows(client, 'services_availed', profileId, row.servicesAvailed, [
        'assistance', 'source', 'year_availed', 'availed_by', 'remarks',
      ])
      await insertRows(client, 'services_requested', profileId, row.servicesRequested, [
        'assistance', 'source', 'period', 'requested_by', 'remarks',
      ])

      await client.query('COMMIT')
      console.log(`Created ${row.controlNo} — ${row.firstName} ${row.lastName}`)
      created += 1
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`Failed on ${row.controlNo} (${row.firstName} ${row.lastName}):`, err.message)
      failed += 1
    } finally {
      client.release()
    }
  }

  console.log(`\nDone — ${created} created, ${skipped} already present, ${failed} failed.`)
  await pool.end()
}

async function insertRows(client, table, profileId, rows, columns) {
  let sortOrder = 0
  for (const row of rows) {
    const values = columns.map((col) => row[col] ?? null)
    const placeholders = columns.map((_, i) => `$${i + 3}`).join(', ')
    await client.query(
      `INSERT INTO ${table} (profile_id, sort_order, ${columns.join(', ')}) VALUES ($1, $2, ${placeholders})`,
      [profileId, sortOrder, ...values],
    )
    sortOrder += 1
  }
}

main()
