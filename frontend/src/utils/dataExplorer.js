const NORMALISED_TYPES = {
  text: 'string',
  string: 'string',
  varchar: 'string',
  number: 'number',
  integer: 'number',
  float: 'number',
  decimal: 'number',
  numeric: 'number',
  boolean: 'boolean',
  bool: 'boolean',
  checkbox: 'boolean',
  date: 'date',
  datetime: 'date',
  timestamp: 'date',
}

export const OPERATOR_CONFIG = {
  string: [
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: "doesn't contain" },
    { value: 'equals', label: 'is exactly' },
    { value: 'not_equals', label: 'is not' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
  ],
  number: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
    { value: 'greater_than', label: 'is greater than' },
    { value: 'less_than', label: 'is less than' },
    { value: 'greater_or_equal', label: 'is on or above' },
    { value: 'less_or_equal', label: 'is on or below' },
  ],
  boolean: [
    { value: 'is_true', label: 'is true' },
    { value: 'is_false', label: 'is false' },
  ],
  date: [
    { value: 'on', label: 'is on' },
    { value: 'before', label: 'is before' },
    { value: 'after', label: 'is after' },
    { value: 'on_or_before', label: 'is on or before' },
    { value: 'on_or_after', label: 'is on or after' },
  ],
}

export const DEFAULT_FILTER_CONFIG = {
  logic: 'AND',
  conditions: [],
}

export const normaliseDataType = (value) => {
  if (!value) return 'string'
  const lowered = String(value).toLowerCase()
  return NORMALISED_TYPES[lowered] || 'string'
}

export const getOperatorsForType = (dataType) => {
  const normalised = normaliseDataType(dataType)
  return OPERATOR_CONFIG[normalised] || OPERATOR_CONFIG.string
}

export const formatValueForDisplay = (value, dataType = 'string') => {
  if (value === null || value === undefined || value === '') {
    return 'Unassigned'
  }

  const normalised = normaliseDataType(dataType)

  if (Array.isArray(value)) {
    return value.length ? value.map((item) => formatValueForDisplay(item, dataType)).join(', ') : 'Unassigned'
  }

  if (normalised === 'date') {
    const date = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    return date.toLocaleDateString()
  }

  if (normalised === 'boolean') {
    return value ? 'True' : 'False'
  }

  return String(value)
}

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isNaN(num) ? null : num
}

const toDate = (value) => {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Extracts entity ID from a reference field value.
 * Handles both string IDs and objects with id properties.
 * @param {any} value - The reference field value (string ID, object with id, or array)
 * @returns {string|null} - The extracted ID as a string, or null if not found
 */
const extractReferenceId = (value) => {
  if (value === null || value === undefined || value === '') return null
  
  // If it's already a string, return it (assuming it's an ID)
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  
  // If it's an object, try to extract the id property
  if (typeof value === 'object' && !Array.isArray(value)) {
    const id = value.id ?? value.value ?? value.key ?? value.slug ?? value.uuid ?? null
    if (id !== null && id !== undefined) {
      return String(id).trim()
    }
    return null
  }
  
  // If it's an array, extract the first valid ID
  if (Array.isArray(value)) {
    for (const item of value) {
      const extracted = extractReferenceId(item)
      if (extracted) return extracted
    }
    return null
  }
  
  return null
}

const normaliseForSearch = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.toLowerCase()
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value instanceof Date) return value.toISOString().toLowerCase()
  if (Array.isArray(value)) {
    return value.map((item) => normaliseForSearch(item)).filter(Boolean).join(' ')
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value).toLowerCase()
    } catch {
      return ''
    }
  }
  return String(value).toLowerCase()
}

export const createSearchMatcher = (term) => {
  const lowered = term.trim().toLowerCase()
  if (!lowered) return () => true
  return (value) => normaliseForSearch(value).includes(lowered)
}

const compareStrings = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })

export const compareValues = (a, b, dataType = 'string') => {
  const normalised = normaliseDataType(dataType)
  const aIsEmpty = a === null || a === undefined || a === ''
  const bIsEmpty = b === null || b === undefined || b === ''

  if (aIsEmpty && bIsEmpty) return 0
  if (aIsEmpty) return 1
  if (bIsEmpty) return -1

  if (normalised === 'number') {
    const numA = toNumber(a)
    const numB = toNumber(b)
    if (numA === null && numB === null) return 0
    if (numA === null) return 1
    if (numB === null) return -1
    return numA - numB
  }

  if (normalised === 'date') {
    const dateA = toDate(a)
    const dateB = toDate(b)
    if (!dateA && !dateB) return 0
    if (!dateA) return 1
    if (!dateB) return -1
    return dateA.getTime() - dateB.getTime()
  }

  if (normalised === 'boolean') {
    const boolA = !!a
    const boolB = !!b
    if (boolA === boolB) return 0
    return boolA ? -1 : 1
  }

  return compareStrings(String(a), String(b))
}

