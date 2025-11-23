import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMemo as useMemoHook } from 'react'
import PropTypes from '../utils/propTypes.js'
import { fetchLocationById, fetchLocations } from '../api/locations.js'

const DEFAULT_LIMIT = 20
const DEBOUNCE_DELAY = 250
const EMPTY_ARRAY = Object.freeze([])

const normaliseLocationPayload = (payload) => {
  if (!payload) return null
  if (payload.id === undefined) {
    const data = payload.data ?? payload.location ?? payload.result
    if (data) return normaliseLocationPayload(data)
    return null
  }

  const type =
    payload.locationType ||
    payload.location_type ||
    (payload.location_type_id
      ? { id: payload.location_type_id, name: payload.location_type_name }
      : null)

  return {
    id: payload.id,
    name: payload.name || 'Untitled location',
    typeId: type?.id ?? payload.location_type_id ?? null,
    typeName: type?.name ?? payload.location_type_name ?? '',
  }
}

const extractListFromResponse = (response) => {
  if (!response) return { data: [], pagination: { hasMore: false, total: 0, limit: DEFAULT_LIMIT, offset: 0 } }
  if (Array.isArray(response)) {
    return {
      data: response.map((item) => normaliseLocationPayload(item)).filter(Boolean),
      pagination: { hasMore: false, limit: response.length, offset: 0, total: response.length },
    }
  }

  const data = Array.isArray(response.data) ? response.data : []
  const pagination =
    response.pagination && typeof response.pagination === 'object'
      ? response.pagination
      : { hasMore: false, limit: data.length, offset: 0, total: data.length }

  return {
    data: data.map((item) => normaliseLocationPayload(item)).filter(Boolean),
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

const LocationSelect = ({
  worldId,
  allowedTypeIds,
  value,
  onChange,
  placeholder = 'Search for location…',
  disabled = false,
  onLocationResolved,
  limit = DEFAULT_LIMIT,
  excludeIds,
}) => {
  // Use stable array references to prevent unnecessary re-renders
  // Track if allowedTypeIds was explicitly provided (even if empty)
  const hasAllowedTypeIdsRestriction = allowedTypeIds !== undefined
  const stableAllowedTypeIds = useMemo(() => allowedTypeIds || EMPTY_ARRAY, [allowedTypeIds])
  const stableExcludeIds = useMemo(() => excludeIds || EMPTY_ARRAY, [excludeIds])
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

  const notifyLocation = useCallback(
    (location) => {
      if (!location) {
        onLocationResolved?.(null)
        return
      }
      onLocationResolved?.(location)
    },
    [onLocationResolved],
  )

  useEffect(() => {
    if (!value) {
      setSelected(null)
      setInputValue('')
      setInitialised(true)
      notifyLocation(null)
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

    fetchLocationById(stringValue)
      .then((response) => {
        if (cancelled || fetchId !== currentFetchRef.current) return
        const location = normaliseLocationPayload(response?.data || response)
        if (location) {
          setSelected(location)
          setInputValue(location.name)
          notifyLocation(location)
        } else {
          setSelected(null)
          notifyLocation(null)
        }
        setInitialised(true)
      })
      .catch((err) => {
        if (cancelled || fetchId !== currentFetchRef.current) return
        setSelected(null)
        setError(err.message || 'Failed to load location')
        notifyLocation(null)
      })
      .finally(() => {
        if (cancelled || fetchId !== currentFetchRef.current) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [value, selected, initialised, notifyLocation])

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
      
      // Don't search if query is too short (unless it's empty to show initial results)
      if (query.length > 0 && query.length < 2) {
        if (!append) {
          setResults([])
          setLoading(false)
        }
        return
      }

      const nextOffset = append ? offset : 0
      const fetchId = ++currentFetchRef.current
      setLoading(true)
      setError('')

      try {
        console.log('🔍 [LocationSelect] Fetching locations...', {
          worldId,
          query,
          allowedTypeIds: stableAllowedTypeIds,
          excludeIds: stableExcludeIds
        })
        
        const params = {
          worldId,
          includeEntities: 'false',
          all: 'true', // Request all locations, not just root ones - include locations with parents/children
        }
        
        // Don't filter by locationTypeId in the API call - we'll filter client-side to handle multiple types
        // This ensures we get ALL locations regardless of their parent/child status

        const response = await fetchLocations(params)
        if (fetchId !== currentFetchRef.current) return
        
        const allLocations = response?.data || []
        console.log('🔍 [LocationSelect] Fetched all locations:', {
          totalCount: allLocations.length,
          sampleLocations: allLocations.slice(0, 5).map(loc => ({
            id: loc.id,
            name: loc.name,
            typeId: loc.location_type_id || loc.locationType?.id,
            typeName: loc.locationType?.name,
            parentId: loc.parent_id || loc.parent?.id
          }))
        })
        
        // Filter by search query and exclude IDs
        const queryLower = query.toLowerCase()
        const excludeSet = new Set(stableExcludeIds.map(id => String(id)))
        const allowedTypeIdSet = stableAllowedTypeIds.length > 0 
          ? new Set(stableAllowedTypeIds.map(id => String(id)))
          : null
        
        console.log('🔍 [LocationSelect] Filtering locations...', {
          allowedTypeIds: stableAllowedTypeIds,
          allowedTypeIdSet: allowedTypeIdSet ? Array.from(allowedTypeIdSet) : null,
          excludeIds: Array.from(excludeSet),
          hasAllowedTypes: !!allowedTypeIdSet && allowedTypeIdSet.size > 0,
          hasAllowedTypeIdsRestriction,
          isExplicitlyEmpty: hasAllowedTypeIdsRestriction && stableAllowedTypeIds.length === 0
        })
        
        // Group locations by type before filtering for logging
        const locationsByType = allLocations.reduce((acc, loc) => {
          const typeId = String(loc.location_type_id || loc.locationType?.id || 'unknown')
          const typeName = loc.locationType?.name || 'unknown'
          if (!acc[typeName]) acc[typeName] = { typeId, locations: [] }
          acc[typeName].locations.push({ id: loc.id, name: loc.name })
          return acc
        }, {})
        console.log('🔍 [LocationSelect] Locations by type before filter:', locationsByType)
        
        let filtered = allLocations.filter(loc => {
          if (excludeSet.has(String(loc.id))) {
            return false
          }
          if (query && !loc.name?.toLowerCase().includes(queryLower)) {
            return false
          }
          // Filter by allowed type IDs - include ONLY locations with these types
          // This should be direct child types only (not grandchildren, etc.)
          if (hasAllowedTypeIdsRestriction) {
            // If allowedTypeIds was explicitly provided but is empty, show nothing (lowest level type)
            if (stableAllowedTypeIds.length === 0) {
              console.log('🔍 [LocationSelect] ⚠️ No allowed types - filtering out all locations')
              return false
            }
            // If allowedTypeIds has items, only show locations with those types
            if (allowedTypeIdSet && allowedTypeIdSet.size > 0) {
              const locTypeId = loc.location_type_id || loc.locationType?.id
              const locTypeIdStr = locTypeId ? String(locTypeId) : ''
              const isAllowed = locTypeIdStr && allowedTypeIdSet.has(locTypeIdStr)
              
              if (!isAllowed) {
                console.log('🔍 [LocationSelect] ❌ Excluded location (type not in allowed list):', {
                  name: loc.name,
                  typeId: locTypeIdStr,
                  typeName: loc.locationType?.name,
                  allowedTypeIds: Array.from(allowedTypeIdSet),
                  allowedTypeNames: Array.from(allowedTypeIdSet).map(id => {
                    // We don't have access to type names here, but we can log the IDs
                    return id
                  })
                })
                return false
              } else {
                console.log('🔍 [LocationSelect] ✅ Included location (type matches):', {
                  name: loc.name,
                  typeId: locTypeIdStr,
                  typeName: loc.locationType?.name
                })
              }
            }
          }
          return true
        })
        
        console.log('✅ [LocationSelect] After filtering:', {
          before: allLocations.length,
          after: filtered.length,
          filteredLocations: filtered.map(loc => ({
            id: loc.id,
            name: loc.name,
            typeId: loc.location_type_id || loc.locationType?.id,
            typeName: loc.locationType?.name,
            parentId: loc.parent_id || loc.parent?.id
          }))
        })

        // Apply pagination
        const start = nextOffset
        const end = start + limit
        const paginated = filtered.slice(start, end)
        const { data, pagination } = extractListFromResponse(paginated)
        
        setActiveQuery(query)
        if (append) {
          setResults((prev) => {
            const totalLoaded = prev.length + data.length
            const computedHasMore = totalLoaded < filtered.length
            setHasMore(computedHasMore)
            return [...prev, ...data]
          })
        } else {
          setResults(data)
          const totalLoaded = data.length
          const computedHasMore = totalLoaded < filtered.length
          setHasMore(computedHasMore)
        }
        
        setOffset(end)
      } catch (err) {
        if (fetchId !== currentFetchRef.current) return
        setError(err.message || 'Failed to search locations')
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
      stableAllowedTypeIds,
      hasAllowedTypeIdsRestriction,
      debouncedInput,
      limit,
      offset,
      resetSearchState,
      stableExcludeIds,
    ],
  )

  useEffect(() => {
    if (!open) return
    fetchResults({ append: false })
  }, [debouncedInput, stableAllowedTypeIds, worldId, fetchResults, open])

  useEffect(() => {
    if (!open) return
    const selectedId = selected ? String(selected.id) : ''
    if (!selectedId) return
    if (!listRef.current) return
    const element = listRef.current.querySelector(`[data-location-option="${selectedId}"]`)
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

  const handleSelect = (location) => {
    setSelected(location)
    setInputValue(location.name ?? '')
    closeDropdown()
    onChange?.(String(location.id))
    notifyLocation(location)
  }

  const handleLoadMore = () => {
    if (loading || !hasMore) return
    fetchResults({ append: true })
  }

  const handleClear = () => {
    setSelected(null)
    setInputValue('')
    onChange?.('')
    notifyLocation(null)
    setOpen(false)
  }

  const showClearButton = useMemo(() => !isDisabled && Boolean(selected?.id), [isDisabled, selected])

  const resolvedPlaceholder = useMemo(() => {
    if (isDisabled && !worldId) {
      return 'No world selected'
    }
    return placeholder
  }, [isDisabled, worldId, placeholder])

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
            {results.map((location) => {
              const isSelected = selected && String(selected.id) === String(location.id)
              return (
                <li
                  key={location.id}
                  className={`entity-select-option${isSelected ? ' selected' : ''}`}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    handleSelect(location)
                  }}
                  data-location-option={location.id}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="entity-select-option-name">{location.name}</span>
                  {location.typeName && (
                    <span className="entity-select-option-type">{location.typeName}</span>
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

          {!loading && results.length === 0 && !error && debouncedInput.trim().length >= 2 && (
            <div className="entity-select-status">No matching locations found.</div>
          )}

          {!loading && results.length === 0 && !error && debouncedInput.trim().length > 0 && debouncedInput.trim().length < 2 && (
            <div className="entity-select-status">Type at least 2 characters to search.</div>
          )}

          {!loading && results.length === 0 && !error && debouncedInput.trim().length === 0 && (
            <div className="entity-select-status">Start typing to search for locations.</div>
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

LocationSelect.propTypes = {
  worldId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  allowedTypeIds: PropTypes.arrayOf(
    PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  ),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool,
  onLocationResolved: PropTypes.func,
  limit: PropTypes.number,
  excludeIds: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
}

export default LocationSelect

