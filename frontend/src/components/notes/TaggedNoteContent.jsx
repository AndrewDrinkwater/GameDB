import { useMemo } from 'react'
import EntityInfoPreview from '../entities/EntityInfoPreview.jsx'
import { cleanEntityName } from '../../utils/noteMentions.js'
import { sanitizeNoteHtml } from '../../utils/sanitizeNoteHtml.js'

const mentionPattern = /@\[(.+?)]\(([^)]+)\)/g
const placeholderPrefix = '__MENTION__'
const placeholderSuffix = '__'

const hasHtmlMarkup = (value = '') => /<\/?[a-z][\s\S]*>/i.test(value)

const buildContentFromSegments = (segments) => {
  if (!Array.isArray(segments) || segments.length === 0) {
    return ''
  }
  return segments
    .map((segment) => {
      if (!segment) return ''
      if (segment.type === 'mention') {
        const entityId = segment.entityId ?? segment.id ?? ''
        const entityName = cleanEntityName(segment.entityName ?? segment.label ?? 'entity')
        return `@[${entityName || 'entity'}](${entityId})`
      }
      return segment.text || ''
    })
    .join('')
}

const buildRichSegments = (rawContent, mentions, fallbackSegments) => {
  const contentString =
    typeof rawContent === 'string' && rawContent.length > 0
      ? rawContent
      : buildContentFromSegments(fallbackSegments)

  if (!contentString) {
    return []
  }

  const mentionLookup = new Map()
  ;(Array.isArray(mentions) ? mentions : []).forEach((mention) => {
    if (!mention) return
    const key =
      mention.entityId ?? mention.entity_id ?? mention.id ?? mention.entityID ?? null
    if (!key) return
    const id = String(key)
    if (mentionLookup.has(id)) return
    const label =
      mention.entityName ?? mention.entity_name ?? mention.label ?? mention.name ?? ''
    mentionLookup.set(id, {
      entityId: id,
      entityName: cleanEntityName(label) || label || 'entity',
    })
  })

  const placeholderMentions = []
  const placeholderContent = contentString.replace(
    mentionPattern,
    (_, display, id) => {
      const entityId = String(id)
      const resolved =
        mentionLookup.get(entityId) || {
          entityId,
          entityName: cleanEntityName(display) || String(display || 'entity'),
        }
      const placeholderIndex = placeholderMentions.length
      placeholderMentions.push(resolved)
      return `${placeholderPrefix}${placeholderIndex}${placeholderSuffix}`
    },
  )

  const preparedContent = hasHtmlMarkup(placeholderContent)
    ? placeholderContent
    : placeholderContent.replace(/\r?\n/g, '<br />')

  const sanitizedHtml = sanitizeNoteHtml(preparedContent)
  if (!sanitizedHtml) {
    return placeholderMentions.length > 0
      ? placeholderMentions.map((mention) => ({ type: 'mention', ...mention }))
      : []
  }

  const segments = []
  const placeholderRegex = new RegExp(
    `${placeholderPrefix}(\\d+)${placeholderSuffix}`,
    'g',
  )
  let lastIndex = 0
  let match

  while ((match = placeholderRegex.exec(sanitizedHtml)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'html',
        html: sanitizedHtml.slice(lastIndex, match.index),
      })
    }

    const mentionIndex = Number.parseInt(match[1], 10)
    const mention = placeholderMentions[mentionIndex]
    if (mention) {
      segments.push({ type: 'mention', ...mention })
    }
    lastIndex = placeholderRegex.lastIndex
  }

  if (lastIndex < sanitizedHtml.length) {
    segments.push({ type: 'html', html: sanitizedHtml.slice(lastIndex) })
  }

  return segments
}

export default function TaggedNoteContent({
  content = '',
  mentions = [],
  segments = null,
  noteId = 'note',
  textClassName = 'note-text',
  mentionClassName = 'note-mention',
  renderEmpty = null,
}) {
  const richSegments = useMemo(
    () => buildRichSegments(content, mentions, segments),
    [content, mentions, segments],
  )

  if (!richSegments || richSegments.length === 0) {
    return typeof renderEmpty === 'function' ? renderEmpty() : null
  }

  return richSegments.map((segment, index) => {
    if (segment.type === 'mention' && segment.entityId) {
      const label = segment.entityName || 'entity'
      return (
        <span key={`${noteId}-mention-${index}`} className={mentionClassName}>
          @{label}
          <EntityInfoPreview entityId={segment.entityId} entityName={label} />
        </span>
      )
    }

    if (segment.type === 'html' && segment.html) {
      return (
        <span
          key={`${noteId}-html-${index}`}
          className={textClassName}
          style={{ display: 'contents' }}
          dangerouslySetInnerHTML={{ __html: segment.html }}
        />
      )
    }

    return null
  })
}
