import { Op } from 'sequelize'
import { Entity, EntityType, World, sequelize } from '../models/index.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'
import { buildEntityReadContext, buildReadableEntitiesWhereClause } from '../utils/entityAccess.js'

const PUBLIC_VISIBILITY = ['visible', 'partial']

const isSystemAdmin = (user) => user?.role === 'system_admin'

const ensureManageAccess = async (user, worldId) => {
  if (isSystemAdmin(user)) return true
  if (!worldId) return false

  const access = await checkWorldAccess(worldId, user)
  return access.isOwner
}

const normaliseWorldId = (value) => {
  if (value === undefined || value === null) return ''
  const trimmed = String(value).trim()
  return trimmed
}

const mapEntityType = (instance) => {
  if (!instance) return null

  const plain = instance.get({ plain: true })
  const worldId =
    plain.world_id ?? plain.worldId ?? (plain.world && plain.world.id) ?? null
  const worldName = plain.world?.name ?? plain.world_name ?? null
  const mappedWorld = worldId
    ? { id: worldId, name: worldName ?? plain.world?.name ?? null }
    : null

  return {
    ...plain,
    world_id: worldId,
    world_name: worldName,
    world_owner_id: plain.world?.created_by ?? plain.world_owner_id ?? null,
    world: mappedWorld,
  }
}

