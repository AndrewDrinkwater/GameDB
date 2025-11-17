import { EntityType, EntityTypeField } from '../models/index.js'
import { coerceValueForField } from '../utils/entityMetadataValidator.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'

const FIELD_ORDER = [
  ['sort_order', 'ASC'],
  ['name', 'ASC'],
]

const ALLOWED_TYPES = new Set(['string', 'number', 'boolean', 'text', 'date', 'enum', 'reference'])

const isSystemAdmin = (user) => user?.role === 'system_admin'

const ensureManageAccess = async (user, worldId) => {
  if (isSystemAdmin(user)) return true
  if (!worldId) return false

  const access = await checkWorldAccess(worldId, user)
  return access.isOwner
}

const normaliseOptions = (options) => {
  if (options === undefined || options === null) return {}
  if (typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('options must be an object')
  }
  return options
}

const normaliseReferenceFilter = (filter) => {
  if (filter === undefined || filter === null || filter === '') {
    return {}
  }

  if (typeof filter === 'string') {
    try {
      const parsed = JSON.parse(filter)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error()
      }
      return parsed
    } catch (err) {
      throw new Error('reference_filter must be a JSON object')
    }
  }

  if (typeof filter !== 'object' || Array.isArray(filter)) {
    throw new Error('reference_filter must be an object')
  }

  return filter
}

