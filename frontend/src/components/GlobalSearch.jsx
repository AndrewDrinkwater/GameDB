import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { globalSearch } from '../api/entities.js'
import { useCampaignContext } from '../context/CampaignContext.jsx'
import './GlobalSearch.css'

const DEBOUNCE_DELAY = 300

const useDebouncedValue = (value, delay) => {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

const getMatchTypeLabel = (matchType) => {
  const labels = {
    name: 'Name',
    description: 'Description',
    notes: 'Notes',
    mentions: 'Mentions',
    relationships: 'Relationships',
    title: 'Title',
    content: 'Content',
  }
  return labels[matchType] || matchType
}

export default function GlobalSearch({ isMobile, onClose }) {
  const navigate = useNavigate()
  const { selectedCampaignId, activeWorldId } = useCampaignContext()
  const [query, setQuery] = useState('')
  
  const hasContext = Boolean(selectedCampaignId || activeWorldId)
  const [results, setResults] = useState({ entities: [], sessionNotes: [] })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_DELAY)
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const currentFetchRef = useRef(0)

  const allResults = useMemo(() => {
    const items = []
    results.entities.forEach((entity) => {
      items.push({ type: 'entity', data: entity })
    })
    results.sessionNotes.forEach((note) => {
      items.push({ type: 'sessionNote', data: note })
    })
    return items
  }, [results])

  const hasResults = allResults.length > 0
  const showDropdown = open && (query.trim().length > 0 || hasResults)

  const performSearch = useCallback(
    async (searchQuery) => {
      if (!searchQuery.trim()) {
        setResults({ entities: [], sessionNotes: [] })
        setLoading(false)
        return
      }

      if (!hasContext) {
        setError('Please select a campaign or world context to search')
        setResults({ entities: [], sessionNotes: [] })
        setLoading(false)
        return
      }

      const fetchId = ++currentFetchRef.current
      setLoading(true)
      setError('')

      try {
        const response = await globalSearch({
          query: searchQuery,
          campaignId: selectedCampaignId,
          worldId: activeWorldId,
          limit: 20,
          offset: 0,
        })

        if (fetchId !== currentFetchRef.current) return

        const data = response?.data || { entities: [], sessionNotes: [] }
        setResults({
          entities: Array.isArray(data.entities) ? data.entities : [],
          sessionNotes: Array.isArray(data.sessionNotes) ? data.sessionNotes : [],
        })
      } catch (err) {
        if (fetchId !== currentFetchRef.current) return
        setError(err.message || 'Failed to search')
        setResults({ entities: [], sessionNotes: [] })
      } finally {
        if (fetchId === currentFetchRef.current) {
          setLoading(false)
        }
      }
    },
    [activeWorldId, selectedCampaignId, hasContext],
  )

  useEffect(() => {
    if (debouncedQuery.trim().length > 0) {
      performSearch(debouncedQuery)
    } else {
      setResults({ entities: [], sessionNotes: [] })
      setLoading(false)
    }
  }, [debouncedQuery, performSearch])

  useEffect(() => {
    if (open && inputRef.current && !isMobile) {
      inputRef.current.focus()
    }
  }, [open, isMobile])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        if (!isMobile) {
          setOpen(false)
        }
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, isMobile])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!showDropdown) return

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((prev) => (prev < allResults.length - 1 ? prev + 1 : prev))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
      } else if (event.key === 'Enter' && selectedIndex >= 0) {
        event.preventDefault()
        const selected = allResults[selectedIndex]
        if (selected) {
          handleSelect(selected)
        }
      } else if (event.key === 'Escape') {
        event.preventDefault()
        setOpen(false)
        setQuery('')
        if (isMobile && onClose) {
          onClose()
        }
      }
    }

    if (showDropdown) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showDropdown, selectedIndex, allResults, isMobile, onClose])

  const handleInputChange = (event) => {
    setQuery(event.target.value)
    setSelectedIndex(-1)
    if (!open) {
      setOpen(true)
    }
  }

  const handleInputFocus = () => {
    setOpen(true)
  }

  const handleSelect = (item) => {
    if (item.type === 'entity') {
      navigate(`/entities/${item.data.id}`)
    } else if (item.type === 'sessionNote') {
      navigate(`/campaigns/${selectedCampaignId}/session-notes`)
    }
    setOpen(false)
    setQuery('')
    if (isMobile && onClose) {
      onClose()
    }
  }

  const handleClear = () => {
    setQuery('')
    setResults({ entities: [], sessionNotes: [] })
    setSelectedIndex(-1)
    if (isMobile && onClose) {
      onClose()
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return dateString
    }
  }

  if (isMobile) {
    return (
      <div className="global-search-mobile">
        <div className="global-search-mobile-overlay" onClick={onClose} />
        <div className="global-search-mobile-content">
          <div className={`global-search-input-wrapper ${!hasContext ? 'disabled' : ''}`}>
            <Search size={20} className="global-search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="global-search-input"
              placeholder={hasContext ? 'Search entities and session notes...' : 'Select a campaign or world to search'}
              value={query}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              disabled={!hasContext}
              autoFocus
            />
            {query && (
              <button
                type="button"
                className="global-search-clear"
                onClick={handleClear}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {showDropdown && (
            <div className="global-search-results">
              {loading && (
                <div className="global-search-loading">
                  <span>Searching...</span>
                </div>
              )}

              {!loading && error && (
                <div className="global-search-error">
                  <span>{error}</span>
                </div>
              )}

              {!loading && !error && !hasResults && query.trim().length > 0 && (
                <div className="global-search-empty">
                  <span>No results found</span>
                </div>
              )}

              {!loading && !error && hasResults && (
                <div className="global-search-results-list">
                  {allResults.map((item, index) => (
                    <button
                      key={`${item.type}-${item.data.id}`}
                      type="button"
                      className={`global-search-result-item ${
                        index === selectedIndex ? 'selected' : ''
                      }`}
                      onClick={() => handleSelect(item)}
                    >
                      {item.type === 'entity' ? (
                        <>
                          <div className="global-search-result-header">
                            <span className="global-search-result-name">{item.data.name}</span>
                            {item.data.typeName && (
                              <span className="global-search-result-type">{item.data.typeName}</span>
                            )}
                          </div>
                          <div className="global-search-result-meta">
                            <span className="global-search-match-type">
                              Matched in {getMatchTypeLabel(item.data.matchType)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="global-search-result-header">
                            <span className="global-search-result-name">
                              {item.data.session_title || 'Session Note'}
                            </span>
                            <span className="global-search-result-type">Session Note</span>
                          </div>
                          <div className="global-search-result-meta">
                            <span className="global-search-match-type">
                              {formatDate(item.data.session_date)} • Matched in{' '}
                              {getMatchTypeLabel(item.data.matchType)}
                            </span>
                          </div>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="global-search" ref={containerRef}>
      <div className={`global-search-input-wrapper ${!hasContext ? 'disabled' : ''}`}>
        <Search size={18} className="global-search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="global-search-input"
          placeholder={hasContext ? 'Search entities and session notes...' : 'Select a campaign or world to search'}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          disabled={!hasContext}
        />
        {query && (
          <button
            type="button"
            className="global-search-clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="global-search-dropdown">
          {loading && (
            <div className="global-search-loading">
              <span>Searching...</span>
            </div>
          )}

          {!loading && error && (
            <div className="global-search-error">
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && !hasResults && query.trim().length > 0 && (
            <div className="global-search-empty">
              <span>No results found</span>
            </div>
          )}

          {!loading && !error && hasResults && (
            <div className="global-search-results-list">
              {allResults.map((item, index) => (
                <button
                  key={`${item.type}-${item.data.id}`}
                  type="button"
                  className={`global-search-result-item ${
                    index === selectedIndex ? 'selected' : ''
                  }`}
                  onClick={() => handleSelect(item)}
                >
                  {item.type === 'entity' ? (
                    <>
                      <div className="global-search-result-header">
                        <span className="global-search-result-name">{item.data.name}</span>
                        {item.data.typeName && (
                          <span className="global-search-result-type">{item.data.typeName}</span>
                        )}
                      </div>
                      <div className="global-search-result-meta">
                        <span className="global-search-match-type">
                          Matched in {getMatchTypeLabel(item.data.matchType)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="global-search-result-header">
                        <span className="global-search-result-name">
                          {item.data.session_title || 'Session Note'}
                        </span>
                        <span className="global-search-result-type">Session Note</span>
                      </div>
                      <div className="global-search-result-meta">
                        <span className="global-search-match-type">
                          {formatDate(item.data.session_date)} • Matched in{' '}
                          {getMatchTypeLabel(item.data.matchType)}
                        </span>
                      </div>
                    </>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

