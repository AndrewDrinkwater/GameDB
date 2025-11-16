import { EntityType, EntityTypeField, EntityTypeFieldRule } from '../models/index.js'
import { checkWorldAccess } from '../middleware/worldAccess.js'

const isSystemAdmin = (user) => user?.role === 'system_admin'

const ensureViewAccess = async (entityType, user) => {
  if (!entityType) {
    return { status: 404, message: 'Entity type not found' }
  }

  if (!entityType.world_id) {
    if (!isSystemAdmin(user)) {
      return { status: 403, message: 'Forbidden' }
    }
    return { status: 200 }
  }

  const access = await checkWorldAccess(entityType.world_id, user)

  if (!access.world) {
    return { status: 404, message: 'World not found' }
  }

  if (!access.hasAccess && !access.isOwner && !access.isAdmin) {
    return { status: 403, message: 'Forbidden' }
  }

  return { status: 200 }
}

const ensureManageAccess = async (entityType, user) => {
  if (!entityType) {
    return { status: 404, message: 'Entity type not found' }
  }

  if (isSystemAdmin(user)) {
    return { status: 200 }
  }

  if (!entityType.world_id) {
    return { status: 403, message: 'Forbidden' }
  }

  const access = await checkWorldAccess(entityType.world_id, user)

  if (!access.world) {
    return { status: 404, message: 'World not found' }
  }

  if (!access.isOwner && !access.isAdmin) {
    return { status: 403, message: 'Forbidden' }
  }

  return { status: 200 }
}

const MATCH_MODES = new Set(['all', 'any', 'none'])
const ALLOWED_ACTIONS = new Set(['show', 'hide'])

const normaliseMatchMode = (value) => {
  if (!value) return 'all'
  const key = String(value).trim().toLowerCase()
  return MATCH_MODES.has(key) ? key : 'all'
}

const toArray = (value) => {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === '') return []
  return [value]
}

const resolveFieldReference = (input, lookup) => {
  if (input === undefined || input === null) return null
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return null
    const lower = trimmed.toLowerCase()
    return lookup.get(trimmed) || lookup.get(lower) || null
  }

  if (typeof input === 'object') {
    const fallback =
      input.field ||
      input.fieldId ||
      input.field_id ||
      input.source ||
      input.sourceField ||
      input.source_field ||
      input.target ||
      input.targetField ||
      input.target_field ||
      input.metadataField ||
      input.metadata_field ||
      input.key ||
      input.name ||
      null
    if (fallback) {
      return resolveFieldReference(fallback, lookup)
    }
  }

  if (typeof input === 'number') {
    const key = String(input)
    return lookup.get(key) || null
  }

  return null
}

const buildFieldLookup = (fields) => {
  const lookup = new Map()
  fields.forEach((field) => {
    if (!field) return
    const id = field.id
    const name = field.name?.trim()
    if (id) {
      lookup.set(id, id)
      lookup.set(String(id).toLowerCase(), id)
    }
    if (name) {
      lookup.set(name, id || name)
      lookup.set(name.toLowerCase(), id || name)
    }
  })
  return lookup
}

const normaliseCondition = (condition, lookup) => {
  if (!condition || typeof condition !== 'object') {
    throw new Error('Each condition must be an object')
  }

  const fieldRef =
    resolveFieldReference(condition.field, lookup) ||
    resolveFieldReference(condition.fieldKey, lookup) ||
    resolveFieldReference(condition.metadataField, lookup)

  if (!fieldRef) {
    throw new Error('Condition field is required')
  }

  const operator = String(condition.operator || 'equals').trim().toLowerCase()

  const values = toArray(condition.values ?? condition.value ?? condition.match)
    .map((value) => {
      if (value === undefined || value === null) return ''
      return typeof value === 'string' ? value : String(value)
    })
    .filter((value) => value !== '')

  return {
    field: fieldRef,
    operator,
    values,
  }
}

const normaliseAction = (action, lookup) => {
  if (!action || typeof action !== 'object') {
    throw new Error('Each action must be an object')
  }

  const targetRef =
    resolveFieldReference(action.target, lookup) ||
    resolveFieldReference(action.targetField, lookup) ||
    resolveFieldReference(action.field, lookup)

  if (!targetRef) {
    throw new Error('Action target is required')
  }

  const actionKey = String(action.action || action.type || 'show').trim().toLowerCase()

  if (!ALLOWED_ACTIONS.has(actionKey)) {
    throw new Error('Unsupported action type')
  }

  return {
    target: targetRef,
    action: actionKey,
  }
}

const mapRuleResponse = (rule) => ({
  id: rule.id,
  entity_type_id: rule.entity_type_id,
  name: rule.name,
  match_mode: rule.match_mode,
  matchMode: rule.match_mode,
  priority: rule.priority,
  enabled: rule.enabled,
  conditions: Array.isArray(rule.conditions) ? rule.conditions : [],
  actions: Array.isArray(rule.actions) ? rule.actions : [],
})

