import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { createEntity, getEntityById, listEntities } from '../controllers/entityController.js'

const router = Router()

router.get('/', authenticate, listEntities)
router.get('/:id', authenticate, getEntityById)
router.post('/', authenticate, createEntity)

export default router
