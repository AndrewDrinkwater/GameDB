import { useEffect, useMemo, useState } from 'react'
import ListCollector from '../../components/ListCollector.jsx'

const normaliseIdList = (list) => {
  if (!Array.isArray(list)) return []
  return [...new Set(list.map((value) => (value ? String(value) : '')).filter(Boolean))]
}

const deriveInitialValues = (source = {}) => ({
  name: source?.name || '',
  fromName: source?.from_name || source?.fromName || '',
  toName: source?.to_name || source?.toName || '',
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
  optionsLoading = false,
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
      values.fromName !== initialSnapshot.fromName ||
      values.toName !== initialSnapshot.toName ||
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

  const handleListChange = (field) => (nextValues = []) => {
    const normalised = Array.isArray(nextValues) ? nextValues : []
    setValues((prev) => ({ ...prev, [field]: normalised }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedName = values.name.trim()
    const trimmedFromName = values.fromName.trim()
    const trimmedToName = values.toName.trim()

    if (!trimmedName) {
      setLocalError('Name is required.')
      return
    }

    if (!trimmedFromName) {
      setLocalError('Provide a label for the source direction.')
      return
    }

    if (!trimmedToName) {
      setLocalError('Provide a label for the target direction.')
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
      from_name: trimmedFromName,
      to_name: trimmedToName,
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
          disabled={saving || optionsLoading}
          autoFocus
        />
      </div>

      <div className="form-two-column">
        <div className="form-group">
          <label htmlFor="relationship-type-from-name">Source relationship label *</label>
          <input
            id="relationship-type-from-name"
            type="text"
            value={values.fromName}
            onChange={handleChange('fromName')}
            placeholder="e.g. Parent of"
            disabled={saving || optionsLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="relationship-type-to-name">Target relationship label *</label>
          <input
            id="relationship-type-to-name"
            type="text"
            value={values.toName}
            onChange={handleChange('toName')}
            placeholder="e.g. Child of"
            disabled={saving || optionsLoading}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="relationship-type-description">Description</label>
        <textarea
          id="relationship-type-description"
          value={values.description}
          onChange={handleChange('description')}
          placeholder="Optional description"
          rows={4}
          disabled={saving || optionsLoading}
          className="textarea-field"
        />
      </div>

      <div className="form-group">
        <label htmlFor="relationship-type-world">World *</label>
        <select
          id="relationship-type-world"
          value={values.worldId}
          onChange={handleChange('worldId')}
          disabled={saving || optionsLoading}
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
        <label htmlFor="relationship-type-from-entities">Allowed source entity types *</label>
        <ListCollector
          selected={values.fromEntityTypeIds}
          options={entityTypes}
          onChange={handleListChange('fromEntityTypeIds')}
          placeholder="Search entity types..."
          disabled={saving || optionsLoading}
          loading={optionsLoading}
          noOptionsMessage="No entity types available."
        />
        {entityTypes.length === 0 && !optionsLoading && (
          <p className="field-hint">Define entity types before creating relationships.</p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="relationship-type-to-entities">Allowed target entity types *</label>
        <ListCollector
          selected={values.toEntityTypeIds}
          options={entityTypes}
          onChange={handleListChange('toEntityTypeIds')}
          placeholder="Search entity types..."
          disabled={saving || optionsLoading}
          loading={optionsLoading}
          noOptionsMessage="No entity types available."
        />
        {entityTypes.length === 0 && !optionsLoading && (
          <p className="field-hint">Define entity types before creating relationships.</p>
        )}
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
        <button
          type="submit"
          className="btn submit"
          disabled={saving || optionsLoading || !isDirty}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}
