import { useMemo } from 'react'
import EntityInfoPreview from '../entities/EntityInfoPreview.jsx'
import { buildNoteSegments } from '../../utils/noteMentions.js'

export default function TaggedNoteContent({
  content = '',
  mentions = [],
  segments = null,
  noteId = 'note',
  textClassName = 'note-text',
  mentionClassName = 'note-mention',
  renderEmpty = null,
}) {
  const resolvedSegments = useMemo(() => {
    if (Array.isArray(segments)) {
      return segments
    }
    return buildNoteSegments(content, mentions)
  }, [content, mentions, segments])

  if (!resolvedSegments || resolvedSegments.length === 0) {
    return typeof renderEmpty === 'function' ? renderEmpty() : null
  }

  return resolvedSegments.map((segment, index) => {
    if (segment.type === 'mention' && segment.entityId) {
      const label = segment.entityName || 'entity'
      return (
        <span
          key={`${noteId}-mention-${index}`}
          className={mentionClassName}
        >
          @{label}
          <EntityInfoPreview entityId={segment.entityId} entityName={label} />
        </span>
      )
    }

    return (
      <span key={`${noteId}-text-${index}`} className={textClassName}>
        {segment.text}
      </span>
    )
  })
}
