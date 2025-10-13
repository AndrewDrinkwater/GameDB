import { Op } from 'sequelize'
import {
  Entity,
  EntitySecret,
  EntitySecretPermission,
  EntityType,
  EntityTypeField,
  World,
} from '../models/index.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'
import {
  applyFieldDefaults,
  coerceValueForField,
  validateEntityMetadata,
} from '../utils/entityMetadataValidator.js'

const VISIBILITY_VALUES = new Set(['hidden', 'visible', 'partial'])
const PUBLIC_VISIBILITY = ['visible', 'partial']

const isEntityCreator = (entity, user) => entity?.created_by === user?.id

const FIELD_ORDER = [
  ['sort_order', 'ASC'],
  ['name', 'ASC'],
]

const fetchEntityTypeFields = async (entityTypeId) => {
  const records = await EntityTypeField.findAll({
    where: { entity_type_id: entityTypeId },
    order: FIELD_ORDER,
  })
  return records.map((record) => record.get({ plain: true }))
}

const prepareEntityMetadata = async (entityTypeId, metadataSource, fieldsCache) => {
  const fields = fieldsCache ?? (await fetchEntityTypeFields(entityTypeId))
  const source = metadataSource ?? {}
  const metadataWithDefaults = applyFieldDefaults(fields, source)
  const metadataForValidation = { ...source, ...metadataWithDefaults }
  await validateEntityMetadata(entityTypeId, metadataForValidation, { EntityTypeField }, fields)
  return { metadata: metadataWithDefaults, fields }
}

const buildEntityPayload = async (entityInstance, fieldsCache) => {
  const plain = entityInstance.get({ plain: true })

  if (plain.creator) {
    const creator = plain.creator
    plain.creator = {
      id: creator.id,
      username: creator.username,
      email: creator.email,
    }
  }
  const { metadata, fields } = await prepareEntityMetadata(
    plain.entity_type_id,
    plain.metadata,
    fieldsCache
  )

  plain.metadata = metadata
  plain.fields = fields.map((field) => ({
    id: field.id,
    name: field.name,
    label: field.label || field.name,
    dataType: field.data_type,
    required: field.required,
    options: field.options || {},
    defaultValue:
      field.default_value !== undefined && field.default_value !== null
        ? coerceValueForField(field.default_value, field, { isDefault: true })
        : null,
    sortOrder: field.sort_order,
    value:
      metadata[field.name] !== undefined ? metadata[field.name] : null,
  }))

  return plain
}

const normaliseMetadata = (metadata) => {
  if (metadata === undefined) return undefined
  if (metadata === null) return null
  if (typeof metadata !== 'object' || Array.isArray(metadata)) return null
  return metadata
}

