import { Op } from 'sequelize'
import {
  Entity,
  EntityRelationship,
  EntityRelationshipType,
  EntityRelationshipTypeEntityType,
  World,
} from '../models/index.js'
import { ensureBidirectionalLink } from '../utils/relationshipHelpers.js'
import { applyRelBuilderHeader } from '../utils/featureFlags.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'
import { buildEntityReadContext, canUserReadEntity } from '../utils/entityAccess.js'

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
    image_data: plain.image_data ?? null,
    image_mime_type: plain.image_mime_type ?? null,
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
    applyRelBuilderHeader(res)
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
    applyRelBuilderHeader(res)
    const { worldId } = req.query ?? {}
    const trimmedWorldId = typeof worldId === 'string' ? worldId.trim() : ''

    if (!trimmedWorldId) {
      return res.status(400).json({ error: 'worldId query parameter is required' })
    }

    const access = await checkWorldAccess(trimmedWorldId, req.user)

    if (!access.world) {
      return res.status(404).json({ error: 'World not found' })
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

    const readContext = await buildEntityReadContext({
      worldId: trimmedWorldId,
      user: req.user,
      worldAccess: access,
      campaignContextId: req.campaignContextId,
    })

    const privileged = hasPrivilegedRelationshipRole(req.user)
    const effectiveContext = privileged ? { ...readContext, isAdmin: true } : readContext

    const filtered = relationships.filter((relationship) => {
      const fromWorld = relationship.from?.world_id
      const toWorld = relationship.to?.world_id

      if (fromWorld && toWorld) {
        if (fromWorld !== trimmedWorldId || toWorld !== trimmedWorldId) {
          return false
        }
      }

      const withinWorld = fromWorld === trimmedWorldId || toWorld === trimmedWorldId
      if (!withinWorld) {
        return false
      }

      const fromReadable = relationship.from
        ? canUserReadEntity(relationship.from, effectiveContext)
        : false
      const toReadable = relationship.to
        ? canUserReadEntity(relationship.to, effectiveContext)
        : false

      return fromReadable && toReadable
    })

    res.json({ success: true, data: filtered.map(mapRelationship) })
  } catch (err) {
    console.error('Failed to load relationships', err)
    res.status(500).json({ error: 'Failed to load relationships' })
  }
}

export async function createRelationship(req, res) {
  try {
    applyRelBuilderHeader(res)
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
      relationshipType: relationshipTypeBody,
      relationshipTypeId,
      bidirectional,
      context,
    } = req.body

    const fromEntityIdValue = normaliseId(
      from_entity ?? from_entity_id ?? fromEntity ?? fromEntityId,
    )
    const toEntityIdValue = normaliseId(to_entity ?? to_entity_id ?? toEntity ?? toEntityId)
    const relationshipTypeIdValue = normaliseId(
      relationship_type_id ?? relationship_type ?? relationshipTypeBody ?? relationshipTypeId,
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
        // Check if the world allows players to create entities
        const world = await World.findByPk(fromWorldId, {
          attributes: ['id', 'entity_creation_scope'],
        })

        const entityCreationScope = world?.entity_creation_scope
        if (entityCreationScope !== 'all_players') {
          return res.status(403).json({ error: 'Forbidden' })
        }

        // If world allows player entity creation, check if user can see both entities
        const readContext = await buildEntityReadContext({
          worldId: fromWorldId,
          user: req.user,
          worldAccess: access,
          campaignContextId: req.campaignContextId,
        })

        const canSeeFrom = canUserReadEntity(from, readContext)
        const canSeeTo = canUserReadEntity(to, readContext)

        if (!canSeeFrom || !canSeeTo) {
          return res.status(403).json({ error: 'Forbidden' })
        }
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
    const toTypeId = normaliseId(to.entity_type_id)

    const fromAllowedAsSource = !allowedFrom.size || allowedFrom.has(fromTypeId)
    const fromAllowedAsTarget = !allowedTo.size || allowedTo.has(fromTypeId)
    const toAllowedAsSource = !allowedFrom.size || allowedFrom.has(toTypeId)
    const toAllowedAsTarget = !allowedTo.size || allowedTo.has(toTypeId)

    let direction = 'forward'
    let sourceEntity = from
    let targetEntity = to
    let sourceEntityId = fromEntityIdValue
    let targetEntityId = toEntityIdValue

    if (!fromAllowedAsSource && fromAllowedAsTarget && toAllowedAsSource) {
      direction = 'reverse'
      sourceEntity = to
      targetEntity = from
      sourceEntityId = toEntityIdValue
      targetEntityId = fromEntityIdValue
    }

    const resolvedSourceTypeId = normaliseId(sourceEntity.entity_type_id)
    if (allowedFrom.size && !allowedFrom.has(resolvedSourceTypeId)) {
      return res.status(400).json({
        error: 'Selected source entity type is not permitted for this relationship type',
      })
    }

    const resolvedTargetTypeId = normaliseId(targetEntity.entity_type_id)
    if (allowedTo.size && !allowedTo.has(resolvedTargetTypeId)) {
      return res.status(400).json({
        error: 'Selected target entity type is not permitted for this relationship type',
      })
    }

    const normalisedContext =
      context && typeof context === 'object' && !Array.isArray(context)
        ? { ...context }
        : {}

    normalisedContext.__direction = direction

    const existingRelationship = await EntityRelationship.findOne({
      where: {
        from_entity: sourceEntityId,
        to_entity: targetEntityId,
        relationship_type_id: relationshipTypeIdValue,
      },
    })

    if (existingRelationship) {
      return res.status(409).json({
        error: 'A relationship between these entities already exists for the selected type.',
      })
    }

    const existingInverse = await EntityRelationship.findOne({
      where: {
        from_entity: targetEntityId,
        to_entity: sourceEntityId,
        relationship_type_id: relationshipTypeIdValue,
      },
    })

    if (existingInverse) {
      return res.status(409).json({
        error: 'An inverse relationship for these entities already exists for this type.',
      })
    }

    const relationship = await EntityRelationship.create({
      from_entity: sourceEntityId,
      to_entity: targetEntityId,
      relationship_type_id: relationshipTypeIdValue,
      bidirectional: typeof bidirectional === 'boolean' ? bidirectional : false,
      context: normalisedContext ?? {},
    })

    await ensureBidirectionalLink(relationship)

    await relationship.reload({
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
        { model: Entity, as: 'from', include: [{ association: 'entityType', attributes: ['id', 'name'] }] },
        { model: Entity, as: 'to', include: [{ association: 'entityType', attributes: ['id', 'name'] }] },
      ],
    })

    res.status(201).json({ success: true, data: mapRelationship(relationship) })
  } catch (err) {
    console.error('Failed to create relationship', err)
    res.status(500).json({ error: 'Failed to create relationship' })
  }
}

