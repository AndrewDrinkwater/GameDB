const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const toArray = (input) => {
  if (Array.isArray(input)) return input
  if (input === undefined || input === null) return []
  return [input]
}

const normaliseFieldKeyInput = (input) => {
  if (input === undefined || input === null) return null
  if (typeof input === 'string') {
    const trimmed = input.trim()
    return trimmed || null
  }
  if (typeof input === 'number') {
    return String(input)
  }
  if (isPlainObject(input)) {
    return (
      normaliseFieldKeyInput(
        input.field ??
          input.fieldKey ??
          input.field_name ??
          input.source ??
          input.sourceField ??
          input.source_field ??
          input.key ??
          input.name ??
          input.target ??
          input.targetField ??
          input.target_field ??
          input.metadataField ??
          input.metadata_field ??
          input.id,
      ) ?? null
    )
  }
  return null
}

const OPERATOR_ALIASES = {
  eq: 'equals',
  '=': 'equals',
  '==': 'equals',
  '===': 'equals',
  equals: 'equals',
  equal: 'equals',
  match: 'equals',
  matches: 'equals',
  ne: 'not_equals',
  '!=': 'not_equals',
  '!==': 'not_equals',
  not: 'not_equals',
  notequals: 'not_equals',
  not_equals: 'not_equals',
  different: 'not_equals',
  contains: 'contains',
  includes: 'contains',
  has: 'contains',
  not_contains: 'not_contains',
  excludes: 'not_contains',
  notincludes: 'not_contains',
  in: 'in',
  any: 'in',
  within: 'in',
  not_in: 'not_in',
  none: 'not_in',
  outside: 'not_in',
  gt: 'gt',
  greater: 'gt',
  greater_than: 'gt',
  gte: 'gte',
  ge: 'gte',
  greater_or_equal: 'gte',
  lt: 'lt',
  less: 'lt',
  less_than: 'lt',
  lte: 'lte',
  le: 'lte',
  less_or_equal: 'lte',
  is_set: 'is_set',
  isset: 'is_set',
  set: 'is_set',
  exists: 'is_set',
  present: 'is_set',
  is_not_set: 'is_not_set',
  notset: 'is_not_set',
  missing: 'is_not_set',
  empty: 'is_empty',
  is_empty: 'is_empty',
  not_empty: 'is_not_empty',
  filled: 'is_not_empty',
  truthy: 'truthy',
  falsy: 'falsy',
}

const normaliseOperator = (value) => {
  if (value === undefined || value === null) return 'equals'
  const key = String(value).trim().toLowerCase()
  return OPERATOR_ALIASES[key] ?? 'equals'
}

const MATCH_ALIASES = {
  all: 'all',
  every: 'all',
  and: 'all',
  any: 'any',
  some: 'any',
  or: 'any',
  either: 'any',
  none: 'none',
  not: 'none',
}

const normaliseMatchMode = (value) => {
  if (value === undefined || value === null) return 'all'
  const key = String(value).trim().toLowerCase()
  return MATCH_ALIASES[key] ?? 'all'
}

const ACTION_ALIASES = {
  show: 'show',
  display: 'show',
  reveal: 'show',
  visible: 'show',
  enable: 'show',
  hide: 'hide',
  remove: 'hide',
  conceal: 'hide',
  hidden: 'hide',
  disable: 'hide',
  require: 'require',
  required: 'require',
  mandatory: 'require',
  optional: 'optional',
  option: 'optional',
  allow: 'optional',
}

const normaliseActionType = (value) => {
  if (value === undefined || value === null) return null
  const key = String(value).trim().toLowerCase()
  return ACTION_ALIASES[key] ?? null
}

