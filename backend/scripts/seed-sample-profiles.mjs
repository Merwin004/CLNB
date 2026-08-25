// One-off script: ports the 8 hand-authored sample records that used to live
// only in frontend/src/data/mockFormDataById.js + profiles.js into the real
// Neon DB, so /profiles and /encode show the same real data instead of the
// frontend silently falling back to mock data the backend has never heard
// of. Safe to re-run — skips any (lastName, firstName, year) that already
// exists. Once the frontend is fully wired to the API (see
// .claude/rules/frontend-conventions.md), those two mock files can be
// deleted; this script is the one-time migration path off of them.
//
// Run from backend/: node scripts/seed-sample-profiles.mjs

import 'dotenv/config'
import { pool } from '../src/db/pool.js'
import { resolveGeography } from '../src/lib/geography.js'
import { generateControlNo } from '../src/lib/controlNumber.js'
import { toBool, toInt, toNumeric } from '../src/lib/coerce.js'

const YEAR = 2027
const REGIONAL_OFFICE_CODE = 'NCR'
const FIELD_OFFICE_CODE = '3'

// Copied verbatim from frontend/src/data/{initialFormData,mockFormDataById,profiles}.js
// at the time this script was written.
const SAMPLE_PROFILES = [
  {
    status: 'in_review',
    personal: {
      lastName: 'Dela Cruz', firstName: 'Juan', middleName: '',
      region: 'Region II (Cagayan Valley)', province: 'Isabela', municipality: 'Ilagan City', barangay: 'San Isidro',
      sitio: '', phone: '', sex: 'Male', dob: '2013-05-02', birthCertificate: 'Yes',
      religion: 'Roman Catholic', indigenous: 'No', livingWith: 'Both Parents', dwellingMaterial: 'Strong materials',
    },
    education: {
      everWentToSchool: 'Yes', attendingNow: 'No', highestGrade: 'Grade 6',
      formOfEducation: '1 – Formal', ageStopped: '12',
      dropoutReasons: ['To engage in paid or self-employment', 'Cannot afford to go to school'],
    },
    health: { hasDisability: 'No', height: '148', weight: '38', ailments: ['Influenza (flu)'], familyAilments: ['None'] },
    work: {
      taskPerformed: '8 – Farming', ageStarted: '11',
      workArrangement: '1 – Paid worker, household-operated farm/business',
      hoursPerDay: '6', daysPerWeek: '5', hazards: ['Chemicals', 'Extreme weather conditions'],
    },
    family: {
      members: [
        { name: 'Rosario Dela Cruz', relationship: 'Mother', age: '36', occupation: 'Vendor', income: '4,500' },
        { name: 'Mario Dela Cruz', relationship: 'Father', age: '39', occupation: 'Farm laborer', income: '5,800' },
      ],
      is4Ps: 'Yes', householdId: '4Ps-02-11-047-006',
    },
    servicesAvailed: { records: [{ assistance: 'Educational assistance', source: 'DSWD', year: '2026', availedBy: 'Juan', remarks: 'One-time' }] },
    servicesRequested: { records: [{ assistance: 'Livelihood assistance', source: 'DOLE', period: 'Q1 2027', requestedBy: 'Rosario', remarks: 'Pending' }] },
  },
  {
    status: 'complete',
    personal: {
      lastName: 'Santos', firstName: 'Maria', middleName: '',
      region: 'Region II (Cagayan Valley)', province: 'Isabela', municipality: 'Cauayan City', barangay: 'Sto. Domingo',
      sitio: '', phone: '', sex: 'Female', dob: '2012-08-19', birthCertificate: 'Yes',
      religion: 'Islam', indigenous: 'No', livingWith: 'Mother only', dwellingMaterial: 'Light materials',
    },
    education: {
      everWentToSchool: 'Yes', attendingNow: 'No', highestGrade: 'Grade 5',
      formOfEducation: '1 – Formal', ageStopped: '11', dropoutReasons: ['To help in family farm or business'],
    },
    health: { hasDisability: 'No', height: '142', weight: '34', ailments: ['Skin disease'], familyAilments: ['Hypertension'] },
    work: {
      taskPerformed: '9 – Domestic Work', ageStarted: '10',
      workArrangement: '2 – Paid worker by an employer, financier, landowner',
      hoursPerDay: '8', daysPerWeek: '6', hazards: ['Physical injuries'],
    },
    family: {
      members: [{ name: 'Corazon Santos', relationship: 'Mother', age: '34', occupation: 'Laundrywoman', income: '3,800' }],
      is4Ps: 'Yes', householdId: '4Ps-02-11-051-003',
    },
    servicesAvailed: { records: [{ assistance: 'Supplemental feeding', source: 'DSWD', year: '2025', availedBy: 'Maria', remarks: 'Completed' }] },
    servicesRequested: { records: [{ assistance: 'Educational assistance', source: 'DepEd', period: 'Q2 2027', requestedBy: 'Corazon', remarks: 'Pending' }] },
  },
  {
    status: 'draft',
    personal: {
      lastName: 'Bautista', firstName: 'Ana', middleName: '',
      region: 'Region II (Cagayan Valley)', province: 'Isabela', municipality: 'Ilagan City', barangay: 'San Isidro',
      sitio: 'Purok 3', phone: '', sex: 'Female', dob: '2014-02-10', birthCertificate: 'No',
      religion: 'Roman Catholic', indigenous: 'Yes', livingWith: 'Relatives', dwellingMaterial: 'Salvaged / makeshift materials',
    },
    education: {
      everWentToSchool: 'No', attendingNow: 'No', highestGrade: '',
      formOfEducation: 'N/A', ageStopped: '', dropoutReasons: ['Cannot afford to go to school'],
    },
    health: { hasDisability: 'No', height: '', weight: '', ailments: [], familyAilments: [] },
    work: { taskPerformed: '1 – Mining', ageStarted: '', workArrangement: '1 – Paid worker, household-operated farm/business', hoursPerDay: '', daysPerWeek: '', hazards: [] },
    family: { members: [], is4Ps: 'No', householdId: '' },
    servicesAvailed: { records: [] },
    servicesRequested: { records: [] },
  },
  {
    status: 'complete',
    personal: {
      lastName: 'Gonzales', firstName: 'Rafael', middleName: '',
      region: 'Region II (Cagayan Valley)', province: 'Isabela', municipality: 'Ilagan City', barangay: 'Sto. Domingo',
      sitio: '', phone: '', sex: 'Male', dob: '2011-11-30', birthCertificate: 'Yes',
      religion: 'Roman Catholic', indigenous: 'No', livingWith: 'Both Parents', dwellingMaterial: 'Mixed, predominantly strong',
    },
    education: {
      everWentToSchool: 'Yes', attendingNow: 'Yes', highestGrade: 'Grade 7',
      formOfEducation: '1 – Formal', ageStopped: '', dropoutReasons: [],
    },
    health: { hasDisability: 'No', height: '150', weight: '40', ailments: ['None'], familyAilments: ['Diabetes'] },
    work: {
      taskPerformed: '8 – Farming', ageStarted: '12',
      workArrangement: '3 – Worker without pay, family-operated farm/business',
      hoursPerDay: '4', daysPerWeek: '7', hazards: ['Extreme weather conditions'],
    },
    family: {
      members: [
        { name: 'Elena Gonzales', relationship: 'Mother', age: '38', occupation: 'Sari-sari store owner', income: '6,200' },
        { name: 'Ramon Gonzales', relationship: 'Father', age: '41', occupation: 'Tricycle driver', income: '5,000' },
      ],
      is4Ps: 'No', householdId: '',
    },
    servicesAvailed: { records: [{ assistance: 'Livelihood assistance', source: 'DOLE', year: '2026', availedBy: 'Ramon', remarks: 'Completed' }] },
    servicesRequested: { records: [] },
  },
  {
    status: 'draft',
    personal: {
      lastName: 'Fernandez', firstName: 'Karen', middleName: '',
      region: 'Region II (Cagayan Valley)', province: 'Isabela', municipality: 'Cauayan City', barangay: 'San Isidro',
      sitio: '', phone: '', sex: 'Female', dob: '2013-07-04', birthCertificate: 'Yes',
      religion: 'Evangelical', indigenous: 'No', livingWith: 'Father only', dwellingMaterial: 'Light materials',
    },
    education: {
      everWentToSchool: 'Yes', attendingNow: 'No', highestGrade: 'Grade 3',
      formOfEducation: '2 – Non-Formal (Alternative Learning System)', ageStopped: '10', dropoutReasons: ['School is too far'],
    },
    health: { hasDisability: 'No', height: '', weight: '', ailments: [], familyAilments: [] },
    work: { taskPerformed: '1 – Mining', ageStarted: '', workArrangement: '1 – Paid worker, household-operated farm/business', hoursPerDay: '', daysPerWeek: '', hazards: [] },
    family: { members: [], is4Ps: 'Yes', householdId: '4Ps-02-11-060-011' },
    servicesAvailed: { records: [] },
    servicesRequested: { records: [] },
  },
  {
    status: 'complete',
    personal: {
      lastName: 'Villanueva', firstName: 'Luis', middleName: '',
      region: 'Region II (Cagayan Valley)', province: 'Isabela', municipality: 'Ilagan City', barangay: 'San Isidro',
      sitio: '', phone: '', sex: 'Male', dob: '2010-03-22', birthCertificate: 'Yes',
      religion: 'Iglesia ni Cristo', indigenous: 'No', livingWith: 'Non-Relatives', dwellingMaterial: 'Strong materials',
    },
    education: {
      everWentToSchool: 'Yes', attendingNow: 'No', highestGrade: 'Grade 8',
      formOfEducation: '1 – Formal', ageStopped: '13', dropoutReasons: ['To engage in paid or self-employment'],
    },
    health: { hasDisability: 'No', height: '156', weight: '44', ailments: ['Allergies'], familyAilments: ['None'] },
    work: {
      taskPerformed: '10 – Manufacturing', ageStarted: '13',
      workArrangement: '2 – Paid worker by an employer, financier, landowner',
      hoursPerDay: '9', daysPerWeek: '6', hazards: ['Chemicals', 'Physical injuries'],
    },
    family: {
      members: [{ name: 'Teresa Villanueva', relationship: 'Guardian', age: '45', occupation: 'Domestic helper', income: '4,000' }],
      is4Ps: 'No', householdId: '',
    },
    servicesAvailed: { records: [{ assistance: 'Counseling services', source: 'DSWD', year: '2027', availedBy: 'Luis', remarks: 'Ongoing' }] },
    servicesRequested: { records: [{ assistance: 'Skills training', source: 'TESDA', period: 'Q3 2027', requestedBy: 'Luis', remarks: 'Pending' }] },
  },
  {
    status: 'draft',
    personal: {
      lastName: 'Reyes', firstName: 'Paolo', middleName: '',
      region: 'Region II (Cagayan Valley)', province: 'Isabela', municipality: 'Cauayan City', barangay: 'Sto. Domingo',
      sitio: '', phone: '', sex: 'Male', dob: '2015-01-15', birthCertificate: 'Yes',
      religion: 'Roman Catholic', indigenous: 'No', livingWith: 'Both Parents', dwellingMaterial: 'Mixed, predominantly light',
    },
    education: {
      everWentToSchool: 'Yes', attendingNow: 'Yes', highestGrade: 'Grade 2',
      formOfEducation: '1 – Formal', ageStopped: '', dropoutReasons: [],
    },
    health: { hasDisability: 'No', height: '', weight: '', ailments: [], familyAilments: [] },
    work: { taskPerformed: '1 – Mining', ageStarted: '', workArrangement: '1 – Paid worker, household-operated farm/business', hoursPerDay: '', daysPerWeek: '', hazards: [] },
    family: { members: [], is4Ps: 'No', householdId: '' },
    servicesAvailed: { records: [] },
    servicesRequested: { records: [] },
  },
  {
    status: 'complete',
    personal: {
      lastName: 'Mendoza', firstName: 'Sofia', middleName: '',
      region: 'Region II (Cagayan Valley)', province: 'Isabela', municipality: 'Ilagan City', barangay: 'Sto. Domingo',
      sitio: '', phone: '', sex: 'Female', dob: '2012-12-05', birthCertificate: 'Yes',
      religion: 'None', indigenous: 'No', livingWith: 'Living Alone', dwellingMaterial: 'No permanent dwelling unit',
    },
    education: {
      everWentToSchool: 'No', attendingNow: 'No', highestGrade: '',
      formOfEducation: 'N/A', ageStopped: '', dropoutReasons: ['Household chores', 'Early pregnancy'],
    },
    health: { hasDisability: 'Yes', height: '138', weight: '30', ailments: ['Tuberculosis / Primary complex'], familyAilments: ['Respiratory illness'] },
    work: {
      taskPerformed: '9 – Domestic Work', ageStarted: '9', workArrangement: '4 – Self-employed',
      hoursPerDay: '10', daysPerWeek: '7', hazards: ['Possible health complications', 'Others'],
    },
    family: { members: [], is4Ps: 'No', householdId: '' },
    servicesAvailed: { records: [{ assistance: 'Medical assistance', source: 'DOH', year: '2026', availedBy: 'Sofia', remarks: 'Completed' }] },
    servicesRequested: { records: [{ assistance: 'Shelter assistance', source: 'DSWD', period: 'Q1 2027', requestedBy: 'Sofia', remarks: 'Urgent' }] },
  },
]

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

  let created = 0
  let skipped = 0

  for (const form of SAMPLE_PROFILES) {
    const existing = await pool.query(
      'SELECT id FROM child_profiles WHERE last_name = $1 AND first_name = $2 AND year = $3',
      [form.personal.lastName, form.personal.firstName, YEAR],
    )
    if (existing.rows.length > 0) {
      console.log(`Already seeded: ${form.personal.firstName} ${form.personal.lastName} — skipping`)
      skipped += 1
      continue
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const geo = await resolveGeography({
        region: form.personal.region,
        province: form.personal.province,
        municipality: form.personal.municipality,
      })
      const controlNo = await generateControlNo(client, {
        year: YEAR,
        regionalOfficeCode: REGIONAL_OFFICE_CODE,
        fieldOfficeCode: FIELD_OFFICE_CODE,
        sex: form.personal.sex,
      })

      const { rows } = await client.query(
        `INSERT INTO child_profiles (
           control_no, year, regional_office_code, field_office_code, status,
           last_name, first_name, middle_name,
           present_region_id, present_province_id, present_city_id, present_barangay_text,
           present_sitio, present_phone, sex, date_of_birth, birth_certificate,
           religion, indigenous_group, living_with, dwelling_material,
           ever_attended_school, attending_now, highest_grade, form_of_education,
           age_stopped_schooling, dropout_reasons,
           has_disability, height_cm, weight_kg, ailments, family_ailments,
           task_performed, work_arrangement, hours_per_day, days_per_week,
           age_started_working, hazards,
           is_4ps, household_id_number, created_by
         ) VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8,
           $9, $10, $11, $12,
           $13, $14, $15, $16, $17,
           $18, $19, $20, $21,
           $22, $23, $24, $25,
           $26, $27,
           $28, $29, $30, $31, $32,
           $33, $34, $35, $36,
           $37, $38,
           $39, $40, $41
         )
         RETURNING id`,
        [
          controlNo, YEAR, REGIONAL_OFFICE_CODE, FIELD_OFFICE_CODE, form.status,
          form.personal.lastName, form.personal.firstName, form.personal.middleName || null,
          geo.presentRegionId, geo.presentProvinceId, geo.presentCityId, form.personal.barangay,
          form.personal.sitio || null, form.personal.phone || null, form.personal.sex,
          form.personal.dob || null, toBool(form.personal.birthCertificate),
          form.personal.religion || null, toBool(form.personal.indigenous),
          form.personal.livingWith || null, form.personal.dwellingMaterial || null,
          toBool(form.education.everWentToSchool), toBool(form.education.attendingNow),
          form.education.highestGrade || null, form.education.formOfEducation || null,
          toInt(form.education.ageStopped), JSON.stringify(form.education.dropoutReasons),
          toBool(form.health.hasDisability), toNumeric(form.health.height), toNumeric(form.health.weight),
          JSON.stringify(form.health.ailments), JSON.stringify(form.health.familyAilments),
          form.work.taskPerformed || null, form.work.workArrangement || null,
          toNumeric(form.work.hoursPerDay), toInt(form.work.daysPerWeek),
          toInt(form.work.ageStarted), JSON.stringify(form.work.hazards),
          toBool(form.family.is4Ps), form.family.householdId || null, createdBy,
        ],
      )
      const profileId = rows[0].id

      await insertRows(client, 'family_members', profileId, form.family.members, [
        { column: 'name' },
        { column: 'relationship' },
        { column: 'age', coerce: toInt },
        { column: 'occupation' },
        { column: 'monthly_income', key: 'income', coerce: toNumeric },
      ])
      await insertRows(client, 'services_availed', profileId, form.servicesAvailed.records, [
        { column: 'assistance' },
        { column: 'source' },
        { column: 'year_availed', key: 'year' },
        { column: 'availed_by', key: 'availedBy' },
        { column: 'remarks' },
      ])
      await insertRows(client, 'services_requested', profileId, form.servicesRequested.records, [
        { column: 'assistance' },
        { column: 'source' },
        { column: 'period' },
        { column: 'requested_by', key: 'requestedBy' },
        { column: 'remarks' },
      ])

      await client.query('COMMIT')
      console.log(`Created ${controlNo} — ${form.personal.firstName} ${form.personal.lastName}`)
      created += 1
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`Failed on ${form.personal.firstName} ${form.personal.lastName}:`, err.message)
    } finally {
      client.release()
    }
  }

  console.log(`\nDone — ${created} created, ${skipped} already present.`)
  await pool.end()
}

async function insertRows(client, table, profileId, rows, columns) {
  let sortOrder = 0
  for (const row of rows) {
    const values = columns.map(({ column, key, coerce }) => {
      const raw = row[key ?? column] ?? null
      return coerce ? coerce(raw) : raw
    })
    const columnNames = columns.map((c) => c.column)
    const placeholders = columnNames.map((_, i) => `$${i + 3}`).join(', ')
    await client.query(
      `INSERT INTO ${table} (profile_id, sort_order, ${columnNames.join(', ')}) VALUES ($1, $2, ${placeholders})`,
      [profileId, sortOrder, ...values],
    )
    sortOrder += 1
  }
}

main()
