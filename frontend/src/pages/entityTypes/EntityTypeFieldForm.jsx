import { useEffect, useMemo, useState } from 'react'

const DATA_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'enum', label: 'Enum' },
  { value: 'reference', label: 'Reference' },
]

export default function EntityTypeFieldForm({
  initialData = {},
  referenceTypes = [],
  onSubmit,
  onCancel,
  submitting = false,
  errorMessage,
}) {
  const [values, setValues] = useState({
    name: '',
    label: '',
    data_type: 'text',
    required: false,
    options: '',
    reference_type_id: '',
    reference_filter: '',
  })
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!initialData) {
      setValues({
        name: '',
        label: '',
        data_type: 'text',
        required: false,
        options: '',
        reference_type_id: '',
        reference_filter: '',
      })
      setLocalError('')
      return
    }

    const filterValue = initialData.reference_filter
      ? typeof initialData.reference_filter === 'string'
        ? initialData.reference_filter
        : JSON.stringify(initialData.reference_filter, null, 2)
      : ''

    setValues({
      name: initialData.name || '',
      label: initialData.label || '',
      data_type: initialData.data_type || 'text',
      required: Boolean(initialData.required),
      options: initialData.options || '',
      reference_type_id: initialData.reference_type_id || '',
      reference_filter: filterValue,
    })
    setLocalError('')
  }, [initialData])

  useEffect(() => {
    setLocalError(errorMessage || '')
  }, [errorMessage])

  const isEnum = values.data_type === 'enum'
  const isReference = values.data_type === 'reference'

  const referenceTypeOptions = useMemo(() => {
    return referenceTypes.map((type) => ({
      value: type.id,
      label: type.name,
    }))
  }, [referenceTypes])

  const handleChange = (field) => (event) => {
    const { value, type, checked } = event.target
    setValues((prev) => ({
      ...prev,
      [field]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const trimmedName = values.name.trim()
    const trimmedLabel = values.label.trim()

    if (!trimmedName) {
      setLocalError('Field name is required.')
      return
    }

    if (!trimmedLabel) {
      setLocalError('Field label is required.')
      return
    }

    if (!values.data_type) {
      setLocalError('Data type is required.')
      return
    }

    let referenceFilter = {}

    if (isReference) {
      if (!values.reference_type_id) {
        setLocalError('Reference type is required for reference fields.')
        return
      }

      const filterText = values.reference_filter.trim()
      if (filterText) {
        try {
          referenceFilter = JSON.parse(filterText)
          if (typeof referenceFilter !== 'object' || Array.isArray(referenceFilter)) {
            throw new Error('Reference filter must be a JSON object.')
          }
        } catch (err) {
          setLocalError(err.message || 'Reference filter must be valid JSON.')
          return
        }
      }
    }

    const payload = {
      name: trimmedName,
      label: trimmedLabel,
      data_type: values.data_type,
      required: Boolean(values.required),
    }

    if (isEnum) {
      payload.options = values.options
        .split(',')
        .map((option) => option.trim())
        .filter(Boolean)
        .join(', ')
    } else {
      payload.options = ''
    }

    if (isReference) {
      payload.reference_type_id = values.reference_type_id
      payload.reference_filter = referenceFilter
    } else {
      payload.reference_type_id = null
      payload.reference_filter = {}
    }

    try {
      const result = await onSubmit?.(payload)
      if (result === false) {
        return
      }
      setLocalError('')
    } catch (err) {
      setLocalError(err.message || 'Failed to save field')
    }
  }

  return (
    <form className="entity-type-field-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="entity-field-name">Field Name *</label>
          <input
            id="entity-field-name"
            type="text"
            value={values.name}
            onChange={handleChange('name')}
            placeholder="e.g. alignment"
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="entity-field-label">Label *</label>
          <input
            id="entity-field-label"
            type="text"
            value={values.label}
            onChange={handleChange('label')}
            placeholder="e.g. Alignment"
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="entity-field-data-type">Data Type *</label>
          <select
            id="entity-field-data-type"
            value={values.data_type}
            onChange={handleChange('data_type')}
            disabled={submitting}
          >
            {DATA_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="field-hint">
            Determines how the value is stored and rendered in entity forms.
          </p>
        </div>

        <div className="form-group checkbox-group">
          <div className="checkbox-control">
            <input
              id="entity-field-required"
              type="checkbox"
              checked={values.required}
              onChange={handleChange('required')}
              disabled={submitting}
            />
            <label htmlFor="entity-field-required">Required</label>
          </div>
          <span className="field-hint">Mark as required on entity forms.</span>
        </div>

        {isEnum && (
          <div className="form-group form-group-full">
            <label htmlFor="entity-field-options">Enum Options *</label>
            <textarea
              id="entity-field-options"
              value={values.options}
              onChange={handleChange('options')}
              placeholder="Comma separated values, e.g. Lawful Good, Neutral, Chaotic Evil"
              rows={3}
              disabled={submitting}
            />
            <p className="field-hint">Comma-separated list of allowed values.</p>
          </div>
        )}

        {isReference && (
          <>
            <div className="form-group form-group-full">
              <label htmlFor="entity-field-reference-type">Reference Type *</label>
              <select
                id="entity-field-reference-type"
                value={values.reference_type_id}
                onChange={handleChange('reference_type_id')}
                disabled={submitting}
              >
                <option value="">Select entity type</option>
                {referenceTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="field-hint">
                Choose which entity type this field should reference.
              </p>
            </div>

            <div className="form-group form-group-full">
              <label htmlFor="entity-field-reference-filter">Reference Filter</label>
              <textarea
                id="entity-field-reference-filter"
                value={values.reference_filter}
                onChange={handleChange('reference_filter')}
                placeholder='Optional JSON filter, e.g. {"metadata.subtype": "Town"}'
                rows={4}
                disabled={submitting}
              />
              <p className="field-hint">Limit selectable entities by filter criteria.</p>
            </div>
          </>
        )}
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
        <button type="submit" className="btn submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save Field'}
        </button>
      </div>
    </form>
  )
}
