import { useCallback, useEffect, useMemo, useState } from 'react'
import { Mention } from 'react-mentions'
import { AlertCircle, Filter, RotateCcw, Loader2, Edit2, Trash2 } from 'lucide-react'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { fetchCampaignEntityNotes } from '../../api/campaigns.js'
import { updateEntityNote, deleteEntityNote, searchEntities } from '../../api/entities.js'
import { fetchCharacters } from '../../api/characters.js'
import TaggedNoteContent from '../../components/notes/TaggedNoteContent.jsx'
import MentionsInputWrapper from '../../components/notes/MentionsInputWrapper.jsx'
import { buildNoteSegments, cleanEntityName } from '../../utils/noteMentions.js'
import './NotesPage.css'

const SHARE_LABELS = {
  private: 'Private',
  party: 'Party',
  companions: 'Companions',
  dm: 'DM',
}

const SHARE_OPTIONS_PLAYER = [
  {
    value: 'private',
    label: 'Private',
  },
  {
    value: 'companions',
    label: 'My Companions',
  },
]

const SHARE_OPTIONS_DM = [
  {
    value: 'private',
    label: 'Private',
  },
  {
    value: 'party',
    label: 'Share with Party',
  },
]

const ENTITY_NOTE_PLACEHOLDER = 'What do you want to remember?'

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
  const { user } = useAuth()
  const [notesState, setNotesState] = useState({ items: [], loading: false, error: '' })
  const [entityFilter, setEntityFilter] = useState('')
  const [authorFilter, setAuthorFilter] = useState('')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editNoteContent, setEditNoteContent] = useState('')
  const [editShareType, setEditShareType] = useState('private')
  const [editCharacterId, setEditCharacterId] = useState('')
  const [updating, setUpdating] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState(null)
  const [formError, setFormError] = useState('')
  const [characters, setCharacters] = useState([])
  const [charactersLoading, setCharactersLoading] = useState(false)
  const [charactersError, setCharactersError] = useState('')

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
    setEditingNoteId(null)
    setEditNoteContent('')
    setEditShareType('private')
    setEditCharacterId('')
    setFormError('')
  }, [selectedCampaignId])

  // Get campaign role
  const campaignMembership = useMemo(() => {
    if (!selectedCampaign || !user?.id) return null
    const members = Array.isArray(selectedCampaign.members) ? selectedCampaign.members : []
    const match = members.find((member) => {
      if (!member) return false
      const memberUserId = member.user_id ?? member.userId ?? member.user?.id ?? member.id ?? null
      if (!memberUserId) return false
      return String(memberUserId) === String(user.id)
    })
    return match || null
  }, [selectedCampaign, user?.id])

  const membershipRole = campaignMembership?.role ?? null
  const isCampaignDm = useMemo(() => {
    if (user?.role === 'system_admin') return true
    return membershipRole === 'dm'
  }, [membershipRole, user?.role])

  const isCampaignPlayer = useMemo(() => membershipRole === 'player', [membershipRole])

  const shareOptions = useMemo(
    () => (isCampaignDm ? SHARE_OPTIONS_DM : SHARE_OPTIONS_PLAYER),
    [isCampaignDm],
  )

  // Check if user is note author
  const isNoteAuthor = useCallback(
    (note) => {
      if (!user || !note) return false
      const authorId =
        note?.author?.id ?? note?.createdBy ?? note?.created_by ?? note?.authorId ?? note?.author_id ?? null
      if (!authorId) return false
      return String(authorId) === String(user.id)
    },
    [user],
  )

  // Load characters for player notes
  useEffect(() => {
    let cancelled = false

    if (!isCampaignPlayer || !selectedCampaignId) {
      setCharacters([])
      setCharactersLoading(false)
      setCharactersError('')
      setEditCharacterId('')
      return () => {
        cancelled = true
      }
    }

    const loadCharacters = async () => {
      setCharactersLoading(true)
      setCharactersError('')
      try {
        const response = await fetchCharacters({
          scope: 'my',
          campaign_id: selectedCampaignId,
        })
        if (cancelled) return

        const source = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
        const mapped = source
          .map((character) => ({
            id: character?.id ? String(character.id) : '',
            name: character?.name || 'Unnamed character',
          }))
          .filter((entry) => entry.id)

        setCharacters(mapped)
        if (mapped.length === 1) {
          setEditCharacterId(mapped[0].id)
        } else if (!mapped.some((entry) => entry.id === editCharacterId)) {
          setEditCharacterId('')
        }
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load characters for notes', err)
        setCharacters([])
        setEditCharacterId('')
        setCharactersError(err.message || 'Failed to load characters')
      } finally {
        if (!cancelled) {
          setCharactersLoading(false)
        }
      }
    }

    loadCharacters()

    return () => {
      cancelled = true
    }
  }, [isCampaignPlayer, selectedCampaignId, editCharacterId])

  // Entity mention search - need to get world ID from the note being edited
  const handleEntityMentionSearch = useCallback(
    async (query, callback) => {
      const trimmedQuery = query?.trim() ?? ''
      if (typeof callback !== 'function') {
        return
      }

      if (trimmedQuery.length === 0) {
        callback([])
        return
      }

      // Get world ID from the note being edited (if any), otherwise use entityFilter
      let targetEntityId = ''
      if (editingNoteId) {
        const editingNote = notesState.items.find((n) => n?.id === editingNoteId)
        if (editingNote) {
          targetEntityId = resolveEntityId(editingNote)
        }
      }
      
      if (!targetEntityId) {
        targetEntityId = entityFilter || ''
      }
      
      if (!targetEntityId) {
        callback([])
        return
      }

      const note = notesState.items.find((n) => {
        const nEntityId = resolveEntityId(n)
        return nEntityId === targetEntityId
      })
      const worldId = note?.entity?.world_id ?? note?.entity?.world?.id ?? ''

      if (!worldId) {
        callback([])
        return
      }

      try {
        const response = await searchEntities({
          worldId,
          query: trimmedQuery,
          limit: 8,
        })
        const data = Array.isArray(response?.data) ? response.data : response
        const formatted = Array.isArray(data)
          ? data
              .map((entity) => {
                const entityId = entity?.id ?? entity?.entity?.id
                if (!entityId) return null
                const rawName =
                  entity?.name || entity?.displayName || entity?.entity?.name || 'Unnamed entity'
                const display = cleanEntityName(rawName) || 'Unnamed entity'
                return { id: entityId, display }
              })
              .filter(Boolean)
          : []
        callback(formatted)
      } catch (err) {
        console.error('Failed to search entities for mentions', err)
        callback([])
      }
    },
    [entityFilter, notesState.items, editingNoteId],
  )

  // Edit handlers
  const handleStartEdit = useCallback(
    (note) => {
      if (!note) return
      const noteCharId = note?.characterId ?? note?.character_id ?? ''
      setEditingNoteId(note.id)
      setEditNoteContent(note?.content ?? '')
      setEditShareType(note?.shareType ?? note?.share_type ?? 'private')
      setEditCharacterId(noteCharId)
      setFormError('')
    },
    [],
  )

  const handleCancelEdit = useCallback(() => {
    setEditingNoteId(null)
    setEditNoteContent('')
    setEditShareType('private')
    setEditCharacterId('')
    setFormError('')
  }, [])

  const handleEditNoteContentChange = useCallback((event, nextValue) => {
    const value =
      typeof nextValue === 'string'
        ? nextValue
        : typeof event?.target?.value === 'string'
        ? event.target.value
        : ''
    setEditNoteContent(value)
    setFormError('')
  }, [])

  const handleSaveEdit = useCallback(
    async (note) => {
      if (!note || !selectedCampaignId) return

      const trimmed = editNoteContent.trim()
      if (!trimmed) {
        setFormError('Please enter a note before saving')
        return
      }

      const entityId = resolveEntityId(note)
      if (!entityId) {
        setFormError('Unable to determine entity for this note')
        return
      }

      const originalCharacterId = note?.characterId ?? note?.character_id ?? ''
      if (isCampaignPlayer && originalCharacterId && !editCharacterId) {
        setFormError('Select which character this note is for')
        return
      }

      setUpdating(true)
      setFormError('')

      try {
        const payload = {
          content: trimmed,
          shareType: editShareType,
          campaignId: selectedCampaignId,
        }

        if (isCampaignPlayer && editCharacterId) {
          payload.characterId = editCharacterId
        }

        const response = await updateEntityNote(entityId, note.id, payload)
        const updatedNote = response?.data || response

        if (!updatedNote) {
          throw new Error('Note could not be updated')
        }

        // Update local state
        setNotesState((previous) => {
          const currentItems = Array.isArray(previous?.items) ? previous.items.slice() : []
          const noteId = updatedNote?.id
          if (!noteId) return previous

          const index = currentItems.findIndex((entry) => entry?.id === noteId)
          if (index >= 0) {
            const updated = [...currentItems]
            updated[index] = updatedNote
            return {
              items: updated,
              loading: false,
              error: '',
            }
          }

          return previous
        })

        handleCancelEdit()
      } catch (err) {
        console.error('Failed to update note', err)
        setFormError(err.message || 'Failed to update note')
      } finally {
        setUpdating(false)
      }
    },
    [
      selectedCampaignId,
      editNoteContent,
      editShareType,
      editCharacterId,
      isCampaignPlayer,
      handleCancelEdit,
    ],
  )

  const handleDeleteClick = useCallback(
    async (note) => {
      if (!note?.id || !selectedCampaignId) return

      const confirmed = window.confirm(
        'Are you sure you want to delete this note? This action cannot be undone.',
      )

      if (!confirmed) return

      const entityId = resolveEntityId(note)
      if (!entityId) {
        setFormError('Unable to determine entity for this note')
        return
      }

      setDeletingNoteId(note.id)
      setFormError('')

      try {
        await deleteEntityNote(entityId, note.id, {
          campaignId: selectedCampaignId,
        })

        // Update local state
        setNotesState((previous) => {
          const currentItems = Array.isArray(previous?.items) ? previous.items.slice() : []
          const filtered = currentItems.filter((entry) => entry?.id !== note.id)
          return {
            items: filtered,
            loading: false,
            error: '',
          }
        })
      } catch (err) {
        console.error('Failed to delete note', err)
        setFormError(err.message || 'Failed to delete note')
      } finally {
        setDeletingNoteId(null)
      }
    },
    [selectedCampaignId],
  )

  // Render note body with mentions
  const renderNoteBody = useCallback((note) => {
    const segments = buildNoteSegments(note?.content, note?.mentions)
    if (!segments.length) return null

    return segments.map((segment, index) => {
      if (segment.type === 'mention' && segment.entityId) {
        const key = `${note?.id || 'note'}-mention-${index}`
        const label = segment.entityName || 'entity'
        return (
          <span key={key} className="note-mention">
            @{label}
          </span>
        )
      }

      return (
        <span key={`${note?.id || 'note'}-text-${index}`} className="note-text">
          {segment.text}
        </span>
      )
    })
  }, [])

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

  // Handle "My notes" filter
  const handleMyNotesFilter = useCallback(() => {
    if (!user?.id) return
    const currentUserId = String(user.id)
    // Find the author option that matches the current user
    const myAuthorOption = authorOptions.find((option) => {
      // Check if this author option corresponds to the current user
      // by finding a note authored by this user with this author ID
      const testNote = sortedNotes.find((note) => {
        const noteAuthorId = resolveAuthorId(note)
        return noteAuthorId === option.id && isNoteAuthor(note)
      })
      return testNote !== undefined
    })
    
    // If found, use that author ID; otherwise, try direct match with user ID
    if (myAuthorOption) {
      setAuthorFilter(myAuthorOption.id)
      setEntityFilter('')
    } else if (authorOptions.some((opt) => opt.id === currentUserId)) {
      setAuthorFilter(currentUserId)
      setEntityFilter('')
    }
  }, [user?.id, authorOptions, sortedNotes, isNoteAuthor])

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

        {user?.id && (
          <button
            type="button"
            className="notes-action-button"
            onClick={handleMyNotesFilter}
            title="Show only my notes"
          >
            <span>My notes</span>
          </button>
        )}
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

      {formError && (
        <div className="notes-error" role="alert">
          <strong>
            <AlertCircle size={18} /> Error
          </strong>
          <span>{formError}</span>
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
            const isEditing = editingNoteId === note?.id
            const canEdit = isNoteAuthor(note)

            return (
              <article
                className="note-card"
                key={note.id ?? `${entityId}-${createdAtIso || 'unknown'}`}
              >
                {isEditing ? (
                  <div className="entity-notes-strict-edit-panel" style={{ padding: '1rem' }}>
                    <MentionsInputWrapper
                      value={editNoteContent}
                      onChange={handleEditNoteContentChange}
                      markup="@[__display__](__id__)"
                      placeholder={ENTITY_NOTE_PLACEHOLDER}
                      className="entity-note-mentions"
                      inputProps={{
                        className: 'entity-notes-strict-textarea',
                        'aria-label': 'Edit note content',
                        rows: 5,
                        required: true,
                      }}
                    >
                      <Mention
                        trigger="@"
                        markup="@[__display__](__id__)"
                        displayTransform={(id, display) => `@${display}`}
                        data={handleEntityMentionSearch}
                        appendSpaceOnAdd
                      />
                    </MentionsInputWrapper>

                    <p style={{ marginTop: '0.75rem', marginBottom: '0.5rem', fontWeight: 600 }}>
                      Share with
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      {shareOptions.map((option) => (
                        <label
                          key={option.value}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                          <input
                            type="radio"
                            name={`entity-note-share-edit-${note.id}`}
                            value={option.value}
                            checked={editShareType === option.value}
                            onChange={() => setEditShareType(option.value)}
                            disabled={updating}
                          />
                          {option.value === 'private'
                            ? 'Private'
                            : option.value === 'party'
                            ? 'Share with Party'
                            : option.label}
                        </label>
                      ))}
                    </div>

                    {isCampaignPlayer && characters.length > 0 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <label htmlFor={`edit-character-${note.id}`} style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                          Character
                        </label>
                        <select
                          id={`edit-character-${note.id}`}
                          value={editCharacterId}
                          onChange={(event) => setEditCharacterId(event.target.value)}
                          disabled={charactersLoading || characters.length === 1}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5f5',
                          }}
                        >
                          {characters.map((character) => (
                            <option key={character.id} value={character.id}>
                              {character.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {formError ? (
                      <div className="notes-error" style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                        <AlertCircle size={16} />
                        <span>{formError}</span>
                      </div>
                    ) : null}

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                      <button
                        type="button"
                        className="notes-action-button"
                        onClick={() => handleSaveEdit(note)}
                        disabled={updating || !editNoteContent.trim()}
                      >
                        {updating ? (
                          <>
                            <Loader2 className="spin" size={16} style={{ animation: 'spinner-rotate 1s linear infinite' }} />
                            Saving…
                          </>
                        ) : (
                          'Save'
                        )}
                      </button>
                      <button
                        type="button"
                        className="notes-action-button"
                        onClick={handleCancelEdit}
                        disabled={updating}
                        style={{ background: '#64748b' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
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

                    <div className="note-content">
                      {renderNoteBody(note) || (
                        <TaggedNoteContent
                          content={note?.content}
                          mentions={note?.mentions}
                          noteId={note?.id || entityId || 'note'}
                          textClassName="note-text"
                          mentionClassName="note-mention"
                        />
                      )}
                    </div>

                    {canEdit && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(15, 23, 42, 0.1)' }}>
                        <button
                          type="button"
                          className="notes-action-button"
                          onClick={() => handleStartEdit(note)}
                          style={{ background: '#1e40af', color: '#fff' }}
                        >
                          <Edit2 size={14} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="notes-action-button"
                          onClick={() => handleDeleteClick(note)}
                          disabled={deletingNoteId === note.id}
                          style={{ background: '#dc2626', color: '#fff' }}
                        >
                          {deletingNoteId === note.id ? (
                            <Loader2 size={14} className="spin" style={{ animation: 'spinner-rotate 1s linear infinite' }} />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          <span>{deletingNoteId === note.id ? 'Deleting…' : 'Delete'}</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