/**
 * Returns all relationships for a given entity, including:
 * - Relationship type details (with allowed entity type rules)
 * - Source ("from") and target ("to") entities, each with their entityType included
 *
 * Including entityType for both sides ensures the frontend can
 * display and filter by the related entity's type name correctly
 * (fixes "Unknown entity type" in the Relationships tab).
 */
export async function getRelationshipsByEntity(req, res) {
  try {
    applyRelBuilderHeader(res)
    const entityId = req.params.id
    const entity = await Entity.findByPk(entityId, { attributes: ['id', 'world_id'] })

    if (!entity) {
      return res.status(404).json({ error: 'Entity not found' })
    }

    const entityWorldId = normaliseId(entity.world_id)
    const worldAccess = await checkWorldAccess(entityWorldId, req.user)
    const privileged = hasPrivilegedRelationshipRole(req.user)

    if (!privileged && !worldAccess.hasAccess && !worldAccess.isOwner && !worldAccess.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const relationships = await EntityRelationship.findAll({
      where: {
        [Op.or]: [{ from_entity: entityId }, { to_entity: entityId }],
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
    })

    const readContext = await buildEntityReadContext({
      worldId: entityWorldId,
      user: req.user,
      worldAccess,
      campaignContextId: req.campaignContextId,
    })
    const effectiveContext = privileged ? { ...readContext, isAdmin: true } : readContext
    const entityIdString = normaliseId(entityId)

    const filtered = relationships.filter((relationship) => {
      const fromWorldId = normaliseId(relationship.from?.world_id)
      const toWorldId = normaliseId(relationship.to?.world_id)

      if (fromWorldId && fromWorldId !== entityWorldId) {
        return false
      }

      if (toWorldId && toWorldId !== entityWorldId) {
        return false
      }

      const fromId = normaliseId(
        relationship.from_entity ?? relationship.from?.id ?? relationship.from_entity_id,
      )
      const toId = normaliseId(
        relationship.to_entity ?? relationship.to?.id ?? relationship.to_entity_id,
      )

      const fromReadable =
        (fromId && fromId === entityIdString) ||
        (relationship.from ? canUserReadEntity(relationship.from, effectiveContext) : false)

      const toReadable =
        (toId && toId === entityIdString) ||
        (relationship.to ? canUserReadEntity(relationship.to, effectiveContext) : false)

      return fromReadable && toReadable
    })

    res.json({ success: true, data: filtered.map(mapRelationship) })
  } catch (err) {
    console.error('Failed to load relationships', err)
    res.status(500).json({ error: 'Failed to load relationships' })
  }
}

export async function deleteRelationship(req, res) {
  try {
    applyRelBuilderHeader(res)
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
