import { EntityFollow, Entity, Campaign, User, EntityType } from '../models/index.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'
import {
  buildEntityReadContext,
  canUserReadEntity,
} from '../utils/entityAccess.js'

const normaliseId = (value) => {
  if (!value) return null
  const str = String(value).trim()
  return str || null
}

/**
 * Follow an entity in a campaign context
 */
export const followEntity = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const entityId = normaliseId(req.params?.id)
    if (!entityId) {
      return res.status(400).json({ success: false, message: 'Entity id is required' })
    }

    // Campaign context is required for follows
    const campaignId = normaliseId(
      req.body?.campaignId || req.body?.campaign_id || req.query?.campaignId || req.query?.campaign_id || req.campaignContextId,
    )
    if (!campaignId) {
      return res.status(400).json({ success: false, message: 'Campaign context is required' })
    }

    // Verify entity exists and user can access it
    const entity = await Entity.findByPk(entityId)
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, req.user)
    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    const readContext = await buildEntityReadContext({
      worldId: entity.world_id,
      user: req.user,
      worldAccess: access,
      campaignContextId: campaignId,
    })

    if (!canUserReadEntity(entity, readContext)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    // Verify campaign exists and matches entity world
    const campaign = await Campaign.findByPk(campaignId)
    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' })
    }

    if (
      campaign.world_id &&
      entity.world_id &&
      String(campaign.world_id) !== String(entity.world_id)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Campaign must belong to the same world as the entity',
      })
    }

    // Check if already following
    const existing = await EntityFollow.findOne({
      where: {
        user_id: userId,
        entity_id: entityId,
        campaign_id: campaignId,
      },
    })

    if (existing) {
      return res.json({ success: true, following: true, data: existing })
    }

    // Create follow relationship
    const follow = await EntityFollow.create({
      user_id: userId,
      entity_id: entityId,
      campaign_id: campaignId,
    })

    const plain = typeof follow.get === 'function' ? follow.get({ plain: true }) : follow

    return res.status(201).json({
      success: true,
      following: true,
      data: {
        id: plain.id,
        userId: plain.user_id,
        entityId: plain.entity_id,
        campaignId: plain.campaign_id,
        createdAt: plain.created_at,
      },
    })
  } catch (err) {
    console.error('❌ Failed to follow entity', err)
    // Handle unique constraint violation
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.json({ success: true, following: true })
    }
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to follow entity' })
  }
}

/**
 * Unfollow an entity in a campaign context
 */
export const unfollowEntity = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const entityId = normaliseId(req.params?.id)
    if (!entityId) {
      return res.status(400).json({ success: false, message: 'Entity id is required' })
    }

    // Campaign context is required
    const campaignId = normaliseId(
      req.body?.campaignId || req.body?.campaign_id || req.query?.campaignId || req.query?.campaign_id || req.campaignContextId,
    )
    if (!campaignId) {
      return res.status(400).json({ success: false, message: 'Campaign context is required' })
    }

    const follow = await EntityFollow.findOne({
      where: {
        user_id: userId,
        entity_id: entityId,
        campaign_id: campaignId,
      },
    })

    if (!follow) {
      return res.json({ success: true, following: false })
    }

    await follow.destroy()

    return res.json({ success: true, following: false })
  } catch (err) {
    console.error('❌ Failed to unfollow entity', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to unfollow entity' })
  }
}

/**
 * Check if user follows entity in campaign context
 */
export const checkFollowStatus = async (req, res) => {
  try {
    const userId = normaliseId(req.user?.id)
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' })
    }

    const entityId = normaliseId(req.params?.id)
    if (!entityId) {
      return res.status(400).json({ success: false, message: 'Entity id is required' })
    }

    // Campaign context is required
    const campaignId = normaliseId(
      req.query?.campaignId || req.query?.campaign_id || req.campaignContextId,
    )
    if (!campaignId) {
      return res.status(400).json({ success: false, message: 'Campaign context is required' })
    }

    const follow = await EntityFollow.findOne({
      where: {
        user_id: userId,
        entity_id: entityId,
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
 * Get list of entities user follows
 * Supports campaign_id filter
 */
export const getFollowedEntities = async (req, res) => {
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

    const follows = await EntityFollow.findAll({
      where,
      include: [
        {
          model: Entity,
          as: 'entity',
          attributes: ['id', 'name', 'entity_type_id'],
          include: [
            {
              model: EntityType,
              as: 'entityType',
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
        entityId: plain.entity_id,
        entity: plain.entity
          ? {
              id: plain.entity.id,
              name: plain.entity.name,
              entityTypeId: plain.entity.entity_type_id,
              entityType: plain.entity.entityType
                ? {
                    id: plain.entity.entityType.id,
                    name: plain.entity.entityType.name,
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
    console.error('❌ Failed to get followed entities', err)
    return res
      .status(500)
      .json({ success: false, message: err.message || 'Failed to load followed entities' })
  }
}

