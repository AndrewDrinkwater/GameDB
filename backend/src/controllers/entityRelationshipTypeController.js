import { Op } from 'sequelize'
import {
  EntityRelationship,
  EntityRelationshipType,
  EntityRelationshipTypeEntityType,
  EntityType,
  World,
  sequelize,
} from '../models/index.js'

const isSystemAdmin = (user) => user?.role === 'system_admin'

const normaliseIds = (input) => {
  if (!input) return []
  if (Array.isArray(input)) {
    return [...new Set(input.map((value) => String(value).trim()).filter(Boolean))]
  }
  if (typeof input === 'string') {
    const trimmed = input.trim()
    return trimmed ? [trimmed] : []
  }
  return []
}

const buildRulePayload = (relationshipTypeId, role, ids) =>
  ids.map((id) => ({
    relationship_type_id: relationshipTypeId,
    entity_type_id: id,
    role,
  }))

const findExistingTypeByName = async (worldId, name) => {
  if (!worldId || !name) return null

  const trimmedName = name.trim()
  if (!trimmedName) return null

  const lowerName = trimmedName.toLowerCase()

  return EntityRelationshipType.findOne({
    where: {
      world_id: worldId,
      [Op.and]: [
        sequelize.where(
          sequelize.fn('LOWER', sequelize.col('name')),
          lowerName,
        ),
      ],
    },
    attributes: ['id', 'name', 'world_id'],
  })
}

const mapType = (typeInstance) => {
  if (!typeInstance) return null
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
    created_at: plain.created_at,
    updated_at: plain.updated_at,
    world: plain.world
      ? { id: plain.world.id, name: plain.world.name }
      : null,
    from_entity_types: fromTypes,
    to_entity_types: toTypes,
  }
}

const fetchRelationshipType = async (id) =>
  EntityRelationshipType.findByPk(id, {
    include: [
      { model: World, as: 'world', attributes: ['id', 'name'] },
      {
        model: EntityRelationshipTypeEntityType,
        as: 'entityTypeRules',
        include: [{ model: EntityType, as: 'entityType', attributes: ['id', 'name'] }],
      },
    ],
  })

