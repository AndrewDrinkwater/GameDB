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
    console.log('[TaggedNoteContent] Resolving segments:', { hasSegments: Array.isArray(segments), contentLength: content?.length, mentionsCount: mentions?.length })
    if (Array.isArray(segments)) {
      console.log('[TaggedNoteContent] Using provided segments:', segments)
      return segments
    }
    const built = buildNoteSegments(content, mentions)
    console.log('[TaggedNoteContent] Built segments:', built)
    return built
  }, [content, mentions, segments])

  if (!resolvedSegments || resolvedSegments.length === 0) {
    return typeof renderEmpty === 'function' ? renderEmpty() : null
  }

  return resolvedSegments.map((segment, index) => {
    console.log('[TaggedNoteContent] Rendering segment:', { 
      index, 
      type: segment.type, 
      entityId: segment.entityId,
      locationId: segment.locationId,
      entityName: segment.entityName,
      locationName: segment.locationName,
      text: segment.text,
      fullSegment: segment
    })
    if (segment.type === 'mention') {
      // Handle placeholder mentions (unresolved)
      if (segment.isPlaceholder) {
        const label = segment.entityName || segment.locationName || 'Unresolved'
        console.log('[TaggedNoteContent] Rendering placeholder mention:', { label, segment })
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
        console.log('[TaggedNoteContent] Rendering location mention:', { label, locationId: segment.locationId })
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
        console.log('[TaggedNoteContent] Rendering entity mention:', { label, entityId: segment.entityId, segment })
        const result = (
          <span
            key={`${noteId}-mention-${index}`}
            className={mentionClassName}
          >
            @{label}
            <EntityInfoPreview entityId={segment.entityId} entityName={label} />
          </span>
        )
        console.log('[TaggedNoteContent] Entity mention result:', result)
        return result
      }
      // Fallback: if it's a mention but we don't have ID info, show the fallback name
      // This can happen if mentions array is empty or doesn't match the content
      const fallbackLabel = segment.locationName || segment.entityName || segment.name || segment.label || 'mention'
      console.warn('[TaggedNoteContent] Rendering fallback mention (no ID):', { fallbackLabel, segment })
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
