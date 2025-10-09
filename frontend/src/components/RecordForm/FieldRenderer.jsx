import { useEffect, useState } from 'react'
import { getAuthToken } from '../../utils/authHelpers.js'


export default function FieldRenderer({ field, data, onChange }) {
  const key = field.key || field.name || field.field
  if (!key) {
    console.warn('⚠️ Field without key/name skipped:', field)
    return null
  }

  const label = field.label || key
  const type = (field.type || 'text').toLowerCase()
  const value = key.includes('.')
    ? key.split('.').reduce((acc, k) => (acc ? acc[k] : ''), data)
    : data?.[key] ?? ''

  const [dynamicOptions, setDynamicOptions] = useState([])

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
        }

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

        if (json?.data?.length) {
          setDynamicOptions(
            json.data.map((item) => ({
              value: item.id,
              label: item.name,
            }))
          )
        } else {
          console.warn(`⚠️ ${field.optionsSource} returned no data`, json)
        }
      } catch (err) {
        console.error(`❌ Failed to load ${field.optionsSource}:`, err)
      }
    }

    loadOptions()
  }, [field.optionsSource])

  const handleChange = (e) => onChange(key, e.target.value)
  const handleCheck = (e) => onChange(key, e.target.checked)

  // --- SELECT / DROPDOWN ---
  if (['select', 'dropdown', 'reference'].includes(type)) {
    const opts = [...(field.options || []), ...dynamicOptions]
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

  // --- CHECKBOX ---
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
