import { useCallback, useEffect, useMemo, useState } from 'react'
import { Mention } from 'react-mentions'
import MentionsInputWrapper from '../../../components/notes/MentionsInputWrapper.jsx'
import { AlertCircle, Loader2, Plus, Edit2, X, Check, Trash2 } from 'lucide-react'
import PropTypes from '../../../utils/propTypes.js'
import EntityInfoPreview from '../../../components/entities/EntityInfoPreview.jsx'
import { fetchCharacters } from '../../../api/characters.js'
import DrawerPanel from '../../../components/DrawerPanel.jsx'
import {
  fetchEntityMentionNotes,
  fetchEntityMentionSessionNotes,
  searchEntities,
  updateEntityNote,
  deleteEntityNote,
} from '../../../api/entities.js'
import { buildNoteSegments, cleanEntityName } from '../../../utils/noteMentions.js'
import { useAuth } from '../../../context/AuthContext.jsx'
import './NotesTab.css'

const SHARE_LABELS = {
  private: 'Private',
  companions: 'Shared with companions',
  dm: 'Shared with DM',
  party: 'Shared with party',
}

const SHARE_OPTIONS_PLAYER = [
  {
    value: 'private',
    label: 'Private (only you and the DM can see this note)',
  },
  {
    value: 'companions',
    label: 'My Companions (all players in this campaign)',
  },
]

