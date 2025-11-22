import { EntityListPreference, EntityType, EntityTypeField, LocationType } from '../models/index.js'

const CORE_COLUMNS = [
  { key: 'name', label: 'Name', description: 'Entity name' },
  { key: 'type', label: 'Type', description: 'Entity type' },
  { key: 'importance', label: 'Importance', description: 'Campaign importance' },
  { key: 'visibility', label: 'Visibility', description: 'Current visibility' },
  { key: 'createdAt', label: 'Created', description: 'Creation date' },
  { key: 'description', label: 'Description', description: 'Entity description' },
]

const FIELD_ORDER = [
  ['sort_order', 'ASC'],
  ['name', 'ASC'],
]

const buildMetadataColumns = (fields = []) =>
  fields.map((field) => {
    const entityRef = field.entityReferenceType
    const locationRef = field.locationReferenceType
    const referenceType = entityRef || locationRef
    
    return {
      key: `metadata.${field.name}`,
      name: field.name,
      label: field.label || field.name,
      dataType: field.data_type,
      data_type: field.data_type,
      required: field.required,
      options: field.options || {},
      referenceTypeId: field.reference_type_id || null,
      reference_type_id: field.reference_type_id || null,
      referenceTypeName: referenceType?.name || null,
      referenceType: referenceType ? { name: referenceType.name } : null,
      referenceFilter: field.reference_filter || {},
      reference_filter: field.reference_filter || {},
    }
  })

const sanitiseColumnList = (columns, allowedKeys, fallback) => {
  const allowed = new Set(allowedKeys)
  const cleaned = []

  if (Array.isArray(columns)) {
    columns.forEach((value) => {
      if (typeof value !== 'string') return
      const trimmed = value.trim()
      if (!trimmed || !allowed.has(trimmed)) return
      if (!cleaned.includes(trimmed)) {
        cleaned.push(trimmed)
      }
    })
  }

  if (cleaned.length > 0) {
    return cleaned
  }

  const fallbackList = Array.isArray(fallback)
    ? fallback.filter((value) => typeof value === 'string' && allowed.has(value))
    : []

  return fallbackList.length > 0 ? [...fallbackList] : []
}

export const getEntityTypeListColumns = async (req, res) => {
  try {
    const { id } = req.params

    const entityType = await EntityType.findByPk(id)
    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }

    const fields = await EntityTypeField.findAll({
      where: { entity_type_id: id },
      order: FIELD_ORDER,
      include: [
        {
          model: EntityType,
          as: 'entityReferenceType',
          attributes: ['id', 'name'],
          required: false,
        },
        {
          model: LocationType,
          as: 'locationReferenceType',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    })

    const metadataColumns = buildMetadataColumns(fields)
    const coreColumns = [...CORE_COLUMNS]
    const allowedKeys = [...coreColumns.map((col) => col.key), ...metadataColumns.map((col) => col.key)]

    const userPreference = await EntityListPreference.findOne({
      where: { entity_type_id: id, user_id: req.user.id },
    })

    const systemDefault = await EntityListPreference.findOne({
      where: { entity_type_id: id, user_id: null },
    })

    const fallback = sanitiseColumnList([], allowedKeys, ['name', 'type', 'visibility', 'createdAt'])

    const response = {
      coreColumns,
      metadataColumns,
      userPreference: null,
      systemDefault: null,
    }

    if (systemDefault) {
      response.systemDefault = {
        columns: sanitiseColumnList(systemDefault.columns, allowedKeys, fallback),
        updatedAt: systemDefault.updatedAt,
      }
    }

    if (userPreference) {
      response.userPreference = {
        columns: sanitiseColumnList(
          userPreference.columns,
          allowedKeys,
          response.systemDefault?.columns ?? fallback,
        ),
        updatedAt: userPreference.updatedAt,
      }
    }

    return res.json({ success: true, data: response })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const updateEntityTypeListColumns = async (req, res) => {
  try {
    const { id } = req.params
    const { scope = 'user', columns } = req.body ?? {}
    const trimmedScope = scope === 'system' ? 'system' : 'user'

    if (!Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({ success: false, message: 'columns must include at least one entry' })
    }

    const entityType = await EntityType.findByPk(id)
    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }

    if (trimmedScope === 'system' && req.user.role !== 'system_admin') {
      return res.status(403).json({ success: false, message: 'Only system administrators can update the default column set' })
    }

    const fields = await EntityTypeField.findAll({
      where: { entity_type_id: id },
      order: FIELD_ORDER,
      include: [
        {
          model: EntityType,
          as: 'entityReferenceType',
          attributes: ['id', 'name'],
          required: false,
        },
        {
          model: LocationType,
          as: 'locationReferenceType',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    })

    const metadataColumns = buildMetadataColumns(fields)
    const coreColumns = [...CORE_COLUMNS]
    const allowedKeys = [...coreColumns.map((col) => col.key), ...metadataColumns.map((col) => col.key)]

    const fallback = ['name', 'type', 'visibility', 'createdAt']
    const sanitised = sanitiseColumnList(columns, allowedKeys, fallback)

    if (sanitised.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid columns selected' })
    }

    const where = { entity_type_id: id, user_id: trimmedScope === 'system' ? null : req.user.id }

    const [preference, created] = await EntityListPreference.findOrCreate({
      where,
      defaults: { columns: sanitised },
    })

    if (!created) {
      await preference.update({ columns: sanitised })
    }

    return res.json({
      success: true,
      data: {
        scope: trimmedScope,
        columns: preference.columns,
        updatedAt: preference.updatedAt,
      },
    })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}
