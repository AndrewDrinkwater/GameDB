import { useEffect, useMemo, useState } from 'react'
import ListCollector from '../../components/ListCollector.jsx'

const normaliseIdList = (list) => {
  if (!Array.isArray(list)) return []
  return [...new Set(list.map((v) => (v ? String(v) : '')).filter(Boolean))]
}

const deriveInitialValues = (source = {}) => ({
  name: source?.name || '',
  fromName: source?.from_name || source?.fromName || '',
  toName: source?.to_name || source?.toName || '',
  description: source?.description || '',
  worldId: source?.world?.id || source?.world_id || '',
  fromEntityTypeIds: normaliseIdList(
    (source?.from_entity_types || []).map((entry) => entry?.id || entry?.entity_type_id)
  ),
  toEntityTypeIds: normaliseIdList(
    (source?.to_entity_types || []).map((entry) => entry?.id || entry?.entity_type_id)
  ),
})

const listsMatch = (a = [], b = []) => {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((v, i) => v === sortedB[i])
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

  const entityTypeOptions = useMemo(() => {
    if (!Array.isArray(entityTypes)) return []
    return entityTypes
      .map((type) => {
        const id =
          type?.id || type?.entity_type_id || type?.entityTypeId || type?.value || ''
        if (!id) return null
        const worldId = type?.world_id || type?.worldId || type?.world?.id || ''
        return {
          value: String(id),
          label: type?.name || type?.label || 'Untitled type',
          worldId: worldId ? String(worldId) : '',
        }
      })
      .filter(Boolean)
  }, [entityTypes])

  const filteredEntityTypeOptions = useMemo(() => {
    const worldId = values.worldId ? String(values.worldId) : ''
    if (!worldId) return []
    return entityTypeOptions.filter((option) => option.worldId === worldId)
  }, [entityTypeOptions, values.worldId])

  useEffect(() => {
    const worldId = values.worldId ? String(values.worldId) : ''
    if (!worldId) {
      setValues((prev) => {
        if (prev.fromEntityTypeIds.length === 0 && prev.toEntityTypeIds.length === 0) {
          return prev
        }

        return {
          ...prev,
          fromEntityTypeIds: [],
          toEntityTypeIds: [],
        }
      })
      return
    }

    const allowedIds = new Set(filteredEntityTypeOptions.map((option) => option.value))

    setValues((prev) => {
      const nextFrom = prev.fromEntityTypeIds.filter((id) =>
        allowedIds.has(String(id)),
      )
      const nextTo = prev.toEntityTypeIds.filter((id) =>
        allowedIds.has(String(id)),
      )

      if (
        nextFrom.length === prev.fromEntityTypeIds.length &&
        nextTo.length === prev.toEntityTypeIds.length
      ) {
        return prev
      }

      return {
        ...prev,
        fromEntityTypeIds: nextFrom,
        toEntityTypeIds: nextTo,
      }
    })
  }, [filteredEntityTypeOptions, values.worldId])

  const handleChange = (field) => (e) => {
    const { value } = e.target
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

    if (!trimmedName) return setLocalError('Name is required.')
    if (!trimmedFromName) return setLocalError('Provide a label for the source direction.')
    if (!trimmedToName) return setLocalError('Provide a label for the target direction.')
    if (!values.worldId) return setLocalError('Select a world for this relationship type.')
    if (!values.fromEntityTypeIds.length)
      return setLocalError('Select at least one allowed source entity type.')
    if (!values.toEntityTypeIds.length)
      return setLocalError('Select at least one allowed target entity type.')

    setLocalError('')

    const payload = {
      name: trimmedName,
      from_name: trimmedFromName,
      to_name: trimmedToName,
      description: values.description?.trim() || '',
      world_id: values.worldId, // ✅ Only send snake_case to backend
      from_entity_type_ids: values.fromEntityTypeIds,
      to_entity_type_ids: values.toEntityTypeIds,
    }

    try {
      const result = await onSubmit?.(payload)
      if (result === false) return
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
          options={filteredEntityTypeOptions}
          onChange={handleListChange('fromEntityTypeIds')}
          placeholder="Search entity types..."
          disabled={saving || optionsLoading}
          loading={optionsLoading}
          noOptionsMessage={
            values.worldId ? 'No entity types available for this world.' : 'Select a world to choose entity types.'
          }
        />
      </div>

      <div className="form-group">
        <label htmlFor="relationship-type-to-entities">Allowed target entity types *</label>
        <ListCollector
          selected={values.toEntityTypeIds}
          options={filteredEntityTypeOptions}
          onChange={handleListChange('toEntityTypeIds')}
          placeholder="Search entity types..."
          disabled={saving || optionsLoading}
          loading={optionsLoading}
          noOptionsMessage={
            values.worldId ? 'No entity types available for this world.' : 'Select a world to choose entity types.'
          }
        />
      </div>

      {localError && <div className="form-error">{localError}</div>}

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
