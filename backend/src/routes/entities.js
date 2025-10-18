import express from 'express'
import { authenticate } from '../middleware/authMiddleware.js'
import {
  createEntity,
  createEntitySecret,
  deleteEntity,
  getEntityById,
  getEntitySecrets,
  searchEntities,
  updateEntity,
} from '../controllers/entityController.js'
import {
  Entity,
  EntityRelationship,
  EntityRelationshipType,
  EntityType,
} from '../models/index.js'
import { Op } from 'sequelize'

const router = express.Router({ mergeParams: true })
router.use(authenticate)

// ─────────────────────────────────────────────
// Core Entity routes
// ─────────────────────────────────────────────
router.post('/', createEntity)
router.get('/search', searchEntities)
router.get('/:id', getEntityById)
router.patch('/:id', updateEntity)
router.delete('/:id', deleteEntity)

// ─────────────────────────────────────────────
// Secrets (DM-only)
// ─────────────────────────────────────────────
router.get('/:id/secrets', getEntitySecrets)
router.post('/:id/secrets', createEntitySecret)

// ─────────────────────────────────────────────
// Entity Explorer: visual relationship graph
// ─────────────────────────────────────────────
router.get('/:id/explore', async (req, res) => {
  const { worldId } = req.params
  const entityId = req.params.id

  const depthParam = parseInt(req.query.depth || '1', 10)
  const depth = Math.min(Math.max(Number.isNaN(depthParam) ? 1 : depthParam, 1), 3)

  const relationshipTypesRaw = req.query.relationshipTypes
  const relationshipTypeValues = Array.isArray(relationshipTypesRaw)
    ? relationshipTypesRaw
    : typeof relationshipTypesRaw === 'string'
      ? relationshipTypesRaw.split(',')
      : []

  const relationshipTypes = relationshipTypeValues
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isFinite(value) && value > 0)
  const hasRelationshipTypeFilter = relationshipTypes.length > 0

  const relationshipTypesById = new Map()

  try {
    const visited = new Set([entityId])
    const nodes = []
    const edges = []

    let currentLevel = [entityId]

    for (let i = 0; i < depth; i++) {
      // ✅ FIXED: use actual DB column mappings
      const rels = await EntityRelationship.findAll({
        where: {
          [Op.or]: [
            { from_entity: currentLevel },
            { to_entity: currentLevel },
          ],
          ...(hasRelationshipTypeFilter && {
            relationship_type_id: relationshipTypes,
          }),
        },
        include: [
          {
            model: EntityRelationshipType,
            as: 'relationshipType',
            attributes: ['id', 'name', 'from_name', 'to_name'],
          },
        ],
      })

      const newEntityIds = new Set()

      for (const rel of rels) {
        const src = rel.from_entity
        const tgt = rel.to_entity

        const relationshipType = rel.relationshipType
          ? {
              id: rel.relationshipType.id,
              name: rel.relationshipType.name,
              fromName: rel.relationshipType.from_name,
              toName: rel.relationshipType.to_name,
            }
          : null

        edges.push({
          id: rel.id,
          source: src,
          target: tgt,
          type: rel.relationship_type_id,
          relationshipTypeId: rel.relationship_type_id,
          label: rel.label || rel.relationship_type_id,
          context: rel.context || {},
          relationshipType,
        })

        const relationshipTypeId = relationshipType?.id || rel.relationship_type_id
        if (relationshipTypeId) {
          const typeKey = String(relationshipTypeId)
          if (!relationshipTypesById.has(typeKey)) {
            relationshipTypesById.set(typeKey, {
              id: relationshipTypeId,
              name: relationshipType?.name || String(relationshipTypeId),
              fromName: relationshipType?.fromName || null,
              toName: relationshipType?.toName || null,
            })
          }
        }

        if (!visited.has(src)) newEntityIds.add(src)
        if (!visited.has(tgt)) newEntityIds.add(tgt)
      }

      if (newEntityIds.size === 0) break

      const newEntities = await Entity.findAll({
        where: { id: Array.from(newEntityIds) },
        include: [{ model: EntityType, as: 'entityType' }],
      })

      for (const ent of newEntities) {
        nodes.push({
          id: ent.id,
          name: ent.name,
          type: ent.entityType?.name || 'Unknown',
          icon: ent.entityType?.icon || null,
        })
        visited.add(ent.id)
      }

      currentLevel = Array.from(newEntityIds)
    }

    // Add the root entity if missing
    const rootEntity = await Entity.findByPk(entityId, {
      include: [{ model: EntityType, as: 'entityType' }],
    })

    if (rootEntity && !nodes.some((n) => n.id === rootEntity.id)) {
      nodes.push({
        id: rootEntity.id,
        name: rootEntity.name,
        type: rootEntity.entityType?.name || 'Unknown',
        icon: rootEntity.entityType?.icon || null,
      })
    }

    const availableRelationshipTypes = Array.from(relationshipTypesById.values()).sort(
      (a, b) => a.name.localeCompare(b.name),
    )

    res.json({ nodes, edges, relationshipTypes: availableRelationshipTypes })
  } catch (err) {
    console.error('Error building entity graph:', err)
    res.status(500).json({ error: 'Failed to build entity graph' })
  }
})

export default router
