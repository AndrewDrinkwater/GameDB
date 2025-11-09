import express from 'express'
import {
  createRelationshipType,
  deleteRelationshipType,
  getRelationshipType,
  listRelationshipTypes,
  updateRelationshipType,
} from '../controllers/entityRelationshipTypeController.js'
import { authenticate } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(authenticate)

router.get('/', listRelationshipTypes)
router.post('/', createRelationshipType)
router.get('/:id', getRelationshipType)
router.patch('/:id', updateRelationshipType)
router.delete('/:id', deleteRelationshipType)

export default router
