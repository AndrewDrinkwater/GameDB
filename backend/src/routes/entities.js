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
import { Entity, EntityRelationship, EntityType } from '../models/index.js'
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
  const depth = parseInt(req.query.depth || '1', 10)
  const relationshipTypes = req.query.relationshipTypes
    ? req.query.relationshipTypes.split(',')
    : null

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
            { fromEntity: currentLevel },
            { toEntity: currentLevel },
          ],
          ...(relationshipTypes && { relationshipTypeId: relationshipTypes }),
        },
      })

      const newEntityIds = new Set()

      for (const rel of rels) {
        const src = rel.fromEntity
        const tgt = rel.toEntity

        edges.push({
          source: src,
          target: tgt,
          type: rel.relationshipTypeId,
          label: rel.label || rel.relationshipTypeId,
        })

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

    res.json({ nodes, edges })
  } catch (err) {
    console.error('Error building entity graph:', err)
    res.status(500).json({ error: 'Failed to build entity graph' })
  }
})

export default router
