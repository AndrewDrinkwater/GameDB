import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Loader2, Plus } from 'lucide-react'
import PropTypes from '../../../utils/propTypes.js'
import EntityInfoPreview from '../../../components/entities/EntityInfoPreview.jsx'
import { fetchCharacters } from '../../../api/characters.js'
import DrawerPanel from '../../../components/DrawerPanel.jsx'
import { searchEntities } from '../../../api/entities.js'
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
      const label =
        mention.entityName ?? mention.entity_name ?? mention.label ?? mention.name
      mentionLookup.set(id, {
        entityId: id,
        entityName: label ? String(label) : '',
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
    const fallbackName = String(match[1])
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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedAuthor, setSelectedAuthor] = useState('all')

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

  const resetMentionState = useCallback(() => {
    setMentionState({ active: false, query: '', start: 0, end: 0 })
    setMentionResults(emptyArray)
    setMentionLoading(false)
    setMentionSelectedIndex(0)
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

    const entityName = entityOption.name || entityOption.displayName || entityOption.entity?.name
    const label = entityName ? String(entityName) : 'entity'
    const token = `@[${label}](${entityOption.id})`

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
    },
    [updateMentionTracking],
  )

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

  const showCharacterPicker = isCampaignPlayer && canShowForm
  const characterLocked = showCharacterPicker && characters.length === 1

  const shareDisabled = creating
  const saveDisabled = creating || !noteContent.trim() || (isCampaignPlayer && !characterId)
  const filterDisabled = sortedNotes.length === 0 || authorFilters.length <= 1

  useEffect(() => {
    if (!canShowForm && drawerOpen) {
      closeDrawer()
    }
  }, [canShowForm, drawerOpen, closeDrawer])

  return (
    <div className="entity-notes">
      <section className="entity-card entity-notes-feed">
        <header className="entity-notes-feed-header">
          <div className="entity-notes-feed-title">
            <h2>Notes</h2>
            {selectedCampaign?.name ? (
              <p className="entity-notes-context">
                Campaign: <strong>{selectedCampaign.name}</strong>
              </p>
            ) : null}
          </div>
          {canShowForm ? (
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
            <textarea
              id="entity-note-content"
              ref={textareaRef}
              value={noteContent}
              onChange={handleNoteContentChange}
              onKeyDown={handleTextareaKeyDown}
              onSelect={handleTextareaSelect}
              placeholder="What do you want to remember?"
              rows={5}
              required
              data-autofocus
            />

            {mentionState.active ? (
              <div
                className="entity-notes-mention-suggestions"
                role="listbox"
                aria-label="Entity mention suggestions"
                onMouseDown={(event) => event.preventDefault()}
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
                      const name =
                        result?.name ||
                        result?.displayName ||
                        result?.entity?.name ||
                        'Unnamed entity'
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
              </div>
            ) : null}

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