const normaliseConditionEntry = (entry, index = 0) => {
  if (!entry) return null
  if (!isPlainObject(entry)) {
    if (typeof entry === 'string') {
      const [fieldPart, ...valueParts] = entry.split('=')
      const fieldKey = normaliseFieldKeyInput(fieldPart)
      if (!fieldKey) return null
      const value = valueParts.join('=').trim()
      const values = value ? [value] : []
      return { field: fieldKey, operator: 'equals', values }
    }
    return null
  }

  const fieldKey = normaliseFieldKeyInput(
    entry.field ??
      entry.fieldKey ??
      entry.field_name ??
      entry.source ??
      entry.sourceField ??
      entry.source_field ??
      entry.input ??
      entry.left ??
      entry.property ??
      entry.key ??
      entry.name,
  )

  if (!fieldKey) return null

  const operator = normaliseOperator(entry.operator ?? entry.comparator ?? entry.condition ?? entry.type)
  const rawValues = entry.values ?? entry.value ?? entry.match ?? entry.compareTo ?? entry.matchValue ?? entry.expected
  const values = toArray(rawValues).filter((item) => item !== undefined)

  return { field: fieldKey, operator, values, id: entry.id ?? `condition-${index}` }
}

const normaliseRuleConditions = (rule) => {
  const possibleKeys = ['conditions', 'criteria', 'when', 'rules', 'predicates', 'matchers']
  for (const key of possibleKeys) {
    if (Array.isArray(rule?.[key])) {
      return rule[key].map((condition, index) => normaliseConditionEntry(condition, index)).filter(Boolean)
    }
  }

  const fallback = normaliseConditionEntry(rule, 0)
  return fallback ? [fallback] : []
}

const normaliseActionEntry = (entry, index = 0) => {
  if (!entry || (!isPlainObject(entry) && typeof entry !== 'string')) return null

  if (typeof entry === 'string') {
    const targetKey = normaliseFieldKeyInput(entry)
    if (!targetKey) return null
    return { target: targetKey, action: 'show', id: `action-${index}` }
  }

  const targetKey = normaliseFieldKeyInput(
    entry.target ??
      entry.targetField ??
      entry.target_field ??
      entry.field ??
      entry.fieldKey ??
      entry.field_name ??
      entry.path ??
      entry.name ??
      entry.key ??
      entry.metadataField ??
      entry.metadata_field,
  )

  const actionType = normaliseActionType(entry.action ?? entry.type ?? entry.behavior ?? entry.behaviour ?? entry.effect ?? entry.command)

  if (!targetKey || !actionType) return null

  return { target: targetKey, action: actionType, id: entry.id ?? `action-${index}` }
}

const normaliseRuleActions = (rule) => {
  const possibleKeys = ['actions', 'effects', 'apply', 'then', 'responses']
  for (const key of possibleKeys) {
    if (Array.isArray(rule?.[key])) {
      return rule[key].map((action, index) => normaliseActionEntry(action, index)).filter(Boolean)
    }
  }

  if (Array.isArray(rule?.targets) && rule.targets.length > 0) {
    return rule.targets
      .map((target, index) =>
        normaliseActionEntry(
          {
            target,
            action: rule.action ?? rule.effect ?? rule.behavior ?? rule.behaviour,
          },
          index,
        ),
      )
      .filter(Boolean)
  }

  const fallbackTarget =
    rule.target ??
    rule.targetField ??
    rule.target_field ??
    rule.actionTarget ??
    rule.fieldTarget ??
    rule.metadataField ??
    rule.metadata_field

  if (fallbackTarget && (rule.action || rule.effect || rule.behavior || rule.behaviour)) {
    return [
      normaliseActionEntry({
        target: fallbackTarget,
        action: rule.action ?? rule.effect ?? rule.behavior ?? rule.behaviour,
      }),
    ].filter(Boolean)
  }

  return []
}

const toComparableString = (value) => {
  if (value === undefined || value === null) return ''
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value instanceof Date) return String(value.getTime())
  if (typeof value === 'string') return value.trim().toLowerCase()
  if (Array.isArray(value)) return value.map((item) => toComparableString(item))
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value)
      } catch {
        return String(value)
      }
  }
  return String(value)
}

