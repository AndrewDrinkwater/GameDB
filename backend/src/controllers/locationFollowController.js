import { LocationFollow, Location, Campaign, User, LocationType } from '../models/index.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'
// Note: We'll use a simplified location access check similar to what we did in locationNoteController
// For a full implementation, we'd need locationAccess.js similar to entityAccess.js

const normaliseId = (value) => {
  if (!value) return null
  const str = String(value).trim()
  return str || null
}

// Simplified location access check - locations use similar access control to entities
const canUserReadLocation = (location, user, worldAccess) => {
  if (!location) return false
  if (worldAccess?.isOwner || worldAccess?.isAdmin) return true
  if (worldAccess?.hasAccess) {
    // Basic check - if user has world access and location is visible
    if (location.visibility === 'hidden') return false
    if (location.read_access === 'hidden') return false
    if (location.read_access === 'global' || !location.read_access) return true
    // For selective access, we'd need more context, but for follows we'll allow if they have world access
    return true
  }
  return false
}

/**
 * Follow a location in a campaign context
 */
export const followLocation = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const locationId = normaliseId(req.params?.id)
    if (!locationId) {
      return res.status(400).json({ success: false, message: 'Location id is required' })
    }

    // Campaign context is required for follows
    const campaignId = normaliseId(
      req.body?.campaignId || req.body?.campaign_id || req.query?.campaignId || req.query?.campaign_id || req.campaignContextId,
    )
    if (!campaignId) {
      return res.status(400).json({ success: false, message: 'Campaign context is required' })
    }

    // Verify location exists and user can access it
    const location = await Location.findByPk(locationId)
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' })
    }

    const access = await checkWorldAccess(location.world_id, req.user)
    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!canUserReadLocation(location, req.user, access)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    // Verify campaign exists and matches location world
    const campaign = await Campaign.findByPk(campaignId)
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' })
    }

    if (
      campaign.world_id &&
      location.world_id &&
      String(campaign.world_id) !== String(location.world_id)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Campaign must belong to the same world as the location',
      })
    }

    // Check if already following
    const existing = await LocationFollow.findOne({
      where: {
        user_id: userId,
        location_id: locationId,
        campaign_id: campaignId,
      },
    })

    if (existing) {
      return res.json({ success: true, following: true, data: existing })
    }

    // Create follow relationship
    const follow = await LocationFollow.create({
      user_id: userId,
      location_id: locationId,
      campaign_id: campaignId,
    })

    const plain = typeof follow.get === 'function' ? follow.get({ plain: true }) : follow

    return res.status(201).json({
      success: true,
      following: true,
      data: {
        id: plain.id,
        userId: plain.user_id,
        locationId: plain.location_id,
        campaignId: plain.campaign_id,
        createdAt: plain.created_at,
      },
    })
  } catch (err) {
    console.error('❌ Failed to follow location', err)
    // Handle unique constraint violation
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.json({ success: true, following: true })
    }
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to follow location' })
  }
}

/**
 * Unfollow a location in a campaign context
 */
export const unfollowLocation = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const locationId = normaliseId(req.params?.id)
    if (!locationId) {
      return res.status(400).json({ success: false, message: 'Location id is required' })
    }

    // Campaign context is required
    const campaignId = normaliseId(
      req.body?.campaignId || req.body?.campaign_id || req.query?.campaignId || req.query?.campaign_id || req.campaignContextId,
    )
    if (!campaignId) {
      return res.status(400).json({ success: false, message: 'Campaign context is required' })
    }

    const follow = await LocationFollow.findOne({
      where: {
        user_id: userId,
        location_id: locationId,
        campaign_id: campaignId,
      },
    })

    if (!follow) {
      return res.json({ success: true, following: false })
    }

    await follow.destroy()

    return res.json({ success: true, following: false })
  } catch (err) {
    console.error('❌ Failed to unfollow location', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to unfollow location' })
  }
}

/**
 * Check if user follows location in campaign context
 */
export const checkFollowStatus = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const locationId = normaliseId(req.params?.id)
    if (!locationId) {
      return res.status(400).json({ success: false, message: 'Location id is required' })
    }

    // Campaign context is required
    const campaignId = normaliseId(
      req.query?.campaignId || req.query?.campaign_id || req.campaignContextId,
    )
    if (!campaignId) {
      return res.status(400).json({ success: false, message: 'Campaign context is required' })
    }

    const follow = await LocationFollow.findOne({
      where: {
        user_id: userId,
        location_id: locationId,
        campaign_id: campaignId,
      },
    })

    return res.json({ success: true, following: Boolean(follow) })
  } catch (err) {
    console.error('❌ Failed to check follow status', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to check follow status' })
  }
}

/**
 * Get list of locations user follows
 * Supports campaign_id filter
 */
export const getFollowedLocations = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const where = { user_id: userId }

    // Filter by campaign
    const campaignId = normaliseId(req.query?.campaignId || req.query?.campaign_id)
    if (campaignId) {
      where.campaign_id = campaignId
    }

    const follows = await LocationFollow.findAll({
      where,
      include: [
        {
          model: Location,
          as: 'location',
          attributes: ['id', 'name', 'location_type_id'],
          include: [
            {
              model: LocationType,
              as: 'locationType',
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['id', 'name'],
        },
      ],
      order: [['created_at', 'DESC']],
    })

    const formatted = follows.map((follow) => {
      const plain = typeof follow.get === 'function' ? follow.get({ plain: true }) : follow
      return {
        id: plain.id,
        locationId: plain.location_id,
        location: plain.location
          ? {
              id: plain.location.id,
              name: plain.location.name,
              locationTypeId: plain.location.location_type_id,
              locationType: plain.location.locationType
                ? {
                    id: plain.location.locationType.id,
                    name: plain.location.locationType.name,
                  }
                : null,
            }
          : null,
        campaignId: plain.campaign_id,
        campaign: plain.campaign
          ? {
              id: plain.campaign.id,
              name: plain.campaign.name,
            }
          : null,
        createdAt: plain.created_at,
      }
    })

    return res.json({ success: true, data: formatted })
  } catch (err) {
    console.error('❌ Failed to get followed locations', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to load followed locations' })
  }
}