export const listEntityTypeFieldRules = async (req, res) => {
  try {
    const { id } = req.params
    const entityType = await EntityType.findByPk(id)
    const access = await ensureViewAccess(entityType, req.user)

    if (access.status !== 200) {
      return res.status(access.status).json({ success: false, message: access.message })
    }

    const rules = await EntityTypeFieldRule.findAll({
      where: { entity_type_id: id },
      order: [
        ['priority', 'ASC'],
        ['created_at', 'ASC'],
      ],
    })

    return res.json({ success: true, data: rules.map((rule) => mapRuleResponse(rule)) })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const createEntityTypeFieldRule = async (req, res) => {
  try {
    const { id } = req.params
    const entityType = await EntityType.findByPk(id)
    const access = await ensureManageAccess(entityType, req.user)

    if (access.status !== 200) {
      return res.status(access.status).json({ success: false, message: access.message })
    }

    const fields = await EntityTypeField.findAll({
      where: { entity_type_id: id },
      attributes: ['id', 'name'],
    })
    const fieldLookup = buildFieldLookup(fields)

    const rawConditions = Array.isArray(req.body?.conditions) ? req.body.conditions : []
    const rawActions = Array.isArray(req.body?.actions) ? req.body.actions : []

    if (!rawConditions.length) {
      return res.status(400).json({ success: false, message: 'At least one condition is required' })
    }

    if (!rawActions.length) {
      return res.status(400).json({ success: false, message: 'At least one action is required' })
    }

    const name = req.body?.name?.trim() || null
    const matchMode = normaliseMatchMode(req.body?.match_mode ?? req.body?.matchMode)
    const priority = Number.isFinite(Number(req.body?.priority))
      ? Number(req.body.priority)
      : await EntityTypeFieldRule.count({ where: { entity_type_id: id } })

    let conditions
    let actions

    try {
      conditions = rawConditions.map((condition) => normaliseCondition(condition, fieldLookup))
      actions = rawActions.map((action) => normaliseAction(action, fieldLookup))
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message })
    }

    const rule = await EntityTypeFieldRule.create({
      entity_type_id: id,
      name,
      match_mode: matchMode,
      priority,
      conditions,
      actions,
    })

    return res.status(201).json({ success: true, data: mapRuleResponse(rule) })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const updateEntityTypeFieldRule = async (req, res) => {
  try {
    const { id } = req.params
    const rule = await EntityTypeFieldRule.findByPk(id)

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' })
    }

    const entityType = await EntityType.findByPk(rule.entity_type_id)
    const access = await ensureManageAccess(entityType, req.user)

    if (access.status !== 200) {
      return res.status(access.status).json({ success: false, message: access.message })
    }

    const updates = {}

    if (req.body?.name !== undefined) {
      updates.name = req.body.name?.trim() || null
    }

    if (req.body?.match_mode !== undefined || req.body?.matchMode !== undefined) {
      updates.match_mode = normaliseMatchMode(req.body.match_mode ?? req.body.matchMode)
    }

    if (req.body?.priority !== undefined) {
      const parsedPriority = Number(req.body.priority)
      if (!Number.isFinite(parsedPriority)) {
        return res.status(400).json({ success: false, message: 'priority must be numeric' })
      }
      updates.priority = parsedPriority
    }

    if (req.body?.enabled !== undefined) {
      updates.enabled = Boolean(req.body.enabled)
    }

    const fields = await EntityTypeField.findAll({
      where: { entity_type_id: rule.entity_type_id },
      attributes: ['id', 'name'],
    })
    const fieldLookup = buildFieldLookup(fields)

    if (req.body?.conditions !== undefined) {
      const rawConditions = Array.isArray(req.body.conditions) ? req.body.conditions : []
      if (!rawConditions.length) {
        return res.status(400).json({ success: false, message: 'At least one condition is required' })
      }
      try {
        updates.conditions = rawConditions.map((condition) => normaliseCondition(condition, fieldLookup))
      } catch (err) {
        return res.status(400).json({ success: false, message: err.message })
      }
    }

    if (req.body?.actions !== undefined) {
      const rawActions = Array.isArray(req.body.actions) ? req.body.actions : []
      if (!rawActions.length) {
        return res.status(400).json({ success: false, message: 'At least one action is required' })
      }
      try {
        updates.actions = rawActions.map((action) => normaliseAction(action, fieldLookup))
      } catch (err) {
        return res.status(400).json({ success: false, message: err.message })
      }
    }

    if (!Object.keys(updates).length) {
      return res.json({ success: true, data: mapRuleResponse(rule) })
    }

    await rule.update(updates)

    return res.json({ success: true, data: mapRuleResponse(rule) })
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

export const deleteEntityTypeFieldRule = async (req, res) => {
  try {
    const { id } = req.params
    const rule = await EntityTypeFieldRule.findByPk(id)

    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' })
    }

    const entityType = await EntityType.findByPk(rule.entity_type_id)
    const access = await ensureManageAccess(entityType, req.user)

    if (access.status !== 200) {
      return res.status(access.status).json({ success: false, message: access.message })
    }

    await rule.destroy()

    return res.status(204).send()
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

