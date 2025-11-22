// src/modules/relationships3/ui/LocationSearchSelect.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { fetchLocations, fetchLocationById } from '../../../api/locations.js'
import './EntitySearchSelect.css' // Reuse the same CSS

const EMPTY_STATIC_OPTIONS = Object.freeze([])

const getDisplayName = (location) => {
  if (!location) return ''
  return (
    location.name ||
    location.label ||
    location.title ||
    location.display ||
    location.displayName ||
    location.text ||
    String(location.id || '')
  )
}

export default function LocationSearchSelect({
  worldId,
  label,
  value,
  onChange,
  allowedTypeIds = [],
  disabled = false,
  placeholder = 'Search locations…',
  staticOptions,
  minSearchLength = 0,
  onResolved,
  required = false,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [error, setError] = useState('')
  const [allLocations, setAllLocations] = useState([])
  const containerRef = useRef(null)
  const debounceRef = useRef(null)
  const onResolvedRef = useRef(onResolved)

  const allowedTypeIdsMemo = useMemo(
    () => [...allowedTypeIds],
    [JSON.stringify(allowedTypeIds)],
  )

  const safeStaticOptions = Array.isArray(staticOptions)
    ? staticOptions
    : EMPTY_STATIC_OPTIONS

  const normalisedStaticOptions = useMemo(() => {
    if (!Array.isArray(safeStaticOptions)) return []
    return safeStaticOptions
      .map((option) => {
        if (!option) return null
        if (typeof option === 'object') {
          const id =
            option.id ?? option.value ?? option.key ?? option.slug ?? null
          const name = getDisplayName(option)
          if (id === null || id === undefined) return null
          return { id: String(id), name: name || String(id) }
        }
        return null
      })
      .filter(Boolean)
  }, [safeStaticOptions])

  // Load all locations for the world
  useEffect(() => {
    if (!worldId || disabled) {
      setAllLocations([])
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const res = await fetchLocations({
          worldId,
          locationTypeId: allowedTypeIdsMemo.length === 1 ? allowedTypeIdsMemo[0] : undefined,
        })
        if (cancelled) return
        const data = Array.isArray(res?.data) ? res.data : res
        setAllLocations(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load locations', err)
          setAllLocations([])
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [worldId, disabled, JSON.stringify(allowedTypeIdsMemo)])

  // Filter locations by type if allowedTypeIds is specified
  const filteredLocations = useMemo(() => {
    if (!allowedTypeIdsMemo.length) return allLocations
    return allLocations.filter((location) => {
      const typeId =
        location.location_type_id ||
        location.locationTypeId ||
        location.locationType?.id ||
        ''
      return allowedTypeIdsMemo.includes(String(typeId))
    })
  }, [allLocations, allowedTypeIdsMemo])

  // Filter locations by query
  const searchResults = useMemo(() => {
    if (!query.trim() || query.length < minSearchLength) {
      return filteredLocations
    }
    const lowerQuery = query.toLowerCase().trim()
    return filteredLocations.filter((location) => {
      const name = getDisplayName(location).toLowerCase()
      return name.includes(lowerQuery)
    })
  }, [filteredLocations, query, minSearchLength])

  useEffect(() => {
    if (!value) {
      setSelectedLocation(null)
      setQuery('')
      onResolvedRef.current?.(null)
      return undefined
    }

    if (typeof value === 'object' && value.id) {
      const display = getDisplayName(value)
      if (!selectedLocation || selectedLocation.id !== value.id) {
        setSelectedLocation(value)
        setQuery(display)
        onResolvedRef.current?.(value)
      }
      return undefined
    }

    if (typeof value !== 'string') {
      return undefined
    }

    const stringValue = value
    if (selectedLocation?.id === stringValue) {
      return undefined
    }

    const staticMatch = normalisedStaticOptions.find(
      (option) => String(option.id) === String(stringValue),
    )
    if (staticMatch) {
      setSelectedLocation(staticMatch)
      setQuery(getDisplayName(staticMatch))
      onResolvedRef.current?.(staticMatch)
      return undefined
    }

    // Try to find in already loaded locations
    const loadedMatch = allLocations.find(
      (loc) => String(loc.id) === String(stringValue),
    )
    if (loadedMatch) {
      setSelectedLocation(loadedMatch)
      setQuery(getDisplayName(loadedMatch))
      onResolvedRef.current?.(loadedMatch)
      return undefined
    }

    let cancelled = false

    ;(async () => {
      try {
        const res = await fetchLocationById(stringValue)
        if (cancelled) return
        const data = res?.data || res
        if (data?.id) {
          setSelectedLocation(data)
          setQuery(getDisplayName(data))
          onResolvedRef.current?.(data)
          return
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Location lookup failed', err)
        }
      }

      if (!cancelled) {
        setSelectedLocation({ id: stringValue, name: stringValue })
        setQuery(stringValue)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [value, normalisedStaticOptions, selectedLocation?.id, allLocations])

  // Keep onResolved ref up to date
  useEffect(() => {
    onResolvedRef.current = onResolved
  }, [onResolved])

  useEffect(() => {
    if (!open) return
    setResults(searchResults)
  }, [open, searchResults])

  const filteredStaticOptions = useMemo(() => {
    if (!normalisedStaticOptions.length) return []
    if (!query.trim() || query.length < minSearchLength) return normalisedStaticOptions
    const lower = query.trim().toLowerCase()
    return normalisedStaticOptions.filter((option) =>
      getDisplayName(option).toLowerCase().includes(lower),
    )
  }, [normalisedStaticOptions, query, minSearchLength])

  const combinedResults = useMemo(() => {
    const map = new Map()
    const items = []

    filteredStaticOptions.forEach((option) => {
      const id = option?.id
      if (id === undefined || id === null) return
      const key = String(id)
      if (map.has(key)) return
      map.set(key, true)
      items.push(option)
    })

    results.forEach((location) => {
      const id = location?.id
      if (id === undefined || id === null) return
      const key = String(id)
      if (map.has(key)) return
      map.set(key, true)
      items.push(location)
    })

    return items
  }, [filteredStaticOptions, results])

  const handleSelect = (location) => {
    if (!location) return
    setSelectedLocation(location)
    setQuery(getDisplayName(location))
    setOpen(false)
    setResults([])
    setError('')
    onChange?.(location)
  }

  const handleClear = () => {
    setSelectedLocation(null)
    setQuery('')
    setResults([])
    setError('')
    setOpen(false)
    onChange?.(null)
  }

  const showResults = open && combinedResults.length > 0
  const showEmptyState =
    open &&
    !loading &&
    !combinedResults.length &&
    query.trim().length >= minSearchLength &&
    !selectedLocation &&
    worldId

  const isDisabled = disabled || !worldId

  return (
    <div className="entity-search-select" ref={containerRef}>
      {label && <label>{label}</label>}

      <div className="entity-search-wrapper">
        <input
          type="text"
          value={query}
          required={required}
          onChange={(event) => {
            const val = event.target.value
            setQuery(val)
            setSelectedLocation(null)
            if (!disabled) {
              setOpen(true)
            }
          }}
          onFocus={() => {
            if (!disabled) {
              setOpen(true)
            }
          }}
          disabled={isDisabled}
          placeholder={placeholder}
          className="entity-search-input"
        />

        {selectedLocation && !disabled && (
          <button
            type="button"
            className="clear-btn"
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
            title="Clear selection"
            aria-label="Clear selection"
          >
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="small text-warning" role="alert">
          {error}
        </div>
      )}

      {showResults && (
        <ul className="entity-results" role="listbox">
          {combinedResults.map((location) => {
            const id = location?.id ?? location?.value ?? ''
            const name = getDisplayName(location)
            const isSelected = selectedLocation?.id === id

            return (
              <li
                key={id}
                role="option"
                aria-selected={isSelected}
                className={isSelected ? 'selected' : ''}
                onMouseDown={(e) => {
                  e.preventDefault()
                }}
                onClick={() => handleSelect(location)}
              >
                {name}
                {location.locationType && (
                  <span className="entity-search-result-meta">
                    {' '}
                    ({location.locationType.name})
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {showEmptyState && (
        <div className="small text-muted" style={{ marginTop: '0.25rem' }}>
          No locations found
        </div>
      )}

      {loading && open && (
        <div className="small text-muted">Loading locations…</div>
      )}
    </div>
  )
}

