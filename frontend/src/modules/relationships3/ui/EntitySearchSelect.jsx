// src/modules/relationships3/ui/EntitySearchSelect.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { searchEntities, getEntity } from '../../../api/entities.js'
import './EntitySearchSelect.css'

export default function EntitySearchSelect({
  worldId,
  label,
  value,
  onChange,
  allowedTypeIds = [],
  disabled = false,
  placeholder = 'Search entities…',
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState(null)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  // --- Stable memo for typeIds
  const allowedTypeIdsMemo = useMemo(
    () => [...allowedTypeIds],
    [JSON.stringify(allowedTypeIds)]
  )

  const getDisplayName = (entity) => {
    if (!entity) return ''
    const type =
      entity.entity_type?.name ||
      entity.entityType?.name ||
      entity.typeName ||
      ''
    return type ? `${entity.name} (${type})` : entity.name
  }

  // --- Sync only when parent value *actually changes*
  useEffect(() => {
    if (!value) {
      setSelectedEntity(null)
      setQuery('')
      return
    }

    // If full entity object provided
    if (typeof value === 'object' && value.id) {
      const display = getDisplayName(value)
      if (!selectedEntity || selectedEntity.id !== value.id) {
        setSelectedEntity(value)
        setQuery(display)
      }
      return
    }

    // If only ID provided
    if (typeof value === 'string') {
      if (selectedEntity?.id === value) return
      ;(async () => {
        try {
          const res = await getEntity(value)
          const data = res?.data || res
          if (data?.id) {
            setSelectedEntity(data)
            setQuery(getDisplayName(data))
          }
        } catch (err) {
          console.warn('Entity lookup failed', err)
        }
      })()
    }
  }, [value])

  // --- Debounced search
  const performSearch = async (term) => {
    if (!worldId || term.length < 2) return setResults([])
    try {
      setLoading(true)
      const res = await searchEntities({
        worldId,
        query: term,
        typeIds: allowedTypeIdsMemo,
        limit: 20,
      })
      const data = Array.isArray(res?.data) ? res.data : res
      setResults(data || [])
    } catch (err) {
      console.error('Entity search failed', err)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!query.trim() || selectedEntity) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      performSearch(query.trim())
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [query, worldId, selectedEntity])

  // --- Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (entity) => {
    setSelectedEntity(entity)
    setQuery(getDisplayName(entity))
    setOpen(false)
    setResults([])
    onChange(entity)
  }

  const handleClear = () => {
    setSelectedEntity(null)
    setQuery('')
    setResults([])
    onChange(null)
  }

  return (
    <div className="entity-search-select" ref={containerRef}>
      {label && <label>{label}</label>}

      <div className="entity-search-wrapper">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value
            setQuery(val)
            setSelectedEntity(null) // release lock
            setOpen(true)
          }}
          onFocus={() => {
            if (!disabled) setOpen(true)
          }}
          disabled={disabled}
          placeholder={placeholder}
          className="entity-search-input"
        />

        {selectedEntity && (
          <button
            type="button"
            className="clear-btn"
            onClick={handleClear}
            title="Clear selection"
          >
            ×
          </button>
        )}
      </div>

      {loading && <div className="small text-muted">Searching…</div>}

      {open && results.length > 0 && (
        <ul className="entity-results">
          {results.map((entity) => (
            <li
              key={entity.id}
              onClick={() => handleSelect(entity)}
              className={selectedEntity?.id === entity.id ? 'selected' : ''}
            >
              {getDisplayName(entity)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
