import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, ListChecks, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import {
  createField,
  deleteField,
  getFields,
  updateField,
} from '../../api/entityTypeFields.js'
import {
  createEntityTypeFieldRule,
  deleteEntityTypeFieldRule,
  getEntityType,
  getEntityTypeFieldOrder,
  getEntityTypeFieldRules,
  getEntityTypes,
  updateEntityTypeFieldOrder,
  updateEntityTypeFieldRule,
} from '../../api/entityTypes.js'
import { fetchLocationTypes } from '../../api/locationTypes.js'
import { extractListResponse } from '../../utils/apiUtils.js'
import { sortFieldsByOrder } from '../../utils/fieldLayout.js'
import EntityTypeFieldForm from './EntityTypeFieldForm.jsx'
import FieldRuleForm from './FieldRuleForm.jsx'

const MANAGER_ROLES = new Set(['system_admin'])
const DATA_TYPE_LABELS = {
  text: 'Text',
  number: 'Number',
  boolean: 'Boolean',
  date: 'Date',
  enum: 'Enum',
  entity_reference: 'Entity Reference',
  location_reference: 'Location Reference',
}

const OPERATOR_LABELS = {
  equals: 'equals',
  not_equals: 'does not equal',
  contains: 'contains',
  not_contains: 'does not contain',
  in: 'is one of',
  not_in: 'is not one of',
  gt: 'is greater than',
  gte: 'is greater than or equal to',
  lt: 'is less than',
  lte: 'is less than or equal to',
  is_set: 'is set',
  is_not_set: 'is empty',
}

const ACTION_LABELS = {
  show: 'Show',
  hide: 'Hide',
}

const MATCH_MODE_LABELS = {
  all: 'All conditions must match',
  any: 'Any condition can match',
  none: 'No conditions can match',
}