export const listEntityTypes = async (req, res) => {
  try {
    const { worldId: rawWorldId, world_id: rawLegacyWorldId } = req.query ?? {}
    const resolvedWorldId = normaliseWorldId(rawWorldId ?? rawLegacyWorldId)

    if (!resolvedWorldId) {
      return res
        .status(400)
        .json({ success: false, message: 'worldId is required to list entity types' })
    }

    const access = await checkWorldAccess(resolvedWorldId, req.user)

    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const types = await EntityType.findAll({
      where: { world_id: resolvedWorldId },
      order: [['name', 'ASC']],
      include: [{ model: World, as: 'world', attributes: ['id', 'name', 'created_by'] }],
    })

    res.json({ success: true, data: types.map((type) => mapEntityType(type)) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getEntityType = async (req, res) => {
  try {
    const { id } = req.params
    const entityType = await EntityType.findByPk(id, {
      include: [{ model: World, as: 'world', attributes: ['id', 'name', 'created_by'] }],
    })

    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }

    return res.json({ success: true, data: mapEntityType(entityType) })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const createEntityType = async (req, res) => {
  try {
    const { name, description } = req.body ?? {}
    const trimmedName = typeof name === 'string' ? name.trim() : ''

    if (!trimmedName) {
      return res.status(400).json({ success: false, message: 'name is required' })
    }

    const rawWorldId =
      req.body?.world_id ?? req.body?.worldId ?? req.body?.world?.id ?? null
    const resolvedWorldId = normaliseWorldId(rawWorldId)

    if (!resolvedWorldId) {
      return res.status(400).json({ success: false, message: 'world_id is required' })
    }

    const world = await World.findByPk(resolvedWorldId)
    if (!world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    const canManage = await ensureManageAccess(req.user, world.id)
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    try {
      const entityType = await EntityType.create({
        name: trimmedName,
        description: description ?? null,
        world_id: resolvedWorldId,
      })

      await entityType.reload({
        include: [{ model: World, as: 'world', attributes: ['id', 'name', 'created_by'] }],
      })

      return res.status(201).json({ success: true, data: mapEntityType(entityType) })
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'An entity type with this name already exists in the selected world',
        })
      }
      throw error
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const updateEntityType = async (req, res) => {
  try {
    const { id } = req.params
    const entityType = await EntityType.findByPk(id)

    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }

    const canManageExisting = await ensureManageAccess(req.user, entityType.world_id)
    if (!canManageExisting) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const { name, description } = req.body ?? {}
    const updates = {}

    if (name !== undefined) {
      const trimmedName = typeof name === 'string' ? name.trim() : ''
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: 'name cannot be empty' })
      }
      updates.name = trimmedName
    }

    if (description !== undefined) {
      updates.description = description ?? null
    }

    if (
      Object.prototype.hasOwnProperty.call(req.body ?? {}, 'world_id') ||
      Object.prototype.hasOwnProperty.call(req.body ?? {}, 'worldId') ||
      (req.body?.world && Object.prototype.hasOwnProperty.call(req.body.world, 'id'))
    ) {
      const worldCandidate =
        req.body?.world_id ?? req.body?.worldId ?? req.body?.world?.id ?? null
      const resolvedWorldId = normaliseWorldId(worldCandidate)

      if (!resolvedWorldId) {
        return res.status(400).json({ success: false, message: 'world_id cannot be empty' })
      }

      const world = await World.findByPk(resolvedWorldId)
      if (!world) {
        return res.status(404).json({ success: false, message: 'World not found' })
      }

      const canManageTarget = await ensureManageAccess(req.user, resolvedWorldId)
      if (!canManageTarget) {
        return res.status(403).json({ success: false, message: 'Forbidden' })
      }

      const mismatchedEntities = await Entity.count({
        where: {
          entity_type_id: id,
          world_id: { [Op.ne]: resolvedWorldId },
        },
      })

      if (mismatchedEntities > 0) {
        return res.status(409).json({
          success: false,
          message: 'Existing entities for this type belong to a different world',
        })
      }

      updates.world_id = resolvedWorldId
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No updates provided' })
    }

    try {
      await entityType.update(updates)
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({
          success: false,
          message: 'An entity type with this name already exists in the selected world',
        })
      }
      throw error
    }

    await entityType.reload({
      include: [{ model: World, as: 'world', attributes: ['id', 'name', 'created_by'] }],
    })

    return res.json({ success: true, data: mapEntityType(entityType) })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteEntityType = async (req, res) => {
  try {
    const { id } = req.params
    const entityType = await EntityType.findByPk(id)

    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }

    const canManage = await ensureManageAccess(req.user, entityType.world_id)
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const entityCount = await Entity.count({ where: { entity_type_id: id } })
    if (entityCount > 0) {
      return res
        .status(409)
        .json({ success: false, message: 'Cannot delete an entity type that is in use by existing entities' })
    }

    await entityType.destroy()

    return res.json({ success: true, message: 'Entity type deleted' })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const listWorldEntityTypesWithEntities = async (req, res) => {
  try {
    const { world, user } = req

    if (!world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    const access = req.worldAccess ?? (await checkWorldAccess(world.id, user))
    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const readContext = await buildEntityReadContext({
      worldId: world.id,
      user,
      worldAccess: access,
    })

    const where = { world_id: world.id }

    if (!access.isOwner && !access.isAdmin) {
      const orClauses = [{ visibility: { [Op.in]: PUBLIC_VISIBILITY } }]

      if (user?.id) {
        orClauses.push({ created_by: user.id })
      }

      if (orClauses.length > 1) {
        where[Op.or] = orClauses
      } else {
        where[Op.and] = [...(where[Op.and] ?? []), orClauses[0]]
      }
    }

    const readAccessWhere = buildReadableEntitiesWhereClause(readContext)

    if (readAccessWhere) {
      if (where[Op.and]) {
        where[Op.and].push(readAccessWhere)
      } else {
        where[Op.and] = [readAccessWhere]
      }
    }

    const usage = await Entity.findAll({
      where,
      attributes: [
        'entity_type_id',
        [sequelize.fn('COUNT', sequelize.col('entity_type_id')), 'entityCount'],
      ],
      group: ['entity_type_id'],
      raw: true,
    })

    const usageMap = new Map()
    usage.forEach((row) => {
      const typeId = row.entity_type_id
      const count = Number(row.entityCount ?? row.count ?? 0)
      if (!typeId || count <= 0) return
      usageMap.set(typeId, count)
    })

    if (usageMap.size === 0) {
      return res.json({ success: true, data: [] })
    }

    const types = await EntityType.findAll({
      where: { id: [...usageMap.keys()], world_id: world.id },
      order: [['name', 'ASC']],
    })

    const data = types.map((type) => ({
      id: type.id,
      name: type.name,
      description: type.description,
      entityCount: usageMap.get(type.id) ?? 0,
    }))

    return res.json({ success: true, data })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}
