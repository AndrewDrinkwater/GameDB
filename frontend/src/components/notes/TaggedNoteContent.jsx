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
      // Handle placeholder mentions (unresolved)
      if (segment.isPlaceholder) {
        const label = segment.entityName || segment.locationName || 'Unresolved'
        return (
          <span
            key={`${noteId}-mention-${index}`}
            className={mentionClassName}
            style={{
              display: 'inline-block',
              backgroundColor: '#fef3c7',
              color: '#92400e',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '0.875em',
              fontWeight: 500,
              border: '1px solid #fbbf24',
            }}
            title="Unresolved mention - check console for details"
          >
            @{label}?
          </span>
        )
      }
      // Handle location mentions
      if (segment.locationId) {
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
      if (segment.entityId) {
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
      // Fallback: if it's a mention but we don't have ID info, show the fallback name
      // This can happen if mentions array is empty or doesn't match the content
      const fallbackLabel = segment.locationName || segment.entityName || segment.name || segment.label || 'mention'
      return (
        <span
          key={`${noteId}-mention-${index}`}
          className={mentionClassName}
          style={{
            display: 'inline-block',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '0.875em',
            fontWeight: 500,
            border: '1px solid #f87171',
          }}
          title="Mention without ID - check console for details"
        >
          @{fallbackLabel}?
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
