import { Router } from 'express'
import multer from 'multer'
import ExcelJS from 'exceljs'
import { pool } from '../db/pool.js'
import { asyncHandler, HttpError } from '../middleware/errorHandler.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { resolveGeography } from '../lib/geography.js'
import { generateControlNo } from '../lib/controlNumber.js'
import { toBool, toInt, toNumeric } from '../lib/coerce.js'
import { blank, parseName, parseDate, parseCodeList, parseCodeText, parseBlob } from '../lib/databaseFormat.js'

const router = Router()
router.use(requireAuth, requireRole('encoder', 'admin'))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const isXlsx =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.toLowerCase().endsWith('.xlsx')
    cb(isXlsx ? null : new HttpError(400, 'Only .xlsx files are accepted'), isXlsx)
  },
})

// Fixed column positions matching the DOLE "Database" sheet's layout — see
// backend/assets/child-profile-import-template-master.xlsx (the downloadable
// template is a direct copy of that master, not generated) and
// backend/src/lib/databaseFormat.js for the shared cell-parsing helpers.
// This is a rigid, official template (not a loose "any column order" CSV),
// so matching by fixed position is simpler and more robust than matching by
// header text — the header cells use multi-line rich text anyway.
const COL = {
  CHILD_ID_NO: 3,
  NAME: 4,
  PRESENT_REGION: 5,
  PRESENT_PROVINCE: 6,
  PRESENT_MUNICIPALITY: 8,
  PRESENT_BARANGAY: 9,
  PRESENT_SITIO: 10,
  PRESENT_PHONE: 11,
  SEX: 12,
  DOB: 13,
  BIRTH_CERTIFICATE: 16,
  PLACE_OF_BIRTH_FLAG: 17,
  BIRTH_REGION: 18,
  BIRTH_PROVINCE: 19,
  BIRTH_MUNICIPALITY: 21,
  RELIGION: 24,
  IP: 25,
  LIVING_WITH: 26,
  DWELLING_UNIT: 29,
  EVER_SCHOOL: 30,
  ATTENDING_NOW: 31,
  HIGHEST_GRADE: 33,
  FORM_OF_EDUCATION: 34,
  AGE_STOPPED: 35,
  DROPOUT_REASONS: 36,
  HAS_DISABILITY: 37,
  DISABILITY_TYPES: 38,
  DISABILITY_ASSESSMENT: 39,
  HEIGHT: 40,
  WEIGHT: 41,
  AILMENTS: 42,
  MEDICAL_ASSESSMENT: 43,
  FAMILY_AILMENTS: 44,
  TASK_PERFORMED: 45,
  EMPLOYER_NAME: 46,
  EMPLOYER_CONTACT: 47,
  WORK_ARRANGEMENT: 53,
  HOURS_PER_DAY: 54,
  DAYS_PER_WEEK: 55,
  AGE_STARTED: 57,
  HAZARDS: 58,
  PAYMENT_BASIS: 59,
  MONTHLY_INCOME: 60,
  EARNINGS_USE: 61,
  ADULT_SUPERVISES: 62,
  WORK_SUPERVISOR: 63,
  FAMILY_START: 64,
  FAMILY_END: 75,
  IS_4PS: 76,
  HOUSEHOLD_ID: 77,
  SERVICES_AVAILED_START: 78,
  SERVICES_AVAILED_END: 89,
  SERVICES_REQUESTED_START: 90,
  SERVICES_REQUESTED_END: 101,
}
// Not imported: geographic District columns, "specify who/reason" for living
// arrangement, Learning Reference Number, employer address, time-of-work,
// and the referral-tracking section (enumerator/interview date/needs
// assessed/referred/provided/withdrawn) — no schema column for those yet.

function cellRaw(cell) {
  const v = cell?.value
  if (v == null) return ''
  if (v instanceof Date) return v
  if (typeof v === 'object' && 'richText' in v) return v.richText.map((r) => r.text).join('')
  if (typeof v === 'object' && 'text' in v) return String(v.text)
  if (typeof v === 'object' && 'result' in v) return v.result
  return v
}

function cellText(cell) {
  const v = cellRaw(cell)
  return v instanceof Date ? v : String(v ?? '').trim()
}

