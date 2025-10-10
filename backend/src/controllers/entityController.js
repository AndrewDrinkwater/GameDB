import { Op } from 'sequelize'
import {
  Campaign,
  Entity,
  EntitySecret,
  EntityType,
  UserCampaignRole,
  World,
} from '../models/index.js'

const PUBLIC_VISIBILITY = ['visible', 'partial']

const collectDmWorldIds = async (userId) => {
  const [dmRoles, ownedWorlds] = await Promise.all([
    UserCampaignRole.findAll({
      where: { user_id: userId, role: 'dm' },
      include: [
        {
          model: Campaign,
          as: 'campaign',
          attributes: ['world_id'],
        },
      ],
    }),
    World.findAll({ where: { created_by: userId }, attributes: ['id'] }),
  ])

  const ids = new Set()

  dmRoles.forEach((role) => {
    const worldId = role.campaign?.world_id
    if (worldId) ids.add(worldId)
  })

  ownedWorlds.forEach((world) => ids.add(world.id))

  return ids
}

const isAdmin = (user) => user?.role === 'system_admin'

const canViewEntity = (entity, user, dmWorldIds) => {
  if (!user) return false
  if (isAdmin(user)) return true
  if (entity.created_by === user.id) return true
  if (dmWorldIds.has(entity.world_id)) return true
  return PUBLIC_VISIBILITY.includes(entity.visibility)
}

const canViewSecrets = (entity, user, dmWorldIds) => {
  if (!user) return false
  if (isAdmin(user)) return true
  if (entity.created_by === user.id) return true
  return dmWorldIds.has(entity.world_id)
}

export const listEntities = async (req, res) => {
  try {
    const { user } = req
    const { world_id: worldId } = req.query

    const dmWorldIds = await collectDmWorldIds(user.id)

    const whereClauses = []
    if (worldId) {
      whereClauses.push({ world_id: worldId })
    }

    if (!isAdmin(user)) {
      const orConditions = [
        { visibility: { [Op.in]: PUBLIC_VISIBILITY } },
        { created_by: user.id },
      ]

      if (dmWorldIds.size > 0) {
        orConditions.push({ world_id: { [Op.in]: [...dmWorldIds] } })
      }

      whereClauses.push({ [Op.or]: orConditions })
    }

    const where = whereClauses.length
      ? whereClauses.length === 1
        ? whereClauses[0]
        : { [Op.and]: whereClauses }
      : {}

    const entities = await Entity.findAll({
      where,
      include: [
        { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
        { model: World, as: 'world', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    })

    const filtered = isAdmin(user)
      ? entities
      : entities.filter((entity) => canViewEntity(entity, user, dmWorldIds))

    res.json({ success: true, data: filtered })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getEntityById = async (req, res) => {
  try {
    const { user } = req
    const { id } = req.params

    const entity = await Entity.findByPk(id, {
      include: [
        { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
        { model: World, as: 'world', attributes: ['id', 'name'] },
      ],
    })

    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const dmWorldIds = await collectDmWorldIds(user.id)

    if (!canViewEntity(entity, user, dmWorldIds)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    let secrets = []
    if (canViewSecrets(entity, user, dmWorldIds)) {
      secrets = await EntitySecret.findAll({
        where: { entity_id: entity.id },
        order: [['created_at', 'ASC']],
      })
    }

    const payload = entity.get({ plain: true })
    payload.secrets = secrets

    res.json({ success: true, data: payload })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createEntity = async (req, res) => {
  try {
    const { name, description, world_id: worldId, entity_type_id: entityTypeId, visibility, metadata } = req.body

    if (!name || !worldId || !entityTypeId) {
      return res.status(400).json({ success: false, message: 'name, world_id and entity_type_id are required' })
    }

    const allowedVisibility = new Set(['hidden', 'visible', 'partial'])
    const resolvedVisibility = visibility ?? 'hidden'

    if (!allowedVisibility.has(resolvedVisibility)) {
      return res.status(400).json({ success: false, message: 'Invalid visibility value' })
    }

    if (metadata !== undefined && typeof metadata !== 'object') {
      return res.status(400).json({ success: false, message: 'metadata must be an object' })
    }

    const entity = await Entity.create({
      name,
      description,
      world_id: worldId,
      entity_type_id: entityTypeId,
      visibility: resolvedVisibility,
      metadata: metadata ?? {},
      created_by: req.user.id,
    })

    const fullEntity = await Entity.findByPk(entity.id, {
      include: [
        { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
        { model: World, as: 'world', attributes: ['id', 'name'] },
      ],
    })

    res.status(201).json({ success: true, data: fullEntity })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
