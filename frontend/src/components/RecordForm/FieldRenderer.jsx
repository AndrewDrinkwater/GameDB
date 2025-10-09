export default function FieldRenderer({ field, data, onChange }) {
  // Ensure we have a valid unique field key
  const key = field.key || field.name || field.field
  if (!key) {
    console.warn('⚠️ Field without key/name skipped:', field)
    return null
  }

  const label = field.label || key
  const type = (field.type || 'text').toLowerCase()

  // Get value safely
  const value = key.includes('.')
    ? key.split('.').reduce((acc, k) => (acc ? acc[k] : ''), data)
    : data?.[key] ?? ''

  // Handlers
  const handleChange = (e) => onChange(key, e.target.value)
  const handleCheck = (e) => onChange(key, e.target.checked)

  if (['select', 'dropdown', 'reference'].includes(type)) {
    return (
      <div className="form-group">
        <label>{label}</label>
        <div className="select-wrapper">
          <select value={value} onChange={handleChange}>
            <option value="">Select...</option>
            {(field.options || []).map((opt, i) => {
              const val = typeof opt === 'object' ? opt.value : opt
              const text = typeof opt === 'object' ? opt.label : opt
              return (
                <option key={val || i} value={val}>{text}</option>
              )
            })}
          </select>
        </div>
      </div>
    )
  }

  if (['textarea', 'multiline'].includes(type)) {
    return (
      <div className="form-group">
        <label>{label}</label>
        <textarea
          className="textarea-field"
          rows={field.rows || 4}
          value={value}
          onChange={handleChange}
        />
      </div>
    )
  }

  if (['checkbox', 'boolean'].includes(type)) {
    return (
      <div className="form-group checkbox">
        <label>
          <input type="checkbox" checked={!!value} onChange={handleCheck} />
          {label}
        </label>
      </div>
    )
  }

  if (type === 'readonly') {
    const display = value?.username || value?.name || value || '-'
    return (
      <div className="form-group readonly">
        <label>{label}</label>
        <div className="readonly-value">{display}</div>
      </div>
    )
  }

  // Default: single-line text input
  return (
    <div className="form-group">
      <label>{label}</label>
      <input
        type={field.inputType || 'text'}
        value={value}
        onChange={handleChange}
        placeholder={field.placeholder || ''}
      />
    </div>
  )
}
