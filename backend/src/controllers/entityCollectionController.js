import { Op } from 'sequelize'
import {
  Campaign,
  Entity,
  EntityCollection,
  UserCampaignRole,
  World,
} from '../models/index.js'

export const MAX_COLLECTION_ENTITIES = 1000

class CollectionValidationError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'CollectionValidationError'
    this.status = status
  }
}

const normaliseId = (value) => {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

export const normaliseCollectionName = (value) => {
  if (typeof value !== 'string') {
    throw new CollectionValidationError('Name is required')
  }
  const trimmed = value.trim()
  if (!trimmed) {
    throw new CollectionValidationError('Name is required')
  }
  if (trimmed.length > 120) {
    throw new CollectionValidationError('Name must be 120 characters or less')
  }
  return trimmed
}

export const clampCollectionDescription = (value) => {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  if (!trimmed) return null
  if (trimmed.length > 500) {
    throw new CollectionValidationError('Description must be 500 characters or less')
  }
  return trimmed
}

export const normaliseSelectionMode = (value) => {
  if (value === undefined || value === null) return 'manual'
  const trimmed = String(value).trim().toLowerCase()
  if (!trimmed || trimmed === 'manual') return 'manual'
  throw new CollectionValidationError('Only manual collections are supported at this time')
}

const toUniqueStringList = (input) => {
  const values = Array.isArray(input) ? input : []
  const seen = new Set()
  const result = []
  values.forEach((entry) => {
    if (entry === undefined || entry === null) return
    const value = String(entry).trim()
    if (!value || seen.has(value)) return
    seen.add(value)
    result.push(value)
  })
  return result
}

export const normaliseCollectionEntityIds = (input) => {
  if (input === undefined || input === null) return []
  if (!Array.isArray(input)) {
    throw new CollectionValidationError('entityIds must be an array of entity ids')
  }
  const values = toUniqueStringList(input)
  if (values.length > MAX_COLLECTION_ENTITIES) {
    throw new CollectionValidationError(
      `Collections can contain up to ${MAX_COLLECTION_ENTITIES} entities`,
    )
  }
  return values
}

const booleanFromInput = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase()
    if (!trimmed) return fallback
    return trimmed === 'true' || trimmed === '1'
  }
  return Boolean(value)
}

const mapCollection = (collection) => {
  const plain = collection.get({ plain: true })
  return {
    id: plain.id,
    worldId: plain.world_id,
    ownerId: plain.owner_id,
    name: plain.name,
    description: plain.description,
    shared: Boolean(plain.shared),
    selectionMode: plain.selection_mode,
    entityIds: plain.entity_ids || [],
    entityCount: (plain.entity_ids || []).length,
    criteria: plain.criteria || null,
    createdAt: plain.created_at,
    updatedAt: plain.updated_at,
  }
}

const fetchWorldAccess = async (worldId, user) => {
  const trimmedWorldId = normaliseId(worldId)
  if (!trimmedWorldId) {
    throw new CollectionValidationError('worldId is required', 400)
  }

  const world = await World.findByPk(trimmedWorldId, {
    attributes: ['id', 'name', 'created_by'],
  })
  if (!world) {
    throw new CollectionValidationError('World not found', 404)
  }

  const userId = normaliseId(user?.id)
  const isAdmin = user?.role === 'system_admin'
  const isOwner = Boolean(userId && world.created_by && String(world.created_by) === userId)

  let isDm = false
  if (!isOwner && !isAdmin && userId) {
    const dmCount = await UserCampaignRole.count({
      where: { user_id: userId, role: 'dm' },
      include: [
        {
          model: Campaign,
          as: 'campaign',
          required: true,
          attributes: [],
          where: { world_id: trimmedWorldId },
        },
      ],
    })
    isDm = dmCount > 0
  }

  return {
    world,
    isOwner,
    isAdmin,
    isDm,
    canViewShared: isOwner || isDm || isAdmin,
  }
}

const ensureWorldOwner = (access) => {
  if (access.isOwner) return
  throw new CollectionValidationError('Only the world owner can modify collections', 403)
}

const ensureCollectionExists = async (id) => {
  const trimmed = normaliseId(id)
  if (!trimmed) {
    throw new CollectionValidationError('Collection id is required', 400)
  }
  const collection = await EntityCollection.findByPk(trimmed)
  if (!collection) {
    throw new CollectionValidationError('Collection not found', 404)
  }
  return collection
}

const ensureCollectionNameUnique = async (worldId, name, excludeId = null) => {
  const where = {
    world_id: worldId,
    name: { [Op.iLike]: name },
  }
  if (excludeId) {
    where.id = { [Op.ne]: excludeId }
  }
  const existing = await EntityCollection.findOne({ where })
  if (existing) {
    throw new CollectionValidationError('A collection with this name already exists', 409)
  }
}

const ensureEntitiesBelongToWorld = async (worldId, entityIds) => {
  if (!entityIds.length) return []
  const entities = await Entity.findAll({
    where: { id: { [Op.in]: entityIds }, world_id: worldId },
    attributes: ['id'],
  })
  const found = new Set(entities.map((entity) => String(entity.id)))
  const missing = entityIds.find((id) => !found.has(id))
  if (missing) {
    throw new CollectionValidationError('One or more entities do not belong to this world', 400)
  }
  return entityIds
}

const ensureCollectionReadable = (collection, access) => {
  if (access.isOwner || access.isAdmin) {
    return true
  }
  if (access.isDm && collection.shared) {
    return true
  }
  throw new CollectionValidationError('You do not have access to this collection', 403)
}

