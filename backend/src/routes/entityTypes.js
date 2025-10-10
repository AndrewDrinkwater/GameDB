import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { listEntityTypes } from '../controllers/entityTypeController.js'

const router = Router()

router.get('/', authenticate, listEntityTypes)

export default router
