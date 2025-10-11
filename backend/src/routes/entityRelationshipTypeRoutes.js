import express from 'express'
import {
  createRelationshipType,
  deleteRelationshipType,
  getRelationshipType,
  listRelationshipTypes,
  updateRelationshipType,
} from '../controllers/entityRelationshipTypeController.js'
import { authenticate, requireRole } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(authenticate)

router.get('/', listRelationshipTypes)
router.post('/', requireRole('system_admin'), createRelationshipType)
router.get('/:id', requireRole('system_admin'), getRelationshipType)
router.patch('/:id', requireRole('system_admin'), updateRelationshipType)
router.delete('/:id', requireRole('system_admin'), deleteRelationshipType)

export default router
