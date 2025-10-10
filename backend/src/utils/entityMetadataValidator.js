function ensureObject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {}
  }
  return input
}

export function coerceValueForField(value, field, { isDefault = false } = {}) {
  const { data_type: dataType } = field
  if (value === undefined) return value
  if (value === null) return null

  switch (dataType) {
    case 'number': {
      if (value === '') return isDefault ? '' : value
      const numeric = Number(value)
      return Number.isNaN(numeric) ? value : numeric
    }
    case 'boolean': {
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') {
        const lower = value.toLowerCase()
        if (lower === 'true') return true
        if (lower === 'false') return false
      }
      if (typeof value === 'number') {
        return value !== 0
      }
      return value
    }
    case 'date': {
      if (value instanceof Date) {
        return value.toISOString()
      }
      return value
    }
    default:
      return value
  }
}

export function applyFieldDefaults(fields, metadata) {
  const source = ensureObject(metadata)
  const result = {}

  for (const field of fields) {
    const key = field.name
    let value = source[key]

    if (value === undefined || value === null || value === '') {
      if (field.default_value !== undefined && field.default_value !== null) {
        value = coerceValueForField(field.default_value, field, { isDefault: true })
      } else if (value === '') {
        value = ''
      } else {
        value = value ?? undefined
      }
    } else {
      value = coerceValueForField(value, field)
    }

    if (value !== undefined) {
      result[key] = value
    }
  }

  return result
}

export async function validateEntityMetadata(entityTypeId, metadata, models, providedFields) {
  const { EntityTypeField } = models
  const fields =
    providedFields ??
    (await EntityTypeField.findAll({
      where: { entity_type_id: entityTypeId },
      order: [
        ['sort_order', 'ASC'],
        ['name', 'ASC'],
      ],
    }))

  const errors = []
  const fieldNames = new Set(fields.map((field) => field.name))
  const payload = ensureObject(metadata)

  for (const key of Object.keys(payload)) {
    if (!fieldNames.has(key)) {
      errors.push(`${key} is not a valid field for this entity type`)
    }
  }

  for (const field of fields) {
    const value = payload[field.name]
    const label = field.label || field.name

    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`${label} is required`)
      continue
    }

    if (value === undefined || value === null || value === '') {
      continue
    }

    const coercedValue = coerceValueForField(value, field)

    if (field.data_type === 'number') {
      if (Number.isNaN(Number(coercedValue))) {
        errors.push(`${label} must be a number`)
      }
    }

    if (field.data_type === 'boolean') {
      if (typeof coercedValue !== 'boolean') {
        const validStrings = ['true', 'false']
        if (typeof value === 'string' && validStrings.includes(value.toLowerCase())) {
          // acceptable string representation
        } else if (typeof value === 'number' && (value === 0 || value === 1)) {
          // acceptable numeric representation
        } else {
          errors.push(`${label} must be a boolean`)
        }
      }
    }

    if (field.data_type === 'enum') {
      const choices = Array.isArray(field.options?.choices) ? field.options.choices : null
      if (choices && !choices.includes(value)) {
        errors.push(`${label} must be one of: ${choices.join(', ')}`)
      }
    }
  }

  if (errors.length) {
    throw new Error(errors.join(', '))
  }

  return fields
}
