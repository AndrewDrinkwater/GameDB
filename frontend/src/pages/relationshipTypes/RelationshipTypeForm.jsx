import { useEffect, useMemo, useState } from 'react'

const normaliseIdList = (list) => {
  if (!Array.isArray(list)) return []
  return [...new Set(list.map((value) => (value ? String(value) : '')).filter(Boolean))]
}

const deriveInitialValues = (source = {}) => ({
  name: source?.name || '',
  description: source?.description || '',
  worldId: source?.world?.id || source?.world_id || '',
  fromEntityTypeIds: normaliseIdList(
    (source?.from_entity_types || []).map((entry) => entry?.id || entry?.entity_type_id),
  ),
  toEntityTypeIds: normaliseIdList(
    (source?.to_entity_types || []).map((entry) => entry?.id || entry?.entity_type_id),
  ),
})

const listsMatch = (a = [], b = []) => {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((value, index) => value === sortedB[index])
}

export default function RelationshipTypeForm({
  initialValues = {},
  entityTypes = [],
  worlds = [],
  saving = false,
  errorMessage = '',
  onSubmit,
  onCancel,
}) {
  const initialSnapshot = useMemo(() => deriveInitialValues(initialValues), [initialValues])
  const [values, setValues] = useState(initialSnapshot)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    setValues(deriveInitialValues(initialValues))
    setLocalError('')
  }, [initialValues])

  useEffect(() => {
    setLocalError(errorMessage || '')
  }, [errorMessage])

  const isDirty = useMemo(() => {
    return (
      values.name !== initialSnapshot.name ||
      values.description !== initialSnapshot.description ||
      values.worldId !== initialSnapshot.worldId ||
      !listsMatch(values.fromEntityTypeIds, initialSnapshot.fromEntityTypeIds) ||
      !listsMatch(values.toEntityTypeIds, initialSnapshot.toEntityTypeIds)
    )
  }, [initialSnapshot, values])

  const handleChange = (field) => (event) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const toggleEntityType = (field, id) => {
    setValues((prev) => {
      const list = prev[field] || []
      const stringId = String(id)
      const exists = list.includes(stringId)
      const next = exists ? list.filter((item) => item !== stringId) : [...list, stringId]
      return { ...prev, [field]: next }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedName = values.name.trim()

    if (!trimmedName) {
      setLocalError('Name is required.')
      return
    }

    if (!values.worldId) {
      setLocalError('Select a world for this relationship type.')
      return
    }

    if (!values.fromEntityTypeIds.length) {
      setLocalError('Select at least one allowed source entity type.')
      return
    }

    if (!values.toEntityTypeIds.length) {
      setLocalError('Select at least one allowed target entity type.')
      return
    }

    setLocalError('')

    const payload = {
      name: trimmedName,
      description: values.description?.trim() || '',
      world_id: values.worldId,
      from_entity_type_ids: values.fromEntityTypeIds,
      to_entity_type_ids: values.toEntityTypeIds,
    }

    try {
      const result = await onSubmit?.(payload)
      if (result === false) {
        return
      }
    } catch (err) {
      setLocalError(err.message || 'Failed to save relationship type')
    }
  }

  return (
    <form className="relationship-type-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="relationship-type-name">Name *</label>
        <input
          id="relationship-type-name"
          type="text"
          value={values.name}
          onChange={handleChange('name')}
          placeholder="e.g. Enemy"
          disabled={saving}
          autoFocus
        />
      </div>

      <div className="form-group">
        <label htmlFor="relationship-type-description">Description</label>
        <textarea
          id="relationship-type-description"
          value={values.description}
          onChange={handleChange('description')}
          placeholder="Optional description"
          rows={4}
          disabled={saving}
          className="textarea-field"
        />
      </div>

      <div className="form-group">
        <label htmlFor="relationship-type-world">World *</label>
        <select
          id="relationship-type-world"
          value={values.worldId}
          onChange={handleChange('worldId')}
          disabled={saving}
          required
        >
          <option value="">Select world...</option>
          {worlds.map((world) => (
            <option key={world.id} value={world.id}>
              {world.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Allowed source entity types *</label>
        <div className="checkbox-grid">
          {entityTypes.length === 0 ? (
            <p className="field-hint">No entity types available.</p>
          ) : (
            entityTypes.map((type) => {
              const stringId = String(type.id)
              const checked = values.fromEntityTypeIds.includes(stringId)
              return (
                <label key={`from-${type.id}`} className="checkbox-control">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={saving}
                    onChange={() => toggleEntityType('fromEntityTypeIds', stringId)}
                  />
                  <span>{type.name}</span>
                </label>
              )
            })
          )}
        </div>
      </div>

      <div className="form-group">
        <label>Allowed target entity types *</label>
        <div className="checkbox-grid">
          {entityTypes.length === 0 ? (
            <p className="field-hint">No entity types available.</p>
          ) : (
            entityTypes.map((type) => {
              const stringId = String(type.id)
              const checked = values.toEntityTypeIds.includes(stringId)
              return (
                <label key={`to-${type.id}`} className="checkbox-control">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={saving}
                    onChange={() => toggleEntityType('toEntityTypeIds', stringId)}
                  />
                  <span>{type.name}</span>
                </label>
              )
            })
          )}
        </div>
      </div>

      {localError && (
        <div className="form-error" role="alert">
          {localError}
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn cancel" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="btn submit" disabled={saving || !isDirty}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}
