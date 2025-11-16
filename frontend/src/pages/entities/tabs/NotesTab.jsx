import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Loader2, Plus } from 'lucide-react'
import PropTypes from '../../../utils/propTypes.js'
import EntityInfoPreview from '../../../components/entities/EntityInfoPreview.jsx'
import { fetchCharacters } from '../../../api/characters.js'
import DrawerPanel from '../../../components/DrawerPanel.jsx'
import {
  fetchEntityMentionNotes,
  fetchEntityMentionSessionNotes,
  searchEntities,
} from '../../../api/entities.js'
import { getTextareaCaretCoordinates } from '../../../utils/textareaCaret.js'
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

const uuidSuffixPattern = /\s*\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)$/i

const cleanEntityName = (value) => {
  if (!value) return ''
  const trimmed = String(value).trim()
  return trimmed.replace(uuidSuffixPattern, '').trim()
}

const buildSegments = (content = '', mentionList = []) => {
  const text = typeof content === 'string' ? content : ''
  if (!text) {
    return text ? [{ type: 'text', text }] : []
  }

  const mentions = Array.isArray(mentionList) ? mentionList : []
  const mentionLookup = new Map()
  mentions.forEach((mention) => {
    if (!mention) return
    const key =
      mention.entityId ?? mention.entity_id ?? mention.id ?? mention.entityID ?? null
    if (!key) return
    const id = String(key)
    if (!mentionLookup.has(id)) {
      const rawLabel =
        mention.entityName ?? mention.entity_name ?? mention.label ?? mention.name
      const entityName = rawLabel ? cleanEntityName(rawLabel) : ''
      mentionLookup.set(id, {
        entityId: id,
        entityName,
      })
    }
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
    const fallbackName = cleanEntityName(match[1]) || String(match[1] ?? '')
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

  return segments.length > 0 ? segments : [{ type: 'text', text }]
}

const formatTimestamp = (value) => {
  if (!value) return ''
  try {
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
  } catch (err) {
    console.warn('Unable to format timestamp', err)
    return ''
  }
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

const mentionBoundaryRegex = /[\s()[\]{}.,;:!?/\\"'`~]/
const ENTITY_NOTE_PLACEHOLDER = 'What do you want to remember?'
const ENTITY_MENTION_DROPDOWN_MAX_WIDTH = 320

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const formatTextForOverlay = (value) =>
  escapeHtml(value)
    .replace(/ {2}/g, ' &nbsp;')
    .replace(/\n/g, '<br />')

const buildNoteOverlayMarkup = (content = '', placeholder = '') => {
  const text = typeof content === 'string' ? content : ''
  if (!text) {
    return placeholder
      ? `<span class="entity-note-overlay-placeholder">${escapeHtml(placeholder)}</span>`
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
    const name = cleanEntityName(rawName) || rawName
    const entityId = String(match[2] ?? '')
    segments.push(
      `<span class="entity-note-overlay-mention">@[${escapeHtml(name)}]</span>`,
    )
    if (entityId) {
      segments.push(
        `<span class="entity-note-overlay-id-placeholder" aria-hidden="true">(${escapeHtml(
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

const findActiveMention = (value, caret) => {
  if (typeof value !== 'string' || typeof caret !== 'number') {
    return null
  }

  const prefix = value.slice(0, caret)
  const atIndex = prefix.lastIndexOf('@')
  if (atIndex === -1) {
    return null
  }

  if (prefix.slice(atIndex, atIndex + 2) === '@[') {
    return null
  }

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

  return {
    start: atIndex,
    query,
  }
}

const getEntityTypeName = (entity) =>
  entity?.entity_type?.name ||
  entity?.entityType?.name ||
  entity?.typeName ||
  entity?.entity?.entity_type?.name ||
  entity?.entity?.entityType?.name ||
  ''

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
}) {
  const [noteContent, setNoteContent] = useState('')
  const [shareType, setShareType] = useState('private')
  const [characterId, setCharacterId] = useState('')
  const [characters, setCharacters] = useState(emptyArray)
  const [charactersLoading, setCharactersLoading] = useState(false)
  const [charactersError, setCharactersError] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const textareaRef = useRef(null)
  const overlayContentRef = useRef(null)
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
  const [mentionDropdownPosition, setMentionDropdownPosition] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedAuthor, setSelectedAuthor] = useState('all')
  const [activeSubTab, setActiveSubTab] = useState('notes')
  const [mentionSource, setMentionSource] = useState('entity')
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

  const noteOverlayMarkup = useMemo(
    () => buildNoteOverlayMarkup(noteContent, ENTITY_NOTE_PLACEHOLDER),
    [noteContent],
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

  const resetMentionState = useCallback(() => {
    setMentionState({ active: false, query: '', start: 0, end: 0 })
    setMentionResults(emptyArray)
    setMentionLoading(false)
    setMentionSelectedIndex(0)
    setMentionDropdownPosition(null)
  }, [])

  const updateMentionTracking = useCallback(
    (value, caret) => {
      if (typeof caret !== 'number') {
        return
      }

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
    const maxLeft = Math.max(16, viewportWidth - ENTITY_MENTION_DROPDOWN_MAX_WIDTH - 16)
    const safeLeft = Math.min(Math.max(16, coordinates.left), maxLeft)
    const safeTop = Math.max(16, coordinates.top + coordinates.lineHeight + 8)
    setMentionDropdownPosition({ top: safeTop, left: safeLeft })
  }, [])

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

  const handleInsertMention = useCallback((entityOption) => {
    if (!entityOption || !entityOption.id) return

    const rawName =
      entityOption.name || entityOption.displayName || entityOption.entity?.name || 'entity'
    const entityName = cleanEntityName(rawName) || 'entity'
    const token = `@[${entityName}](${entityOption.id})`

    setNoteContent((previous) => {
      const textarea = textareaRef.current
      if (!textarea) {
        return previous ? `${previous} ${token}`.trim() : token
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

      return nextValue
    })

    setFormError('')
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

  const handleNoteContentChange = useCallback(
    (event) => {
      const { value, selectionStart } = event.target
      setNoteContent(value)
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
      if (!mentionState.active) {
        return
      }

      if (event.key === 'Escape') {
        resetMentionState()
        return
      }

      if (event.key === 'ArrowDown') {
        if (mentionResults.length === 0) {
          return
        }
        event.preventDefault()
        setMentionSelectedIndex((prev) => (prev + 1) % mentionResults.length)
        return
      }

      if (event.key === 'ArrowUp') {
        if (mentionResults.length === 0) {
          return
        }
        event.preventDefault()
        setMentionSelectedIndex((prev) =>
          prev <= 0 ? mentionResults.length - 1 : prev - 1,
        )
        return
      }

      if ((event.key === 'Enter' && !event.shiftKey) || event.key === 'Tab') {
        const choice = mentionResults[mentionSelectedIndex]
        if (!choice) {
          return
        }
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

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false)
    setFormError('')
    setFormSuccess('')
    resetMentionState()
  }, [resetMentionState])

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
        resetMentionState()
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
      resetMentionState,
    ],
  )

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
        setMentionResults(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to search entities for mentions', err)
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
    if (!mentionState.active) {
      return
    }
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
  }, [noteContent, syncOverlayScroll])

  useEffect(() => {
    if (!mentionState.active) {
      return
    }

    if (mentionResults.length === 0) {
      setMentionSelectedIndex(0)
      return
    }

    if (mentionSelectedIndex >= mentionResults.length) {
      setMentionSelectedIndex(mentionResults.length - 1)
    }
  }, [mentionResults, mentionSelectedIndex, mentionState.active])

  useEffect(() => {
    if (!mentionState.active) {
      return
    }

    const listElement = mentionListRef.current
    if (!listElement) {
      return
    }

    const activeItem = listElement.querySelector(
      `[data-index="${mentionSelectedIndex}"]`,
    )
    if (activeItem && activeItem.scrollIntoView) {
      activeItem.scrollIntoView({ block: 'nearest' })
    }
  }, [mentionSelectedIndex, mentionState.active])

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
    const segments = buildSegments(note?.content, note?.mentions)
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
    const segments = buildSegments(note?.content, note?.mentions)
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
                <p>{error}</p>
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
                      <time
                        className="entity-note-timestamp"
                        dateTime={isoTimestamp}
                        title={formattedTimestamp || undefined}
                      >
                        {formattedTimestamp || '—'}
                      </time>
                    </header>
                    <div className="entity-note-body">{renderNoteBody(note)}</div>
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
              <div className="entity-note-content-overlay" aria-hidden="true">
                <div
                  className="entity-note-content-overlay-inner"
                  ref={overlayContentRef}
                  dangerouslySetInnerHTML={{ __html: noteOverlayMarkup }}
                />
              </div>
              <textarea
                id="entity-note-content"
                ref={textareaRef}
                className="entity-note-textarea"
                value={noteContent}
                onChange={handleNoteContentChange}
                onKeyDown={handleTextareaKeyDown}
                onSelect={handleTextareaSelect}
                onScroll={handleTextareaScroll}
                placeholder={ENTITY_NOTE_PLACEHOLDER}
                rows={5}
                required
                data-autofocus
              />
            </div>

            {mentionState.active &&
            mentionDropdownPosition &&
            typeof document !== 'undefined'
              ? createPortal(
                  <div
                    className="entity-notes-mention-suggestions"
                    role="listbox"
                    aria-label="Entity mention suggestions"
                    onMouseDown={(event) => event.preventDefault()}
                    style={{
                      top: `${mentionDropdownPosition.top}px`,
                      left: `${mentionDropdownPosition.left}px`,
                    }}
                  >
                    {!resolvedWorldId ? (
                      <div className="entity-notes-mention-message">
                        Select a world to @mention entities in this note.
                      </div>
                    ) : mentionState.query.trim().length === 0 ? (
                      <div className="entity-notes-mention-message">
                        Keep typing after <strong>@</strong> to search for entities.
                      </div>
                    ) : mentionLoading ? (
                      <div className="entity-notes-mention-message">Searching…</div>
                    ) : mentionResults.length > 0 ? (
                      <ul className="entity-notes-mention-list" ref={mentionListRef}>
                        {mentionResults.map((result, index) => {
                          const rawName =
                            result?.name ||
                            result?.displayName ||
                            result?.entity?.name ||
                            'Unnamed entity'
                          const name = cleanEntityName(rawName) || 'Unnamed entity'
                          const typeName = getEntityTypeName(result)
                          const itemClassName = [
                            'entity-notes-mention-suggestion',
                            mentionSelectedIndex === index ? 'active' : '',
                          ]
                            .filter(Boolean)
                            .join(' ')
                          const key =
                            result?.id ??
                            result?.entity?.id ??
                            `${name}-${String(index)}`

                          return (
                            <li
                              key={String(key)}
                              role="option"
                              aria-selected={mentionSelectedIndex === index}
                              className={itemClassName}
                              data-index={index}
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => handleMentionSelect(result)}
                            >
                              <span className="entity-notes-mention-suggestion-name">
                                {name}
                              </span>
                              {typeName ? (
                                <span className="entity-notes-mention-suggestion-type">
                                  {typeName}
                                </span>
                              ) : null}
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <div className="entity-notes-mention-message">
                        No entities found for “{mentionState.query.trim()}”.
                      </div>
                    )}
                  </div>,
                  document.body,
                )
              : null}

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
}
