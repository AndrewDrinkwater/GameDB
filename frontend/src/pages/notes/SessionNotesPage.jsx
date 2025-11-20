import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  CalendarDays,
  Check,
  Edit3,
  Eye,
  Loader2,
  NotebookPen,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react'
import { Mention } from 'react-mentions'
import MentionsInputWrapper from '../../components/notes/MentionsInputWrapper.jsx'
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import {
  createCampaignSessionNote,
  deleteCampaignSessionNote,
  fetchCampaignSessionNotes,
  updateCampaignSessionNote,
} from '../../api/campaigns.js'
import { searchEntities } from '../../api/entities.js'
import TaggedNoteContent from '../../components/notes/TaggedNoteContent.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { buildNoteSegments, cleanEntityName } from '../../utils/noteMentions.js'
import { ENTITY_CREATION_SCOPES } from '../../utils/worldCreationScopes.js'
import DrawerPanel from '../../components/DrawerPanel.jsx'
import EntityForm from '../entities/EntityForm.jsx'
import './NotesPage.css'

const AUTOSAVE_DELAY_MS = 2500
const emptyArray = Object.freeze([])

const SESSION_NOTE_PLACEHOLDER = 'Use @ to tag entities mentioned in this session.'

const createDrawerFooterState = (mode = 'create') => ({
  mode,
  submitLabel: mode === 'edit' ? 'Save Changes' : 'Create Entity',
  submitDisabled: false,
  cancelDisabled: false,
  accessButtonVisible: false,
  accessButtonDisabled: false,
})

const normaliseSessionNote = (note) => {
  if (!note) {
    return {
      id: '',
      sessionDate: '',
      sessionTitle: 'Session note',
      content: '',
      mentions: emptyArray,
      createdAt: null,
      updatedAt: null,
      author: null,
      lastEditor: null,
    }
  }

  const sessionDate = note.sessionDate ?? note.session_date ?? ''
  const sessionTitle = note.sessionTitle ?? note.session_title ?? 'Session note'
  const content = typeof note.content === 'string' ? note.content : ''
  const mentions = Array.isArray(note.mentions)
    ? note.mentions
        .filter(Boolean)
        .map((mention) => {
          const label =
            mention?.entityName ??
            mention?.entity_name ??
            mention?.label ??
            mention?.name ??
            ''
          const entityName = cleanEntityName(label)
          return { ...mention, entityName }
        })
    : emptyArray

  return {
    id: note.id ?? '',
    sessionDate,
    sessionTitle,
    content,
    mentions,
    createdAt: note.createdAt ?? note.created_at ?? null,
    updatedAt: note.updatedAt ?? note.updated_at ?? null,
    author: note.author ?? null,
    lastEditor: note.lastEditor ?? null,
  }
}

const todayDateString = () => new Date().toISOString().slice(0, 10)

