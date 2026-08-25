import { Router } from 'express'
import { query } from '../db/pool.js'
import { asyncHandler, HttpError } from '../middleware/errorHandler.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth, requireRole('lgu', 'admin'))

const AGENCIES = ['DOLE', 'DSWD']

// GET /api/lgu/profiles — a work queue, not the full roster: only children
// with at least one services_requested row that hasn't been referred yet
// (no referrals row points at it — see 0007_lgu_role_and_referrals.sql for
// why service_requested_id is nullable rather than a hard delete cascade).
router.get(
  '/profiles',
  asyncHandler(async (req, res) => {
    const { rows } = await query(
      `SELECT cp.id, cp.control_no, cp.last_name, cp.first_name, cp.updated_at, fo.name AS field_office_name,
              sr.id AS service_id, sr.assistance, sr.source, sr.period, sr.requested_by
       FROM child_profiles cp
       JOIN services_requested sr ON sr.profile_id = cp.id
       LEFT JOIN field_offices fo ON fo.code = cp.field_office_code
       LEFT JOIN referrals r ON r.service_requested_id = sr.id
       WHERE r.id IS NULL
       ORDER BY cp.updated_at DESC, sr.sort_order`,
    )

    const byProfile = new Map()
    for (const r of rows) {
      if (!byProfile.has(r.id)) {
        byProfile.set(r.id, {
          id: r.id,
          name: r.first_name || r.last_name ? `${r.first_name?.[0] ?? ''}. ${r.last_name ?? ''}`.trim() : 'Untitled draft',
          controlNo: r.control_no,
          fieldOffice: r.field_office_name,
          updatedAt: r.updated_at,
          pendingServices: [],
        })
      }
      byProfile.get(r.id).pendingServices.push({
        id: r.service_id,
        assistance: r.assistance,
        source: r.source,
        period: r.period,
        requestedBy: r.requested_by,
      })
    }

    res.json({ profiles: [...byProfile.values()] })
  }),
)

// POST /api/lgu/referrals — refer one pending service request to DOLE or DSWD.
router.post(
  '/referrals',
  asyncHandler(async (req, res) => {
    const { profileId, serviceRequestedId, agency } = req.body ?? {}
    if (!profileId || !serviceRequestedId || !agency) {
      throw new HttpError(400, 'profileId, serviceRequestedId, and agency are required')
    }
    if (!AGENCIES.includes(agency)) {
      throw new HttpError(400, `agency must be one of: ${AGENCIES.join(', ')}`)
    }

    const { rows: serviceRows } = await query(
      'SELECT id, assistance FROM services_requested WHERE id = $1 AND profile_id = $2',
      [serviceRequestedId, profileId],
    )
    if (serviceRows.length === 0) throw new HttpError(404, 'That service request was not found for this child')

    const { rows: existing } = await query('SELECT id FROM referrals WHERE service_requested_id = $1', [serviceRequestedId])
    if (existing.length > 0) throw new HttpError(409, 'This service request has already been referred')

    const { rows } = await query(
      `INSERT INTO referrals (profile_id, service_requested_id, assistance, agency, referred_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [profileId, serviceRequestedId, serviceRows[0].assistance, agency, req.user.id],
    )
    res.status(201).json({ referral: rows[0] })
  }),
)

export default router
