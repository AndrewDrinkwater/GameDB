// src/modules/relationships2/ui/HybridEntityPicker.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'

const getTypeId = (e) =>
  String(
    e?.entity_type_id ??
    e?.entityTypeId ??
    e?.entityType?.id ??
    e?.entity_type?.id ??
    e?.typeId ??
    e?.type?.id ??
    ''
  )

export default function HybridEntityPicker({
  worldId,
  value,                 // selected id
  allowedTypeIds = [],   // array of type ids (strings)
  onChange,              // (id: string) => void
  onResolve,             // (entity) => void
  placeholder = 'Search or select entity…',
  disabled = false,
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const abortRef = useRef(null)

  const allowedSet = useMemo(() => new Set((allowedTypeIds || []).map(String)), [allowedTypeIds])

  const filterClientSide = (list) => {
    if (!allowedSet.size) return list
    return list.filter((e) => {
      const t = getTypeId(e)
      return t && allowedSet.has(String(t))
    })
  }

  // initial load / allowed types changed
  useEffect(() => {
    if (disabled) return
    abortRef.current?.abort?.()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)

    const qs = allowedTypeIds.length ? `&entity_type_ids=${allowedTypeIds.join(',')}` : ''
    fetch(`/api/worlds/${worldId}/entities?limit=20${qs}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
        setResults(filterClientSide(list))
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => ac.abort()
  }, [worldId, allowedTypeIds.join(','), disabled])

  // debounced search
  useEffect(() => {
    if (disabled) return
    abortRef.current?.abort?.()
    const ac = new AbortController()
    abortRef.current = ac
    const t = setTimeout(() => {
      setLoading(true)
      const url = new URL(`/api/worlds/${worldId}/entities/search`, window.location.origin)
      if (q) url.searchParams.set('q', q)
      if (allowedTypeIds.length) url.searchParams.set('entity_type_ids', allowedTypeIds.join(','))
      fetch(url.toString(), { signal: ac.signal })
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
          setResults(filterClientSide(list))
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 200)
    return () => {
      clearTimeout(t)
      ac.abort()
    }
  }, [q, worldId, allowedTypeIds.join(','), disabled])

  const pick = (entity) => {
    const id = String(entity?.id ?? '')
    if (!id) return
    onResolve?.(entity)
    onChange?.(id)      // ALWAYS emit string id
    setOpen(false)
  }

  return (
    <div className={`hybrid-entity-picker ${disabled ? 'is-disabled' : ''}`}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        aria-label="Search entities"
      />
      {open && !disabled && (
        <div className="dropdown">
          {loading && <div className="muted">Searching…</div>}
          {!loading && results.length === 0 && <div className="muted">No results</div>}
          {!loading &&
            results.map((e) => (
              <button
                type="button"
                className={`row ${String(e.id) === String(value) ? 'is-selected' : ''}`}
                key={String(e.id)}
                onClick={() => pick(e)}
              >
                <span className="name">{e.name || 'Untitled entity'}</span>
                <span className="type">{e?.entity_type?.name || e?.entityType?.name || ''}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
