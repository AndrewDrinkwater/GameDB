import { useEffect, useState } from 'react'
import { getAuthToken } from '../../utils/authHelpers.js'


export default function FieldRenderer({ field, data, onChange, mode = 'edit' }) {
  const key = field.key || field.name || field.field || ''
  const [dynamicOptions, setDynamicOptions] = useState([])
  const isViewMode = mode === 'view'

  // 🔐 Wait for token before fetching dynamic options
  async function waitForToken(retries = 5, delay = 200) {
    for (let i = 0; i < retries; i++) {
      const token = getAuthToken()
      if (token) return token
      await new Promise(res => setTimeout(res, delay))
    }
    return null
  }

  // 🔄 Fetch options dynamically if `optionsSource` provided
  useEffect(() => {
    const loadOptions = async () => {
      if (!field.optionsSource) return
      let endpoint = null

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

      switch (field.optionsSource) {
        case 'worlds':
          endpoint = `${API_BASE}/api/worlds`
          break
        case 'campaigns':
          endpoint = `${API_BASE}/api/campaigns`
          break
        case 'entities':
          endpoint = `${API_BASE}/api/entities`
          break
        case 'users':
          endpoint = `${API_BASE}/api/users`
          break
        default:
          endpoint = null
      }

      if (!endpoint) return

      try {
        const token = await waitForToken()
        if (!token) {
          console.warn('⚠️ No auth token available when loading options')
          return
        }

        const res = await fetch(endpoint, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        const json = await res.json()
        if (!res.ok) {
          console.warn(`⚠️ ${field.optionsSource} fetch failed`, json)
          return
        }

        const toOption = (item) => {
          if (!item || typeof item !== 'object') return null

          const valueKey = field.optionValueKey || 'id'
          const labelKey = field.optionLabelKey || 'name'

          const value = item?.[valueKey] ?? item?.id ?? null
          if (!value) return null

          let label = item?.[labelKey]
          if (!label) {
            const fallbacks = ['name', 'title', 'username']
            for (const key of fallbacks) {
              if (item?.[key]) {
                label = item[key]
                break
              }
            }
          }

          if (!label) label = String(value)

          return { value, label }
        }

        const options = Array.isArray(json?.data)
          ? json.data.map(toOption).filter(Boolean)
          : []

        if (options.length) {
          setDynamicOptions(options)
        } else {
          console.warn(`⚠️ ${field.optionsSource} returned no data`, json)
        }
      } catch (err) {
        console.error(`❌ Failed to load ${field.optionsSource}:`, err)
      }
    }

    loadOptions()
  }, [field.optionsSource, field.optionLabelKey, field.optionValueKey])

  if (!key) {
    console.warn('⚠️ Field without key/name skipped:', field)
    return null
  }

  const label = field.label || key
  const type = (field.type || 'text').toLowerCase()
  const value = key.includes('.')
    ? key.split('.').reduce((acc, k) => (acc ? acc[k] : ''), data)
    : data?.[key] ?? ''

  const readonlyField = field.readonly || field.disabled
  const isReadOnly = isViewMode || readonlyField

  const formattedValue = (val) => {
    if (val === null || val === undefined || val === '') return '—'
    if (typeof val === 'boolean') return val ? 'Yes' : 'No'
    return String(val)
  }

  const safeValue = formattedValue(value)

  const handleChange = (e) => onChange?.(key, e.target.value)
  const handleCheck = (e) => onChange?.(key, e.target.checked)

  // --- SELECT / DROPDOWN ---
  if (['select', 'dropdown', 'reference'].includes(type)) {
    const opts = [...(field.options || []), ...dynamicOptions]
    if (isReadOnly) {
      const selected = opts.find((opt) => {
        if (!opt) return false
        if (typeof opt === 'object') return String(opt.value) === String(value)
        return String(opt) === String(value)
      })
      const display = field.displayKey && data?.[field.displayKey]
        ? formattedValue(data[field.displayKey])
        : formattedValue(
            selected
              ? (typeof selected === 'object' ? selected.label ?? selected.value : selected)
              : value
          )

      return (
        <div className={`form-group ${isReadOnly ? 'readonly' : ''}`}>
          <label>{label}</label>
          <input
            type="text"
            value={display}
            disabled
            className="readonly-control"
          />
        </div>
      )
    }
    return (
      <div className="form-group">
        <label>{label}</label>
        <div className="select-wrapper">
          <select value={value} onChange={handleChange}>
            <option value="">Select...</option>
            {opts.map((opt, i) => {
              const val = typeof opt === 'object' ? opt.value : opt
              const text = typeof opt === 'object' ? opt.label : opt
              return (
                <option key={val || i} value={val}>
                  {text}
                </option>
              )
            })}
          </select>
        </div>
      </div>
    )
  }

  // --- TEXTAREA ---
  if (['textarea', 'multiline'].includes(type)) {
    return (
      <div className={`form-group ${isReadOnly ? 'readonly' : ''}`}>
        <label>{label}</label>
        <textarea
          className="textarea-field"
          rows={field.rows || 4}
          value={isReadOnly ? safeValue : value}
          onChange={handleChange}
          disabled={isReadOnly}
        />
      </div>
    )
  }

  // --- CHECKBOX ---
  if (['checkbox', 'boolean'].includes(type)) {
    return (
      <div className="form-group checkbox">
        <label>
          <input
            type="checkbox"
            checked={!!value}
            onChange={handleCheck}
            disabled={isReadOnly}
          />
          {label}
        </label>
      </div>
    )
  }

  // --- READONLY ---
  if (type === 'readonly') {
    const display = value?.username || value?.name || value || '-'
    return (
      <div className="form-group readonly">
        <label>{label}</label>
        <div className="readonly-value">{display}</div>
      </div>
    )
  }

  // --- DEFAULT TEXT INPUT ---
  return (
    <div className={`form-group ${isReadOnly ? 'readonly' : ''}`}>
      <label>{label}</label>
      <input
        type={field.inputType || 'text'}
        value={isReadOnly ? safeValue : value}
        onChange={handleChange}
        placeholder={field.placeholder || ''}
        disabled={isReadOnly}
        className={isReadOnly ? 'readonly-control' : undefined}
      />
    </div>
  )
}
