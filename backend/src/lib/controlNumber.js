// CL-{year}-{regionalOfficeCode}-{fieldOfficeCode}-{seq}-{M/F/X} — generated
// server-side on every create, never client-supplied. Shared by the single
// "New profile" flow and the Excel bulk importer so both number sequentially
// off the same count within a (year, RO, FO) batch. Takes an explicit query
// executor (the pool, or a transaction client) so callers running inside a
// BEGIN/COMMIT block count consistently within that transaction.
export async function generateControlNo(executor, { year, regionalOfficeCode, fieldOfficeCode, sex }) {
  const { rows } = await executor.query(
    `SELECT COUNT(*)::int AS count FROM child_profiles
     WHERE year = $1 AND regional_office_code = $2 AND field_office_code = $3`,
    [year, regionalOfficeCode, fieldOfficeCode],
  )
  const seq = String(rows[0].count + 1).padStart(5, '0')
  const suffix = sex === 'Female' ? 'F' : sex === 'Male' ? 'M' : 'X'
  return `CL-${year}-${regionalOfficeCode}-${fieldOfficeCode}-${seq}-${suffix}`
}
