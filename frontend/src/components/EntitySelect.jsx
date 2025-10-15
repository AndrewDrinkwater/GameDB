import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PropTypes from '../utils/propTypes.js'
import { getEntity, searchEntities } from '../api/entities.js'

const DEFAULT_LIMIT = 20
const DEBOUNCE_DELAY = 250

const normaliseEntityPayload = (payload) => {
  if (!payload) return null
  if (payload.id === undefined) {
    const data = payload.data ?? payload.entity ?? payload.result
    if (data) return normaliseEntityPayload(data)
    return null
  }

  const type =
    payload.entityType ||
    payload.entity_type ||
    (payload.entity_type_id
      ? { id: payload.entity_type_id, name: payload.entity_type_name }
      : null)

  return {
    id: payload.id,
    name: payload.name || 'Untitled entity',
    typeId: type?.id ?? payload.entity_type_id ?? null,
    typeName: type?.name ?? payload.entity_type_name ?? '',
  }
}

const extractListFromResponse = (response) => {
  if (!response) return { data: [], pagination: { hasMore: false, total: 0, limit: DEFAULT_LIMIT, offset: 0 } }
  if (Array.isArray(response)) {
    return {
      data: response.map((item) => normaliseEntityPayload(item)).filter(Boolean),
      pagination: { hasMore: false, limit: response.length, offset: 0, total: response.length },
    }
  }

  const data = Array.isArray(response.data) ? response.data : []
  const pagination =
    response.pagination && typeof response.pagination === 'object'
      ? response.pagination
      : { hasMore: false, limit: data.length, offset: 0, total: data.length }

  return {
    data: data.map((item) => normaliseEntityPayload(item)).filter(Boolean),
    pagination,
  }
}

