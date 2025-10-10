import { Op } from 'sequelize'
import {
  Entity,
  EntitySecret,
  EntitySecretPermission,
  EntityType,
  World,
} from '../models/index.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'

const VISIBILITY_VALUES = new Set(['hidden', 'visible', 'partial'])
const PUBLIC_VISIBILITY = ['visible', 'partial']

const isEntityCreator = (entity, user) => entity?.created_by === user?.id

const normaliseMetadata = (metadata) => {
  if (metadata === undefined) return undefined
  if (metadata === null) return null
  if (typeof metadata !== 'object' || Array.isArray(metadata)) return null
  return metadata
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

export const createWorldEntity = async (req, res) => {
  try {
    const { world, user } = req
    const access = req.worldAccess ?? (await checkWorldAccess(world.id, user))

    if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const { name, description, entity_type_id: entityTypeId, visibility, metadata } = req.body

    if (!name || !entityTypeId) {
      return res
        .status(400)
        .json({ success: false, message: 'name and entity_type_id are required' })
    }

    const resolvedVisibility = visibility ?? 'hidden'
    if (!VISIBILITY_VALUES.has(resolvedVisibility)) {
      return res.status(400).json({ success: false, message: 'Invalid visibility value' })
    }

    let metadataToPersist = metadata ?? {}
    if (metadata !== undefined) {
      const normalised = normaliseMetadata(metadata)
      if (normalised === null) {
        return res.status(400).json({ success: false, message: 'metadata must be an object' })
      }
      metadataToPersist = normalised ?? {}
    }

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
        { model: World, as: 'world', attributes: ['id', 'name'] },
      ],
    })

    res.status(201).json({ success: true, data: fullEntity })
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

    const payload = entity.get({ plain: true })
    payload.secrets = secrets.map((secret) => {
      const plain = secret.get({ plain: true })
      if (!access.isOwner && !access.isAdmin) {
        delete plain.permissions
      }
      return plain
    })

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
