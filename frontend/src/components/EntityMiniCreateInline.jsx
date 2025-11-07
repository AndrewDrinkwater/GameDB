import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createEntity } from '../api/entities.js'

const DEFAULT_VISIBILITY = 'visible'

const normaliseEntityTypeOption = (entry) => {
  if (!entry) return null
  const id =
    entry.id ??
    entry.value ??
    entry.entity_type_id ??
    entry.entityTypeId ??
    (typeof entry === 'string' || typeof entry === 'number' ? entry : null)
  if (id === undefined || id === null || id === '') return null
  const name =
    entry.name ||
    entry.label ||
    entry.title ||
    entry.display ||
    entry.slug ||
    (typeof entry === 'string' || typeof entry === 'number' ? String(entry) : 'Untitled type')
  return { id: String(id), name: String(name) }
}

export default function EntityMiniCreateInline({
  allowedTypeIds = [],
  defaultTypeId = '',
  worldId,
  onCreated,
  onCancel,
  entityTypes = [],
  onToast,
}) {
  const [values, setValues] = useState({ name: '', entityTypeId: '', summary: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [typeWarning, setTypeWarning] = useState('')
  const warningShownRef = useRef(false)

  const allowedSet = useMemo(
    () => new Set((allowedTypeIds || []).map((id) => String(id))),
    [allowedTypeIds],
  )

  const options = useMemo(() => {
    const normalised = (Array.isArray(entityTypes) ? entityTypes : [])
      .map((entry) => normaliseEntityTypeOption(entry))
      .filter(Boolean)

    if (allowedSet.size === 0) return normalised
    return normalised.filter((option) => allowedSet.has(option.id))
  }, [entityTypes, allowedSet])

  const resolvedDefaultTypeId = useMemo(() => {
    if (defaultTypeId && allowedSet.size > 0 && allowedSet.has(String(defaultTypeId))) {
      return String(defaultTypeId)
    }

    if (options.length > 0) {
      return options[0].id
    }

    if (defaultTypeId) {
      return String(defaultTypeId)
    }

    return ''
  }, [defaultTypeId, allowedSet, options])

  useEffect(() => {
    setValues((prev) => ({ ...prev, entityTypeId: resolvedDefaultTypeId }))
  }, [resolvedDefaultTypeId])

  const resetForm = useCallback(() => {
    setValues({ name: '', entityTypeId: resolvedDefaultTypeId, summary: '' })
    setError('')
    setTypeWarning('')
    warningShownRef.current = false
  }, [resolvedDefaultTypeId])

  const handleChange = (field) => (event) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  useEffect(() => {
    if (!values.entityTypeId) {
      setTypeWarning('')
      return
    }

    if (allowedSet.size > 0 && !allowedSet.has(String(values.entityTypeId))) {
      setTypeWarning('This type is not allowed for the selected relationship.')
      if (!warningShownRef.current) {
        onToast?.('This entity type is not allowed for this relationship.', 'warning')
        warningShownRef.current = true
      }
    } else {
      setTypeWarning('')
      warningShownRef.current = false
    }
  }, [values.entityTypeId, allowedSet, onToast])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!worldId) {
      setError('Select a world before creating entities.')
      return
    }

    const trimmedName = values.name.trim()
    if (!trimmedName) {
      setError('Name is required.')
      return
    }

    const entityTypeId = values.entityTypeId
    if (!entityTypeId) {
      setError('Entity type is required.')
      return
    }

    if (allowedSet.size > 0 && !allowedSet.has(String(entityTypeId))) {
      setTypeWarning('This type is not allowed for the selected relationship.')
      if (!warningShownRef.current) {
        onToast?.('This entity type is not allowed for this relationship.', 'warning')
        warningShownRef.current = true
      }
      return
    }

    try {
      setSaving(true)
      setError('')
      const payload = {
        world_id: worldId,
        name: trimmedName,
        entity_type_id: entityTypeId,
        visibility: DEFAULT_VISIBILITY,
      }

      const trimmedSummary = values.summary.trim()
      if (trimmedSummary) {
        payload.description = trimmedSummary
      }

      const response = await createEntity(payload)
      const data = response?.data?.data ?? response?.data ?? response
      if (!data || data.id === undefined || data.id === null) {
        throw new Error('Failed to create entity')
      }

      onCreated?.(data)
      resetForm()
    } catch (err) {
      setError(err.message || 'Could not create entity. Please try again.')
      onToast?.('Could not create entity. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const isSaveDisabled =
    saving ||
    !values.name.trim() ||
    !values.entityTypeId ||
    (allowedSet.size > 0 && !allowedSet.has(String(values.entityTypeId))) ||
    options.length === 0

  return (
    <div className="entity-mini-create-inline">
      <div className="form-group">
        <label htmlFor="entity-mini-name">Name *</label>
        <input
          id="entity-mini-name"
          type="text"
          value={values.name}
          onChange={handleChange('name')}
          disabled={saving}
          required
        />
      </div>

      <div className="form-two-column">
        <div className="form-group">
          <label htmlFor="entity-mini-type">Type *</label>
          <select
            id="entity-mini-type"
            value={values.entityTypeId}
            onChange={handleChange('entityTypeId')}
            disabled={saving || options.length === 0}
            required
          >
            <option value="">Select type...</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="entity-mini-summary">Summary</label>
          <input
            id="entity-mini-summary"
            type="text"
            value={values.summary}
            onChange={handleChange('summary')}
            placeholder="Optional short summary"
            disabled={saving}
          />
        </div>
      </div>

      {(error || typeWarning) && (
        <div className={`form-error${typeWarning ? ' warning' : ''}`} role="alert">
          {typeWarning || error}
        </div>
      )}

      <div className="inline-actions">
        <button type="button" className="btn secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button
          type="button"
          className="btn"
          disabled={isSaveDisabled}
          onClick={handleSubmit}
        >
          {saving ? 'Creating…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
