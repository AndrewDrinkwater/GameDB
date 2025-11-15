import { Campaign, Character, Entity, UserCampaignRole, World } from '../models/index.js'

const isSystemAdmin = (user) => user?.role === 'system_admin'

const normaliseWorldId = (value) => {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object') {
    if ('id' in value && value.id !== undefined && value.id !== null) {
      return normaliseWorldId(value.id)
    }
    return ''
  }
  return String(value)
}

export const checkWorldAccess = async (worldId, user) => {
  const admin = isSystemAdmin(user)
  const baseResult = { world: null, hasAccess: false, isOwner: false, isAdmin: admin }
  const normalisedWorldId = normaliseWorldId(worldId)

  if (!normalisedWorldId) {
    return baseResult
  }

  try {
    const world = await World.findByPk(normalisedWorldId, {
      attributes: ['id', 'created_by', 'name', 'entity_creation_scope'],
    })

    if (!world) {
      return baseResult
    }

    if (admin) {
      return { world, hasAccess: true, isOwner: false, isAdmin: true }
    }

    const userId = user?.id
    if (!userId) {
      return { ...baseResult, world, isAdmin: false }
    }

    const isOwner = world.created_by === userId
    if (isOwner) {
      return { world, hasAccess: true, isOwner: true, isAdmin: false }
    }

    const [campaignRoleCount, characterCount, entityCount] = await Promise.all([
      UserCampaignRole.count({
        where: { user_id: userId },
        include: [
          {
            model: Campaign,
            as: 'campaign',
            required: true,
            where: { world_id: normalisedWorldId },
            attributes: [],
          },
        ],
      }),
      Character.count({
        where: { user_id: userId },
        include: [
          {
            model: Campaign,
            as: 'campaign',
            required: true,
            where: { world_id: normalisedWorldId },
            attributes: [],
          },
        ],
      }),
      Entity.count({ where: { world_id: normalisedWorldId, created_by: userId } }),
    ])

    const hasAccess = campaignRoleCount > 0 || characterCount > 0 || entityCount > 0

    return { world, hasAccess, isOwner: false, isAdmin: false }
  } catch (error) {
    console.error(`Failed to check world access for ${normalisedWorldId}`, error)
    return baseResult
  }
}

export const ensureWorldAccess = async (req, res, next) => {
  try {
    const worldId = req.params.id
    const access = await checkWorldAccess(worldId, req.user)

    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    req.world = access.world
    req.worldAccess = access
    return next()
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}
