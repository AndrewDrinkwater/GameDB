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
  addEntityToLocation,
  removeEntityFromLocation,
  addChildLocation,
  removeChildLocation,
  updateLocationImportance,
} from '../controllers/locationController.js'
import {
  getLocationNotes,
  createLocationNote,
  updateLocationNote,
  deleteLocationNote,
  listLocationMentionNotes,
} from '../controllers/locationNoteController.js'
import {
  followLocation,
  unfollowLocation,
  checkFollowStatus,
  getFollowedLocations,
} from '../controllers/locationFollowController.js'

const router = Router()

router.use(authenticate)

// Location follow routes (before /:id routes to avoid conflicts)
router.get('/followed', getFollowedLocations)

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

// Add/remove entities from location
router.post('/:id/entities', addEntityToLocation)
router.delete('/:id/entities/:entityId', removeEntityFromLocation)

// Add/remove child locations
router.post('/:id/children', addChildLocation)
router.delete('/:id/children/:childId', removeChildLocation)

// Location importance
router.put('/:id/importance', updateLocationImportance)

// Location notes
router.get('/:id/notes', getLocationNotes)
router.post('/:id/notes', createLocationNote)
router.put('/:id/notes/:noteId', updateLocationNote)
router.delete('/:id/notes/:noteId', deleteLocationNote)
router.get('/:id/mention-notes', listLocationMentionNotes)

// Location follow routes
router.post('/:id/follow', followLocation)
router.delete('/:id/follow', unfollowLocation)
router.get('/:id/follow-status', checkFollowStatus)

export default router

