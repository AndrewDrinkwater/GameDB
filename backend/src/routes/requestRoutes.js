import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import { requireRequestEditAccess } from '../middleware/requestAccess.js'
import {
  createRequest,
  listRequests,
  getRequest,
  updateRequest,
  deleteRequest,
} from '../controllers/requestController.js'
import requestNoteRoutes from './requestNoteRoutes.js'

const router = express.Router()

router.use(authenticate)

router.post('/', createRequest)
router.get('/', listRequests)
router.get('/:id', getRequest)
router.patch('/:id', requireRequestEditAccess, updateRequest)
router.delete('/:id', requireRequestEditAccess, deleteRequest)

// Nested routes for notes
router.use('/:requestId/notes', requestNoteRoutes)

export default router