export const evaluateCondition = (value, condition, dataType = 'string') => {
  const { operator, value: targetValue } = condition
  const normalised = normaliseDataType(dataType)
  
  // Check if this is a reference field - check original dataType before normalization
  // since 'reference' normalizes to 'string'
  const isReference = dataType && String(dataType).toLowerCase() === 'reference'

  const evaluateSingle = (candidate) => {
    // Handle reference fields specially - extract IDs before comparison
    if (isReference) {
      const candidateId = extractReferenceId(candidate)
      const targetId = extractReferenceId(targetValue) || String(targetValue ?? '').trim()
      const candidateIdStr = candidateId ? String(candidateId).toLowerCase() : ''
      const targetIdStr = targetId ? String(targetId).toLowerCase() : ''
      
      switch (operator) {
        case 'equals':
          return candidateIdStr === targetIdStr && candidateIdStr.length > 0
        case 'not_equals':
          return candidateIdStr !== targetIdStr || candidateIdStr.length === 0
        case 'contains':
          return candidateIdStr.includes(targetIdStr)
        case 'not_contains':
          return !candidateIdStr.includes(targetIdStr)
        default:
          // For other operators, fall through to string comparison
          break
      }
    }
    
    if (normalised === 'number') {
      const left = toNumber(candidate)
      const right = toNumber(targetValue)
      if (left === null && right === null) return operator === 'equals'
      if (left === null || right === null) return false
      switch (operator) {
        case 'equals':
          return left === right
        case 'not_equals':
          return left !== right
        case 'greater_than':
          return left > right
        case 'less_than':
          return left < right
        case 'greater_or_equal':
          return left >= right
        case 'less_or_equal':
          return left <= right
        default:
          return false
      }
    }

    if (normalised === 'date') {
      const left = toDate(candidate)
      const right = toDate(targetValue)
      if (!left || !right) return false
      switch (operator) {
        case 'on':
          return (
            left.getFullYear() === right.getFullYear() &&
            left.getMonth() === right.getMonth() &&
            left.getDate() === right.getDate()
          )
        case 'before':
          return left.getTime() < right.getTime()
        case 'after':
          return left.getTime() > right.getTime()
        case 'on_or_before':
          return left.getTime() <= right.getTime()
        case 'on_or_after':
          return left.getTime() >= right.getTime()
        default:
          return false
      }
    }

    if (normalised === 'boolean') {
      const boolValue = !!candidate
      if (operator === 'is_true') return boolValue === true
      if (operator === 'is_false') return boolValue === false
      if (operator === 'equals') return boolValue === (String(targetValue).toLowerCase() === 'true')
      if (operator === 'not_equals') return boolValue !== (String(targetValue).toLowerCase() === 'true')
      return false
    }

    const left = String(candidate ?? '')
    const right = String(targetValue ?? '')
    const leftLower = left.toLowerCase()
    const rightLower = right.toLowerCase()

    switch (operator) {
      case 'contains':
        return leftLower.includes(rightLower)
      case 'not_contains':
        return !leftLower.includes(rightLower)
      case 'equals':
        return leftLower === rightLower
      case 'not_equals':
        return leftLower !== rightLower
      case 'starts_with':
        return leftLower.startsWith(rightLower)
      case 'ends_with':
        return leftLower.endsWith(rightLower)
      default:
        return false
    }
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return evaluateSingle('')
    if (operator === 'not_contains') {
      return value.every((item) => !evaluateSingle(item))
    }
    return value.some((item) => evaluateSingle(item))
  }

  return evaluateSingle(value)
}

export const hasActiveFilters = (config) => {
  if (!config || typeof config !== 'object') return false
  const { conditions } = config
  if (!Array.isArray(conditions)) return false
  return conditions.some((condition) => condition.field && condition.operator)
}

export const getInitialCondition = (fieldKey = '', dataType = 'string') => ({
  id: `condition-${Math.random().toString(36).slice(2)}`,
  field: fieldKey,
  operator: getOperatorsForType(dataType)[0]?.value || 'equals',
  value: '',
})

export default {
  normaliseDataType,
  getOperatorsForType,
  formatValueForDisplay,
  compareValues,
  evaluateCondition,
  hasActiveFilters,
  getInitialCondition,
  DEFAULT_FILTER_CONFIG,
  createSearchMatcher,
}
