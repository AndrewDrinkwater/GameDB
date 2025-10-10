import { useEffect, useMemo, useRef, useState } from 'react'
import FieldRenderer from './FieldRenderer'
import useUnsavedChangesPrompt, {
  UNSAVED_CHANGES_MESSAGE,
} from '../../hooks/useUnsavedChangesPrompt'

/**
 * Backwards-compatible form renderer.
 * Supports:
 * - schema.sections[{ title, columns, fields: [...] }]
 * - schema.fields (flat)
 */
export default function FormRenderer({
  schema,
  initialData = {},
  onSubmit,
  onCancel,
  onDelete, // optional
}) {
  const [formData, setFormData] = useState(() =>
    initialData ? { ...initialData } : {},
  )
  const [initialSignature, setInitialSignature] = useState(() =>
    JSON.stringify(initialData ?? {}),
  )

  useEffect(() => {
    const nextData = initialData ? { ...initialData } : {}
    setFormData(nextData)
    setInitialSignature(JSON.stringify(initialData ?? {}))
  }, [initialData])

  // Normalize schema to sections so both shapes work
  const sections = useMemo(() => {
    if (Array.isArray(schema?.sections) && schema.sections.length > 0) {
      return schema.sections
    }
    if (Array.isArray(schema?.fields)) {
      return [{ title: schema.title, columns: schema.columns || 1, fields: schema.fields }]
    }
    return []
  }, [schema])

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const currentSignature = useMemo(
    () => JSON.stringify(formData ?? {}),
    [formData],
  )

  const isDirty = useMemo(
    () => currentSignature !== initialSignature,
    [currentSignature, initialSignature],
  )

  const bypassRef = useRef(false)

  useEffect(() => {
    if (!isDirty) {
      bypassRef.current = false
    }
  }, [isDirty])

  useUnsavedChangesPrompt(isDirty, undefined, bypassRef)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!onSubmit) return

    try {
      const result = await onSubmit(formData)
      if (result) {
        setInitialSignature(currentSignature)
        bypassRef.current = true
      }
    } catch (err) {
      console.error('Failed to submit form:', err)
    }
  }

  const handleCancelClick = () => {
    if (!onCancel) return

    if (
      !isDirty ||
      window.confirm(UNSAVED_CHANGES_MESSAGE)
    ) {
      setInitialSignature(currentSignature)
      bypassRef.current = true
      onCancel()
    }
  }

  const handleDeleteClick = async () => {
    if (!onDelete) return

    try {
      const result = await onDelete(formData)
      if (result) {
        setInitialSignature(currentSignature)
        bypassRef.current = true
      }
    } catch (err) {
      console.error('Failed to delete record:', err)
    }
  }

  return (
    <form className="record-form" onSubmit={handleSubmit}>
      <h2 className="form-title">{schema?.title || 'Record'}</h2>

      {sections.map((section, i) => (
        <div className="form-section" key={i}>
          {section.title ? <h3>{section.title}</h3> : null}
          <div className={`form-grid cols-${section.columns || 1}`}>
            {(section.fields || []).map((field, idx) => {
                if (!field || typeof field !== 'object') {
                    console.warn('⚠️ Skipping invalid field in schema:', field)
                return null
                }
                return (
                    <FieldRenderer
                        key={`${field.key || field.name || field.field || 'field'}-${idx}`}
                        field={field}
                        data={formData}
                        onChange={handleChange}
                        mode="edit"
                    />
                )
            })}
          </div>
        </div>
      ))}

      <div className="form-actions">
        {onDelete && (
          <button
            type="button"
            className="btn delete"
            onClick={handleDeleteClick}
          >
            {schema?.deleteLabel || 'Delete'}
          </button>
        )}

        <div className="right-actions">
          <button type="button" className="btn cancel" onClick={handleCancelClick}>
            Cancel
          </button>
          <button type="submit" className="btn submit">
            Save
          </button>
        </div>
      </div>
    </form>
  )
}
