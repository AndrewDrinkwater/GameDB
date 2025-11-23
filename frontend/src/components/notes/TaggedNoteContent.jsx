import { useMemo } from 'react'
import EntityInfoPreview from '../entities/EntityInfoPreview.jsx'
import LocationInfoPreview from '../locations/LocationInfoPreview.jsx'
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
    if (segment.type === 'mention') {
      // Handle location mentions
      if (segment.locationId || segment.type === 'location') {
        const label = segment.locationName || 'location'
        return (
          <span
            key={`${noteId}-mention-${index}`}
            className={mentionClassName}
          >
            @{label}
            <LocationInfoPreview locationId={segment.locationId} locationName={label} />
          </span>
        )
      }
      // Handle entity mentions
      if (segment.entityId || segment.type === 'entity') {
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
    }

    return (
      <span key={`${noteId}-text-${index}`} className={textClassName}>
        {segment.text}
      </span>
    )
  })
}
