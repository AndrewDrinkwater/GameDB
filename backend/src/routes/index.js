// src/routes/index.js
import { Router } from 'express'

// Existing routes
import authRoutes from './authRoutes.js'
import worldRoutes from './worldRoutes.js'

// New routes
import campaignRoutes from './campaignRoutes.js'
import characterRoutes from './characterRoutes.js'
import entitiesRoute from './entities.js'
import entityTypeRoutes from './entityTypes.js'
import entityTypeFieldRoutes from './entityTypeFieldRoutes.js'
import userCampaignRoleRoutes from './userCampaignRoleRoutes.js'
import entityRelationshipsRoutes from './entityRelationships.js'
import userRoutes from './userRoutes.js' // ✅ add this
import entityRelationshipTypeRoutes from './entityRelationshipTypeRoutes.js'

const router = Router()

// --- Core auth ---
router.use('/auth', authRoutes)

// --- Main app modules ---
router.use('/worlds', worldRoutes)
router.use('/campaigns', campaignRoutes)
router.use('/characters', characterRoutes)
router.use('/entity-types', entityTypeRoutes)
router.use('/entity-type-fields', entityTypeFieldRoutes)
router.use('/entities', entitiesRoute)
router.use('/user-campaign-roles', userCampaignRoleRoutes)
router.use('/entity-relationships', entityRelationshipsRoutes)
router.use('/entity-relationship-types', entityRelationshipTypeRoutes)
router.use('/users', userRoutes) // ✅ add this

export default router
