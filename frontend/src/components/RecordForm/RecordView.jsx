import { useMemo } from 'react'
import FieldRenderer from './FieldRenderer'

export default function RecordView({
  schema,
  data = {},
  onClose,
  closeLabel = 'Back',
  infoMessage,
}) {
  const sections = useMemo(() => {
    if (Array.isArray(schema?.sections) && schema.sections.length > 0) {
      return schema.sections
    }
    if (Array.isArray(schema?.fields)) {
      return [{ title: schema.title, columns: schema.columns || 1, fields: schema.fields }]
    }
    return []
  }, [schema])

  return (
    <div className="record-form record-view">
      <h2 className="form-title">{schema?.title || 'Details'}</h2>

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
                  data={data}
                  mode="view"
                />
              )
            })}
          </div>
        </div>
      ))}

      {infoMessage ? <p className="record-info">{infoMessage}</p> : null}

      {onClose ? (
        <div className="form-actions view-actions">
          <button type="button" className="btn" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
      ) : null}
    </div>
  )
}
