import { useState } from 'react'
import FormSection from './FormSection'

export default function FormRenderer({ schema, initialData = {}, onSubmit, onCancel }) {
  const { title, sections, fields } = schema
  const [form, setForm] = useState(() =>
    fields.reduce((acc, f) => ({ ...acc, [f.key]: initialData[f.key] || '' }), {})
  )

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <div className="record-form">
      <h2>{title}</h2>
      <form onSubmit={handleSubmit}>
        {sections.map((section) => (
          <FormSection
            key={section.title}
            section={section}
            fields={fields}
            values={form}
            onChange={handleChange}
          />
        ))}

        <div className="form-actions">
          <button type="submit">Submit</button>
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