const createEntityResponse = async ({ world, user, body }) => {
  const {
    name,
    description,
    entity_type_id: entityTypeId,
    visibility,
    metadata,
  } = body ?? {}

  if (!name || !entityTypeId) {
    return {
      status: 400,
      body: { success: false, message: 'name and entity_type_id are required' },
    }
  }

  const entityType = await EntityType.findByPk(entityTypeId)
  if (!entityType) {
    return { status: 404, body: { success: false, message: 'Entity type not found' } }
  }

  const resolvedVisibility = visibility ?? 'hidden'
  if (!VISIBILITY_VALUES.has(resolvedVisibility)) {
    return { status: 400, body: { success: false, message: 'Invalid visibility value' } }
  }

  let metadataInput = {}
  if (metadata !== undefined) {
    const normalised = normaliseMetadata(metadata)
    if (normalised === null) {
      return {
        status: 400,
        body: { success: false, message: 'metadata must be an object' },
      }
    }
    metadataInput = normalised ?? {}
  }

  const { metadata: metadataToPersist, fields } = await prepareEntityMetadata(
    entityTypeId,
    metadataInput,
  )

  const entity = await Entity.create({
    name,
    description,
    world_id: world.id,
    entity_type_id: entityTypeId,
    visibility: resolvedVisibility,
    metadata: metadataToPersist,
    created_by: user.id,
  })

  const fullEntity = await Entity.findByPk(entity.id, {
    include: [
      { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
      { model: World, as: 'world', attributes: ['id', 'name', 'created_by'] },
      { association: 'creator', attributes: ['id', 'username', 'email'] },
    ],
  })

  const payload = await buildEntityPayload(fullEntity, fields)

  return { status: 201, body: { success: true, data: payload } }
}

export const listWorldEntities = async (req, res) => {
  try {
    const { user, world } = req
    const access = req.worldAccess ?? (await checkWorldAccess(world.id, user))

    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const where = { world_id: world.id }

    if (!access.isOwner && !access.isAdmin) {
      where[Op.or] = [
        { visibility: { [Op.in]: PUBLIC_VISIBILITY } },
        { created_by: user.id },
      ]
    }

    const entities = await Entity.findAll({
      where,
      include: [
        { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
        { model: World, as: 'world', attributes: ['id', 'name'] },
      ],
      order: [['created_at', 'DESC']],
    })

    res.json({ success: true, data: entities })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const normaliseIdList = (value) => {
  if (!value) return []
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (entry === undefined || entry === null) return ''
        return String(entry).trim()
      })
      .filter(Boolean)
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  return []
}

const clampNumber = (value, { min = 0, max = Number.MAX_SAFE_INTEGER, fallback = 0 } = {}) => {
  if (value === undefined || value === null || value === '') return fallback
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return fallback
  if (parsed < min) return min
  if (parsed > max) return max
  return parsed
}

export const searchEntities = async (req, res) => {
  try {
    const { user } = req
    const { worldId, q = '', limit: rawLimit, offset: rawOffset, typeIds } = req.query

    if (!worldId) {
      return res.status(400).json({ success: false, message: 'worldId is required' })
    }

    const world = await World.findByPk(worldId)
    if (!world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    const access = req.worldAccess ?? (await checkWorldAccess(world.id, user))
    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const limit = clampNumber(rawLimit, { min: 1, max: 100, fallback: 20 })
    const offset = clampNumber(rawOffset, { min: 0, fallback: 0 })
    const trimmedQuery = typeof q === 'string' ? q.trim() : ''
    const where = { world_id: world.id }

    if (!access.isOwner && !access.isAdmin) {
      where[Op.or] = [
        { visibility: { [Op.in]: PUBLIC_VISIBILITY } },
        { created_by: user.id },
      ]
    }

    if (trimmedQuery) {
      const pattern = `%${trimmedQuery}%`
      const dialect = Entity.sequelize?.getDialect?.() || ''
      if (dialect === 'postgres') {
        where.name = { [Op.iLike]: pattern }
      } else {
        where.name = { [Op.like]: pattern }
      }
    }

    const resolvedTypeIds = normaliseIdList(typeIds)
    if (resolvedTypeIds.length) {
      where.entity_type_id = { [Op.in]: resolvedTypeIds }
    }

    const { rows, count } = await Entity.findAndCountAll({
      where,
      include: [
        { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
      ],
      order: [['name', 'ASC']],
      distinct: true,
      limit,
      offset,
    })

    const payload = rows.map((entity) => {
      const plain = entity.get({ plain: true })
      const type = plain.entityType || {}
      return {
        id: plain.id,
        name: plain.name,
        typeId: type.id ?? plain.entity_type_id ?? null,
        typeName: type.name ?? plain.entity_type_name ?? null,
      }
    })

    const hasMore = offset + rows.length < count

    return res.json({
      success: true,
      data: payload,
      pagination: { total: count, limit, offset, hasMore },
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const createWorldEntity = async (req, res) => {
  try {
    const { world, user } = req
    const access = req.worldAccess ?? (await checkWorldAccess(world.id, user))

    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const result = await createEntityResponse({ world, user, body: req.body })

    return res.status(result.status).json(result.body)
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createEntity = async (req, res) => {
  try {
    const { user } = req
    const { world_id: worldId } = req.body ?? {}

    if (!worldId) {
      return res.status(400).json({ success: false, message: 'world_id is required' })
    }

    const world = await World.findByPk(worldId)
    if (!world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    const access = await checkWorldAccess(worldId, user)

    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const result = await createEntityResponse({ world, user, body: req.body })

    return res.status(result.status).json(result.body)
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateEntity = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, visibility, metadata } = req.body
    const { user } = req

    const entity = await Entity.findByPk(id, {
      include: [
        { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
        { model: World, as: 'world', attributes: ['id', 'name', 'created_by'] },
      ],
    })

    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, user)
    const isCreator = isEntityCreator(entity, user)

    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!access.isOwner && !access.isAdmin && !isCreator) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const updates = {}

    if (name !== undefined) {
      if (!name) {
        return res.status(400).json({ success: false, message: 'name cannot be empty' })
      }
      updates.name = name
    }

    if (description !== undefined) {
      updates.description = description
    }

    if (visibility !== undefined) {
      if (!VISIBILITY_VALUES.has(visibility)) {
        return res.status(400).json({ success: false, message: 'Invalid visibility value' })
      }
      updates.visibility = visibility
    }

    const existingMetadata = entity.metadata ?? {}
    let metadataSource = { ...existingMetadata }

    if (metadata !== undefined) {
      const normalised = normaliseMetadata(metadata)
      if (normalised === null) {
        return res.status(400).json({ success: false, message: 'metadata must be an object' })
      }
      metadataSource = { ...metadataSource, ...normalised }
    }

    const { metadata: metadataToPersist, fields } = await prepareEntityMetadata(
      entity.entity_type_id,
      metadataSource
    )

    updates.metadata = metadataToPersist

    await entity.update(updates)
    await entity.reload({
      include: [
        { model: EntityType, as: 'entityType', attributes: ['id', 'name'] },
        { model: World, as: 'world', attributes: ['id', 'name', 'created_by'] },
        { association: 'creator', attributes: ['id', 'username', 'email'] },
      ],
    })

    const payload = await buildEntityPayload(entity, fields)

    res.json({ success: true, data: payload })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteEntity = async (req, res) => {
  try {
    const { id } = req.params
    const { user } = req

    const entity = await Entity.findByPk(id)

    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, user)
    const isCreator = isEntityCreator(entity, user)

    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!access.isOwner && !access.isAdmin && !isCreator) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    await entity.destroy()

    return res.json({ success: true, message: 'Entity deleted' })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
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
        { association: 'creator', attributes: ['id', 'username', 'email'] },
      ],
    })

    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, user)
    const isCreator = isEntityCreator(entity, user)

    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!access.hasAccess && !isCreator && !access.isAdmin && !access.isOwner) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const canSeeHidden = access.isOwner || access.isAdmin || isCreator
    if (!canSeeHidden && entity.visibility === 'hidden') {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    let secrets = []

    if (access.isOwner || access.isAdmin) {
      secrets = await EntitySecret.findAll({
        where: { entity_id: entity.id },
        order: [['created_at', 'ASC']],
        include: [
          {
            model: EntitySecretPermission,
            as: 'permissions',
            attributes: ['id', 'user_id', 'can_view'],
            required: false,
          },
        ],
      })
    } else {
      secrets = await EntitySecret.findAll({
        where: {
          entity_id: entity.id,
          [Op.or]: [
            { created_by: user.id },
            { '$permissions.user_id$': user.id, '$permissions.can_view$': true },
          ],
        },
        include: [
          {
            model: EntitySecretPermission,
            as: 'permissions',
            attributes: ['id', 'user_id', 'can_view'],
            required: false,
          },
        ],
        order: [['created_at', 'ASC']],
      })
    }

    const payload = await buildEntityPayload(entity)
    payload.secrets = secrets.map((secret) => {
      const plain = secret.get({ plain: true })
      if (!access.isOwner && !access.isAdmin) {
        delete plain.permissions
      }
      return plain
    })

    const canEdit = access.isOwner || access.isAdmin || isCreator
    payload.permissions = {
      canEdit,
      canDelete: canEdit,
      canManageSecrets: access.isOwner || access.isAdmin,
    }
    payload.access = {
      isOwner: access.isOwner,
      isAdmin: access.isAdmin,
      isCreator,
      hasAccess: access.hasAccess,
    }

    res.json({ success: true, data: payload })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getEntitySecrets = async (req, res) => {
  try {
    const { user } = req
    const { id } = req.params

    const entity = await Entity.findByPk(id)
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, user)
    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const secrets = await EntitySecret.findAll({
      where: { entity_id: entity.id },
      include: [
        {
          model: EntitySecretPermission,
          as: 'permissions',
          attributes: ['id', 'user_id', 'can_view'],
          required: false,
        },
      ],
      order: [['created_at', 'ASC']],
    })

    res.json({ success: true, data: secrets })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createEntitySecret = async (req, res) => {
  try {
    const { user } = req
    const { id } = req.params
    const { title, content } = req.body

    if (!content) {
      return res.status(400).json({ success: false, message: 'content is required' })
    }

    const entity = await Entity.findByPk(id)
    if (!entity) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const access = await checkWorldAccess(entity.world_id, user)
    if (!access.world) {
      return res.status(404).json({ success: false, message: 'World not found' })
    }

    if (!access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const secret = await EntitySecret.create({
      entity_id: entity.id,
      created_by: user.id,
      title,
      content,
    })

    const payload = await EntitySecret.findByPk(secret.id, {
      include: [
        {
          model: EntitySecretPermission,
          as: 'permissions',
          attributes: ['id', 'user_id', 'can_view'],
          required: false,
        },
      ],
    })

    res.status(201).json({ success: true, data: payload })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
