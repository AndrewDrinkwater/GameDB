import express from 'express'
import {
  createRelationship,
  deleteRelationship,
  getRelationshipTypes,
  getRelationshipsByEntity,
  listRelationships,
} from '../controllers/entityRelationshipsController.js'
import {
  authenticate,
  requireRole,
} from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(authenticate)

router.get('/', requireRole('dm', 'system_admin'), listRelationships)
router.get('/types', requireRole('dm', 'system_admin'), getRelationshipTypes)
router.post('/', requireRole('dm', 'system_admin'), createRelationship)
router.get('/entity/:id', requireRole('dm', 'system_admin'), getRelationshipsByEntity)
router.delete('/:id', requireRole('dm', 'system_admin'), deleteRelationship)

export default router
