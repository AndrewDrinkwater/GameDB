import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
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
import { useCampaignContext } from '../../context/CampaignContext.jsx'
import {
  createCampaignSessionNote,
  deleteCampaignSessionNote,
  fetchCampaignSessionNotes,
  updateCampaignSessionNote,
} from '../../api/campaigns.js'
import { searchEntities } from '../../api/entities.js'
import EntityInfoPreview from '../../components/entities/EntityInfoPreview.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getTextareaCaretCoordinates } from '../../utils/textareaCaret.js'
import './NotesPage.css'

const AUTOSAVE_DELAY_MS = 2500
const emptyArray = Object.freeze([])
const uuidSuffixPattern = /\s*\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)$/i
const uuidPattern = /\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/gi

const cleanEntityName = (value) => {
  if (!value) return ''
  let trimmed = String(value).trim()
  // First, try to remove UUID at the end (most common case)
  trimmed = trimmed.replace(uuidSuffixPattern, '').trim()
  // Then, remove any remaining UUID patterns anywhere in the string
  trimmed = trimmed.replace(uuidPattern, '').trim()
  return trimmed
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const formatTextForOverlay = (value) =>
  escapeHtml(value)
    .replace(/ {2}/g, ' &nbsp;')
    .replace(/\n/g, '<br />')

const buildEditorOverlayMarkup = (content = '', placeholder = '') => {
  const text = typeof content === 'string' ? content : ''
  if (!text) {
    return placeholder
      ? `<span class="session-note-overlay-placeholder">${escapeHtml(placeholder)}</span>`
      : ''
  }

  const segments = []
  const regex = /@\[(.+?)]\(([^)]+)\)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push(formatTextForOverlay(text.slice(lastIndex, match.index)))
    }

    const rawName = match[1]
    const entityName = cleanEntityName(rawName) || rawName
    const entityId = String(match[2] ?? '')
    segments.push(
      `<span class="session-note-overlay-mention">@[${escapeHtml(entityName)}]</span>`,
    )
    if (entityId) {
      // Include the UUID text in the placeholder so it takes up the exact same space
      // This ensures it properly covers the UUID in the textarea
      segments.push(
        `<span class="session-note-overlay-id-placeholder" aria-hidden="true">(${escapeHtml(
          entityId,
        )})</span>`,
      )
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    segments.push(formatTextForOverlay(text.slice(lastIndex)))
  }

  return segments.join('')
}

const mentionBoundaryRegex = /[\s()[\]{}.,;:!?/\\"'`~]/
const SESSION_NOTE_PLACEHOLDER = 'Use @ to tag entities mentioned in this session.'
const MENTION_DROPDOWN_MAX_WIDTH = 340

const findActiveMention = (value, caret) => {
  if (typeof value !== 'string' || typeof caret !== 'number') {
    return null
  }

  const prefix = value.slice(0, caret)
  const atIndex = prefix.lastIndexOf('@')
  if (atIndex === -1) return null
  if (prefix.slice(atIndex, atIndex + 2) === '@[') return null

  if (atIndex > 0) {
    const charBefore = prefix[atIndex - 1]
    if (charBefore && !mentionBoundaryRegex.test(charBefore)) {
      return null
    }
  }

  const query = prefix.slice(atIndex + 1)
  if (query.includes('\n') || query.includes('\r')) {
    return null
  }

  return { start: atIndex, query }
}

const buildNoteSegments = (content = '', mentionList = []) => {
  const text = typeof content === 'string' ? content : ''
  if (!text) return []

  const mentions = Array.isArray(mentionList) ? mentionList : []
  const mentionLookup = new Map()
  mentions.forEach((mention) => {
    if (!mention) return
    const key =
      mention.entityId ?? mention.entity_id ?? mention.id ?? mention.entityID ?? null
    if (!key) return
    const id = String(key)
    if (mentionLookup.has(id)) return
    const label =
      mention.entityName ?? mention.entity_name ?? mention.label ?? mention.name
    const entityName = label ? cleanEntityName(label) : ''
    mentionLookup.set(id, {
      entityId: id,
      entityName,
    })
  })

  const segments = []
  const regex = /@\[(.+?)]\(([^)]+)\)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }

    const entityId = String(match[2])
    const rawFallback = match[1]
    const fallbackName = cleanEntityName(rawFallback) || String(rawFallback ?? '')
    const mention = mentionLookup.get(entityId) || {
      entityId,
      entityName: fallbackName,
    }

    segments.push({ type: 'mention', ...mention })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return segments
}

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

