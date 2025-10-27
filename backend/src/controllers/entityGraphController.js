import { Op } from 'sequelize'
import {
  Entity,
  EntityRelationship,
  EntityRelationshipType,
  EntityType,
} from '../models/index.js'

function mapEntityNode(entity) {
  if (!entity) return null
  const raw = typeof entity.get === 'function' ? entity.get({ plain: true }) : entity
  return {
    id: raw.id,
    name: raw.name,
    type: raw.entityType
      ? { id: raw.entityType.id, name: raw.entityType.name }
      : null,
  }
}

export async function getEntityGraph(req, res) {
  try {
    const { id } = req.params

    const center = await Entity.findByPk(id, {
      attributes: ['id', 'name'],
      include: [
        {
          model: EntityType,
          as: 'entityType',
          attributes: ['id', 'name'],
        },
      ],
    })

    if (!center) {
      return res.status(404).json({ success: false, message: 'Entity not found' })
    }

    const relationships = await EntityRelationship.findAll({
      where: {
        [Op.or]: [{ from_entity: id }, { to_entity: id }],
      },
      include: [
        {
          model: EntityRelationshipType,
          as: 'relationshipType',
          attributes: ['id', 'name'],
        },
        {
          model: Entity,
          as: 'from',
          attributes: ['id', 'name'],
          include: [
            {
              model: EntityType,
              as: 'entityType',
              attributes: ['id', 'name'],
            },
          ],
        },
        {
          model: Entity,
          as: 'to',
          attributes: ['id', 'name'],
          include: [
            {
              model: EntityType,
              as: 'entityType',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
    })

    const nodeMap = new Map()
    const centerNode = mapEntityNode(center)
    if (centerNode) {
      nodeMap.set(centerNode.id, centerNode)
    }

    const edges = relationships.map((relationship) => {
      const plainRelationship =
        typeof relationship.get === 'function'
          ? relationship.get({ plain: true })
          : relationship

      const from = mapEntityNode(plainRelationship.from)
      const to = mapEntityNode(plainRelationship.to)

      if (from && !nodeMap.has(from.id)) {
        nodeMap.set(from.id, from)
      }

      if (to && !nodeMap.has(to.id)) {
        nodeMap.set(to.id, to)
      }

      if (!from?.id || !to?.id) {
        return null
      }

      return {
        id: plainRelationship.id,
        source: from?.id,
        target: to?.id,
        type: {
          id: plainRelationship.relationshipType.id,
          name: plainRelationship.relationshipType.name,
        },
      }
    })

    const nodes = Array.from(nodeMap.values())

    res.json({ success: true, data: { nodes, edges: edges.filter(Boolean) } })
  } catch (err) {
    console.error('getEntityGraph error:', err)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
