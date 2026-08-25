import { Router } from 'express'
import { pool, query } from '../db/pool.js'
import { asyncHandler, HttpError } from '../middleware/errorHandler.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { resolveGeography } from '../lib/geography.js'
import { generateControlNo } from '../lib/controlNumber.js'
import { toBool, toInt, toNumeric } from '../lib/coerce.js'

const router = Router()
// Encoder/admin only — LGU accounts get their own scoped view and actions
// under /api/lgu (see lgu.routes.js), not general profile read/write access.
router.use(requireAuth, requireRole('encoder', 'admin'))

const STATUS_VALUES = ['draft', 'in_review', 'complete']

// Maps the field names the encode form's sections actually use (see
// .claude/rules/frontend-conventions.md / PersonalInfoSection.jsx etc.) to
// child_profiles columns, with a coercion for columns whose SQL type isn't a
// bare string (booleans come in as the SegmentedToggle's "Yes"/"No", numbers
// as strings that may be empty). Present-address region/province/municipality
// (resolved to FK ids) and the repeating sub-tables are handled separately
// below since they don't map onto a single column each. Barangay is a plain
// free-text column here, not resolved — see lib/geography.js for why.
const FIELD_MAP = {
  status: { column: 'status' },
  lastName: { column: 'last_name' },
  firstName: { column: 'first_name' },
  middleName: { column: 'middle_name' },
  suffix: { column: 'suffix' },
  barangay: { column: 'present_barangay_text' },
  sitio: { column: 'present_sitio' },
  phone: { column: 'present_phone' },
  sex: { column: 'sex' },
  dob: { column: 'date_of_birth' },
  birthCertificate: { column: 'birth_certificate', coerce: toBool },
  religion: { column: 'religion' },
  indigenous: { column: 'indigenous_group', coerce: toBool },
  livingWith: { column: 'living_with' },
  dwellingMaterial: { column: 'dwelling_material' },

  everWentToSchool: { column: 'ever_attended_school', coerce: toBool },
  attendingNow: { column: 'attending_now', coerce: toBool },
  highestGrade: { column: 'highest_grade' },
  formOfEducation: { column: 'form_of_education' },
  ageStopped: { column: 'age_stopped_schooling', coerce: toInt },
  dropoutReasons: { column: 'dropout_reasons', jsonb: true },

  hasDisability: { column: 'has_disability', coerce: toBool },
  height: { column: 'height_cm', coerce: toNumeric },
  weight: { column: 'weight_kg', coerce: toNumeric },
  ailments: { column: 'ailments', jsonb: true },
  familyAilments: { column: 'family_ailments', jsonb: true },

  taskPerformed: { column: 'task_performed' },
  workArrangement: { column: 'work_arrangement' },
  hoursPerDay: { column: 'hours_per_day', coerce: toNumeric },
  daysPerWeek: { column: 'days_per_week', coerce: toInt },
  ageStarted: { column: 'age_started_working', coerce: toInt },
  hazards: { column: 'hazards', jsonb: true },

  is4Ps: { column: 'is_4ps', coerce: toBool },
  householdId: { column: 'household_id_number' },
}

const GEO_FIELDS = ['region', 'province', 'municipality']

// GET /api/profiles?page=1&pageSize=6&q=&status=draft
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 6))
    const search = (req.query.q ?? '').trim()
    const status = req.query.status

    const conditions = []
    const params = []

    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(last_name || ' ' || first_name ILIKE $${params.length} OR control_no ILIKE $${params.length})`)
    }
    if (status && STATUS_VALUES.includes(status)) {
      params.push(status)
      conditions.push(`status = $${params.length}`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows: countRows } = await query(`SELECT COUNT(*)::int AS total FROM child_profiles ${where}`, params)
    const total = countRows[0].total

    params.push(pageSize, (page - 1) * pageSize)
    const { rows } = await query(
      `SELECT cp.id, cp.control_no, cp.last_name, cp.first_name, cp.status, cp.updated_at, fo.name AS field_office_name
       FROM child_profiles cp
       LEFT JOIN field_offices fo ON fo.code = cp.field_office_code
       ${where}
       ORDER BY cp.updated_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    )

    res.json({
      profiles: rows.map((r) => ({
        id: r.id,
        name: r.first_name || r.last_name ? `${r.first_name?.[0] ?? ''}. ${r.last_name ?? ''}`.trim() : 'Untitled draft',
        controlNo: r.control_no,
        status: r.status,
        fieldOffice: r.field_office_name,
        updatedAt: r.updated_at,
      })),
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      page,
      pageSize,
    })
  }),
)

