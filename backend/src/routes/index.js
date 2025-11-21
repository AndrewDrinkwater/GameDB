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
import entityTypeFieldRuleRoutes from './entityTypeFieldRuleRoutes.js'
import userCampaignRoleRoutes from './userCampaignRoleRoutes.js'
import entityRelationshipsRoutes from './entityRelationships.js'
import userRoutes from './userRoutes.js' // ✅ add this
import entityRelationshipTypeRoutes from './entityRelationshipTypeRoutes.js'
import accessRoutes from './accessRoutes.js'
import notificationRoutes from './notificationRoutes.js'
import requestRoutes from './requestRoutes.js'

const router = Router()

// --- Core auth ---
router.use('/auth', authRoutes)

// --- Main app modules ---
router.use('/worlds', worldRoutes)
router.use('/campaigns', campaignRoutes)
router.use('/characters', characterRoutes)
router.use('/entity-types', entityTypeRoutes)
router.use('/entity-type-fields', entityTypeFieldRoutes)
router.use('/entity-type-field-rules', entityTypeFieldRuleRoutes)
router.use('/entities', entitiesRoute)
router.use('/user-campaign-roles', userCampaignRoleRoutes)
router.use('/entity-relationships', entityRelationshipsRoutes)
router.use('/entity-relationship-types', entityRelationshipTypeRoutes)
router.use('/users', userRoutes) // ✅ add this
router.use('/access', accessRoutes)
router.use('/notifications', notificationRoutes)
router.use('/requests', requestRoutes)

export default router
