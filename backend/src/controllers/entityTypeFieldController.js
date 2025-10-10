import {
  EntityType,
  EntityTypeField,
  World,
} from '../models/index.js'
import { coerceValueForField } from '../utils/entityMetadataValidator.js'

const FIELD_ORDER = [
  ['sort_order', 'ASC'],
  ['name', 'ASC'],
]

const ALLOWED_TYPES = new Set(['string', 'number', 'boolean', 'text', 'date', 'enum'])

const isSystemAdmin = (user) => user?.role === 'system_admin'

const ensureManageAccess = async (user) => {
  if (!user) return false
  if (isSystemAdmin(user)) return true
  const ownedWorlds = await World.count({ where: { created_by: user.id } })
  return ownedWorlds > 0
}

const normaliseOptions = (options) => {
  if (options === undefined || options === null) return {}
  if (typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('options must be an object')
  }
  return options
}

const validateFieldPayload = (payload) => {
  if (!ALLOWED_TYPES.has(payload.data_type)) {
    throw new Error('Invalid data_type value')
  }

  const options = normaliseOptions(payload.options)

  if (payload.data_type === 'enum') {
    const choices = options.choices
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new Error('Enum fields require a non-empty options.choices array')
    }
  }

  if (payload.default_value !== undefined && payload.default_value !== null && payload.default_value !== '') {
    const coerced = coerceValueForField(payload.default_value, payload)

    if (payload.data_type === 'number' && Number.isNaN(Number(coerced))) {
      throw new Error('Default value must be numeric for number fields')
    }

    if (payload.data_type === 'boolean') {
      const acceptable = ['true', 'false', '0', '1']
      if (
        typeof coerced !== 'boolean' &&
        !(typeof payload.default_value === 'string' && acceptable.includes(payload.default_value.toLowerCase()))
      ) {
        throw new Error('Default value must be boolean-compatible for boolean fields')
      }
    }

    if (payload.data_type === 'enum') {
      const choices = Array.isArray(options.choices) ? options.choices : []
      if (choices.length && !choices.includes(payload.default_value)) {
        throw new Error('Default value must be one of the enum choices')
      }
    }
  }

  return { ...payload, options }
}

export const listEntityTypeFields = async (req, res) => {
  try {
    const { id } = req.params
    const entityType = await EntityType.findByPk(id)

    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }

    const canManage = await ensureManageAccess(req.user)
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const fields = await EntityTypeField.findAll({
      where: { entity_type_id: id },
      order: FIELD_ORDER,
    })

    return res.json({ success: true, data: fields })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const createEntityTypeField = async (req, res) => {
  try {
    const { id } = req.params
    const { name, label, data_type, options, required, default_value, sort_order } = req.body

    const entityType = await EntityType.findByPk(id)
    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }

    const canManage = await ensureManageAccess(req.user)
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const trimmedName = name?.trim()
    if (!trimmedName) {
      return res.status(400).json({ success: false, message: 'name is required' })
    }

    if (!data_type) {
      return res.status(400).json({ success: false, message: 'data_type is required' })
    }

    const parsedSortOrder = sort_order !== undefined ? Number(sort_order) : 0
    if (Number.isNaN(parsedSortOrder)) {
      return res.status(400).json({ success: false, message: 'sort_order must be a number' })
    }

    let payload
    try {
      payload = validateFieldPayload({
        entity_type_id: id,
        name: trimmedName,
        label,
        data_type,
        options,
        required: Boolean(required),
        default_value,
        sort_order: parsedSortOrder,
      })
    } catch (validationError) {
      return res.status(400).json({ success: false, message: validationError.message })
    }

    try {
      const field = await EntityTypeField.create(payload)
      return res.status(201).json({ success: true, data: field })
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res
          .status(409)
          .json({ success: false, message: 'A field with this name already exists for the entity type' })
      }
      throw error
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const updateEntityTypeField = async (req, res) => {
  try {
    const { id } = req.params
    const { name, label, data_type, options, required, default_value, sort_order } = req.body

    const field = await EntityTypeField.findByPk(id)
    if (!field) {
      return res.status(404).json({ success: false, message: 'Field not found' })
    }

    const entityType = await EntityType.findByPk(field.entity_type_id)
    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }

    const canManage = await ensureManageAccess(req.user)
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const trimmedName = name !== undefined ? name.trim() : undefined
    if (trimmedName !== undefined && !trimmedName) {
      return res.status(400).json({ success: false, message: 'name cannot be empty' })
    }

    const parsedSortOrder = sort_order !== undefined ? Number(sort_order) : field.sort_order
    if (Number.isNaN(parsedSortOrder)) {
      return res.status(400).json({ success: false, message: 'sort_order must be a number' })
    }

    const updates = {
      name: trimmedName !== undefined ? trimmedName : field.name,
      label: label !== undefined ? label : field.label,
      data_type: data_type ?? field.data_type,
      options: options !== undefined ? options : field.options,
      required: required !== undefined ? Boolean(required) : field.required,
      default_value:
        default_value !== undefined ? default_value : field.default_value,
      sort_order: parsedSortOrder,
    }

    let validated
    try {
      validated = validateFieldPayload({ id: field.id, ...updates, entity_type_id: field.entity_type_id })
    } catch (validationError) {
      return res.status(400).json({ success: false, message: validationError.message })
    }

    await field.update(validated)

    return res.json({ success: true, data: field })
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res
        .status(409)
        .json({ success: false, message: 'A field with this name already exists for the entity type' })
    }
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteEntityTypeField = async (req, res) => {
  try {
    const { id } = req.params
    const field = await EntityTypeField.findByPk(id)

    if (!field) {
      return res.status(404).json({ success: false, message: 'Field not found' })
    }

    const entityType = await EntityType.findByPk(field.entity_type_id)
    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }

    const canManage = await ensureManageAccess(req.user)
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    await field.destroy()

    return res.status(204).send()
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}
