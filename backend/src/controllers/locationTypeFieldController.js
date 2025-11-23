import { LocationType, LocationTypeField, EntityType } from '../models/index.js'
import { coerceValueForField } from '../utils/entityMetadataValidator.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'

const FIELD_ORDER = [
  ['sort_order', 'ASC'],
  ['name', 'ASC'],
]

const ALLOWED_TYPES = new Set(['string', 'number', 'boolean', 'text', 'date', 'enum', 'entity_reference', 'location_reference'])

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

  if (payload.data_type === 'entity_reference' || payload.data_type === 'location_reference') {
    if (!trimmedReferenceTypeId) {
      throw new Error(`${payload.data_type === 'entity_reference' ? 'Entity' : 'Location'} reference fields require a reference_type_id`)
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
    visible_by_default: visibleByDefault,
    reference_type_id: (payload.data_type === 'entity_reference' || payload.data_type === 'location_reference') ? trimmedReferenceTypeId : null,
    reference_filter: (payload.data_type === 'entity_reference' || payload.data_type === 'location_reference') ? referenceFilter : {},
  }
}

const ensureValidReferenceTarget = async (payload, worldId) => {
  if (payload.data_type !== 'entity_reference' && payload.data_type !== 'location_reference') {
    return
  }

  if (!payload.reference_type_id) {
    throw new Error(`${payload.data_type === 'entity_reference' ? 'Entity' : 'Location'} reference fields require a reference_type_id`)
  }

  if (payload.data_type === 'entity_reference') {
    const referenceType = await EntityType.findByPk(payload.reference_type_id)
    if (!referenceType) {
      throw new Error('Reference entity type not found')
    }

    if (worldId && referenceType.world_id && referenceType.world_id !== worldId) {
      throw new Error('Reference entity type must belong to the same world')
    }
  } else if (payload.data_type === 'location_reference') {
    const referenceType = await LocationType.findByPk(payload.reference_type_id)
    if (!referenceType) {
      throw new Error('Reference location type not found')
    }

    if (worldId && referenceType.world_id && referenceType.world_id !== worldId) {
      throw new Error('Reference location type must belong to the same world')
    }
  }
}

const mapFieldResponse = (field) => {
  const plain = field.toJSON ? field.toJSON() : field
  const entityReferenceType = plain.entityReferenceType
  const locationReferenceType = plain.locationReferenceType
  
  let referenceType = null
  if (entityReferenceType) {
    referenceType = {
      id: entityReferenceType.id,
      name: entityReferenceType.name,
      world_id: entityReferenceType.world_id,
    }
  } else if (locationReferenceType) {
    referenceType = {
      id: locationReferenceType.id,
      name: locationReferenceType.name,
      world_id: locationReferenceType.world_id,
    }
  }

  return {
    id: plain.id,
    name: plain.name,
    label: plain.label,
    data_type: plain.data_type,
    dataType: plain.data_type,
    options: plain.options || {},
    required: Boolean(plain.required),
    default_value: plain.default_value,
    defaultValue: plain.default_value,
    sort_order: plain.sort_order,
    sortOrder: plain.sort_order,
    visible_by_default: Boolean(plain.visible_by_default),
    visibleByDefault: Boolean(plain.visible_by_default),
    reference_type_id: plain.reference_type_id,
    referenceTypeId: plain.reference_type_id,
    reference_filter: plain.reference_filter || {},
    referenceFilter: plain.reference_filter || {},
    referenceType,
  }
}

