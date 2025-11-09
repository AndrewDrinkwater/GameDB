import { useEffect, useMemo, useState } from 'react'

export default function EntityTypeForm({
  initialData = {},
  onSubmit,
  onCancel,
  submitting = false,
  errorMessage,
  worlds = [],
}) {
  const [values, setValues] = useState({ name: '', description: '', worldId: '' })
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    const initialWorld =
      initialData?.world_id || initialData?.worldId || initialData?.world?.id || ''

    setValues({
      name: initialData?.name || '',
      description: initialData?.description || '',
      worldId: initialWorld ? String(initialWorld) : '',
    })
    setLocalError('')
  }, [initialData])

  const isDirty = useMemo(() => {
    return (
      values.name !== (initialData?.name || '') ||
      values.description !== (initialData?.description || '') ||
      values.worldId !==
        (initialData?.world_id || initialData?.worldId || initialData?.world?.id || '')
    )
  }, [initialData, values.description, values.name, values.worldId])

  useEffect(() => {
    setLocalError(errorMessage || '')
  }, [errorMessage])

  const handleChange = (field) => (event) => {
    const { value } = event.target
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedName = values.name.trim()

    if (!trimmedName) {
      setLocalError('Name is required.')
      return
    }

    const trimmedWorldId = values.worldId.trim()
    if (!trimmedWorldId) {
      setLocalError('Select a world for this entity type.')
      return
    }

    setLocalError('')

    const payload = {
      name: trimmedName,
      description: values.description?.trim() || '',
      world_id: trimmedWorldId,
    }

    try {
      const result = await onSubmit?.(payload)
      if (result === false) {
        return
      }
    } catch (err) {
      setLocalError(err.message || 'Failed to save entity type')
    }
  }

  return (
    <form className="entity-type-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="entity-type-name">Name *</label>
        <input
          id="entity-type-name"
          type="text"
          value={values.name}
          onChange={handleChange('name')}
          placeholder="e.g. Faction"
          disabled={submitting}
          autoFocus
        />
      </div>

      <div className="form-group">
        <label htmlFor="entity-type-world">World *</label>
        <select
          id="entity-type-world"
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
        <label htmlFor="entity-type-description">Description</label>
        <textarea
          id="entity-type-description"
          value={values.description}
          onChange={handleChange('description')}
          placeholder="Optional description for this entity type"
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