function parseFamilyMembers(row) {
  const members = []
  for (let c = COL.FAMILY_START; c <= COL.FAMILY_END; c++) {
    const blob = parseBlob(cellText(row.getCell(c)))
    if (!blob) continue
    members.push({
      name: blob.Name || null,
      relationship: blob.Rel || null,
      age: toInt(blob.Age),
      occupation: blob.Occupation || null,
      income: toNumeric(blob['Monthly Income']),
    })
  }
  return members
}

function parseServicesAvailed(row) {
  const records = []
  for (let c = COL.SERVICES_AVAILED_START; c <= COL.SERVICES_AVAILED_END; c++) {
    const blob = parseBlob(cellText(row.getCell(c)))
    const assistance = blob?.['Assistance Already Availed by the Family']
    if (!blob || !blank(assistance)) continue
    records.push({
      assistance,
      source: blob['Source of Assistance'] || null,
      year: blob['Year Availed'] || null,
      availedBy: blob['Family Member Who Availed the Service'] || null,
      remarks: blob.Remarks || null,
    })
  }
  return records
}

function parseServicesRequested(row) {
  const records = []
  for (let c = COL.SERVICES_REQUESTED_START; c <= COL.SERVICES_REQUESTED_END; c++) {
    const blob = parseBlob(cellText(row.getCell(c)))
    const assistance = blob?.['Type of Assistance Requested']
    if (!blob || !blank(assistance) || assistance.trim().toUpperCase() === 'NONE') continue
    const period = [blob['Start of Assistance'], blob['End of Assistance']].map(blank).filter(Boolean).join('–')
    records.push({
      assistance,
      source: blob['Source of Assistance'] || null,
      period: period || null,
      requestedBy: blob['Family Member Who Requested the Assistance'] || null,
      remarks: blob.Remarks || null,
    })
  }
  return records
}