const SHARE_OPTIONS_DM = [
  {
    value: 'private',
    label: 'Private (only you can see this note)',
  },
  {
    value: 'party',
    label: 'Share with Party (all players in this campaign)',
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
        second: '2-digit',
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
        second: '2-digit',
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

const ENTITY_NOTE_PLACEHOLDER = 'What do you want to remember?'
export default function NotesTab({
  entity,
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
  campaignMatchesEntityWorld,
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
  const [mentionSource, setMentionSource] = useState('entity')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editNoteContent, setEditNoteContent] = useState('')
  const [editShareType, setEditShareType] = useState('private')
  const [editCharacterId, setEditCharacterId] = useState('')
  const [updating, setUpdating] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState(null)
  const [mentionEntityNotesState, setMentionEntityNotesState] = useState({
    items: emptyArray,
    loading: false,
    error: '',
    loaded: false,
  })
  const [mentionSessionNotesState, setMentionSessionNotesState] = useState({
    items: emptyArray,
    loading: false,
    error: '',
    loaded: false,
  })
  const [expandedSessionNotes, setExpandedSessionNotes] = useState(() => new Set())

  const canShowForm =
    Boolean(selectedCampaignId) &&
    Boolean(canCreateNote) &&
    Boolean(campaignMatchesEntityWorld)

  const shareOptions = useMemo(
    () => (isCampaignDm ? SHARE_OPTIONS_DM : SHARE_OPTIONS_PLAYER),
    [isCampaignDm],
  )

  const resolvedWorldId = useMemo(() => {
    if (worldId) {
      return worldId
    }

    if (entity && typeof entity === 'object') {
      const nestedWorld = entity.world || {}
      return nestedWorld.id || entity.world_id || ''
    }

    return ''
  }, [entity, worldId])

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

  const handleEntityMentionSearch = useCallback(
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
        const response = await searchEntities({
          worldId: resolvedWorldId,
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
                  entity?.name ||
                  entity?.displayName ||
                  entity?.entity?.name ||
                  'Unnamed entity'
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

  const handleStartEdit = useCallback(
    (note) => {
      if (!note || !entity?.id) return
      const noteCharId = note?.characterId ?? note?.character_id ?? ''
      setEditingNoteId(note.id)
      setEditNoteContent(note?.content ?? '')
      setEditShareType(note?.shareType ?? note?.share_type ?? 'private')
      setEditCharacterId(noteCharId)
      setFormError('')
    },
    [entity?.id],
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
      if (!note || !entity?.id || !selectedCampaignId) return

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

        const response = await updateEntityNote(entity.id, note.id, payload)
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
      entity?.id,
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
      if (!note?.id || !entity?.id || !selectedCampaignId) return

      const confirmed = window.confirm(
        'Are you sure you want to delete this note? This action cannot be undone.',
      )

      if (!confirmed) return

      setDeletingNoteId(note.id)
      setFormError('')

      try {
        await deleteEntityNote(entity.id, note.id, {
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
    [entity?.id, selectedCampaignId, onNoteDelete],
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

  const mentionEntityNotes = useMemo(() => {
    return Array.isArray(mentionEntityNotesState.items)
      ? mentionEntityNotesState.items
      : emptyArray
  }, [mentionEntityNotesState.items])

  const mentionSessionNotes = useMemo(() => {
    return Array.isArray(mentionSessionNotesState.items)
      ? mentionSessionNotesState.items
      : emptyArray
  }, [mentionSessionNotesState.items])

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
    setMentionEntityNotesState({
      items: emptyArray,
      loading: false,
      error: '',
      loaded: false,
    })
    setMentionSessionNotesState({
      items: emptyArray,
      loading: false,
      error: '',
      loaded: false,
    })
    setExpandedSessionNotes(new Set())
    setMentionSource('entity')
  }, [selectedCampaignId, entity?.id, campaignMatchesEntityWorld])

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

  const loadEntityMentionNotes = useCallback(async () => {
    if (!entity?.id || !selectedCampaignId || !campaignMatchesEntityWorld) {
      return
    }

    setMentionEntityNotesState((previous) => ({
      ...previous,
      loading: true,
      error: '',
    }))

    try {
      const response = await fetchEntityMentionNotes(entity.id, {
        campaignId: selectedCampaignId,
      })

      const data = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : emptyArray

      setMentionEntityNotesState({
        items: data,
        loading: false,
        error: '',
        loaded: true,
      })
    } catch (err) {
      setMentionEntityNotesState({
        items: emptyArray,
        loading: false,
        error: err?.message || 'Failed to load mentions',
        loaded: true,
      })
    }
  }, [campaignMatchesEntityWorld, entity?.id, selectedCampaignId])

  const loadSessionMentionNotes = useCallback(async () => {
    if (!entity?.id || !selectedCampaignId || !campaignMatchesEntityWorld) {
      return
    }

    setMentionSessionNotesState((previous) => ({
      ...previous,
      loading: true,
      error: '',
    }))

    try {
      const response = await fetchEntityMentionSessionNotes(entity.id, {
        campaignId: selectedCampaignId,
      })

      const data = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : emptyArray

      setMentionSessionNotesState({
        items: data,
        loading: false,
        error: '',
        loaded: true,
      })
    } catch (err) {
      setMentionSessionNotesState({
        items: emptyArray,
        loading: false,
        error: err?.message || 'Failed to load mentions',
        loaded: true,
      })
    }
  }, [campaignMatchesEntityWorld, entity?.id, selectedCampaignId])

  useEffect(() => {
    if (activeSubTab !== 'mentions') {
      return
    }

    if (mentionSource !== 'entity') {
      return
    }

    if (mentionEntityNotesState.loading || mentionEntityNotesState.loaded) {
      return
    }

    loadEntityMentionNotes()
  }, [
    activeSubTab,
    mentionSource,
    mentionEntityNotesState.loading,
    mentionEntityNotesState.loaded,
    loadEntityMentionNotes,
  ])

  useEffect(() => {
    if (activeSubTab !== 'mentions') {
      return
    }

    if (mentionSource !== 'session') {
      return
    }

    if (mentionSessionNotesState.loading || mentionSessionNotesState.loaded) {
      return
    }

    loadSessionMentionNotes()
  }, [
    activeSubTab,
    mentionSource,
    mentionSessionNotesState.loading,
    mentionSessionNotesState.loaded,
    loadSessionMentionNotes,
  ])

  const buildNotePreview = useCallback((note) => {
    const segments = buildNoteSegments(note?.content, note?.mentions)
    if (!segments.length) return ''

    const plain = segments
      .map((segment) =>
        segment.type === 'mention'
          ? `@${segment.entityName || 'entity'}`
          : segment.text || '',
      )
      .join('')
      .replace(/\s+/g, ' ')
      .trim()

    if (plain.length <= 180) {
      return plain
    }

    return `${plain.slice(0, 177)}…`
  }, [])

  const formatSessionDate = useCallback((note) => {
    const raw = note?.sessionDate ?? note?.session_date
    if (!raw) return ''

    try {
      const date = new Date(raw)
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      }
    } catch (err) {
      console.warn('Unable to format session date', err)
      return raw
    }

    return raw
  }, [])

  const handleSessionNoteToggle = useCallback((noteId) => {
    const key = String(noteId)
    setExpandedSessionNotes((previous) => {
      const next = new Set(previous)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const isSessionNoteExpanded = useCallback(
    (noteId) => expandedSessionNotes.has(String(noteId)),
    [expandedSessionNotes],
  )

  const handleMentionsRefresh = useCallback(() => {
    if (!entity?.id || !selectedCampaignId || !campaignMatchesEntityWorld) {
      return
    }

    if (mentionSource === 'entity') {
      loadEntityMentionNotes()
    } else {
      loadSessionMentionNotes()
    }
  }, [
    campaignMatchesEntityWorld,
    entity?.id,
    loadEntityMentionNotes,
    loadSessionMentionNotes,
    mentionSource,
    selectedCampaignId,
  ])

  const renderNoteBody = useCallback((note) => {
    const segments = buildNoteSegments(note?.content, note?.mentions)
    if (!segments.length) return null

    return segments.map((segment, index) => {
      if (segment.type === 'mention' && segment.entityId) {
        const key = `${note?.id || 'note'}-mention-${index}`
        const label = segment.entityName || 'entity'
        return (
          <span key={key} className="entity-note-mention">
            @{label}
            <EntityInfoPreview entityId={segment.entityId} entityName={label} />
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

  const shareBadgeClass = useCallback(
    (share) => `entity-note-share entity-note-share-${share}`,
    [],
  )

  const mentionEntityCount = mentionEntityNotes.length
  const mentionSessionCount = mentionSessionNotes.length
  const mentionEntityLoading = mentionEntityNotesState.loading
  const mentionSessionLoading = mentionSessionNotesState.loading
  const mentionEntityError = mentionEntityNotesState.error
  const mentionSessionError = mentionSessionNotesState.error
  const mentionEntityLoaded = mentionEntityNotesState.loaded
  const mentionSessionLoaded = mentionSessionNotesState.loaded
  const totalMentionsCount = mentionEntityCount + mentionSessionCount
  const mentionRefreshDisabled =
    !selectedCampaignId ||
    !campaignMatchesEntityWorld ||
    (mentionSource === 'entity' ? mentionEntityLoading : mentionSessionLoading)

  const showCharacterPicker = isCampaignPlayer && canShowForm
  const characterLocked = showCharacterPicker && characters.length === 1

  const shareDisabled = creating
  const saveDisabled = creating || !noteContent.trim() || (isCampaignPlayer && !characterId)
  const filterDisabled = sortedNotes.length === 0 || authorFilters.length <= 1

  useEffect(() => {
    if ((activeSubTab !== 'notes' || !canShowForm) && drawerOpen) {
      closeDrawer()
    }
  }, [activeSubTab, canShowForm, drawerOpen, closeDrawer])

  return (
    <div className="entity-notes">
      <section className="entity-card entity-notes-feed">
        <header className="entity-notes-feed-header">
          <div className="entity-notes-feed-title">
            <h2>{activeSubTab === 'notes' ? 'Notes' : '@Mentions'}</h2>
            {selectedCampaign?.name ? (
              <p className="entity-notes-context">
                Campaign: <strong>{selectedCampaign.name}</strong>
              </p>
            ) : null}
          </div>
          {activeSubTab === 'notes' && canShowForm ? (
            <button
              type="button"
              className="primary entity-notes-create-button"
              onClick={openDrawer}
              disabled={creating}
            >
              <Plus size={16} /> Create note
            </button>
          ) : null}
        </header>

        <div
          className="entity-notes-subnav"
          role="tablist"
          aria-label="Entity notes views"
        >
          <button
            type="button"
            role="tab"
            className={`entity-notes-subnav-button${
              activeSubTab === 'notes' ? ' active' : ''
            }`}
            onClick={() => setActiveSubTab('notes')}
            aria-selected={activeSubTab === 'notes'}
          >
            Notes
          </button>
          <button
            type="button"
            role="tab"
            className={`entity-notes-subnav-button${
              activeSubTab === 'mentions' ? ' active' : ''
            }`}
            onClick={() => setActiveSubTab('mentions')}
            aria-selected={activeSubTab === 'mentions'}
          >
            @Mentions
            {totalMentionsCount > 0 ? (
              <span className="entity-notes-subnav-count">{totalMentionsCount}</span>
            ) : null}
          </button>
        </div>

        {activeSubTab === 'notes' ? (
          <>
            <div className="entity-notes-filter-bar">
              <label htmlFor="entity-notes-author-filter">Show notes from</label>
              <select
                id="entity-notes-author-filter"
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
              <span className="entity-notes-filter-count">
                {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
              </span>
            </div>

            {!selectedCampaignId ? (
              <div className="entity-notes-alert info">
                <AlertCircle size={16} />
                <p>Select a campaign to add and view notes for this entity.</p>
              </div>
            ) : null}

            {selectedCampaignId && !campaignMatchesEntityWorld ? (
              <div className="entity-notes-alert warning">
                <AlertCircle size={16} />
                <p>
                  The selected campaign belongs to a different world. Switch to a
                  campaign within this entity&apos;s world to create notes.
                </p>
              </div>
            ) : null}

            {selectedCampaignId && campaignMatchesEntityWorld && !canCreateNote ? (
              <div className="entity-notes-alert info">
                <AlertCircle size={16} />
                <p>Only Dungeon Masters and players in this campaign can add notes.</p>
              </div>
            ) : null}

            {error ? (
              <div className="entity-notes-alert error">
                <AlertCircle size={16} />
                {error === 'CAMPAIGN_CONTEXT_ACCESS_DENIED' ? (
                  <div>
                    <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Access Restricted by Campaign Context
                    </p>
                    <p style={{ marginBottom: '0.5rem' }}>
                      You don't have access to view notes for this entity with your current campaign context selected.
                    </p>
                    <p>
                      Please change your campaign context using the selector in the header, or clear your campaign context to view notes from all campaigns you have access to.
                    </p>
                  </div>
                ) : (
                  <p>{error}</p>
                )}
              </div>
            ) : null}

            {loading ? (
              <div className="entity-notes-loading">
                <Loader2 className="spin" size={20} />
                <span>Loading notes…</span>
              </div>
            ) : null}

            {!loading && filteredNotes.length === 0 ? (
              <p className="entity-notes-empty">
                {sortedNotes.length === 0
                  ? 'No notes yet. Be the first to add one!'
                  : 'No notes from this person yet.'}
              </p>
            ) : null}

            <div className="entity-notes-list" role="list">
              {filteredNotes.map((note) => {
                // Try multiple possible date field names and formats
                const createdAtValue =
                  note?.createdAt ??
                  note?.created_at ??
                  note?.timestamp ??
                  null
                
                // Debug: log if timestamp is missing (remove after debugging)
                if (!createdAtValue && process.env.NODE_ENV === 'development') {
                  console.debug('Note missing timestamp:', note?.id, note)
                }
                
                // formatTimestamp can handle both Date objects and date strings
                const formattedTimestamp = formatTimestamp(createdAtValue)
                
                // For the ISO timestamp attribute, try to create a proper Date object
                let isoTimestamp = undefined
                if (createdAtValue) {
                  try {
                    const date = new Date(createdAtValue)
                    if (!Number.isNaN(date.getTime())) {
                      isoTimestamp = date.toISOString()
                    }
                  } catch (err) {
                    // If date parsing fails, use the raw value if it's a string
                    if (typeof createdAtValue === 'string') {
                      isoTimestamp = createdAtValue
                    }
                  }
                }
                
                const share = String(note?.shareType ?? note?.share_type ?? 'private')
                const authorName = resolveAuthorLabel(note)
                const characterName = note?.character?.name || ''
                const isEditing = editingNoteId === note?.id
                const canEdit = isNoteAuthor(note)
                const noteCharacterId = note?.characterId ?? note?.character_id ?? ''

                return (
                  <article key={note?.id} className="entity-note-card" role="listitem">
                    <header>
                      <div className="entity-note-meta">
                        <span className="entity-note-author">{authorName}</span>
                        {characterName ? (
                          <span className="entity-note-character">as {characterName}</span>
                        ) : null}
                        <span className={shareBadgeClass(share)}>
                          {SHARE_LABELS[share] || 'Private'}
                        </span>
                      </div>
                      <div className="entity-note-header-actions">
                        <time
                          className="entity-note-timestamp"
                          dateTime={isoTimestamp}
                          title={formattedTimestamp || (createdAtValue ? String(createdAtValue) : undefined)}
                        >
                          {formattedTimestamp || (createdAtValue ? 'Invalid date' : '—')}
                        </time>
                        {canEdit && !isEditing ? (
                          <div className="entity-note-action-buttons">
                            <button
                              type="button"
                              className="entity-note-edit-button"
                              onClick={() => handleStartEdit(note)}
                              title="Edit note"
                              aria-label="Edit note"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              type="button"
                              className="entity-note-delete-button"
                              onClick={() => handleDeleteClick(note)}
                              title="Delete note"
                              aria-label="Delete note"
                              disabled={deletingNoteId === note.id}
                            >
                              {deletingNoteId === note.id ? (
                                <Loader2 className="spin" size={14} />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </header>
                    {isEditing ? (
                      <div className="entity-note-edit-form">
                        <div className="entity-note-editor-field">
                          <MentionsInputWrapper
                            value={editNoteContent}
                            onChange={handleEditNoteContentChange}
                            markup="@[__display__](__id__)"
                            placeholder={ENTITY_NOTE_PLACEHOLDER}
                            className="entity-note-mentions"
                            inputProps={{
                              className: 'entity-note-textarea',
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
                        </div>

                        <fieldset className="entity-notes-share">
                          <legend>Share with</legend>
                          {shareOptions.map((option) => (
                            <label key={option.value} className="entity-notes-share-option">
                              <input
                                type="radio"
                                name={`entity-note-share-edit-${note.id}`}
                                value={option.value}
                                checked={editShareType === option.value}
                                onChange={() => setEditShareType(option.value)}
                                disabled={updating}
                              />
                              <span>{option.label}</span>
                            </label>
                          ))}
                        </fieldset>

                        {showCharacterPicker && noteCharacterId ? (
                          <div className="entity-notes-character">
                            <label htmlFor={`entity-note-character-edit-${note.id}`}>
                              Character
                            </label>
                            <select
                              id={`entity-note-character-edit-${note.id}`}
                              value={editCharacterId || noteCharacterId}
                              onChange={(event) => setEditCharacterId(event.target.value)}
                              disabled={charactersLoading || characterLocked || updating}
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
                          </div>
                        ) : null}

                        {formError ? (
                          <div className="entity-notes-alert error">
                            <AlertCircle size={16} />
                            <p>{formError}</p>
                          </div>
                        ) : null}

                        <div className="entity-notes-actions">
                          <button
                            type="button"
                            className="primary"
                            onClick={() => handleSaveEdit(note)}
                            disabled={updating || !editNoteContent.trim()}
                          >
                            {updating ? (
                              <>
                                <Loader2 className="spin" size={16} /> Saving…
                              </>
                            ) : (
                              <>
                                <Check size={16} /> Save
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            className="entity-note-cancel-button"
                            onClick={handleCancelEdit}
                            disabled={updating}
                          >
                            <X size={16} /> Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="entity-note-body">{renderNoteBody(note)}</div>
                    )}
                  </article>
                )
              })}
            </div>
          </>
        ) : (
          <div className="entity-notes-mentions">
            <div className="entity-notes-mentions-header">
              <div
                className="entity-notes-mention-toggle"
                role="tablist"
                aria-label="Mention sources"
              >
                <button
                  type="button"
                  role="tab"
                  className={`entity-notes-mention-toggle-button${
                    mentionSource === 'entity' ? ' active' : ''
                  }`}
                  onClick={() => setMentionSource('entity')}
                  aria-selected={mentionSource === 'entity'}
                >
                  Entity Notes
                  {mentionEntityLoaded ? (
                    <span className="entity-notes-mention-count">{mentionEntityCount}</span>
                  ) : null}
                </button>
                <button
                  type="button"
                  role="tab"
                  className={`entity-notes-mention-toggle-button${
                    mentionSource === 'session' ? ' active' : ''
                  }`}
                  onClick={() => setMentionSource('session')}
                  aria-selected={mentionSource === 'session'}
                >
                  Session Notes
                  {mentionSessionLoaded ? (
                    <span className="entity-notes-mention-count">{mentionSessionCount}</span>
                  ) : null}
                </button>
              </div>
              <button
                type="button"
                className="entity-notes-refresh-button"
                onClick={handleMentionsRefresh}
                disabled={mentionRefreshDisabled}
              >
                {(mentionSource === 'entity' ? mentionEntityLoading : mentionSessionLoading) ? (
                  <>
                    <Loader2 className="spin" size={16} /> Refreshing…
                  </>
                ) : (
                  'Refresh'
                )}
              </button>
            </div>

            {!selectedCampaignId ? (
              <div className="entity-notes-alert info">
                <AlertCircle size={16} />
                <p>Select a campaign to view mentions for this entity.</p>
              </div>
            ) : null}

            {selectedCampaignId && !campaignMatchesEntityWorld ? (
              <div className="entity-notes-alert warning">
                <AlertCircle size={16} />
                <p>
                  The selected campaign belongs to a different world. Switch to a
                  campaign within this entity&apos;s world to view mentions.
                </p>
              </div>
            ) : null}

            {selectedCampaignId && campaignMatchesEntityWorld ? (
              mentionSource === 'entity' ? (
                <>
                  {mentionEntityError ? (
                    <div className="entity-notes-alert error">
                      <AlertCircle size={16} />
                      <p>{mentionEntityError}</p>
                    </div>
                  ) : null}
                  {mentionEntityLoading ? (
                    <div className="entity-notes-loading">
                      <Loader2 className="spin" size={20} />
                      <span>Loading mentions…</span>
                    </div>
                  ) : null}
                  {!mentionEntityLoading && mentionEntityLoaded && mentionEntityCount === 0 ? (
                    <p className="entity-notes-empty">
                      This entity hasn&apos;t been mentioned in other entity notes yet.
                    </p>
                  ) : null}
                  <div className="entity-notes-list" role="list">
                    {mentionEntityNotes.map((note, index) => {
                      const rawKey =
                        note?.id ??
                        note?.entityNoteId ??
                        note?.entity_note_id ??
                        `entity-mention-${index}`
                      const noteKey = String(rawKey)
                      const createdAtValue = note?.createdAt ?? note?.created_at
                      const createdAtDate = createdAtValue ? new Date(createdAtValue) : null
                      const formattedTimestamp = formatTimestamp(createdAtDate)
                      const share = String(note?.shareType ?? note?.share_type ?? 'private')
                      const authorName = resolveAuthorLabel(note)
                      const characterName = note?.character?.name || ''
                      const isoTimestamp =
                        createdAtDate && !Number.isNaN(createdAtDate.getTime())
                          ? createdAtDate.toISOString()
                          : undefined
                      const noteEntityName =
                        note?.entity?.name ?? note?.entityName ?? 'Unnamed entity'
                      const noteEntityId =
                        note?.entity?.id ?? note?.entityId ?? note?.entity_id ?? null

                      return (
                        <article
                          key={`entity-mention-${noteKey}`}
                          className="entity-note-card entity-mention-note"
                          role="listitem"
                        >
                          <header>
                            <div className="entity-note-meta">
                              <span className="entity-note-author">{authorName}</span>
                              {characterName ? (
                                <span className="entity-note-character">as {characterName}</span>
                              ) : null}
                              <span className={shareBadgeClass(share)}>
                                {SHARE_LABELS[share] || 'Private'}
                              </span>
                            </div>
                            <time
                              className="entity-note-timestamp"
                              dateTime={isoTimestamp}
                              title={formattedTimestamp || undefined}
                            >
                              {formattedTimestamp || '—'}
                            </time>
                          </header>
                          <div className="entity-mention-note-context">
                            <span>
                              Note for <strong>{noteEntityName}</strong>
                            </span>
                            {noteEntityId ? (
                              <EntityInfoPreview
                                entityId={noteEntityId}
                                entityName={noteEntityName}
                              />
                            ) : null}
                          </div>
                          <div className="entity-note-body">{renderNoteBody(note)}</div>
                        </article>
                      )
                    })}
                  </div>
                </>
              ) : (
                <>
                  {mentionSessionError ? (
                    <div className="entity-notes-alert error">
                      <AlertCircle size={16} />
                      <p>{mentionSessionError}</p>
                    </div>
                  ) : null}
                  {mentionSessionLoading ? (
                    <div className="entity-notes-loading">
                      <Loader2 className="spin" size={20} />
                      <span>Loading session mentions…</span>
                    </div>
                  ) : null}
                  {!mentionSessionLoading && mentionSessionLoaded && mentionSessionCount === 0 ? (
                    <p className="entity-notes-empty">
                      This entity hasn&apos;t been mentioned in session notes yet.
                    </p>
                  ) : null}
                  <div className="entity-session-note-list" role="list">
                    {mentionSessionNotes.map((note, index) => {
                      const rawKey =
                        note?.id ??
                        note?.noteId ??
                        note?.note_id ??
                        `session-mention-${index}`
                      const noteKey = String(rawKey)
                      const expanded = isSessionNoteExpanded(noteKey)
                      const preview = buildNotePreview(note)
                      const sessionTitle =
                        note?.sessionTitle ?? note?.session_title ?? 'Session note'
                      const sessionDate = formatSessionDate(note)
                      const authorName = resolveAuthorLabel(note)
                      const timestampValue =
                        note?.updatedAt ??
                        note?.updated_at ??
                        note?.createdAt ??
                        note?.created_at
                      const timestampDate = timestampValue ? new Date(timestampValue) : null
                      const formattedTimestamp = formatTimestamp(timestampDate)
                      const isoTimestamp =
                        timestampDate && !Number.isNaN(timestampDate.getTime())
                          ? timestampDate.toISOString()
                          : undefined
                      const summaryText =
                        preview || 'This session note does not include any text.'

                      return (
                        <article
                          key={`session-mention-${noteKey}`}
                          className={`entity-session-note${expanded ? ' expanded' : ''}`}
                          role="listitem"
                        >
                          <header className="entity-session-note-header">
                            <div className="entity-session-note-meta">
                              <span className="entity-session-note-title">{sessionTitle}</span>
                              <div className="entity-session-note-details">
                                {sessionDate ? (
                                  <span className="entity-session-note-date">{sessionDate}</span>
                                ) : null}
                                <span className="entity-session-note-author">by {authorName}</span>
                              </div>
                            </div>
                            <div className="entity-session-note-actions">
                              {formattedTimestamp ? (
                                <time
                                  className="entity-session-note-timestamp"
                                  dateTime={isoTimestamp}
                                  title={formattedTimestamp}
                                >
                                  {formattedTimestamp}
                                </time>
                              ) : null}
                              <button
                                type="button"
                                className="entity-session-note-toggle"
                                onClick={() => handleSessionNoteToggle(noteKey)}
                                aria-expanded={expanded}
                              >
                                {expanded ? 'Hide note' : 'View note'}
                              </button>
                            </div>
                          </header>
                          {!expanded ? (
                            <p className="entity-session-note-summary">{summaryText}</p>
                          ) : null}
                          {expanded ? (
                            <div className="entity-session-note-body">{renderNoteBody(note)}</div>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                </>
              )
            ) : null}
          </div>
        )}
      </section>

      <DrawerPanel
        isOpen={drawerOpen && canShowForm}
        onClose={closeDrawer}
        title="Create note"
      >
        <div className="entity-notes-form">
          <form onSubmit={handleSubmit} className="entity-notes-form-body">
            <label className="entity-notes-label" htmlFor="entity-note-content">
              Note
            </label>
            <div className="entity-note-editor-field">
              <MentionsInputWrapper
                value={noteContent}
                onChange={handleNoteContentChange}
                markup="@[__display__](__id__)"
                placeholder={ENTITY_NOTE_PLACEHOLDER}
                className="entity-note-mentions"
                inputProps={{
                  id: 'entity-note-content',
                  className: 'entity-note-textarea',
                  'aria-label': 'Entity note content',
                  rows: 5,
                  required: true,
                  'data-autofocus': true,
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
            </div>

            <fieldset className="entity-notes-share">
              <legend>Share with</legend>
              {shareOptions.map((option) => (
                <label key={option.value} className="entity-notes-share-option">
                  <input
                    type="radio"
                    name="entity-note-share"
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
                <label htmlFor="entity-note-character">Character</label>
                <select
                  id="entity-note-character"
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
    </div>
  )
}

NotesTab.propTypes = {
  entity: PropTypes.object,
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
  campaignMatchesEntityWorld: PropTypes.bool,
  onNoteUpdate: PropTypes.func,
  onNoteDelete: PropTypes.func,
}
