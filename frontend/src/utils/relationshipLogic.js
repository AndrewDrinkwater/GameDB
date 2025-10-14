const normaliseTypeId = (entry) => {
  if (!entry) return ''

  if (typeof entry === 'string' || typeof entry === 'number') {
    const trimmed = String(entry).trim()
    return trimmed
  }

  if (typeof entry === 'object') {
    if (entry.entity_type_id !== undefined && entry.entity_type_id !== null)
      return String(entry.entity_type_id)
    if (entry.entityTypeId !== undefined && entry.entityTypeId !== null)
      return String(entry.entityTypeId)
    if (entry.id !== undefined && entry.id !== null) return String(entry.id)
    if (entry.entityType?.id !== undefined && entry.entityType?.id !== null)
      return String(entry.entityType.id)
    if (entry.entity_type?.id !== undefined && entry.entity_type?.id !== null)
      return String(entry.entity_type.id)
  }

  return ''
}

export const resolveRuleId = (entry) => normaliseTypeId(entry)

export const getEntityTypeEntriesForRole = (relationshipType, role) => {
  if (!relationshipType) return []
  const rawList =
    role === 'from'
      ? relationshipType?.from_entity_types ?? relationshipType?.fromEntityTypes ?? relationshipType?.fromTypes
      : relationshipType?.to_entity_types ?? relationshipType?.toEntityTypes ?? relationshipType?.toTypes

  if (!Array.isArray(rawList)) return []
  return rawList
}

export const getEntityTypeIdsForRole = (relationshipType, role) =>
  getEntityTypeEntriesForRole(relationshipType, role)
    .map((entry) => resolveRuleId(entry))
    .filter((value) => value !== '')

export const normaliseEntityTypeId = (entity) => {
  if (!entity) return ''

  if (typeof entity === 'string' || typeof entity === 'number') {
    const trimmed = String(entity).trim()
    return trimmed
  }

  if (typeof entity === 'object') {
    if (entity.entity_type_id !== undefined && entity.entity_type_id !== null)
      return String(entity.entity_type_id)
    if (entity.entityTypeId !== undefined && entity.entityTypeId !== null)
      return String(entity.entityTypeId)
    if (entity.id !== undefined && entity.id !== null) return String(entity.id)
    if (entity.entityType?.id !== undefined && entity.entityType?.id !== null)
      return String(entity.entityType.id)
    if (entity.entity_type?.id !== undefined && entity.entity_type?.id !== null)
      return String(entity.entity_type.id)
  }

  return ''
}

const includesOrUnrestricted = (ids, targetId) => {
  if (!targetId) return true
  if (!ids.length) return true
  return ids.includes(targetId)
}

export function getValidRelationshipTypes({
  relationshipTypes = [],
  sourceType,
  targetType,
  sourceRole = 'from',
  targetRole = 'to',
  filterType,
  filterRole,
} = {}) {
  if (!Array.isArray(relationshipTypes) || relationshipTypes.length === 0) return []

  const sourceTypeId = normaliseEntityTypeId(sourceType)
  const targetTypeId = normaliseEntityTypeId(targetType)
  const filterTypeId = normaliseEntityTypeId(filterType)

  return relationshipTypes.filter((relationshipType) => {
    if (!relationshipType) return false

    if (filterTypeId) {
      const idsForFilterRole = getEntityTypeIdsForRole(relationshipType, filterRole || 'from')
      if (!includesOrUnrestricted(idsForFilterRole, filterTypeId)) {
        return false
      }
    }

    const sourceIds = getEntityTypeIdsForRole(relationshipType, sourceRole || 'from')
    const targetIds = getEntityTypeIdsForRole(relationshipType, targetRole || 'to')

    const sourceAllowed = includesOrUnrestricted(sourceIds, sourceTypeId)
    const targetAllowed = includesOrUnrestricted(targetIds, targetTypeId)

    return sourceAllowed && targetAllowed
  })
}

const arraysShareValues = (a = [], b = []) => {
  if (!a.length || !b.length) return true
  return a.some((value) => b.includes(value))
}

const listsMatch = (a = [], b = []) => {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((value, index) => value === sortedB[index])
}

export function getDirectionalConfig({ relationshipType, sourceEntity, targetEntity } = {}) {
  if (!relationshipType) {
    return {
      direction: 'forward',
      sourceRole: 'from',
      targetRole: 'to',
      canFlip: true,
      isAmbiguous: true,
    }
  }

  const sourceTypeId = normaliseEntityTypeId(sourceEntity)
  const targetTypeId = normaliseEntityTypeId(targetEntity)

  const fromIds = getEntityTypeIdsForRole(relationshipType, 'from')
  const toIds = getEntityTypeIdsForRole(relationshipType, 'to')

  const forwardAllowed = includesOrUnrestricted(fromIds, sourceTypeId) && includesOrUnrestricted(toIds, targetTypeId)
  const reverseAllowed = includesOrUnrestricted(fromIds, targetTypeId) && includesOrUnrestricted(toIds, sourceTypeId)

  if (!sourceTypeId || !targetTypeId) {
    const canFlip = forwardAllowed && reverseAllowed
    const isAmbiguous = !sourceTypeId || !targetTypeId || canFlip
    return {
      direction: 'forward',
      sourceRole: 'from',
      targetRole: 'to',
      canFlip,
      isAmbiguous,
    }
  }

  if (forwardAllowed && !reverseAllowed) {
    return {
      direction: 'forward',
      sourceRole: 'from',
      targetRole: 'to',
      canFlip: false,
      isAmbiguous: false,
    }
  }

  if (!forwardAllowed && reverseAllowed) {
    return {
      direction: 'reverse',
      sourceRole: 'to',
      targetRole: 'from',
      canFlip: false,
      isAmbiguous: false,
    }
  }

  const symmetric = listsMatch(fromIds, toIds)
  const canFlip = forwardAllowed || reverseAllowed || symmetric || arraysShareValues(fromIds, toIds)

  return {
    direction: forwardAllowed ? 'forward' : reverseAllowed ? 'reverse' : 'forward',
    sourceRole: 'from',
    targetRole: 'to',
    canFlip,
    isAmbiguous: true,
  }
}

