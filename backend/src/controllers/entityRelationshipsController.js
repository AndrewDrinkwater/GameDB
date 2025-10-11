import { Op } from 'sequelize'
import {
  Entity,
  EntityRelationship,
  EntityRelationshipType,
  EntityRelationshipTypeEntityType,
} from '../models/index.js'
import { ensureBidirectionalLink } from '../utils/relationshipHelpers.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'

const normaliseId = (value) => {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object') {
    if ('id' in value && value.id !== undefined && value.id !== null) {
      return normaliseId(value.id)
    }
    return ''
  }
  return String(value)
}

const mapEntitySummary = (entityInstance) => {
  if (!entityInstance) return null

  const plain = entityInstance.get({ plain: true })

  return {
    id: plain.id,
    name: plain.name,
    world_id: plain.world_id,
    entity_type_id: plain.entity_type_id,
    entityType: plain.entityType
      ? { id: plain.entityType.id, name: plain.entityType.name }
      : null,
  }
}

const mapRelationshipType = (typeInstance) => {
  const plain = typeInstance.get({ plain: true })
  const rules = Array.isArray(plain.entityTypeRules) ? plain.entityTypeRules : []
  const fromTypes = []
  const toTypes = []

  rules.forEach((rule) => {
    if (!rule) return
    const entry = rule.entityType
      ? { id: rule.entityType.id, name: rule.entityType.name }
      : { id: rule.entity_type_id }
    if (rule.role === 'to') {
      toTypes.push(entry)
    } else {
      fromTypes.push(entry)
    }
  })

  return {
    id: plain.id,
    name: plain.name,
    from_name: plain.from_name,
    to_name: plain.to_name,
    description: plain.description,
    world_id: plain.world_id,
    from_entity_types: fromTypes,
    to_entity_types: toTypes,
  }
}

const buildRuleSets = (typeInstance) => {
  const mapped = mapRelationshipType(typeInstance)
  return {
    allowedFrom: new Set(
      mapped.from_entity_types
        .map((entry) => normaliseId(entry.id))
        .filter((id) => id !== ''),
    ),
    allowedTo: new Set(
      mapped.to_entity_types
        .map((entry) => normaliseId(entry.id))
        .filter((id) => id !== ''),
    ),
  }
}

const hasPrivilegedRelationshipRole = (user) =>
  user?.role === 'system_admin' || user?.role === 'dm'

const mapRelationship = (relationshipInstance) => {
  if (!relationshipInstance) return null

  const plain = relationshipInstance.get({ plain: true })

  return {
    id: plain.id,
    from_entity_id: plain.from_entity,
    to_entity_id: plain.to_entity,
    relationship_type_id: plain.relationship_type_id,
    bidirectional: plain.bidirectional,
    context: plain.context,
    created_at: plain.created_at,
    updated_at: plain.updated_at,
    relationshipType: plain.relationshipType
      ? mapRelationshipType(relationshipInstance.relationshipType)
      : null,
    from_entity: relationshipInstance.from ? mapEntitySummary(relationshipInstance.from) : null,
    to_entity: relationshipInstance.to ? mapEntitySummary(relationshipInstance.to) : null,
  }
}

export async function getRelationshipTypes(req, res) {
  try {
    const { worldId } = req.query ?? {}
    const where = {}

    const trimmedWorldId = typeof worldId === 'string' ? worldId.trim() : ''

    if (trimmedWorldId) {
      if (!hasPrivilegedRelationshipRole(req.user)) {
        const access = await checkWorldAccess(trimmedWorldId, req.user)
        if (!access.isOwner && !access.isAdmin) {
          return res.status(403).json({ error: 'Forbidden' })
        }
      }

      where[Op.or] = [{ world_id: null }, { world_id: trimmedWorldId }]
    } else if (!hasPrivilegedRelationshipRole(req.user)) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const types = await EntityRelationshipType.findAll({
      where,
      order: [['name', 'ASC']],
      include: [
        {
          model: EntityRelationshipTypeEntityType,
          as: 'entityTypeRules',
          include: [{ association: 'entityType', attributes: ['id', 'name'] }],
        },
      ],
    })

    res.json({ success: true, data: types.map(mapRelationshipType) })
  } catch (err) {
    console.error('Failed to load relationship types', err)
    res.status(500).json({ error: 'Failed to load relationship types' })
  }
}

