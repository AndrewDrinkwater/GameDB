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
