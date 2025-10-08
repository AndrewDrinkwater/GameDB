import { Router } from 'express'
import { getWorlds, createWorld, deleteWorld } from '../controllers/worldController.js'
import { authenticate, requireRole } from '../middleware/authMiddleware.js'

const router = Router()

// all routes require login
router.use(authenticate)

// list worlds (any logged-in user)
router.get('/', getWorlds)

// create world (only system_admin or dungeon_master)
router.post('/', requireRole('system_admin', 'dungeon_master'), createWorld)

// delete world (only creator or admin, checked in controller)
router.delete('/:id', deleteWorld)

export default router
