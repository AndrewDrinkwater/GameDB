import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Loader2, RotateCcw } from 'lucide-react'
import PropTypes from '../../../utils/propTypes.js'
import EntityInfoPreview from '../../../components/entities/EntityInfoPreview.jsx'
import EntitySearchSelect from '../../../modules/relationships3/ui/EntitySearchSelect.jsx'
import { fetchCharacters } from '../../../api/characters.js'
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
  {
    value: 'dm',
    label: 'Share with DM',
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
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (err) {
    console.warn('Unable to format timestamp', err)
    return ''
  }
}

const emptyArray = Object.freeze([])

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
  onReload,
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
  const [mentionPickerKey, setMentionPickerKey] = useState(0)

  const canShowForm =
    Boolean(selectedCampaignId) &&
    Boolean(canCreateNote) &&
    Boolean(campaignMatchesEntityWorld)

  const shareOptions = useMemo(
    () => (isCampaignDm ? SHARE_OPTIONS_DM : SHARE_OPTIONS_PLAYER),
    [isCampaignDm],
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

  useEffect(() => {
    setShareType(isCampaignDm ? 'private' : 'private')
  }, [isCampaignDm, selectedCampaignId])

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

    setMentionPickerKey((prev) => prev + 1)
    setFormError('')
  }, [])

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
        setFormSuccess('Note added')
        setMentionPickerKey((prev) => prev + 1)
        if (!isCampaignPlayer) {
          setCharacterId('')
        }
        setTimeout(() => setFormSuccess(''), 4000)
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
    ],
  )

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

  return (
    <div className="entity-notes">
      <section className="entity-card entity-notes-form">
        <header>
          <h2>New note</h2>
          {selectedCampaign?.name ? (
            <p className="entity-notes-context">
              Campaign: <strong>{selectedCampaign.name}</strong>
            </p>
          ) : null}
        </header>

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

        {canShowForm ? (
          <form onSubmit={handleSubmit} className="entity-notes-form-body">
            <label className="entity-notes-label" htmlFor="entity-note-content">
              Note
            </label>
            <textarea
              id="entity-note-content"
              ref={textareaRef}
              value={noteContent}
              onChange={(event) => setNoteContent(event.target.value)}
              placeholder="What do you want to remember?"
              rows={5}
              required
            />

            <div className="entity-notes-mention-picker">
              <EntitySearchSelect
                key={mentionPickerKey}
                worldId={worldId || entity?.world?.id || entity?.world_id || ''}
                label="Tag an entity"
                value={null}
                onChange={handleInsertMention}
                disabled={!worldId && !entity?.world?.id && !entity?.world_id}
                placeholder="Search entities to @mention"
              />
              <p className="entity-notes-mention-help">
                Selecting an entity inserts an @mention with quick access to its
                info drawer.
              </p>
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
        ) : null}
      </section>

      <section className="entity-card entity-notes-feed">
        <header>
          <h2>Activity feed</h2>
          <button
            type="button"
            onClick={onReload}
            className="ghost"
            disabled={loading}
            title="Reload notes"
          >
            <RotateCcw size={16} />
            Refresh
          </button>
        </header>

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

        {!loading && sortedNotes.length === 0 ? (
          <p className="entity-notes-empty">No notes yet. Be the first to add one!</p>
        ) : null}

        <div className="entity-notes-list" role="list">
          {sortedNotes.map((note) => {
            const createdAt = note?.createdAt ?? note?.created_at
            const share = String(note?.shareType ?? note?.share_type ?? 'private')
            const authorName =
              note?.author?.username || note?.author?.email || 'Unknown adventurer'
            const characterName = note?.character?.name || ''

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
                  <time dateTime={createdAt}>
                    {formatTimestamp(createdAt)}
                  </time>
                </header>
                <div className="entity-note-body">{renderNoteBody(note)}</div>
              </article>
            )
          })}
        </div>
      </section>
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
  onReload: PropTypes.func,
  onCreateNote: PropTypes.func,
  creating: PropTypes.bool,
  campaignMatchesEntityWorld: PropTypes.bool,
}
