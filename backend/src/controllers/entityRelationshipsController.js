import { Op } from 'sequelize'
import {
  Entity,
  EntityRelationship,
  EntityRelationshipType,
  EntityRelationshipTypeEntityType,
} from '../models/index.js'
import { ensureBidirectionalLink } from '../utils/relationshipHelpers.js'

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
    allowedFrom: new Set(mapped.from_entity_types.map((entry) => entry.id)),
    allowedTo: new Set(mapped.to_entity_types.map((entry) => entry.id)),
  }
}

export async function getRelationshipTypes(req, res) {
  try {
    const { worldId } = req.query ?? {}
    const where = {}

    if (worldId) {
      where[Op.or] = [{ world_id: null }, { world_id: worldId }]
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

export async function createRelationship(req, res) {
  try {
    const { from_entity, to_entity, relationship_type_id, bidirectional, context } = req.body

    if (!from_entity || !to_entity || !relationship_type_id) {
      return res.status(400).json({ error: 'from_entity, to_entity and relationship_type_id are required' })
    }

    if (from_entity === to_entity) {
      return res.status(400).json({ error: 'An entity cannot relate to itself.' })
    }

    const relationshipType = await EntityRelationshipType.findByPk(relationship_type_id, {
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
      Entity.findByPk(from_entity),
      Entity.findByPk(to_entity),
    ])

    if (!from || !to) {
      return res.status(404).json({ error: 'One or both entities not found' })
    }

    if (from.world_id !== to.world_id) {
      return res.status(400).json({ error: 'Entities must belong to the same world' })
    }

    if (relationshipType.world_id && relationshipType.world_id !== from.world_id) {
      return res.status(400).json({
        error: 'Relationship type cannot be used outside of its world context',
      })
    }

    const { allowedFrom, allowedTo } = buildRuleSets(relationshipType)

    if (allowedFrom.size && !allowedFrom.has(from.entity_type_id)) {
      return res
        .status(400)
        .json({ error: 'Selected source entity type is not permitted for this relationship type' })
    }

    if (allowedTo.size && !allowedTo.has(to.entity_type_id)) {
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
      from_entity,
      to_entity,
      relationship_type_id,
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
    const relationship = await EntityRelationship.findByPk(req.params.id)

    if (!relationship) {
      return res.status(404).json({ error: 'Not found' })
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
