// src/routes/index.js
import { Router } from 'express'

// Existing routes
import authRoutes from './authRoutes.js'
import worldRoutes from './worldRoutes.js'

// New routes
import campaignRoutes from './campaignRoutes.js'
import characterRoutes from './characterRoutes.js'
import entityRoutes from './entityRoutes.js'
import userCampaignRoleRoutes from './userCampaignRoleRoutes.js'
import relationshipRoutes from './relationshipRoutes.js'
import userRoutes from './userRoutes.js' // ✅ add this

const router = Router()

// --- Core auth ---
router.use('/auth', authRoutes)

// --- Main app modules ---
router.use('/worlds', worldRoutes)
router.use('/campaigns', campaignRoutes)
router.use('/characters', characterRoutes)
router.use('/entities', entityRoutes)
router.use('/user-campaign-roles', userCampaignRoleRoutes)
router.use('/relationships', relationshipRoutes)
router.use('/users', userRoutes) // ✅ add this

export default router
