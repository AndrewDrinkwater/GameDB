import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Filter, RotateCcw } from 'lucide-react'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import { fetchCampaignEntityNotes } from '../../api/campaigns.js'
import './NotesPage.css'

const SHARE_LABELS = {
  private: 'Private',
  party: 'Party',
  companions: 'Companions',
  dm: 'DM',
}

const formatDateTime = (value) => {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const resolveEntityId = (note) => {
  const candidates = [
    note?.entityId,
    note?.entity_id,
    note?.entity?.id,
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    return String(candidate)
  }

  return ''
}

const resolveAuthorId = (note) => {
  const candidates = [
    note?.author?.id,
    note?.createdBy,
    note?.created_by,
  ]

  for (const candidate of candidates) {
    if (!candidate) continue
    return String(candidate)
  }

  return ''
}

const resolveAuthorName = (note) => {
  const author = note?.author
  if (author?.username) return author.username
  if (author?.email) return author.email
  if (note?.character?.name) return `${note.character.name} (Character)`
  if (note?.created_by) return 'Unknown author'
  return 'Unknown author'
}

const resolveEntityName = (note) => {
  if (note?.entity?.name) return note.entity.name
  if (typeof note?.entityName === 'string' && note.entityName.trim()) {
    return note.entityName
  }
  return 'Unnamed entity'
}

export default function EntityNotesPage() {
  const { selectedCampaign, selectedCampaignId } = useCampaignContext()
  const [notesState, setNotesState] = useState({ items: [], loading: false, error: '' })
  const [entityFilter, setEntityFilter] = useState('')
  const [authorFilter, setAuthorFilter] = useState('')

  const loadNotes = useCallback(async () => {
    if (!selectedCampaignId) return

    setNotesState((previous) => ({ ...previous, loading: true, error: '' }))

    try {
      const response = await fetchCampaignEntityNotes(selectedCampaignId)
      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : []

      setNotesState({ items: list, loading: false, error: '' })
    } catch (error) {
      console.error('❌ Failed to load campaign entity notes', error)
      setNotesState({
        items: [],
        loading: false,
        error: error?.message || 'Failed to load entity notes',
      })
    }
  }, [selectedCampaignId])

  useEffect(() => {
    if (!selectedCampaignId) {
      setNotesState({ items: [], loading: false, error: '' })
      return
    }

    loadNotes()
  }, [selectedCampaignId, loadNotes])

  useEffect(() => {
    setEntityFilter('')
    setAuthorFilter('')
  }, [selectedCampaignId])

  const sortedNotes = useMemo(() => {
    if (!Array.isArray(notesState.items)) return []
    return [...notesState.items].sort((a, b) => {
      const aDate = new Date(a?.created_at || a?.createdAt || 0).getTime()
      const bDate = new Date(b?.created_at || b?.createdAt || 0).getTime()
      return Number.isNaN(bDate) ? -1 : Number.isNaN(aDate) ? 1 : bDate - aDate
    })
  }, [notesState.items])

  const entityOptions = useMemo(() => {
    const entries = new Map()
    sortedNotes.forEach((note) => {
      const entityId = resolveEntityId(note)
      if (!entityId) return
      const entityName = resolveEntityName(note)
      if (!entries.has(entityId)) {
        entries.set(entityId, entityName)
      }
    })

    return Array.from(entries.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }, [sortedNotes])

  const authorOptions = useMemo(() => {
    const entries = new Map()
    sortedNotes.forEach((note) => {
      const authorId = resolveAuthorId(note)
      if (!authorId) return
      const authorName = resolveAuthorName(note)
      if (!entries.has(authorId)) {
        entries.set(authorId, authorName)
      }
    })

    return Array.from(entries.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  }, [sortedNotes])

  const filteredNotes = useMemo(() => {
    return sortedNotes.filter((note) => {
      const entityId = resolveEntityId(note)
      const authorId = resolveAuthorId(note)

      if (entityFilter && entityId !== entityFilter) return false
      if (authorFilter && authorId !== authorFilter) return false
      return true
    })
  }, [sortedNotes, entityFilter, authorFilter])

  const campaignName = selectedCampaign?.name ?? ''
  const notesCount = filteredNotes.length
  const totalNotes = sortedNotes.length
  const hasFilters = Boolean(entityFilter || authorFilter)

  if (!selectedCampaignId) {
    return (
      <div className="notes-page">
        <div className="notes-header">
          <div className="notes-title">
            <h1>Entity Notes</h1>
            <p>Select a campaign from the header to view entity notes.</p>
          </div>
        </div>
        <div className="notes-empty">
          <strong>No campaign selected</strong>
          <span>Pick a campaign to explore its shared entity notes.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="notes-page">
      <div className="notes-header">
        <div className="notes-title">
          <h1>Entity Notes</h1>
          <p>
            Browse the notes created for entities in the{' '}
            <strong>{campaignName}</strong> campaign, filter by entity or author,
            and jump back into the context of your adventures.
          </p>
        </div>
        <div className="notes-actions">
          <button
            type="button"
            className="notes-action-button"
            onClick={loadNotes}
            disabled={notesState.loading}
            title="Reload notes"
          >
            <RotateCcw size={16} />
            <span>{notesState.loading ? 'Loading…' : 'Reload'}</span>
          </button>
        </div>
      </div>

      <div className="notes-filters">
        <div className="notes-filter-group">
          <label htmlFor="entity-filter">Entity</label>
          <select
            id="entity-filter"
            value={entityFilter}
            onChange={(event) => setEntityFilter(event.target.value)}
            disabled={notesState.loading || entityOptions.length === 0}
          >
            <option value="">All entities</option>
            {entityOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <div className="notes-filter-group">
          <label htmlFor="author-filter">Author</label>
          <select
            id="author-filter"
            value={authorFilter}
            onChange={(event) => setAuthorFilter(event.target.value)}
            disabled={notesState.loading || authorOptions.length === 0}
          >
            <option value="">All authors</option>
            {authorOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="notes-action-button"
          onClick={() => {
            setEntityFilter('')
            setAuthorFilter('')
          }}
          disabled={!hasFilters}
        >
          <Filter size={16} />
          <span>Reset filters</span>
        </button>
      </div>

      <div className="notes-meta">
        <span>
          Showing <strong>{notesCount}</strong> of <strong>{totalNotes}</strong>{' '}
          {totalNotes === 1 ? 'note' : 'notes'}
          {hasFilters ? ' (filtered)' : ''}
        </span>
        {notesState.loading && <span>Loading latest notes…</span>}
      </div>

      {notesState.error && (
        <div className="notes-error" role="alert">
          <strong>
            <AlertCircle size={18} /> Unable to load entity notes
          </strong>
          <span>{notesState.error}</span>
        </div>
      )}

      {!notesState.loading && !notesState.error && filteredNotes.length === 0 && (
        <div className="notes-empty">
          <strong>No notes to show</strong>
          <span>
            {totalNotes === 0
              ? 'No entity notes have been shared in this campaign yet.'
              : 'Adjust your filters to see more notes.'}
          </span>
        </div>
      )}

      {filteredNotes.length > 0 && (
        <div className="notes-list">
          {filteredNotes.map((note) => {
            const entityId = resolveEntityId(note)
            const shareType = String(note?.shareType || note?.share_type || 'private')
            const createdAtRaw = note?.created_at || note?.createdAt
            const createdAtDate = createdAtRaw ? new Date(createdAtRaw) : null
            const createdAtDisplay = formatDateTime(createdAtDate)
            const createdAtIso =
              createdAtDate && !Number.isNaN(createdAtDate.getTime())
                ? createdAtDate.toISOString()
                : ''
            const authorName = resolveAuthorName(note)
            const characterName = note?.character?.name ?? ''
            const entityName = resolveEntityName(note)

            return (
              <article
                className="note-card"
                key={note.id ?? `${entityId}-${createdAtIso || 'unknown'}`}
              >
                <header className="note-card-header">
                  <div className="note-entity-meta">
                    <h2>{entityName}</h2>
                    <span>Entity ID: {entityId}</span>
                  </div>
                  <div className="note-tags">
                    <span className={`note-tag share-${shareType}`}>
                      {SHARE_LABELS[shareType] ?? shareType}
                    </span>
                  </div>
                </header>

                <div className="note-details">
                  <span>Author: {authorName}</span>
                  {characterName ? <span>Character: {characterName}</span> : null}
                  {createdAtDisplay ? (
                    <span>
                      Created:{' '}
                      <time dateTime={createdAtIso || undefined}>{createdAtDisplay}</time>
                    </span>
                  ) : null}
                </div>

                <div className="note-content">{note?.content ?? ''}</div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