// GET /api/profiles/:id — full detail for the encode form. Present-address
// names are joined in (not just the ids the columns store) so the frontend's
// string-based Region/Province/Municipality <select>s can populate directly
// without a round trip through the geography endpoints. Barangay needs no
// join — present_barangay_text is free text, stored directly (see
// lib/geography.js for why it isn't FK-resolved like the other three).
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT cp.*,
              pr.name AS present_region_name,
              pp.name AS present_province_name,
              pc.name AS present_city_name
       FROM child_profiles cp
       LEFT JOIN regions pr ON pr.id = cp.present_region_id
       LEFT JOIN provinces pp ON pp.id = cp.present_province_id
       LEFT JOIN cities_municipalities pc ON pc.id = cp.present_city_id
       WHERE cp.id = $1`,
      [req.params.id],
    )
    const profile = rows[0]
    if (!profile) throw new HttpError(404, 'Profile not found')

    const [family, availed, requested] = await Promise.all([
      query('SELECT * FROM family_members WHERE profile_id = $1 ORDER BY sort_order, id', [req.params.id]),
      query('SELECT * FROM services_availed WHERE profile_id = $1 ORDER BY sort_order, id', [req.params.id]),
      query('SELECT * FROM services_requested WHERE profile_id = $1 ORDER BY sort_order, id', [req.params.id]),
    ])

    res.json({
      profile,
      familyMembers: family.rows,
      servicesAvailed: availed.rows,
      servicesRequested: requested.rows,
    })
  }),
)

// POST /api/profiles — create a new profile. Only the encoding-batch context
// (year/office) is required; name and everything else are genuinely blank
// until the encoder fills in Section A and saves — no placeholder text gets
// written to the DB just so a value exists, since last_name/first_name have
// no NOT NULL constraint.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { year, regionalOfficeCode, fieldOfficeCode, lastName, firstName, sex, childIdNo } = req.body ?? {}
    if (!year || !regionalOfficeCode || !fieldOfficeCode) {
      throw new HttpError(400, 'year, regionalOfficeCode, and fieldOfficeCode are required')
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const controlNo = await generateControlNo(client, { year, regionalOfficeCode, fieldOfficeCode, sex })
      const { rows } = await client.query(
        `INSERT INTO child_profiles
           (control_no, child_id_no, year, regional_office_code, field_office_code, last_name, first_name, sex, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [controlNo, childIdNo ?? null, year, regionalOfficeCode, fieldOfficeCode, lastName ?? null, firstName ?? null, sex ?? null, req.user.id],
      )
      await client.query('COMMIT')
      res.status(201).json({ profile: rows[0] })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }),
)

// PATCH /api/profiles/:id — partial update of any whitelisted Section A-A3
// field (see FIELD_MAP), present-address geography (given as names, resolved
// server-side the same way the Excel importer does), plus optional wholesale
// replacement of the repeating sub-tables.
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params
    const body = req.body ?? {}

    const setClauses = []
    const params = [id]

    for (const [jsKey, { column, coerce, jsonb }] of Object.entries(FIELD_MAP)) {
      if (jsKey in body) {
        const value = jsonb ? JSON.stringify(body[jsKey]) : coerce ? coerce(body[jsKey]) : body[jsKey]
        params.push(value)
        setClauses.push(`${column} = $${params.length}`)
      }
    }

    if (GEO_FIELDS.some((f) => f in body)) {
      const { region, province, municipality } = body
      if (!region || !province || !municipality) {
        throw new HttpError(400, 'region, province, and municipality must all be provided together')
      }
      const geo = await resolveGeography({ region, province, municipality })
      for (const [column, value] of Object.entries({
        present_region_id: geo.presentRegionId,
        present_province_id: geo.presentProvinceId,
        present_city_id: geo.presentCityId,
      })) {
        params.push(value)
        setClauses.push(`${column} = $${params.length}`)
      }
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      if (setClauses.length > 0) {
        const result = await client.query(
          `UPDATE child_profiles SET ${setClauses.join(', ')} WHERE id = $1 RETURNING id`,
          params,
        )
        if (result.rows.length === 0) throw new HttpError(404, 'Profile not found')
      } else {
        const exists = await client.query('SELECT id FROM child_profiles WHERE id = $1', [id])
        if (exists.rows.length === 0) throw new HttpError(404, 'Profile not found')
      }

      if (Array.isArray(body.familyMembers)) {
        await replaceRows(client, 'family_members', id, body.familyMembers, [
          { column: 'name' },
          { column: 'relationship' },
          { column: 'age', coerce: toInt },
          { column: 'occupation' },
          { column: 'monthly_income', key: 'income', coerce: toNumeric },
        ])
      }
      if (Array.isArray(body.servicesAvailed)) {
        await replaceRows(client, 'services_availed', id, body.servicesAvailed, [
          { column: 'assistance' },
          { column: 'source' },
          { column: 'year_availed', key: 'year' },
          { column: 'availed_by' },
          { column: 'remarks' },
        ])
      }
      if (Array.isArray(body.servicesRequested)) {
        await replaceRows(client, 'services_requested', id, body.servicesRequested, [
          { column: 'assistance' },
          { column: 'source' },
          { column: 'period' },
          { column: 'requested_by' },
          { column: 'remarks' },
        ])
      }

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    const { rows } = await query('SELECT * FROM child_profiles WHERE id = $1', [id])
    res.json({ profile: rows[0] })
  }),
)

// Replaces every row in a profile's sub-table with the given list, in order.
// Simple and correct for form-sized lists (a handful of rows); not meant for
// high-frequency updates of large collections. Each column entry may give an
// explicit `key` when the frontend's field name doesn't match the column
// name 1:1 (e.g. family_members.monthly_income <- row.income), and an
// optional `coerce` for columns whose SQL type isn't a bare string.
async function replaceRows(client, table, profileId, rows, columns) {
  await client.query(`DELETE FROM ${table} WHERE profile_id = $1`, [profileId])
  let sortOrder = 0
  for (const row of rows) {
    const values = columns.map(({ column, key, coerce }) => {
      const raw = row[key ?? toCamel(column)] ?? null
      return coerce ? coerce(raw) : raw
    })
    const columnNames = columns.map((c) => c.column)
    const valuePlaceholders = columnNames.map((_, i) => `$${i + 3}`).join(', ')
    await client.query(
      `INSERT INTO ${table} (profile_id, sort_order, ${columnNames.join(', ')})
       VALUES ($1, $2, ${valuePlaceholders})`,
      [profileId, sortOrder, ...values],
    )
    sortOrder += 1
  }
}

function toCamel(snake) {
  return snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

export default router
