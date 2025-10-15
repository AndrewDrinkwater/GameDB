const normaliseId = (value) => {
  if (value === undefined || value === null) return ''
  const trimmed = String(value).trim()
  return trimmed
}

export const computeFilterParams = ({
  direction = 'forward',
  lockedField = '',
  lockedEntityTypeId = '',
  selectedFromEntityTypeId = '',
  selectedToEntityTypeId = '',
} = {}) => {
  const resolvedDirection = direction === 'reverse' ? 'reverse' : 'forward'
  const resolvedLockedField = lockedField === 'from' || lockedField === 'to' ? lockedField : ''

  let fromRoleForTypes = 'from'
  let toRoleForTypes = 'to'

  if (resolvedDirection === 'reverse') {
    if (resolvedLockedField === 'to') {
      fromRoleForTypes = 'from'
      toRoleForTypes = 'to'
    } else {
      fromRoleForTypes = 'to'
      toRoleForTypes = 'from'
    }
  }

  const lockedTypeId = normaliseId(lockedEntityTypeId)
  const fromTypeId = normaliseId(selectedFromEntityTypeId)
  const toTypeId = normaliseId(selectedToEntityTypeId)

  let typeFilterContext = null

  if (lockedTypeId && resolvedLockedField) {
    const role = resolvedLockedField === 'to' ? toRoleForTypes : fromRoleForTypes
    typeFilterContext = { typeId: lockedTypeId, role }
  } else if (fromTypeId) {
    typeFilterContext = { typeId: fromTypeId, role: fromRoleForTypes }
  } else if (toTypeId) {
    typeFilterContext = { typeId: toTypeId, role: toRoleForTypes }
  }

  return {
    fromRoleForTypes,
    toRoleForTypes,
    typeFilterContext,
  }
}
