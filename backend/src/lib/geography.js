import { query } from '../db/pool.js'
import { HttpError } from '../middleware/errorHandler.js'

// Resolves present-address Region/Province/Municipality *names* (as typed on
// an Excel import row, or held in the frontend's string-based address
// selects) into the FK ids child_profiles actually stores. Shared by the
// Excel importer and the profile create/update routes so both reject the
// same way on a mismatched hierarchy (e.g. a real municipality paired with
// the wrong province).
//
// Barangay is deliberately NOT part of this resolution — the source DOLE
// workbook has no barangay master list at all (there are ~42,000 nationwide;
// the real form takes it as free text), so present_barangay_text is stored
// directly as whatever the caller typed, not looked up against a table.
export async function resolveGeography({ region, province, municipality }) {
  const regionRes = await query('SELECT id FROM regions WHERE lower(name) = lower($1)', [region])
  if (regionRes.rows.length === 0) throw new HttpError(400, `Unknown region "${region}"`)
  const regionId = regionRes.rows[0].id

  const provinceRes = await query('SELECT id FROM provinces WHERE region_id = $1 AND lower(name) = lower($2)', [regionId, province])
  if (provinceRes.rows.length === 0) throw new HttpError(400, `Unknown province "${province}" for region "${region}"`)
  const provinceId = provinceRes.rows[0].id

  const cityRes = await query('SELECT id FROM cities_municipalities WHERE province_id = $1 AND lower(name) = lower($2)', [
    provinceId,
    municipality,
  ])
  if (cityRes.rows.length === 0) throw new HttpError(400, `Unknown municipality/city "${municipality}" for province "${province}"`)
  const cityId = cityRes.rows[0].id

  return { presentRegionId: regionId, presentProvinceId: provinceId, presentCityId: cityId }
}
