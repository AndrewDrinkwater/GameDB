// src/modules/relationships3/ui/EntitySearchSelect.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { searchEntities, getEntity } from '../../../api/entities.js'
import { resolveEntityResponse } from '../../../utils/entityHelpers.js'
import './EntitySearchSelect.css'

const EMPTY_STATIC_OPTIONS = Object.freeze([])

export default function EntitySearchSelect({
  worldId,
  label,
  value,
  onChange,
  allowedTypeIds = [],
  disabled = false,
  placeholder = 'Search entities…',
  staticOptions,
  minSearchLength = 2,
  onResolved,
  required = false,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState(null)
  const [error, setError] = useState('')
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
      .map((option, index) => {
        if (option === null || option === undefined) return null
        if (typeof option === 'object') {
          const rawValue =
            option.value ??
            option.id ??
            option.key ??
            option.slug ??
            `static-${index}`
          if (rawValue === undefined || rawValue === null) return null
          const labelValue =
            option.label ??
            option.name ??
            option.title ??
            option.display ??
            option.displayName ??
            rawValue
          return {
            id: String(rawValue),
            name: String(labelValue),
            entity_type: option.entity_type || option.entityType || null,
            typeName: option.typeName || null,
            _static: true,
          }
        }
        const text = String(option)
        return { id: text, name: text, _static: true }
      })
      .filter(Boolean)
  }, [safeStaticOptions])

  const getDisplayName = (entity) => {
    if (!entity) return ''
    const type =
      entity.entity_type?.name ||
      entity.entityType?.name ||
      entity.typeName ||
      entity.type?.name ||
      ''
    return type ? `${entity.name} (${type})` : entity.name
  }

  useEffect(() => {
    if (disabled) {
      setOpen(false)
    }
  }, [disabled])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!value) {
      setSelectedEntity(null)
      setQuery('')
      return undefined
    }

    if (typeof value === 'object' && value.id) {
      const display = getDisplayName(value)
      if (!selectedEntity || selectedEntity.id !== value.id) {
        setSelectedEntity(value)
        setQuery(display)
      }
      return undefined
    }

    if (typeof value !== 'string') {
      return undefined
    }

    const stringValue = value
    if (selectedEntity?.id === stringValue) {
      return undefined
    }

    const staticMatch = normalisedStaticOptions.find(
      (option) => String(option.id) === String(stringValue),
    )
    if (staticMatch) {
      setSelectedEntity(staticMatch)
      setQuery(getDisplayName(staticMatch))
      return undefined
    }

    let cancelled = false

    ;(async () => {
      try {
        const res = await getEntity(stringValue)
        if (cancelled) return
        const data = resolveEntityResponse(res)
        if (data?.id) {
          setSelectedEntity(data)
          setQuery(getDisplayName(data))
          return
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Entity lookup failed', err)
        }
      }

      if (!cancelled) {
        setSelectedEntity({ id: stringValue, name: stringValue })
        setQuery(stringValue)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [value, normalisedStaticOptions, selectedEntity?.id])

  // Clear results when allowedTypeIds changes to prevent showing stale results
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([])
    }
  }, [allowedTypeIdsMemo])

  useEffect(() => {
    if (!query.trim() || selectedEntity) return
    if (disabled) return

    const term = query.trim()
    if (term.length < minSearchLength) {
      setResults([])
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      if (!worldId) {
        setResults([])
        setLoading(false)
        return
      }

      ;(async () => {
        try {
          setLoading(true)
          setError('')
          // Only include typeIds in the search if we have valid type IDs to filter by
          // If empty, don't include typeIds parameter so backend handles it appropriately
          const searchParams = {
            worldId,
            query: term,
            limit: 20,
          }
          
          // Only add typeIds filter if we have valid type IDs
          if (allowedTypeIdsMemo && allowedTypeIdsMemo.length > 0) {
            searchParams.typeIds = allowedTypeIdsMemo
          }
          
          const res = await searchEntities(searchParams)
          const data = Array.isArray(res?.data) ? res.data : res
          
          // Additional client-side filtering as a safety check when typeIds are specified
          const filteredData = Array.isArray(data) ? (allowedTypeIdsMemo && allowedTypeIdsMemo.length > 0
            ? data.filter((entity) => {
                const entityTypeId = entity.typeId || entity.entity_type_id || entity.entityType?.id || ''
                return entityTypeId && allowedTypeIdsMemo.includes(String(entityTypeId))
              })
            : data) : []
          setResults(filteredData)
        } catch (err) {
          console.error('Entity search failed', err)
          setResults([])
          setError(err.message || 'Failed to search entities.')
        } finally {
          setLoading(false)
        }
      })()
    }, 400)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [
    query,
    worldId,
    selectedEntity,
    allowedTypeIdsMemo,
    disabled,
    minSearchLength,
  ])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keep onResolved ref up to date
  useEffect(() => {
    onResolvedRef.current = onResolved
  }, [onResolved])

  // Call onResolved when selectedEntity changes, but don't include onResolved in deps
  useEffect(() => {
    onResolvedRef.current?.(selectedEntity || null)
  }, [selectedEntity])

  const filteredStaticOptions = useMemo(() => {
    if (!normalisedStaticOptions.length) return []
    if (!query.trim()) return normalisedStaticOptions
    const lower = query.trim().toLowerCase()
    return normalisedStaticOptions.filter((option) =>
      getDisplayName(option).toLowerCase().includes(lower),
    )
  }, [normalisedStaticOptions, query])

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

    results.forEach((entity) => {
      const id = entity?.id
      if (id === undefined || id === null) return
      const key = String(id)
      if (map.has(key)) return
      map.set(key, true)
      items.push(entity)
    })

    return items
  }, [filteredStaticOptions, results])

  const handleSelect = (entity) => {
    if (!entity) return
    setSelectedEntity(entity)
    setQuery(getDisplayName(entity))
    setOpen(false)
    setResults([])
    setError('')
    onChange?.(entity)
  }

  const handleClear = () => {
    setSelectedEntity(null)
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
    !selectedEntity

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
            setSelectedEntity(null)
            if (!disabled) {
              setOpen(true)
            }
          }}
          onFocus={() => {
            if (!disabled) {
              setOpen(true)
            }
          }}
          disabled={disabled}
          placeholder={placeholder}
          className="entity-search-input"
        />

        {selectedEntity && !disabled && (
          <button
            type="button"
            className="clear-btn"
            onClick={handleClear}
            title="Clear selection"
            aria-label="Clear selection"
          >
            ×
          </button>
        )}
      </div>

      {loading && <div className="small text-muted">Searching…</div>}
      {error && <div className="small text-warning">{error}</div>}

      {showResults && (
        <ul className="entity-results">
          {combinedResults.map((entity) => (
            <li
              key={entity.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(entity)}
              className={selectedEntity?.id === entity.id ? 'selected' : ''}
            >
              {getDisplayName(entity)}
            </li>
          ))}
        </ul>
      )}

      {showEmptyState && (
        <div className="small text-muted" style={{ marginTop: '0.25rem' }}>
          No matches found.
        </div>
      )}
    </div>
  )
}
