import { useCallback, useEffect, useMemo, useState } from 'react'
import { Mention } from 'react-mentions'
import MentionsInputWrapper from '../../../components/notes/MentionsInputWrapper.jsx'
import { AlertCircle, Loader2, Plus, Edit2, X, Check, Trash2 } from 'lucide-react'
import PropTypes from '../../../utils/propTypes.js'
import LocationInfoPreview from '../../../components/locations/LocationInfoPreview.jsx'
import { fetchCharacters } from '../../../api/characters.js'
import DrawerPanel from '../../../components/DrawerPanel.jsx'
import {
  fetchLocationMentionNotes,
  fetchLocations,
} from '../../../api/locations.js'
import {
  createLocationNote,
  updateLocationNote,
  deleteLocationNote,
} from '../../../api/locations.js'
import { buildNoteSegments, cleanEntityName } from '../../../utils/noteMentions.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import '../../entities/tabs/NotesTab.css'

const SHARE_LABELS = {
  private: 'Private',
  companions: 'Shared with companions',
  dm: 'Shared with DM',
  party: 'Share with Party',
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

const formatTimestamp = (value) => {
  if (!value) {
    return ''
  }
  
  // Handle Date objects directly
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return ''
    }
    try {
      return value.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (err) {
      console.warn('Unable to format Date object', err, value)
      return ''
    }
  }
  
  // Handle string or number values
  if (typeof value === 'string' || typeof value === 'number') {
    try {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) {
        console.warn('Invalid date value:', value)
        return ''
      }
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch (err) {
      console.warn('Unable to parse date value', err, value)
      return ''
    }
  }
  
  console.warn('Unexpected date value type:', typeof value, value)
  return ''
}

const resolveAuthorLabel = (note) =>
  note?.author?.username ||
  note?.author?.name ||
  note?.author?.email ||
  note?.author_name ||
  note?.author_email ||
  'Unknown adventurer'

const resolveAuthorKey = (note) => {
  const author = note?.author || {}
  const id =
    author?.id ??
    author?.authorId ??
    note?.authorId ??
    note?.author_id ??
    note?.authorID
  if (id !== undefined && id !== null) {
    return `id:${String(id)}`
  }

  const email = author?.email ?? note?.author_email
  if (email) {
    return `email:${String(email).toLowerCase()}`
  }

  const username =
    author?.username ??
    author?.name ??
    note?.author_username ??
    note?.author_name
  if (username) {
    return `name:${String(username).toLowerCase()}`
  }

  return 'unknown'
}

const emptyArray = Object.freeze([])

