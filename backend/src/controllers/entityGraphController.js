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
    const depthParam = parseInt(req.query?.depth, 10)
    const depthLimit = Number.isFinite(depthParam) && depthParam > 0 ? Math.min(depthParam, 6) : 1

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

    const nodeMap = new Map()
    const edgeMap = new Map()

    const centerNode = mapEntityNode(center)
    if (centerNode) {
      nodeMap.set(centerNode.id, centerNode)
    }

    const entityLevels = new Map()
    const processedEntities = new Set()

    if (centerNode) {
      entityLevels.set(centerNode.id, 0)
    }

    let currentLevelIds = new Set(centerNode ? [centerNode.id] : [])

    const includeConfig = [
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
    ]

    const registerNode = (node, levelValue) => {
      if (!node || levelValue > depthLimit) return
      if (!nodeMap.has(node.id)) {
        nodeMap.set(node.id, node)
      }
    }

    for (let level = 0; level < depthLimit && currentLevelIds.size > 0; level += 1) {
      const idsToQuery = Array.from(currentLevelIds).filter((entityId) => !processedEntities.has(entityId))

      if (!idsToQuery.length) {
        break
      }

      const relationships = await EntityRelationship.findAll({
        where: {
          [Op.or]: [
            { from_entity: { [Op.in]: idsToQuery } },
            { to_entity: { [Op.in]: idsToQuery } },
          ],
        },
        include: includeConfig,
      })

      idsToQuery.forEach((entityId) => processedEntities.add(entityId))

      const nextLevelIds = new Set()

      relationships.forEach((relationship) => {
        const plainRelationship =
          typeof relationship.get === 'function'
            ? relationship.get({ plain: true })
            : relationship

        const from = mapEntityNode(plainRelationship.from)
        const to = mapEntityNode(plainRelationship.to)

        if (!from?.id || !to?.id) {
          return
        }

        const fromId = from.id
        const toId = to.id

        let fromLevel = entityLevels.get(fromId)
        let toLevel = entityLevels.get(toId)

        const fromInCurrent = currentLevelIds.has(fromId)
        const toInCurrent = currentLevelIds.has(toId)

        if (fromLevel === undefined && toLevel !== undefined) {
          const candidate = toLevel + 1
          if (candidate <= depthLimit) {
            entityLevels.set(fromId, candidate)
            fromLevel = candidate
            if (candidate < depthLimit) nextLevelIds.add(fromId)
          }
        }

        if (toLevel === undefined && fromLevel !== undefined) {
          const candidate = fromLevel + 1
          if (candidate <= depthLimit) {
            entityLevels.set(toId, candidate)
            toLevel = candidate
            if (candidate < depthLimit) nextLevelIds.add(toId)
          }
        }

        if (fromLevel === undefined && fromInCurrent) {
          entityLevels.set(fromId, level)
          fromLevel = level
        }

        if (toLevel === undefined && toInCurrent) {
          entityLevels.set(toId, level)
          toLevel = level
        }

        if (fromLevel === undefined && toInCurrent) {
          const candidate = level + 1
          if (candidate <= depthLimit) {
            entityLevels.set(fromId, candidate)
            fromLevel = candidate
            if (candidate < depthLimit) nextLevelIds.add(fromId)
          }
        }

        if (toLevel === undefined && fromInCurrent) {
          const candidate = level + 1
          if (candidate <= depthLimit) {
            entityLevels.set(toId, candidate)
            toLevel = candidate
            if (candidate < depthLimit) nextLevelIds.add(toId)
          }
        }

        if (fromLevel === undefined || toLevel === undefined) {
          return
        }

        if (fromLevel > depthLimit || toLevel > depthLimit) {
          return
        }

        registerNode(from, fromLevel)
        registerNode(to, toLevel)

        if (!edgeMap.has(plainRelationship.id)) {
          edgeMap.set(plainRelationship.id, {
            id: plainRelationship.id,
            source: fromId,
            target: toId,
            type: {
              id: plainRelationship.relationshipType.id,
              name: plainRelationship.relationshipType.name,
            },
          })
        }
      })

      currentLevelIds = nextLevelIds
    }

    const nodes = Array.from(nodeMap.values())
    const edges = Array.from(edgeMap.values())

    res.json({ success: true, data: { nodes, edges } })
  } catch (err) {
    console.error('getEntityGraph error:', err)
    res.status(500).json({ success: false, message: 'Internal server error' })
  }
}
