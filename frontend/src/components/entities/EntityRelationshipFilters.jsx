import { useEffect, useMemo, useRef, useState } from 'react'
import {
  RELATIONSHIP_FILTER_MODES,
  createDefaultRelationshipFilters,
} from './entityRelationshipFilterUtils.js'

const isRelationshipFilterActive = (filters) => {
  if (!filters) return false
  const groups = [filters.relationshipTypes, filters.relatedEntityTypes]
  return groups.some((group) => {
    if (!group) return false
    if (group.mode !== 'include' && group.mode !== 'exclude') return false
    return Array.isArray(group.values) && group.values.length > 0
  })
}

const MODE_LABELS = {
  all: 'Show all',
  include: 'Only show selected',
  exclude: 'Hide selected',
}

const buildModeOptions = () =>
  RELATIONSHIP_FILTER_MODES.map((mode) => ({
    value: mode,
    label: MODE_LABELS[mode] || mode,
  }))

const modeOptions = buildModeOptions()

const normaliseGroup = (group) => {
  if (!group || typeof group !== 'object') {
    return { mode: 'all', values: [] }
  }

  const mode = RELATIONSHIP_FILTER_MODES.includes(group.mode) ? group.mode : 'all'
  const values = Array.isArray(group.values)
    ? group.values.map((value) => String(value))
    : []

  return {
    mode,
    values: mode === 'all' ? [] : values,
  }
}

function CheckboxList({
  options,
  group,
  onToggle,
  disabled,
}) {
  if (!options.length) {
    return <p className="entity-relationships-filter-empty">No options available.</p>
  }

  return (
    <div className="entity-relationships-filter-options">
      {options.map((option) => {
        const value = String(option.value)
        const checked = group.values.includes(value)
        return (
          <label key={value} className="entity-relationships-filter-option">
            <input
              type="checkbox"
              value={value}
              checked={checked}
              onChange={() => onToggle(value)}
              disabled={disabled}
            />
            <span>{option.label}</span>
          </label>
        )
      })}
    </div>
  )
}

export default function EntityRelationshipFilters({
  options,
  value,
  onChange,
  onReset,
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const filters = useMemo(() => normaliseGroupValue(value), [value])
  const active = isRelationshipFilterActive(filters)

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (disabled && open) {
      setOpen(false)
    }
  }, [disabled, open])

  const handleModeChange = (key, mode) => {
    if (!onChange) return
    const nextRelationshipTypes =
      key === 'relationshipTypes'
        ? normalizeGroupForChange(mode, filters.relationshipTypes.values)
        : normalizeGroupForChange(
            filters.relationshipTypes.mode,
            filters.relationshipTypes.values,
          )
    const nextRelatedEntityTypes =
      key === 'relatedEntityTypes'
        ? normalizeGroupForChange(mode, filters.relatedEntityTypes.values)
        : normalizeGroupForChange(
            filters.relatedEntityTypes.mode,
            filters.relatedEntityTypes.values,
          )
    onChange({
      relationshipTypes: nextRelationshipTypes,
      relatedEntityTypes: nextRelatedEntityTypes,
    })
  }

  const handleToggleValue = (key, optionValue) => {
    if (!onChange) return
    const group = key === 'relationshipTypes' ? filters.relationshipTypes : filters.relatedEntityTypes
    const nextValues = new Set(group.values)
    if (nextValues.has(optionValue)) {
      nextValues.delete(optionValue)
    } else {
      nextValues.add(optionValue)
    }

    const relationshipTypesGroup =
      key === 'relationshipTypes'
        ? normalizeGroupForChange(group.mode, Array.from(nextValues))
        : normalizeGroupForChange(
            filters.relationshipTypes.mode,
            filters.relationshipTypes.values,
          )
    const relatedEntityTypesGroup =
      key === 'relatedEntityTypes'
        ? normalizeGroupForChange(group.mode, Array.from(nextValues))
        : normalizeGroupForChange(
            filters.relatedEntityTypes.mode,
            filters.relatedEntityTypes.values,
          )

    onChange({
      relationshipTypes: relationshipTypesGroup,
      relatedEntityTypes: relatedEntityTypesGroup,
    })
  }

  const handleReset = () => {
    if (onReset) onReset()
    setOpen(false)
  }

  const relationshipTypesOptions = useMemo(() => normaliseOptions(options?.relationshipTypes), [options])
  const relatedEntityTypesOptions = useMemo(
    () => normaliseOptions(options?.relatedEntityTypes),
    [options],
  )

  return (
    <div className="entity-relationships-filter" ref={containerRef}>
      <button
        type="button"
        className={`btn secondary compact${active ? ' is-active' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
      >
        Filter
      </button>

      {open && !disabled ? (
        <div className="entity-relationships-filter-panel" role="dialog" aria-label="Filter relationships">
          <div className="entity-relationships-filter-section">
            <div className="entity-relationships-filter-mode">
              <span>Relationship Types</span>
              <select
                value={filters.relationshipTypes.mode}
                onChange={(event) => handleModeChange('relationshipTypes', event.target.value)}
              >
                {modeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {filters.relationshipTypes.mode !== 'all' ? (
              <CheckboxList
                options={relationshipTypesOptions}
                group={filters.relationshipTypes}
                onToggle={(value) => handleToggleValue('relationshipTypes', value)}
                disabled={relationshipTypesOptions.length === 0}
              />
            ) : null}
          </div>

          <div className="entity-relationships-filter-section">
            <div className="entity-relationships-filter-mode">
              <span>Related Entity Types</span>
              <select
                value={filters.relatedEntityTypes.mode}
                onChange={(event) => handleModeChange('relatedEntityTypes', event.target.value)}
              >
                {modeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {filters.relatedEntityTypes.mode !== 'all' ? (
              <CheckboxList
                options={relatedEntityTypesOptions}
                group={filters.relatedEntityTypes}
                onToggle={(value) => handleToggleValue('relatedEntityTypes', value)}
                disabled={relatedEntityTypesOptions.length === 0}
              />
            ) : null}
          </div>

          <div className="entity-relationships-filter-actions">
            <button
              type="button"
              className="btn ghost compact"
              onClick={handleReset}
            >
              Clear filters
            </button>
            <button
              type="button"
              className="btn secondary compact"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function normaliseOptions(options) {
  if (!Array.isArray(options)) return []
  return options
    .map((option) => {
      if (!option) return null
      const value = option.value
      const label = option.label ?? option.name ?? option.title ?? ''
      if (value === undefined || value === null) return null
      return { value: String(value), label: String(label || value) }
    })
    .filter(Boolean)
}

function normaliseGroupValue(value) {
  if (!value || typeof value !== 'object') {
    return createDefaultRelationshipFilters()
  }

  const relationshipTypes = normaliseGroup(value.relationshipTypes)
  const relatedEntityTypes = normaliseGroup(value.relatedEntityTypes)

  return { relationshipTypes, relatedEntityTypes }
}

function normalizeGroupForChange(mode, values) {
  const nextMode = RELATIONSHIP_FILTER_MODES.includes(mode) ? mode : 'all'
  const nextValues = Array.isArray(values) ? values.map((value) => String(value)) : []
  return {
    mode: nextMode,
    values: nextMode === 'all' ? [] : nextValues,
  }
}