export const listCollections = async (req, res) => {
  try {
    const { worldId } = req.query ?? {}
    const access = await fetchWorldAccess(worldId, req.user)

    if (!access.canViewShared) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const where = { world_id: access.world.id }
    if (!access.isOwner && !access.isAdmin) {
      where.shared = true
    }

    const collections = await EntityCollection.findAll({
      where,
      order: [
        ['shared', 'DESC'],
        ['name', 'ASC'],
      ],
    })

    return res.json({
      success: true,
      data: collections.map(mapCollection),
      meta: {
        canManage: access.isOwner,
      },
    })
  } catch (error) {
    if (error instanceof CollectionValidationError) {
      return res.status(error.status).json({ success: false, message: error.message })
    }
    console.error('Failed to list collections', error)
    return res.status(500).json({ success: false, message: 'Failed to load collections' })
  }
}

export const createCollection = async (req, res) => {
  try {
    const { worldId, name, description, entityIds, shared, selectionMode, criteria } = req.body ?? {}
    const access = await fetchWorldAccess(worldId, req.user)
    ensureWorldOwner(access)

    const normalisedName = normaliseCollectionName(name)
    const selection = normaliseSelectionMode(selectionMode)
    const collectionEntityIds = await ensureEntitiesBelongToWorld(
      access.world.id,
      normaliseCollectionEntityIds(entityIds),
    )

    await ensureCollectionNameUnique(access.world.id, normalisedName)

    const collection = await EntityCollection.create({
      world_id: access.world.id,
      owner_id: access.world.created_by,
      name: normalisedName,
      description: clampCollectionDescription(description),
      shared: booleanFromInput(shared, false),
      selection_mode: selection,
      entity_ids: collectionEntityIds,
      criteria: selection === 'manual' ? null : criteria ?? null,
    })

    return res.status(201).json({ success: true, data: mapCollection(collection) })
  } catch (error) {
    if (error instanceof CollectionValidationError) {
      return res.status(error.status).json({ success: false, message: error.message })
    }
    console.error('Failed to create collection', error)
    return res.status(500).json({ success: false, message: 'Failed to create collection' })
  }
}

export const updateCollection = async (req, res) => {
  try {
    const collection = await ensureCollectionExists(req.params.id)
    const access = await fetchWorldAccess(collection.world_id, req.user)
    ensureWorldOwner(access)

    const updates = {}
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'name')) {
      const nextName = normaliseCollectionName(req.body.name)
      await ensureCollectionNameUnique(collection.world_id, nextName, collection.id)
      updates.name = nextName
    }
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'description')) {
      updates.description = clampCollectionDescription(req.body.description)
    }
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'shared')) {
      updates.shared = booleanFromInput(req.body.shared)
    }
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'selectionMode')) {
      const nextMode = normaliseSelectionMode(req.body.selectionMode)
      updates.selection_mode = nextMode
      if (nextMode !== 'manual') {
        updates.criteria = req.body.criteria ?? null
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'entityIds')) {
      const ids = normaliseCollectionEntityIds(req.body.entityIds)
      updates.entity_ids = await ensureEntitiesBelongToWorld(collection.world_id, ids)
    }

    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, 'criteria') && !updates.selection_mode) {
      updates.criteria = req.body.criteria ?? collection.criteria ?? null
    }

    if (Object.keys(updates).length === 0) {
      return res.json({ success: true, data: mapCollection(collection) })
    }

    await collection.update(updates)
    return res.json({ success: true, data: mapCollection(collection) })
  } catch (error) {
    if (error instanceof CollectionValidationError) {
      return res.status(error.status).json({ success: false, message: error.message })
    }
    console.error('Failed to update collection', error)
    return res.status(500).json({ success: false, message: 'Failed to update collection' })
  }
}

export const deleteCollection = async (req, res) => {
  try {
    const collection = await ensureCollectionExists(req.params.id)
    const access = await fetchWorldAccess(collection.world_id, req.user)
    ensureWorldOwner(access)

    await collection.destroy()
    return res.json({ success: true })
  } catch (error) {
    if (error instanceof CollectionValidationError) {
      return res.status(error.status).json({ success: false, message: error.message })
    }
    console.error('Failed to delete collection', error)
    return res.status(500).json({ success: false, message: 'Failed to delete collection' })
  }
}

export const getCollectionEntities = async (req, res) => {
  try {
    const collection = await ensureCollectionExists(req.params.id)
    const access = await fetchWorldAccess(collection.world_id, req.user)
    ensureCollectionReadable(collection, access)

    let resolvedIds = collection.entity_ids || []
    const totalCount = resolvedIds.length

    if (resolvedIds.length > MAX_COLLECTION_ENTITIES) {
      resolvedIds = resolvedIds.slice(0, MAX_COLLECTION_ENTITIES)
    }

    return res.json({
      success: true,
      data: {
        collectionId: collection.id,
        entityIds: resolvedIds,
        entityCount: resolvedIds.length,
        totalCount,
        truncated: totalCount > MAX_COLLECTION_ENTITIES,
        limit: MAX_COLLECTION_ENTITIES,
      },
    })
  } catch (error) {
    if (error instanceof CollectionValidationError) {
      return res.status(error.status).json({ success: false, message: error.message })
    }
    console.error('Failed to resolve collection entities', error)
    return res.status(500).json({ success: false, message: 'Failed to resolve collection entities' })
  }
}

export default {
  listCollections,
  createCollection,
  updateCollection,
  deleteCollection,
  getCollectionEntities,
}
