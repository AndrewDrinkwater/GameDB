import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  createEntitySecret,
  deleteEntity,
  getEntityById,
  getEntitySecrets,
  updateEntity,
} from '../controllers/entityController.js'

const router = Router()

router.use(authenticate)

router.get('/:id', getEntityById)
router.patch('/:id', updateEntity)
router.delete('/:id', deleteEntity)
router.get('/:id/secrets', getEntitySecrets)
router.post('/:id/secrets', createEntitySecret)

export default router