export default function EntityTypeFields() {
  const { id: typeId } = useParams()
  const navigate = useNavigate()
  const { user, token, sessionReady } = useAuth()
  const [entityType, setEntityType] = useState(null)
  const [entityReferenceTypes, setEntityReferenceTypes] = useState([])
  const [locationReferenceTypes, setLocationReferenceTypes] = useState([])
  const [fields, setFields] = useState([])
  const [loadingType, setLoadingType] = useState(false)
  const [loadingFields, setLoadingFields] = useState(false)
  const [typeError, setTypeError] = useState('')
  const [fieldsError, setFieldsError] = useState('')
  const [fieldPanelOpen, setFieldPanelOpen] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState(null)
  const [fieldOrder, setFieldOrder] = useState([])
  const [fieldRules, setFieldRules] = useState([])
  const [layoutList, setLayoutList] = useState([])
  const [layoutDirty, setLayoutDirty] = useState(false)
  const [layoutSaving, setLayoutSaving] = useState(false)
  const [layoutError, setLayoutError] = useState('')
  const [layoutLoading, setLayoutLoading] = useState(false)
  const [rulesLoading, setRulesLoading] = useState(false)
  const [rulesError, setRulesError] = useState('')
  const [rulePanelOpen, setRulePanelOpen] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [ruleSaving, setRuleSaving] = useState(false)
  const [ruleFormError, setRuleFormError] = useState('')
  const [deletingRuleId, setDeletingRuleId] = useState('')
  const [reorderingRuleId, setReorderingRuleId] = useState('')

  const entityTypeName = entityType?.name || 'Entity Type'

  const canManage = useMemo(() => {
    if (!entityType || !user) return false
    if (MANAGER_ROLES.has(user.role)) return true
    if (entityType.world_owner_id && entityType.world_owner_id === user.id) return true
    if (entityType.created_by && entityType.created_by === user.id) return true
    if (Array.isArray(entityType.managers)) {
      return entityType.managers.some((managerId) => managerId === user.id)
    }
    return false
  }, [entityType, user])

  const formatEnumOptions = (field) => {
    if (!field) return '—'
    const { options } = field
    if (!options) return '—'
    if (Array.isArray(options.choices) && options.choices.length > 0) {
      return options.choices.join(', ')
    }
    if (typeof options === 'string' && options.trim()) {
      return options
    }
    return '—'
  }

  const showToast = useCallback((message, tone = 'info') => {
    setToast({ message, tone })
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const normalizeResponse = (response) => {
    if (!response) return null
    if (Array.isArray(response)) return response
    if (response?.data) return response.data
    return response
  }

  const loadEntityType = useCallback(async () => {
    if (!typeId) return
    setLoadingType(true)
    setTypeError('')
    try {
      const response = await getEntityType(typeId)
      const data = normalizeResponse(response)
      setEntityType(data)
    } catch (err) {
      console.error('❌ Failed to load entity type details', err)
      setTypeError(err.message || 'Failed to load entity type')
    } finally {
      setLoadingType(false)
    }
  }, [typeId])

  const loadReferenceTypes = useCallback(async (worldId) => {
    const trimmedWorldId = typeof worldId === 'string' ? worldId.trim() : worldId || ''
    if (!trimmedWorldId) {
      setEntityReferenceTypes([])
      setLocationReferenceTypes([])
      return
    }

    try {
      const [entityResponse, locationResponse] = await Promise.all([
        getEntityTypes({ worldId: trimmedWorldId }).catch((err) => {
          console.error('❌ Failed to load entity types', err)
          return null
        }),
        fetchLocationTypes({ worldId: trimmedWorldId }).catch((err) => {
          console.error('❌ Failed to load location types', err)
          return null
        }),
      ])

      const entityList = entityResponse ? normalizeResponse(entityResponse) : []
      const locationList = locationResponse ? normalizeResponse(locationResponse) : []

      setEntityReferenceTypes(Array.isArray(entityList) ? entityList : [])
      setLocationReferenceTypes(Array.isArray(locationList) ? locationList : [])
    } catch (err) {
      console.error('❌ Failed to load reference types', err)
      setEntityReferenceTypes([])
      setLocationReferenceTypes([])
    }
  }, [])

  const loadFields = useCallback(async () => {
    if (!typeId) return
    setLoadingFields(true)
    setFieldsError('')
    try {
      const response = await getFields(typeId)
      const list = normalizeResponse(response)
      setFields(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error('❌ Failed to load fields', err)
      setFieldsError(err.message || 'Failed to load fields')
      setFields([])
    } finally {
      setLoadingFields(false)
    }
  }, [typeId])

  const loadFieldLayout = useCallback(async () => {
    if (!typeId) return
    setLayoutLoading(true)
    setRulesLoading(true)
    setLayoutError('')
    setRulesError('')
    try {
      const [orderResponse, rulesResponse] = await Promise.all([
        getEntityTypeFieldOrder(typeId).catch((err) => {
          console.error('❌ Failed to load field order', err)
          setLayoutError(err.message || 'Failed to load field order')
          return null
        }),
        getEntityTypeFieldRules(typeId).catch((err) => {
          console.error('❌ Failed to load field rules', err)
          setRulesError(err.message || 'Failed to load conditional rules')
          return null
        }),
      ])

      setFieldOrder(extractListResponse(orderResponse))
      setFieldRules(extractListResponse(rulesResponse))
    } catch (err) {
      setLayoutError(err.message || 'Failed to load field order')
      setRulesError(err.message || 'Failed to load conditional rules')
      setFieldOrder([])
      setFieldRules([])
    } finally {
      setLayoutLoading(false)
      setRulesLoading(false)
    }
  }, [typeId])

  useEffect(() => {
    if (!sessionReady || !token) return
    loadEntityType()
    loadFields()
    loadFieldLayout()
  }, [sessionReady, token, loadEntityType, loadFields, loadFieldLayout])

  useEffect(() => {
    if (!entityType) {
      setEntityReferenceTypes([])
      setLocationReferenceTypes([])
      return
    }
    const worldId =
      entityType?.world_id || entityType?.worldId || entityType?.world?.id || ''
    loadReferenceTypes(worldId)
  }, [entityType, entityType?.world_id, entityType?.worldId, entityType?.world?.id, loadReferenceTypes])

  useEffect(() => {
    if (!sessionReady) return
    if (!token) {
      navigate('/login')
    }
  }, [sessionReady, token, navigate])

  const buildLayoutFromSources = useCallback(() => {
    if (!Array.isArray(fields) || fields.length === 0) {
      return []
    }
    const ordered = sortFieldsByOrder(fields, fieldOrder)
    return ordered.map((field, index) => ({
      id: field.id,
      name: field.name,
      label: field.label || field.name,
      data_type: field.data_type,
      required: field.required,
      order: index,
    }))
  }, [fields, fieldOrder])

  useEffect(() => {
    if (layoutDirty) return
    setLayoutList(buildLayoutFromSources())
  }, [buildLayoutFromSources, layoutDirty])

  const resetLayoutOrder = useCallback(() => {
    setLayoutDirty(false)
    setLayoutList(buildLayoutFromSources())
  }, [buildLayoutFromSources])

  const fieldLabelLookup = useMemo(() => {
    const map = new Map()
    fields.forEach((field) => {
      if (!field) return
      const label = field.label || field.name || 'Field'
      if (field.id) {
        map.set(field.id, label)
        map.set(String(field.id).toLowerCase(), label)
      }
      if (field.name) {
        map.set(field.name, label)
        map.set(field.name.toLowerCase(), label)
      }
    })
    return map
  }, [fields])

  const describeCondition = useCallback(
    (condition) => {
      if (!condition) return ''
      const fieldName = fieldLabelLookup.get(condition.field) || condition.field
      const operatorLabel = OPERATOR_LABELS[condition.operator] || condition.operator
      const values = Array.isArray(condition.values) ? condition.values.filter(Boolean) : []
      if (!values.length || ['is_set', 'is_not_set'].includes(condition.operator)) {
        return `${fieldName} ${operatorLabel}`
      }
      return `${fieldName} ${operatorLabel} ${values.join(', ')}`
    },
    [fieldLabelLookup],
  )

  const describeAction = useCallback(
    (action) => {
      if (!action) return ''
      const targetName = fieldLabelLookup.get(action.target) || action.target
      const actionLabel = ACTION_LABELS[action.action] || action.action
      return `${actionLabel} ${targetName}`
    },
    [fieldLabelLookup],
  )

  const openCreate = () => {
    if (!canManage) return
    setEditingField(null)
    setFormError('')
    setFieldPanelOpen(true)
  }

  const openEdit = (field) => {
    if (!canManage) return
    setEditingField(field)
    setFormError('')
    setFieldPanelOpen(true)
  }

  const closePanel = () => {
    setFieldPanelOpen(false)
    setEditingField(null)
    setFormError('')
  }

  const handleSave = async (values) => {
    if (!canManage) return false
    try {
      setSaving(true)
      setFormError('')
      if (editingField?.id) {
        await updateField(editingField.id, values)
        showToast('Field updated', 'success')
      } else {
        await createField(typeId, values)
        showToast('Field created', 'success')
      }
      closePanel()
      await loadFields()
      await loadFieldLayout()
    } catch (err) {
      console.error('❌ Failed to save field', err)
      const message = err.message || 'Failed to save field'
      setFormError(message)
      showToast(message, 'error')
      return false
    } finally {
      setSaving(false)
    }
    return true
  }

  const handleDelete = async (field) => {
    if (!canManage || !field?.id) return
    const confirmed = window.confirm(
      `Delete field "${field.label || field.name}"? This action cannot be undone.`,
    )
    if (!confirmed) return

    try {
      setDeletingId(field.id)
      await deleteField(field.id)
      showToast('Field deleted', 'success')
      await loadFields()
      await loadFieldLayout()
    } catch (err) {
      console.error('❌ Failed to delete field', err)
      showToast(err.message || 'Failed to delete field', 'error')
    } finally {
      setDeletingId('')
    }
  }

  const moveLayoutItem = (index, direction) => {
    setLayoutList((previous) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= previous.length) {
        return previous
      }
      const next = previous.slice()
      const [moved] = next.splice(index, 1)
      next.splice(nextIndex, 0, moved)
      return next.map((item, position) => ({ ...item, order: position }))
    })
    setLayoutDirty(true)
  }

  const handleSaveLayout = async () => {
    if (!canManage || !layoutDirty) return
    setLayoutSaving(true)
    try {
      const entries = layoutList.map((item, index) => ({
        field_id: item.id,
        section_order: 0,
        column_order: 0,
        field_order: index,
        priority: index,
      }))
      await updateEntityTypeFieldOrder(typeId, { entries })
      showToast('Field order updated', 'success')
      setLayoutDirty(false)
      await loadFieldLayout()
    } catch (err) {
      const message = err.message || 'Failed to update field order'
      setLayoutError(message)
      showToast(message, 'error')
    } finally {
      setLayoutSaving(false)
    }
  }

  const openRulePanel = (rule = null) => {
    if (!canManage) return
    setEditingRule(rule)
    setRuleFormError('')
    setRulePanelOpen(true)
  }

  const closeRulePanel = () => {
    setRulePanelOpen(false)
    setEditingRule(null)
    setRuleFormError('')
  }

  const handleRuleSave = async (values) => {
    if (!canManage) return false
    try {
      setRuleSaving(true)
      setRuleFormError('')
      if (editingRule?.id) {
        await updateEntityTypeFieldRule(editingRule.id, values)
        showToast('Rule updated', 'success')
      } else {
        await createEntityTypeFieldRule(typeId, values)
        showToast('Rule created', 'success')
      }
      closeRulePanel()
      await loadFieldLayout()
    } catch (err) {
      const message = err.message || 'Failed to save rule'
      setRuleFormError(message)
      showToast(message, 'error')
      return false
    } finally {
      setRuleSaving(false)
    }
    return true
  }

  const handleDeleteRule = async (rule) => {
    if (!canManage || !rule?.id) return
    const confirmed = window.confirm(`Delete the rule "${rule.name || 'Untitled rule'}"?`)
    if (!confirmed) return
    try {
      setDeletingRuleId(rule.id)
      await deleteEntityTypeFieldRule(rule.id)
      showToast('Rule deleted', 'success')
      await loadFieldLayout()
    } catch (err) {
      showToast(err.message || 'Failed to delete rule', 'error')
    } finally {
      setDeletingRuleId('')
    }
  }

  const handleRuleReorder = async (rule, direction) => {
    if (!canManage || !rule?.id) return
    const index = fieldRules.findIndex((entry) => entry.id === rule.id)
    const nextIndex = index + direction
    if (index === -1 || nextIndex < 0 || nextIndex >= fieldRules.length) {
      return
    }
    const targetRule = fieldRules[nextIndex]
    try {
      setReorderingRuleId(rule.id)
      await Promise.all([
        updateEntityTypeFieldRule(rule.id, { priority: nextIndex }),
        updateEntityTypeFieldRule(targetRule.id, { priority: index }),
      ])
      showToast('Rule order updated', 'success')
      await loadFieldLayout()
    } catch (err) {
      showToast(err.message || 'Failed to reorder rule', 'error')
    } finally {
      setReorderingRuleId('')
    }
  }

  const formatDate = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const referenceTypeNameMap = useMemo(() => {
    const map = new Map()
    entityReferenceTypes.forEach((type) => {
      if (type?.id) {
        map.set(type.id, type.name)
      }
    })
    locationReferenceTypes.forEach((type) => {
      if (type?.id) {
        map.set(type.id, type.name)
      }
    })
    return map
  }, [entityReferenceTypes, locationReferenceTypes])

  const availableReferenceTypes = useMemo(() => {
    if (!Array.isArray(referenceTypes) || !referenceTypes.length) {
      return []
    }

    if (!entityType?.world_id) {
      return referenceTypes
    }

    return referenceTypes.filter((type) => {
      if (!type) return false
      if (!entityType.world_id) return true

      const candidateWorldId = type.world_id ?? type.worldId ?? type.world?.id
      if (candidateWorldId) {
        return candidateWorldId === entityType.world_id
      }

      return true
    })
  }, [entityType, referenceTypes])

  const combinedError = typeError || fieldsError

  if (!sessionReady) {
    return <p>Restoring session...</p>
  }

  if (!token) {
    return <p>Authenticating...</p>
  }

  return (
    <section className="entity-type-fields-page">
      <div className="entity-type-fields-header">
        <div className="entity-type-fields-heading">
          <button
            type="button"
            className="link-button"
            onClick={() => navigate('/entity-types')}
          >
            <ArrowLeft size={16} /> Back to Entity Types
          </button>
          <h1>Fields for {entityTypeName}</h1>
          {entityType?.world_name && (
            <p className="entity-type-fields-subtitle">World: {entityType.world_name}</p>
          )}
        </div>

        {canManage && (
          <button
            type="button"
            className="btn submit"
            onClick={openCreate}
            disabled={saving || deletingId}
          >
            <Plus size={18} /> Add Field
          </button>
        )}
      </div>

      {!canManage && (
        <div className="alert info" role="status">
          You can view these fields, but only the world owner or system administrators can
          make changes.
        </div>
      )}

      {toast && (
        <div className={`toast-banner ${toast.tone}`} role="status">
          {toast.message}
        </div>
      )}

      {combinedError && (
        <div className="alert error" role="alert">
          {combinedError}
        </div>
      )}

      <div className="entity-types-table-wrapper">
        {loadingType || loadingFields ? (
          <div className="empty-state">Loading fields...</div>
        ) : fields.length === 0 ? (
          <div className="empty-state">No custom fields defined yet.</div>
        ) : (
          <table className="entity-types-table">
            <thead>
              <tr>
                <th>Field Name</th>
                <th>Label</th>
                <th>Data Type</th>
                <th>Reference Type</th>
                <th>Required</th>
                <th>Created</th>
                {canManage && <th className="actions-column">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => {
                const createdAt = field.createdAt || field.created_at
                const referenceName =
                  field.reference_type_name || referenceTypeNameMap.get(field.reference_type_id)
                const dataTypeLabel = DATA_TYPE_LABELS[field.data_type] || field.data_type
                return (
                  <tr key={field.id}>
                    <td>{field.name}</td>
                    <td>{field.label || '—'}</td>
                    <td>{dataTypeLabel}</td>
                    <td>{referenceName || ((field.data_type === 'entity_reference' || field.data_type === 'location_reference') ? '—' : 'N/A')}</td>
                    <td>{field.required ? 'Yes' : 'No'}</td>
                    <td>{formatDate(createdAt)}</td>
                    {canManage && (
                      <td className="actions-column">
                        <div className="entity-type-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            title="Edit field"
                            onClick={() => openEdit(field)}
                            disabled={saving || deletingId === field.id}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            title="Delete field"
                            onClick={() => handleDelete(field)}
                            disabled={deletingId === field.id || saving}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <section className="field-layout-card">
        <div className="card-header">
          <h2>
            <ListChecks size={18} /> Field order
          </h2>
          {canManage && (
            <div className="layout-card-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={resetLayoutOrder}
                disabled={layoutSaving || !layoutDirty}
              >
                Reset
              </button>
              <button
                type="button"
                className="btn submit"
                onClick={handleSaveLayout}
                disabled={layoutSaving || !layoutDirty || layoutList.length === 0}
              >
                {layoutSaving ? 'Saving…' : 'Save order'}
              </button>
            </div>
          )}
        </div>
        <p className="card-description">
          Use this list to control how the metadata fields appear on entity forms and detail pages.
        </p>
        {layoutError && (
          <div className="alert error" role="alert">
            {layoutError}
          </div>
        )}
        {layoutLoading ? (
          <div className="card-placeholder">Loading layout…</div>
        ) : layoutList.length === 0 ? (
          <div className="card-placeholder">No fields available to order yet.</div>
        ) : (
          <ol className="field-layout-list">
            {layoutList.map((item, index) => (
              <li key={item.id || item.name || index} className="field-layout-row">
                <div className="field-layout-info">
                  <span className="field-layout-index">{index + 1}</span>
                  <div className="field-layout-details">
                    <span className="field-layout-name">{item.label || item.name}</span>
                    <span className="field-layout-meta">
                      {DATA_TYPE_LABELS[item.data_type] || item.data_type}
                    </span>
                  </div>
                </div>
                {canManage && (
                  <div className="layout-controls">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => moveLayoutItem(index, -1)}
                      disabled={index === 0 || layoutSaving}
                      title="Move up"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => moveLayoutItem(index, 1)}
                      disabled={index === layoutList.length - 1 || layoutSaving}
                      title="Move down"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="field-rules-card">
        <div className="card-header">
          <h2>
            <Sparkles size={18} /> Conditional rules
          </h2>
          {canManage && (
            <button
              type="button"
              className="btn submit"
              onClick={() => openRulePanel(null)}
              disabled={ruleSaving}
            >
              <Plus size={16} /> Add rule
            </button>
          )}
        </div>
        <p className="card-description">
          Automatically show or hide fields when other metadata matches specific conditions.
        </p>
        {rulesError && (
          <div className="alert error" role="alert">
            {rulesError}
          </div>
        )}
        {rulesLoading ? (
          <div className="card-placeholder">Loading rules…</div>
        ) : fieldRules.length === 0 ? (
          <div className="card-placeholder">No conditional rules have been configured.</div>
        ) : (
          <div className="field-rules-list">
            {fieldRules.map((rule, index) => (
              <article className="field-rule-card" key={rule.id}>
                <div className="field-rule-content">
                  <h3>{rule.name || `Rule ${index + 1}`}</h3>
                  <p className="field-rule-match">
                    {MATCH_MODE_LABELS[rule.match_mode] || MATCH_MODE_LABELS.all}
                  </p>
                  <ul className="field-rule-condition-list">
                    {Array.isArray(rule.conditions) &&
                      rule.conditions.map((condition, conditionIndex) => (
                        <li key={`condition-${rule.id}-${conditionIndex}`}>
                          {describeCondition(condition)}
                        </li>
                      ))}
                  </ul>
                  <div className="field-rule-action-list">
                    {Array.isArray(rule.actions) &&
                      rule.actions.map((action, actionIndex) => (
                        <span key={`action-${rule.id}-${actionIndex}`}>
                          {describeAction(action)}
                        </span>
                      ))}
                  </div>
                </div>
                {canManage && (
                  <div className="field-rule-controls">
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => handleRuleReorder(rule, -1)}
                      disabled={index === 0 || reorderingRuleId === rule.id}
                      title="Move rule up"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => handleRuleReorder(rule, 1)}
                      disabled={index === fieldRules.length - 1 || reorderingRuleId === rule.id}
                      title="Move rule down"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => openRulePanel(rule)}
                      title="Edit rule"
                      disabled={ruleSaving || deletingRuleId === rule.id}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => handleDeleteRule(rule)}
                      title="Delete rule"
                      disabled={deletingRuleId === rule.id || ruleSaving}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="entity-type-cards">
        {loadingType || loadingFields ? (
          <div className="card-placeholder">Loading fields...</div>
        ) : fields.length === 0 ? (
          <div className="card-placeholder">No custom fields defined yet.</div>
        ) : (
          fields.map((field) => {
            const createdAt = field.createdAt || field.created_at
            const referenceName =
              field.reference_type_name || referenceTypeNameMap.get(field.reference_type_id)
            const dataTypeLabel = DATA_TYPE_LABELS[field.data_type] || field.data_type
            return (
              <div className="entity-type-card" key={`field-card-${field.id}`}>
                <div className="card-header">
                  <h3>{field.label || field.name}</h3>
                  {canManage && (
                    <div className="entity-type-actions">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Edit field"
                        onClick={() => openEdit(field)}
                        disabled={saving || deletingId === field.id}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        title="Delete field"
                        onClick={() => handleDelete(field)}
                        disabled={deletingId === field.id || saving}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <dl className="field-card-metadata">
                  <div>
                    <dt>Field Name</dt>
                    <dd>{field.name}</dd>
                  </div>
                  <div>
                    <dt>Data Type</dt>
                    <dd>{dataTypeLabel}</dd>
                  </div>
                  <div>
                    <dt>Required</dt>
                    <dd>{field.required ? 'Yes' : 'No'}</dd>
                  </div>
                  {field.data_type === 'enum' && (
                    <div>
                      <dt>Options</dt>
                      <dd>{formatEnumOptions(field)}</dd>
                    </div>
                  )}
                  {field.data_type === 'reference' && (
                    <div>
                      <dt>Reference Type</dt>
                      <dd>{referenceName || '—'}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Created</dt>
                    <dd>{formatDate(createdAt)}</dd>
                  </div>
                </dl>
              </div>
            )
          })
        )}
      </div>

      {fieldPanelOpen && (
        <div className="side-panel-overlay" role="dialog" aria-modal="true">
          <div className="side-panel">
            <div className="side-panel-header">
              <h2>{editingField ? 'Edit Field' : 'Add Field'}</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={closePanel}
                title="Close form"
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>
            <div className="side-panel-content">
              <EntityTypeFieldForm
                initialData={editingField}
                entityReferenceTypes={availableEntityReferenceTypes}
                locationReferenceTypes={availableLocationReferenceTypes}
                onSubmit={handleSave}
                onCancel={closePanel}
                submitting={saving}
                errorMessage={formError}
              />
            </div>
          </div>
        </div>
      )}

      {rulePanelOpen && (
        <div className="side-panel-overlay" role="dialog" aria-modal="true">
          <div className="side-panel">
            <div className="side-panel-header">
              <h2>{editingRule ? 'Edit conditional rule' : 'Add conditional rule'}</h2>
              <button
                type="button"
                className="icon-btn"
                onClick={closeRulePanel}
                title="Close form"
                disabled={ruleSaving}
              >
                <X size={18} />
              </button>
            </div>
            <div className="side-panel-content">
              <FieldRuleForm
                fields={fields}
                initialData={editingRule}
                onSubmit={handleRuleSave}
                onCancel={closeRulePanel}
                submitting={ruleSaving}
                errorMessage={ruleFormError}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
