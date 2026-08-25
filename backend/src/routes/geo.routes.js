import { Router } from 'express'
import { query } from '../db/pool.js'
import { asyncHandler } from '../middleware/errorHandler.js'

const router = Router()

router.get(
  '/regions',
  asyncHandler(async (req, res) => {
    const result = await query('SELECT id, psgc_code, name FROM regions ORDER BY name')
    res.json(result.rows)
  }),
)

router.get(
  '/provinces',
  asyncHandler(async (req, res) => {
    const { regionId } = req.query
    const result = regionId
      ? await query('SELECT id, region_id, psgc_code, name FROM provinces WHERE region_id = $1 ORDER BY name', [regionId])
      : await query('SELECT id, region_id, psgc_code, name FROM provinces ORDER BY name')
    res.json(result.rows)
  }),
)

router.get(
  '/cities',
  asyncHandler(async (req, res) => {
    const { provinceId } = req.query
    const result = provinceId
      ? await query('SELECT id, province_id, psgc_code, name FROM cities_municipalities WHERE province_id = $1 ORDER BY name', [
          provinceId,
        ])
      : await query('SELECT id, province_id, psgc_code, name FROM cities_municipalities ORDER BY name')
    res.json(result.rows)
  }),
)

router.get(
  '/barangays',
  asyncHandler(async (req, res) => {
    const { cityId } = req.query
    const result = cityId
      ? await query('SELECT id, city_id, psgc_code, name FROM barangays WHERE city_id = $1 ORDER BY name', [cityId])
      : await query('SELECT id, city_id, psgc_code, name FROM barangays ORDER BY name')
    res.json(result.rows)
  }),
)

export default router
