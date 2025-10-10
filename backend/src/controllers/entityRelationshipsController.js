import { Op } from 'sequelize'
import {
  Entity,
  EntityRelationship,
  EntityRelationshipType,
} from '../models/index.js'
import { ensureBidirectionalLink } from '../utils/relationshipHelpers.js'

export async function getRelationshipTypes(req, res) {
  try {
    const types = await EntityRelationshipType.findAll({
      order: [['name', 'ASC']],
    })
    res.json(types)
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

    const relationshipType = await EntityRelationshipType.findByPk(relationship_type_id)
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

    const relationship = await EntityRelationship.create({
      from_entity,
      to_entity,
      relationship_type_id,
      bidirectional,
      context: context || {},
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
