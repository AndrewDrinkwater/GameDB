const uuidSuffixPattern = /\s*\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)$/i
const uuidPattern = /\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/gi

export const cleanEntityName = (value) => {
  if (!value) return ''
  let trimmed = String(value).trim()
  trimmed = trimmed.replace(uuidSuffixPattern, '').trim()
  trimmed = trimmed.replace(uuidPattern, '').trim()
  return trimmed
}

export const buildNoteSegments = (content = '', mentionList = []) => {
  const text = typeof content === 'string' ? content : ''
  if (!text) return []

  const mentions = Array.isArray(mentionList) ? mentionList : []
  const mentionLookup = new Map()
  mentions.forEach((mention) => {
    if (!mention) return
    
    // Support both entity and location mentions
    const entityId = mention.entityId ?? mention.entity_id ?? mention.id ?? mention.entityID ?? null
    const locationId = mention.locationId ?? mention.location_id ?? null
    const mentionType = mention.type ?? mention.mentionType ?? (locationId ? 'location' : 'entity')
    
    const key = entityId || locationId
    if (!key) return
    const id = String(key)
    
    // Use a composite key to avoid collisions between entity and location IDs
    const lookupKey = `${mentionType}:${id}`
    if (mentionLookup.has(lookupKey)) return
    
    const label =
      mention.entityName ??
      mention.entity_name ??
      mention.locationName ??
      mention.location_name ??
      mention.label ??
      mention.name
    const name = label ? cleanEntityName(label) : ''
    
    if (mentionType === 'location') {
      mentionLookup.set(lookupKey, {
        locationId: id,
        locationName: name,
        type: 'location',
      })
      // Also store by ID for backward compatibility
      mentionLookup.set(id, {
        locationId: id,
        locationName: name,
        type: 'location',
      })
    } else {
      mentionLookup.set(lookupKey, {
        entityId: id,
        entityName: name,
        type: 'entity',
      })
      // Also store by ID for backward compatibility
      mentionLookup.set(id, {
        entityId: id,
        entityName: name,
        type: 'entity',
      })
    }
  })

  const segments = []
  const regex = /@\[(.+?)]\(([^)]+)\)/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    // Only add text segment if there's actual text content
    if (match.index > lastIndex) {
      const textContent = text.slice(lastIndex, match.index)
      if (textContent.trim().length > 0) {
        segments.push({ type: 'text', text: textContent })
      }
    }

    const rawMentionId = String(match[2]).trim()
    const rawFallback = match[1]
    const fallbackName = cleanEntityName(rawFallback) || String(rawFallback ?? '').trim()
    
    // Check if the mention ID has a type prefix (entity:UUID or location:UUID)
    let mentionId = rawMentionId.trim()
    let mentionType = null
    
    if (rawMentionId.includes(':')) {
      const parts = rawMentionId.split(':')
      if (parts.length === 2) {
        mentionType = parts[0].trim() // 'entity' or 'location'
        mentionId = parts[1].trim() // The actual UUID
      }
    }
    
    // Normalize the mentionId for consistent matching
    mentionId = mentionId.trim()
    
    // Skip if we don't have a valid mention ID
    if (!mentionId) {
      lastIndex = regex.lastIndex
      continue
    }
    
    // Try to find the mention in the lookup (check both with and without type prefix)
    let mention = mentionLookup.get(mentionId)
    
    // If we have a type prefix but didn't find it, try the prefixed key
    if (!mention && mentionType) {
      const prefixedKey = `${mentionType}:${mentionId}`
      mention = mentionLookup.get(prefixedKey)
    }
    
    // If not found, try to determine type from the mention list or use the prefix
    if (!mention) {
        const foundMention = mentions.find((m) => {
          if (!m) return false
          const eId = String(m.entityId ?? m.entity_id ?? m.id ?? m.entityID ?? '').trim()
          const lId = String(m.locationId ?? m.location_id ?? '').trim()
          return (eId && eId === mentionId) || (lId && lId === mentionId)
        })
      
      if (foundMention) {
        const resolvedType = foundMention.type ?? foundMention.mentionType ?? (foundMention.locationId || foundMention.location_id ? 'location' : 'entity')
        // Use the name from foundMention if available, otherwise use fallback
        const resolvedName = foundMention.locationName ?? foundMention.location_name ?? foundMention.entityName ?? foundMention.entity_name ?? foundMention.label ?? foundMention.name ?? fallbackName
        if (resolvedType === 'location') {
          mention = {
            locationId: mentionId,
            locationName: resolvedName,
            type: 'location',
          }
        } else {
          mention = {
            entityId: mentionId,
            entityName: resolvedName,
            type: 'entity',
          }
        }
      } else if (mentionType === 'location') {
        // Use the type prefix from the saved content
        mention = {
          locationId: mentionId,
          locationName: fallbackName,
          type: 'location',
        }
      } else {
        // Default to entity for backward compatibility
        // Always ensure we have a name, even if it's just the fallback
        mention = {
          entityId: mentionId,
          entityName: fallbackName,
          type: 'entity',
        }
      }
    }

    // Ensure the mention object has at least an entityId or locationId and a name
    // Always create a mention segment if we found a mention pattern, even if we don't have full info
    if (!mention) {
      // Create a fallback mention segment if we couldn't find the mention
      if (mentionType === 'location') {
        mention = {
          locationId: mentionId,
          locationName: fallbackName || 'location',
          type: 'location',
        }
      } else {
        mention = {
          entityId: mentionId,
          entityName: fallbackName || 'entity',
          type: 'entity',
        }
      }
    }
    
    // Ensure we always have a name
    if (mention.entityId && !mention.entityName) {
      mention.entityName = fallbackName || 'entity'
    }
    if (mention.locationId && !mention.locationName) {
      mention.locationName = fallbackName || 'location'
    }
    
    // Only push if we have a valid mention with an ID
    if (mention && (mention.entityId || mention.locationId)) {
      // Create segment with type: 'mention' first, then spread mention properties
      // But ensure type stays as 'mention' (don't let mention.type overwrite it)
      const { type: mentionType, ...mentionProps } = mention
      segments.push({ type: 'mention', ...mentionProps })
    } else {
      // Create a placeholder mention segment so we can see where it should be
      const placeholderMention = {
        type: 'mention',
        entityId: mentionId || 'unknown',
        entityName: fallbackName || 'Unresolved',
        isPlaceholder: true,
      }
      segments.push(placeholderMention)
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex)
    // Only add text segment if there's actual text content
    if (remainingText.trim().length > 0) {
      segments.push({ type: 'text', text: remainingText })
    }
  }

  return segments
}

export default buildNoteSegments