export const listRelationshipTypes = async (req, res) => {
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
        { model: World, as: 'world', attributes: ['id', 'name'] },
        {
          model: EntityRelationshipTypeEntityType,
          as: 'entityTypeRules',
          include: [{ model: EntityType, as: 'entityType', attributes: ['id', 'name'] }],
        },
      ],
    })

    res.json({ success: true, data: types.map(mapType) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const getRelationshipType = async (req, res) => {
  try {
    if (!isSystemAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const instance = await fetchRelationshipType(req.params.id)

    if (!instance) {
      return res.status(404).json({ success: false, message: 'Relationship type not found' })
    }

    res.json({ success: true, data: mapType(instance) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

const validateInput = async ({
  name,
  fromName,
  toName,
  description,
  worldId,
  fromEntityTypeIds,
  toEntityTypeIds,
}) => {
  const trimmedName = typeof name === 'string' ? name.trim() : ''
  if (!trimmedName) {
    return { error: 'name is required' }
  }

  const trimmedFromName = typeof fromName === 'string' ? fromName.trim() : ''
  if (!trimmedFromName) {
    return { error: 'from_name is required' }
  }

  const trimmedToName = typeof toName === 'string' ? toName.trim() : ''
  if (!trimmedToName) {
    return { error: 'to_name is required' }
  }

  const trimmedWorldId = typeof worldId === 'string' ? worldId.trim() : String(worldId ?? '').trim()
  if (!trimmedWorldId) {
    return { error: 'world_id is required' }
  }

  const fromIds = normaliseIds(fromEntityTypeIds)
  const toIds = normaliseIds(toEntityTypeIds)

  if (!fromIds.length) {
    return { error: 'At least one source entity type must be selected' }
  }

  if (!toIds.length) {
    return { error: 'At least one target entity type must be selected' }
  }

  const world = await World.findByPk(trimmedWorldId)
  if (!world) {
    return { error: 'World not found' }
  }

  const combinedIds = [...new Set([...fromIds, ...toIds])]
  const entityTypes = await EntityType.findAll({
    where: { id: { [Op.in]: combinedIds } },
    attributes: ['id', 'name'],
  })

  if (entityTypes.length !== combinedIds.length) {
    return { error: 'One or more selected entity types were not found' }
  }

  const existingType = await findExistingTypeByName(world.id, trimmedName)

  if (existingType) {
    return { error: 'A relationship type with this name already exists in the selected world' }
  }

  return {
    values: {
      name: trimmedName,
      fromName: trimmedFromName,
      toName: trimmedToName,
      description: description ?? null,
      worldId: world.id,
      fromIds: [...new Set(fromIds)],
      toIds: [...new Set(toIds)],
    },
  }
}

export const createRelationshipType = async (req, res) => {
  try {
    if (!isSystemAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const { values, error } = await validateInput({
      name: req.body?.name,
      fromName: req.body?.from_name ?? req.body?.fromName,
      toName: req.body?.to_name ?? req.body?.toName,
      description: req.body?.description,
      worldId: req.body?.world_id ?? req.body?.worldId,
      fromEntityTypeIds:
        req.body?.from_entity_type_ids ?? req.body?.fromEntityTypeIds ?? [],
      toEntityTypeIds: req.body?.to_entity_type_ids ?? req.body?.toEntityTypeIds ?? [],
    })

    if (error) {
      return res.status(400).json({ success: false, message: error })
    }

    const result = await sequelize.transaction(async (transaction) => {
      const relationshipType = await EntityRelationshipType.create(
        {
          name: values.name,
          from_name: values.fromName,
          to_name: values.toName,
          description: values.description,
          world_id: values.worldId,
        },
        { transaction },
      )

      const rules = [
        ...buildRulePayload(relationshipType.id, 'from', values.fromIds),
        ...buildRulePayload(relationshipType.id, 'to', values.toIds),
      ]

      await EntityRelationshipTypeEntityType.bulkCreate(rules, {
        transaction,
      })

      return relationshipType
    })

    const instance = await fetchRelationshipType(result.id)

    res.status(201).json({ success: true, data: mapType(instance) })
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const constraint = error?.parent?.constraint || ''

      if (constraint === 'uniq_relationship_type_entity_type_role') {
        return res.status(400).json({
          success: false,
          message: 'Each entity type can only be selected once for a given direction.',
        })
      }

      if (constraint === 'uniq_relationship_types_world_name') {
        return res.status(409).json({
          success: false,
          message: 'A relationship type with this name already exists in the selected world',
        })
      }

      return res.status(409).json({
        success: false,
        message: 'A relationship type with this name already exists',
      })
    }
    res.status(500).json({ success: false, message: error.message })
  }
}

export const updateRelationshipType = async (req, res) => {
  try {
    if (!isSystemAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const relationshipType = await EntityRelationshipType.findByPk(req.params.id)

    if (!relationshipType) {
      return res.status(404).json({ success: false, message: 'Relationship type not found' })
    }

    const { values, error } = await validateInput({
      name: req.body?.name ?? relationshipType.name,
      fromName: req.body?.from_name ?? req.body?.fromName ?? relationshipType.from_name,
      toName: req.body?.to_name ?? req.body?.toName ?? relationshipType.to_name,
      description: req.body?.description ?? relationshipType.description,
      worldId: req.body?.world_id ?? req.body?.worldId ?? relationshipType.world_id,
      fromEntityTypeIds:
        req.body?.from_entity_type_ids ?? req.body?.fromEntityTypeIds ?? [],
      toEntityTypeIds: req.body?.to_entity_type_ids ?? req.body?.toEntityTypeIds ?? [],
    })

    if (error) {
      return res.status(400).json({ success: false, message: error })
    }

    try {
      await sequelize.transaction(async (transaction) => {
        await relationshipType.update(
          {
            name: values.name,
            from_name: values.fromName,
            to_name: values.toName,
            description: values.description,
            world_id: values.worldId,
          },
          { transaction },
        )

        await EntityRelationshipTypeEntityType.destroy({
          where: { relationship_type_id: relationshipType.id },
          transaction,
        })

        const rules = [
          ...buildRulePayload(relationshipType.id, 'from', values.fromIds),
          ...buildRulePayload(relationshipType.id, 'to', values.toIds),
        ]

        await EntityRelationshipTypeEntityType.bulkCreate(rules, { transaction })
      })
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        return res
          .status(409)
          .json({ success: false, message: 'A relationship type with this name already exists' })
      }
      throw err
    }

    const instance = await fetchRelationshipType(relationshipType.id)

    res.json({ success: true, data: mapType(instance) })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteRelationshipType = async (req, res) => {
  try {
    if (!isSystemAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const relationshipType = await EntityRelationshipType.findByPk(req.params.id)

    if (!relationshipType) {
      return res.status(404).json({ success: false, message: 'Relationship type not found' })
    }

    const relationshipsInUse = await EntityRelationship.count({
      where: { relationship_type_id: relationshipType.id },
    })

    if (relationshipsInUse > 0) {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete a relationship type that is in use by existing relationships',
      })
    }

    await relationshipType.destroy()

    res.json({ success: true, message: 'Relationship type deleted' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
