import { useEffect, useMemo, useState } from 'react'

export default function EntityTypeForm({
  initialData = {},
  onSubmit,
  onCancel,
  submitting = false,
  errorMessage,
}) {
  const [values, setValues] = useState({ name: '', description: '' })
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    setValues({
      name: initialData?.name || '',
      description: initialData?.description || '',
    })
    setLocalError('')
  }, [initialData])

  const isDirty = useMemo(() => {
    return (
      values.name !== (initialData?.name || '') ||
      values.description !== (initialData?.description || '')
    )
  }, [initialData, values.description, values.name])

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

    setLocalError('')

    const payload = {
      name: trimmedName,
      description: values.description?.trim() || '',
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