export const listLocationTypeFields = async (req, res) => {
  try {
    const { id } = req.params

    const locationType = await LocationType.findByPk(id)

    if (!locationType) {
      return res.status(404).json({ success: false, message: 'Location type not found' })
    }

    const worldId = locationType.world_id

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

    const fields = await LocationTypeField.findAll({
      where: { location_type_id: id },
      include: [
        {
          model: EntityType,
          as: 'entityReferenceType',
          attributes: ['id', 'name', 'world_id'],
          required: false,
        },
        {
          model: LocationType,
          as: 'locationReferenceType',
          attributes: ['id', 'name', 'world_id'],
          required: false,
        },
      ],
      order: FIELD_ORDER,
    })

    res.json({ success: true, data: fields.map(mapFieldResponse) })
  } catch (error) {
    console.error('Error listing location type fields:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

export const createLocationTypeField = async (req, res) => {
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

    const locationType = await LocationType.findByPk(id)
    if (!locationType) {
      return res.status(404).json({ success: false, message: 'Location type not found' })
    }

    const canManage = await ensureManageAccess(req.user, locationType.world_id)
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
        location_type_id: id,
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
      await ensureValidReferenceTarget(payload, locationType.world_id)
    } catch (referenceError) {
      return res.status(400).json({ success: false, message: referenceError.message })
    }

    try {
      const field = await LocationTypeField.create(payload)
      await field.reload({
        include: [
          { model: EntityType, as: 'entityReferenceType', attributes: ['id', 'name', 'world_id'], required: false },
          { model: LocationType, as: 'locationReferenceType', attributes: ['id', 'name', 'world_id'], required: false },
        ],
      })
      return res.status(201).json({ success: true, data: mapFieldResponse(field) })
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res
          .status(409)
          .json({ success: false, message: 'A field with this name already exists for the location type' })
      }
      throw error
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const updateLocationTypeField = async (req, res) => {
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

    const field = await LocationTypeField.findByPk(id, {
      include: [
        {
          model: LocationType,
          as: 'locationType',
          attributes: ['id', 'world_id'],
        },
      ],
    })

    if (!field) {
      return res.status(404).json({ success: false, message: 'Location type field not found' })
    }

    const canManage = await ensureManageAccess(req.user, field.locationType.world_id)
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    const updates = {}

    if (name !== undefined) {
      const trimmedName = name?.trim()
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: 'name cannot be empty' })
      }
      updates.name = trimmedName
    }

    if (label !== undefined) {
      updates.label = label?.trim() || null
    }

    if (data_type !== undefined) {
      if (!ALLOWED_TYPES.has(data_type)) {
        return res.status(400).json({ success: false, message: 'Invalid data_type value' })
      }
      updates.data_type = data_type
    }

    if (options !== undefined) {
      try {
        updates.options = normaliseOptions(options)
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message })
      }
    }

    if (required !== undefined) {
      updates.required = Boolean(required)
    }

    if (default_value !== undefined) {
      updates.default_value = default_value || null
    }

    if (sort_order !== undefined) {
      const parsed = Number(sort_order)
      if (Number.isNaN(parsed)) {
        return res.status(400).json({ success: false, message: 'sort_order must be a number' })
      }
      updates.sort_order = parsed
    }

    if (reference_type_id !== undefined) {
      updates.reference_type_id = reference_type_id?.trim() || null
    }

    if (reference_filter !== undefined) {
      try {
        updates.reference_filter = normaliseReferenceFilter(reference_filter)
      } catch (error) {
        return res.status(400).json({ success: false, message: error.message })
      }
    }

    if (visible_by_default !== undefined || visibleByDefault !== undefined) {
      updates.visible_by_default = Boolean(visible_by_default ?? visibleByDefault)
    }

    const finalPayload = {
      ...updates,
      location_type_id: field.location_type_id,
    }

    try {
      const validated = validateFieldPayload(finalPayload)
      await ensureValidReferenceTarget(validated, field.locationType.world_id)
    } catch (validationError) {
      return res.status(400).json({ success: false, message: validationError.message })
    }

    await field.update(updates)
    await field.reload({
      include: [
        { model: LocationType, as: 'referenceType', attributes: ['id', 'name', 'world_id'] },
      ],
    })

    res.json({ success: true, data: mapFieldResponse(field) })
  } catch (error) {
    console.error('Error updating location type field:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteLocationTypeField = async (req, res) => {
  try {
    const { id } = req.params

    const field = await LocationTypeField.findByPk(id, {
      include: [
        {
          model: LocationType,
          as: 'locationType',
          attributes: ['id', 'world_id'],
        },
      ],
    })

    if (!field) {
      return res.status(404).json({ success: false, message: 'Location type field not found' })
    }

    const canManage = await ensureManageAccess(req.user, field.locationType.world_id)
    if (!canManage) {
      return res.status(403).json({ success: false, message: 'Forbidden' })
    }

    await field.destroy()

    res.json({ success: true, message: 'Location type field deleted successfully' })
  } catch (error) {
    console.error('Error deleting location type field:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

