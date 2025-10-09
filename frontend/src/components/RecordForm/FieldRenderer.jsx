import { useEffect, useState } from 'react'
import { getAuthToken } from '../../utils/authHelpers.js'

export default function FieldRenderer({ field, data, onChange, mode = 'edit' }) {
  const key = field.key || field.name || field.field || ''
  const [dynamicOptions, setDynamicOptions] = useState([])
  const [optionsLoaded, setOptionsLoaded] = useState(!field.optionsSource)
  const isViewMode = mode === 'view'

  // 🔐 Wait for token before fetching dynamic options
  async function waitForToken(retries = 5, delay = 200) {
    for (let i = 0; i < retries; i++) {
      const token = getAuthToken()
      if (token) return token
      await new Promise((res) => setTimeout(res, delay))
    }
    return null
  }

  // 🔄 Fetch options dynamically if `optionsSource` provided
  useEffect(() => {
    let isMounted = true

    const loadOptions = async () => {
      if (!field.optionsSource) {
        if (isMounted) {
          setDynamicOptions([])
          setOptionsLoaded(true)
        }
        return
      }

      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'
      let endpoint = null

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
        case 'players': {
          const roles = field.roles || 'player,user'
          endpoint = `${API_BASE}/api/users?roles=${encodeURIComponent(roles)}`
          break
        }
        default:
          endpoint = null
      }

      if (!endpoint) {
        if (isMounted) {
          setDynamicOptions([])
          setOptionsLoaded(true)
        }
        return
      }

      if (isMounted) {
        setOptionsLoaded(false)
      }

      try {
        const token = await waitForToken()
        if (!token) {
          console.warn('⚠️ No auth token available when loading options')
          if (isMounted) setOptionsLoaded(true)
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
          if (isMounted) setOptionsLoaded(true)
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
            for (const fallbackKey of fallbacks) {
              if (item?.[fallbackKey]) {
                label = item[fallbackKey]
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

        if (isMounted) {
          setDynamicOptions(options)
          setOptionsLoaded(true)

          if (options.length === 0) {
            console.warn(`⚠️ ${field.optionsSource} returned no data`, json)
          }
        }
      } catch (err) {
        console.error(`❌ Failed to load ${field.optionsSource}:`, err)
        if (isMounted) setOptionsLoaded(true)
      }
    }

    loadOptions()

    return () => {
      isMounted = false
    }
  }, [field.optionsSource, field.optionLabelKey, field.optionValueKey, field.roles])

  if (!key) {
    console.warn('⚠️ Field without key/name skipped:', field)
    return null
  }

  const label = field.label || key
  const type = (field.type || 'text').toLowerCase()
  const rawValue = key.includes('.')
    ? key.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), data)
    : data?.[key]

  const normalisedValue = (() => {
    if (['checkbox', 'boolean'].includes(type)) {
      return !!rawValue
    }

    if (type === 'multiselect') {
      if (Array.isArray(rawValue)) {
        return rawValue.map((value) => String(value))
      }
      if (typeof rawValue === 'string' && rawValue.length > 0) {
        return rawValue.split(',').map((value) => value.trim()).filter(Boolean)
      }
      return []
    }

    return rawValue ?? ''
  })()

  const readonlyField = field.readonly || field.disabled
  const isReadOnly = isViewMode || readonlyField

  const formattedValue = (val) => {
    if (val === null || val === undefined || val === '') return '—'
    if (Array.isArray(val)) {
      return val.length > 0 ? val.join(', ') : '—'
    }
    if (typeof val === 'boolean') return val ? 'Yes' : 'No'
    return String(val)
  }

  const safeValue = formattedValue(normalisedValue)

  const handleChange = (e) => onChange?.(key, e.target.value)
  const handleCheck = (e) => onChange?.(key, e.target.checked)
  const handleMultiChange = (e) => {
    const selections = Array.from(e.target.selectedOptions).map((option) => option.value)
    onChange?.(key, selections)
  }

  const renderHelpText = (showEmptyNotice) => {
    const help = []
    if (field.helpText) {
      help.push(
        <p key="help" className="help-text">
          {field.helpText}
        </p>
      )
    }
    if (showEmptyNotice) {
      help.push(
        <p key="empty" className="help-text warning">
          {field.noOptionsMessage || 'No options available.'}
        </p>
      )
    }
    return help
  }

  // --- SELECT / DROPDOWN ---
  if (['select', 'dropdown', 'reference'].includes(type)) {
    const opts = [...(field.options || []), ...dynamicOptions]
    const selectValue = normalisedValue ?? ''
    const showEmptyNotice = optionsLoaded && field.optionsSource && opts.length === 0

    if (isReadOnly) {
      const selected = opts.find((opt) => {
        if (!opt) return false
        if (typeof opt === 'object') return String(opt.value) === String(selectValue)
        return String(opt) === String(selectValue)
      })
      const display = field.displayKey && data?.[field.displayKey]
        ? formattedValue(data[field.displayKey])
        : formattedValue(
            selected
              ? (typeof selected === 'object' ? selected.label ?? selected.value : selected)
              : selectValue
          )

      return (
        <div className={`form-group ${isReadOnly ? 'readonly' : ''}`}>
          <label>{label}</label>
          <input type="text" value={display} disabled className="readonly-control" />
          {renderHelpText(false)}
        </div>
      )
    }
    return (
      <div className="form-group">
        <label>{label}</label>
        <div className="select-wrapper">
          <select
            value={selectValue}
            onChange={handleChange}
            disabled={showEmptyNotice}
          >
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
        {renderHelpText(showEmptyNotice)}
      </div>
    )
  }

  if (type === 'multiselect') {
    const opts = [...(field.options || []), ...dynamicOptions]
    const values = Array.isArray(normalisedValue)
      ? normalisedValue.map((val) => String(val))
      : []
    const showEmptyNotice = optionsLoaded && field.optionsSource && opts.length === 0

    if (isReadOnly) {
      const labels = values
        .map((val) => {
          const opt = opts.find((option) => {
            if (!option) return false
            if (typeof option === 'object') return String(option.value) === String(val)
            return String(option) === String(val)
          })
          if (!opt) return null
          return typeof opt === 'object' ? opt.label ?? opt.value : opt
        })
        .filter(Boolean)

      return (
        <div className={`form-group ${isReadOnly ? 'readonly' : ''}`}>
          <label>{label}</label>
          <textarea
            className="textarea-field"
            value={labels.length ? labels.join('\n') : '—'}
            readOnly
          />
          {renderHelpText(false)}
        </div>
      )
    }

    return (
      <div className="form-group">
        <label>{label}</label>
        <div className="select-wrapper">
          <select
            multiple
            value={values}
            onChange={handleMultiChange}
            disabled={showEmptyNotice}
          >
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
        {renderHelpText(showEmptyNotice)}
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
          value={isReadOnly ? safeValue : normalisedValue}
          onChange={handleChange}
          disabled={isReadOnly}
        />
        {renderHelpText(false)}
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
            checked={!!normalisedValue}
            onChange={handleCheck}
            disabled={isReadOnly}
          />
          {label}
        </label>
        {renderHelpText(false)}
      </div>
    )
  }

  // --- READONLY ---
  if (type === 'readonly') {
    const display = normalisedValue?.username || normalisedValue?.name || normalisedValue || '-'
    return (
      <div className="form-group readonly">
        <label>{label}</label>
        <div className="readonly-value">{display}</div>
        {renderHelpText(false)}
      </div>
    )
  }

  // --- DEFAULT TEXT INPUT ---
  return (
    <div className={`form-group ${isReadOnly ? 'readonly' : ''}`}>
      <label>{label}</label>
      <input
        type={field.inputType || 'text'}
        value={isReadOnly ? safeValue : normalisedValue}
        onChange={handleChange}
        placeholder={field.placeholder || ''}
        disabled={isReadOnly}
        className={isReadOnly ? 'readonly-control' : undefined}
      />
      {renderHelpText(false)}
    </div>
  )
}
