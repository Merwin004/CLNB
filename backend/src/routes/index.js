import { Router } from 'express'
import authRoutes from './auth.routes.js'
import profilesRoutes from './profiles.routes.js'
import importRoutes from './import.routes.js'
import geoRoutes from './geo.routes.js'
import lguRoutes from './lgu.routes.js'

const router = Router()

router.get('/health', (req, res) => res.json({ ok: true }))
router.use('/auth', authRoutes)
router.use('/profiles/import', importRoutes)
router.use('/profiles', profilesRoutes)
router.use('/lgu', lguRoutes)
router.use('/', geoRoutes)

export default router
