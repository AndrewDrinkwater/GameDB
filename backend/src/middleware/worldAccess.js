import { Campaign, Character, Entity, UserCampaignRole, World } from '../models/index.js'

const isSystemAdmin = (user) => user?.role === 'system_admin'

export const checkWorldAccess = async (worldId, user) => {
  const userId = user?.id
  const world = await World.findByPk(worldId, { attributes: ['id', 'created_by', 'name'] })
  const admin = isSystemAdmin(user)

  if (!world) {
    return { world: null, hasAccess: false, isOwner: false, isAdmin: admin }
  }

  if (admin) {
    return { world, hasAccess: true, isOwner: false, isAdmin: true }
  }

  if (!userId) {
    return { world, hasAccess: false, isOwner: false, isAdmin: false }
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
          where: { world_id: worldId },
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
          where: { world_id: worldId },
          attributes: [],
        },
      ],
    }),
    Entity.count({ where: { world_id: worldId, created_by: userId } }),
  ])

  const hasAccess = campaignRoleCount > 0 || characterCount > 0 || entityCount > 0

  return { world, hasAccess, isOwner: false, isAdmin: false }
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
