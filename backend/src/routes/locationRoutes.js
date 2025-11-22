// src/routes/locationRoutes.js
import { Router } from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  getLocations,
  getLocationById,
  getLocationPath,
  createLocation,
  updateLocation,
  deleteLocation,
  getLocationEntities,
  moveEntityToLocation,
} from '../controllers/locationController.js'

const router = Router()

router.use(authenticate)

// Location routes
router.get('/', getLocations)
router.get('/:id', getLocationById)
router.get('/:id/path', getLocationPath)
router.get('/:id/entities', getLocationEntities)
router.post('/', createLocation)
router.patch('/:id', updateLocation)
router.delete('/:id', deleteLocation)

// Entity location assignment
router.patch('/entities/:entityId', moveEntityToLocation)

export default router

