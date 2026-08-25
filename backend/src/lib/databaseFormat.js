// Parsing helpers for the DOLE "Database" sheet format — see
// backend/assets/child-profile-import-template-master.xlsx (the master
// template, synced 2026-08-24 from the source workbook) and
// backend/scripts/import-legacy-database-sheet.mjs (which imported this same
// shape's real historical rows before the live import route also adopted
// it). Shared so both stay in sync: names, dates, and "check all that apply"
// answers are all packed into single free-text cells, and family members /
// services availed / services requested are flattened into 12 slot-columns
// each holding a multi-line "Label: value" blob instead of repeating rows.

export function blank(v) {
  const t = (v ?? '').trim()
  return t === '' || t === '-' || t === 'No Input' || t === 'N/A' ? '' : t
}

// "1. Name*" cells are consistently "LAST, FIRST N/A, MIDDLE" — the sheet
// concatenates a Suffix field (usually blank -> literal "N/A") onto the end
// of the first-name segment. Strip that artifact rather than store it.
export function parseName(raw) {
  const text = (raw ?? '').trim()
  const parts = text.split(',').map((p) => p.trim())
  if (parts.length !== 3) return { lastName: text, firstName: '', middleName: '' }
  const [lastName, firstRaw, middleName] = parts
  const firstName = firstRaw.replace(/\s+N\/A$/, '').trim()
  return { lastName, firstName, middleName }
}

// "MM.DD.YYYY" -> "YYYY-MM-DD"; "No Input" etc -> null. Also accepts a JS
// Date (exceljs parses some date-formatted cells as Date objects rather than
// text, unlike the CSV export this format was first analyzed from).
export function parseDate(raw) {
  if (raw instanceof Date) return raw.toISOString().slice(0, 10)
  const m = blank(raw).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (!m) return null
  const [, mm, dd, yyyy] = m
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

// Multi-select answers are packed into one cell as newline-separated
// "<code> – <label>" lines (possibly with a leading blank line). Returns the
// selected labels as an array, for the schema's JSONB columns.
export function parseCodeList(raw) {
  return blank(raw)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

// Same source shape, but for scalar TEXT columns (payment basis, task
// performed, etc.) where multiple lines are joined for display instead of
// kept as an array.
export function parseCodeText(raw) {
  const list = parseCodeList(raw)
  return list.length ? list.join('; ') : null
}

// Family-member / services slot-columns hold "Label: value" lines. Returns
// null for an empty slot ("-", "No Input", or blank).
export function parseBlob(raw) {
  if (!blank(raw)) return null
  const fields = {}
  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    fields[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
  }
  return fields
}
