import express from 'express'
import { getWorlds, createWorld, updateWorld, deleteWorld } from '../controllers/worldController.js'
import { authenticate, requireRole } from '../middleware/authMiddleware.js'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// List worlds (any logged-in user)
router.get('/', getWorlds)

// Create world (any recognised role)
router.post('/', requireRole('system_admin', 'user'), createWorld)

// Update world (only creator or admin, enforced in controller)
router.put('/:id', requireRole('system_admin', 'user'), updateWorld)

// Delete world (only creator or admin, checked in controller)
router.delete('/:id', deleteWorld)

export default router