const valuesAreEqual = (left, right) => {
  if (Array.isArray(left)) {
    return left.some((item) => valuesAreEqual(item, right))
  }
  if (Array.isArray(right)) {
    return right.some((item) => valuesAreEqual(left, item))
  }

  const leftNumber = Number(left)
  const rightNumber = Number(right)
  if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
    return leftNumber === rightNumber
  }

  const leftString = toComparableString(left)
  const rightString = toComparableString(right)
  return leftString === rightString
}

const valueIsSet = (value) => {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (value instanceof Date) return true
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

const readValueByPath = (source, path) => {
  if (path === undefined || path === null) return undefined
  let targetPath = path
  if (typeof targetPath !== 'string') {
    const resolved = normaliseFieldKeyInput(targetPath)
    if (!resolved) return undefined
    targetPath = resolved
  }

  if (!targetPath) return undefined

  const normalised = targetPath
    .replace(/\[(.*?)\]/g, (_, inner) => {
      const cleaned = inner.replace(/^['"]|['"]$/g, '')
      return `.${cleaned}`
    })
    .split('.')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)

  if (!normalised.length) return undefined

  return normalised.reduce((acc, segment) => {
    if (acc === undefined || acc === null) return undefined
    if (segment === '*') return acc
    return acc[segment]
  }, source)
}

const evaluateCondition = (condition, data) => {
  if (!condition) return false
  const { field, operator, values = [] } = condition
  const actualValue = readValueByPath(data, field)

  switch (operator) {
    case 'equals':
      if (!values.length) return false
      return values.some((expected) => valuesAreEqual(actualValue, expected))
    case 'not_equals':
      if (!values.length) return valueIsSet(actualValue)
      return values.every((expected) => !valuesAreEqual(actualValue, expected))
    case 'contains':
      if (Array.isArray(actualValue)) {
        return actualValue.some((item) => values.some((expected) => valuesAreEqual(item, expected)))
      }
      if (typeof actualValue === 'string') {
        return values.some((expected) => {
          if (expected === undefined || expected === null) return false
          return actualValue.toLowerCase().includes(String(expected).toLowerCase())
        })
      }
      return false
    case 'not_contains':
      if (Array.isArray(actualValue)) {
        return actualValue.every((item) => values.every((expected) => !valuesAreEqual(item, expected)))
      }
      if (typeof actualValue === 'string') {
        return values.every((expected) => {
          if (expected === undefined || expected === null) return true
          return !actualValue.toLowerCase().includes(String(expected).toLowerCase())
        })
      }
      return true
    case 'in':
      if (!values.length) return false
      if (Array.isArray(actualValue)) {
        return actualValue.some((item) => values.some((expected) => valuesAreEqual(item, expected)))
      }
      return values.some((expected) => valuesAreEqual(actualValue, expected))
    case 'not_in':
      if (!values.length) return true
      if (Array.isArray(actualValue)) {
        return actualValue.every((item) => values.every((expected) => !valuesAreEqual(item, expected)))
      }
      return values.every((expected) => !valuesAreEqual(actualValue, expected))
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const numericActual = Number(actualValue)
      if (Number.isNaN(numericActual)) return false
      const comparisonTarget = values.find((value) => value !== undefined && value !== null)
      const numericTarget = Number(comparisonTarget)
      if (Number.isNaN(numericTarget)) return false
      if (operator === 'gt') return numericActual > numericTarget
      if (operator === 'gte') return numericActual >= numericTarget
      if (operator === 'lt') return numericActual < numericTarget
      return numericActual <= numericTarget
    }
    case 'is_set':
      return valueIsSet(actualValue)
    case 'is_not_set':
      return !valueIsSet(actualValue)
    case 'is_empty':
      return !valueIsSet(actualValue)
    case 'is_not_empty':
      return valueIsSet(actualValue)
    case 'truthy':
      return Boolean(actualValue)
    case 'falsy':
      return !actualValue
    default:
      if (!values.length) {
        return valueIsSet(actualValue)
      }
      return values.some((expected) => valuesAreEqual(actualValue, expected))
  }
}

const evaluateRule = (rule, data) => {
  const conditions = Array.isArray(rule?.conditions) ? rule.conditions : []
  if (conditions.length === 0) return true

  switch (rule?.matchMode) {
    case 'any':
      return conditions.some((condition) => evaluateCondition(condition, data))
    case 'none':
      return !conditions.some((condition) => evaluateCondition(condition, data))
    case 'all':
    default:
      return conditions.every((condition) => evaluateCondition(condition, data))
  }
}

export const normaliseFieldRules = (rules = []) => {
  if (!Array.isArray(rules)) return []

  const normalised = rules
    .map((rule, index) => {
      if (!rule || typeof rule !== 'object') return null
      if (rule.disabled || rule.enabled === false) return null

      const alreadyNormalised =
        Array.isArray(rule.conditions) &&
        Array.isArray(rule.actions) &&
        rule.conditions.every((condition) => condition?.field && condition?.operator) &&
        rule.actions.every((action) => action?.target && action?.action)

      const conditions = alreadyNormalised
        ? rule.conditions.map((condition) => ({ ...condition }))
        : normaliseRuleConditions(rule)
      const actions = alreadyNormalised
        ? rule.actions.map((action) => ({ ...action }))
        : normaliseRuleActions(rule)

      if (!conditions.length || !actions.length) {
        return null
      }

      const priorityRaw = rule.priority ?? rule.order ?? rule.sort ?? rule.rank ?? index
      const priority = Number.isFinite(Number(priorityRaw)) ? Number(priorityRaw) : index

      return {
        id: rule.id ?? `field-rule-${index}`,
        name: rule.name ?? rule.label ?? '',
        matchMode: normaliseMatchMode(rule.matchMode ?? rule.match_mode ?? rule.matchType ?? rule.logic ?? rule.condition),
        conditions,
        actions,
        priority,
      }
    })
    .filter(Boolean)

  normalised.sort((a, b) => a.priority - b.priority)
  return normalised
}

export const evaluateFieldRuleActions = (rules, data = {}) => {
  const safeRules = Array.isArray(rules) ? rules : []
  const safeData = data && typeof data === 'object' ? data : {}
  const actionsByField = {}
  const showRuleTargets = new Set()

  safeRules.forEach((rule) => {
    if (!rule) return
    const matches = evaluateRule(rule, safeData)
    if (!matches) return

    rule.actions.forEach((action) => {
      if (!action?.target || !action?.action) return
      const target = action.target
      const normalisedKey = normaliseFieldKeyInput(target)?.toLowerCase() ?? null
      actionsByField[target] = action.action
      if (normalisedKey && actionsByField[normalisedKey] === undefined) {
        actionsByField[normalisedKey] = action.action
      }

      if (action.action === 'show') {
        showRuleTargets.add(target)
        if (normalisedKey) {
          showRuleTargets.add(normalisedKey)
        }
      } else if (action.action === 'hide') {
        showRuleTargets.delete(target)
        if (normalisedKey) {
          showRuleTargets.delete(normalisedKey)
        }
      }
    })
  })

  return { actionsByField, showRuleTargets }
}

export const isFieldHiddenByRules = (
  fieldKey,
  action,
  showRuleTargets = new Set(),
  defaultVisible = true,
) => {
  if (!fieldKey) return false
  const normalisedAction = typeof action === 'string' ? action.toLowerCase() : ''
  const normalisedKey = normaliseFieldKeyInput(fieldKey)?.toLowerCase() ?? null

  const hasShowOverride =
    showRuleTargets instanceof Set &&
    (showRuleTargets.has(fieldKey) || (normalisedKey ? showRuleTargets.has(normalisedKey) : false))

  if (hasShowOverride) return false

  if (normalisedAction === 'show') return false

  if (normalisedAction === 'hide' || normalisedAction === 'hidden') {
    return true
  }

  if (defaultVisible === false) {
    return true
  }

  return false
}

export default {
  normaliseFieldRules,
  evaluateFieldRuleActions,
  isFieldHiddenByRules,
}
