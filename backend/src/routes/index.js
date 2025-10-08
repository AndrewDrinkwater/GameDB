import { Router } from 'express'
import authRoutes from './authRoutes.js'
import worldRoutes from './worldRoutes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/worlds', worldRoutes)

export default router