const getEntityTypeName = (entity) =>
  entity?.entity_type?.name ||
  entity?.entityType?.name ||
  entity?.typeName ||
  entity?.entity?.entity_type?.name ||
  entity?.entity?.entityType?.name ||
  ''

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
  const textareaRef = useRef(null)
  const editorRef = useRef(null)
  const selectedNoteIdRef = useRef('')
  const lastSavedRef = useRef(null)
  const savingRef = useRef(false)
  const justCreatedNoteRef = useRef('')

  const [mentionState, setMentionState] = useState({
    active: false,
    query: '',
    start: 0,
    end: 0,
  })
  const [mentionResults, setMentionResults] = useState(emptyArray)
  const [mentionLoading, setMentionLoading] = useState(false)
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0)
  const mentionListRef = useRef(null)
  const overlayContentRef = useRef(null)
  const [mentionDropdownPosition, setMentionDropdownPosition] = useState(null)

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

  const editorOverlayMarkup = useMemo(() => {
    if (!editorState?.content) {
      return `<span class="session-note-overlay-placeholder">${escapeHtml(
        SESSION_NOTE_PLACEHOLDER,
      )}</span>`
    }
    return buildEditorOverlayMarkup(editorState.content, SESSION_NOTE_PLACEHOLDER)
  }, [editorState?.content])

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

  const resetMentionState = useCallback(() => {
    setMentionState({ active: false, query: '', start: 0, end: 0 })
    setMentionResults(emptyArray)
    setMentionLoading(false)
    setMentionSelectedIndex(0)
    setMentionDropdownPosition(null)
  }, [])

  const updateMentionTracking = useCallback(
    (value, caret) => {
      if (typeof caret !== 'number') return
      const trigger = findActiveMention(value, caret)
      if (trigger) {
        if (
          mentionState.query !== trigger.query ||
          mentionState.start !== trigger.start
        ) {
          setMentionSelectedIndex(0)
        }

        setMentionState({
          active: true,
          query: trigger.query,
          start: trigger.start,
          end: caret,
        })
      } else if (mentionState.active) {
        resetMentionState()
      }
    },
    [mentionState.active, mentionState.query, mentionState.start, resetMentionState],
  )

  const syncOverlayScroll = useCallback(() => {
    const textarea = textareaRef.current
    const overlayContent = overlayContentRef.current
    if (!textarea || !overlayContent) return
    overlayContent.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`
  }, [])

  const updateMentionDropdownPosition = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    const coordinates = getTextareaCaretCoordinates(textarea)
    if (!coordinates) return
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0
    const maxLeft = Math.max(16, viewportWidth - MENTION_DROPDOWN_MAX_WIDTH - 16)
    const safeLeft = Math.min(Math.max(16, coordinates.left), maxLeft)
    const safeTop = Math.max(16, coordinates.top + coordinates.lineHeight + 8)
    setMentionDropdownPosition({ top: safeTop, left: safeLeft })
  }, [])

  useEffect(() => {
    if (!mentionState.active) {
      setMentionLoading(false)
      setMentionResults(emptyArray)
      return
    }

    const trimmedQuery = mentionState.query.trim()
    if (!resolvedWorldId || trimmedQuery.length === 0) {
      setMentionLoading(false)
      setMentionResults(emptyArray)
      return
    }

    let cancelled = false
    setMentionLoading(true)

    const timeout = setTimeout(async () => {
      try {
        const response = await searchEntities({
          worldId: resolvedWorldId,
          query: trimmedQuery,
          limit: 8,
        })
        if (cancelled) return
        const data = Array.isArray(response?.data) ? response.data : response
        setMentionResults(Array.isArray(data) ? data : emptyArray)
      } catch (error) {
        if (!cancelled) {
          console.error('❌ Failed to search entities for mentions', error)
          setMentionResults(emptyArray)
        }
      } finally {
        if (!cancelled) {
          setMentionLoading(false)
        }
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [mentionState.active, mentionState.query, resolvedWorldId])

  useEffect(() => {
    if (!mentionState.active) {
      setMentionDropdownPosition(null)
      return
    }
    updateMentionDropdownPosition()
  }, [mentionState.active, mentionState.query, mentionState.start, updateMentionDropdownPosition])

  useEffect(() => {
    if (!mentionState.active) return
    const handleReposition = () => updateMentionDropdownPosition()
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)
    return () => {
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
  }, [mentionState.active, updateMentionDropdownPosition])

  useEffect(() => {
    syncOverlayScroll()
  }, [editorState?.content, syncOverlayScroll])

  useEffect(() => {
    if (!mentionState.active) return
    if (mentionResults.length === 0) {
      setMentionSelectedIndex(0)
      return
    }

    if (mentionSelectedIndex >= mentionResults.length) {
      setMentionSelectedIndex(mentionResults.length - 1)
    }
  }, [mentionResults, mentionSelectedIndex, mentionState.active])

  useEffect(() => {
    if (!mentionState.active) return
    const listElement = mentionListRef.current
    if (!listElement) return

    const active = listElement.querySelector(
      `[data-index="${mentionSelectedIndex}"]`,
    )

    if (active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({ block: 'nearest' })
    }
  }, [mentionSelectedIndex, mentionState.active])

  const handleInsertMention = useCallback((entityOption) => {
    if (!entityOption) return
    const rawName =
      entityOption?.name ||
      entityOption?.displayName ||
      entityOption?.entity?.name ||
      'Entity'
    const entityName = cleanEntityName(rawName) || 'Entity'
    const entityId =
      entityOption?.id ?? entityOption?.entity?.id ?? entityOption?.entityId
    if (!entityId) return

    const token = `@[${entityName}](${entityId})`

    setEditorState((previous) => {
      if (!previous) return previous

      const textarea = textareaRef.current
      if (!textarea) {
        const nextContent = previous.content
          ? `${previous.content} ${token}`.trim()
          : token
        const nextMentions = Array.isArray(previous.mentions)
          ? [...previous.mentions, { entityId, entityName }]
          : [{ entityId, entityName }]

        return { ...previous, content: nextContent, mentions: nextMentions }
      }

      const { selectionStart, selectionEnd, value } = textarea
      const prefix = value.slice(0, selectionStart)
      const suffix = value.slice(selectionEnd)
      const needsSpace = prefix && !prefix.endsWith(' ')
      const insertion = needsSpace ? ` ${token}` : token
      const nextValue = `${prefix}${insertion}${suffix}`

      requestAnimationFrame(() => {
        const caret = selectionStart + insertion.length
        textarea.selectionStart = caret
        textarea.selectionEnd = caret
        textarea.focus()
      })

      const nextMentions = Array.isArray(previous.mentions)
        ? [...previous.mentions, { entityId, entityName }]
        : [{ entityId, entityName }]

      return { ...previous, content: nextValue, mentions: nextMentions }
    })
  }, [])

  const handleMentionSelect = useCallback(
    (entityOption) => {
      if (!entityOption) return
      const textarea = textareaRef.current
      if (textarea) {
        const { start, end } = mentionState
        textarea.focus()
        textarea.setSelectionRange(start, end)
      }

      handleInsertMention(entityOption)
      resetMentionState()
    },
    [handleInsertMention, mentionState, resetMentionState],
  )

  const handleEditorChange = useCallback(
    (event) => {
      const { value, selectionStart } = event.target
      setEditorState((previous) =>
        previous ? { ...previous, content: value } : previous,
      )
      updateMentionTracking(value, selectionStart)
    },
    [updateMentionTracking],
  )

  const handleTextareaSelect = useCallback(
    (event) => {
      updateMentionTracking(event.target.value, event.target.selectionStart)
      if (mentionState.active) {
        requestAnimationFrame(() => {
          updateMentionDropdownPosition()
        })
      }
    },
    [mentionState.active, updateMentionTracking, updateMentionDropdownPosition],
  )

  const handleTextareaScroll = useCallback(() => {
    syncOverlayScroll()
    if (mentionState.active) {
      updateMentionDropdownPosition()
    }
  }, [mentionState.active, syncOverlayScroll, updateMentionDropdownPosition])

  const handleTextareaKeyDown = useCallback(
    (event) => {
      if (!mentionState.active) return

      if (event.key === 'Escape') {
        resetMentionState()
        return
      }

      if (event.key === 'ArrowDown') {
        if (mentionResults.length === 0) return
        event.preventDefault()
        setMentionSelectedIndex((prev) => (prev + 1) % mentionResults.length)
        return
      }

      if (event.key === 'ArrowUp') {
        if (mentionResults.length === 0) return
        event.preventDefault()
        setMentionSelectedIndex((prev) =>
          prev <= 0 ? mentionResults.length - 1 : prev - 1,
        )
        return
      }

      if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
        const choice = mentionResults[mentionSelectedIndex]
        if (!choice) return
        event.preventDefault()
        handleMentionSelect(choice)
      }
    },
    [
      handleMentionSelect,
      mentionResults,
      mentionSelectedIndex,
      mentionState.active,
      resetMentionState,
    ],
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
            <span>{creating ? 'Creating…' : '+ New Session'}</span>
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
                  <span>{editorDateLabel}</span>
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
                  <div className="session-note-fields">
                    <div className="session-note-summary">
                      <div className="session-note-summary-primary">
                        <span className="session-note-summary-title">
                          {editorState.sessionTitle || 'Session note'}
                        </span>
                        <span className="session-note-summary-date">{editorDateLabel}</span>
                      </div>
                      {editorUpdatedLabel ? (
                        <span className="session-note-summary-updated">
                          Updated {editorUpdatedLabel}
                        </span>
                      ) : null}
                    </div>
                    <label htmlFor="session-note-date">Session date</label>
                    <input
                      id="session-note-date"
                      type="date"
                      value={editorState.sessionDate || ''}
                      onChange={(event) => handleFieldChange('sessionDate', event.target.value)}
                      max="9999-12-31"
                    />
                  </div>

                  <div className="session-note-fields">
                    <label htmlFor="session-note-title">Title</label>
                    <input
                      id="session-note-title"
                      type="text"
                      value={editorState.sessionTitle || ''}
                      onChange={(event) => handleFieldChange('sessionTitle', event.target.value)}
                      placeholder="The mystery of the Violet Spire"
                    />
                  </div>

                  <div className="session-note-fields">
                    <label htmlFor="session-note-content">Notes</label>
                    <div className="session-note-editor-field">
                      <div className="session-note-content-overlay" aria-hidden="true">
                        <div
                          className="session-note-content-overlay-inner"
                          ref={overlayContentRef}
                          dangerouslySetInnerHTML={{ __html: editorOverlayMarkup }}
                        />
                      </div>
                      <textarea
                        id="session-note-content"
                        ref={textareaRef}
                        className="session-note-textarea"
                        value={editorState.content || ''}
                        onChange={handleEditorChange}
                        onKeyDown={handleTextareaKeyDown}
                        onSelect={handleTextareaSelect}
                        onScroll={handleTextareaScroll}
                        rows={14}
                        placeholder={SESSION_NOTE_PLACEHOLDER}
                      />
                    </div>

                    {mentionState.active && mentionDropdownPosition ? (
                      <div
                        className="session-note-mention-suggestions"
                        role="listbox"
                        aria-label="Entity mention suggestions"
                        onMouseDown={(event) => event.preventDefault()}
                        style={{
                          top: `${mentionDropdownPosition.top}px`,
                          left: `${mentionDropdownPosition.left}px`,
                        }}
                      >
                        {!resolvedWorldId ? (
                          <div className="session-note-mention-message">
                            Select a campaign world to @mention entities.
                          </div>
                        ) : mentionState.query.trim().length === 0 ? (
                          <div className="session-note-mention-message">
                            Keep typing after <strong>@</strong> to search for entities.
                          </div>
                        ) : mentionLoading ? (
                          <div className="session-note-mention-message">Searching…</div>
                        ) : mentionResults.length > 0 ? (
                          <ul className="session-note-mention-list" ref={mentionListRef}>
                            {mentionResults.map((result, index) => {
                              const rawName =
                                result?.name ||
                                result?.displayName ||
                                result?.entity?.name ||
                                'Unnamed entity'
                              const name = cleanEntityName(rawName) || 'Unnamed entity'
                              const typeName = getEntityTypeName(result)
                              const key =
                                result?.id ?? result?.entity?.id ?? `${name}-${String(index)}`
                              const className = [
                                'session-note-mention-suggestion',
                                mentionSelectedIndex === index ? 'active' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')

                              return (
                                <li
                                  key={String(key)}
                                  role="option"
                                  aria-selected={mentionSelectedIndex === index}
                                  className={className}
                                  data-index={index}
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => handleMentionSelect(result)}
                                >
                                  <span className="session-note-mention-name">{name}</span>
                                  {typeName ? (
                                    <span className="session-note-mention-type">{typeName}</span>
                                  ) : null}
                                </li>
                              )
                            })}
                          </ul>
                        ) : (
                          <div className="session-note-mention-message">
                            No entities found for “{mentionState.query.trim()}”.
                          </div>
                        )}
                      </div>
                    ) : null}

                    {editorPreviewSegments.length > 0 ? (
                      <div className="session-note-preview" aria-live="polite">
                        <h3>Preview</h3>
                        <div className="session-note-preview-content">
                          {editorPreviewSegments.map((segment, index) => {
                            if (segment.type === 'mention' && segment.entityId) {
                              const label = segment.entityName || 'entity'
                              return (
                                <span
                                  key={`${editorState?.id || 'note'}-preview-mention-${index}`}
                                  className="session-note-mention"
                                >
                                  @{label}
                                  <EntityInfoPreview
                                    entityId={segment.entityId}
                                    entityName={label}
                                  />
                                </span>
                              )
                            }

                            return (
                              <span
                                key={`${editorState?.id || 'note'}-preview-text-${index}`}
                                className="session-note-text"
                              >
                                {segment.text}
                              </span>
                            )
                          })}
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
                    {editorPreviewSegments.length > 0 ? (
                      editorPreviewSegments.map((segment, index) => {
                        if (segment.type === 'mention' && segment.entityId) {
                          const label = segment.entityName || 'entity'
                          return (
                            <span
                              key={`${editorState?.id || 'note'}-view-mention-${index}`}
                              className="session-note-mention"
                            >
                              @{label}
                              <EntityInfoPreview
                                entityId={segment.entityId}
                                entityName={label}
                              />
                            </span>
                          )
                        }

                        return (
                          <span
                            key={`${editorState?.id || 'note'}-view-text-${index}`}
                            className="session-note-text"
                          >
                            {segment.text}
                          </span>
                        )
                      })
                    ) : (
                      <p className="session-note-view-empty">No notes captured yet.</p>
                    )}
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
    </div>
  )
}
