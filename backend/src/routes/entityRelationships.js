import express from 'express'
import {
  createRelationship,
  deleteRelationship,
  getRelationshipTypes,
  getRelationshipsByEntity,
} from '../controllers/entityRelationshipsController.js'
import {
  authenticate,
  requireRole,
} from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(authenticate)

router.get('/types', requireRole('dm'), getRelationshipTypes)
router.post('/', requireRole('dm'), createRelationship)
router.get('/entity/:id', requireRole('dm'), getRelationshipsByEntity)
router.delete('/:id', requireRole('dm'), deleteRelationship)

export default router
