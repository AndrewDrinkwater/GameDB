import {
  EntityType,
  EntityTypeField,
  EntityTypeFieldLayout,
} from '../models/index.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'

const isSystemAdmin = (user) => user?.role === 'system_admin'

const ensureViewAccess = async (entityType, user) => {
  if (!entityType) {
    return { status: 404, message: 'Entity type not found' }
  }

  if (!entityType.world_id) {
    if (!isSystemAdmin(user)) {
      return { status: 403, message: 'Forbidden' }
    }
    return { status: 200 }
  }

  const access = await checkWorldAccess(entityType.world_id, user)

  if (!access.world) {
    return { status: 404, message: 'World not found' }
  }

  if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
    return { status: 403, message: 'Forbidden' }
  }

  return { status: 200 }
}

const ensureManageAccess = async (entityType, user) => {
  if (!entityType) {
    return { status: 404, message: 'Entity type not found' }
  }

  if (isSystemAdmin(user)) {
    return { status: 200 }
  }

  if (!entityType.world_id) {
    return { status: 403, message: 'Forbidden' }
  }

  const access = await checkWorldAccess(entityType.world_id, user)

  if (!access.world) {
    return { status: 404, message: 'World not found' }
  }

  if (!access.isOwner && !access.isAdmin) {
    return { status: 403, message: 'Forbidden' }
  }

  return { status: 200 }
}

const ORDER_CLAUSE = [
  ['section_order', 'ASC'],
  ['column_order', 'ASC'],
  ['field_order', 'ASC'],
  ['priority', 'ASC'],
  ['created_at', 'ASC'],
]

const mapLayoutResponse = (entry) => ({
  id: entry.id,
  entity_type_field_id: entry.entity_type_field_id,
  fieldKey: entry.entity_type_field_id,
  section_order: entry.section_order,
  column_order: entry.column_order,
  field_order: entry.field_order,
  priority: entry.priority,
})

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') {
    return fallback
  }
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

export const listEntityTypeFieldLayout = async (req, res) => {
  try {
    const { id } = req.params
    const entityType = await EntityType.findByPk(id)
    const access = await ensureViewAccess(entityType, req.user)

    if (access.status !== 200) {
      return res.status(access.status).json({ success: false, message: access.message })
    }

    const entries = await EntityTypeFieldLayout.findAll({
      where: { entity_type_id: id },
      order: ORDER_CLAUSE,
    })

    return res.json({ success: true, data: entries.map((entry) => mapLayoutResponse(entry)) })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const updateEntityTypeFieldLayout = async (req, res) => {
  try {
    const { id } = req.params
    const entityType = await EntityType.findByPk(id)
    const access = await ensureManageAccess(entityType, req.user)

    if (access.status !== 200) {
      return res.status(access.status).json({ success: false, message: access.message })
    }

    const entries = Array.isArray(req.body?.entries) ? req.body.entries : []
    const fields = await EntityTypeField.findAll({
      where: { entity_type_id: id },
      attributes: ['id'],
    })

    const validFieldIds = new Set(fields.map((field) => field.id))

    const payloads = entries
      .map((entry, index) => {
        const fieldId =
          entry?.entity_type_field_id || entry?.field_id || entry?.fieldId || entry?.fieldKey || entry?.field_key
        if (!fieldId || !validFieldIds.has(fieldId)) {
          return null
        }

        return {
          entity_type_id: id,
          entity_type_field_id: fieldId,
          section_order: toNumber(entry.sectionOrder ?? entry.section_order, 0),
          column_order: toNumber(entry.columnOrder ?? entry.column_order, 0),
          field_order: toNumber(entry.fieldOrder ?? entry.field_order, index),
          priority: toNumber(entry.priority, index),
        }
      })
      .filter(Boolean)

    const transaction = await EntityTypeFieldLayout.sequelize.transaction()

    try {
      await EntityTypeFieldLayout.destroy({ where: { entity_type_id: id }, transaction })

      if (payloads.length) {
        await EntityTypeFieldLayout.bulkCreate(payloads, { transaction })
      }

      await transaction.commit()
    } catch (err) {
      await transaction.rollback()
      throw err
    }

    const refreshed = await EntityTypeFieldLayout.findAll({
      where: { entity_type_id: id },
      order: ORDER_CLAUSE,
    })

    return res.json({ success: true, data: refreshed.map((entry) => mapLayoutResponse(entry)) })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

