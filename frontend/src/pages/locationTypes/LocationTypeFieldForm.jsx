import { useEffect, useMemo, useState } from 'react'

const DATA_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'enum', label: 'Enum' },
  { value: 'entity_reference', label: 'Entity Reference' },
  { value: 'location_reference', label: 'Location Reference' },
]

export default function LocationTypeFieldForm({
  initialData = {},
  entityReferenceTypes = [],
  locationReferenceTypes = [],
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
    visibleByDefault: true,
    enumChoices: '',
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
        visibleByDefault: true,
        enumChoices: '',
        reference_type_id: '',
        reference_filter: '',
      })
      setLocalError('')
      return
    }

    const enumChoices = Array.isArray(initialData.options?.choices)
      ? initialData.options.choices.join(', ')
      : typeof initialData.options === 'string'
        ? initialData.options
        : ''

    const filterValue = initialData.reference_filter
      ? typeof initialData.reference_filter === 'string'
        ? initialData.reference_filter
        : JSON.stringify(initialData.reference_filter, null, 2)
      : ''

    // Handle migration from old 'reference' type to new types
    let dataType = initialData.data_type || 'text'
    if (dataType === 'reference') {
      // If it was a reference, default to location_reference for backward compatibility
      dataType = 'location_reference'
    }

    setValues({
      name: initialData.name || '',
      label: initialData.label || '',
      data_type: dataType,
      required: Boolean(initialData.required),
      visibleByDefault:
        initialData.visibleByDefault !== undefined
          ? Boolean(initialData.visibleByDefault)
          : initialData.visible_by_default !== undefined
            ? Boolean(initialData.visible_by_default)
            : true,
      enumChoices,
      reference_type_id: initialData.reference_type_id || '',
      reference_filter: filterValue,
    })
    setLocalError('')
  }, [initialData])

  useEffect(() => {
    setLocalError(errorMessage || '')
  }, [errorMessage])

  const isEnum = values.data_type === 'enum'
  const isEntityReference = values.data_type === 'entity_reference'
  const isLocationReference = values.data_type === 'location_reference'
  const isReference = isEntityReference || isLocationReference

  const entityReferenceTypeOptions = useMemo(() => {
    return entityReferenceTypes.map((type) => ({
      value: type.id,
      label: type.name,
    }))
  }, [entityReferenceTypes])

  const locationReferenceTypeOptions = useMemo(() => {
    return locationReferenceTypes.map((type) => ({
      value: type.id,
      label: type.name,
    }))
  }, [locationReferenceTypes])

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
      visible_by_default: Boolean(values.visibleByDefault),
    }

    if (isEnum) {
      const choices = values.enumChoices
        .split(',')
        .map((option) => option.trim())
        .filter(Boolean)

      if (!choices.length) {
        setLocalError('Enum options are required for enum fields.')
        return
      }

      payload.options = { choices }
    } else {
      payload.options = {}
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
          <label htmlFor="location-field-name">Field Name *</label>
          <input
            id="location-field-name"
            type="text"
            value={values.name}
            onChange={handleChange('name')}
            placeholder="e.g. population"
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="location-field-label">Label *</label>
          <input
            id="location-field-label"
            type="text"
            value={values.label}
            onChange={handleChange('label')}
            placeholder="e.g. Population"
            disabled={submitting}
          />
        </div>

        <div className="form-group">
          <label htmlFor="location-field-data-type">Data Type *</label>
          <select
            id="location-field-data-type"
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
            Determines how the value is stored and rendered in location forms.
          </p>
        </div>

        <div className="form-group checkbox-group">
          <div className="checkbox-control">
            <input
              id="location-field-required"
              type="checkbox"
              checked={values.required}
              onChange={handleChange('required')}
              disabled={submitting}
            />
            <label htmlFor="location-field-required">Required</label>
          </div>
          <span className="field-hint">Mark as required on location forms.</span>
        </div>

        <div className="form-group checkbox-group">
          <div className="checkbox-control">
            <input
              id="location-field-visible-default"
              type="checkbox"
              checked={values.visibleByDefault}
              onChange={handleChange('visibleByDefault')}
              disabled={submitting}
            />
            <label htmlFor="location-field-visible-default">Visible by default</label>
          </div>
          <span className="field-hint">
            Uncheck to hide this field unless a rule explicitly shows it.
          </span>
        </div>

        {isEnum && (
          <div className="form-group form-group-full">
            <label htmlFor="location-field-options">Enum Options *</label>
            <textarea
              id="location-field-options"
              value={values.enumChoices}
              onChange={handleChange('enumChoices')}
              placeholder="Comma separated values, e.g. Small, Medium, Large"
              rows={3}
              disabled={submitting}
            />
            <p className="field-hint">Comma-separated list of allowed values.</p>
          </div>
        )}

        {isReference && (
          <>
            <div className="form-group form-group-full">
              <label htmlFor="location-field-reference-type">
                {isEntityReference ? 'Entity' : 'Location'} Reference Type *
              </label>
              <select
                id="location-field-reference-type"
                value={values.reference_type_id}
                onChange={handleChange('reference_type_id')}
                disabled={submitting}
              >
                <option value="">
                  Select {isEntityReference ? 'entity' : 'location'} type
                </option>
                {(isEntityReference ? entityReferenceTypeOptions : locationReferenceTypeOptions).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="field-hint">
                Choose which {isEntityReference ? 'entity' : 'location'} type this field should reference.
              </p>
            </div>

            <div className="form-group form-group-full">
              <label htmlFor="location-field-reference-filter">Reference Filter</label>
              <textarea
                id="location-field-reference-filter"
                value={values.reference_filter}
                onChange={handleChange('reference_filter')}
                placeholder={`Optional JSON filter, e.g. {"metadata.size": "Large"}`}
                rows={4}
                disabled={submitting}
              />
              <p className="field-hint">Limit selectable {isEntityReference ? 'entities' : 'locations'} by filter criteria.</p>
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

