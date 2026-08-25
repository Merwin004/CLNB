// Shared value coercions between the encode form's PATCH handler and the
// sample-data seed script — both take the same "Yes"/"No"/possibly-empty-
// string values the frontend's SegmentedToggle/TextField inputs produce and
// need to land them as the right SQL type.
export function toBool(v) {
  if (v === 'Yes') return true
  if (v === 'No') return false
  if (typeof v === 'boolean') return v
  return null
}

export function toInt(v) {
  if (v === '' || v == null) return null
  const n = parseInt(v, 10)
  return Number.isNaN(n) ? null : n
}

export function toNumeric(v) {
  if (v === '' || v == null) return null
  const n = Number(String(v).replace(/,/g, ''))
  return Number.isNaN(n) ? null : n
}
