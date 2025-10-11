import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getWorldEntities } from '../../api/entities.js'
import {
  createRelationship,
  getRelationship,
  updateRelationship,
} from '../../api/entityRelationships.js'
import { getRelationshipTypes } from '../../api/entityRelationshipTypes.js'

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

const coerceContextValue = (value) => {
  const trimmed = value.trim()
  if (!trimmed) return ''

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

  const numeric = Number(trimmed)
  if (!Number.isNaN(numeric) && trimmed !== '') {
    return numeric
  }

  return value
}

export default function EntityRelationshipForm({
  worldId,
  relationshipId,
  onCancel,
  onSaved,
}) {
  const isEditMode = Boolean(relationshipId)
  const pairIdRef = useRef(0)

  const generatePair = useCallback(
    (key = '', value = '') => {
      pairIdRef.current += 1
      return { id: pairIdRef.current, key, value }
    },
    [],
  )

  const ensureAtLeastOnePair = useCallback(
    (pairs) => {
      if (pairs.length > 0) return pairs
      return [generatePair()]
    },
    [generatePair],
  )

  const normalisePairsFromContext = useCallback(
    (context) => {
      pairIdRef.current = 0
      if (!context || typeof context !== 'object' || Array.isArray(context)) {
        return [generatePair()]
      }

      const entries = Object.entries(context)
      if (entries.length === 0) {
        return [generatePair()]
      }

      return entries.map(([key, value]) => generatePair(key, normaliseValueForInput(value)))
    },
    [generatePair],
  )

  const [entities, setEntities] = useState([])
  const [relationshipTypes, setRelationshipTypes] = useState([])
  const [values, setValues] = useState({
    fromEntityId: '',
    toEntityId: '',
    relationshipTypeId: '',
    bidirectional: false,
  })
  const [contextPairs, setContextPairs] = useState(() => {
    pairIdRef.current = 0
    return [generatePair()]
  })
  const [loadingEntities, setLoadingEntities] = useState(false)
  const [loadingTypes, setLoadingTypes] = useState(false)
  const [loadingRelationship, setLoadingRelationship] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const hasContext = useMemo(
    () => contextPairs.some((pair) => pair.key.trim() !== '' || pair.value.trim() !== ''),
    [contextPairs],
  )

  useEffect(() => {
    let cancelled = false

    if (!worldId) {
      setEntities([])
      return () => {}
    }

    const loadEntities = async () => {
      setLoadingEntities(true)
      try {
        const response = await getWorldEntities(worldId)
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : []
        if (!cancelled) {
          setEntities(list)
        }
      } catch (err) {
        if (!cancelled) {
          setEntities([])
          setError(err.message || 'Failed to load entities')
        }
      } finally {
        if (!cancelled) {
          setLoadingEntities(false)
        }
      }
    }

    loadEntities()
    return () => {
      cancelled = true
    }
  }, [worldId])

  useEffect(() => {
    let cancelled = false

    const loadTypes = async () => {
      setLoadingTypes(true)
      try {
        const response = await getRelationshipTypes()
        const list = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : []
        if (!cancelled) {
          setRelationshipTypes(list)
        }
      } catch (err) {
        if (!cancelled) {
          setRelationshipTypes([])
          setError(err.message || 'Failed to load relationship types')
        }
      } finally {
        if (!cancelled) {
          setLoadingTypes(false)
        }
      }
    }

    loadTypes()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const resetForm = () => {
      pairIdRef.current = 0
      setValues({
        fromEntityId: '',
        toEntityId: '',
        relationshipTypeId: '',
        bidirectional: false,
      })
      setContextPairs([generatePair()])
      setError('')
    }

    if (!isEditMode || !relationshipId) {
      resetForm()
      setLoadingRelationship(false)
      return () => {}
    }

    const loadRelationship = async () => {
      setLoadingRelationship(true)
      setError('')
      try {
        const response = await getRelationship(relationshipId)
        const data = response?.data || response
        if (!data) {
          throw new Error('Relationship not found')
        }

        if (!cancelled) {
          const fromEntityId =
            data.from_entity_id ||
            data.fromEntityId ||
            data.from_entity?.id ||
            data.fromEntity?.id ||
            ''
          const toEntityId =
            data.to_entity_id ||
            data.toEntityId ||
            data.to_entity?.id ||
            data.toEntity?.id ||
            ''
          const relationshipTypeId =
            data.entity_relationship_type_id ||
            data.relationship_type_id ||
            data.relationshipType?.id ||
            data.relationship_type?.id ||
            ''
          const bidirectional = Boolean(
            data.bidirectional ?? data.is_bidirectional ?? data.two_way,
          )

          setValues({
            fromEntityId: fromEntityId ? String(fromEntityId) : '',
            toEntityId: toEntityId ? String(toEntityId) : '',
            relationshipTypeId: relationshipTypeId ? String(relationshipTypeId) : '',
            bidirectional,
          })
          setContextPairs(ensureAtLeastOnePair(normalisePairsFromContext(data.context)))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load relationship')
        }
      } finally {
        if (!cancelled) {
          setLoadingRelationship(false)
        }
      }
    }

    loadRelationship()
    return () => {
      cancelled = true
    }
  }, [relationshipId, isEditMode, ensureAtLeastOnePair, normalisePairsFromContext, generatePair])

  const handleValueChange = (field) => (event) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleBidirectionalChange = (event) => {
    const { checked } = event.target
    setValues((prev) => ({ ...prev, bidirectional: checked }))
  }

  const handleContextChange = (id, field) => (event) => {
    const { value } = event.target
    setContextPairs((prev) => prev.map((pair) => (pair.id === id ? { ...pair, [field]: value } : pair)))
  }

  const handleAddPair = () => {
    setContextPairs((prev) => [...prev, generatePair()])
  }

  const handleRemovePair = (id) => {
    setContextPairs((prev) => ensureAtLeastOnePair(prev.filter((pair) => pair.id !== id)))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!worldId) {
      setError('Select a world before creating relationships.')
      return
    }

    const fromEntityId = values.fromEntityId.trim()
    const toEntityId = values.toEntityId.trim()
    const relationshipTypeId = values.relationshipTypeId.trim()

    if (!fromEntityId || !toEntityId) {
      setError('Both entities are required.')
      return
    }

    if (!relationshipTypeId) {
      setError('Relationship type is required.')
      return
    }

    const contextPayload = {}
    contextPairs.forEach(({ key, value }) => {
      const trimmedKey = key.trim()
      if (!trimmedKey) return
      contextPayload[trimmedKey] = coerceContextValue(value)
    })

    const payload = {
      world_id: worldId,
      from_entity_id: fromEntityId,
      to_entity_id: toEntityId,
      relationship_type_id: relationshipTypeId,
      bidirectional: Boolean(values.bidirectional),
      context: contextPayload,
    }

    try {
      setSaving(true)
      setError('')
      if (isEditMode) {
        await updateRelationship(relationshipId, payload)
      } else {
        await createRelationship(payload)
      }
      onSaved?.(isEditMode ? 'edit' : 'create')
    } catch (err) {
      setError(err.message || 'Failed to save relationship')
    } finally {
      setSaving(false)
    }
  }

  const isBusy = loadingEntities || loadingTypes || loadingRelationship

  return (
    <form className="entity-form relationship-form" onSubmit={handleSubmit}>
      <div className="form-two-column">
        <div className="form-group">
          <label htmlFor="relationship-from-entity">From Entity *</label>
          <select
            id="relationship-from-entity"
            value={values.fromEntityId}
            onChange={handleValueChange('fromEntityId')}
            disabled={saving || isBusy}
            required
          >
            <option value="">Select entity...</option>
            {entities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="relationship-to-entity">To Entity *</label>
          <select
            id="relationship-to-entity"
            value={values.toEntityId}
            onChange={handleValueChange('toEntityId')}
            disabled={saving || isBusy}
            required
          >
            <option value="">Select entity...</option>
            {entities.map((entity) => (
              <option key={entity.id} value={entity.id}>
                {entity.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-two-column">
        <div className="form-group">
          <label htmlFor="relationship-type">Relationship Type *</label>
          <select
            id="relationship-type"
            value={values.relationshipTypeId}
            onChange={handleValueChange('relationshipTypeId')}
            disabled={saving || isBusy}
            required
          >
            <option value="">Select type...</option>
            {relationshipTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group checkbox">
          <label htmlFor="relationship-bidirectional">
            <input
              id="relationship-bidirectional"
              type="checkbox"
              checked={values.bidirectional}
              onChange={handleBidirectionalChange}
              disabled={saving || isBusy}
            />
            Bidirectional
          </label>
        </div>
      </div>

      <div className="metadata-editor">
        <div className="metadata-header">
          <h3>Context {hasContext ? '' : '(optional)'}</h3>
          <button
            type="button"
            className="btn neutral"
            onClick={handleAddPair}
            disabled={saving || isBusy}
          >
            Add field
          </button>
        </div>

        <div className="metadata-list">
          {contextPairs.map((pair, index) => (
            <div className="metadata-row" key={pair.id}>
              <div className="form-group">
                <label htmlFor={`context-key-${pair.id}`} className="sr-only">
                  Context key {index + 1}
                </label>
                <input
                  id={`context-key-${pair.id}`}
                  type="text"
                  placeholder="Key"
                  value={pair.key}
                  onChange={handleContextChange(pair.id, 'key')}
                  disabled={saving || isBusy}
                />
              </div>
              <div className="form-group">
                <label htmlFor={`context-value-${pair.id}`} className="sr-only">
                  Context value {index + 1}
                </label>
                <input
                  id={`context-value-${pair.id}`}
                  type="text"
                  placeholder="Value"
                  value={pair.value}
                  onChange={handleContextChange(pair.id, 'value')}
                  disabled={saving || isBusy}
                />
              </div>
              <div className="metadata-actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => handleRemovePair(pair.id)}
                  disabled={saving || isBusy || contextPairs.length === 1}
                  title="Remove field"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isBusy && (
        <div className="form-loading" role="status">
          Loading data...
        </div>
      )}

      {error && (
        <div className="form-error" role="alert">
          {error}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn cancel" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn submit" disabled={saving || isBusy}>
          {saving ? 'Saving...' : isEditMode ? 'Save Changes' : 'Create Relationship'}
        </button>
      </div>
    </form>
  )
}
