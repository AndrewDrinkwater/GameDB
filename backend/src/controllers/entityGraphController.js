import { Op } from 'sequelize'
import {
  Entity,
  EntityRelationship,
  EntityRelationshipType,
} from '../models/index.js'

export async function getEntityGraph(req, res) {
  try {
    const { id } = req.params

    const center = await Entity.findByPk(id, {
      attributes: ['id', 'name'],
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
        { model: Entity, as: 'from', attributes: ['id', 'name'] },
        { model: Entity, as: 'to', attributes: ['id', 'name'] },
      ],
    })

    const nodeMap = new Map()
    nodeMap.set(center.id, { id: center.id, name: center.name })

    const edges = relationships.map((relationship) => {
      const from = relationship.from
      const to = relationship.to

      if (!nodeMap.has(from.id)) {
        nodeMap.set(from.id, { id: from.id, name: from.name })
      }

      if (!nodeMap.has(to.id)) {
        nodeMap.set(to.id, { id: to.id, name: to.name })
      }

      return {
        id: relationship.id,
        source: from.id,
        target: to.id,
        type: {
          id: relationship.relationshipType.id,
          name: relationship.relationshipType.name,
        },
      }
    })

    const nodes = Array.from(nodeMap.values())

    res.json({ success: true, data: { nodes, edges } })
  } catch (err) {
    console.error('getEntityGraph error:', err)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
