import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getEntityTypes } from '../../api/entityTypes.js'
import {
  createEntity,
  getEntity,
  updateEntity,
} from '../../api/entities.js'

const VISIBILITY_OPTIONS = [
  { value: 'hidden', label: 'Hidden' },
  { value: 'partial', label: 'Partial' },
  { value: 'visible', label: 'Visible' },
]

const ADVANCED_SECTION_KEY = 'entity-form-advanced-open'

const normaliseValueForInput = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }
  return String(value)
}

const coerceMetadataValue = (value) => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return ''
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  const firstChar = trimmed[0]
  const lastChar = trimmed[trimmed.length - 1]
  if ((firstChar === '{' && lastChar === '}') || (firstChar === '[' && lastChar === ']')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return value
    }
  }
  return value
}

export default function EntityForm({
  worldId,
  entityId,
  onCancel,
  onSaved,
  formId = 'entity-form',
  onStateChange,
  hideActions = false,
}) {
  const isEditMode = Boolean(entityId)
  const pairIdRef = useRef(0)

  const generatePair = useCallback(
    (key = '', value = '') => {
      pairIdRef.current += 1
      return {
        id: pairIdRef.current,
        key,
        value,
      }
    },
    [pairIdRef],
  )

  const [entityTypes, setEntityTypes] = useState([])
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [loadingEntity, setLoadingEntity] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [values, setValues] = useState({
    name: '',
    description: '',
    entityTypeId: '',
    visibility: 'hidden',
  })
  const [metadataPairs, setMetadataPairs] = useState(() => {
    pairIdRef.current = 0
    return [generatePair()]
  })
  const [showAdvanced, setShowAdvanced] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const stored = window.sessionStorage?.getItem(ADVANCED_SECTION_KEY)
      return stored === 'true'
    } catch (err) {
      console.warn('⚠️ Unable to read advanced options preference', err)
      return false
    }
  })

  const hasMetadata = useMemo(
    () => metadataPairs.some((pair) => pair.key.trim() !== '' || pair.value.trim() !== ''),
    [metadataPairs],
  )

  const ensureAtLeastOnePair = useCallback(
    (pairs) => {
      if (pairs.length > 0) return pairs
      return [generatePair()]
    },
    [generatePair],
  )

  const normaliseMetadataPairs = useCallback(
    (metadata) => {
      pairIdRef.current = 0
      if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
        return [generatePair()]
      }

      const entries = Object.entries(metadata)
      if (entries.length === 0) {
        return [generatePair()]
      }

      return entries.map(([key, value]) => generatePair(key, normaliseValueForInput(value)))
    },
    [generatePair],
  )

  useEffect(() => {
    let cancelled = false

    const loadEntityTypes = async () => {
      setLoadingTypes(true)
      try {
        const response = await getEntityTypes()
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : []
        if (!cancelled) {
          setEntityTypes(list)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load entity types')
        }
      } finally {
        if (!cancelled) {
          setLoadingTypes(false)
        }
      }
    }

    loadEntityTypes()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const resetForm = () => {
      pairIdRef.current = 0
      setValues({
        name: '',
        description: '',
        entityTypeId: '',
        visibility: 'hidden',
      })
      setMetadataPairs([generatePair()])
      setError('')
    }

    if (!isEditMode) {
      resetForm()
      setLoadingEntity(false)
      return () => {}
    }

    const loadEntity = async () => {
      setLoadingEntity(true)
      setError('')
      try {
        const response = await getEntity(entityId)
        const data = response?.data || response
        if (!data) {
          throw new Error('Entity not found')
        }

        if (!cancelled) {
          const metadataList = normaliseMetadataPairs(data.metadata)
          setValues({
            name: data.name || '',
            description: data.description || '',
            entityTypeId: data.entity_type_id || data.entityType?.id || '',
            visibility: data.visibility || 'hidden',
          })
          setMetadataPairs(ensureAtLeastOnePair(metadataList))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load entity')
        }
      } finally {
        if (!cancelled) {
          setLoadingEntity(false)
        }
      }
    }

    loadEntity()
    return () => {
      cancelled = true
    }
  }, [entityId, isEditMode, ensureAtLeastOnePair, generatePair, normaliseMetadataPairs])

  const handleInputChange = (field) => (event) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleMetadataChange = (id, field) => (event) => {
    const { value } = event.target
    setMetadataPairs((prev) =>
      prev.map((pair) => (pair.id === id ? { ...pair, [field]: value } : pair)),
    )
  }

  const handleAddPair = () => {
    setMetadataPairs((prev) => [...prev, generatePair()])
  }

  const handleRemovePair = (id) => {
    setMetadataPairs((prev) => ensureAtLeastOnePair(prev.filter((pair) => pair.id !== id)))
  }

  const handleToggleAdvanced = useCallback(() => {
    setShowAdvanced((prev) => {
      const next = !prev
      try {
        if (typeof window !== 'undefined') {
          window.sessionStorage?.setItem(ADVANCED_SECTION_KEY, next ? 'true' : 'false')
        }
      } catch (err) {
        console.warn('⚠️ Unable to persist advanced options preference', err)
      }
      return next
    })
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!worldId) {
      setError('A world must be selected before creating an entity.')
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

    const visibility = values.visibility || 'hidden'
    if (!VISIBILITY_OPTIONS.some((option) => option.value === visibility)) {
      setError('Invalid visibility selected.')
      return
    }

    const metadataPayload = {}
    metadataPairs.forEach(({ key, value }) => {
      const trimmedKey = key.trim()
      if (!trimmedKey) return
      metadataPayload[trimmedKey] = coerceMetadataValue(value)
    })

    const descriptionValue = values.description ? values.description.trim() : ''

    const payload = {
      name: trimmedName,
      description: descriptionValue,
      visibility,
      metadata: metadataPayload,
      entity_type_id: entityTypeId,
    }

    try {
      setSaving(true)
      setError('')
      if (isEditMode) {
        await updateEntity(entityId, payload)
      } else {
        await createEntity(worldId, payload)
      }
      onSaved?.(isEditMode ? 'edit' : 'create')
    } catch (err) {
      setError(err.message || 'Failed to save entity')
    } finally {
      setSaving(false)
    }
  }

  const isBusy = loadingTypes || loadingEntity

  useEffect(() => {
    if (!onStateChange) return
    const mode = isEditMode ? 'edit' : 'create'
    onStateChange({
      mode,
      saving,
      isBusy,
      submitLabel: saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Entity',
      submitDisabled: saving || isBusy,
      cancelDisabled: saving,
    })
  }, [onStateChange, isEditMode, saving, isBusy])

  return (
    <form id={formId} className="entity-form" onSubmit={handleSubmit}>
      {isBusy ? (
        <div className="form-loading">Loading...</div>
      ) : (
        <>
          <div className="form-group">
            <label htmlFor="entity-name">Name *</label>
            <input
              id="entity-name"
              type="text"
              value={values.name}
              onChange={handleInputChange('name')}
              placeholder="e.g. Waterdeep"
              disabled={saving}
              required
              data-autofocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="entity-description">Description</label>
            <textarea
              id="entity-description"
              value={values.description}
              onChange={handleInputChange('description')}
              placeholder="Optional summary of the entity"
              rows={4}
              disabled={saving}
            />
          </div>

          <div className="form-two-column">
            <div className="form-group">
              <label htmlFor="entity-type">Type *</label>
              <select
                id="entity-type"
                value={values.entityTypeId}
                onChange={handleInputChange('entityTypeId')}
                disabled={saving || loadingTypes}
                required
              >
                <option value="">Select type...</option>
                {entityTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="entity-visibility">Visibility *</label>
              <select
                id="entity-visibility"
                value={values.visibility}
                onChange={handleInputChange('visibility')}
                disabled={saving}
                required
              >
                {VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="advanced-options">
            <button
              type="button"
              className="advanced-options-toggle"
              onClick={handleToggleAdvanced}
              aria-expanded={showAdvanced}
            >
              <span>Advanced options</span>
              {hasMetadata ? (
                <span className="advanced-indicator">Metadata added</span>
              ) : null}
              <span className="advanced-chevron" aria-hidden="true">
                {showAdvanced ? '▴' : '▾'}
              </span>
            </button>

            {showAdvanced && (
              <div className="advanced-options-body">
                <div className="metadata-editor">
                  <div className="metadata-header">
                    <h3>Metadata {hasMetadata ? '' : '(optional)'}</h3>
                    <button
                      type="button"
                      className="btn neutral"
                      onClick={handleAddPair}
                      disabled={saving}
                    >
                      Add field
                    </button>
                  </div>

                  <div className="metadata-list">
                    {metadataPairs.map((pair, index) => (
                      <div className="metadata-row" key={pair.id}>
                        <div className="form-group">
                          <label htmlFor={`metadata-key-${pair.id}`} className="sr-only">
                            Metadata key {index + 1}
                          </label>
                          <input
                            id={`metadata-key-${pair.id}`}
                            type="text"
                            placeholder="Key"
                            value={pair.key}
                            onChange={handleMetadataChange(pair.id, 'key')}
                            disabled={saving}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`metadata-value-${pair.id}`} className="sr-only">
                            Metadata value {index + 1}
                          </label>
                          <input
                            id={`metadata-value-${pair.id}`}
                            type="text"
                            placeholder="Value"
                            value={pair.value}
                            onChange={handleMetadataChange(pair.id, 'value')}
                            disabled={saving}
                          />
                        </div>
                        <div className="metadata-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => handleRemovePair(pair.id)}
                            disabled={saving || metadataPairs.length === 1}
                            title="Remove field"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      {!hideActions && (
        <div className="form-actions">
          <button type="button" className="btn cancel" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn submit" disabled={saving || isBusy}>
            {saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Entity'}
          </button>
        </div>
      )}
    </form>
  )
}
