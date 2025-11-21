export const formatDateTimeValue = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : String(value)
  }
  return date.toLocaleString()
}

export const normaliseMetadataValue = (field) => {
  const value = field?.value
  if (value === null || value === undefined) return ''

  switch (field?.dataType) {
    case 'boolean':
      return Boolean(value)
    case 'number': {
      const num = Number(value)
      return Number.isNaN(num) ? value : num
    }
    case 'enum':
      if (typeof value === 'object' && value !== null) {
        return (
          value.value ??
          value.id ??
          value.key ??
          value.slug ??
          value.name ??
          ''
        )
      }
      return value
    case 'date':
      return formatDateTimeValue(value)
    case 'reference':
      if (typeof value === 'object' && value !== null) {
        const label =
          value.label ??
          value.name ??
          value.title ??
          value.display ??
          value.displayName ??
          value.text ??
          value.value ??
          value.id
        if (label === null || label === undefined) {
          try {
            return JSON.stringify(value, null, 2)
          } catch (err) {
            console.warn('⚠️ Failed to serialise reference metadata field', err)
            return String(value)
          }
        }
        return String(label)
      }
      return value
    case 'text':
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value, null, 2)
        } catch (err) {
          console.warn('⚠️ Failed to serialise text metadata field', err)
          return String(value)
        }
      }
      return value
    default:
      if (typeof value === 'object') {
        try {
          return JSON.stringify(value, null, 2)
        } catch (err) {
          console.warn('⚠️ Failed to serialise metadata field', err)
          return String(value)
        }
      }
      return value
  }
}

export const initialMetadataValue = (field) => {
  const value = field?.value
  if (value === null || value === undefined) {
    if (field?.dataType === 'boolean') return false
    return ''
  }

  if (field?.dataType === 'boolean') {
    return Boolean(value)
  }

  if (field?.dataType === 'reference') {
    if (typeof value === 'object' && value !== null) {
      return (
        value.value ??
        value.id ??
        value.key ??
        value.slug ??
        value.uuid ??
        ''
      )
    }
  }

  return value
}

export const buildMetadataViewMap = (fields = []) => {
  if (!Array.isArray(fields) || fields.length === 0) {
    return {}
  }

  return fields.reduce((acc, field) => {
    if (!field?.name) return acc
    acc[field.name] = normaliseMetadataValue(field)
    return acc
  }, {})
}

export const buildMetadataInitialMap = (fields = []) => {
  if (!Array.isArray(fields) || fields.length === 0) {
    return {}
  }

  return fields.reduce((acc, field) => {
    if (!field?.name) return acc
    acc[field.name] = initialMetadataValue(field)
    return acc
  }, {})
}

export const buildMetadataDisplayMap = (fields = []) => {
  if (!Array.isArray(fields) || fields.length === 0) {
    return {}
  }

  return fields.reduce((acc, field) => {
    if (!field?.name) return acc
    if (field.dataType !== 'reference') return acc

    const label = (() => {
      if (field.displayValue) return field.displayValue
      if (field.display) return field.display
      if (field.selectedLabel) return field.selectedLabel

      const value = field.value
      if (!value || typeof value !== 'object') return null

      return (
        value.label ??
        value.name ??
        value.title ??
        value.display ??
        value.displayName ??
        value.text ??
        value.value ??
        value.id ??
        null
      )
    })()

    if (label === undefined || label === null) return acc
    acc[field.name] = String(label)
    return acc
  }, {})
}

/**
 * Extracts entity ID from a reference field value.
 * Handles strings, numbers, objects with ID properties, and arrays.
 * @param {any} value - The reference field value
 * @returns {string|null} - The extracted entity ID, or null if not found
 */
export const extractReferenceEntityId = (value) => {
  if (value === null || value === undefined || value === '') return null

  // If it's a string or number, treat it as an ID
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value)
  }

  // If it's an object, try to extract the id property
  if (typeof value === 'object' && !Array.isArray(value)) {
    const id =
      value.id ??
      value.value ??
      value.entity_id ??
      value.entityId ??
      value.key ??
      value.slug ??
      value.uuid ??
      null
    if (id !== null && id !== undefined) {
      const idStr = String(id).trim()
      return idStr.length > 0 ? idStr : null
    }
    return null
  }

  // If it's an array, extract the first valid ID
  if (Array.isArray(value)) {
    for (const item of value) {
      const extracted = extractReferenceEntityId(item)
      if (extracted) return extracted
    }
    return null
  }

  return null
}

/**
 * Extracts entity name/label from a reference field value.
 * @param {any} value - The reference field value
 * @returns {string|null} - The extracted entity name/label, or null if not found
 */
export const extractReferenceEntityName = (value) => {
  if (value === null || value === undefined) return null

  // If it's an object, try to extract label/name properties
  if (typeof value === 'object' && !Array.isArray(value)) {
    const label =
      value.displayValue ??
      value.display ??
      value.label ??
      value.name ??
      value.title ??
      value.displayName ??
      value.text ??
      null

    if (label !== null && label !== undefined) {
      const labelStr = String(label).trim()
      return labelStr.length > 0 ? labelStr : null
    }
    return null
  }

  // If it's an array, extract the first valid label
  if (Array.isArray(value)) {
    for (const item of value) {
      const extracted = extractReferenceEntityName(item)
      if (extracted) return extracted
    }
    return null
  }

  return null
}