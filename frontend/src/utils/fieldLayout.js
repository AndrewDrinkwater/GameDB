const normaliseLookupKey = (value) => {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed ? trimmed.toLowerCase() : null
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      for (const entry of value) {
        const resolved = normaliseLookupKey(entry)
        if (resolved) return resolved
      }
      return null
    }
    return (
      normaliseLookupKey(value.fieldKey ?? value.field_key ?? value.key ?? value.name ?? value.id) ??
      null
    )
  }
  return null
}

const registerIdentifier = (set, value) => {
  const key = normaliseLookupKey(value)
  if (key) {
    set.add(key)
  }
}

const extractFieldIdentifiers = (field) => {
  if (!field || typeof field !== 'object') return []

  const identifiers = new Set()
  registerIdentifier(identifiers, field.id)
  registerIdentifier(identifiers, field.field_id)
  registerIdentifier(identifiers, field.entity_type_field_id)
  registerIdentifier(identifiers, field.fieldId)
  registerIdentifier(identifiers, field.name)
  registerIdentifier(identifiers, field.key)
  registerIdentifier(identifiers, field.field)
  registerIdentifier(identifiers, field.metadataField)
  registerIdentifier(identifiers, field.metadata_field)

  if (field?.sourceField) {
    registerIdentifier(identifiers, field.sourceField)
  }
  if (field?.source_field) {
    registerIdentifier(identifiers, field.source_field)
  }

  return Array.from(identifiers)
}

const normaliseFieldOrderEntries = (entries) => {
  if (!Array.isArray(entries)) return []

  return entries
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') return null
      const identifiers = new Set()

      registerIdentifier(identifiers, entry.fieldKey)
      registerIdentifier(identifiers, entry.field_key)
      registerIdentifier(identifiers, entry.field)
      registerIdentifier(identifiers, entry.fieldName)
      registerIdentifier(identifiers, entry.field_name)
      registerIdentifier(identifiers, entry.fieldId)
      registerIdentifier(identifiers, entry.field_id)
      registerIdentifier(identifiers, entry.target)
      registerIdentifier(identifiers, entry.targetField)
      registerIdentifier(identifiers, entry.target_field)
      registerIdentifier(identifiers, entry.metadataField)
      registerIdentifier(identifiers, entry.metadata_field)
      registerIdentifier(identifiers, entry.entity_type_field_id)
      registerIdentifier(identifiers, entry.name)
      registerIdentifier(identifiers, entry.key)

      if (entry.field && typeof entry.field === 'object') {
        registerIdentifier(identifiers, entry.field.id)
        registerIdentifier(identifiers, entry.field.name)
        registerIdentifier(identifiers, entry.field.key)
      }

      if (!identifiers.size) return null

      const toNumber = (value, fallback = 0) => {
        if (value === undefined || value === null || value === '') {
          return fallback
        }
        const num = Number(value)
        return Number.isFinite(num) ? num : fallback
      }

      const sectionOrder = toNumber(
        entry.sectionOrder ?? entry.section_order ?? entry.sectionIndex ?? entry.section_index,
        0,
      )
      const columnOrder = toNumber(
        entry.column ?? entry.columnOrder ?? entry.column_index ?? entry.columnIndex,
        0,
      )
      const fieldPosition = toNumber(
        entry.fieldOrder ??
          entry.field_order ??
          entry.order ??
          entry.order_index ??
          entry.position ??
          entry.sortOrder ??
          entry.sort_order,
        index,
      )
      const priority = toNumber(entry.priority ?? entry.weight ?? entry.rank, index)

      const rank = sectionOrder * 1_000_000 + columnOrder * 10_000 + fieldPosition * 100 + priority

      return {
        identifiers: Array.from(identifiers),
        rank,
        sectionOrder,
        columnOrder,
        fieldPosition,
        priority,
      }
    })
    .filter(Boolean)
}

export const sortFieldsByOrder = (fields = [], fieldOrder = []) => {
  if (!Array.isArray(fields) || fields.length === 0) {
    return []
  }

  const normalisedOrder = normaliseFieldOrderEntries(fieldOrder)
  const rankLookup = new Map()

  if (normalisedOrder.length > 0) {
    normalisedOrder.forEach((entry) => {
      entry.identifiers.forEach((identifier) => {
        if (!rankLookup.has(identifier)) {
          rankLookup.set(identifier, entry.rank)
        }
      })
    })
  }

  const toNumber = (value, fallback) => {
    if (value === undefined || value === null || value === '') {
      return fallback
    }
    const num = Number(value)
    return Number.isFinite(num) ? num : fallback
  }

  const decorated = fields.map((field, index) => {
    const identifiers = extractFieldIdentifiers(field)
    let rank = Number.POSITIVE_INFINITY

    identifiers.forEach((identifier) => {
      if (!identifier) return
      const value = rankLookup.get(identifier)
      if (value !== undefined && value < rank) {
        rank = value
      }
    })

    const fallbackSort = toNumber(field?.sortOrder ?? field?.sort_order, index)

    return {
      field,
      rank,
      fallbackSort,
      index,
    }
  })

  decorated.sort((a, b) => {
    const aRankValid = Number.isFinite(a.rank)
    const bRankValid = Number.isFinite(b.rank)

    if (aRankValid && bRankValid && a.rank !== b.rank) {
      return a.rank - b.rank
    }

    if (aRankValid && !bRankValid) return -1
    if (!aRankValid && bRankValid) return 1

    if (a.fallbackSort !== b.fallbackSort) {
      return a.fallbackSort - b.fallbackSort
    }

    return a.index - b.index
  })

  return decorated.map((entry) => entry.field)
}

export default sortFieldsByOrder