export async function listRelationships(req, res) {
  try {
    const { worldId } = req.query ?? {}
    const trimmedWorldId = typeof worldId === 'string' ? worldId.trim() : ''

    if (!trimmedWorldId) {
      return res.status(400).json({ error: 'worldId query parameter is required' })
    }

    if (!hasPrivilegedRelationshipRole(req.user)) {
      const access = await checkWorldAccess(trimmedWorldId, req.user)
      if (!access.isOwner && !access.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    const relationships = await EntityRelationship.findAll({
      where: {
        [Op.or]: [{ '$from.world_id$': trimmedWorldId }, { '$to.world_id$': trimmedWorldId }],
      },
      include: [
        {
          model: EntityRelationshipType,
          as: 'relationshipType',
          include: [
            {
              model: EntityRelationshipTypeEntityType,
              as: 'entityTypeRules',
              include: [{ association: 'entityType', attributes: ['id', 'name'] }],
            },
          ],
        },
        {
          model: Entity,
          as: 'from',
          include: [{ association: 'entityType', attributes: ['id', 'name'] }],
        },
        {
          model: Entity,
          as: 'to',
          include: [{ association: 'entityType', attributes: ['id', 'name'] }],
        },
      ],
      order: [['created_at', 'DESC']],
    })

    const filtered = relationships.filter((relationship) => {
      const fromWorld = relationship.from?.world_id
      const toWorld = relationship.to?.world_id

      if (fromWorld && toWorld) {
        return fromWorld === trimmedWorldId && toWorld === trimmedWorldId
      }

      return fromWorld === trimmedWorldId || toWorld === trimmedWorldId
    })

    res.json({ success: true, data: filtered.map(mapRelationship) })
  } catch (err) {
    console.error('Failed to load relationships', err)
    res.status(500).json({ error: 'Failed to load relationships' })
  }
}

export async function createRelationship(req, res) {
  try {
    const {
      from_entity,
      from_entity_id,
      fromEntity,
      fromEntityId,
      to_entity,
      to_entity_id,
      toEntity,
      toEntityId,
      relationship_type_id,
      relationship_type,
      relationshipType,
      relationshipTypeId,
      bidirectional,
      context,
    } = req.body

    const fromEntityIdValue = normaliseId(
      from_entity ?? from_entity_id ?? fromEntity ?? fromEntityId,
    )
    const toEntityIdValue = normaliseId(to_entity ?? to_entity_id ?? toEntity ?? toEntityId)
    const relationshipTypeIdValue = normaliseId(
      relationship_type_id ?? relationship_type ?? relationshipType ?? relationshipTypeId,
    )

    if (!fromEntityIdValue || !toEntityIdValue || !relationshipTypeIdValue) {
      return res.status(400).json({ error: 'from_entity, to_entity and relationship_type_id are required' })
    }

    if (fromEntityIdValue === toEntityIdValue) {
      return res.status(400).json({ error: 'An entity cannot relate to itself.' })
    }

    const relationshipType = await EntityRelationshipType.findByPk(relationshipTypeIdValue, {
      include: [
        {
          model: EntityRelationshipTypeEntityType,
          as: 'entityTypeRules',
          attributes: ['entity_type_id', 'role'],
        },
      ],
    })
    if (!relationshipType) {
      return res.status(404).json({ error: 'Relationship type not found' })
    }

    const [from, to] = await Promise.all([
      Entity.findByPk(fromEntityIdValue),
      Entity.findByPk(toEntityIdValue),
    ])

    if (!from || !to) {
      return res.status(404).json({ error: 'One or both entities not found' })
    }

    const fromWorldId = normaliseId(from.world_id)
    const toWorldId = normaliseId(to.world_id)

    if (fromWorldId && toWorldId && fromWorldId !== toWorldId) {
      return res.status(400).json({ error: 'Entities must belong to the same world' })
    }

    if (!hasPrivilegedRelationshipRole(req.user)) {
      const access = await checkWorldAccess(fromWorldId, req.user)
      if (!access.isOwner && !access.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    const relationshipTypeWorldId = normaliseId(relationshipType.world_id)
    if (relationshipTypeWorldId && relationshipTypeWorldId !== fromWorldId) {
      return res.status(400).json({
        error: 'Relationship type cannot be used outside of its world context',
      })
    }

    const { allowedFrom, allowedTo } = buildRuleSets(relationshipType)

    const fromTypeId = normaliseId(from.entity_type_id)
    if (allowedFrom.size && !allowedFrom.has(fromTypeId)) {
      return res
        .status(400)
        .json({ error: 'Selected source entity type is not permitted for this relationship type' })
    }

    const toTypeId = normaliseId(to.entity_type_id)
    if (allowedTo.size && !allowedTo.has(toTypeId)) {
      return res
        .status(400)
        .json({ error: 'Selected target entity type is not permitted for this relationship type' })
    }

    const normalisedContext =
      context && typeof context === 'object' && !Array.isArray(context)
        ? { ...context }
        : {}

    normalisedContext.__direction = 'forward'

    const relationship = await EntityRelationship.create({
      from_entity: fromEntityIdValue,
      to_entity: toEntityIdValue,
      relationship_type_id: relationshipTypeIdValue,
      bidirectional,
      context: normalisedContext,
    })

    await ensureBidirectionalLink(relationship)

    res.status(201).json({ success: true, data: relationship })
  } catch (err) {
    console.error('Failed to create relationship', err)
    res.status(500).json({ error: 'Failed to create relationship' })
  }
}

export async function getRelationshipsByEntity(req, res) {
  try {
    const entityId = req.params.id
    const entity = await Entity.findByPk(entityId, { attributes: ['id', 'world_id'] })

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' })
    }

    if (!hasPrivilegedRelationshipRole(req.user)) {
      const access = await checkWorldAccess(entity.world_id, req.user)
      if (!access.isOwner && !access.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    const relationships = await EntityRelationship.findAll({
      where: {
        [Op.or]: [{ from_entity: entityId }, { to_entity: entityId }],
      },
      include: [
        { model: EntityRelationshipType, as: 'relationshipType' },
        { model: Entity, as: 'from' },
        { model: Entity, as: 'to' },
      ],
    })

    res.json(relationships)
  } catch (err) {
    console.error('Failed to load relationships', err)
    res.status(500).json({ error: 'Failed to load relationships' })
  }
}

export async function deleteRelationship(req, res) {
  try {
    const relationship = await EntityRelationship.findByPk(req.params.id, {
      include: [
        { model: Entity, as: 'from', attributes: ['id', 'world_id'] },
        { model: Entity, as: 'to', attributes: ['id', 'world_id'] },
      ],
    })

    if (!relationship) {
      return res.status(404).json({ error: 'Not found' })
    }

    if (!hasPrivilegedRelationshipRole(req.user)) {
      const relationshipWorldId = relationship.from?.world_id ?? relationship.to?.world_id

      if (!relationshipWorldId) {
        return res.status(400).json({ error: 'Unable to determine relationship world' })
      }

      const access = await checkWorldAccess(relationshipWorldId, req.user)
      if (!access.isOwner && !access.isAdmin) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    }

    await relationship.destroy()

    if (relationship.bidirectional) {
      await EntityRelationship.destroy({
        where: {
          from_entity: relationship.to_entity,
          to_entity: relationship.from_entity,
          relationship_type_id: relationship.relationship_type_id,
        },
      })
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Failed to delete relationship', err)
    res.status(500).json({ error: 'Failed to delete relationship' })
  }
}