const formatDateDisplay = (value) => {
  if (!value) return 'Undated session'
  const isoCandidate = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00Z`
    : value
  const parsed = new Date(isoCandidate)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatTimestamp = (value) => {
  if (!value) return ''
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SessionNotesPage() {
  const { user } = useAuth()
  const { selectedCampaign, selectedCampaignId } = useCampaignContext()
  const [notesState, setNotesState] = useState({ items: emptyArray, loading: false, error: '' })
  const [selectedNoteId, setSelectedNoteId] = useState('')
  const [editorState, setEditorState] = useState(null)
  const [creating, setCreating] = useState(false)
  const [savingState, setSavingState] = useState({ status: 'idle', lastSaved: '', error: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const editorRef = useRef(null)
  const selectedNoteIdRef = useRef('')
  const lastSavedRef = useRef(null)
  const savingRef = useRef(false)
  const justCreatedNoteRef = useRef('')
  const [entityDrawerOpen, setEntityDrawerOpen] = useState(false)
  const [entityFormUiState, setEntityFormUiState] = useState(() =>
    createDrawerFooterState('create'),
  )
  const [entityFormView, setEntityFormView] = useState('details')
  const entityFormIdRef = useRef(`entity-form-${Math.random().toString(36).slice(2)}`)

  const resolvedWorldId = useMemo(() => {
    if (selectedCampaign?.world?.id) return selectedCampaign.world.id
    if (selectedCampaign?.world_id) return selectedCampaign.world_id
    return ''
  }, [selectedCampaign])

  const membershipRole = useMemo(() => {
    if (!selectedCampaign || !Array.isArray(selectedCampaign.members) || !user) {
      return null
    }

    const match = selectedCampaign.members.find((member) => member?.user_id === user.id)
    return match?.role ?? null
  }, [selectedCampaign, user])

  const canDeleteNotes = useMemo(() => {
    if (user?.role === 'system_admin') return true
    return membershipRole === 'dm'
  }, [membershipRole, user])

  const canShowCreateEntityButton = useMemo(() => {
    // Show if user is DM
    if (user?.role === 'system_admin' || membershipRole === 'dm') {
      return true
    }
    
    // Show if user is a player AND world allows all players to create entities
    if (membershipRole === 'player') {
      const entityCreationScope = selectedCampaign?.world?.entity_creation_scope ?? ''
      return entityCreationScope === ENTITY_CREATION_SCOPES.ALL_PLAYERS
    }
    
    return false
  }, [membershipRole, user, selectedCampaign])

  const loadNotes = useCallback(async () => {
    if (!selectedCampaignId) return
    setNotesState((prev) => ({ ...prev, loading: true, error: '' }))

    try {
      const response = await fetchCampaignSessionNotes(selectedCampaignId)
      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : []
      setNotesState({ items: list, loading: false, error: '' })
    } catch (error) {
      console.error('❌ Failed to load session notes', error)
      setNotesState({
        items: emptyArray,
        loading: false,
        error: error?.message || 'Failed to load session notes',
      })
    }
  }, [selectedCampaignId])

  useEffect(() => {
    if (!selectedCampaignId) {
      setNotesState({ items: emptyArray, loading: false, error: '' })
      setSelectedNoteId('')
      setEditorState(null)
      lastSavedRef.current = null
      return
    }

    loadNotes()
  }, [selectedCampaignId, loadNotes])

  useEffect(() => {
    editorRef.current = editorState
  }, [editorState])

  useEffect(() => {
    selectedNoteIdRef.current = selectedNoteId
  }, [selectedNoteId])

  const sortedNotes = useMemo(() => {
    if (!Array.isArray(notesState.items)) return emptyArray
    return [...notesState.items].sort((a, b) => {
      const dateA = (a?.session_date ?? a?.sessionDate ?? '') || ''
      const dateB = (b?.session_date ?? b?.sessionDate ?? '') || ''

      if (dateA && dateB && dateA !== dateB) {
        return dateB.localeCompare(dateA)
      }

      const updatedA = new Date(
        a?.updated_at ?? a?.updatedAt ?? a?.created_at ?? a?.createdAt ?? 0,
      ).getTime()
      const updatedB = new Date(
        b?.updated_at ?? b?.updatedAt ?? b?.created_at ?? b?.createdAt ?? 0,
      ).getTime()

      return updatedB - updatedA
    })
  }, [notesState.items])

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return sortedNotes

    return sortedNotes.filter((note) => {
      if (!note) return false
      const title = String(
        note?.session_title ?? note?.sessionTitle ?? 'Session note',
      ).toLowerCase()
      const content = String(note?.content ?? '').toLowerCase()
      const dateLabel = formatDateDisplay(note?.session_date ?? note?.sessionDate ?? '')
        .toString()
        .toLowerCase()

      return title.includes(query) || content.includes(query) || dateLabel.includes(query)
    })
  }, [searchQuery, sortedNotes])

  const selectedNote = useMemo(() => {
    if (!selectedNoteId) return null
    return sortedNotes.find((note) => note?.id === selectedNoteId) || null
  }, [sortedNotes, selectedNoteId])

  const editorDateLabel = useMemo(() => {
    if (!editorState?.sessionDate) return 'Undated session'
    return formatDateDisplay(editorState.sessionDate)
  }, [editorState?.sessionDate])

  const editorUpdatedLabel = useMemo(() => {
    if (!editorState?.updatedAt) return ''
    return formatTimestamp(editorState.updatedAt)
  }, [editorState?.updatedAt])

  const editorPreviewSegments = useMemo(() => {
    if (!editorState?.content) return emptyArray
    return buildNoteSegments(editorState.content, editorState.mentions)
  }, [editorState?.content, editorState?.mentions])

  useEffect(() => {
    const hasQuery = searchQuery.trim().length > 0
    const availableNotes = filteredNotes.length > 0 ? filteredNotes : sortedNotes

    if (!selectedNoteId && availableNotes.length > 0) {
      setSelectedNoteId(availableNotes[0].id)
      return
    }

    if (hasQuery && filteredNotes.length === 0) {
      if (selectedNoteId) {
        setSelectedNoteId('')
      }
      setEditorState(null)
      lastSavedRef.current = null
      return
    }

    if (selectedNoteId && filteredNotes.length > 0) {
      const visible = filteredNotes.some((note) => note?.id === selectedNoteId)
      if (!visible) {
        setSelectedNoteId(filteredNotes[0].id)
        return
      }
    }

    if (!selectedNoteId) {
      setEditorState(null)
      lastSavedRef.current = null
      return
    }

    if (!selectedNote) {
      setSelectedNoteId('')
      setEditorState(null)
      lastSavedRef.current = null
      return
    }

    const normalised = normaliseSessionNote(selectedNote)
    setEditorState(normalised)
    lastSavedRef.current = normalised
    setSavingState((prev) => ({ ...prev, status: 'idle', error: '' }))
  }, [filteredNotes, searchQuery, selectedNote, selectedNoteId, sortedNotes])

  useEffect(() => {
    if (!selectedNoteId) {
      setIsEditing(false)
      return
    }

    if (justCreatedNoteRef.current && justCreatedNoteRef.current === selectedNoteId) {
      setIsEditing(true)
      justCreatedNoteRef.current = ''
      return
    }

    setIsEditing(false)
  }, [selectedNoteId])

  useEffect(() => {
    setDeleteError('')
  }, [selectedNoteId])

  useEffect(() => {
    setSearchQuery('')
  }, [selectedCampaignId])

  const handleEditorChange = useCallback((event, nextValue) => {
    const value =
      typeof nextValue === 'string'
        ? nextValue
        : typeof event?.target?.value === 'string'
        ? event.target.value
        : ''
    setEditorState((previous) => (previous ? { ...previous, content: value } : previous))
  }, [])

  const handleMentionSearch = useCallback(
    async (query, callback) => {
      const trimmedQuery = query?.trim() ?? ''
      if (typeof callback !== 'function') return

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
                  entity?.name || entity?.displayName || entity?.entity?.name || 'Unnamed entity'
                const display = cleanEntityName(rawName) || 'Unnamed entity'
                return { id: entityId, display }
              })
              .filter(Boolean)
          : []
        callback(formatted)
      } catch (error) {
        console.error('❌ Failed to search entities for mentions', error)
        callback([])
      }
    },
    [resolvedWorldId],
  )

  const handleFieldChange = useCallback((key, value) => {
    setEditorState((previous) => (previous ? { ...previous, [key]: value } : previous))
  }, [])

  const hasUnsavedChanges = useMemo(() => {
    if (!editorState?.id) return false
    const current = {
      sessionTitle: (editorState.sessionTitle || '').trim(),
      sessionDate: editorState.sessionDate || '',
      content: editorState.content || '',
    }
    const savedSource = lastSavedRef.current || {}
    const saved = {
      sessionTitle: (savedSource.sessionTitle || '').trim(),
      sessionDate: savedSource.sessionDate || '',
      content: savedSource.content || '',
    }
    return JSON.stringify(current) !== JSON.stringify(saved)
  }, [editorState])

  const saveDraft = useCallback(async () => {
    const campaignId = selectedCampaignId
    const noteId = selectedNoteIdRef.current
    const payload = editorRef.current

    if (!campaignId || !noteId || !payload) return
    if (savingRef.current) return

    const current = {
      sessionTitle: payload.sessionTitle?.trim() || 'Session note',
      sessionDate: payload.sessionDate || todayDateString(),
      content: payload.content || '',
    }

    const savedSource = lastSavedRef.current || {}
    const saved = {
      sessionTitle: savedSource.sessionTitle?.trim() || 'Session note',
      sessionDate: savedSource.sessionDate || todayDateString(),
      content: savedSource.content || '',
    }

    if (JSON.stringify(current) === JSON.stringify(saved)) {
      return
    }

    try {
      savingRef.current = true
      setSavingState((prev) => ({ ...prev, status: 'saving', error: '' }))

      const response = await updateCampaignSessionNote(campaignId, noteId, current)
      const data = response?.data ?? response
      const normalised = normaliseSessionNote(data)
      lastSavedRef.current = normalised
      setEditorState(normalised)
      setNotesState((previous) => {
        const items = Array.isArray(previous.items) ? previous.items : emptyArray
        const nextItems = items.some((item) => item?.id === data?.id)
          ? items.map((item) => (item?.id === data?.id ? { ...item, ...data } : item))
          : [data, ...items]
        return { ...previous, items: nextItems }
      })
      setSavingState({ status: 'saved', lastSaved: new Date().toISOString(), error: '' })
    } catch (error) {
      console.error('❌ Failed to save session note', error)
      setSavingState((prev) => ({
        ...prev,
        status: 'error',
        error: error?.message || 'Failed to save session note',
      }))
    } finally {
      savingRef.current = false
    }
  }, [selectedCampaignId])

  useEffect(() => {
    if (!selectedCampaignId) return
    if (!editorState?.id) return
    if (!hasUnsavedChanges) return
    if (savingRef.current) return

    const timeout = setTimeout(() => {
      void saveDraft()
    }, AUTOSAVE_DELAY_MS)

    return () => clearTimeout(timeout)
  }, [editorState, hasUnsavedChanges, saveDraft, selectedCampaignId])

  const handleManualSave = useCallback(() => {
    void saveDraft()
  }, [saveDraft])

  const handleDeleteNote = useCallback(async () => {
    const campaignId = selectedCampaignId
    const noteId = selectedNoteIdRef.current

    if (!campaignId || !noteId) return

    setDeleting(true)
    setDeleteError('')

    try {
      await deleteCampaignSessionNote(campaignId, noteId)

      setNotesState((previous) => {
        const items = Array.isArray(previous.items) ? previous.items : emptyArray
        const nextItems = items.filter((item) => String(item?.id) !== String(noteId))
        return { ...previous, items: nextItems }
      })

      selectedNoteIdRef.current = ''
      setSelectedNoteId('')
      setEditorState(null)
      lastSavedRef.current = null
      setSavingState({ status: 'idle', lastSaved: '', error: '' })
    } catch (error) {
      console.error('❌ Failed to delete session note', error)
      setDeleteError(error?.message || 'Failed to delete session note')
    } finally {
      setDeleting(false)
    }
  }, [selectedCampaignId])

  const handleCreateNote = useCallback(async () => {
    if (!selectedCampaignId) return
    setCreating(true)
    setSavingState((prev) => ({ ...prev, error: '' }))

    try {
      const response = await createCampaignSessionNote(selectedCampaignId, {
        sessionTitle: `Session on ${formatDateDisplay(todayDateString())}`,
        sessionDate: todayDateString(),
      })
      const data = response?.data ?? response
      const normalised = normaliseSessionNote(data)

      setNotesState((previous) => {
        const items = Array.isArray(previous.items) ? previous.items : emptyArray
        const filtered = items.filter((note) => note?.id !== data?.id)
        return { ...previous, items: [data, ...filtered], error: '' }
      })

      setSearchQuery('')
      justCreatedNoteRef.current = data.id
      setSelectedNoteId(data.id)
      setEditorState(normalised)
      lastSavedRef.current = normalised
      setIsEditing(true)
      setSavingState({ status: 'idle', lastSaved: '', error: '' })
    } catch (error) {
      console.error('❌ Failed to create session note', error)
      setSavingState((prev) => ({
        ...prev,
        status: 'error',
        error: error?.message || 'Failed to create session note',
      }))
    } finally {
      setCreating(false)
    }
  }, [selectedCampaignId])

  const openEntityDrawer = useCallback(() => {
    if (!resolvedWorldId) return
    setEntityFormUiState(createDrawerFooterState('create'))
    setEntityFormView('details')
    setEntityDrawerOpen(true)
  }, [resolvedWorldId])

  const closeEntityDrawer = useCallback(() => {
    setEntityDrawerOpen(false)
    setEntityFormUiState(createDrawerFooterState('create'))
    setEntityFormView('details')
  }, [])

  const handleEntityFormStateChange = useCallback((nextState) => {
    if (!nextState) return
    setEntityFormUiState((prev) => ({
      ...prev,
      ...nextState,
    }))
  }, [])

  const handleEntityFormSaved = useCallback(
    async (mode) => {
      closeEntityDrawer()
      // Optionally reload notes or show a success message
    },
    [closeEntityDrawer],
  )

  const campaignName = selectedCampaign?.name ?? ''
  const notesCount = sortedNotes.length
  const autosaveLabel = useMemo(() => {
    if (savingState.status === 'saving') return 'Saving…'
    if (savingState.status === 'error') return 'Changes not saved'
    if (savingState.status === 'saved' && savingState.lastSaved) {
      const parsed = new Date(savingState.lastSaved)
      if (!Number.isNaN(parsed.getTime())) {
        return `Saved ${parsed.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })}`
      }
      return 'Saved'
    }
    if (hasUnsavedChanges) return 'Unsaved changes'
    return ''
  }, [hasUnsavedChanges, savingState])

  if (!selectedCampaignId) {
    return (
      <div className="notes-page">
        <div className="notes-header">
          <div className="notes-title">
            <h1>Session Notes</h1>
            <p>Select a campaign from the header to start collecting your notes.</p>
          </div>
        </div>
        <div className="notes-helper">
          <NotebookPen size={28} />
          <strong>No campaign selected</strong>
          <span>Pick a campaign to unlock collaborative session notes.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="notes-page">
      <div className="notes-header">
        <div className="notes-title">
          <h1>Session Notes</h1>
          <p>
            Chronicle every game night for the <strong>{campaignName}</strong> campaign,
            @mention key entities, and keep everyone aligned with auto-saving notes.
          </p>
        </div>
      </div>

      <div className="session-notes-meta">
        <span>
          <Users size={16} /> Players and DMs can add or update notes.{' '}
          <CalendarDays size={16} /> {notesCount}{' '}
          {notesCount === 1 ? 'session' : 'sessions'} tracked.
        </span>
        {autosaveLabel ? (
          <span className={`session-notes-autosave status-${savingState.status}`}>
            {savingState.status === 'saving' ? (
              <Loader2 size={14} className="spinner" />
            ) : savingState.status === 'saved' ? (
              <Check size={14} />
            ) : savingState.status === 'error' ? (
              <AlertCircle size={14} />
            ) : hasUnsavedChanges ? (
              <Save size={14} />
            ) : null}
            <span>{autosaveLabel}</span>
          </span>
        ) : null}
      </div>

      {notesState.error && (
        <div className="notes-error" role="alert">
          <strong>
            <AlertCircle size={18} /> Unable to load session notes
          </strong>
          <span>{notesState.error}</span>
        </div>
      )}

      <div className="session-notes-layout">
        <aside className="session-notes-sidebar">
          <label className="session-notes-search" htmlFor="session-notes-search-input">
            <Search size={16} />
            <input
              id="session-notes-search-input"
              type="search"
              placeholder="Search session notes"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <button
            type="button"
            className="session-notes-item-button session-notes-new-button"
            onClick={handleCreateNote}
            disabled={creating || notesState.loading}
          >
            {creating ? <Loader2 size={16} className="spinner" /> : <Plus size={16} />}
            <span>{creating ? 'Creating…' : 'New Session'}</span>
          </button>

          <div className="session-notes-list-container">
            {notesState.loading ? (
              <div className="session-notes-loading">
                <Loader2 size={18} className="spinner" />
                <span>Loading session notes…</span>
              </div>
            ) : filteredNotes.length === 0 ? (
              sortedNotes.length === 0 ? (
                <div className="notes-empty">
                  <Sparkles size={20} />
                  <strong>No session notes yet</strong>
                  <span>Create the first note to kick off your campaign journal.</span>
                </div>
              ) : (
                <div className="notes-empty">
                  <Search size={18} />
                  <strong>No matches</strong>
                  <span>No session notes include “{searchQuery.trim()}”.</span>
                </div>
              )
            ) : (
              <ul className="session-notes-list" role="list">
                {filteredNotes.map((note) => {
                  const noteId = note?.id
                  const isSelected = noteId === selectedNoteId
                  const title = note?.session_title ?? note?.sessionTitle ?? 'Session note'
                  const dateLabel = formatDateDisplay(note?.session_date ?? note?.sessionDate)

                  return (
                    <li
                      key={noteId}
                      className={`session-notes-item ${isSelected ? 'active' : ''}`}
                    >
                      <button
                        type="button"
                        className="session-notes-item-button"
                        onClick={() => setSelectedNoteId(noteId)}
                      >
                        <span className="session-note-card-title">{title}</span>
                        <span className="session-note-card-date">{dateLabel}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="session-notes-panel">
          {!editorState?.id ? (
            <div className="notes-helper">
              <NotebookPen size={28} />
              <strong>Select a session to get started</strong>
              <span>Create a new note or choose one from the list to see its details.</span>
            </div>
          ) : (
            <div className="session-note-shell">
              <header className="session-note-header">
                <div className="session-note-heading">
                  <h2>{editorState.sessionTitle || 'Session note'}</h2>
                </div>
                <div className="session-note-toolbar">
                  {canDeleteNotes ? (
                    <button
                      type="button"
                      className="session-note-action danger"
                      onClick={handleDeleteNote}
                      disabled={deleting}
                    >
                      {deleting ? <Loader2 size={16} className="spinner" /> : <Trash2 size={16} />}
                      <span>{deleting ? 'Deleting…' : 'Delete'}</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="session-note-action"
                    onClick={() => setIsEditing((prev) => !prev)}
                  >
                    {isEditing ? <Eye size={16} /> : <Edit3 size={16} />}
                    <span>{isEditing ? 'View note' : 'Edit note'}</span>
                  </button>
                  {isEditing && canShowCreateEntityButton ? (
                    <button
                      type="button"
                      className="session-note-action primary"
                      onClick={openEntityDrawer}
                    >
                      <Plus size={16} />
                      <span>Create Entity</span>
                    </button>
                  ) : null}
                </div>
              </header>

              {deleteError ? (
                <div className="session-note-error" role="alert">
                  <AlertCircle size={16} />
                  <span>{deleteError}</span>
                </div>
              ) : null}

              {isEditing ? (
                <div className="session-note-form">
                  <div className="session-note-fields session-note-fields-row">
                    <div className="session-note-field">
                      <label htmlFor="session-note-title">Title</label>
                      <input
                        id="session-note-title"
                        type="text"
                        value={editorState.sessionTitle || ''}
                        onChange={(event) => handleFieldChange('sessionTitle', event.target.value)}
                        placeholder="The mystery of the Violet Spire"
                      />
                    </div>
                    <div className="session-note-field">
                      <label htmlFor="session-note-date">Session date</label>
                      <input
                        id="session-note-date"
                        type="date"
                        value={editorState.sessionDate || ''}
                        onChange={(event) => handleFieldChange('sessionDate', event.target.value)}
                        max="9999-12-31"
                      />
                    </div>
                  </div>

                  <div className="session-note-fields">
                    <label htmlFor="session-note-content">Notes</label>
                    <div className="session-note-editor-field">
                      <MentionsInputWrapper
                        value={editorState.content || ''}
                        onChange={handleEditorChange}
                        markup="@[__display__](__id__)"
                        placeholder={SESSION_NOTE_PLACEHOLDER}
                        className="session-note-mentions"
                        inputProps={{
                          id: 'session-note-content',
                          className: 'session-note-textarea',
                          'aria-label': 'Session note content',
                          rows: 14,
                        }}
                      >
                        <Mention
                          trigger="@"
                          markup="@[__display__](__id__)"
                          displayTransform={(id, display) => `@${display}`}
                          data={handleMentionSearch}
                          appendSpaceOnAdd
                        />
                      </MentionsInputWrapper>
                    </div>

                    {editorPreviewSegments.length > 0 ? (
                      <div className="session-note-preview" aria-live="polite">
                        <h3>Preview</h3>
                        <div className="session-note-preview-content">
                          <TaggedNoteContent
                            segments={editorPreviewSegments}
                            noteId={`${editorState?.id || 'note'}-preview`}
                            textClassName="session-note-text"
                            mentionClassName="session-note-mention"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="session-note-actions">
                    <button
                      type="button"
                      className="session-note-action primary"
                      onClick={handleManualSave}
                      disabled={savingState.status === 'saving' || !hasUnsavedChanges}
                    >
                      {savingState.status === 'saving' ? (
                        <Loader2 size={16} className="spinner" />
                      ) : (
                        <Save size={16} />
                      )}
                      <span>{savingState.status === 'saving' ? 'Saving…' : 'Save now'}</span>
                    </button>
                    {editorState.author?.username ? (
                      <span className="session-note-meta">
                        Created by {editorState.author.username}
                        {editorState.lastEditor?.username &&
                        editorState.lastEditor.username !== editorState.author.username
                          ? ` · Last updated by ${editorState.lastEditor.username}`
                          : ''}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <article className="session-note-view" aria-live="polite">
                  <div className="session-note-view-meta">
                    <span>
                      <CalendarDays size={16} /> {editorDateLabel}
                    </span>
                    {editorUpdatedLabel ? <span>Updated {editorUpdatedLabel}</span> : null}
                  </div>
                  <div className="session-note-view-body">
                    <TaggedNoteContent
                      segments={editorPreviewSegments}
                      noteId={`${editorState?.id || 'note'}-view`}
                      textClassName="session-note-text"
                      mentionClassName="session-note-mention"
                      renderEmpty={() => (
                        <p className="session-note-view-empty">No notes captured yet.</p>
                      )}
                    />
                  </div>
                  {editorState.author?.username ? (
                    <div className="session-note-view-meta session-note-view-authors">
                      <span>Created by {editorState.author.username}</span>
                      {editorState.lastEditor?.username &&
                      editorState.lastEditor.username !== editorState.author.username ? (
                        <span>Last updated by {editorState.lastEditor.username}</span>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              )}
            </div>
          )}
        </section>
      </div>

      <DrawerPanel
        isOpen={entityDrawerOpen}
        onClose={closeEntityDrawer}
        title="Create Entity"
        width={420}
        footerActions={
          <>
            <button
              type="button"
              className="btn cancel"
              onClick={closeEntityDrawer}
              disabled={entityFormUiState.cancelDisabled}
            >
              Cancel
            </button>
            {entityFormUiState.accessButtonVisible && (
              <button
                type="button"
                className="btn secondary"
                onClick={() =>
                  setEntityFormView((prev) => (prev === 'access' ? 'details' : 'access'))
                }
                disabled={entityFormUiState.accessButtonDisabled}
              >
                {entityFormView === 'access' ? 'Details' : 'Access'}
              </button>
            )}
            <button
              type="submit"
              className="btn submit"
              form={entityFormIdRef.current}
              disabled={entityFormUiState.submitDisabled}
            >
              {entityFormUiState.submitLabel}
            </button>
          </>
        }
      >
        <EntityForm
          worldId={resolvedWorldId}
          entityId={null}
          onCancel={closeEntityDrawer}
          onSaved={handleEntityFormSaved}
          formId={entityFormIdRef.current}
          onStateChange={handleEntityFormStateChange}
          hideActions
          activeView={entityFormView}
          onViewChange={setEntityFormView}
          defaultCampaignId={selectedCampaignId || ''}
        />
      </DrawerPanel>
    </div>
  )
}
