import { useMemo, useState } from 'react'
import FieldRenderer from './FieldRenderer'

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
  const [formData, setFormData] = useState(() => ({ ...initialData }))

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
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
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
            onClick={() => onDelete(formData)}
          >
            {schema?.deleteLabel || 'Delete'}
          </button>
        )}

        <div className="right-actions">
          <button type="button" className="btn cancel" onClick={onCancel}>
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
