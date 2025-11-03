import { useEffect, useMemo, useRef, useState } from 'react'
import { normaliseListCollectorOption } from './listCollectorUtils.js'

export default function ListCollector({
  selected = [],
  options = [],
  onChange,
  placeholder = 'Search and select...',
  disabled = false,
  noOptionsMessage = 'No options available.',
  loading = false,
  inputId,
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const normalisedOptions = useMemo(() => {
    const mapped = options
      .map((option) => normaliseListCollectorOption(option))
      .filter(Boolean)
    const seen = new Set()
    return mapped.filter((option) => {
      const key = option.value
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [options])

  const selectedSet = useMemo(() => {
    const set = new Set()
    selected.forEach((value) => {
      if (value === null || value === undefined) return
      set.add(String(value))
    })
    return set
  }, [selected])

  const selectedItems = useMemo(() => {
    const optionMap = new Map(normalisedOptions.map((opt) => [opt.value, opt]))
    return Array.from(selectedSet).map((value) => {
      const option = optionMap.get(value)
      if (option) return option
      return { value, label: value }
    })
  }, [normalisedOptions, selectedSet])

  const availableOptions = useMemo(() => {
    return normalisedOptions.filter((opt) => !selectedSet.has(opt.value))
  }, [normalisedOptions, selectedSet])

  const filteredOptions = useMemo(() => {
    if (!query) return availableOptions
    const lower = query.toLowerCase()
    return availableOptions.filter((opt) => opt.label.toLowerCase().includes(lower))
  }, [availableOptions, query])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (event) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const updateSelection = (newValues) => {
    if (disabled) return
    const unique = []
    const seen = new Set()
    newValues.forEach((value) => {
      if (value === null || value === undefined) return
      const str = String(value)
      if (seen.has(str)) return
      seen.add(str)
      unique.push(str)
    })
    onChange?.(unique)
  }

  const handleSelect = (option) => {
    if (!option) return
    const next = [...selectedSet, option.value]
    updateSelection(next)
    setQuery('')
    setIsOpen(false)
  }

  const handleRemove = (value) => {
    const str = String(value)
    const next = Array.from(selectedSet).filter((item) => item !== str)
    updateSelection(next)
  }

  const showDropdown = isOpen && !disabled

  const emptyStateMessage = () => {
    if (loading) return 'Loading options...'
    if (availableOptions.length === 0) {
      if (selectedSet.size > 0) return 'All options selected.'
      return noOptionsMessage
    }
    return 'No matches found.'
  }

  return (
    <div className={`list-collector ${disabled ? 'disabled' : ''}`} ref={containerRef}>
      <div className="list-collector-input-wrapper">
        <input
          id={inputId}
          type="text"
          className="list-collector-input"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => !disabled && setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && filteredOptions.length > 0) {
              event.preventDefault()
              handleSelect(filteredOptions[0])
            }
            if (event.key === 'Escape') {
              setIsOpen(false)
              event.currentTarget.blur()
            }
          }}
        />
        <span className="list-collector-icon" aria-hidden="true">
          ▾
        </span>
      </div>

      {showDropdown && (
        <div className="list-collector-dropdown">
          {filteredOptions.length > 0 ? (
            <ul>
              {filteredOptions.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(option)}
                    className="list-collector-option"
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="list-collector-empty">{emptyStateMessage()}</div>
          )}
        </div>
      )}

      {selectedItems.length > 0 && (
        <div className="list-collector-pills">
          {selectedItems.map((item) => (
            <span key={item.value} className="list-collector-pill">
              <span className="pill-label">{item.label}</span>
              {!disabled && (
                <button
                  type="button"
                  className="pill-remove"
                  onClick={() => handleRemove(item.value)}
                  aria-label={`Remove ${item.label}`}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