// POST /api/profiles/import — bulk-create draft profiles from an .xlsx file
// following the "Database" sheet template. Each row becomes a new
// child_profiles row with status 'draft'; the encoder finishes/reviews the
// rest in the app. Bad rows are skipped and reported, not the whole batch —
// one typo in row 40 shouldn't lose rows 1-39.
router.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'No file uploaded (expected field name "file")')

    const { year, regionalOfficeCode, fieldOfficeCode } = req.body ?? {}
    if (!year || !regionalOfficeCode || !fieldOfficeCode) {
      throw new HttpError(400, 'year, regionalOfficeCode, and fieldOfficeCode are required')
    }

    const workbook = new ExcelJS.Workbook()
    try {
      await workbook.xlsx.load(req.file.buffer)
    } catch {
      throw new HttpError(400, 'Could not read that file — make sure it is a valid .xlsx workbook')
    }

    const sheet = workbook.getWorksheet('Database') ?? workbook.worksheets[0]
    if (!sheet) throw new HttpError(400, 'The workbook has no sheets')

    const nameHeader = cellText(sheet.getRow(1).getCell(COL.NAME))
    if (!String(nameHeader).includes('Name')) {
      throw new HttpError(400, 'This doesn’t look like the current template — download a fresh copy and re-fill it.')
    }

    const results = { created: 0, skipped: 0, errors: [] }

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber)
      if (row.cellCount === 0) continue // blank row

      const nameRaw = cellText(row.getCell(COL.NAME))
      const hasAnyContent = row.actualCellCount > 0 && String(nameRaw).trim() !== ''
      if (!hasAnyContent) continue // fully blank data row

      try {
        const { lastName, firstName, middleName } = parseName(nameRaw)
        if (!lastName || !firstName) {
          throw new HttpError(400, 'Column 4 (Name) must be "Last Name, First Name, Middle Name"')
        }

        const sex = blank(cellText(row.getCell(COL.SEX)))
        if (sex !== 'Male' && sex !== 'Female') {
          throw new HttpError(400, `Sex must be "Male" or "Female", got "${sex || '(blank)'}"`)
        }

        const region = blank(cellText(row.getCell(COL.PRESENT_REGION)))
        const province = blank(cellText(row.getCell(COL.PRESENT_PROVINCE)))
        const municipality = blank(cellText(row.getCell(COL.PRESENT_MUNICIPALITY)))
        const barangay = blank(cellText(row.getCell(COL.PRESENT_BARANGAY)))
        if (!region || !province || !municipality || !barangay) {
          throw new HttpError(400, 'Present Address Region, Province, Municipality/City, and Barangay are required')
        }

        const presentGeo = await resolveGeography({ region, province, municipality })
        const placeOfBirthSameAsPresent = blank(cellText(row.getCell(COL.PLACE_OF_BIRTH_FLAG))) === 'Same as Present Address'
        const birthGeoInput = placeOfBirthSameAsPresent
          ? null
          : {
              region: blank(cellText(row.getCell(COL.BIRTH_REGION))),
              province: blank(cellText(row.getCell(COL.BIRTH_PROVINCE))),
              municipality: blank(cellText(row.getCell(COL.BIRTH_MUNICIPALITY))),
            }
        const birthGeo = placeOfBirthSameAsPresent
          ? presentGeo
          : birthGeoInput.region && birthGeoInput.province && birthGeoInput.municipality
            ? await resolveGeography(birthGeoInput)
            : null

        const controlNo = await generateControlNo(pool, { year, regionalOfficeCode, fieldOfficeCode, sex })

        await pool.query(
          `INSERT INTO child_profiles (
             control_no, child_id_no, year, regional_office_code, field_office_code, status,
             last_name, first_name, middle_name,
             present_region_id, present_province_id, present_city_id, present_barangay_text,
             present_sitio, present_phone, sex, date_of_birth, birth_certificate,
             birth_region_id, birth_province_id, birth_city_id,
             religion, indigenous_group, living_with, dwelling_material,
             ever_attended_school, attending_now, highest_grade, form_of_education,
             age_stopped_schooling, dropout_reasons,
             has_disability, disability_types, disability_assessment, height_cm, weight_kg,
             ailments, medical_assessment, family_ailments,
             task_performed, employer_name, employer_contact,
             work_arrangement, hours_per_day, days_per_week, age_started_working, hazards,
             payment_basis, monthly_income, earnings_use, adult_supervises, work_supervisor,
             is_4ps, household_id_number, created_by
           ) VALUES (
             $1, $2, $3, $4, $5, 'draft',
             $6, $7, $8,
             $9, $10, $11, $12,
             $13, $14, $15, $16, $17,
             $18, $19, $20,
             $21, $22, $23, $24,
             $25, $26, $27, $28,
             $29, $30,
             $31, $32, $33, $34, $35,
             $36, $37, $38,
             $39, $40, $41,
             $42, $43, $44, $45, $46,
             $47, $48, $49, $50, $51,
             $52, $53, $54
           )`,
          [
            controlNo, blank(cellText(row.getCell(COL.CHILD_ID_NO))) || null, year, regionalOfficeCode, fieldOfficeCode,
            lastName, firstName, middleName || null,
            presentGeo.presentRegionId, presentGeo.presentProvinceId, presentGeo.presentCityId, barangay,
            blank(cellText(row.getCell(COL.PRESENT_SITIO))) || null,
            blank(cellText(row.getCell(COL.PRESENT_PHONE))) || null,
            sex, parseDate(cellRaw(row.getCell(COL.DOB))), toBool(blank(cellText(row.getCell(COL.BIRTH_CERTIFICATE)))),
            birthGeo?.presentRegionId ?? null, birthGeo?.presentProvinceId ?? null, birthGeo?.presentCityId ?? null,
            blank(cellText(row.getCell(COL.RELIGION))) || null,
            toBool(blank(cellText(row.getCell(COL.IP)))),
            blank(cellText(row.getCell(COL.LIVING_WITH))) || null,
            blank(cellText(row.getCell(COL.DWELLING_UNIT))) || null,
            toBool(blank(cellText(row.getCell(COL.EVER_SCHOOL)))),
            toBool(blank(cellText(row.getCell(COL.ATTENDING_NOW)))),
            blank(cellText(row.getCell(COL.HIGHEST_GRADE))) || null,
            blank(cellText(row.getCell(COL.FORM_OF_EDUCATION))) || null,
            toInt(blank(cellText(row.getCell(COL.AGE_STOPPED)))),
            JSON.stringify(parseCodeList(cellText(row.getCell(COL.DROPOUT_REASONS)))),
            toBool(blank(cellText(row.getCell(COL.HAS_DISABILITY)))),
            JSON.stringify(parseCodeList(cellText(row.getCell(COL.DISABILITY_TYPES)))),
            blank(cellText(row.getCell(COL.DISABILITY_ASSESSMENT))) || null,
            toNumeric(blank(cellText(row.getCell(COL.HEIGHT)))),
            toNumeric(blank(cellText(row.getCell(COL.WEIGHT)))),
            JSON.stringify(parseCodeList(cellText(row.getCell(COL.AILMENTS)))),
            blank(cellText(row.getCell(COL.MEDICAL_ASSESSMENT))) || null,
            JSON.stringify(parseCodeList(cellText(row.getCell(COL.FAMILY_AILMENTS)))),
            parseCodeText(cellText(row.getCell(COL.TASK_PERFORMED))),
            blank(cellText(row.getCell(COL.EMPLOYER_NAME))) || null,
            blank(cellText(row.getCell(COL.EMPLOYER_CONTACT))) || null,
            parseCodeText(cellText(row.getCell(COL.WORK_ARRANGEMENT))),
            toNumeric(blank(cellText(row.getCell(COL.HOURS_PER_DAY)))),
            toInt(blank(cellText(row.getCell(COL.DAYS_PER_WEEK)))),
            toInt(blank(cellText(row.getCell(COL.AGE_STARTED)))),
            JSON.stringify(parseCodeList(cellText(row.getCell(COL.HAZARDS)))),
            parseCodeText(cellText(row.getCell(COL.PAYMENT_BASIS))),
            toNumeric(blank(cellText(row.getCell(COL.MONTHLY_INCOME)))),
            JSON.stringify(parseCodeList(cellText(row.getCell(COL.EARNINGS_USE)))),
            toBool(blank(cellText(row.getCell(COL.ADULT_SUPERVISES)))),
            parseCodeText(cellText(row.getCell(COL.WORK_SUPERVISOR))),
            toBool(blank(cellText(row.getCell(COL.IS_4PS)))),
            blank(cellText(row.getCell(COL.HOUSEHOLD_ID))) || null,
            req.user.id,
          ],
        )

        // family_members / services_availed / services_requested need the new
        // row's id, which the INSERT above doesn't return here (kept as a
        // single-statement insert like the rest of this route) — fetch it by
        // the control_no we just generated (unique) rather than adding a
        // second round trip's worth of branching.
        const { rows: created } = await pool.query('SELECT id FROM child_profiles WHERE control_no = $1', [controlNo])
        const profileId = created[0].id

        await insertSubRows(pool, 'family_members', profileId, parseFamilyMembers(row), [
          { column: 'name' },
          { column: 'relationship' },
          { column: 'age' },
          { column: 'occupation' },
          { column: 'monthly_income', key: 'income' },
        ])
        await insertSubRows(pool, 'services_availed', profileId, parseServicesAvailed(row), [
          { column: 'assistance' },
          { column: 'source' },
          { column: 'year_availed', key: 'year' },
          { column: 'availed_by', key: 'availedBy' },
          { column: 'remarks' },
        ])
        await insertSubRows(pool, 'services_requested', profileId, parseServicesRequested(row), [
          { column: 'assistance' },
          { column: 'source' },
          { column: 'period' },
          { column: 'requested_by', key: 'requestedBy' },
          { column: 'remarks' },
        ])

        results.created += 1
      } catch (err) {
        results.skipped += 1
        results.errors.push({ row: rowNumber, message: err.message ?? 'Unknown error' })
      }
    }

    res.json(results)
  }),
)

async function insertSubRows(executor, table, profileId, rows, columns) {
  let sortOrder = 0
  for (const row of rows) {
    const values = columns.map(({ column, key }) => row[key ?? column] ?? null)
    const columnNames = columns.map((c) => c.column)
    const placeholders = columnNames.map((_, i) => `$${i + 3}`).join(', ')
    await executor.query(
      `INSERT INTO ${table} (profile_id, sort_order, ${columnNames.join(', ')}) VALUES ($1, $2, ${placeholders})`,
      [profileId, sortOrder, ...values],
    )
    sortOrder += 1
  }
}

export default router
