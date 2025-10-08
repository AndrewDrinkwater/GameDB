export default function FieldRenderer({ field, value, onChange }) {
  const handleChange = (e) => onChange(field.key, e.target.value)

  switch (field.type) {
    case 'select':
      return (
        <div className="form-group">
          <label>{field.label}</label>
          <select value={value} onChange={handleChange}>
            {(field.options || []).map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )
    case 'textarea':
      return (
        <div className="form-group">
          <label>{field.label}</label>
          <textarea rows="4" value={value} onChange={handleChange} />
        </div>
      )
    case 'checkbox':
      return (
        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(field.key, e.target.checked)}
            />
            {field.label}
          </label>
        </div>
      )
    case 'readonly':
      return (
        <div className="form-group readonly">
          <label>{field.label}</label>
          <div className="readonly-value">{value || '-'}</div>
        </div>
      )
    default:
      return (
        <div className="form-group">
          <label>{field.label}</label>
          <input type={field.type || 'text'} value={value} onChange={handleChange} />
        </div>
      )
  }
}
