// src/routes/locationTypeRoutes.js
import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  getLocationTypes,
  getLocationTypeById,
  createLocationType,
  updateLocationType,
  deleteLocationType,
} from '../controllers/locationTypeController.js'

const router = Router()

router.use(authenticate)

// Location type routes
router.get('/', getLocationTypes)
router.get('/:id', getLocationTypeById)
router.post('/', createLocationType)
router.patch('/:id', updateLocationType)
router.delete('/:id', deleteLocationType)

export default router

