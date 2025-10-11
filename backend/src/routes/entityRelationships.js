import express from 'express'
import {
  createRelationship,
  deleteRelationship,
  getRelationshipTypes,
  getRelationshipsByEntity,
  listRelationships,
} from '../controllers/entityRelationshipsController.js'
import { authenticate } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(authenticate)

router.get('/', listRelationships)
router.get('/types', getRelationshipTypes)
router.post('/', createRelationship)
router.get('/entity/:id', getRelationshipsByEntity)
router.delete('/:id', deleteRelationship)

export default router
