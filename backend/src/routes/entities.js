import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  createEntity,
  createEntitySecret,
  deleteEntity,
  getEntityById,
  getEntitySecrets,
  searchEntities,
  updateEntity,
} from '../controllers/entityController.js'
import { getEntityGraph } from '../controllers/entityGraphController.js'

const router = Router()

// Authenticated routes
router.use(authenticate)

router.get('/:id/graph', getEntityGraph)
router.post('/', createEntity)
router.get('/search', searchEntities)
router.get('/:id', getEntityById)
router.patch('/:id', updateEntity)
router.delete('/:id', deleteEntity)
router.get('/:id/secrets', getEntitySecrets)
router.post('/:id/secrets', createEntitySecret)

export default router
