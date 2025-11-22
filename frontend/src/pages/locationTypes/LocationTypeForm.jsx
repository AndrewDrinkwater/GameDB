import { useEffect, useMemo, useState } from 'react'

export default function LocationTypeForm({
  initialData = {},
  onSubmit,
  onCancel,
  submitting = false,
  errorMessage,
  worlds = [],
  locationTypes = [],
}) {
  const [values, setValues] = useState({
    name: '',
    description: '',
    worldId: '',
    parent_type_id: '',
    sort_order: 0,
  })
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    const initialWorld =
      initialData?.world_id || initialData?.worldId || initialData?.world?.id || ''

    setValues({
      name: initialData?.name || '',
      description: initialData?.description || '',
      worldId: initialWorld ? String(initialWorld) : '',
      parent_type_id: initialData?.parent_type_id || initialData?.parentType?.id || '',
      sort_order: initialData?.sort_order || 0,
    })
    setLocalError('')
  }, [initialData])

  const isDirty = useMemo(() => {
    return (
      values.name !== (initialData?.name || '') ||
      values.description !== (initialData?.description || '') ||
      values.worldId !==
        (initialData?.world_id || initialData?.worldId || initialData?.world?.id || '') ||
      values.parent_type_id !==
        (initialData?.parent_type_id || initialData?.parentType?.id || '') ||
      values.sort_order !== (initialData?.sort_order || 0)
    )
  }, [
    initialData,
    values.description,
    values.name,
    values.worldId,
    values.parent_type_id,
    values.sort_order,
  ])

  useEffect(() => {
    setLocalError(errorMessage || '')
  }, [errorMessage])

  const handleChange = (field) => (event) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleNumberChange = (field) => (event) => {
    const { value } = event.target
    const numValue = value === '' ? 0 : parseInt(value, 10)
    if (!Number.isNaN(numValue)) {
      setValues((prev) => ({ ...prev, [field]: numValue }))
    }
  }

  // Filter out the current type and its descendants from parent options
  const availableParentTypes = useMemo(() => {
    if (!initialData?.id) return locationTypes
    const excludeIds = new Set([initialData.id])
    // Simple check - in a real scenario, you'd want to check all descendants
    return locationTypes.filter((type) => !excludeIds.has(type.id))
  }, [locationTypes, initialData?.id])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedName = values.name.trim()

    if (!trimmedName) {
      setLocalError('Name is required.')
      return
    }

    const trimmedWorldId = values.worldId.trim()
    if (!trimmedWorldId) {
      setLocalError('Select a world for this location type.')
      return
    }

    setLocalError('')

    const payload = {
      name: trimmedName,
      description: values.description?.trim() || '',
      world_id: trimmedWorldId,
      parent_type_id: values.parent_type_id || null,
      sort_order: values.sort_order || 0,
    }

    try {
      const result = await onSubmit?.(payload)
      if (result === false) {
        return
      }
    } catch (err) {
      setLocalError(err.message || 'Failed to save location type')
    }
  }

  return (
    <form className="entity-type-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="location-type-name">Name *</label>
        <input
          id="location-type-name"
          type="text"
          value={values.name}
          onChange={handleChange('name')}
          placeholder="e.g. City, Region, Building"
          disabled={submitting}
          autoFocus
        />
      </div>

      <div className="form-group">
        <label htmlFor="location-type-world">World *</label>
        <select
          id="location-type-world"
          value={values.worldId}
          onChange={handleChange('worldId')}
          disabled={submitting}
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
        <label htmlFor="location-type-parent">Parent Type</label>
        <select
          id="location-type-parent"
          value={values.parent_type_id}
          onChange={handleChange('parent_type_id')}
          disabled={submitting}
        >
          <option value="">None (top-level)</option>
          {availableParentTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="location-type-sort-order">Sort Order</label>
        <input
          id="location-type-sort-order"
          type="number"
          value={values.sort_order}
          onChange={handleNumberChange('sort_order')}
          placeholder="0"
          disabled={submitting}
          min="0"
        />
      </div>

      <div className="form-group">
        <label htmlFor="location-type-description">Description</label>
        <textarea
          id="location-type-description"
          value={values.description}
          onChange={handleChange('description')}
          placeholder="Optional description for this location type"
          rows={5}
          disabled={submitting}
          className="textarea-field"
        />
      </div>

      {localError && (
        <div className="form-error" role="alert">
          {localError}
        </div>
      )}

      <div className="form-actions">
        <button
          type="button"
          className="btn cancel"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button type="submit" className="btn submit" disabled={submitting || !isDirty}>
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  )
}