const useDebouncedValue = (value, delay) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const EntitySelect = ({
  worldId,
  allowedTypeIds = [],
  value,
  onChange,
  placeholder = 'Search for entity…',
  disabled = false,
  onEntityResolved,
  limit = DEFAULT_LIMIT,
  id,
  required = false,
  autoFocus = false,
}) => {
  const [inputValue, setInputValue] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState(null)
  const [initialised, setInitialised] = useState(false)
  const [activeQuery, setActiveQuery] = useState('')
  const debouncedInput = useDebouncedValue(inputValue, DEBOUNCE_DELAY)
  const containerRef = useRef(null)
  const listRef = useRef(null)
  const currentFetchRef = useRef(0)

  const isDisabled = disabled || !worldId

  const resetSearchState = useCallback(() => {
    setResults([])
    setHasMore(false)
    setOffset(0)
    setError('')
  }, [])

  const closeDropdown = useCallback(() => {
    setOpen(false)
  }, [])

  const notifyEntity = useCallback(
    (entity) => {
      if (!entity) {
        onEntityResolved?.(null)
        return
      }
      onEntityResolved?.(entity)
    },
    [onEntityResolved],
  )

  useEffect(() => {
    if (!value) {
      setSelected(null)
      setInputValue('')
      setInitialised(true)
      notifyEntity(null)
      return
    }

    const stringValue = String(value)
    if (selected && String(selected.id) === stringValue) {
      if (!initialised) {
        setInputValue(selected.name ?? '')
        setInitialised(true)
      }
      return
    }

    let cancelled = false
    const fetchId = ++currentFetchRef.current
    setLoading(true)
    setError('')

    getEntity(stringValue)
      .then((response) => {
        if (cancelled || fetchId !== currentFetchRef.current) return
        const entity = normaliseEntityPayload(response?.data ?? response)
        if (entity) {
          setSelected(entity)
          setInputValue(entity.name)
          notifyEntity(entity)
        } else {
          setSelected(null)
          notifyEntity(null)
        }
        setInitialised(true)
      })
      .catch((err) => {
        if (cancelled || fetchId !== currentFetchRef.current) return
        setSelected(null)
        setError(err.message || 'Failed to load entity')
        notifyEntity(null)
      })
      .finally(() => {
        if (cancelled || fetchId !== currentFetchRef.current) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [value, selected, initialised, notifyEntity])

  useEffect(() => {
    if (!open) return undefined

    const handleClickOutside = (event) => {
      if (!containerRef.current) return
      if (containerRef.current.contains(event.target)) return
      closeDropdown()
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, closeDropdown])

  const fetchResults = useCallback(
    async ({ append = false } = {}) => {
      if (!worldId) {
        resetSearchState()
        return
      }

      const query = debouncedInput.trim()
      const nextOffset = append ? offset : 0
      const fetchId = ++currentFetchRef.current
      setLoading(true)
      setError('')

      try {
        const response = await searchEntities({
          worldId,
          query,
          typeIds: allowedTypeIds.length > 0 ? allowedTypeIds : undefined,
          limit,
          offset: nextOffset,
        })
        if (fetchId !== currentFetchRef.current) return
        const { data, pagination } = extractListFromResponse(response)
        const allowedSet =
          allowedTypeIds.length > 0
            ? new Set(allowedTypeIds.map((typeId) => String(typeId)))
            : null
        const filteredData =
          allowedSet === null
            ? data
            : data.filter((item) => {
                if (!item?.typeId) return true
                return allowedSet.has(String(item.typeId))
              })
        setActiveQuery(query)
        if (append) {
          setResults((prev) => [...prev, ...filteredData])
        } else {
          setResults(filteredData)
        }
        const resolvedOffset = pagination?.offset ?? nextOffset
        const resolvedLimit = pagination?.limit ?? limit
        const totalLoaded = (append ? results.length : 0) + filteredData.length
        const totalAvailable = pagination?.total ?? totalLoaded
        const computedHasMore =
          pagination?.hasMore ?? totalLoaded + resolvedOffset < totalAvailable
        setHasMore(computedHasMore)
        const nextComputedOffset = append
          ? nextOffset + resolvedLimit
          : resolvedOffset + resolvedLimit
        setOffset(nextComputedOffset)
      } catch (err) {
        if (fetchId !== currentFetchRef.current) return
        setError(err.message || 'Failed to search entities')
        if (!append) {
          setResults([])
        }
      } finally {
        if (fetchId === currentFetchRef.current) {
          setLoading(false)
        }
      }
    },
    [
      worldId,
      allowedTypeIds,
      debouncedInput,
      limit,
      offset,
      resetSearchState,
      results.length,
    ],
  )

  useEffect(() => {
    if (!open) return
    fetchResults({ append: false })
  }, [debouncedInput, allowedTypeIds, worldId, fetchResults, open])

  useEffect(() => {
    if (!open) return
    const selectedId = selected ? String(selected.id) : ''
    if (!selectedId) return
    if (!listRef.current) return
    const element = listRef.current.querySelector(`[data-entity-option="${selectedId}"]`)
    if (!element) return
    element.scrollIntoView({ block: 'nearest' })
  }, [results, selected, open])

  useEffect(() => {
    if (!open) return
    if (activeQuery !== debouncedInput.trim()) {
      resetSearchState()
    }
  }, [debouncedInput, activeQuery, open, resetSearchState])

  const handleInputFocus = () => {
    if (isDisabled) return
    setOpen(true)
  }

  const handleInputChange = (event) => {
    setInputValue(event.target.value)
    if (!open) {
      setOpen(true)
    }
  }

  const handleSelect = (entity) => {
    setSelected(entity)
    setInputValue(entity.name ?? '')
    closeDropdown()
    onChange?.(String(entity.id))
    notifyEntity(entity)
  }

  const handleLoadMore = () => {
    if (loading || !hasMore) return
    fetchResults({ append: true })
  }

  const handleClear = () => {
    setSelected(null)
    setInputValue('')
    onChange?.('')
    notifyEntity(null)
    setOpen(false)
  }

  const showClearButton = useMemo(() => !isDisabled && Boolean(selected?.id), [isDisabled, selected])

  const resolvedPlaceholder = useMemo(() => {
    if (isDisabled && allowedTypeIds.length === 0) {
      return 'No allowed types'
    }
    return placeholder
  }, [isDisabled, allowedTypeIds.length, placeholder])

  return (
    <div className={`entity-select${isDisabled ? ' disabled' : ''}`} ref={containerRef}>
      <div className="entity-select-input-wrapper">
        <input
          type="text"
          className="entity-select-input"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={resolvedPlaceholder}
          disabled={isDisabled}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-haspopup="listbox"
          role="combobox"
          id={id}
          required={required}
          autoFocus={autoFocus}
        />
        {showClearButton && (
          <button
            type="button"
            className="entity-select-clear"
            onClick={handleClear}
            aria-label="Clear selection"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div className="entity-select-dropdown">
          <ul className="entity-select-results" role="listbox" ref={listRef}>
            {results.map((entity) => {
              const isSelected = selected && String(selected.id) === String(entity.id)
              return (
                <li
                  key={entity.id}
                  className={`entity-select-option${isSelected ? ' selected' : ''}`}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    handleSelect(entity)
                  }}
                  data-entity-option={entity.id}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="entity-select-option-name">{entity.name}</span>
                  {entity.typeName && (
                    <span className="entity-select-option-type">{entity.typeName}</span>
                  )}
                </li>
              )
            })}
          </ul>

          {loading && (
            <div className="entity-select-status" role="status">
              Loading…
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="entity-select-status">No matching entities found.</div>
          )}

          {error && <div className="entity-select-error">{error}</div>}

          {hasMore && !loading && (
            <button type="button" className="entity-select-load-more" onClick={handleLoadMore}>
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  )
}

EntitySelect.propTypes = {
  worldId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  allowedTypeIds: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  ),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  onEntityResolved: PropTypes.func,
  limit: PropTypes.number,
  id: PropTypes.string,
  required: PropTypes.bool,
  autoFocus: PropTypes.bool,
}

export default EntitySelect