const LOCATION_NOTE_PLACEHOLDER = 'What do you want to remember?'
export default function LocationNotesTab({
  location,
  worldId,
  selectedCampaign,
  selectedCampaignId,
  isCampaignDm,
  isCampaignPlayer,
  canCreateNote,
  notes = emptyArray,
  loading,
  error,
  onCreateNote,
  creating,
  campaignMatchesLocationWorld,
  onNoteUpdate,
  onNoteDelete,
}) {
  const { user } = useAuth()
  const [noteContent, setNoteContent] = useState('')
  const [shareType, setShareType] = useState('private')
  const [characterId, setCharacterId] = useState('')
  const [characters, setCharacters] = useState(emptyArray)
  const [charactersLoading, setCharactersLoading] = useState(false)
  const [charactersError, setCharactersError] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedAuthor, setSelectedAuthor] = useState('all')
  const [activeSubTab, setActiveSubTab] = useState('notes')
  const [mentionSource, setMentionSource] = useState('location')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editNoteContent, setEditNoteContent] = useState('')
  const [editShareType, setEditShareType] = useState('private')
  const [editCharacterId, setEditCharacterId] = useState('')
  const [updating, setUpdating] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState(null)
  const [mentionLocationNotesState, setMentionLocationNotesState] = useState({
    items: emptyArray,
    loading: false,
    error: '',
    loaded: false,
  })

  const canShowForm =
    Boolean(selectedCampaignId) &&
    Boolean(canCreateNote) &&
    Boolean(campaignMatchesLocationWorld)

  const shareOptions = useMemo(
    () => (isCampaignDm ? SHARE_OPTIONS_DM : SHARE_OPTIONS_PLAYER),
    [isCampaignDm],
  )

  const resolvedWorldId = useMemo(() => {
    if (worldId) {
      return worldId
    }

    if (location && typeof location === 'object') {
      const nestedWorld = location.world || {}
      return nestedWorld.id || location.world_id || ''
    }

    return ''
  }, [location, worldId])

  const isNoteAuthor = useCallback(
    (note) => {
      if (!user || !note) return false
      const authorId =
        note?.author?.id ??
        note?.createdBy ??
        note?.created_by ??
        note?.authorId ??
        note?.author_id ??
        null
      if (!authorId) return false
      return String(authorId) === String(user.id)
    },
    [user],
  )

  const handleNoteContentChange = useCallback((event, nextValue) => {
    const value =
      typeof nextValue === 'string'
        ? nextValue
        : typeof event?.target?.value === 'string'
        ? event.target.value
        : ''
    setNoteContent(value)
    setFormError('')
  }, [])

  const handleLocationMentionSearch = useCallback(
    async (query, callback) => {
      const trimmedQuery = query?.trim() ?? ''
      if (typeof callback !== 'function') {
        return
      }

      if (!resolvedWorldId || trimmedQuery.length === 0) {
        callback([])
        return
      }

      try {
        const response = await fetchLocations({
          worldId: resolvedWorldId,
        })
        const data = Array.isArray(response?.data) ? response.data : response
        const allLocations = Array.isArray(data) ? data : []
        
        // Filter client-side by query
        const filtered = allLocations
          .filter((loc) => {
            const name = loc?.name || ''
            return name.toLowerCase().includes(trimmedQuery.toLowerCase())
          })
          .slice(0, 8)
          .map((loc) => {
            const locationId = loc?.id
            if (!locationId) return null
            const rawName = loc?.name || 'Unnamed location'
            const display = cleanEntityName(rawName) || 'Unnamed location'
            return { id: locationId, display }
          })
          .filter(Boolean)
        callback(filtered)
      } catch (err) {
        console.error('Failed to search locations for mentions', err)
        callback([])
      }
    },
    [resolvedWorldId],
  )

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    setFormError('')
    setFormSuccess('')
  }, [])

  const openDrawer = useCallback(() => {
    if (!canShowForm) return
    setFormError('')
    setFormSuccess('')
    setDrawerOpen(true)
  }, [canShowForm])

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      if (!canShowForm || !onCreateNote) return

      const trimmed = noteContent.trim()
      if (!trimmed) {
        setFormError('Please enter a note before saving')
        return
      }

      if (isCampaignPlayer && !characterId) {
        setFormError('Select which character this note is for')
        return
      }

      setFormError('')
      setFormSuccess('')

      try {
        const payload = {
          content: trimmed,
          shareType,
          campaignId: selectedCampaignId,
        }

        if (isCampaignPlayer) {
          payload.characterId = characterId
        }

        const result = await onCreateNote(payload)
        if (!result || result.success !== true) {
          setFormError(result?.message || 'Failed to save note')
          return
        }

        setNoteContent('')
        if (!isCampaignPlayer) {
          setCharacterId('')
        }
        closeDrawer()
      } catch (err) {
        console.error('Failed to submit note', err)
        setFormError(err.message || 'Failed to save note')
      }
    },
    [
      canShowForm,
      noteContent,
      onCreateNote,
      shareType,
      selectedCampaignId,
      isCampaignPlayer,
      characterId,
      closeDrawer,
    ],
  )

  const handleCancelEdit = useCallback(() => {
    setEditingNoteId(null)
    setEditNoteContent('')
    setEditShareType('private')
    setEditCharacterId('')
    setFormError('')
  }, [])

  const handleStartEdit = useCallback(
    (note) => {
      if (!note || !location?.id) return
      const noteCharId = note?.characterId ?? note?.character_id ?? ''
      setEditingNoteId(note.id)
      setEditNoteContent(note?.content ?? '')
      setEditShareType(note?.shareType ?? note?.share_type ?? 'private')
      setEditCharacterId(noteCharId)
      setFormError('')
    },
    [location?.id],
  )

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
      if (!note || !location?.id || !selectedCampaignId) return

      const trimmed = editNoteContent.trim()
      if (!trimmed) {
        setFormError('Please enter a note before saving')
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

        const response = await updateLocationNote(location.id, note.id, payload)
        const updatedNote = response?.data || response

        if (!updatedNote) {
          throw new Error('Note could not be updated')
        }

        if (onNoteUpdate) {
          await onNoteUpdate(updatedNote)
        }

        handleCancelEdit()
      } catch (err) {
        console.error('Failed to update note', err)
        setFormError(err.message || 'Failed to update note')
      } finally {
        setUpdating(false)
      }
    },
    [
      location?.id,
      selectedCampaignId,
      editNoteContent,
      editShareType,
      editCharacterId,
      isCampaignPlayer,
      onNoteUpdate,
      handleCancelEdit,
    ],
  )

  const handleDeleteClick = useCallback(
    async (note) => {
      if (!note?.id || !location?.id || !selectedCampaignId) return

      const confirmed = window.confirm(
        'Are you sure you want to delete this note? This action cannot be undone.',
      )

      if (!confirmed) return

      setDeletingNoteId(note.id)
      setFormError('')

      try {
        await deleteLocationNote(location.id, note.id, {
          campaignId: selectedCampaignId,
        })

        if (onNoteDelete) {
          await onNoteDelete(note.id)
        }
      } catch (err) {
        console.error('Failed to delete note', err)
        setFormError(err.message || 'Failed to delete note')
      } finally {
        setDeletingNoteId(null)
      }
    },
    [location?.id, selectedCampaignId, onNoteDelete],
  )

  const sortedNotes = useMemo(() => {
    const list = Array.isArray(notes) ? notes : emptyArray
    if (list.length <= 1) return list
    return [...list].sort((a, b) => {
      const dateA = new Date(a?.createdAt ?? a?.created_at ?? 0).getTime()
      const dateB = new Date(b?.createdAt ?? b?.created_at ?? 0).getTime()
      if (Number.isNaN(dateA) || Number.isNaN(dateB)) return 0
      return dateB - dateA
    })
  }, [notes])

  const authorFilters = useMemo(() => {
    const options = [{ value: 'all', label: 'All notes' }]
    const seen = new Set(['all'])

    sortedNotes.forEach((note) => {
      const key = resolveAuthorKey(note)
      if (!key || seen.has(key)) return
      seen.add(key)
      options.push({ value: key, label: resolveAuthorLabel(note) })
    })

    return options
  }, [sortedNotes])

  const filteredNotes = useMemo(() => {
    if (selectedAuthor === 'all') {
      return sortedNotes
    }

    return sortedNotes.filter((note) => resolveAuthorKey(note) === selectedAuthor)
  }, [selectedAuthor, sortedNotes])

  const mentionLocationNotes = useMemo(() => {
    return Array.isArray(mentionLocationNotesState.items)
      ? mentionLocationNotesState.items
      : emptyArray
  }, [mentionLocationNotesState.items])

  useEffect(() => {
    setShareType(isCampaignDm ? 'private' : 'private')
  }, [isCampaignDm, selectedCampaignId])

  useEffect(() => {
    if (authorFilters.some((option) => option.value === selectedAuthor)) {
      return
    }
    setSelectedAuthor('all')
  }, [authorFilters, selectedAuthor])

  useEffect(() => {
    setMentionLocationNotesState({
      items: emptyArray,
      loading: false,
      error: '',
      loaded: false,
    })
    setMentionSource('location')
  }, [selectedCampaignId, location?.id, campaignMatchesLocationWorld])

  useEffect(() => {
    let cancelled = false

    if (!isCampaignPlayer || !selectedCampaignId) {
      setCharacters(emptyArray)
      setCharactersLoading(false)
      setCharactersError('')
      setCharacterId('')
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

        const source = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : []

        const mapped = source
          .map((character) => ({
            id: character?.id ? String(character.id) : '',
            name: character?.name || 'Unnamed character',
          }))
          .filter((entry) => entry.id)

        setCharacters(mapped)
        if (mapped.length === 1) {
          setCharacterId(mapped[0].id)
        } else if (!mapped.some((entry) => entry.id === characterId)) {
          setCharacterId('')
        }
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load characters for notes', err)
        setCharacters(emptyArray)
        setCharacterId('')
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
  }, [isCampaignPlayer, selectedCampaignId, characterId])

  useEffect(() => {
    if (activeSubTab !== 'mentions' || !location?.id || !selectedCampaignId || !campaignMatchesLocationWorld) {
      return
    }

    let cancelled = false

    const loadMentionNotes = async () => {
      if (mentionLocationNotesState.loaded) return

      setMentionLocationNotesState((prev) => ({ ...prev, loading: true, error: '' }))

      try {
        const response = await fetchLocationMentionNotes(location.id, {
          campaignId: selectedCampaignId,
        })
        if (cancelled) return

        const data = Array.isArray(response?.data) ? response.data : response
        const list = Array.isArray(data) ? data : []

        setMentionLocationNotesState({
          items: list,
          loading: false,
          error: '',
          loaded: true,
        })
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load location mention notes', err)
        setMentionLocationNotesState({
          items: emptyArray,
          loading: false,
          error: err.message || 'Failed to load mention notes',
          loaded: false,
        })
      }
    }

    loadMentionNotes()

    return () => {
      cancelled = true
    }
  }, [
    activeSubTab,
    location?.id,
    selectedCampaignId,
    campaignMatchesLocationWorld,
    mentionLocationNotesState.loaded,
  ])

  const campaignName = selectedCampaign?.name || ''

  // Helper to get note title for display
  const getNoteTitle = useCallback((note) => {
    const authorName = resolveAuthorLabel(note)
    const characterName = note?.character?.name || ''
    if (characterName) {
      return `${authorName} (as ${characterName})`
    }
    return authorName
  }, [])

  // Helper to get visibility tag
  const getVisibilityTag = useCallback((note) => {
    const share = String(note?.shareType ?? note?.share_type ?? 'private')
    return SHARE_LABELS[share] || 'Private'
  }, [])

  const renderNoteBody = useCallback((note) => {
    const segments = buildNoteSegments(note?.content || '', note?.mentions)
    if (!segments.length) return null

    return segments.map((segment, index) => {
      if (segment.type === 'mention' && segment.entityId) {
        const key = `${note?.id || 'note'}-mention-${index}`
        const label = segment.entityName || 'location'
        return (
          <span key={key} className="entity-note-mention">
            @{label}
            <LocationInfoPreview locationId={segment.entityId} locationName={label} />
          </span>
        )
      }

      return (
        <span key={`${note?.id || 'note'}-text-${index}`} className="entity-note-text">
          {segment.text}
        </span>
      )
    })
  }, [])

  const shareDisabled = creating
  const saveDisabled = creating || !noteContent.trim() || (isCampaignPlayer && !characterId)
  const filterDisabled = sortedNotes.length === 0 || authorFilters.length <= 1
  const showCharacterPicker = isCampaignPlayer && canShowForm
  const characterLocked = showCharacterPicker && characters.length === 1

  useEffect(() => {
    if ((activeSubTab !== 'notes' || !canShowForm) && drawerOpen) {
      closeDrawer()
    }
  }, [activeSubTab, canShowForm, drawerOpen, closeDrawer])

  if (error === 'CAMPAIGN_CONTEXT_ACCESS_DENIED') {
    return (
      <div className="entity-notes-container">
        <div className="alert error" style={{ padding: '1.5rem', maxWidth: '600px', margin: '2rem auto' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Access Restricted by Campaign Context</h2>
          <p style={{ marginBottom: '1rem' }}>
            You don't have access to notes for this location with your current campaign context selected.
          </p>
          <p>
            To view notes, please change your campaign context using the selector in the header to a campaign that has access to this location.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* 2. Notes Card Container: bg-white border border-neutral-200 rounded-xl shadow-sm p-6 mb-6 w-full */}
      {/* Card sits directly inside entity-detail-shell (which provides max-w-5xl mx-auto px-6 pt-8) */}
      <div className="entity-notes-card-strict">
          {/* 3. Header Row: flex items-center justify-between mb-4 */}
          <div className="entity-notes-header-row">
            <h2 className="entity-notes-title">Notes</h2>
            {activeSubTab === 'notes' && canShowForm ? (
              <button
                type="button"
                className="btn-primary"
                onClick={openDrawer}
                disabled={creating}
              >
                + Create note
              </button>
            ) : null}
          </div>

          {/* 4. Campaign Line: text-sm text-neutral-600 mb-4 */}
          {selectedCampaign?.name ? (
            <p className="entity-notes-campaign-line">Campaign: {campaignName}</p>
          ) : null}

          {/* 5. Tab Toggle: flex items-center gap-2 mb-4 */}
          <div className="entity-notes-tabs-row">
            <button
              type="button"
              className={`entity-notes-strict-tab-button${
                activeSubTab === 'notes' ? ' active' : ''
              }`}
              onClick={() => setActiveSubTab('notes')}
            >
              Notes
            </button>
            <button
              type="button"
              className={`entity-notes-strict-tab-button${
                activeSubTab === 'mentions' ? ' active' : ''
              }`}
              onClick={() => setActiveSubTab('mentions')}
            >
              @Mentions
            </button>
          </div>

        {activeSubTab === 'notes' ? (
          <>
            {/* 6. Filter Row: flex items-center gap-4 mb-4 */}
            <div className="entity-notes-strict-filter">
              <span className="entity-notes-strict-filter-label">Show notes from</span>
              <select
                className="entity-notes-strict-filter-select"
                value={selectedAuthor}
                onChange={(event) => setSelectedAuthor(event.target.value)}
                disabled={filterDisabled}
              >
                {authorFilters.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Error states */}
            {error ? (
              <div className="entity-notes-strict-alert error">
                <AlertCircle size={16} />
                <p>{error}</p>
              </div>
            ) : null}

            {loading ? (
              <div className="entity-notes-strict-loading">
                <Loader2 className="spin" size={20} />
                <span>Loading notes…</span>
              </div>
            ) : null}

            {/* 7. Empty State: text-sm text-neutral-500 */}
            {!loading && filteredNotes.length === 0 ? (
              <p className="entity-notes-strict-empty">No notes yet.</p>
            ) : null}

            {/* 8. Note items */}
            {!loading && filteredNotes.length > 0 ? (
              <div className="entity-notes-strict-list">
                {filteredNotes.map((note) => {
                  const createdAtValue =
                    note?.createdAt ?? note?.created_at ?? note?.timestamp ?? null
                  const formattedTimestamp = formatTimestamp(createdAtValue)
                  const share = String(note?.shareType ?? note?.share_type ?? 'private')
                  const isEditing = editingNoteId === note?.id
                  const canEdit = isNoteAuthor(note)
                  const noteCharacterId = note?.characterId ?? note?.character_id ?? ''

                  return (
                    <div
                      key={note?.id}
                      className="entity-notes-strict-note-item"
                    >
                      {isEditing ? (
                        /* 9. Edit mode panel */
                        <div className="entity-notes-strict-edit-panel">
                          <MentionsInputWrapper
                            value={editNoteContent}
                            onChange={handleEditNoteContentChange}
                            markup="@[__display__](__id__)"
                            placeholder={LOCATION_NOTE_PLACEHOLDER}
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
                              data={handleLocationMentionSearch}
                              appendSpaceOnAdd
                            />
                          </MentionsInputWrapper>

                          <p className="entity-notes-strict-share-label">Share with</p>

                          <div className="entity-notes-strict-share-options">
                            {shareOptions.map((option) => (
                              <label
                                key={option.value}
                                className="entity-notes-strict-share-option"
                              >
                                <input
                                  type="radio"
                                  name={`location-note-share-edit-${note.id}`}
                                  value={option.value}
                                  checked={editShareType === option.value}
                                  onChange={() => setEditShareType(option.value)}
                                  disabled={updating}
                                />
                                {option.value === 'private' ? 'Private' : option.value === 'party' ? 'Share with Party' : option.label}
                              </label>
                            ))}
                          </div>

                          {formError ? (
                            <div className="entity-notes-strict-alert error">
                              <AlertCircle size={16} />
                              <p>{formError}</p>
                            </div>
                          ) : null}

                          <div className="entity-notes-strict-edit-actions">
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => handleSaveEdit(note)}
                              disabled={updating || !editNoteContent.trim()}
                            >
                              {updating ? (
                                <>
                                  <Loader2 className="spin" size={16} /> Saving…
                                </>
                              ) : (
                                'Save'
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={handleCancelEdit}
                              disabled={updating}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* 8. Note Item Structure (READ MODE) */}
                          <div className="entity-notes-strict-note-header">
                            <div className="entity-notes-strict-note-title-row">
                              <span className="entity-notes-strict-note-title">
                                {getNoteTitle(note)}
                              </span>
                              <span className="entity-notes-strict-note-visibility">
                                {getVisibilityTag(note)}
                              </span>
                            </div>
                            <span className="entity-notes-strict-note-timestamp">
                              {formattedTimestamp || '—'}
                            </span>
                          </div>

                          <p className="entity-notes-strict-note-body">{renderNoteBody(note)}</p>

                          {canEdit ? (
                            <div className="entity-notes-strict-note-actions">
                              <button
                                type="button"
                                className="entity-notes-strict-edit-button"
                                onClick={() => handleStartEdit(note)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="entity-notes-strict-delete-button"
                                onClick={() => handleDeleteClick(note)}
                                disabled={deletingNoteId === note.id}
                              >
                                {deletingNoteId === note.id ? (
                                  <Loader2 className="spin" size={14} />
                                ) : (
                                  'Delete'
                                )}
                              </button>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : null}
          </>
        ) : (
          /* 10. @Mentions tab - same structure */
          <div className="entity-notes-strict-mentions">
            {mentionLocationNotesState.loading ? (
              <div className="entity-notes-strict-loading">
                <Loader2 className="spin" size={20} />
                <span>Loading mentions…</span>
              </div>
            ) : null}
            {mentionLocationNotesState.error ? (
              <div className="entity-notes-strict-alert error">
                <AlertCircle size={16} />
                <p>{mentionLocationNotesState.error}</p>
              </div>
            ) : null}
            {!mentionLocationNotesState.loading && mentionLocationNotesState.loaded && mentionLocationNotes.length === 0 ? (
              <p className="entity-notes-strict-empty">
                This location hasn&apos;t been mentioned in other location notes yet.
              </p>
            ) : null}
            {!mentionLocationNotesState.loading && mentionLocationNotesState.loaded && mentionLocationNotes.length > 0 ? (
              <div className="entity-notes-strict-list">
                {mentionLocationNotes.map((note, index) => {
                  const rawKey =
                    note?.id ??
                    note?.locationNoteId ??
                    note?.location_note_id ??
                    `location-mention-${index}`
                  const noteKey = String(rawKey)
                  const createdAtValue = note?.createdAt ?? note?.created_at
                  const createdAtDate = createdAtValue ? new Date(createdAtValue) : null
                  const formattedTimestamp = formatTimestamp(createdAtDate)

                  return (
                    <div
                      key={`location-mention-${noteKey}`}
                      className="entity-notes-strict-note-item"
                    >
                      <div className="entity-notes-strict-note-header">
                        <div className="entity-notes-strict-note-title-row">
                          <span className="entity-notes-strict-note-title">
                            {getNoteTitle(note)}
                          </span>
                          <span className="entity-notes-strict-note-visibility">
                            {getVisibilityTag(note)}
                          </span>
                        </div>
                        <span className="entity-notes-strict-note-timestamp">
                          {formattedTimestamp || '—'}
                        </span>
                      </div>
                      <p className="entity-notes-strict-note-body">{renderNoteBody(note)}</p>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <DrawerPanel
        isOpen={drawerOpen && canShowForm}
        onClose={closeDrawer}
        title="Create note"
      >
        <div className="entity-notes-form">
          <form onSubmit={handleSubmit} className="entity-notes-form-body">
            <label className="entity-notes-label" htmlFor="location-note-content">
              Note
            </label>
            <div className="entity-note-editor-field">
              <MentionsInputWrapper
                value={noteContent}
                onChange={handleNoteContentChange}
                markup="@[__display__](__id__)"
                placeholder={LOCATION_NOTE_PLACEHOLDER}
                className="entity-note-mentions"
                inputProps={{
                  id: 'location-note-content',
                  className: 'entity-note-textarea',
                  'aria-label': 'Location note content',
                  rows: 5,
                  required: true,
                  'data-autofocus': true,
                }}
              >
                <Mention
                  trigger="@"
                  markup="@[__display__](__id__)"
                  displayTransform={(id, display) => `@${display}`}
                  data={handleLocationMentionSearch}
                  appendSpaceOnAdd
                />
              </MentionsInputWrapper>
            </div>

            <fieldset className="entity-notes-share">
              <legend>Share with</legend>
              {shareOptions.map((option) => (
                <label key={option.value} className="entity-notes-share-option">
                  <input
                    type="radio"
                    name="location-note-share"
                    value={option.value}
                    checked={shareType === option.value}
                    onChange={() => setShareType(option.value)}
                    disabled={shareDisabled}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>

            {showCharacterPicker ? (
              <div className="entity-notes-character">
                <label htmlFor="location-note-character">Character</label>
                <select
                  id="location-note-character"
                  value={characterId}
                  onChange={(event) => setCharacterId(event.target.value)}
                  disabled={charactersLoading || characterLocked}
                  required
                >
                  <option value="" disabled>
                    {charactersLoading ? 'Loading characters…' : 'Select character'}
                  </option>
                  {characters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </select>
                {characterLocked ? (
                  <p className="entity-notes-hint">
                    Notes will be associated with your character {characters[0]?.name}.
                  </p>
                ) : null}
                {charactersError ? (
                  <div className="entity-notes-alert error">
                    <AlertCircle size={16} />
                    <p>{charactersError}</p>
                  </div>
                ) : null}
                {!charactersLoading && !charactersError && characters.length === 0 ? (
                  <p className="entity-notes-hint">
                    You need an active character in this campaign to attach notes.
                  </p>
                ) : null}
              </div>
            ) : null}

            {formError ? (
              <div className="entity-notes-alert error">
                <AlertCircle size={16} />
                <p>{formError}</p>
              </div>
            ) : null}

            {formSuccess ? (
              <div className="entity-notes-alert success">
                <p>{formSuccess}</p>
              </div>
            ) : null}

            <div className="entity-notes-actions">
              <button type="submit" className="primary" disabled={saveDisabled}>
                {creating ? (
                  <>
                    <Loader2 className="spin" size={16} /> Saving…
                  </>
                ) : (
                  'Save note'
                )}
              </button>
            </div>
          </form>
        </div>
      </DrawerPanel>
    </>
  )
}

LocationNotesTab.propTypes = {
  location: PropTypes.object,
  worldId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  selectedCampaign: PropTypes.object,
  selectedCampaignId: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ]),
  isCampaignDm: PropTypes.bool,
  isCampaignPlayer: PropTypes.bool,
  canCreateNote: PropTypes.bool,
  notes: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
  error: PropTypes.string,
  onCreateNote: PropTypes.func,
  creating: PropTypes.bool,
  campaignMatchesLocationWorld: PropTypes.bool,
  onNoteUpdate: PropTypes.func,
  onNoteDelete: PropTypes.func,
}