const validateFieldPayload = (payload) => {
  if (!ALLOWED_TYPES.has(payload.data_type)) {
    throw new Error('Invalid data_type value')
  }

  const options = normaliseOptions(payload.options)
  const referenceFilter = normaliseReferenceFilter(payload.reference_filter)
  const visibleByDefault =
    payload.visible_by_default !== undefined
      ? Boolean(payload.visible_by_default)
      : true
  const trimmedReferenceTypeId =
    typeof payload.reference_type_id === 'string' ? payload.reference_type_id.trim() : payload.reference_type_id

  if (payload.data_type === 'enum') {
    const choices = options.choices
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new Error('Enum fields require a non-empty options.choices array')
    }
  }

  if (payload.data_type === 'reference') {
    if (!trimmedReferenceTypeId) {
      throw new Error('Reference fields require a reference_type_id')
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

  return {
    ...payload,
    options,
    reference_type_id: payload.data_type === 'reference' ? trimmedReferenceTypeId : null,
    reference_filter: payload.data_type === 'reference' ? referenceFilter : {},
    visible_by_default: visibleByDefault,
  }
}

const ensureValidReferenceTarget = async (fieldPayload, worldId) => {
  if (fieldPayload.data_type !== 'reference') {
    return null
  }

  const referenceTypeId = fieldPayload.reference_type_id
  if (!referenceTypeId) {
    throw new Error('Reference fields require a reference_type_id')
  }

  const referenceType = await EntityType.findByPk(referenceTypeId)
  if (!referenceType) {
    throw new Error('Reference entity type not found')
  }

  if (worldId && referenceType.world_id && referenceType.world_id !== worldId) {
    throw new Error('Reference entity type must belong to the same world')
  }

  return referenceType
}

const mapFieldResponse = (fieldInstance) => {
  if (!fieldInstance) return null

  const plain = fieldInstance.get({ plain: true })
  const referenceType = plain.referenceType

  if (referenceType) {
    plain.reference_type_id = plain.reference_type_id ?? referenceType.id
    plain.reference_type_name = referenceType.name
  }

  delete plain.referenceType

  if (plain.visible_by_default === undefined && plain.visibleByDefault !== undefined) {
    plain.visible_by_default = plain.visibleByDefault
  }

  if (plain.visibleByDefault === undefined) {
    plain.visibleByDefault =
      plain.visible_by_default !== undefined ? Boolean(plain.visible_by_default) : true
  } else {
    plain.visibleByDefault = Boolean(plain.visibleByDefault)
  }

  if (plain.visible_by_default === undefined) {
    plain.visible_by_default = plain.visibleByDefault
  } else {
    plain.visible_by_default = Boolean(plain.visible_by_default)
  }

  return plain
}

export const listEntityTypeFields = async (req, res) => {
  try {
    const { id } = req.params
    const entityType = await EntityType.findByPk(id)

    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }

    const worldId = entityType.world_id

    if (!worldId) {
      if (!isSystemAdmin(req.user)) {
        return res.status(403).json({ success: false, message: 'Forbidden' })
      }
    } else {
      const access = await checkWorldAccess(worldId, req.user)

      if (!access.world) {
        return res.status(404).json({ success: false, message: 'World not found' })
      }

      if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden' })
      }
    }

    const fields = await EntityTypeField.findAll({
      where: { entity_type_id: id },
      order: FIELD_ORDER,
      include: [
        {
          model: EntityType,
          as: 'referenceType',
          attributes: ['id', 'name', 'world_id'],
        },
      ],
    })

    return res.json({ success: true, data: fields.map((field) => mapFieldResponse(field)) })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const createEntityTypeField = async (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      label,
      data_type,
      options,
      required,
      default_value,
      sort_order,
      reference_type_id,
      reference_filter,
      visible_by_default,
      visibleByDefault,
    } = req.body

    const entityType = await EntityType.findByPk(id)
    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }

    const canManage = await ensureManageAccess(req.user, entityType.world_id)
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

    const resolvedVisibleByDefault =
      visible_by_default !== undefined ? visible_by_default : visibleByDefault

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
        reference_type_id,
        reference_filter,
        visible_by_default: resolvedVisibleByDefault,
      })
    } catch (validationError) {
      return res.status(400).json({ success: false, message: validationError.message })
    }

    try {
      await ensureValidReferenceTarget(payload, entityType.world_id)
    } catch (referenceError) {
      return res.status(400).json({ success: false, message: referenceError.message })
    }

    try {
      const field = await EntityTypeField.create(payload)
      await field.reload({
        include: [
          { model: EntityType, as: 'referenceType', attributes: ['id', 'name', 'world_id'] },
        ],
      })
      return res.status(201).json({ success: true, data: mapFieldResponse(field) })
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
    const {
      name,
      label,
      data_type,
      options,
      required,
      default_value,
      sort_order,
      reference_type_id,
      reference_filter,
      visible_by_default,
      visibleByDefault,
    } = req.body

    const field = await EntityTypeField.findByPk(id)
    if (!field) {
      return res.status(404).json({ success: false, message: 'Field not found' })
    }

    const entityType = await EntityType.findByPk(field.entity_type_id)
    if (!entityType) {
      return res.status(404).json({ success: false, message: 'Entity type not found' })
    }

    const canManage = await ensureManageAccess(req.user, entityType.world_id)
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
      reference_type_id:
        reference_type_id !== undefined ? reference_type_id : field.reference_type_id,
      reference_filter:
        reference_filter !== undefined ? reference_filter : field.reference_filter,
      visible_by_default:
        visible_by_default !== undefined
          ? Boolean(visible_by_default)
          : visibleByDefault !== undefined
            ? Boolean(visibleByDefault)
            : field.visible_by_default,
    }

    let validated
    try {
      validated = validateFieldPayload({ id: field.id, ...updates, entity_type_id: field.entity_type_id })
    } catch (validationError) {
      return res.status(400).json({ success: false, message: validationError.message })
    }

    try {
      await ensureValidReferenceTarget(validated, entityType.world_id)
    } catch (referenceError) {
      return res.status(400).json({ success: false, message: referenceError.message })
    }

    await field.update(validated)
    await field.reload({
      include: [
        { model: EntityType, as: 'referenceType', attributes: ['id', 'name', 'world_id'] },
      ],
    })

    return res.json({ success: true, data: mapFieldResponse(field) })
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

    const canManage = await ensureManageAccess(req.user, entityType.world_id)
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    await field.destroy()

    return res.status(204).send()
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}
