import FieldRenderer from './FieldRenderer'

export default function FormSection({ section, fields, values, onChange }) {
  const sectionFields = fields.filter((f) => section.fields.includes(f.key))
  return (
    <div className="form-section">
      <h3>{section.title}</h3>
      <div className={`form-grid cols-${section.columns || 1}`}>
        {sectionFields.map((field) => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  )
}
